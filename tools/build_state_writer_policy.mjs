import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  discoverFunctionParameterBindings,
  scanStateMutations,
} from "./state_writer_inventory.mjs";
import {
  getStateActionDelegationContractEntriesForModule,
  STATE_ACTION_DELEGATION_CONTRACT,
  validateStateActionDelegationContract,
  validateStateActionModuleSource,
  validateStateActionPolicyBindings,
} from "./state_action_delegation_contract.mjs";
import {
  buildCanonicalStateKeyAuthorityIndex,
  buildDefaultStateOwnershipReport,
  discoverGlobalStateImportBindings,
  resolveStateWriterFindingAuthority,
  summarizeStateWriterFindingRecords,
  validateDomainActionSourceBoundary,
  validateTestDiagnosticBudget,
} from "./state_writer_policy.mjs";
import {
  compareP4StateActionPhases,
  normalizeP4StateActionPhase,
  P4_STATE_ACTION_PHASES,
} from "./p4_state_action_phases.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const STATE_WRITER_POLICY_PATH = path.join(
  PROJECT_ROOT,
  "tools",
  "state_writer_policy.json",
);
const LEGACY_ALLOWLIST_PATH = path.join(
  PROJECT_ROOT,
  "tools",
  "eslint-rules",
  "state-writer-allowlist.json",
);
const PRODUCTION_JS_ROOT = path.join(PROJECT_ROOT, "js");

const EXCLUDED_PARAMETER_BINDINGS = new Set([
  "js/core/history_manager.js#applyEntries#target",
  "js/core/intensity_field.js#bakeCompositeCell#target",
  "js/core/map_renderer.js#mergeHistorySnapshot#target",
  "js/core/map_renderer.js#recordScenarioPoliticalBackgroundDeferredFullCacheReadyRepaintDeferred#state",
  "js/core/renderer/spatial_index_runtime_builders.js#appendLandIndexEntriesRange#state",
  "js/core/state/color_state.js#replaceObjectContents#target",
  "js/ui/toolbar/special_zones_workbench_controller.js#renderActions#state",
  "js/ui/toolbar/special_zones_workbench_controller.js#renderLayerList#state",
]);

const SPECIAL_BINDINGS_BY_PATH = Object.freeze({
  "js/core/scenario/chunk_runtime.js": Object.freeze([
    Object.freeze({
      id: "local-alias:createScenarioChunkRuntimeController:runtimeState",
      kind: "function-local-alias",
      name: "runtimeState",
      functionName: "createScenarioChunkRuntimeController",
      aliasSources: Object.freeze(["explicitRuntimeState", "state"]),
      aliasOperators: Object.freeze(["||"]),
    }),
  ]),
  "js/core/scenario/lifecycle_runtime.js": Object.freeze([
    Object.freeze({
      id: "local-alias:createScenarioLifecycleRuntime:runtimeState",
      kind: "function-local-alias",
      name: "runtimeState",
      functionName: "createScenarioLifecycleRuntime",
      aliasSources: Object.freeze(["explicitRuntimeState", "state"]),
      aliasOperators: Object.freeze(["||"]),
    }),
  ]),
  "js/core/map_renderer/scenario_refresh_runtime.js": Object.freeze([
    Object.freeze({
      id: "function-local:createScenarioRefreshRuntime:runtimeState",
      kind: "function-local",
      name: "runtimeState",
      functionName: "createScenarioRefreshRuntime",
    }),
  ]),
});

const COMPATIBILITY_ONLY_PATHS = new Map([
  [
    "js/ui/toolbar/transport_workbench_right_deck_owner.js",
    "raw-root-name-false-positive",
  ],
]);

function normalizeRelativePath(filePath) {
  return String(filePath || "").replaceAll("\\", "/");
}

