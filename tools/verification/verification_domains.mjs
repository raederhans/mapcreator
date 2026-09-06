import {
  buildCanonicalVerificationRecords,
  VERIFICATION_METADATA_SOURCE,
  VERIFICATION_METADATA_SOURCE_IDENTITY,
} from "./verification_catalog_projection.mjs";

export const VERIFICATION_RESOURCE_LOCKS = VERIFICATION_METADATA_SOURCE.enums.resourceLocks;
export const VERIFICATION_EXECUTION_OWNERS = VERIFICATION_METADATA_SOURCE.enums.executionOwners;
export const VERIFICATION_COSTS = VERIFICATION_METADATA_SOURCE.enums.costs;
export const VERIFICATION_ESTIMATE_POLICY = VERIFICATION_METADATA_SOURCE.estimatePolicy;
export const VERIFICATION_LAYERS = VERIFICATION_METADATA_SOURCE.enums.layers;
export const VERIFICATION_CI_PROFILES = VERIFICATION_METADATA_SOURCE.enums.ciProfiles;
export const VERIFICATION_ENTRYPOINT_DEPTHS = VERIFICATION_METADATA_SOURCE.enums.entrypointDepths;
export const VERIFICATION_ENTRYPOINT_IDS = VERIFICATION_METADATA_SOURCE.enums.entrypointIds;
export const VERIFICATION_SELECTOR_SANITY_COMMAND_REF = VERIFICATION_METADATA_SOURCE.commandRefs.selectorSanity;
export const ADAPTIVE_RECURSIVE_COMMAND_REF = VERIFICATION_METADATA_SOURCE.commandRefs.adaptiveRecursive;
export const VERIFICATION_EXACT_DIRECT_COMMAND_REFS = VERIFICATION_METADATA_SOURCE.commandRefs.exactDirect;
export const VERIFY_CORE_GROUPS = VERIFICATION_METADATA_SOURCE.verifyCoreGroups;
export const VERIFY_CORE_MAIN_THREAD_GROUP = VERIFICATION_METADATA_SOURCE.verifyCoreMainThreadGroup;

export { VERIFICATION_METADATA_SOURCE_IDENTITY };

const LOCAL_ELIGIBLE_COMMANDS = new Set([
  "verify:local-infra",
  "test:node:verification-profile",
  VERIFICATION_SELECTOR_SANITY_COMMAND_REF,
  ADAPTIVE_RECURSIVE_COMMAND_REF,
]);

const LOCAL_PROJECTION_COMMANDS = new Set([
  "verify:local-infra",
]);

export function deriveVerificationEntrypointPolicy({
  commandRef,
  cost,
  executionOwner,
  resourceLocks = [],
  ciProfiles = [],
}) {
  const profiles = new Set(ciProfiles);
  const locks = new Set(resourceLocks);
  const plannerDisposition = commandRef === ADAPTIVE_RECURSIVE_COMMAND_REF ? "blocked" : "planned";
  const blockedReason = plannerDisposition === "blocked" ? "adaptive-recursion-forbidden" : null;
  const localEligible = LOCAL_ELIGIBLE_COMMANDS.has(commandRef)
    && executionOwner === "child-safe"
    && cost !== "heavy"
    && locks.size === 0;
  let minimumDepth;
  let eligibleEntrypoints;
  let executionTarget;

  if (localEligible) {
    minimumDepth = "local";
    eligibleEntrypoints = ["edit", "impact", "pr"];
    executionTarget = "child-safe";
  } else if (profiles.has("deploy-minimal")) {
    minimumDepth = "release";
    eligibleEntrypoints = ["release"];
    executionTarget = "deployed-target";
  } else if (locks.has("scenario-data")
    || locks.has("heavy-geo")
    || profiles.has("full")
    || profiles.has("scenario-contract-matrix")) {
    minimumDepth = "nightly";
    eligibleEntrypoints = ["nightly"];
    executionTarget = executionOwner === "child-safe"
      ? "child-safe"
      : executionOwner === "ci-only" ? "ci-only" : "main-thread";
  } else {
    minimumDepth = "pr";
    eligibleEntrypoints = ["pr"];
    executionTarget = executionOwner === "child-safe"
      ? "child-safe"
      : executionOwner === "ci-only" ? "ci-only" : "main-thread";
  }

  return Object.freeze({
    schemaVersion: 1,
    eligibleEntrypoints: Object.freeze(eligibleEntrypoints),
    minimumDepth,
    executionTarget,
    deferredReason: minimumDepth === "local" ? null : `requires-${minimumDepth}-verification`,
    plannerDisposition,
    blockedReason,
    localProjection: LOCAL_PROJECTION_COMMANDS.has(commandRef)
      ? Object.freeze({
        mode: "indivisible",
        proof: "canonical-local-leaf-equivalence",
      })
      : null,
  });
}

export const VERIFICATION_DOMAINS = Object.freeze(
  buildCanonicalVerificationRecords().map((record) => Object.freeze(record)),
);
