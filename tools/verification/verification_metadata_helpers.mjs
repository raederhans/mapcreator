import {
  VERIFICATION_CI_PROFILES,
  VERIFICATION_COSTS,
  VERIFICATION_DOMAINS,
  VERIFICATION_EXECUTION_OWNERS,
  VERIFICATION_LAYERS,
  VERIFICATION_RESOURCE_LOCKS,
  VERIFY_CORE_GROUPS,
  VERIFY_CORE_MAIN_THREAD_GROUP,
} from "./verification_domains.mjs";

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertArrayOfStrings(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new Error(`${label} must be an array of non-empty strings.`);
  }
}

function metadataFor(predicate, metadata = VERIFICATION_DOMAINS) {
  return metadata.filter(predicate);
}

function commandsForGroup(groupId, metadata = VERIFICATION_DOMAINS) {
  return metadataFor((entry) => entry.verifyCoreDefaultGroup === groupId, metadata)
    .map((entry) => entry.commandRef);
}

export function buildVerifyCoreDefaultGroups(metadata = VERIFICATION_DOMAINS) {
  return VERIFY_CORE_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    commands: commandsForGroup(group.id, metadata),
  }));
}

export function buildVerifyCoreMainThreadGroup(metadata = VERIFICATION_DOMAINS) {
  return {
    id: VERIFY_CORE_MAIN_THREAD_GROUP.id,
    title: VERIFY_CORE_MAIN_THREAD_GROUP.title,
    commands: metadataFor((entry) => entry.verifyCoreMainThread === true, metadata)
      .map((entry) => entry.commandRef),
  };
}

export function getVerifyCoreOptionalMainThreadCommands(metadata = VERIFICATION_DOMAINS) {
  return metadataFor((entry) => entry.optionalMainThread === true, metadata)
    .map((entry) => entry.commandRef);
}

export function buildVerificationMetadataRoutes(metadata = VERIFICATION_DOMAINS) {
  return metadataFor((entry) => entry.routeRegistry === true, metadata)
    .map((entry) => {
      const route = {
        id: entry.id,
        commandRef: entry.commandRef,
        sourceRef: entry.sourceRefs.join(","),
        domain: entry.domain,
        ownerHint: entry.ownerHint,
        layer: entry.layer,
        cost: entry.cost,
        resourceLocks: [...entry.resourceLocks],
        executionOwner: entry.executionOwner,
        ciProfile: entry.ciProfile,
      };
      if (Array.isArray(entry.platforms)) route.platforms = [...entry.platforms];
      if (entry.guidance) route.guidance = entry.guidance;
      if (entry.entrypointPolicy) route.entrypointPolicy = structuredClone(entry.entrypointPolicy);
      return route;
    });
}

export function validateVerificationMetadata({
  metadata = VERIFICATION_DOMAINS,
  packageScripts = {},
  supervisorDomainIds = [],
} = {}) {
  const ids = new Set();
  const groupIds = new Set(VERIFY_CORE_GROUPS.map((group) => group.id));
  const supervisorDomains = new Set(supervisorDomainIds);
  const summary = {
    count: metadata.length,
    routeRegistryCount: 0,
    verifyCoreDefaultCount: 0,
    verifyCoreMainThreadCount: 0,
    optionalMainThreadCount: 0,
  };

  for (const entry of metadata) {
    assertString(entry.id, "verification metadata id");
    if (ids.has(entry.id)) throw new Error(`Duplicate verification metadata id: ${entry.id}`);
    ids.add(entry.id);

    assertString(entry.commandRef, `${entry.id}.commandRef`);
    assertString(entry.commandType, `${entry.id}.commandType`);
    if (!["package-script", "direct"].includes(entry.commandType)) {
      throw new Error(`${entry.id}.commandType is invalid: ${entry.commandType}`);
    }
    if (entry.commandType === "package-script" && entry.packageScriptRequired !== true) {
      throw new Error(`${entry.id} package-script metadata must require a package script.`);
    }
    if (entry.packageScriptRequired === true && !(entry.commandRef in packageScripts)) {
      throw new Error(`${entry.id} commandRef is missing from package.json scripts: ${entry.commandRef}`);
    }
    if (entry.commandType === "direct" && !/^(node|npm|python)\b/.test(entry.commandRef)) {
      throw new Error(`${entry.id} direct command must start with node, npm, or python.`);
    }

    assertArrayOfStrings(entry.sourceRefs, `${entry.id}.sourceRefs`);
    assertString(entry.domain, `${entry.id}.domain`);
    assertString(entry.ownerHint, `${entry.id}.ownerHint`);
    assertString(entry.layer, `${entry.id}.layer`);
    assertString(entry.cost, `${entry.id}.cost`);
    assertString(entry.executionOwner, `${entry.id}.executionOwner`);
    assertString(entry.ciProfile, `${entry.id}.ciProfile`);
    assertArrayOfStrings(entry.resourceLocks, `${entry.id}.resourceLocks`);

    if (!VERIFICATION_LAYERS.includes(entry.layer)) throw new Error(`${entry.id} has invalid layer: ${entry.layer}`);
    if (!VERIFICATION_COSTS.includes(entry.cost)) throw new Error(`${entry.id} has invalid cost: ${entry.cost}`);
    if (!VERIFICATION_EXECUTION_OWNERS.includes(entry.executionOwner)) {
      throw new Error(`${entry.id} has invalid executionOwner: ${entry.executionOwner}`);
    }
    if (!VERIFICATION_CI_PROFILES.includes(entry.ciProfile)) {
      throw new Error(`${entry.id} has invalid ciProfile: ${entry.ciProfile}`);
    }
    for (const lock of entry.resourceLocks) {
      if (!VERIFICATION_RESOURCE_LOCKS.includes(lock)) {
        throw new Error(`${entry.id} has invalid resource lock: ${lock}`);
      }
    }
    if (entry.executionOwner === "child-safe" && entry.resourceLocks.length > 0) {
      throw new Error(`${entry.id} is child-safe but declares resource locks.`);
    }
    if (entry.executionOwner === "child-safe" && entry.cost === "heavy") {
      throw new Error(`${entry.id} is child-safe but has heavy cost.`);
    }
    if (entry.verifyCoreDefaultGroup !== undefined) {
      if (!groupIds.has(entry.verifyCoreDefaultGroup)) {
        throw new Error(`${entry.id} has unknown verifyCoreDefaultGroup: ${entry.verifyCoreDefaultGroup}`);
      }
      summary.verifyCoreDefaultCount += 1;
    }
    if (entry.verifyCoreMainThread === true) summary.verifyCoreMainThreadCount += 1;
    if (entry.optionalMainThread === true) summary.optionalMainThreadCount += 1;
    if (entry.routeRegistry === true) summary.routeRegistryCount += 1;
    if (entry.supervisorDomain !== undefined) {
      assertString(entry.supervisorDomain, `${entry.id}.supervisorDomain`);
      if (supervisorDomains.size > 0 && !supervisorDomains.has(entry.supervisorDomain)) {
        throw new Error(`${entry.id} has unknown supervisorDomain: ${entry.supervisorDomain}`);
      }
    }
  }

  return summary;
}