function stableUnique(values = []) {
  return [...new Set(values.map(String))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

export function resolveGitCommitSha(
  revision = "HEAD",
  {
    cwd = PROJECT_ROOT,
    runGit = (args) =>
      execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
  } = {},
) {
  const candidate = String(revision || "HEAD").trim() || "HEAD";
  try {
    const resolved = String(
      runGit(["rev-parse", "--verify", `${candidate}^{commit}`]) || "",
    ).trim();
    if (!/^[0-9a-f]{40}$/i.test(resolved)) {
      throw new Error(`Git returned a non-commit identity: ${resolved}`);
    }
    return resolved.toLowerCase();
  } catch (error) {
    const wrapped = new Error(
      `Unable to resolve ${candidate} to an exact Git commit.`,
      { cause: error },
    );
    wrapped.code = "source-base-sha-invalid";
    wrapped.revision = candidate;
    throw wrapped;
  }
}

export const P4_CLOSEOUT_DIRECT_FILES_TARGET = 54;
export const P4_CLOSEOUT_MEMBERSHIP_RATIO = 0.8;

export function buildP4CloseoutTargets(baselines = {}) {
  const denominator =
    baselines?.bindingScopedMemberships?.production?.legacyCombined;
  if (
    typeof denominator !== "number"
    || !Number.isInteger(denominator)
    || denominator < 0
  ) {
    const error = new Error(
      "P4 closeout target requires a finite non-negative integer membership denominator.",
    );
    error.code = "closeout-target-denominator-invalid";
    throw error;
  }
  const ratio = P4_CLOSEOUT_MEMBERSHIP_RATIO;
  return {
    productionLegacyDirectFiles: P4_CLOSEOUT_DIRECT_FILES_TARGET,
    productionLegacyMemberships: Math.floor(denominator * ratio),
    productionLegacyMembershipRatio: ratio,
    productionLegacyMembershipDenominator: denominator,
    source:
      "baselines.bindingScopedMemberships.production.legacyCombined",
  };
}

const LEGACY_BINDING_AUTHORITIES = new Set([
  "legacy-direct",
  "legacy-target",
]);

function stableLegacyBindingIdentity(binding = {}) {
  const isFunctionParameter = binding.kind === "function-parameter";
  return JSON.stringify({
    kind: String(binding.kind || ""),
    name: isFunctionParameter ? "" : String(binding.name || ""),
    functionName: String(binding.functionName || ""),
    parameterName: isFunctionParameter ? "" : String(binding.parameterName || ""),
    parameterIndex: Number(binding.parameterIndex || 0),
    parameterPath: isFunctionParameter
      ? String(binding.parameterPath || "$")
      : "",
    importSource: String(binding.importSource || ""),
    importedName: String(binding.importedName || ""),
    aliasSources: (binding.aliasSources || []).map(String),
    aliasOperators: (binding.aliasOperators || []).map(String),
  });
}

function stableSiteFingerprint(site = {}) {
  return String(site.sourceFingerprint || "").trim()
    || [
      Number(site.line || 0),
      Number(site.column || 0),
    ].join(":");
}

export function buildLegacyStateWriterSemanticAuthority(
  writers = [],
) {
  const sections = {
    bindings: [],
    memberships: [],
    aliasSites: [],
    dynamicSites: [],
    ambiguousSites: [],
    unsupportedSites: [],
  };
  const bindingIdentities = new Set();
  const collisions = [];
  for (const writer of Array.isArray(writers) ? writers : []) {
    if (writer?.surface !== "production") {
      continue;
    }
    for (const binding of Array.isArray(writer?.bindings)
      ? writer.bindings
      : []) {
      if (!LEGACY_BINDING_AUTHORITIES.has(binding?.authority)) {
        continue;
      }
      const bindingIdentity = stableLegacyBindingIdentity(binding);
      const scopedBindingIdentity = `${writer.path}|${bindingIdentity}`;
      if (bindingIdentities.has(scopedBindingIdentity)) {
        collisions.push(scopedBindingIdentity);
        continue;
      }
      bindingIdentities.add(scopedBindingIdentity);
      sections.bindings.push(
        [
          scopedBindingIdentity,
          binding.authority,
        ].join("|"),
      );
      for (const grant of Array.isArray(binding?.grants)
        ? binding.grants
        : []) {
        const grantScope = [
          scopedBindingIdentity,
          String(grant.domain || ""),
          String(grant.migrationPhase || ""),
        ].join("|");
        for (const membership of Array.isArray(grant?.memberships)
          ? grant.memberships
          : []) {
          sections.memberships.push(
            [
              grantScope,
              String(membership.operation || ""),
              String(membership.key || ""),
            ].join("|"),
          );
        }
        for (const site of Array.isArray(grant?.aliasSites)
          ? grant.aliasSites
          : []) {
          sections.aliasSites.push(
            [
              grantScope,
              String(site.alias || ""),
              JSON.stringify((site.aliasChain || []).map(String)),
              String(site.operation || ""),
              String(site.key || ""),
              stableSiteFingerprint(site),
            ].join("|"),
          );
        }
        for (const site of Array.isArray(grant?.dynamicSites)
          ? grant.dynamicSites
          : []) {
          sections.dynamicSites.push(
            [
              grantScope,
              String(site.operation || ""),
              String(site.key || ""),
              String(site.pathPattern || ""),
              stableSiteFingerprint(site),
            ].join("|"),
          );
        }
        for (const site of Array.isArray(grant?.ambiguousSites)
          ? grant.ambiguousSites
          : []) {
          sections.ambiguousSites.push(
            [
              grantScope,
              String(site.reason || ""),
              stableSiteFingerprint(site),
            ].join("|"),
          );
        }
        for (const site of Array.isArray(grant?.unsupportedSites)
          ? grant.unsupportedSites
          : []) {
          sections.unsupportedSites.push(
            [
              grantScope,
              String(site.reason || ""),
              String(site.operation || ""),
              String(site.key || ""),
              stableSiteFingerprint(site),
            ].join("|"),
          );
        }
      }
    }
  }
  return {
    bindings: sections.bindings.sort(),
    memberships: sections.memberships.sort(),
    aliasSites: sections.aliasSites.sort(),
    dynamicSites: sections.dynamicSites.sort(),
    ambiguousSites: sections.ambiguousSites.sort(),
    unsupportedSites: sections.unsupportedSites.sort(),
    collisions: stableUnique(collisions),
  };
}

function signatureCounts(signatures = []) {
  const counts = new Map();
  for (const signature of Array.isArray(signatures) ? signatures : []) {
    const normalized = String(signature);
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  return counts;
}

export function validateLegacyStateWriterSemanticAuthority({
  baseline = null,
  writers = [],
  scope = "frozen-baseline",
} = {}) {
  const current = buildLegacyStateWriterSemanticAuthority(writers);
  const violations = [];
  if (!baseline || typeof baseline !== "object") {
    return {
      verdict: "fail",
      current,
      violations: [{
        code: "legacy-semantic-authority-baseline-missing",
      }],
    };
  }
  for (const collision of current.collisions) {
    violations.push({
      code: "legacy-semantic-binding-identity-collision",
      binding: collision,
    });
  }
  for (const section of [
    "bindings",
    "memberships",
    "aliasSites",
    "dynamicSites",
    "ambiguousSites",
    "unsupportedSites",
  ]) {
    const allowed = signatureCounts(
      Array.isArray(baseline?.[section]) ? baseline[section] : [],
    );
    const observed = signatureCounts(current[section]);
    for (const [signature, count] of observed) {
      const allowedCount = allowed.get(signature) || 0;
      if (count > allowedCount) {
        violations.push({
          code: "legacy-semantic-authority-added",
          scope,
          section,
          signature,
          allowedCount,
          actualCount: count,
        });
      }
    }
  }
  return {
    verdict: violations.length ? "fail" : "pass",
    current,
    violations,
  };
}

const LEGACY_SEMANTIC_SECTIONS = Object.freeze([
  "bindings",
  "memberships",
  "aliasSites",
  "dynamicSites",
  "ambiguousSites",
  "unsupportedSites",
]);

export function subtractLegacyStateWriterSemanticAuthority(
  baseline = {},
  current = {},
) {
  return Object.fromEntries(
    LEGACY_SEMANTIC_SECTIONS.map((section) => {
      const remaining = signatureCounts(baseline?.[section]);
      for (const [signature, count] of signatureCounts(current?.[section])) {
        remaining.set(
          signature,
          Math.max(0, (remaining.get(signature) || 0) - count),
        );
      }
      const retired = [];
      for (const [signature, count] of remaining) {
        for (let index = 0; index < count; index += 1) {
          retired.push(signature);
        }
      }
      return [section, retired.sort()];
    }),
  );
}

export function validateLegacyStateWriterSemanticLedger({
  baseline = null,
  writers = [],
  retired = null,
  previousWriters = null,
  previousRetired = null,
} = {}) {
  const current = buildLegacyStateWriterSemanticAuthority(writers);
  const expectedRetired = baseline
    ? subtractLegacyStateWriterSemanticAuthority(baseline, current)
    : null;
  const violations = [];
  if (!baseline || !retired) {
    return {
      verdict: "fail",
      current,
      expectedRetired,
      violations: [{
        code: "legacy-semantic-authority-ledger-missing",
      }],
    };
  }
  for (const section of LEGACY_SEMANTIC_SECTIONS) {
    const actual = Array.isArray(retired?.[section])
      ? [...retired[section]].map(String).sort()
      : null;
    if (
      !actual
      || JSON.stringify(actual)
        !== JSON.stringify(expectedRetired[section])
    ) {
      violations.push({
        code: "legacy-semantic-retired-ledger-drift",
        section,
        expected: expectedRetired[section],
        actual,
      });
    }
  }
  if (previousWriters) {
    violations.push(
      ...validateLegacyStateWriterSemanticAuthority({
        baseline: buildLegacyStateWriterSemanticAuthority(previousWriters),
        writers,
        scope: "previous-active",
      }).violations,
    );
  }
  if (previousRetired) {
    for (const section of LEGACY_SEMANTIC_SECTIONS) {
      const currentCounts = signatureCounts(retired?.[section]);
      for (
        const [signature, previousCount] of
          signatureCounts(previousRetired?.[section])
      ) {
        const currentCount = currentCounts.get(signature) || 0;
        if (currentCount < previousCount) {
          violations.push({
            code: "legacy-semantic-retirement-regressed",
            section,
            signature,
            previousCount,
            currentCount,
          });
        }
      }
    }
  }
  return {
    verdict: violations.length ? "fail" : "pass",
    current,
    expectedRetired,
    violations,
  };
}

function collectMembershipRecords(
  writers = [],
  { authorities = new Set() } = {},
) {
  const records = [];
  for (const writer of Array.isArray(writers) ? writers : []) {
    if (writer?.surface !== "production") {
      continue;
    }
    for (const binding of Array.isArray(writer?.bindings)
      ? writer.bindings
      : []) {
      if (!authorities.has(binding?.authority)) {
        continue;
      }
      const bindingIdentity = stableLegacyBindingIdentity(binding);
      for (const grant of Array.isArray(binding?.grants)
        ? binding.grants
        : []) {
        for (const membership of Array.isArray(grant?.memberships)
          ? grant.memberships
          : []) {
          records.push({
            signature: [
              writer.path,
              bindingIdentity,
              String(grant.domain || ""),
              String(grant.migrationPhase || ""),
              String(membership.operation || ""),
              String(membership.key || ""),
            ].join("|"),
            replacementKey: [
              String(grant.domain || ""),
              String(grant.migrationPhase || ""),
              String(membership.operation || ""),
              String(membership.key || ""),
            ].join("|"),
            path: writer.path,
            bindingId: binding.id,
            domain: String(grant.domain || ""),
            migrationPhase: String(grant.migrationPhase || ""),
            operation: String(membership.operation || ""),
            key: String(membership.key || ""),
          });
        }
      }
    }
  }
  return records;
}

export function validateLegacyMembershipRetirementReplacements({
  previousWriters = [],
  writers = [],
} = {}) {
  const previousRecords = collectMembershipRecords(previousWriters, {
    authorities: LEGACY_BINDING_AUTHORITIES,
  });
  const currentRecords = collectMembershipRecords(writers, {
    authorities: LEGACY_BINDING_AUTHORITIES,
  });
  const currentCounts = signatureCounts(
    currentRecords.map(({ signature }) => signature),
  );
  const actionReplacementKeys = new Set(
    collectMembershipRecords(writers, {
      authorities: new Set(["domain-action"]),
    }).map(({ replacementKey }) => replacementKey),
  );
  const violations = [];
  for (const record of previousRecords) {
    const activeCount = currentCounts.get(record.signature) || 0;
    if (activeCount > 0) {
      currentCounts.set(record.signature, activeCount - 1);
      continue;
    }
    if (!actionReplacementKeys.has(record.replacementKey)) {
      violations.push({
        code: "legacy-membership-retirement-replacement-missing",
        path: record.path,
        bindingId: record.bindingId,
        domain: record.domain,
        migrationPhase: record.migrationPhase,
        operation: record.operation,
        key: record.key,
      });
    }
  }
  return violations;
}

const PROGRESSION_METRICS = Object.freeze([
  Object.freeze({
    key: "productionLegacyDirectFiles",
    violationCode: "legacy-direct-files-increased",
  }),
  Object.freeze({
    key: "productionLegacyMemberships",
    violationCode: "legacy-memberships-increased",
  }),
  Object.freeze({
    key: "productionLegacyDynamicSites",
    violationCode: "legacy-dynamic-sites-increased",
  }),
  Object.freeze({
    key: "productionLegacyAliasSites",
    violationCode: "legacy-alias-sites-increased",
  }),
  Object.freeze({
    key: "productionLegacyAmbiguousSites",
    violationCode: "legacy-ambiguous-sites-increased",
  }),
  Object.freeze({
    key: "productionLegacyUnsupportedSites",
    violationCode: "legacy-unsupported-sites-increased",
  }),
]);

function normalizeProgressionMetrics(metrics = {}) {
  return Object.fromEntries(
    PROGRESSION_METRICS.map(({ key }) => {
      return [key, metrics?.[key]];
    }),
  );
}

function validateProgressionMetricSet(metrics, scope) {
  const violations = [];
  for (const { key } of PROGRESSION_METRICS) {
    const value = metrics?.[key];
    if (
      typeof value !== "number"
      || !Number.isFinite(value)
      || !Number.isInteger(value)
      || value < 0
    ) {
      violations.push({
        code: "progress-metric-invalid",
        metric: key,
        scope,
        value: Number.isNaN(value) ? "NaN" : value,
      });
    }
  }
  return violations;
}

function latestProgressCheckpoint(policy = {}) {
  const checkpoints = Array.isArray(policy?.progress?.checkpoints)
    ? policy.progress.checkpoints
    : [];
  const latestPhase = String(policy?.progress?.latestPhase || "").trim();
  return checkpoints.find((checkpoint) => checkpoint?.phase === latestPhase)
    || [...checkpoints].sort((left, right) =>
      compareP4StateActionPhases(right.phase, left.phase)
    )[0]
    || null;
}

export function validateStateWriterPolicyProgression({
  previousPolicy = null,
  phase = "P4.0",
  currentMetrics = {},
} = {}) {
  const normalizedPhase = normalizeP4StateActionPhase(phase);
  const violations = [
    ...validateProgressionMetricSet(currentMetrics, "current"),
  ];
  if (!previousPolicy) {
    return {
      verdict: violations.length ? "fail" : "pass",
      phase: normalizedPhase,
      previousPhase: "",
      violations,
    };
  }

  const progress = previousPolicy?.progress;
  if (
    !progress
    || !Array.isArray(progress.checkpoints)
    || !progress.checkpoints.length
  ) {
    return {
      verdict: "fail",
      phase: normalizedPhase,
      previousPhase: "",
      violations: [
        ...violations,
        {
          code: "progress-contract-missing",
          phase: normalizedPhase,
        },
      ],
    };
  }

  const previousPhase = normalizeP4StateActionPhase(progress.latestPhase);
  const seenPhases = new Set();
  let priorCheckpoint = null;
  for (const checkpoint of progress.checkpoints) {
    const checkpointPhase = normalizeP4StateActionPhase(checkpoint?.phase);
    const checkpointMetricViolations = validateProgressionMetricSet(
      checkpoint,
      `checkpoint:${checkpointPhase}`,
    );
    violations.push(...checkpointMetricViolations);
    if (seenPhases.has(checkpointPhase)) {
      violations.push({
        code: "duplicate-progress-checkpoint",
        phase: checkpointPhase,
      });
      continue;
    }
    seenPhases.add(checkpointPhase);
    if (
      priorCheckpoint
      && compareP4StateActionPhases(
        checkpointPhase,
        priorCheckpoint.phase,
      ) <= 0
    ) {
      violations.push({
        code: "progress-checkpoint-order-invalid",
        previousPhase: priorCheckpoint.phase,
        phase: checkpointPhase,
      });
    }
    if (
      priorCheckpoint
      && !validateProgressionMetricSet(
        priorCheckpoint,
        `checkpoint:${priorCheckpoint.phase}`,
      ).length
      && !checkpointMetricViolations.length
    ) {
      for (const { key } of PROGRESSION_METRICS) {
        const previous = priorCheckpoint[key];
        const current = checkpoint[key];
        if (current > previous) {
          violations.push({
            code: "progress-checkpoint-metric-increased",
            metric: key,
            previous,
            current,
            previousPhase: priorCheckpoint.phase,
            phase: checkpointPhase,
          });
        }
      }
    }
    priorCheckpoint = checkpoint;
  }
  if (!seenPhases.has(previousPhase)) {
    violations.push({
      code: "progress-latest-checkpoint-missing",
      phase: previousPhase,
    });
  }
  if (compareP4StateActionPhases(normalizedPhase, previousPhase) < 0) {
    violations.push({
      code: "phase-regression",
      previousPhase,
      phase: normalizedPhase,
    });
  } else {
    const previousCheckpoint = latestProgressCheckpoint(previousPolicy);
    if (
      previousCheckpoint
      && !validateProgressionMetricSet(
        previousCheckpoint,
        `checkpoint:${previousCheckpoint.phase}`,
      ).length
      && !validateProgressionMetricSet(currentMetrics, "current").length
    ) {
      const normalizedCurrentMetrics = normalizeProgressionMetrics(
        currentMetrics,
      );
      for (const { key, violationCode } of PROGRESSION_METRICS) {
        const previous = previousCheckpoint[key];
        const current = normalizedCurrentMetrics[key];
        if (current > previous) {
          violations.push({
            code: violationCode,
            metric: key,
            previous,
            current,
            previousPhase,
            phase: normalizedPhase,
          });
        }
      }
    }
  }
  return {
    verdict: violations.length ? "fail" : "pass",
    phase: normalizedPhase,
    previousPhase,
    violations,
  };
}

function createProgressCheckpoint(phase, {
  productionLegacyDirectFiles,
  productionLegacyMemberships,
  productionLegacyDynamicSites,
  productionLegacyAliasSites,
  productionLegacyAmbiguousSites,
  productionLegacyUnsupportedSites,
}) {
  const metrics = {
    productionLegacyDirectFiles,
    productionLegacyMemberships,
    productionLegacyDynamicSites,
    productionLegacyAliasSites,
    productionLegacyAmbiguousSites,
    productionLegacyUnsupportedSites,
  };
  const violations = validateProgressionMetricSet(metrics, "checkpoint");
  if (violations.length) {
    const error = new Error(
      `Invalid state writer progress checkpoint: ${
        violations.map(({ metric }) => metric).join(", ")
      }`,
    );
    error.code = "progress-metric-invalid";
    error.violations = violations;
    throw error;
  }
  return {
    phase: normalizeP4StateActionPhase(phase),
    ...normalizeProgressionMetrics(metrics),
  };
}

function buildProgressState({
  phase,
  currentMetrics,
  currentWriters,
  frozenLegacySemanticAuthority,
  previousPolicy,
  refreshP4Baseline,
}) {
  const checkpoint = createProgressCheckpoint(phase, currentMetrics);
  const previousCheckpoints =
    previousPolicy && !refreshP4Baseline
      ? cloneJsonValue(previousPolicy?.progress?.checkpoints || [])
      : [];
  const checkpointsByPhase = new Map(
    previousCheckpoints.map((entry) => [entry.phase, entry]),
  );
  checkpointsByPhase.set(checkpoint.phase, checkpoint);
  return {
    latestPhase: checkpoint.phase,
    checkpoints: P4_STATE_ACTION_PHASES
      .filter((candidatePhase) => checkpointsByPhase.has(candidatePhase))
      .map((candidatePhase) => checkpointsByPhase.get(candidatePhase)),
    retiredLegacySemanticAuthority:
      subtractLegacyStateWriterSemanticAuthority(
        frozenLegacySemanticAuthority,
        buildLegacyStateWriterSemanticAuthority(currentWriters),
      ),
  };
}

function bindingIdPart(value) {
  return String(value || "")
    .replaceAll(/[^A-Za-z0-9_$.-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkJavaScriptFiles(rootDir) {
  if (!(await fileExists(rootDir))) {
    return [];
  }
  const results = [];
  const queue = [rootDir];
  while (queue.length) {
    const current = queue.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(nextPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        results.push(normalizeRelativePath(path.relative(PROJECT_ROOT, nextPath)));
      }
    }
  }
  return results.sort((left, right) => left.localeCompare(right));
}

export async function readLegacyStateWriterAllowlist() {
  const parsed = JSON.parse(await fs.readFile(LEGACY_ALLOWLIST_PATH, "utf8"));
  return stableUnique(Array.isArray(parsed?.files) ? parsed.files : []);
}

export async function readStateWriterPolicy() {
  return JSON.parse(await fs.readFile(STATE_WRITER_POLICY_PATH, "utf8"));
}

function toScannerBinding(binding) {
  return {
    id: binding.id,
    kind: binding.kind,
    name: binding.name,
    functionName: binding.functionName || "",
    parameterName: binding.parameterName || "",
    parameterIndex: Number.isInteger(binding.parameterIndex)
      ? binding.parameterIndex
      : null,
    parameterPath: binding.parameterPath || "",
    aliasSources: binding.aliasSources || [],
    aliasOperators: binding.aliasOperators || [],
    locator: binding.locator || null,
  };
}

function createModuleBinding(importBinding) {
  return {
    id: `module:${bindingIdPart(importBinding.localName)}`,
    kind: "module",
    name: importBinding.localName,
    importSource: importBinding.importSource,
    importedName: importBinding.importedName,
  };
}

function createParameterBinding(candidate) {
  const parameterPath = String(candidate.parameterPath || "$");
  const parameterPathHash = createHash("sha256")
    .update(parameterPath)
    .digest("hex")
    .slice(0, 12);
  return {
    id: [
      "parameter",
      bindingIdPart(candidate.functionName),
      Number(candidate.parameterIndex || 0),
      parameterPathHash,
      Number(candidate.line || 0),
      Number(candidate.column || 0),
    ].join(":"),
    kind: "function-parameter",
    name: candidate.parameterName,
    functionName: candidate.functionName,
    parameterName: candidate.parameterName,
    parameterIndex: Number(candidate.parameterIndex || 0),
    parameterPath,
    locator: {
      line: candidate.line,
      column: candidate.column,
    },
  };
}

function createTestRootBinding(rootName) {
  return {
    id: `test-file-root:${rootName}`,
    kind: "test-file-root",
    name: rootName,
  };
}

function bindingSignature(binding) {
  if (binding.kind === "function-parameter") {
    return [
      binding.kind,
      binding.functionName || "",
      Number(binding.parameterIndex || 0),
      binding.parameterPath || "$",
      Number(binding.locator?.line || 0),
      Number(binding.locator?.column || 0),
    ].join("|");
  }
  return [
    binding.kind,
    binding.name,
    binding.functionName || "",
    binding.parameterName || "",
    Number(binding.parameterIndex || 0),
    Number(binding.locator?.line || 0),
    Number(binding.locator?.column || 0),
    ...(binding.aliasSources || []),
    ...(binding.aliasOperators || []),
  ].join("|");
}

function dedupeBindings(bindings) {
  const seen = new Set();
  const results = [];
  for (const binding of bindings) {
    const signature = bindingSignature(binding);
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    results.push(binding);
  }
  return results.sort((left, right) => left.id.localeCompare(right.id));
}

export async function discoverCandidatePaths(legacyAllowlistPaths) {
  return stableUnique([
    ...legacyAllowlistPaths,
    ...(await walkJavaScriptFiles(PRODUCTION_JS_ROOT)),
  ]);
}

function isTestPath(relativePath) {
  return normalizeRelativePath(relativePath).startsWith("tests/");
}

function isActionPath(relativePath) {
  return normalizeRelativePath(relativePath).startsWith("js/core/state/actions/");
}

function isCompatFacadePath(relativePath) {
  return normalizeRelativePath(relativePath) === "js/core/state/index.js";
}

export async function validateStateActionNonTargetParameterMutations(
  relativePath,
  source,
  contractEntries =
    getStateActionDelegationContractEntriesForModule(relativePath),
) {
  const discovery = discoverFunctionParameterBindings(
    source,
    { parameterNames: null },
  );
  if (discovery.diagnostics.length) {
    return [];
  }
  const violations = [];
  for (const entry of contractEntries || []) {
    for (
      const candidate of discovery.bindings.filter(
        ({ functionName }) => functionName === entry.exportName,
      )
    ) {
      if (
        candidate.parameterIndex === entry.targetArgumentIndex
        && candidate.parameterPath === "$"
      ) {
        continue;
      }
      const binding = createParameterBinding(candidate);
      const mutationFindings = scanBinding(
        source,
        relativePath,
        binding,
      ).filter((finding) => !finding?.unsupported);
      for (const finding of mutationFindings) {
        violations.push({
          code: "state-action-non-target-parameter-mutation",
          modulePath: normalizeRelativePath(relativePath),
          exportName: entry.exportName,
          parameterName: candidate.parameterName,
          parameterIndex: candidate.parameterIndex,
          parameterPath: candidate.parameterPath,
          operation: finding.operation,
          key: finding.key,
          line: finding.line,
          column: finding.column,
        });
      }
    }
  }
  return violations.sort(
    (left, right) =>
      left.exportName.localeCompare(right.exportName)
      || left.parameterIndex - right.parameterIndex
      || left.parameterPath.localeCompare(right.parameterPath)
      || left.line - right.line
      || left.column - right.column,
  );
}

export async function discoverStateWriterBindingsForSource(
  relativePath,
  source,
  surface,
  {
    previousWriter = null,
    scanAllParameters = false,
  } = {},
) {
  if (surface === "test") {
    return ["state", "runtimeState", "appState"].map(createTestRootBinding);
  }

  const bindings = discoverGlobalStateImportBindings(source, {
    filePath: relativePath,
  }).map(createModuleBinding);
  const discovery = discoverFunctionParameterBindings(source);
  if (discovery.diagnostics.length) {
    return [{
      id: "syntax",
      kind: "module",
      name: "",
      discoveryDiagnostics: discovery.diagnostics,
    }];
  }
  if (isActionPath(relativePath)) {
    const nonTargetParameterMutationViolations =
      await validateStateActionNonTargetParameterMutations(
        relativePath,
        source,
      );
    if (nonTargetParameterMutationViolations.length) {
      const error = new Error(
        `State action mutates a non-target parameter: ${relativePath}`,
      );
      error.code = "state-action-non-target-parameter-mutation";
      error.violations = nonTargetParameterMutationViolations;
      throw error;
    }
    const allParameterDiscovery = discoverFunctionParameterBindings(
      source,
      { parameterNames: null },
    );
    for (
      const entry of
      getStateActionDelegationContractEntriesForModule(relativePath)
    ) {
      const candidates = allParameterDiscovery.bindings.filter(
        (candidate) =>
          candidate.functionName === entry.exportName
          && candidate.parameterIndex === entry.targetArgumentIndex
          && candidate.parameterPath === "$",
      );
      if (candidates.length === 1) {
        bindings.push(createParameterBinding(candidates[0]));
      }
    }
    return dedupeBindings(bindings);
  }
  for (const candidate of discovery.bindings) {
    const exclusionKey = [
      relativePath,
      candidate.functionName,
      candidate.parameterName,
    ].join("#");
    if (!EXCLUDED_PARAMETER_BINDINGS.has(exclusionKey)) {
      bindings.push(createParameterBinding(candidate));
    }
  }
  const canonicalAuthorityIndex =
    buildCanonicalStateKeyAuthorityIndex();
  const previousParameterIdentities = new Set(
    (previousWriter?.bindings || [])
      .filter((binding) => binding?.kind === "function-parameter")
      .map(
        (binding) =>
          [
            binding.functionName,
            Number(binding.parameterIndex || 0),
            binding.parameterPath || "$",
          ].join("|"),
      ),
  );
  const allParameterDiscovery = discoverFunctionParameterBindings(
    source,
    { parameterNames: null },
  );
  for (const candidate of allParameterDiscovery.bindings) {
    const priorIdentity = [
      candidate.functionName,
      Number(candidate.parameterIndex || 0),
      candidate.parameterPath || "$",
    ].join("|");
    if (
      !scanAllParameters
      && !previousParameterIdentities.has(priorIdentity)
    ) {
      continue;
    }
    const exclusionKey = [
      relativePath,
      candidate.functionName,
      candidate.parameterName,
    ].join("#");
    if (EXCLUDED_PARAMETER_BINDINGS.has(exclusionKey)) {
      continue;
    }
    const binding = createParameterBinding(candidate);
    const findings = scanBinding(source, relativePath, binding);
    const hasCanonicalStateMutation =
      hasCanonicalStateMutationFinding(
        findings,
        relativePath,
        canonicalAuthorityIndex,
      );
    const hasConservativeStateTargetEvidence = findings.some(
      (finding) => finding?.dynamic || finding?.unsupported,
    );
    if (
      hasCanonicalStateMutation
      || (
        previousParameterIdentities.has(priorIdentity)
        && hasConservativeStateTargetEvidence
      )
    ) {
      bindings.push(binding);
    }
  }
  bindings.push(...(SPECIAL_BINDINGS_BY_PATH[relativePath] || []));
  return dedupeBindings(bindings);
}

export function hasCanonicalStateMutationFinding(
  findings = [],
  relativePath = "",
  stateKeyAuthorityIndex = buildCanonicalStateKeyAuthorityIndex(),
) {
  return (Array.isArray(findings) ? findings : []).some((finding) => {
    if (
      finding?.unsupported
      || !finding?.key
      || finding.key === "*"
    ) {
      return false;
    }
    return !resolveStateWriterFindingAuthority(
      finding,
      relativePath,
      stateKeyAuthorityIndex,
    ).unknown;
  });
}

function scanBinding(source, relativePath, binding) {
  if (binding.discoveryDiagnostics?.length) {
    return binding.discoveryDiagnostics.map((diagnostic) => ({
      filePath: relativePath,
      bindingId: binding.id,
      bindingKind: binding.kind,
      root: binding.name,
      alias: "",
      aliasChain: [],
      operation: "unsupported",
      key: "*",
      pathSegments: ["*"],
      dynamic: true,
      unsupported: true,
      reason: diagnostic.reason || "binding-discovery-failed",
      line: 1,
      column: 1,
      sourceFingerprint: createHash("sha256")
        .update(
          [
            relativePath,
            binding.id,
            diagnostic.reason || "binding-discovery-failed",
          ].join("|"),
        )
        .digest("hex"),
    }));
  }
  return scanStateMutations(source, {
    filePath: relativePath,
    bindings: [toScannerBinding(binding)],
  }).map((finding) => {
    const start = Math.max(0, Number(finding.start || 0));
    const end = Math.max(start, Number(finding.end || start));
    const sourceSlice = String(source || "")
      .slice(start, end)
      .replaceAll("\r\n", "\n")
      .trim();
    return {
      ...finding,
      sourceFingerprint: sourceSlice
        ? createHash("sha256").update(sourceSlice).digest("hex")
        : "",
    };
  });
}

function discoverChangedProductionPaths(baseSha = "") {
  const changed = new Set();
  const resolvedBaseSha = String(baseSha || "").trim();
  if (resolvedBaseSha) {
    const output = execFileSync(
      "git",
      ["diff", "--name-only", resolvedBaseSha, "--", "js"],
      {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    for (const entry of String(output || "").split(/\r?\n/)) {
      const normalized = normalizeRelativePath(entry).trim();
      if (normalized.endsWith(".js")) {
        changed.add(normalized);
      }
    }
  }
  const untrackedOutput = execFileSync(
    "git",
    [
      "ls-files",
      "--others",
      "--exclude-standard",
      "--",
      "js",
    ],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const entry of String(untrackedOutput || "").split(/\r?\n/)) {
    const normalized = normalizeRelativePath(entry).trim();
    if (normalized.endsWith(".js")) {
      changed.add(normalized);
    }
  }
  return changed;
}

async function discoverScannedCandidateBindings(
  legacyAllowlistPaths,
  {
    previousPolicy = null,
    baseSha = "",
  } = {},
) {
  const candidates = [];
  const candidatePaths = await discoverCandidatePaths(legacyAllowlistPaths);
  const previousWritersByPath = new Map(
    (previousPolicy?.writers || [])
      .map((writer) => [writer.path, writer]),
  );
  const changedProductionPaths = discoverChangedProductionPaths(
    baseSha || previousPolicy?.baseline?.sourceBaseSha,
  );
  for (const relativePath of candidatePaths) {
    const absolutePath = path.join(PROJECT_ROOT, relativePath);
    if (!(await fileExists(absolutePath))) {
      continue;
    }
    const source = await fs.readFile(absolutePath, "utf8");
    const surface = isTestPath(relativePath) ? "test" : "production";
    if (isActionPath(relativePath)) {
      const actionDelegationSourceViolations =
        validateStateActionModuleSource(
          source,
          { filePath: relativePath },
        );
      if (actionDelegationSourceViolations.length) {
        const error = new Error(
          `State action delegation source is invalid: ${relativePath}`,
        );
        error.code = "state-action-delegation-source-invalid";
        error.violations = actionDelegationSourceViolations;
        throw error;
      }
    }
    const actionBoundaryViolations = validateDomainActionSourceBoundary(
      source,
      { filePath: relativePath },
    );
    if (actionBoundaryViolations.length) {
      const error = new Error(
        `Domain action imports the global state facade: ${relativePath}`,
      );
      error.violations = actionBoundaryViolations;
      throw error;
    }
    const bindings = await discoverStateWriterBindingsForSource(
      relativePath,
      source,
      surface,
      {
        previousWriter: previousWritersByPath.get(relativePath),
        scanAllParameters: changedProductionPaths.has(relativePath),
      },
    );
    for (const binding of bindings) {
      const findings = scanBinding(source, relativePath, binding);
      if (!findings.length) {
        continue;
      }
      candidates.push({
        path: relativePath,
        surface,
        binding,
        findings,
      });
    }
  }
  return candidates.sort(
    (left, right) =>
      left.path.localeCompare(right.path)
      || left.binding.id.localeCompare(right.binding.id),
  );
}

function createGrantKey(domain, migrationPhase) {
  return `${domain}|${migrationPhase}`;
}

export function collectUnknownStateKeyAuthorityViolations(
  candidates = [],
  stateKeyAuthorityIndex = buildCanonicalStateKeyAuthorityIndex(),
) {
  const violations = new Map();
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    if (candidate?.surface !== "production") {
      continue;
    }
    for (const finding of Array.isArray(candidate?.findings)
      ? candidate.findings
      : []) {
      const authority = resolveStateWriterFindingAuthority(
        finding,
        candidate.path,
        stateKeyAuthorityIndex,
      );
      if (!authority.unknown) {
        continue;
      }
      const violation = {
        code: "unknown-state-key-authority",
        path: candidate.path,
        bindingId: candidate.binding?.id || finding.bindingId || "",
        operation: finding.operation,
        key: finding.key,
        line: Number(finding.line || 1),
        column: Number(finding.column || 1),
        suggestedDomain: authority.fallback.domain,
        suggestedMigrationPhase: authority.fallback.migrationPhase,
      };
      const identity = [
        violation.path,
        violation.bindingId,
        violation.operation,
        violation.key,
        violation.line,
        violation.column,
      ].join("|");
      violations.set(identity, violation);
    }
  }
  return [...violations.values()].sort(
    (left, right) =>
      left.path.localeCompare(right.path)
      || left.bindingId.localeCompare(right.bindingId)
      || left.key.localeCompare(right.key)
      || left.operation.localeCompare(right.operation)
      || left.line - right.line
      || left.column - right.column,
  );
}

export function buildStateWriterBindingGrants(
  findings,
  relativePath,
  stateKeyAuthorityIndex,
  surface,
) {
  const grantsByKey = new Map();
  for (const finding of findings) {
    if (finding.unsupported && surface === "test") {
      continue;
    }
    let authority = resolveStateWriterFindingAuthority(
      finding,
      relativePath,
      stateKeyAuthorityIndex,
    );
    if (authority.unknown) {
      if (surface === "production") {
        const error = new Error(
          `Unknown state key authority for ${finding.key} in ${relativePath}.`,
        );
        error.code = "unknown-state-key-authority";
        error.details = {
          path: relativePath,
          operation: finding.operation,
          key: finding.key,
          suggestedDomain: authority.fallback.domain,
          suggestedMigrationPhase: authority.fallback.migrationPhase,
        };
        throw error;
      }
      authority = authority.fallback;
    }
    const { domain, migrationPhase } = authority;
    const grantKey = createGrantKey(domain, migrationPhase);
    if (!grantsByKey.has(grantKey)) {
      grantsByKey.set(grantKey, {
        domain,
        migrationPhase,
        operations: new Set(),
        keys: new Set(),
        memberships: new Map(),
        aliasSites: new Map(),
        dynamicSites: new Map(),
        ambiguousSites: new Map(),
        unsupportedSites: new Map(),
      });
    }
    const grant = grantsByKey.get(grantKey);
    if (finding.unsupported) {
      if (finding.reason === "ambiguous-alias-flow") {
        const siteKey = [
          finding.line,
          finding.column,
          finding.reason,
        ].join("|");
        grant.ambiguousSites.set(siteKey, {
          line: finding.line,
          column: finding.column,
          reason: finding.reason,
          ...(finding.sourceFingerprint
            ? { sourceFingerprint: finding.sourceFingerprint }
            : {}),
        });
      } else {
        const siteKey = [
          finding.line,
          finding.column,
          finding.reason,
          finding.operation,
          finding.key,
        ].join("|");
        grant.unsupportedSites.set(siteKey, {
          line: finding.line,
          column: finding.column,
          reason: finding.reason,
          operation: finding.operation,
          key: finding.key,
          ...(finding.sourceFingerprint
            ? { sourceFingerprint: finding.sourceFingerprint }
            : {}),
        });
      }
      continue;
    }
    grant.operations.add(finding.operation);
    const membershipKey = `${finding.operation}|${finding.key}`;
    grant.memberships.set(membershipKey, {
      operation: finding.operation,
      key: finding.key,
    });
    if (finding.key !== "*") {
      grant.keys.add(finding.key);
    }
    if (finding.alias) {
      const siteKey = [
        finding.alias,
        finding.operation,
        finding.key,
        finding.line,
        finding.column,
      ].join("|");
      grant.aliasSites.set(siteKey, {
        alias: finding.alias,
        aliasChain: finding.aliasChain,
        operation: finding.operation,
        key: finding.key,
        line: finding.line,
        column: finding.column,
        ...(finding.sourceFingerprint
          ? { sourceFingerprint: finding.sourceFingerprint }
          : {}),
      });
    }
    if (finding.dynamic) {
      const siteKey = [
        finding.line,
        finding.column,
        finding.operation,
        finding.key,
      ].join("|");
      grant.dynamicSites.set(siteKey, {
        line: finding.line,
        column: finding.column,
        operation: finding.operation,
        key: finding.key,
        pathPattern: finding.pathSegments.join("."),
        ...(finding.sourceFingerprint
          ? { sourceFingerprint: finding.sourceFingerprint }
          : {}),
      });
    }
  }
  return [...grantsByKey.values()]
    .map((grant) => ({
      domain: grant.domain,
      migrationPhase: grant.migrationPhase,
      operations: stableUnique([...grant.operations]),
      keys: stableUnique([...grant.keys]),
      memberships: [...grant.memberships.values()].sort(
        (left, right) =>
          left.operation.localeCompare(right.operation)
          || left.key.localeCompare(right.key),
      ),
      aliasSites: [...grant.aliasSites.values()].sort(
        (left, right) =>
          left.line - right.line
          || left.column - right.column
          || left.alias.localeCompare(right.alias),
      ),
      dynamicSites: [...grant.dynamicSites.values()].sort(
        (left, right) =>
          left.line - right.line
          || left.column - right.column,
      ),
      ambiguousSites: [...grant.ambiguousSites.values()].sort(
        (left, right) =>
          left.line - right.line
          || left.column - right.column,
      ),
      unsupportedSites: [...grant.unsupportedSites.values()].sort(
        (left, right) =>
          left.line - right.line
          || left.column - right.column
          || left.reason.localeCompare(right.reason),
      ),
    }))
    .sort(
      (left, right) =>
        left.migrationPhase.localeCompare(right.migrationPhase)
        || left.domain.localeCompare(right.domain),
    );
}

function bindingAuthority(relativePath, surface, binding) {
  if (surface === "test") {
    return "test-fixture";
  }
  if (isCompatFacadePath(relativePath)) {
    return "compat-facade";
  }
  if (isActionPath(relativePath)) {
    return "domain-action";
  }
  if (binding.kind === "module") {
    return "legacy-direct";
  }
  return "legacy-target";
}

function summarizeWriterClassification(bindings) {
  const domainValues = stableUnique(
    bindings.flatMap((binding) => binding.grants.map((grant) => grant.domain)),
  );
  const phaseValues = stableUnique(
    bindings.flatMap(
      (binding) => binding.grants.map((grant) => grant.migrationPhase),
    ),
  );
  return {
    domain: domainValues.length === 1 ? domainValues[0] : "cross-domain",
    migrationPhase: phaseValues.length === 1 ? phaseValues[0] : "multi-phase",
  };
}

export async function buildStateWriterPolicySnapshot({
  baseSha = "",
  generatedAt = "",
  phase = "P4.0",
  previousPolicy = null,
  refreshP4Baseline = false,
} = {}) {
  const normalizedPhase = normalizeP4StateActionPhase(phase);
  if (refreshP4Baseline && normalizedPhase !== "P4.0") {
    throw new Error("--refresh-p4-baseline is valid only for phase P4.0.");
  }
  if (
    previousPolicy
    && !refreshP4Baseline
    && (
      !previousPolicy.baseline
      || !previousPolicy.baselines
      || !previousPolicy.progress
      || !previousPolicy.baseline.sourceBaseSha
    )
  ) {
    throw new Error(
      "Previous policy lacks the frozen P4.0 baseline or progress contract; refresh explicitly at P4.0.",
    );
  }
  if (!previousPolicy && normalizedPhase !== "P4.0") {
    throw new Error(
      `Phase ${normalizedPhase} requires a previous policy with a frozen P4.0 baseline.`,
    );
  }
  if (previousPolicy && !refreshP4Baseline) {
    resolveGitCommitSha(previousPolicy.baseline.sourceBaseSha);
  }
  const actionDelegationContractViolations =
    validateStateActionDelegationContract();
  if (actionDelegationContractViolations.length) {
    const error = new Error(
      "State action delegation contract is invalid.",
    );
    error.code = "state-action-delegation-contract-invalid";
    error.violations = actionDelegationContractViolations;
    throw error;
  }
  const legacyAllowlistPaths = await readLegacyStateWriterAllowlist();
  const defaultStateReport = await buildDefaultStateOwnershipReport();
  const stateKeyAuthorityIndex = buildCanonicalStateKeyAuthorityIndex();
  const scannedCandidates = await discoverScannedCandidateBindings(
    legacyAllowlistPaths,
    {
      previousPolicy: refreshP4Baseline ? null : previousPolicy,
      baseSha: previousPolicy?.baseline?.sourceBaseSha
        || baseSha,
    },
  );
  const unknownStateKeyAuthorityViolations =
    collectUnknownStateKeyAuthorityViolations(
      scannedCandidates,
      stateKeyAuthorityIndex,
    );
  if (unknownStateKeyAuthorityViolations.length) {
    const error = new Error(
      [
        `Found ${unknownStateKeyAuthorityViolations.length} production state mutations without canonical key authority:`,
        ...unknownStateKeyAuthorityViolations.map(
          (violation) =>
            `- ${violation.key} at ${violation.path}:${violation.line}:${violation.column} (${violation.bindingId})`,
        ),
      ].join("\n"),
    );
    error.code = "unknown-state-key-authority";
    error.violations = unknownStateKeyAuthorityViolations;
    throw error;
  }
  const byPath = new Map();
  const findingRecords = [];
  for (const candidate of scannedCandidates) {
    const binding = {
      ...candidate.binding,
      authority: bindingAuthority(
        candidate.path,
        candidate.surface,
        candidate.binding,
      ),
      grants: buildStateWriterBindingGrants(
        candidate.findings,
        candidate.path,
        stateKeyAuthorityIndex,
        candidate.surface,
      ),
    };
    findingRecords.push({
      path: candidate.path,
      surface: candidate.surface,
      bindingId: binding.id,
      authority: binding.authority,
      findings: candidate.findings,
    });
    if (!byPath.has(candidate.path)) {
      byPath.set(candidate.path, {
        path: candidate.path,
        surface: candidate.surface,
        bindings: [],
      });
    }
    byPath.get(candidate.path).bindings.push(binding);
  }

  const legacyAllowlist = new Set(legacyAllowlistPaths);
  for (const relativePath of legacyAllowlistPaths) {
    if (byPath.has(relativePath)) {
      continue;
    }
    const reason = COMPATIBILITY_ONLY_PATHS.get(relativePath)
      || "legacy-root-scanner-compatibility-only";
    byPath.set(relativePath, {
      path: relativePath,
      surface: isTestPath(relativePath) ? "test" : "production",
      bindings: [
        {
          id: "compatibility-only",
          kind: "compatibility-only",
          name: "",
          authority: "compatibility-only",
          reason,
          grants: [],
        },
      ],
    });
  }

  const writers = [...byPath.values()]
    .map((writer) => {
      writer.bindings.sort((left, right) => left.id.localeCompare(right.id));
      const classification = summarizeWriterClassification(writer.bindings);
      return {
        path: writer.path,
        surface: writer.surface,
        domain: classification.domain,
        authority: legacyAllowlist.has(writer.path)
          ? "legacy-direct"
          : isCompatFacadePath(writer.path)
            ? "compat-facade"
            : isActionPath(writer.path)
              ? "domain-action"
              : "legacy-target",
        migrationPhase: classification.migrationPhase,
        bindings: writer.bindings,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  const activeActionModulePaths = [];
  for (
    const modulePath of stableUnique(
      STATE_ACTION_DELEGATION_CONTRACT.map(
        ({ modulePath: contractModulePath }) => contractModulePath,
      ),
    )
  ) {
    if (await fileExists(path.join(PROJECT_ROOT, modulePath))) {
      activeActionModulePaths.push(modulePath);
    }
  }
  const actionDelegationPolicyViolations =
    validateStateActionPolicyBindings(
      writers,
      {
        modulePaths: activeActionModulePaths,
      },
    );
  if (actionDelegationPolicyViolations.length) {
    const error = new Error(
      "Generated state action delegation policy is invalid.",
    );
    error.code = "state-action-delegation-policy-invalid";
    error.violations = actionDelegationPolicyViolations;
    throw error;
  }

  const productionProjection = legacyAllowlistPaths.filter(
    (relativePath) => !isTestPath(relativePath),
  );
  const testProjection = legacyAllowlistPaths.filter(isTestPath);
  const bindingScopedMetrics = summarizeStateWriterFindingRecords(
    findingRecords,
  );
  const resolvedBaseSha = String(baseSha || "").trim()
    || "HEAD";
  const currentBaselines = {
    legacyDirectFiles: {
      production: productionProjection.length,
      test: testProjection.length,
      total: legacyAllowlistPaths.length,
    },
    bindingScopedMemberships: bindingScopedMetrics.memberships,
    bindingScopedSites: bindingScopedMetrics.sites,
    historicalRootScanner: {
      productionMatches: 1186,
      productionLiteralKeys: 366,
      productionComputedSites: 7,
      testMatches: 475,
      testLiteralKeys: 147,
      testComputedSites: 8,
      note:
        "Historical regex-root oracle retained for reconciliation; binding-scoped counts are authoritative for P4 migration.",
    },
    defaultState: {
      factoryGroups: defaultStateReport.factoryGroups.length,
      explicitKeys: defaultStateReport.explicitKeys.length,
      preCompatKeys: defaultStateReport.preCompatKeyCount,
      compatibilityHooks: defaultStateReport.compatibilityHookCount,
      postCompatKeys: defaultStateReport.postCompatKeyCount,
      actualFacadeKeys: defaultStateReport.actualFacadeKeyCount,
      unownedActualFacadeKeys:
        defaultStateReport.unownedActualFacadeKeys.length,
      registeredKeysMissingFromFacade:
        defaultStateReport.registeredKeysMissingFromFacade.length,
      collisions: defaultStateReport.collisions.length,
    },
    testDiagnosticBudget: bindingScopedMetrics.diagnostics.test,
    legacySemanticAuthority:
      buildLegacyStateWriterSemanticAuthority(writers),
  };
  currentBaselines.closeoutTargets = buildP4CloseoutTargets(currentBaselines);
  const currentProgressMetrics = {
    productionLegacyDirectFiles: productionProjection.length,
    productionLegacyMemberships:
      bindingScopedMetrics.memberships.production.legacyCombined,
    productionLegacyDynamicSites:
      bindingScopedMetrics.sites.dynamic.production.legacyCombined,
    productionLegacyAliasSites:
      bindingScopedMetrics.sites.alias.production.legacyCombined,
    productionLegacyAmbiguousSites:
      bindingScopedMetrics.sites.ambiguous.production.legacyCombined,
    productionLegacyUnsupportedSites:
      bindingScopedMetrics.sites.unsupported.production.legacyCombined,
  };
  const progression = validateStateWriterPolicyProgression({
    previousPolicy: refreshP4Baseline ? null : previousPolicy,
    phase: normalizedPhase,
    currentMetrics: currentProgressMetrics,
  });
  const testDiagnosticBudgetViolations =
    previousPolicy && !refreshP4Baseline
      ? validateTestDiagnosticBudget({
        baseline: previousPolicy?.baselines?.testDiagnosticBudget,
        current: bindingScopedMetrics.diagnostics.test,
      })
      : [];
  const legacySemanticAuthorityViolations =
    previousPolicy && !refreshP4Baseline
      ? [
        ...validateLegacyStateWriterSemanticAuthority({
          baseline: previousPolicy?.baselines?.legacySemanticAuthority,
          writers,
        }).violations,
        ...validateLegacyStateWriterSemanticLedger({
          baseline: previousPolicy?.baselines?.legacySemanticAuthority,
          writers,
          retired: subtractLegacyStateWriterSemanticAuthority(
            previousPolicy?.baselines?.legacySemanticAuthority,
            buildLegacyStateWriterSemanticAuthority(writers),
          ),
          previousWriters: previousPolicy?.writers,
          previousRetired:
            previousPolicy?.progress?.retiredLegacySemanticAuthority,
        }).violations,
        ...validateLegacyMembershipRetirementReplacements({
          previousWriters: previousPolicy?.writers,
          writers,
        }),
      ]
      : currentBaselines.legacySemanticAuthority.collisions.map(
        (binding) => ({
          code: "legacy-semantic-binding-identity-collision",
          binding,
        }),
      );
  const governanceViolations = [
    ...progression.violations,
    ...testDiagnosticBudgetViolations,
    ...legacySemanticAuthorityViolations,
  ];
  if (governanceViolations.length) {
    const error = new Error(
      `State writer policy progression failed: ${
        governanceViolations.map(({ code }) => code).join(", ")
      }`,
    );
    error.violations = governanceViolations;
    throw error;
  }
  const preserveFrozenBaseline = previousPolicy && !refreshP4Baseline;
  const baseline = preserveFrozenBaseline
    ? cloneJsonValue(previousPolicy.baseline)
    : {
      phase: "P4.0",
      sourceBaseSha: resolveGitCommitSha(resolvedBaseSha),
      generatedAt: String(generatedAt || "").trim()
        || new Date().toISOString(),
    };
  const baselines = preserveFrozenBaseline
    ? cloneJsonValue(previousPolicy.baselines)
    : currentBaselines;

  return {
    schemaVersion: 1,
    stateFacade: "js/core/state.js#state",
    baseline,
    writers,
    defaultOwners: {
      factoryGroups: defaultStateReport.factoryGroups,
      explicitKeys: defaultStateReport.explicitKeys,
      compatibilityHooks: defaultStateReport.compatibilityHooks,
    },
    baselines,
    progress: buildProgressState({
      phase: normalizedPhase,
      currentMetrics: currentProgressMetrics,
      currentWriters: writers,
      frozenLegacySemanticAuthority:
        baselines.legacySemanticAuthority,
      previousPolicy,
      refreshP4Baseline,
    }),
  };
}

function policyBindingSignatures(policy) {
  const signatures = new Set();
  for (const writer of policy.writers || []) {
    for (const binding of writer.bindings || []) {
      if (binding.authority === "compatibility-only") {
        continue;
      }
      signatures.add(`${writer.path}|${bindingSignature(binding)}`);
    }
  }
  return signatures;
}

export async function scanStateWriterPolicySnapshot(policy) {
  const legacyAllowlistPaths = await readLegacyStateWriterAllowlist();
  const policySignatures = policyBindingSignatures(policy);
  const candidates = await discoverScannedCandidateBindings(
    legacyAllowlistPaths,
    {
      previousPolicy: policy,
      baseSha: policy?.baseline?.sourceBaseSha,
    },
  );
  const candidateSignatures = new Set(
    candidates.map(
      (candidate) =>
        `${candidate.path}|${bindingSignature(candidate.binding)}`,
    ),
  );
  const unknownCandidateBindings = [...candidateSignatures]
    .filter((signature) => !policySignatures.has(signature))
    .sort();
  const stalePolicyBindings = [...policySignatures]
    .filter((signature) => !candidateSignatures.has(signature))
    .sort();
  const scans = [];
  for (const writer of policy.writers || []) {
    const absolutePath = path.join(PROJECT_ROOT, writer.path);
    if (!(await fileExists(absolutePath))) {
      scans.push({
        path: writer.path,
        surface: writer.surface,
        bindingId: "__missing-file__",
        findings: [{
          unsupported: true,
          reason: "writer-file-missing",
          line: 1,
          column: 1,
        }],
      });
      continue;
    }
    const source = await fs.readFile(absolutePath, "utf8");
    for (const binding of writer.bindings || []) {
      if (binding.authority === "compatibility-only") {
        continue;
      }
      scans.push({
        path: writer.path,
        surface: writer.surface,
        bindingId: binding.id,
        findings: scanBinding(source, writer.path, binding),
      });
    }
  }
  return {
    legacyAllowlistPaths,
    scans,
    unknownCandidateBindings,
    stalePolicyBindings,
  };
}

function parseCliArgs(argv) {
  const args = {
    write: false,
    baseSha: "",
    generatedAt: "",
    phase: "P4.0",
    refreshP4Baseline: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") {
      args.write = true;
    } else if (arg === "--base-sha") {
      args.baseSha = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--generated-at") {
      args.generatedAt = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--phase") {
      args.phase = normalizeP4StateActionPhase(argv[index + 1]);
      index += 1;
    } else if (arg === "--refresh-p4-baseline") {
      args.refreshP4Baseline = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const previousPolicy = args.refreshP4Baseline
    ? null
    : await readStateWriterPolicy().catch(() => null);
  const policy = await buildStateWriterPolicySnapshot({
    baseSha: args.baseSha,
    generatedAt: args.generatedAt,
    phase: args.phase,
    previousPolicy,
    refreshP4Baseline: args.refreshP4Baseline,
  });
  const serialized = `${JSON.stringify(policy, null, 2)}\n`;
  if (args.write) {
    await fs.writeFile(STATE_WRITER_POLICY_PATH, serialized, "utf8");
    console.log(
      `Wrote ${normalizeRelativePath(path.relative(PROJECT_ROOT, STATE_WRITER_POLICY_PATH))} with ${policy.writers.length} writers.`,
    );
    return;
  }
  process.stdout.write(serialized);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
