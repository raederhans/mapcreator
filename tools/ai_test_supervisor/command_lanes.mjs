const CHILD_SAFE = "child-safe";
const MAIN_THREAD = "main-thread";
const CI_ONLY = "ci-only";
const BLOCKED = "blocked";

function asArray(value) {
  return Array.isArray(value) ? value.filter((entry) => entry !== undefined && entry !== null) : [];
}

function uniqueSorted(values) {
  return [...new Set(asArray(values).map((value) => String(value).trim()).filter(Boolean))].sort();
}

export function commandKey(commandRef) {
  return String(commandRef || "").trim().replace(/\s+/g, " ");
}

function readCommandRef(entry) {
  return typeof entry === "string" ? entry : entry?.commandRef || entry?.command;
}

function mergeArrayField(target, fieldName, values) {
  target[fieldName] = uniqueSorted([...(target[fieldName] || []), ...asArray(values)]);
}

function normalizeCommandEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return {
      commandRef: "",
      domains: [],
      ownerHints: [],
      resourceLocks: [],
      executionOwners: [],
      ciProfiles: [],
      expandedSpecs: [],
      routeIds: [],
      reason: "malformed command entry",
    };
  }
  return {
    ...entry,
    commandRef: commandKey(readCommandRef(entry)),
    domains: uniqueSorted(entry.domains),
    ownerHints: uniqueSorted(entry.ownerHints),
    resourceLocks: uniqueSorted(entry.resourceLocks),
    executionOwners: uniqueSorted(entry.executionOwners),
    ciProfiles: uniqueSorted(entry.ciProfiles),
    expandedSpecs: uniqueSorted(entry.expandedSpecs),
    routeIds: uniqueSorted(entry.routeIds),
    reason: String(entry.reason || "").trim(),
  };
}

export function dedupeCommandEntries(entries = []) {
  const byCommand = new Map();
  for (const rawEntry of asArray(entries)) {
    const entry = normalizeCommandEntry(rawEntry);
    const key = commandKey(entry.commandRef);
    if (!key) {
      continue;
    }
    if (!byCommand.has(key)) {
      byCommand.set(key, { ...entry });
      continue;
    }
    const existing = byCommand.get(key);
    for (const fieldName of ["domains", "ownerHints", "resourceLocks", "executionOwners", "ciProfiles", "expandedSpecs", "routeIds"]) {
      mergeArrayField(existing, fieldName, entry[fieldName]);
    }
    if (!existing.reason && entry.reason) {
      existing.reason = entry.reason;
    }
    if (!existing.guidance && entry.guidance) {
      existing.guidance = entry.guidance;
    }
  }
  return [...byCommand.values()].sort((left, right) => left.commandRef.localeCompare(right.commandRef));
}

export function classifyCommandEntry(entry) {
  const normalized = normalizeCommandEntry(entry);
  const owners = normalized.executionOwners;
  const locks = normalized.resourceLocks;
  if (!normalized.commandRef) {
    return {
      lane: BLOCKED,
      reason: "missing commandRef",
      entry: normalized,
    };
  }
  if (owners.includes(CI_ONLY) && !owners.includes(CHILD_SAFE) && !owners.includes(MAIN_THREAD)) {
    return {
      lane: CI_ONLY,
      reason: "ci-only owner",
      entry: normalized,
    };
  }
  if (owners.includes(MAIN_THREAD)) {
    return {
      lane: MAIN_THREAD,
      reason: "main-thread owner",
      entry: normalized,
    };
  }
  if (locks.length > 0) {
    return {
      lane: MAIN_THREAD,
      reason: `resource locks: ${locks.join(", ")}`,
      entry: normalized,
    };
  }
  if (owners.length > 0 && owners.every((owner) => owner === CHILD_SAFE)) {
    return {
      lane: CHILD_SAFE,
      reason: "child-safe owner",
      entry: normalized,
    };
  }
  return {
    lane: BLOCKED,
    reason: owners.length ? `mixed or unknown owners: ${owners.join(", ")}` : "missing execution owner",
    entry: normalized,
  };
}

function withLane(classified) {
  return {
    ...classified.entry,
    lane: classified.lane,
    laneReason: classified.reason,
  };
}

function reportCommandEntries(selectorReport) {
  const directEntries = asArray(selectorReport?.recommendedCommands);
  if (directEntries.length > 0) {
    return directEntries;
  }
  // 兼容旧 selector 报告：新版 preferred shape 是 recommendedCommands，旧字段在这里一次性补齐 lane 语义。
  return [
    ...asArray(selectorReport?.childAgentStaticTasks).map((entry) => ({
      ...entry,
      executionOwners: [CHILD_SAFE],
      resourceLocks: [],
    })),
    ...asArray(selectorReport?.mainThreadSerialVerification).map((entry) => ({
      ...entry,
      executionOwners: [MAIN_THREAD],
    })),
    ...asArray(selectorReport?.ciOnlyVerification).map((entry) => ({
      ...entry,
      executionOwners: [CI_ONLY],
      resourceLocks: [],
    })),
  ];
}

