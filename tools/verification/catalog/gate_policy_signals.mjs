import { compareText, GATE_POLICY_SIGNAL_NAMES } from "./normalization.mjs";

function normalizeGatePolicyChangedFiles(values) {
  return [...new Set((values || [])
    .map((value) => String(value || "").trim().replaceAll("\\", "/").replace(/^\.\//, ""))
    .filter(Boolean))].sort(compareText);
}

function gatePolicyCommandRefsForMatchedFile(entry) {
  const commands = Array.isArray(entry?.rawCanonicalCommands)
    ? entry.rawCanonicalCommands
    : entry?.recommendedCommands;
  return [...new Set((commands || [])
    .map((command) => String(command?.commandRef || "").trim())
    .filter(Boolean))].sort(compareText);
}

function gatePolicyRouteIdsForMatchedFile(entry) {
  const commands = Array.isArray(entry?.rawCanonicalCommands)
    ? entry.rawCanonicalCommands
    : entry?.recommendedCommands;
  return [...new Set((commands || []).flatMap((command) => {
    const routeIds = Array.isArray(command?.safetyContributorRouteIds)
      ? command.safetyContributorRouteIds
      : command?.routeIds;
    return (routeIds || []).map((routeId) => String(routeId || "").trim()).filter(Boolean);
  }))].sort(compareText);
}

function gatePolicySourceReasons(signalName, authorityEntries, authority) {
  const matchAny = authority.signals[signalName].matchAny;
  const reasons = [];
  for (const entry of authorityEntries) {
    for (const domain of entry.domains || []) {
      if (matchAny.domains.includes(domain)) {
        reasons.push({ code: "canonical-domain-match", source: { type: "domain", value: domain }, commandRef: entry.commandRef });
      }
    }
    for (const sourceRef of entry.sourceRefs || []) {
      const normalizedSourceRef = sourceRef.replace(/\/$/u, "");
      const changedFileTouchesSource = entry.changedFile === normalizedSourceRef
        || entry.changedFile.startsWith(`${normalizedSourceRef}/`)
        || normalizedSourceRef.startsWith(`${entry.changedFile.replace(/\/$/u, "")}/`);
      const matchedPrefix = matchAny.sourceRefs.find((candidate) => (
        sourceRef === candidate || sourceRef.startsWith(`${candidate.replace(/\/$/u, "")}/`)
      ));
      if (matchedPrefix && changedFileTouchesSource) {
        reasons.push({ code: "canonical-source-ref-match", source: { type: "sourceRef", value: sourceRef }, commandRef: entry.commandRef });
      }
    }
    for (const entrypoint of entry.entrypointPolicy?.eligibleEntrypoints || []) {
      if (matchAny.entrypoints.includes(entrypoint)) {
        reasons.push({ code: "canonical-entrypoint-match", source: { type: "entrypoint", value: entrypoint }, commandRef: entry.commandRef });
      }
    }
    for (const sharedRisk of entry.sharedRisks || []) {
      if (matchAny.sharedRisks.includes(sharedRisk)) {
        reasons.push({ code: "canonical-shared-risk-match", source: { type: "sharedRisk", value: sharedRisk }, commandRef: entry.commandRef });
      }
    }
  }
  return [...new Map(reasons
    .sort((left, right) => compareText(
      `${left.source.type}\u0000${left.source.value}\u0000${left.commandRef}`,
      `${right.source.type}\u0000${right.source.value}\u0000${right.commandRef}`,
    ))
    .map((reason) => [`${reason.source.type}\u0000${reason.source.value}\u0000${reason.commandRef}`, reason])).values()];
}

export function projectGatePolicySignals(authority, authorityIdentity, {
  changedFiles = [],
  matchedByFile = [],
  unmatchedChangedFiles = [],
  routeAuthority = [],
} = {}) {
  const normalizedChangedFiles = normalizeGatePolicyChangedFiles(changedFiles);
  const normalizedUnmatchedFiles = normalizeGatePolicyChangedFiles(unmatchedChangedFiles);
  const authorityByCommand = new Map((routeAuthority || []).map((entry) => [entry?.commandRef, entry]));
  const contributorByRouteId = new Map();
  for (const entry of routeAuthority || []) {
    for (const contributor of entry?.contributors || []) {
      contributorByRouteId.set(contributor.id, { entry, contributor });
    }
  }
  const matchedFilesByPath = new Map((matchedByFile || []).map((entry) => [
    normalizeGatePolicyChangedFiles([entry?.changedFile])[0] || "",
    entry,
  ]));
  const authorityEntries = [];
  const authorityGaps = [];
  for (const changedFile of normalizedChangedFiles) {
    const matched = matchedFilesByPath.get(changedFile);
    if (!matched) {
      authorityGaps.push(`missing-matched-file:${changedFile}`);
      continue;
    }
    const commandRefs = gatePolicyCommandRefsForMatchedFile(matched);
    const routeIds = gatePolicyRouteIdsForMatchedFile(matched);
    if ((matched.matchedRouteIds || []).length > 0 && commandRefs.length === 0) {
      authorityGaps.push(`missing-command-closure:${changedFile}`);
    }
    if (commandRefs.length > 0 && routeIds.length === 0) {
      authorityGaps.push(`missing-route-closure:${changedFile}`);
    }
    for (const commandRef of commandRefs) {
      const entry = authorityByCommand.get(commandRef);
      if (!entry || entry.metadataComplete !== true) authorityGaps.push(`missing-command-authority:${commandRef}`);
    }
    for (const routeId of routeIds) {
      const bound = contributorByRouteId.get(routeId);
      if (!bound || bound.entry.metadataComplete !== true || !commandRefs.includes(bound.entry.commandRef)) {
        authorityGaps.push(`missing-route-authority:${routeId}`);
        continue;
      }
      authorityEntries.push({
        commandRef: bound.entry.commandRef,
        domains: bound.contributor.domains,
        sourceRefs: bound.contributor.sourceRefs,
        entrypointPolicy: bound.contributor.entrypointPolicy || bound.entry.entrypointPolicy,
        sharedRisks: bound.contributor.sharedRisks || [],
        routeId,
        changedFile,
      });
    }
  }
  if (normalizedChangedFiles.length === 0) authorityGaps.push("empty-changed-file-set");
  if (normalizedUnmatchedFiles.length > 0) authorityGaps.push("unmatched-changed-files");
  if (normalizedChangedFiles.length > 0 && authorityEntries.length === 0) authorityGaps.push("empty-authority-closure");
  const canonicalEntries = [...new Map(authorityEntries.map((entry) => [
    `${entry.commandRef}\u0000${entry.routeId}\u0000${entry.changedFile}`,
    entry,
  ])).values()].sort((left, right) => compareText(
    `${left.commandRef}\u0000${left.routeId}\u0000${left.changedFile}`,
    `${right.commandRef}\u0000${right.routeId}\u0000${right.changedFile}`,
  ));
  const signals = {};
  for (const signalName of GATE_POLICY_SIGNAL_NAMES) {
    if (authorityGaps.length > 0) {
      signals[signalName] = {
        state: "unknown",
        reasons: [{
          code: "canonical-authority-gap",
          source: { type: "sharedRisk", value: "selection-authority-gap" },
          detail: [...new Set(authorityGaps)].sort(compareText),
        }],
      };
      continue;
    }
    const reasons = gatePolicySourceReasons(signalName, canonicalEntries, authority);
    signals[signalName] = reasons.length > 0
      ? { state: "true", reasons }
      : {
        state: "false",
        reasons: [{
          code: "no-canonical-policy-match",
          source: { type: "sharedRisk", value: "canonical-selection-closure" },
        }],
      };
  }
  return {
    schemaVersion: 1,
    kind: "verification-gate-policy-signals",
    phase: authority.phase,
    mode: authority.mode,
    requiredExecutionSetEffect: authority.requiredExecutionSetEffect,
    authorityIdentity: structuredClone(authorityIdentity),
    signals,
  };
}