export function buildLaneSummary(selectorReport = {}) {
  const summary = {
    childSafeCommands: [],
    mainThreadCommands: [],
    ciOnlyCommands: [],
    blockedCommands: [],
    counts: {
      childSafe: 0,
      mainThread: 0,
      ciOnly: 0,
      blocked: 0,
      total: 0,
    },
    resourceLocks: [],
    executionOwners: [],
  };

  // lane 判定是 live-process 安全边界：先按 commandRef 去重，再把锁和 owner 汇总给 supervisor plan。
  for (const entry of dedupeCommandEntries(reportCommandEntries(selectorReport))) {
    const classified = classifyCommandEntry(entry);
    const laneEntry = withLane(classified);
    if (classified.lane === CHILD_SAFE) summary.childSafeCommands.push(laneEntry);
    else if (classified.lane === MAIN_THREAD) summary.mainThreadCommands.push(laneEntry);
    else if (classified.lane === CI_ONLY) summary.ciOnlyCommands.push(laneEntry);
    else summary.blockedCommands.push(laneEntry);
  }

  summary.resourceLocks = uniqueSorted([
    ...summary.childSafeCommands.flatMap((entry) => entry.resourceLocks),
    ...summary.mainThreadCommands.flatMap((entry) => entry.resourceLocks),
    ...summary.ciOnlyCommands.flatMap((entry) => entry.resourceLocks),
    ...summary.blockedCommands.flatMap((entry) => entry.resourceLocks),
  ]);
  summary.executionOwners = uniqueSorted([
    ...summary.childSafeCommands.flatMap((entry) => entry.executionOwners),
    ...summary.mainThreadCommands.flatMap((entry) => entry.executionOwners),
    ...summary.ciOnlyCommands.flatMap((entry) => entry.executionOwners),
    ...summary.blockedCommands.flatMap((entry) => entry.executionOwners),
  ]);
  summary.counts = {
    childSafe: summary.childSafeCommands.length,
    mainThread: summary.mainThreadCommands.length,
    ciOnly: summary.ciOnlyCommands.length,
    blocked: summary.blockedCommands.length,
    total:
      summary.childSafeCommands.length
      + summary.mainThreadCommands.length
      + summary.ciOnlyCommands.length
      + summary.blockedCommands.length,
  };
  return summary;
}

function commandRefs(entries = []) {
  return uniqueSorted(asArray(entries).map(readCommandRef));
}

function blockedEntry(commandRef, lane, reason) {
  return {
    commandRef,
    lane,
    reason,
  };
}

export function buildExecutionCommandList(plan = {}, {
  includeMainThread = false,
  includeCiOnly = false,
} = {}) {
  const childSafeCommands = commandRefs(plan.childSafeCommands);
  const mainThreadCommands = commandRefs(plan.mainThreadCommands);
  const ciOnlyCommands = commandRefs(plan.ciOnlyCommands);
  const baseBlocked = asArray(plan.blockedCommands).map((entry) => ({
    commandRef: commandKey(readCommandRef(entry)),
    lane: entry.lane || BLOCKED,
    reason: entry.reason || entry.laneReason || "blocked command",
  })).filter((entry) => entry.commandRef);

  const commandsToRun = [...childSafeCommands];
  const blockedCommands = [...baseBlocked];
  if (includeMainThread) {
    commandsToRun.push(...mainThreadCommands);
  } else {
    blockedCommands.push(...mainThreadCommands.map((commandRef) => blockedEntry(commandRef, MAIN_THREAD, "requires reserved main-thread lane")));
  }
  if (includeCiOnly) {
    commandsToRun.push(...ciOnlyCommands);
  } else {
    blockedCommands.push(...ciOnlyCommands.map((commandRef) => blockedEntry(commandRef, CI_ONLY, "reserved for CI lane")));
  }
  return {
    commandsToRun: uniqueSorted(commandsToRun),
    blockedCommands: dedupeCommandEntries(blockedCommands).map((entry) => ({
      commandRef: entry.commandRef,
      lane: entry.lane || BLOCKED,
      reason: entry.reason || "blocked command",
    })),
  };
}

export const LANES = Object.freeze({
  CHILD_SAFE,
  MAIN_THREAD,
  CI_ONLY,
  BLOCKED,
});
