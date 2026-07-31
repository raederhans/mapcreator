import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import {
  buildStateActionLegacyMembershipReplacementContractIdentity,
  buildStateActionCrossFileMigrationContractIdentity,
  expandStateActionMembershipsWithLegacyReplacements,
  findStateActionReadOnlyContractEntry,
  getStateActionDelegationContractEntriesForModule,
  STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT,
  STATE_ACTION_DELEGATION_CONTRACT,
  STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT,
  validateStateActionCrossFileMigrationContract,
  validateStateActionDelegationContract,
  validateStateActionLegacyMembershipReplacementContract,
  validateStateActionModulePhaseAdmissions,
  validateStateActionModuleSource,
  validateStateActionPolicyBindings,
} from "../tools/state_action_delegation_contract.mjs";
import {
  scanStateMutations,
} from "../tools/state_writer_inventory.mjs";
import {
  buildCanonicalStateKeyAuthorityIndex,
  buildCanonicalStateKeyAuthorityCatalog,
  buildDefaultStateOwnershipReport,
  discoverGlobalStateFacadeImports,
  discoverGlobalStateImportBindings,
  getLegacyDirectAllowlistProjection,
  validateTestDiagnosticBudget,
  validateDomainActionSourceBoundary,
  validateStateWriterPolicySchema,
  validateStateWriterPolicySnapshot,
} from "../tools/state_writer_policy.mjs";
import {
  buildStateWriterDerivedAliasTaintModeManifest,
  buildP4CloseoutTargets,
  buildCallerToActionLedger,
  buildDerivedAliasTaintDiagnosticDelta,
  buildFrozenDerivedAliasTaintBaseline,
  buildIncrementalDerivedAliasTaintBaseline,
  buildUnbaselinedLegacyDiagnosticCounts,
  buildLegacyStateWriterSemanticAuthority,
  buildStateWriterBindingGrants,
  buildStateWriterPolicySnapshot,
  buildProgressState,
  buildStableStateBindingIdentity,
  discoverCandidatePaths,
  discoverStateWriterBindingsForSource,
  extractP42aCallerToActionBootstrapSeed,
  hasCanonicalStateMutationFinding,
  normalizeStateActionDelegations,
  readStateWriterPolicy,
  resolveAcceptedStateWriterPolicyCheckpoint,
  resolveGitCommitSha,
  composeLegacySemanticBaseline,
  validateStateWriterDerivedAliasTaintModeManifest,
  scanStateWriterPolicySnapshot,
  subtractLegacyStateWriterSemanticAuthority,
  validateLegacyStateWriterSemanticAuthority,
  validateLegacyStateWriterSemanticLedger,
  validateLegacyMembershipRetirementReplacements,
  validateStateWriterPolicyProgression,
} from "../tools/build_state_writer_policy.mjs";
import {
  DERIVED_ALIAS_TAINT_MODES,
} from "../tools/state_writer_inventory.mjs";
import {
  buildStateWriterVerificationIdentity,
  buildStateWriterCloseoutTargetViolations,
  buildStateWriterPolicyReport,
  recomputeDerivedAliasTaintBaseline,
  validateDerivedAliasTaintTransitionCheckpointProof,
  validateDerivedAliasTaintBaselineTransition,
  validateFrozenCloseoutTargets,
} from "../tools/check_state_writer_policy.mjs";

function createPolicyFixture() {
  return {
    schemaVersion: 1,
    baseline: {
      baseSha: "fixture",
      phase: "P4.0",
    },
    writers: [
      {
        path: "js/fixture.js",
        surface: "production",
        domain: "boot",
        authority: "legacy-direct",
        migrationPhase: "P4.1",
        bindings: [
          {
            id: "runtime-state",
            kind: "module",
            name: "state",
            authority: "legacy-direct",
            grants: [
              {
                domain: "boot",
                migrationPhase: "P4.1",
                operations: ["assign"],
                keys: ["bootPhase"],
                memberships: [
                  {
                    operation: "assign",
                    key: "bootPhase",
                  },
                ],
                aliasSites: [],
                dynamicSites: [],
                ambiguousSites: [],
                unsupportedSites: [],
              },
            ],
          },
        ],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        domain: "test-fixture",
        authority: "legacy-direct",
        migrationPhase: "closeout",
        bindings: [
          {
            id: "test-state",
            kind: "module",
            name: "state",
            authority: "test-fixture",
            grants: [
              {
                domain: "test-fixture",
                migrationPhase: "closeout",
                operations: ["assign"],
                keys: ["bootPhase"],
                memberships: [
                  {
                    operation: "assign",
                    key: "bootPhase",
                  },
                ],
                aliasSites: [],
                dynamicSites: [],
                ambiguousSites: [],
                unsupportedSites: [],
              },
            ],
          },
        ],
      },
    ],
  };
}

function createFinding(overrides = {}) {
  return {
    filePath: "js/fixture.js",
    bindingId: "runtime-state",
    operation: "assign",
    key: "bootPhase",
    dynamic: false,
    alias: "",
    aliasChain: [],
    line: 1,
    column: 1,
    ...overrides,
  };
}

function createEmptyLegacySemanticAuthority() {
  return {
    bindings: [],
    memberships: [],
    aliasSites: [],
    dynamicSites: [],
    ambiguousSites: [],
    unsupportedSites: [],
    collisions: [],
  };
}

async function buildFixtureLegacyWritersForSource(
  source,
  derivedAliasTaintMode,
) {
  const relativePath = "js/fixture.js";
  const { bindingInventories } =
    await discoverStateWriterBindingsForSource(
      relativePath,
      source,
      "production",
      {
        scanAllParameters: true,
        derivedAliasTaintMode,
        includeInventories: true,
      },
    );
  const bindings = bindingInventories
    .filter(({ findings }) => findings.length)
    .map(({ binding, findings }) => ({
      ...binding,
      authority: "legacy-target",
      grants: buildStateWriterBindingGrants(
        findings,
        relativePath,
        buildCanonicalStateKeyAuthorityIndex(),
        "production",
      ),
    }));
  return [{
    path: relativePath,
    surface: "production",
    domain: "boot",
    authority: "legacy-target",
    migrationPhase: "P4.1",
    bindings,
  }];
}

function createCallerActionLedgerEntry(index = 0, overrides = {}) {
  const callerPath = `js/bootstrap/fixture_${String(index).padStart(2, "0")}.js`;
  const callerBindingIdentity = JSON.stringify({
    kind: "function-parameter",
    name: "",
    functionName: `applyFixture${String(index).padStart(2, "0")}`,
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "$/property:targetState",
    importSource: "",
    importedName: "",
    aliasSources: [],
    aliasOperators: [],
  });
  const callerBindingId = `function:applyFixture${String(index).padStart(2, "0")}:0:$/property:targetState`;
  const domain = "boot";
  const migrationPhase = "P4.1";
  const operation = "assign";
  const key = `bootFixture${String(index).padStart(2, "0")}`;
  const actionModulePath = "js/core/state/actions/boot_actions.js";
  const actionExportName = "setBootStateFields";
  const targetArgumentIndex = 0;
  const start = 100 + index * 10;
  const end = start + 42;
  const sourceFingerprint = `${(index % 16).toString(16)}`.repeat(64);
  const retiredMembershipIdentity = [
    callerPath,
    callerBindingIdentity,
    domain,
    migrationPhase,
    operation,
    key,
  ].join("|");
  const actionCallEdgeIdentity =
    ((index + 1) % 16).toString(16).repeat(64);
  return {
    retiredMembershipIdentity,
    callerPath,
    callerBindingId,
    callerBindingIdentity,
    domain,
    migrationPhase,
    operation,
    key,
    actionModulePath,
    actionExportName,
    targetArgumentIndex,
    actionCallEdgeIdentity,
    occurrenceIndex: 0,
    start,
    end,
    line: 10 + index,
    column: 3,
    sourceFingerprint,
    retiredInPhase: "P4.1",
    recordedInPhase: "P4.2a",
    backfilled: true,
    ...overrides,
  };
}

function createActionDelegationObservation(entry, overrides = {}) {
  return {
    callerPath: entry.callerPath,
    callerBindingId: entry.callerBindingId,
    callerBindingIdentity: entry.callerBindingIdentity,
    actionModulePath: entry.actionModulePath,
    actionExportName: entry.actionExportName,
    targetArgumentIndex: entry.targetArgumentIndex,
    actionCallEdgeIdentity: entry.actionCallEdgeIdentity,
    occurrenceIndex: entry.occurrenceIndex,
    start: entry.start,
    end: entry.end,
    line: entry.line,
    column: entry.column,
    sourceFingerprint: entry.sourceFingerprint,
    ...overrides,
  };
}

function createCallerActionLedgerPolicy(entries = []) {
  const policy = createPolicyFixture();
  const actionWriter = policy.writers[0];
  actionWriter.path = "js/core/state/actions/boot_actions.js";
  actionWriter.authority = "domain-action";
  actionWriter.bindings[0] = {
    ...actionWriter.bindings[0],
    id: "function:setBootStateFields:0:$",
    kind: "function-parameter",
    name: "targetState",
    functionName: "setBootStateFields",
    parameterName: "targetState",
    parameterIndex: 0,
    parameterPath: "$",
    authority: "domain-action",
    grants: [{
      domain: "boot",
      migrationPhase: "P4.1",
      operations: ["assign"],
      keys: entries.map(({ key }) => key),
      memberships: entries.map(({ operation, key }) => ({
        operation,
        key,
      })),
      aliasSites: [],
      dynamicSites: [],
      ambiguousSites: [],
      unsupportedSites: [],
    }],
  };
  policy.writers = [actionWriter];
  const emptySemanticAuthority = createEmptyLegacySemanticAuthority();
  policy.baselines = {
    legacySemanticAuthority: emptySemanticAuthority,
  };
  policy.progress = {
    latestPhase: "P4.2a",
    checkpoints: [],
    retiredLegacySemanticAuthority: {
      ...emptySemanticAuthority,
      memberships: entries
        .map(({ retiredMembershipIdentity }) => retiredMembershipIdentity)
        .sort(),
    },
    callerToActionLedger: {
      schemaVersion: 1,
      entries,
    },
  };
  return policy;
}

function createCrossFileMigrationFixture() {
  const retiredCallerPath =
    "js/core/legacy_cross_file_fixture.js";
  const retiredBinding = {
    id: "module:runtimeState",
    kind: "module",
    name: "runtimeState",
    functionName: "",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "",
    importSource: "./state.js",
    importedName: "state",
    aliasSources: [],
    aliasOperators: [],
    authority: "legacy-direct",
    grants: [{
      domain: "boot",
      migrationPhase: "P4.1",
      operations: ["assign"],
      keys: ["bootPhase"],
      memberships: [{
        operation: "assign",
        key: "bootPhase",
        mutationSites: [{
          enclosingFunctionIdentity: JSON.stringify({
            kind: "function",
            ancestry: [{
              name: "applyLegacyBoot",
              ordinal: 0,
            }],
          }),
          sourceFingerprint: "a".repeat(64),
          occurrenceIndex: 0,
        }],
      }],
      aliasSites: [],
      dynamicSites: [],
      ambiguousSites: [],
      unsupportedSites: [],
    }],
  };
  const retiredCallerBindingIdentity =
    buildStableStateBindingIdentity(retiredBinding);
  const retiredMembershipIdentity = [
    retiredCallerPath,
    retiredCallerBindingIdentity,
    "boot",
    "P4.1",
    "assign",
    "bootPhase",
  ].join("|");
  const replacementCallerPath =
    "js/core/replacement_cross_file_fixture.js";
  const replacementCallerBindingIdentity = JSON.stringify({
    kind: "function-parameter",
    name: "",
    functionName: "createReplacementFixture",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "$/property:runtimeState",
    importSource: "",
    importedName: "",
    aliasSources: [],
    aliasOperators: [],
  });
  const replacementEnclosingFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{
      name: "createReplacementFixture",
      ordinal: 0,
    }, {
      name: "commitBoot",
      ordinal: 0,
    }],
  });
  const rawContract = {
    retiredCallerPath,
    retiredCallerBindingIdentity,
    retiredMembershipIdentity,
    domain: "boot",
    migrationPhase: "P4.1",
    operation: "assign",
    key: "bootPhase",
    retiredMutationSites:
      retiredBinding.grants[0].memberships[0].mutationSites,
    replacementCallerPath,
    replacementCallerBindingIdentity,
    replacementEnclosingFunctionIdentity,
    actionModulePath:
      "js/core/state/actions/boot_actions.js",
    actionExportName: "setBootStateFields",
    targetArgumentIndex: 0,
    replacementActionSourceFingerprint: "b".repeat(64),
  };
  const contract = {
    ...rawContract,
    contractIdentity:
      buildStateActionCrossFileMigrationContractIdentity(
        rawContract,
      ),
  };
  const previousWriter = {
    path: retiredCallerPath,
    surface: "production",
    domain: "boot",
    authority: "legacy-direct",
    migrationPhase: "P4.1",
    bindings: [retiredBinding],
  };
  const actionWriter = {
    path: contract.actionModulePath,
    surface: "production",
    domain: "boot",
    authority: "domain-action",
    migrationPhase: "P4.1",
    bindings: [{
      ...structuredClone(retiredBinding),
      id: "function:setBootStateFields:0:$",
      kind: "function-parameter",
      name: "targetState",
      functionName: "setBootStateFields",
      parameterName: "targetState",
      parameterIndex: 0,
      parameterPath: "$",
      importSource: "",
      importedName: "",
      authority: "domain-action",
    }],
  };
  const retiredLegacySemanticAuthority =
    subtractLegacyStateWriterSemanticAuthority(
      buildLegacyStateWriterSemanticAuthority([previousWriter]),
      buildLegacyStateWriterSemanticAuthority([]),
    );
  const previousPolicy = {
    writers: [previousWriter],
    progress: {
      latestPhase: "P4.2a",
      retiredLegacySemanticAuthority:
        createEmptyLegacySemanticAuthority(),
      callerToActionLedger: {
        schemaVersion: 1,
        entries: [],
      },
    },
  };
  const actionDelegation = {
    callerPath: replacementCallerPath,
    callerBindingId:
      "parameter:createReplacementFixture:0:fixture",
    callerBindingIdentity:
      replacementCallerBindingIdentity,
    enclosingFunctionIdentity:
      replacementEnclosingFunctionIdentity,
    actionModulePath: contract.actionModulePath,
    actionExportName: contract.actionExportName,
    targetArgumentIndex: 0,
    start: 50,
    end: 80,
    line: 5,
    column: 3,
    sourceFingerprint:
      contract.replacementActionSourceFingerprint,
  };
  return {
    actionDelegation,
    actionWriter,
    contract,
    previousPolicy,
    previousWriter,
    retiredLegacySemanticAuthority,
  };
}

const EXPECTED_LAZY_STATE_KEYS_BY_AUTHORITY = Object.freeze({
  "boot|P4.1": Object.freeze([
    "activePostReadyTaskKey",
    "activePostReadyTaskStartedAt",
    "longAnimationFrameObserver",
    "postReadyTaskDiagnostics",
    "startupInitialScenarioChunkVisualPromotion",
    "uiShellDebug",
    "uiShellDebugTerritorySeeded",
  ]),
  "scenario|P4.2": Object.freeze([
    "currentScenarioApplyRequestId",
    "currentScenarioApplyTargetId",
    "latestScenarioApplyRequestId",
    "latestScenarioApplyTargetId",
    "runtimePoliticalFeatureCollectionSeed",
    "scenarioApplyActiveRequestId",
    "scenarioApplyActiveTargetId",
    "scenarioAtlantropaRevision",
    "scenarioChunkPromotionRenderLocked",
    "scenarioFatalRecovery",
    "scenarioPerfMetrics",
    "scenarioPresentationStyleBeforeActivate",
    "scenarioRuntimeShellVersion",
    "selectionVersion",
  ]),
  "renderer|P4.3": Object.freeze([
    "canvasLayers",
    "colorCanvas",
    "colorCtx",
    "debugMode",
    "hgoRuntimePreview",
    "interactionOverlayCanvas",
    "interactionOverlayCtx",
    "lineCanvas",
    "lineCtx",
    "mediterraneanAtlantropaBoundsCache",
    "politicalPatchCanvas",
    "politicalPatchCtx",
    "projectedBoundsDiagnostics",
    "renderPerfMetrics",
    "renderPerfMetricSequence",
    "scenarioWaterCacheCoverageAlgo",
    "scenarioWaterCacheMode",
    "waterCacheCoverageAlgo",
    "waterCacheMode",
  ]),
  "color|P4.4": Object.freeze([
    "inspectorHighlightFeatureIds",
    "inspectorHighlightGroupMode",
    "inspectorHighlightLabel",
    "legendColorOrder",
  ]),
  "ui|P4.4": Object.freeze([
    "countryInspectorShowDetails",
    "lastDirtyReason",
    "legendControl",
    "specialZoneMembershipTool",
    "specialZonePresetCategory",
    "specialZonePresetOpenCategories",
    "specialZonePreviousTool",
  ]),
  "dev|P4.4": Object.freeze([
    "devWorkspaceTagPopoverDismissHandler",
  ]),
  "runtime-hooks|P4.5": Object.freeze([
    "resolveSpecialZoneParentGroupTargetIdsFn",
    "syncDayNightClockTimerFn",
    "updateSpecialZonesWorkbenchCurrentTargetUIFn",
    "updateSpecialZonesWorkbenchUIFn",
  ]),
});

test("legacy-direct projection remains an exact sorted file allowlist", () => {
  const policy = createPolicyFixture();

  assert.deepEqual(
    getLegacyDirectAllowlistProjection(policy),
    ["js/fixture.js", "tests/fixture.test.mjs"],
  );
});

test("policy snapshot keeps production and test denominators separate", () => {
  const policy = createPolicyFixture();
  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [
      "js/fixture.js",
      "tests/fixture.test.mjs",
    ],
    scans: [
      {
        path: "js/fixture.js",
        surface: "production",
        bindingId: "runtime-state",
        findings: [createFinding()],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        bindingId: "test-state",
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
          }),
        ],
      },
    ],
  });

  assert.equal(result.verdict, "pass");
  assert.deepEqual(result.metrics.legacyDirectFiles, {
    production: 1,
    test: 1,
    total: 2,
  });
  assert.equal(result.metrics.legacyMemberships.production, 1);
  assert.equal(result.metrics.legacyMemberships.test, 0);
  assert.deepEqual(result.metrics.allMemberships, {
    production: 1,
    test: 1,
    total: 2,
  });
  assert.equal(
    result.metrics.bindingScoped.memberships.test.testFixture,
    1,
  );
});

test("policy snapshot rejects new keys, operations, aliases, and dynamic sites", () => {
  const cases = [
    {
      name: "key",
      finding: createFinding({ key: "unexpectedKey" }),
      expectedCode: "unknown-key",
    },
    {
      name: "operation",
      finding: createFinding({ operation: "delete" }),
      expectedCode: "unknown-operation",
    },
    {
      name: "alias",
      finding: createFinding({
        alias: "runtimeAlias",
        aliasChain: ["runtimeAlias"],
      }),
      expectedCode: "unknown-alias-site",
    },
    {
      name: "dynamic",
      finding: createFinding({
        key: "*",
        dynamic: true,
        line: 7,
        column: 3,
      }),
      expectedCode: "unknown-dynamic-site",
    },
  ];

  for (const fixture of cases) {
    const result = validateStateWriterPolicySnapshot({
      policy: createPolicyFixture(),
      legacyAllowlistPaths: [
        "js/fixture.js",
        "tests/fixture.test.mjs",
      ],
      scans: [
        {
          path: "js/fixture.js",
          surface: "production",
          bindingId: "runtime-state",
          findings: [fixture.finding],
        },
      ],
    });

    assert.equal(result.verdict, "fail", fixture.name);
    assert.ok(
      result.violations.some(({ code }) => code === fixture.expectedCode),
      fixture.name,
    );
  }
});

test("dynamic nested paths satisfy their exact top-level key grant", () => {
  const policy = createPolicyFixture();
  policy.writers[0].bindings[0].grants[0].dynamicSites = [
    {
      line: 7,
      column: 3,
      operation: "assign",
      key: "bootPhase",
      pathPattern: "bootPhase.*",
    },
  ];
  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [
      "js/fixture.js",
      "tests/fixture.test.mjs",
    ],
    scans: [
      {
        path: "js/fixture.js",
        surface: "production",
        bindingId: "runtime-state",
        findings: [
          createFinding({
            key: "bootPhase",
            dynamic: true,
            pathSegments: ["bootPhase", "*"],
            line: 7,
            column: 3,
          }),
        ],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        bindingId: "test-state",
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
          }),
        ],
      },
    ],
  });

  assert.equal(result.verdict, "pass", JSON.stringify(result.violations, null, 2));
});

test("policy snapshot consumes identical semantic sites as a multiset", () => {
  const policy = createPolicyFixture();
  const grant = policy.writers[0].bindings[0].grants[0];
  const sourceFingerprint = "a".repeat(64);
  grant.aliasSites = [
    {
      alias: "bootAlias",
      aliasChain: ["bootAlias"],
      operation: "assign",
      key: "bootPhase",
      line: 2,
      column: 3,
      sourceFingerprint,
    },
    {
      alias: "bootAlias",
      aliasChain: ["bootAlias"],
      operation: "assign",
      key: "bootPhase",
      line: 4,
      column: 5,
      sourceFingerprint,
    },
  ];
  const validateCount = (count) =>
    validateStateWriterPolicySnapshot({
      policy,
      legacyAllowlistPaths: [
        "js/fixture.js",
        "tests/fixture.test.mjs",
      ],
      scans: [
        {
          path: "js/fixture.js",
          surface: "production",
          bindingId: "runtime-state",
          findings: Array.from({ length: count }, (_, index) =>
            createFinding({
              alias: "bootAlias",
              aliasChain: ["bootAlias"],
              line: 2 + index * 2,
              column: 3 + index * 2,
              sourceFingerprint,
            })),
        },
        {
          path: "tests/fixture.test.mjs",
          surface: "test",
          bindingId: "test-state",
          findings: [
            createFinding({
              filePath: "tests/fixture.test.mjs",
              bindingId: "test-state",
            }),
          ],
        },
      ],
    });

  const oneObserved = validateCount(1);
  assert.equal(
    oneObserved.violations.filter(
      ({ code }) => code === "stale-alias-site",
    ).length,
    1,
  );
  assert.equal(
    validateCount(2).verdict,
    "pass",
  );
});

test("policy snapshot authorizes exact operation and key memberships", () => {
  const policy = createPolicyFixture();
  const grant = policy.writers[0].bindings[0].grants[0];
  grant.operations = ["assign", "delete"];
  grant.keys = ["bootPhase", "pendingWork"];
  grant.memberships = [
    { operation: "assign", key: "bootPhase" },
    { operation: "delete", key: "pendingWork" },
  ];

  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans: [
      {
        path: "js/fixture.js",
        surface: "production",
        bindingId: "runtime-state",
        findings: [
          createFinding({ operation: "delete", key: "bootPhase" }),
          createFinding({ operation: "assign", key: "pendingWork" }),
        ],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        bindingId: "test-state",
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
          }),
        ],
      },
    ],
  });

  assert.equal(result.verdict, "fail");
  assert.equal(
    result.violations.filter(({ code }) => code === "unknown-membership").length,
    2,
  );
});

test("domain actions reject module imports of the global state facade", () => {
  const policy = createPolicyFixture();
  const writer = policy.writers[0];
  writer.path = "js/core/state/actions/boot_actions.js";
  writer.authority = "domain-action";
  writer.bindings[0].authority = "domain-action";

  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["tests/fixture.test.mjs"],
    scans: [
      {
        path: writer.path,
        surface: "production",
        bindingId: "runtime-state",
        findings: [createFinding({ filePath: writer.path })],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        bindingId: "test-state",
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
          }),
        ],
      },
    ],
  });

  assert.ok(
    result.violations.some(
      ({ code }) => code === "domain-action-global-state-import",
    ),
  );
});

test("domain action source boundary rejects every canonical state facade module access", () => {
  const fixtures = [
    {
      name: "read-only named import",
      source: `
        import { state as runtimeState } from "../../state.js";
        export function readBootStatus() {
          return runtimeState.bootStatus;
        }
      `,
      specifierType: "named",
    },
    {
      name: "namespace import",
      source: `
        import * as stateModule from "../../state.js";
        export function writeBootStatus() {
          stateModule.state.bootStatus = "ready";
        }
      `,
      specifierType: "namespace",
    },
    {
      name: "dynamic import",
      source: `
        export async function loadStateFacade() {
          return import("../../state.js");
        }
      `,
      specifierType: "dynamic",
    },
    {
      name: "named re-export",
      source: `export { state as runtimeState } from "../../state.js";`,
      specifierType: "re-export-named",
    },
    {
      name: "empty re-export dependency",
      source: `export {} from "../../state.js";`,
      specifierType: "re-export-named",
    },
    {
      name: "namespace re-export",
      source: `export * as stateModule from "../../state.js";`,
      specifierType: "re-export-all",
    },
    {
      name: "star re-export",
      source: `export * from "../../state.js";`,
      specifierType: "re-export-all",
    },
  ];

  for (const fixture of fixtures) {
    const violations = validateDomainActionSourceBoundary(fixture.source, {
      filePath: "js/core/state/actions/boot_actions.js",
    });
    assert.equal(violations.length, 1, fixture.name);
    assert.equal(
      violations[0].code,
      "domain-action-global-state-import",
      fixture.name,
    );
    assert.equal(violations[0].specifierType, fixture.specifierType, fixture.name);
  }
});

test("domain action source boundary fails closed when source parsing fails", () => {
  const violations = validateDomainActionSourceBoundary(
    `import { state as runtimeState } from "../../state.js";\nexport function broken(`,
    {
      filePath: "js/core/state/actions/boot_actions.js",
    },
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].code, "domain-action-source-parse-failed");
  assert.equal(violations[0].path, "js/core/state/actions/boot_actions.js");
  assert.match(violations[0].reason, /Unexpected token/);
});

test("global state facade discovery ignores similarly named non-facade modules", () => {
  const source = `
    import { state as localFixture } from "../../fixture_state.js";
    export { state as fixtureState } from "../../fixture_state.js";
    export async function loadFixture() {
      return import("../../fixture_state.js");
    }
  `;

  assert.deepEqual(
    discoverGlobalStateFacadeImports(source, {
      filePath: "js/core/state/actions/boot_actions.js",
    }),
    [],
  );
});

test("policy snapshot rejects wrong state-key domain and migration phase grants", () => {
  for (const fixture of [
    {
      name: "wrong domain",
      mutate(grant) {
        grant.domain = "ui";
      },
    },
    {
      name: "wrong migration phase",
      mutate(grant) {
        grant.migrationPhase = "P9";
      },
    },
  ]) {
    const policy = createPolicyFixture();
    fixture.mutate(policy.writers[0].bindings[0].grants[0]);
    const result = validateStateWriterPolicySnapshot({
      policy,
      legacyAllowlistPaths: [
        "js/fixture.js",
        "tests/fixture.test.mjs",
      ],
      scans: [
        {
          path: "js/fixture.js",
          surface: "production",
          bindingId: "runtime-state",
          findings: [createFinding()],
        },
        {
          path: "tests/fixture.test.mjs",
          surface: "test",
          bindingId: "test-state",
          findings: [
            createFinding({
              filePath: "tests/fixture.test.mjs",
              bindingId: "test-state",
            }),
          ],
        },
      ],
    });

    assert.ok(
      result.violations.some(
        ({ code }) => code === "grant-authority-mismatch",
      ),
      fixture.name,
    );
  }
});

test("canonical authority index locks the complete lazy-key catalog by domain and phase", () => {
  const authorityIndex = buildCanonicalStateKeyAuthorityIndex();
  const actualKeysByAuthority = {};

  for (const [authority, expectedKeys] of Object.entries(
    EXPECTED_LAZY_STATE_KEYS_BY_AUTHORITY,
  )) {
    const [domain, migrationPhase] = authority.split("|");
    actualKeysByAuthority[authority] = [];
    for (const key of expectedKeys) {
      assert.deepEqual(
        authorityIndex.get(key),
        {
          domain,
          migrationPhase,
          owner: `lazy:${key}`,
        },
        key,
      );
      actualKeysByAuthority[authority].push(key);
    }
  }

  const expectedLazyKeys = Object.values(
    EXPECTED_LAZY_STATE_KEYS_BY_AUTHORITY,
  ).flat().sort();
  const actualLazyKeys = [...authorityIndex.entries()]
    .filter(([, authority]) =>
      String(authority?.owner || "").startsWith("lazy:")
    )
    .map(([key]) => key)
    .sort();

  assert.equal(expectedLazyKeys.length, 56);
  assert.deepEqual(actualLazyKeys, expectedLazyKeys);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(actualKeysByAuthority).map(([authority, keys]) => [
        authority,
        keys.sort(),
      ]),
    ),
    Object.fromEntries(
      Object.entries(EXPECTED_LAZY_STATE_KEYS_BY_AUTHORITY).map(
        ([authority, keys]) => [authority, [...keys].sort()],
      ),
    ),
  );
});

test("production concrete keys without canonical authority fail closed", () => {
  const policy = createPolicyFixture();
  const writer = policy.writers[0];
  writer.path = "js/bootstrap/fixture.js";
  const grant = writer.bindings[0].grants[0];
  grant.keys = ["lazyRuntimeMetric"];
  grant.memberships = [
    {
      operation: "assign",
      key: "lazyRuntimeMetric",
    },
  ];

  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [
      writer.path,
      "tests/fixture.test.mjs",
    ],
    scans: [
      {
        path: writer.path,
        surface: "production",
        bindingId: "runtime-state",
        findings: [
          createFinding({
            filePath: writer.path,
            key: "lazyRuntimeMetric",
          }),
        ],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        bindingId: "test-state",
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
          }),
        ],
      },
    ],
  });

  assert.ok(
    result.violations.some(
      ({ code, key }) =>
        code === "unknown-state-key-authority"
        && key === "lazyRuntimeMetric",
    ),
  );
  assert.deepEqual(result.metrics.unregisteredConcreteKeyAuthorities, [
    {
      key: "lazyRuntimeMetric",
      authorities: [
        {
          domain: "boot",
          migrationPhase: "P4.1",
          paths: ["js/bootstrap/fixture.js"],
        },
      ],
    },
  ]);
});

test("same unregistered key cannot inherit conflicting path fallback authorities", () => {
  const policy = createPolicyFixture();
  const bootWriter = policy.writers[0];
  bootWriter.path = "js/bootstrap/fixture.js";
  const bootGrant = bootWriter.bindings[0].grants[0];
  bootGrant.keys = ["sharedLazyMetric"];
  bootGrant.memberships = [
    {
      operation: "assign",
      key: "sharedLazyMetric",
    },
  ];
  const scenarioWriter = structuredClone(bootWriter);
  scenarioWriter.path = "js/core/scenario/fixture.js";
  scenarioWriter.domain = "scenario";
  scenarioWriter.migrationPhase = "P4.2";
  scenarioWriter.bindings[0].id = "scenario-state";
  scenarioWriter.bindings[0].grants[0].domain = "scenario";
  scenarioWriter.bindings[0].grants[0].migrationPhase = "P4.2";
  policy.writers.splice(1, 0, scenarioWriter);

  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [
      bootWriter.path,
      scenarioWriter.path,
      "tests/fixture.test.mjs",
    ],
    scans: [
      {
        path: bootWriter.path,
        surface: "production",
        bindingId: "runtime-state",
        findings: [
          createFinding({
            filePath: bootWriter.path,
            key: "sharedLazyMetric",
          }),
        ],
      },
      {
        path: scenarioWriter.path,
        surface: "production",
        bindingId: "scenario-state",
        findings: [
          createFinding({
            filePath: scenarioWriter.path,
            bindingId: "scenario-state",
            key: "sharedLazyMetric",
          }),
        ],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        bindingId: "test-state",
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
          }),
        ],
      },
    ],
  });

  assert.ok(
    result.violations.some(
      ({ code, key }) =>
        code === "unregistered-key-authority-conflict"
        && key === "sharedLazyMetric",
    ),
  );
});

test("policy builder preflight reports every production unknown concrete key", async () => {
  const builderModule = await import("../tools/build_state_writer_policy.mjs");
  assert.equal(
    typeof builderModule.collectUnknownStateKeyAuthorityViolations,
    "function",
  );
  const violations =
    builderModule.collectUnknownStateKeyAuthorityViolations([
      {
        path: "js/bootstrap/fixture.js",
        surface: "production",
        binding: { id: "boot-state" },
        findings: [
          createFinding({
            bindingId: "boot-state",
            key: "firstUnknownKey",
          }),
          createFinding({
            bindingId: "boot-state",
            key: "secondUnknownKey",
          }),
          createFinding({
            bindingId: "boot-state",
            key: "*",
            unsupported: true,
          }),
        ],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        binding: { id: "test-state" },
        findings: [
          createFinding({
            bindingId: "test-state",
            key: "testOnlyUnknownKey",
          }),
        ],
      },
    ]);

  assert.deepEqual(
    violations.map(({ key }) => key),
    ["firstUnknownKey", "secondUnknownKey"],
  );
});

test("policy schema rejects duplicate operation and key memberships across grants", () => {
  const policy = createPolicyFixture();
  const binding = policy.writers[0].bindings[0];
  binding.grants.push({
    domain: "ui",
    migrationPhase: "P4.4",
    operations: ["assign"],
    keys: ["bootPhase"],
    memberships: [
      {
        operation: "assign",
        key: "bootPhase",
      },
    ],
    aliasSites: [],
    dynamicSites: [],
    ambiguousSites: [],
    unsupportedSites: [],
  });

  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [
      "js/fixture.js",
      "tests/fixture.test.mjs",
    ],
    scans: [
      {
        path: "js/fixture.js",
        surface: "production",
        bindingId: "runtime-state",
        findings: [createFinding()],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        bindingId: "test-state",
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
          }),
        ],
      },
    ],
  });

  assert.ok(
    result.violations.some(
      ({ code }) => code === "duplicate-binding-membership",
    ),
  );
});

test("state action delegation contract validates registered module exports and target signatures", () => {
  const contractViolations =
    validateStateActionDelegationContract();
  assert.deepEqual(contractViolations, []);

  const sourceViolations = validateStateActionModuleSource(
    `
      export function setBootStateFields(target, patch = {}) {
        target.bootPhase = patch.phase;
      }
    `,
    {
      filePath: "js/core/state/actions/boot_actions.js",
      contractEntries: [{
        modulePath: "js/core/state/actions/boot_actions.js",
        exportName: "setBootStateFields",
        targetArgumentIndex: 0,
        introducedInPhase: "P4.1",
      }],
    },
  );
  assert.deepEqual(sourceViolations, []);
});

test("P4.2b chunk action modules register every writable and read-only export", () => {
  const modules = [
    {
      modulePath:
        "js/core/state/actions/scenario_chunk_runtime_actions.js",
      writableExportNames: [
        "ensureScenarioChunkRuntimeState",
        "resetScenarioChunkRuntimeState",
        "replaceScenarioChunkRuntimeState",
        "patchScenarioChunkLoadState",
        "commitScenarioChunkSelectionState",
        "beginScenarioChunkLoadState",
        "completeScenarioChunkLoadState",
        "failScenarioChunkLoadState",
        "finishScenarioChunkLoadState",
        "commitScenarioChunkPayloadEntriesState",
        "evictScenarioChunkPayloadsState",
        "setScenarioChunkMergedLayerPayloadsState",
        "replaceScenarioChunkPendingPromotionIdentityState",
        "queueScenarioChunkPromotionState",
        "setScenarioChunkPromotionStatusState",
        "clearScenarioChunkPromotionState",
        "setScenarioChunkRuntimeHooksState",
      ],
      readOnlyExportNames: [
        "SCENARIO_CHUNK_LOAD_STATE_PATCH_KEYS",
        "captureScenarioChunkLoadStateContinuation",
      ],
    },
    {
      modulePath:
        "js/core/state/actions/scenario_activation_actions.js",
      writableExportNames: [
        "applyScenarioChunkOptionalLayerState",
        "restoreScenarioChunkPromotionState",
      ],
      readOnlyExportNames: [
        "SCENARIO_CHUNK_OPTIONAL_LAYER_STATE_CONFIGS",
        "getScenarioChunkOptionalLayerState",
        "captureScenarioChunkPromotionState",
      ],
    },
    {
      modulePath:
        "js/core/state/actions/scenario_presentation_actions.js",
      writableExportNames: [
        "applyScenarioChunkCityExternalEffectState",
        "finalizeScenarioChunkCityExternalEffectState",
      ],
      readOnlyExportNames: [],
    },
    {
      modulePath:
        "js/core/state/actions/scenario_chunk_promotion_actions.js",
      writableExportNames: [
        "setScenarioPoliticalChunkPayloadState",
        "bumpScenarioChunkDataGenerationState",
        "commitScenarioPoliticalChunkPayloadState",
        "setScenarioChunkPromotionRenderLockState",
        "setDefaultRuntimePoliticalTopologyState",
        "restoreScenarioChunkPromotionRootState",
      ],
      readOnlyExportNames: [
        "captureScenarioChunkPromotionRootState",
      ],
    },
  ];

  for (
    const {
      modulePath,
      writableExportNames,
      readOnlyExportNames,
    } of modules
  ) {
    const entries = getStateActionDelegationContractEntriesForModule(
      modulePath,
    ).filter(({ introducedInPhase }) => introducedInPhase === "P4.2b");
    assert.deepEqual(
      entries.map(({ exportName }) => exportName),
      writableExportNames,
    );
    assert.ok(entries.every(
      ({ introducedInPhase, targetArgumentIndex }) =>
        introducedInPhase === "P4.2b" && targetArgumentIndex === 0,
    ));
    assert.deepEqual(
      readOnlyExportNames.map((exportName) =>
        findStateActionReadOnlyContractEntry(modulePath, exportName)
      ),
      readOnlyExportNames.map((exportName) => ({
        modulePath,
        exportName,
        targetArgumentIndex: 0,
      })),
    );
    assert.deepEqual(
      validateStateActionModuleSource(
        fs.readFileSync(new URL(`../${modulePath}`, import.meta.url), "utf8"),
        { filePath: modulePath },
      ),
      [],
    );
  }
});

test("P4.2b optional-layer actions explicitly replace the retired wildcard membership", () => {
  const modulePath =
    "js/core/state/actions/scenario_activation_actions.js";
  const retiredMembership = "scenario|P4.2|assign|*";
  const requiredConcreteMemberships = [
    "scenario|P4.2|assign|scenarioAtlantropaData",
    "scenario|P4.2|assign|scenarioAtlantropaRevision",
    "scenario|P4.2|assign|scenarioReliefOverlayRevision",
    "scenario|P4.2|assign|scenarioReliefOverlaysData",
    "scenario|P4.2|assign|scenarioSpecialRegionsData",
    "scenario|P4.2|assign|scenarioStrategicValuesData",
    "scenario|P4.2|assign|scenarioStrategicValuesRevision",
    "scenario|P4.2|assign|scenarioWaterRegionsData",
    "ui|P4.4|assign|specialZoneLayers",
  ];
  assert.deepEqual(
    validateStateActionLegacyMembershipReplacementContract(),
    [],
  );
  assert.deepEqual(
    STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT.map(({
      contractIdentity: _contractIdentity,
      ...entry
    }) => entry),
    [
      {
        modulePath,
        exportName: "applyScenarioChunkOptionalLayerState",
        retiredMembership,
        requiredConcreteMemberships,
      },
      {
        modulePath,
        exportName: "restoreScenarioChunkPromotionState",
        retiredMembership,
        requiredConcreteMemberships,
      },
    ],
  );
  assert.ok(STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT.every(
    (entry) =>
      /^[a-f0-9]{64}$/.test(entry.contractIdentity)
      && entry.contractIdentity
        === buildStateActionLegacyMembershipReplacementContractIdentity(entry),
  ));
  for (const exportName of [
    "applyScenarioChunkOptionalLayerState",
    "restoreScenarioChunkPromotionState",
  ]) {
    assert.deepEqual(
      [...expandStateActionMembershipsWithLegacyReplacements({
        modulePath,
        exportName,
        memberships: requiredConcreteMemberships,
      })].sort(),
      [...requiredConcreteMemberships, retiredMembership].sort(),
    );
    assert.equal(
      expandStateActionMembershipsWithLegacyReplacements({
        modulePath,
        exportName,
        memberships: requiredConcreteMemberships.slice(1),
      }).has(retiredMembership),
      false,
    );
    assert.equal(
      expandStateActionMembershipsWithLegacyReplacements({
        modulePath,
        exportName,
        memberships: [
          ...requiredConcreteMemberships,
          "scenario|P4.2|assign|unexpectedFutureKey",
        ],
      }).has(retiredMembership),
      false,
    );
  }
  assert.equal(
    expandStateActionMembershipsWithLegacyReplacements({
      modulePath,
      exportName: "setScenarioChunkPromotionRenderLockState",
      memberships: requiredConcreteMemberships,
    }).has(retiredMembership),
    false,
  );
});

test("legacy wildcard replacement contract rejects malformed coverage", () => {
  const valid = structuredClone(
    STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT[0],
  );
  const malformed = [
    {
      ...valid,
      requiredConcreteMemberships:
        valid.requiredConcreteMemberships.slice(1),
    },
    {
      ...valid,
      requiredConcreteMemberships: [
        ...valid.requiredConcreteMemberships,
        valid.requiredConcreteMemberships[0],
      ],
    },
    {
      ...valid,
      requiredConcreteMemberships:
        [...valid.requiredConcreteMemberships].reverse(),
    },
    {
      ...valid,
      retiredMembership: "scenario|P4.2|assign|concrete",
    },
  ];
  assert.ok(malformed.every((entry) =>
    validateStateActionLegacyMembershipReplacementContract([entry])
      .length > 0
  ));
});

test("state action delegation contract rejects invalid and duplicate entries", () => {
  const modulePath = "js/core/state/actions/boot_actions.js";
  const violations = validateStateActionDelegationContract([
    {
      modulePath,
      exportName: "setBootStateFields",
      targetArgumentIndex: 0,
      introducedInPhase: "P4.1",
    },
    {
      modulePath,
      exportName: "setBootStateFields",
      targetArgumentIndex: 0,
      introducedInPhase: "P4.1",
    },
    {
      modulePath: "./js/core/state/actions/escape.js",
      exportName: "default",
      targetArgumentIndex: 1,
      introducedInPhase: "P4.1",
    },
    null,
  ]);

  assert.deepEqual(
    violations.map(({ code }) => code),
    [
      "state-action-contract-entry-duplicate",
      "state-action-contract-module-path-invalid",
      "state-action-contract-export-name-invalid",
      "state-action-contract-target-index-invalid",
      "state-action-contract-entry-invalid",
    ],
  );
});

test("state action module admission rejects future-phase authority", () => {
  const contractEntries = [{
    modulePath: "js/core/state/actions/ui_chrome_actions.js",
    exportName: "replaceExportWorkbenchUiState",
    targetArgumentIndex: 0,
    introducedInPhase: "P4.4",
  }];

  assert.deepEqual(
    validateStateActionModulePhaseAdmissions({
      modulePaths: [
        "js/core/state/actions/ui_chrome_actions.js",
      ],
      phase: "P4.2a",
      contractEntries,
    }),
    [{
      code: "state-action-module-phase-not-admitted",
      modulePath: "js/core/state/actions/ui_chrome_actions.js",
      introducedInPhase: "P4.4",
      currentPhase: "P4.2a",
    }],
  );
  assert.deepEqual(
    validateStateActionModulePhaseAdmissions({
      modulePaths: [
        "js/core/state/actions/ui_chrome_actions.js",
      ],
      phase: "P4.4",
      contractEntries,
    }),
    [],
  );
});

test("state action module source requires one direct named export with target at argument zero", () => {
  const modulePath = "js/core/state/actions/boot_actions.js";
  const contractEntries = [{
    modulePath,
    exportName: "setBootStateFields",
    targetArgumentIndex: 0,
    introducedInPhase: "P4.1",
  }];
  const scan = (source) =>
    validateStateActionModuleSource(source, {
      filePath: modulePath,
      contractEntries,
    }).map(({ code }) => code);

  const invalidSources = [
    {
      source: "export function other(target) { target.bootPhase = 'ready'; }",
      expected: [
        "state-action-direct-export-unregistered",
        "state-action-direct-export-missing",
      ],
    },
    {
      source:
        "export const setBootStateFields = (target) => { target.bootPhase = 'ready'; };",
      expected: [
        "state-action-direct-export-missing",
        "state-action-export-not-direct-function",
      ],
    },
    {
      source:
        "function setBootStateFields(target) {} export { setBootStateFields };",
      expected: [
        "state-action-direct-export-missing",
        "state-action-export-not-direct-function",
      ],
    },
    {
      source:
        "export { setBootStateFields } from './bridge.js';",
      expected: [
        "state-action-direct-export-missing",
        "state-action-export-not-direct-function",
      ],
    },
    {
      source: "export default function(target) {}",
      expected: [
        "state-action-export-unregistered",
        "state-action-direct-export-missing",
      ],
    },
    {
      source: "export * from './bridge.js';",
      expected: [
        "state-action-export-unregistered",
        "state-action-direct-export-missing",
      ],
    },
    {
      source:
        "export function setBootStateFields(options, target) { target.bootPhase = options.phase; }",
      expected: ["state-action-target-parameter-name-invalid"],
    },
    {
      source:
        "export function setBootStateFields(target = {}) { target.bootPhase = 'ready'; }",
      expected: ["state-action-target-parameter-shape-invalid"],
    },
    {
      source:
        "export function setBootStateFields(...target) { target.bootPhase = 'ready'; }",
      expected: ["state-action-target-parameter-shape-invalid"],
    },
    {
      source:
        "export function setBootStateFields({ target }) { target.bootPhase = 'ready'; }",
      expected: ["state-action-target-parameter-shape-invalid"],
    },
    {
      source: "export function setBootStateFields(",
      expected: ["state-action-source-parse-failed"],
    },
  ];

  for (const { source, expected } of invalidSources) {
    assert.deepEqual(scan(source), expected, source);
  }
});

test("state action module source rejects unregistered target-first exports and unregistered modules", () => {
  const modulePath = "js/core/state/actions/boot_actions.js";
  const contractEntries = [{
    modulePath,
    exportName: "setBootStateFields",
    targetArgumentIndex: 0,
    introducedInPhase: "P4.1",
  }];
  const violations = validateStateActionModuleSource(
    `
      export function setBootStateFields(target) {
        target.bootPhase = "ready";
      }
      export function stealState(target) {
        target.bootMessage = "escaped";
      }
      export function stealRuntimeState(state) {
        state.bootError = "escaped";
      }
      const bridge = () => {};
      export { bridge };
    `,
    { filePath: modulePath, contractEntries },
  );
  assert.deepEqual(
    violations.map(({ code, exportName }) => ({ code, exportName })),
    [
      {
        code: "state-action-direct-export-unregistered",
        exportName: "stealState",
      },
      {
        code: "state-action-direct-export-unregistered",
        exportName: "stealRuntimeState",
      },
      {
        code: "state-action-export-unregistered",
        exportName: "bridge",
      },
    ],
  );

  assert.deepEqual(
    validateStateActionModuleSource(
      "export function stealState(target) {}",
      {
        filePath: "js/core/state/actions/unregistered_actions.js",
        contractEntries,
      },
    ).map(({ code }) => code),
    [
      "state-action-module-contract-missing",
      "state-action-direct-export-unregistered",
    ],
  );
});

test("state action policy bindings require exact domain-action target authority with zero diagnostics", () => {
  const modulePath = "js/core/state/actions/boot_actions.js";
  const contractEntries = [{
    modulePath,
    exportName: "setBootStateFields",
    targetArgumentIndex: 0,
    introducedInPhase: "P4.1",
  }];
  const createBinding = (overrides = {}) => ({
    id: "parameter:setBootStateFields:0:fixture",
    kind: "function-parameter",
    functionName: "setBootStateFields",
    parameterName: "target",
    parameterIndex: 0,
    parameterPath: "$",
    authority: "domain-action",
    grants: [{
      aliasSites: [],
      dynamicSites: [],
      ambiguousSites: [],
      unsupportedSites: [],
    }],
    ...overrides,
  });
  const createWriter = (bindings, overrides = {}) => ({
    path: modulePath,
    authority: "domain-action",
    bindings,
    ...overrides,
  });
  const validate = (writers) =>
    validateStateActionPolicyBindings(writers, {
      contractEntries,
      modulePaths: [modulePath],
    }).map(({ code }) => code);

  assert.deepEqual(validate([createWriter([createBinding()])]), []);
  assert.deepEqual(validate([]), ["state-action-policy-writer-missing"]);
  assert.deepEqual(
    validate([
      createWriter(
        [createBinding()],
        { authority: "legacy-target" },
      ),
    ]),
    ["state-action-policy-writer-authority-invalid"],
  );
  assert.deepEqual(
    validate([createWriter([])]),
    ["state-action-policy-binding-missing"],
  );
  assert.deepEqual(
    validate([
      createWriter([
        createBinding({
          parameterIndex: 1,
          parameterPath: "$/property:target",
        }),
      ]),
    ]),
    ["state-action-policy-binding-shape-invalid"],
  );
  assert.deepEqual(
    validate([
      createWriter([
        createBinding({
          grants: [{
            aliasSites: [{}],
            dynamicSites: [{}],
            ambiguousSites: [{}],
            unsupportedSites: [{}],
          }],
        }),
      ]),
    ]),
    ["state-action-policy-binding-diagnostics-invalid"],
  );
  assert.deepEqual(
    validate([
      createWriter([
        createBinding({
          grants: [{
            aliasSites: [{
              alias: "target",
              aliasChain: ["target"],
              operation: "assign",
              key: "bootPhase",
              line: 9,
              column: 3,
              sourceFingerprint: "a".repeat(64),
            }, {
              alias: "target",
              aliasChain: ["target", "target"],
              operation: "delete",
              key: "startupReadonlyReason",
              line: 19,
              column: 3,
              sourceFingerprint: "b".repeat(64),
            }],
            dynamicSites: [],
            ambiguousSites: [],
            unsupportedSites: [],
          }],
        }),
      ]),
    ]),
    [],
  );
  assert.deepEqual(
    validate([
      createWriter([
        createBinding({
          grants: [{
            aliasSites: [{
              alias: "targetAlias",
              aliasChain: ["targetAlias"],
              operation: "assign",
              key: "bootPhase",
              line: 9,
              column: 3,
              sourceFingerprint: "a".repeat(64),
            }],
            dynamicSites: [],
            ambiguousSites: [],
            unsupportedSites: [],
          }],
        }),
      ]),
    ]),
    ["state-action-policy-binding-diagnostics-invalid"],
  );
  assert.deepEqual(
    validate([
      createWriter([
        createBinding(),
        createBinding({
          id: "parameter:stealState:0:fixture",
          functionName: "stealState",
        }),
      ]),
    ]),
    ["state-action-policy-binding-unregistered"],
  );
  assert.deepEqual(
    validate([
      createWriter([
        createBinding(),
        createBinding({
          id: "parameter:stealState:0:fixture",
          functionName: "stealState",
          authority: "legacy-target",
        }),
      ]),
    ]),
    ["state-action-policy-binding-unregistered"],
  );
});

test("policy generation validates registered action source shape and generated action bindings", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../tools/build_state_writer_policy.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /validateStateActionModuleSource\(\s*source,\s*\{\s*filePath:\s*relativePath/s,
  );
  assert.match(
    source,
    /validateStateActionPolicyBindings\(\s*writers,\s*\{/s,
  );
  assert.match(
    source,
    /state-action-delegation-source-invalid/,
  );
  assert.match(
    source,
    /state-action-delegation-policy-invalid/,
  );
});

test("policy verification identity includes the state action delegation contract", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../tools/check_state_writer_policy.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /const POLICY_CONFIG_PATHS = Object\.freeze\(\[[\s\S]*"tools\/state_action_delegation_contract\.mjs"/,
  );
});

test("boot actions satisfy the delegation source and binding contracts as scanned", async () => {
  const { readFile } = await import("node:fs/promises");
  const modulePath = "js/core/state/actions/boot_actions.js";
  const source = await readFile(
    new URL("../js/core/state/actions/boot_actions.js", import.meta.url),
    "utf8",
  );
  const bootContractEntries = STATE_ACTION_DELEGATION_CONTRACT.filter(
    (entry) => entry.modulePath === modulePath,
  );
  assert.deepEqual(
    validateStateActionModuleSource(source, {
      filePath: modulePath,
      contractEntries: bootContractEntries,
    }),
    [],
  );

  const discoveredBindings = await discoverStateWriterBindingsForSource(
    modulePath,
    source,
    "production",
    { scanAllParameters: true },
  );
  assert.deepEqual(
    discoveredBindings.map(
      ({ functionName, parameterIndex, parameterPath }) => ({
        functionName,
        parameterIndex,
        parameterPath,
      }),
    ),
    bootContractEntries.map(
      ({ exportName, targetArgumentIndex }) => ({
        functionName: exportName,
        parameterIndex: targetArgumentIndex,
        parameterPath: "$",
      }),
    ).sort((left, right) =>
      left.functionName.localeCompare(right.functionName)
    ),
  );
  const authorityIndex = buildCanonicalStateKeyAuthorityIndex();
  const policyBindings = bootContractEntries.map((entry) => {
    const binding = discoveredBindings.find(
      (candidate) =>
        candidate.functionName === entry.exportName
        && candidate.parameterIndex === entry.targetArgumentIndex
        && candidate.parameterPath === "$",
    );
    assert.ok(binding, `missing scanned binding for ${entry.exportName}`);
    const findings = scanStateMutations(source, {
      filePath: modulePath,
      bindings: [binding],
    });
    return {
      ...binding,
      authority: "domain-action",
      grants: buildStateWriterBindingGrants(
        findings,
        modulePath,
        authorityIndex,
        "production",
      ),
    };
  });
  assert.deepEqual(
    validateStateActionPolicyBindings(
      [{
        path: modulePath,
        authority: "domain-action",
        bindings: policyBindings,
      }],
      { modulePaths: [modulePath] },
    ),
    [],
  );
});

test("policy schema locks canonical binding authority and direct-module projection", () => {
  const fixture = createPolicyFixture();
  fixture.writers[0].bindings[0].authority = "compat-facade";
  assert.ok(
    validateStateWriterPolicySchema(fixture).some(
      ({ code }) => code === "binding-authority-classification-drift",
    ),
  );

  const outsideAllowlist = createPolicyFixture();
  outsideAllowlist.writers[0].authority = "legacy-target";
  assert.ok(
    validateStateWriterPolicySchema(outsideAllowlist).some(
      ({ code }) =>
        code === "module-direct-membership-outside-allowlist",
    ),
  );
});

test("policy schema v2 requires a frozen derived alias diagnostic baseline", () => {
  const policy = createPolicyFixture();
  const sourceBaseSha = "1".repeat(40);
  policy.schemaVersion = 2;
  policy.baseline.sourceBaseSha = sourceBaseSha;
  policy.baselines = {
    legacySemanticAuthority:
      buildLegacyStateWriterSemanticAuthority(policy.writers),
    derivedAliasTaint: {
      algorithmVersion: 1,
      sourceBaseSha,
      paths: ["js/fixture.js"],
      diagnosticDelta: {
        ambiguousSites: [],
        unsupportedSites: [],
      },
    },
  };
  assert.deepEqual(
    validateStateWriterPolicySchema(policy).filter(
      ({ code }) => code.startsWith("derived-alias-taint-"),
    ),
    [],
  );

  const tampered = structuredClone(policy);
  tampered.baselines.derivedAliasTaint = {
    ...tampered.baselines.derivedAliasTaint,
    sourceBaseSha: "2".repeat(40),
    paths: ["tests/fixture.js", "js/fixture.js"],
    diagnosticDelta: {
      ambiguousSites: [],
      unsupportedSites: [],
      memberships: [],
    },
  };
  assert.deepEqual(
    validateStateWriterPolicySchema(tampered)
      .filter(({ code }) => code.startsWith("derived-alias-taint-"))
      .map(({ code }) => code),
    [
      "derived-alias-taint-baseline-source-invalid",
      "derived-alias-taint-baseline-paths-invalid",
      "derived-alias-taint-baseline-delta-shape-invalid",
    ],
  );
});

test("derived alias diagnostic baseline transition is append-only", () => {
  const sourceBaseSha = "1".repeat(40);
  const previousBaseline = {
    algorithmVersion: 1,
    sourceBaseSha,
    paths: ["js/first.js"],
    diagnosticDelta: {
      ambiguousSites: ["a"],
      unsupportedSites: ["u", "u"],
    },
  };
  const currentBaseline = {
    algorithmVersion: 1,
    sourceBaseSha,
    paths: ["js/first.js", "js/second.js"],
    diagnosticDelta: {
      ambiguousSites: ["a", "b"],
      unsupportedSites: ["u", "u", "v"],
    },
  };
  assert.deepEqual(
    validateDerivedAliasTaintBaselineTransition({
      previousSchemaVersion: 1,
      currentSchemaVersion: 2,
      previousPhase: "P4.1",
      currentPhase: "P4.2a",
      currentBaseline,
      expectedBaseline: currentBaseline,
    }),
    [],
  );
  assert.deepEqual(
    validateDerivedAliasTaintBaselineTransition({
      previousSchemaVersion: 2,
      currentSchemaVersion: 2,
      previousBaseline,
      currentBaseline,
      expectedBaseline: currentBaseline,
    }),
    [],
  );
  assert.deepEqual(
    validateDerivedAliasTaintBaselineTransition({
      previousSchemaVersion: 2,
      currentSchemaVersion: 2,
      previousPhase: "P4.2c",
      currentPhase: "P4.3",
      previousBaseline,
      currentBaseline,
      expectedBaseline: currentBaseline,
    }).map(({ code }) => code),
    ["derived-alias-taint-transition-path-proof-missing"],
  );

  const regressed = structuredClone(currentBaseline);
  regressed.paths = ["js/second.js"];
  regressed.diagnosticDelta.ambiguousSites = [];
  regressed.diagnosticDelta.unsupportedSites = ["u"];
  assert.deepEqual(
    validateDerivedAliasTaintBaselineTransition({
      previousSchemaVersion: 2,
      currentSchemaVersion: 2,
      previousBaseline,
      currentBaseline: regressed,
      expectedBaseline: regressed,
    }).map(({ code }) => code),
    [
      "derived-alias-taint-baseline-path-regressed",
      "derived-alias-taint-baseline-diagnostic-regressed",
      "derived-alias-taint-baseline-diagnostic-regressed",
    ],
  );

  const forged = structuredClone(currentBaseline);
  forged.diagnosticDelta.unsupportedSites.push(
    "FORGED-CURRENT-ONLY",
  );
  forged.diagnosticDelta.unsupportedSites.sort();
  assert.deepEqual(
    validateDerivedAliasTaintBaselineTransition({
      previousSchemaVersion: 1,
      currentSchemaVersion: 2,
      previousPhase: "P4.1",
      currentPhase: "P4.2a",
      currentBaseline: forged,
      expectedBaseline: currentBaseline,
    }).map(({ code }) => code),
    ["derived-alias-taint-baseline-source-proof-mismatch"],
  );

  const previousWithTransition = {
    ...previousBaseline,
    transitionCheckpoints: [{
      sourceSha: "2".repeat(40),
      policyBlobSha256: "3".repeat(64),
      paths: ["js/first.js"],
    }],
  };
  const driftedTransition = {
    ...currentBaseline,
    transitionCheckpoints: [{
      ...previousWithTransition.transitionCheckpoints[0],
      policyBlobSha256: "4".repeat(64),
    }],
  };
  assert.ok(
    validateDerivedAliasTaintBaselineTransition({
      previousSchemaVersion: 2,
      currentSchemaVersion: 2,
      previousBaseline: previousWithTransition,
      currentBaseline: driftedTransition,
      expectedBaseline: driftedTransition,
    }).some(
      ({ code }) =>
        code
        === "derived-alias-taint-transition-checkpoint-history-drift",
    ),
  );
});

test("policy schema validates ambiguous sites as exact positive source locations", () => {
  const invalidSites = [
    null,
    {
      line: 0,
      column: 0,
      reason: "ambiguous-alias-flow",
    },
    {
      line: 1.5,
      column: 0,
      reason: "ambiguous-alias-flow",
    },
    {
      line: 1,
      column: -1,
      reason: "ambiguous-alias-flow",
    },
    {
      line: 1,
      column: 0.5,
      reason: "ambiguous-alias-flow",
    },
    {
      line: 1,
      column: 0,
      reason: "state-alias-escape",
    },
  ];

  for (const [index, invalidSite] of invalidSites.entries()) {
    const policy = createPolicyFixture();
    policy.writers[0].bindings[0].grants[0].ambiguousSites = [invalidSite];
    assert.ok(
      validateStateWriterPolicySchema(policy).some(
        ({ code }) => code === "grant-ambiguous-site-invalid",
      ),
      `invalid ambiguous site fixture ${index}`,
    );
  }
});

test("policy schema rejects duplicate ambiguous sites within and across binding grants", () => {
  const site = {
    line: 7,
    column: 5,
    reason: "ambiguous-alias-flow",
  };
  const withinGrant = createPolicyFixture();
  withinGrant.writers[0].bindings[0].grants[0].ambiguousSites = [
    site,
    { ...site },
  ];
  assert.ok(
    validateStateWriterPolicySchema(withinGrant).some(
      ({ code }) => code === "duplicate-grant-ambiguous-site",
    ),
  );

  const acrossGrants = createPolicyFixture();
  acrossGrants.writers[0].bindings[0].grants[0].ambiguousSites = [site];
  acrossGrants.writers[0].bindings[0].grants.push({
    domain: "renderer",
    migrationPhase: "P4.3",
    operations: [],
    keys: [],
    memberships: [],
    aliasSites: [],
    dynamicSites: [],
    ambiguousSites: [{ ...site }],
    unsupportedSites: [],
  });
  assert.ok(
    validateStateWriterPolicySchema(acrossGrants).some(
      ({ code }) => code === "duplicate-binding-ambiguous-site",
    ),
  );
});

test("policy schema rejects duplicate unsupported sites within and across binding grants", () => {
  const site = {
    line: 9,
    column: 3,
    reason: "state-alias-escape",
    operation: "unsupported",
    key: "*",
  };
  const withinGrant = createPolicyFixture();
  withinGrant.writers[0].bindings[0].grants[0].unsupportedSites = [
    site,
    { ...site },
  ];
  assert.ok(
    validateStateWriterPolicySchema(withinGrant).some(
      ({ code }) => code === "duplicate-grant-unsupported-site",
    ),
  );

  const acrossGrants = createPolicyFixture();
  acrossGrants.writers[0].bindings[0].grants[0].unsupportedSites = [site];
  acrossGrants.writers[0].bindings[0].grants.push({
    domain: "renderer",
    migrationPhase: "P4.3",
    operations: [],
    keys: [],
    memberships: [],
    aliasSites: [],
    dynamicSites: [],
    ambiguousSites: [],
    unsupportedSites: [{ ...site }],
  });
  assert.ok(
    validateStateWriterPolicySchema(acrossGrants).some(
      ({ code }) => code === "duplicate-binding-unsupported-site",
    ),
  );
});

test("policy snapshot rejects stale allowlist projection and unregistered bindings", () => {
  const staleProjection = validateStateWriterPolicySnapshot({
    policy: createPolicyFixture(),
    legacyAllowlistPaths: ["js/fixture.js"],
    scans: [],
  });
  const unknownBinding = validateStateWriterPolicySnapshot({
    policy: createPolicyFixture(),
    legacyAllowlistPaths: [
      "js/fixture.js",
      "tests/fixture.test.mjs",
    ],
    scans: [
      {
        path: "js/fixture.js",
        surface: "production",
        bindingId: "unregistered-target",
        findings: [createFinding({ bindingId: "unregistered-target" })],
      },
    ],
  });

  assert.ok(
    staleProjection.violations.some(
      ({ code }) => code === "legacy-allowlist-projection-mismatch",
    ),
  );
  assert.ok(
    unknownBinding.violations.some(
      ({ code }) => code === "unknown-binding",
    ),
  );
});

test("policy snapshot admits only exact registered ambiguous alias sites", () => {
  const policy = createPolicyFixture();
  policy.writers[0].bindings[0].grants[0].ambiguousSites.push({
    line: 7,
    column: 5,
    reason: "ambiguous-alias-flow",
  });
  const registered = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans: [
      {
        path: "js/fixture.js",
        surface: "production",
        bindingId: "runtime-state",
        findings: [
          createFinding(),
          createFinding({
            operation: "unsupported",
            key: "*",
            dynamic: true,
            unsupported: true,
            reason: "ambiguous-alias-flow",
            line: 7,
            column: 5,
          }),
        ],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        bindingId: "test-state",
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
          }),
        ],
      },
    ],
  });
  const unregistered = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans: [
      {
        path: "js/fixture.js",
        surface: "production",
        bindingId: "runtime-state",
        findings: [
          createFinding(),
          createFinding({
            operation: "unsupported",
            key: "*",
            dynamic: true,
            unsupported: true,
            reason: "ambiguous-alias-flow",
            line: 8,
            column: 5,
          }),
        ],
      },
      {
        path: "tests/fixture.test.mjs",
        surface: "test",
        bindingId: "test-state",
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
          }),
        ],
      },
    ],
  });

  assert.equal(registered.verdict, "pass");
  assert.ok(
    unregistered.violations.some(
      ({ code }) => code === "unknown-ambiguous-site",
    ),
  );
});

test("default state ownership locks the 16 plus 9 and 402 plus 488 baselines", async () => {
  const report = await buildDefaultStateOwnershipReport();

  assert.equal(report.factoryGroups.length, 16);
  assert.equal(report.explicitKeys.length, 9);
  assert.equal(report.preCompatKeyCount, 402);
  assert.equal(report.compatibilityHookCount, 86);
  assert.equal(report.postCompatKeyCount, 488);
  assert.ok(report.authorityOnlyLazyKeys.includes("scenarioAtlantropaRevision"));
  assert.deepEqual(report.collisions, []);
  assert.equal(report.actualFacadeKeyCount, 488);
  assert.deepEqual(report.unownedActualFacadeKeys, []);
  assert.deepEqual(report.registeredKeysMissingFromFacade, []);
});

test("default state ownership reports injected root-key collisions", async () => {
  const baseline = await buildDefaultStateOwnershipReport();
  const collidingKey = baseline.factoryGroups[0].keys[0];
  const report = await buildDefaultStateOwnershipReport({
    additionalFactoryGroups: [
      {
        id: "fixture-collision",
        source: "tests/fixture",
        value: {
          [collidingKey]: true,
        },
      },
    ],
  });

  assert.ok(
    report.collisions.some(({ key }) => key === collidingKey),
  );
});

test("global state import discovery resolves exact local aliases only", () => {
  const source = `
    import {
      normalizeMapSemanticMode,
      state as runtimeState,
    } from "./core/state.js";
    import { state as localFixture } from "./fixture_state.js";
    import { callRuntimeHook } from "./core/state/index.js";
  `;

  assert.deepEqual(
    discoverGlobalStateImportBindings(source),
    [
      {
        importSource: "./core/state.js",
        importedName: "state",
        localName: "runtimeState",
      },
    ],
  );
});

test("checked-in repository policy is a closed binding-scoped snapshot", async () => {
  const policy = await readStateWriterPolicy();
  const inventory = await scanStateWriterPolicySnapshot(policy);
  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: inventory.legacyAllowlistPaths,
    scans: inventory.scans,
    actionDelegations: inventory.actionDelegations,
  });

  assert.equal(result.verdict, "pass", JSON.stringify(result.violations, null, 2));
  assert.deepEqual(result.metrics.legacyDirectFiles, {
    production: 75,
    test: 43,
    total: 118,
  });
  assert.equal(policy.baselines.defaultState.factoryGroups, 16);
  assert.equal(policy.baselines.defaultState.explicitKeys, 9);
  assert.equal(policy.baselines.defaultState.preCompatKeys, 402);
  assert.equal(policy.baselines.defaultState.postCompatKeys, 488);
  assert.equal(policy.baselines.defaultState.collisions, 0);
  assert.deepEqual(policy.baselines.bindingScopedMemberships.production, {
    legacyDirect: 475,
    legacyTarget: 712,
    domainAction: 0,
    compatFacade: 1,
    compatibilityOnly: 0,
    testFixture: 0,
    legacyCombined: 1187,
    all: 1188,
  });
  assert.equal(
    policy.baselines.bindingScopedSites.dynamic.production.legacyCombined,
    142,
  );
  assert.equal(
    policy.baselines.bindingScopedSites.dynamic.production.compatFacade,
    2,
  );
  assert.equal(
    policy.baselines.bindingScopedSites.dynamic.test.testFixture,
    20,
  );
  assert.equal(
    policy.baselines.bindingScopedSites.alias.production.legacyCombined,
    227,
  );
  assert.equal(
    policy.baselines.bindingScopedSites.alias.test.testFixture,
    1,
  );
  assert.equal(
    policy.baselines.bindingScopedSites.ambiguous.production.legacyCombined,
    901,
  );
  assert.equal(
    policy.baselines.bindingScopedSites.ambiguous.test.testFixture,
    17,
  );
  assert.equal(inventory.unknownCandidateBindings.length, 0);
});

test("candidate discovery covers every production JavaScript module", async () => {
  const candidates = await discoverCandidatePaths([]);

  assert.ok(candidates.includes("js/core/palette_manager.js"));
  assert.ok(
    candidates.includes(
      "js/ui/dev_workspace/dev_workspace_shell_builder.js",
    ),
  );
});

test("canonical mutation discovery remains effective after arbitrary parameter renaming", () => {
  assert.equal(
    hasCanonicalStateMutationFinding(
      [
        createFinding({
          root: "model",
          key: "bootPhase",
          pathSegments: ["bootPhase"],
        }),
      ],
      "js/fixture.js",
    ),
    true,
  );
  assert.equal(
    hasCanonicalStateMutationFinding(
      [
        createFinding({
          root: "model",
          key: "ordinaryPayloadField",
          pathSegments: ["ordinaryPayloadField"],
        }),
      ],
      "js/fixture.js",
    ),
    false,
  );
});

test("changed-source binding discovery tracks canonical writes through arbitrary parameter names", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function updateBoot(model, ordinaryPayload) {
        model.bootPhase = "ready";
        ordinaryPayload.ordinaryPayloadField = true;
      }
    `,
    "production",
    { scanAllParameters: true },
  );

  assert.deepEqual(
    bindings.map(
      ({
        functionName,
        parameterName,
        parameterIndex,
      }) => ({
        functionName,
        parameterName,
        parameterIndex,
      }),
    ),
    [{
      functionName: "updateBoot",
      parameterName: "model",
      parameterIndex: 0,
    }],
  );
});

test("previous binding ordinals survive state-target parameter renaming", async () => {
  const previousWriter = {
    bindings: [{
      kind: "function-parameter",
      functionName: "updateBoot",
      parameterName: "runtimeState",
      parameterIndex: 0,
    }],
  };
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function updateBoot(model) {
        model.bootPhase = "ready";
      }
    `,
    "production",
    { previousWriter },
  );

  assert.deepEqual(
    bindings.map(
      ({ functionName, parameterName, parameterIndex }) => ({
        functionName,
        parameterName,
        parameterIndex,
      }),
    ),
    [{
      functionName: "updateBoot",
      parameterName: "model",
      parameterIndex: 0,
    }],
  );
});

test("repository policy builder is deterministic and never auto-grants during verification", async () => {
  const checkedIn = await readStateWriterPolicy();
  const rebuilt = await buildStateWriterPolicySnapshot({
    phase: checkedIn.progress.latestPhase,
    baseSha: checkedIn.baseline.sourceBaseSha,
    generatedAt: checkedIn.baseline.generatedAt,
    previousPolicy: checkedIn,
  });

  assert.deepEqual(rebuilt, checkedIn);
});

test("later policy builds preserve the frozen P4.0 denominator", async () => {
  const checkedIn = await readStateWriterPolicy();
  const currentPhase = checkedIn.progress.latestPhase;
  const rebuilt = await buildStateWriterPolicySnapshot({
    phase: currentPhase,
    previousPolicy: checkedIn,
  });

  assert.deepEqual(rebuilt.baseline, checkedIn.baseline);
  assert.deepEqual(rebuilt.baselines, checkedIn.baselines);
  assert.equal(rebuilt.progress.latestPhase, currentPhase);
  assert.deepEqual(
    rebuilt.progress.checkpoints.find(({ phase }) => phase === "P4.0"),
    checkedIn.progress.checkpoints.find(({ phase }) => phase === "P4.0"),
  );
});

test("policy progression rejects authority increases and phase regressions", () => {
  const previousPolicy = {
    baseline: { phase: "P4.0" },
    progress: {
      latestPhase: "P4.1",
      checkpoints: [
        {
          phase: "P4.1",
          productionLegacyDirectFiles: 70,
          productionLegacyMemberships: 700,
          productionLegacyDynamicSites: 50,
          productionLegacyAliasSites: 80,
          productionLegacyAmbiguousSites: 60,
          productionLegacyUnsupportedSites: 40,
        },
      ],
    },
  };
  const increased = validateStateWriterPolicyProgression({
    previousPolicy,
    phase: "P4.2a",
    currentMetrics: {
      productionLegacyDirectFiles: 71,
      productionLegacyMemberships: 701,
      productionLegacyDynamicSites: 51,
      productionLegacyAliasSites: 81,
      productionLegacyAmbiguousSites: 61,
      productionLegacyUnsupportedSites: 41,
    },
  });
  const regressedPhase = validateStateWriterPolicyProgression({
    previousPolicy,
    phase: "P4.0",
    currentMetrics: previousPolicy.progress.checkpoints[0],
  });

  assert.deepEqual(
    increased.violations.map(({ code }) => code),
    [
      "legacy-direct-files-increased",
      "legacy-memberships-increased",
      "legacy-dynamic-sites-increased",
      "legacy-alias-sites-increased",
      "legacy-ambiguous-sites-increased",
      "legacy-unsupported-sites-increased",
    ],
  );
  assert.deepEqual(
    regressedPhase.violations.map(({ code }) => code),
    ["phase-regression"],
  );
});

test("legacy semantic authority permits removals and rejects grant replacement", () => {
  const fixture = createPolicyFixture();
  const baseline = buildLegacyStateWriterSemanticAuthority(fixture.writers);
  assert.equal(baseline.collisions.length, 0);
  assert.deepEqual(
    validateLegacyStateWriterSemanticAuthority({
      baseline,
      writers: fixture.writers,
    }).violations,
    [],
  );
  assert.deepEqual(
    validateLegacyStateWriterSemanticAuthority({
      baseline,
      writers: [],
    }).violations,
    [],
  );

  const replaced = structuredClone(fixture.writers);
  const grant = replaced[0].bindings[0].grants[0];
  grant.operations = ["update"];
  grant.keys = ["bootMessage"];
  grant.memberships = [{
    operation: "update",
    key: "bootMessage",
  }];
  assert.deepEqual(
    validateLegacyStateWriterSemanticAuthority({
      baseline,
      writers: replaced,
    }).violations.map(({ code, section }) => [code, section]),
    [
      ["legacy-semantic-authority-added", "memberships"],
    ],
  );
});

test("legacy semantic authority freezes alias dynamic and diagnostic source sites", () => {
  const fixture = createPolicyFixture();
  const grant = fixture.writers[0].bindings[0].grants[0];
  grant.aliasSites = [{
    alias: "bootAlias",
    operation: "assign",
    key: "bootPhase",
    line: 2,
    column: 3,
    sourceFingerprint: "a".repeat(64),
  }];
  grant.dynamicSites = [{
    operation: "assign",
    key: "bootPhase",
    pathPattern: "bootPhase.*",
    line: 4,
    column: 5,
    sourceFingerprint: "b".repeat(64),
  }];
  grant.ambiguousSites = [{
    reason: "ambiguous-alias-flow",
    line: 6,
    column: 7,
    sourceFingerprint: "c".repeat(64),
  }];
  grant.unsupportedSites = [{
    reason: "unsupported-call-mutation",
    operation: "unsupported",
    key: "bootPhase",
    line: 8,
    column: 9,
    sourceFingerprint: "d".repeat(64),
  }];
  const baseline = buildLegacyStateWriterSemanticAuthority(fixture.writers);
  const replaced = structuredClone(fixture.writers);
  const replacedGrant = replaced[0].bindings[0].grants[0];
  for (const section of [
    "aliasSites",
    "dynamicSites",
    "ambiguousSites",
    "unsupportedSites",
  ]) {
    replacedGrant[section][0].sourceFingerprint = "e".repeat(64);
  }
  assert.deepEqual(
    validateLegacyStateWriterSemanticAuthority({
      baseline,
      writers: replaced,
    }).violations.map(({ section }) => section),
    [
      "aliasSites",
      "dynamicSites",
      "ambiguousSites",
      "unsupportedSites",
    ],
  );
});

test("derived alias diagnostic baseline admits frozen strict diagnostics only", async () => {
  const frozenSource = `
    export function update(model) {
      model.bootPhase = "ready";
      const box = { value: model };
      consumeUnknown(box);
    }
  `;
  const currentSource = `
    export function update(model) {
      model.bootPhase = "ready";
      const box = { value: model };
      consumeUnknown(box);
      const secondBox = { value: model };
      consumeUnknown(secondBox);
    }
  `;
  const frozenSha = "1".repeat(40);
  const legacyWriters = await buildFixtureLegacyWritersForSource(
    frozenSource,
    DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  );
  const legacyBaseline =
    buildLegacyStateWriterSemanticAuthority(legacyWriters);
  const reads = [];
  const derivedAliasTaint =
    await buildFrozenDerivedAliasTaintBaseline({
      sourceBaseSha: frozenSha,
      relativePaths: ["js/fixture.js"],
      legacySemanticBaseline: legacyBaseline,
      readSourceAtRevision: async (sourceBaseSha, relativePath) => {
        reads.push([sourceBaseSha, relativePath]);
        return frozenSource;
      },
    });
  const effectiveBaseline = composeLegacySemanticBaseline({
    legacyBaseline,
    derivedAliasTaint,
  });
  const strictFrozenWriters =
    await buildFixtureLegacyWritersForSource(
      frozenSource,
      DERIVED_ALIAS_TAINT_MODES.STRICT,
    );
  const strictCurrentWriters =
    await buildFixtureLegacyWritersForSource(
      currentSource,
      DERIVED_ALIAS_TAINT_MODES.STRICT,
    );

  assert.deepEqual(reads, [[frozenSha, "js/fixture.js"]]);
  assert.equal(derivedAliasTaint.algorithmVersion, 1);
  assert.equal(derivedAliasTaint.sourceBaseSha, frozenSha);
  assert.deepEqual(derivedAliasTaint.paths, ["js/fixture.js"]);
  assert.equal(
    derivedAliasTaint.diagnosticDelta.ambiguousSites.length,
    0,
  );
  assert.equal(
    derivedAliasTaint.diagnosticDelta.unsupportedSites.length,
    1,
  );
  assert.deepEqual(
    validateLegacyStateWriterSemanticAuthority({
      baseline: effectiveBaseline,
      writers: strictFrozenWriters,
    }).violations,
    [],
  );
  assert.deepEqual(
    validateLegacyStateWriterSemanticAuthority({
      baseline: effectiveBaseline,
      writers: strictCurrentWriters,
    }).violations.map(({ code, section }) => [code, section]),
    [
      ["legacy-semantic-authority-added", "unsupportedSites"],
      ["legacy-semantic-authority-added", "unsupportedSites"],
    ],
  );
});

test("policy schema validates exact derived transition provenance", () => {
  const policy = createPolicyFixture();
  const sourceBaseSha = "1".repeat(40);
  policy.schemaVersion = 2;
  policy.baseline.sourceBaseSha = sourceBaseSha;
  policy.baselines = {
    legacySemanticAuthority:
      buildLegacyStateWriterSemanticAuthority(policy.writers),
    derivedAliasTaint: {
      algorithmVersion: 1,
      sourceBaseSha,
      paths: ["js/fixture.js"],
      diagnosticDelta: {
        ambiguousSites: [],
        unsupportedSites: [],
      },
      transitionCheckpoints: [{
        sourceSha: "2".repeat(40),
        policyBlobSha256: "3".repeat(64),
        paths: ["js/fixture.js"],
      }],
    },
  };

  assert.deepEqual(
    validateStateWriterPolicySchema(policy).filter(
      ({ code }) => code.startsWith("derived-alias-taint-transition-"),
    ),
    [],
  );

  const tampered = structuredClone(policy);
  tampered.baselines.derivedAliasTaint.transitionCheckpoints = [{
    sourceSha: "invalid",
    policyBlobSha256: "invalid",
    paths: ["js/missing.js", "js/missing.js"],
  }];
  assert.deepEqual(
    validateStateWriterPolicySchema(tampered)
      .filter(
        ({ code }) => code.startsWith("derived-alias-taint-transition-"),
      )
      .map(({ code }) => code),
    [
      "derived-alias-taint-transition-checkpoint-invalid",
      "derived-alias-taint-transition-path-invalid",
    ],
  );
});

test("new strict paths freeze at the previous accepted policy checkpoint", async () => {
  const frozenSource = `
    export function update(model) {
      model.bootPhase = "ready";
    }
  `;
  const acceptedSource = `
    export function update(model) {
      model.bootPhase = "ready";
      consumeUnknown(model.renderPerfMetrics);
    }
  `;
  const currentSource = `
    export function update(model) {
      model.bootPhase = "ready";
      consumeUnknown(model.renderPerfMetrics);
      consumeUnknown(model.postReadyTaskDiagnostics);
    }
  `;
  const frozenSha = "1".repeat(40);
  const acceptedSourceSha = "2".repeat(40);
  const policyBlobSha256 = "3".repeat(64);
  const legacyWriters = await buildFixtureLegacyWritersForSource(
    frozenSource,
    DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  );
  const legacyBaseline =
    buildLegacyStateWriterSemanticAuthority(legacyWriters);
  const reads = [];

  await assert.rejects(
    buildFrozenDerivedAliasTaintBaseline({
      sourceBaseSha: frozenSha,
      relativePaths: ["js/fixture.js"],
      legacySemanticBaseline: legacyBaseline,
      existingBaseline: {
        algorithmVersion: 1,
        sourceBaseSha: frozenSha,
        paths: [],
        diagnosticDelta: {
          ambiguousSites: [],
          unsupportedSites: [],
        },
      },
      readSourceAtRevision: async () => frozenSource,
    }),
    ({ code }) =>
      code === "derived-alias-taint-transition-checkpoint-required",
  );

  const derivedAliasTaint = await buildFrozenDerivedAliasTaintBaseline({
    sourceBaseSha: frozenSha,
    relativePaths: ["js/fixture.js"],
    legacySemanticBaseline: legacyBaseline,
    acceptedPolicyCheckpoint: {
      sourceSha: acceptedSourceSha,
      policyBlobSha256,
    },
    readSourceAtRevision: async (revision, relativePath) => {
      reads.push([revision, relativePath]);
      return revision === acceptedSourceSha ? acceptedSource : frozenSource;
    },
  });
  const effectiveBaseline = composeLegacySemanticBaseline({
    legacyBaseline,
    derivedAliasTaint,
  });
  const acceptedWriters = await buildFixtureLegacyWritersForSource(
    acceptedSource,
    DERIVED_ALIAS_TAINT_MODES.STRICT,
  );
  const currentWriters = await buildFixtureLegacyWritersForSource(
    currentSource,
    DERIVED_ALIAS_TAINT_MODES.STRICT,
  );

  assert.deepEqual(reads, [[acceptedSourceSha, "js/fixture.js"]]);
  assert.deepEqual(derivedAliasTaint.transitionCheckpoints, [{
    sourceSha: acceptedSourceSha,
    policyBlobSha256,
    paths: ["js/fixture.js"],
  }]);
  assert.deepEqual(
    validateLegacyStateWriterSemanticAuthority({
      baseline: effectiveBaseline,
      writers: acceptedWriters,
    }).violations,
    [],
  );
  assert.deepEqual(
    validateLegacyStateWriterSemanticAuthority({
      baseline: effectiveBaseline,
      writers: currentWriters,
    }).violations.map(({ code, section }) => [code, section]),
    [["legacy-semantic-authority-added", "unsupportedSites"]],
  );

  const replayReads = [];
  const replayed = await buildFrozenDerivedAliasTaintBaseline({
    sourceBaseSha: frozenSha,
    relativePaths: ["js/fixture.js"],
    legacySemanticBaseline: legacyBaseline,
    transitionCheckpoints: derivedAliasTaint.transitionCheckpoints,
    readSourceAtRevision: async (revision, relativePath) => {
      replayReads.push([revision, relativePath]);
      return revision === acceptedSourceSha ? acceptedSource : frozenSource;
    },
  });
  assert.deepEqual(replayReads, [[acceptedSourceSha, "js/fixture.js"]]);
  assert.deepEqual(replayed, derivedAliasTaint);
});

test("derived alias diagnostic baseline classifies unknown historical plan fields with path fallback authority", async () => {
  const legacySource = `
    export function inspectPlan(plan) {
      plan.bootPhase = "ready";
    }
  `;
  const frozenSource = `
    export function inspectPlan(plan) {
      plan.bootPhase = "ready";
      plan.deferredExactTargetPasses = [];
      consumeUnknown(plan.forceExactContextBaseRefresh);
    }
  `;
  const frozenSha = "1".repeat(40);
  const legacyWriters = await buildFixtureLegacyWritersForSource(
    legacySource,
    DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  );
  const legacyBaseline =
    buildLegacyStateWriterSemanticAuthority(legacyWriters);

  const derivedAliasTaint = await buildFrozenDerivedAliasTaintBaseline({
    sourceBaseSha: frozenSha,
    relativePaths: ["js/fixture.js"],
    legacySemanticBaseline: legacyBaseline,
    readSourceAtRevision: async () => frozenSource,
  });

  assert.equal(
    derivedAliasTaint.diagnosticDelta.unsupportedSites.length,
    1,
  );
  assert.match(
    derivedAliasTaint.diagnosticDelta.unsupportedSites[0],
    /forceExactContextBaseRefresh/,
  );
});

test("checker recomputes derived alias diagnostics from frozen source", async () => {
  const sourceBaseSha = "1".repeat(40);
  const frozenSource = `
    export function update(model) {
      model.bootPhase = "ready";
      const box = { value: model };
      consumeUnknown(box);
    }
  `;
  const legacyWriters = await buildFixtureLegacyWritersForSource(
    frozenSource,
    DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  );
  const legacySemanticAuthority =
    buildLegacyStateWriterSemanticAuthority(legacyWriters);
  const previousPolicy = {
    schemaVersion: 1,
    baseline: { sourceBaseSha },
    baselines: { legacySemanticAuthority },
    progress: { latestPhase: "P4.1" },
    writers: legacyWriters,
  };
  const currentPolicy = {
    schemaVersion: 2,
    baseline: { sourceBaseSha },
    baselines: { legacySemanticAuthority },
    progress: { latestPhase: "P4.2a" },
  };
  const runGit = (args) => {
    const joined = args.join(" ");
    if (
      joined
      === `rev-parse --verify ${sourceBaseSha}^{commit}`
    ) {
      return `${sourceBaseSha}\n`;
    }
    if (
      joined
      === `merge-base --is-ancestor ${sourceBaseSha} HEAD`
    ) {
      return "";
    }
    if (
      joined === `diff --name-only ${sourceBaseSha} -- js`
    ) {
      return "js/fixture.js\n";
    }
    if (
      joined === "ls-files --others --exclude-standard -- js"
    ) {
      return "";
    }
    throw new Error(`unexpected git call: ${joined}`);
  };
  const expected = await recomputeDerivedAliasTaintBaseline({
    previousPolicy,
    currentPolicy,
    candidatePaths: ["js/fixture.js"],
    runGit,
    readSourceAtRevision: async (revision, relativePath) => {
      assert.equal(revision, sourceBaseSha);
      assert.equal(relativePath, "js/fixture.js");
      return frozenSource;
    },
  });

  assert.equal(expected.diagnosticDelta.ambiguousSites.length, 0);
  assert.equal(expected.diagnosticDelta.unsupportedSites.length, 1);
  assert.deepEqual(
    validateDerivedAliasTaintBaselineTransition({
      previousSchemaVersion: 1,
      currentSchemaVersion: 2,
      previousPhase: "P4.1",
      currentPhase: "P4.2a",
      currentBaseline: expected,
      expectedBaseline: expected,
    }),
    [],
  );
});

test("derived alias diagnostic baseline never admits newly visible memberships", async () => {
  const frozenSource = `
    function identity(value) {
      return value;
    }
    export function update(model) {
      model.bootPhase = "ready";
      const alias = identity(model);
      alias.bootBlocking = false;
    }
  `;
  const legacyWriters = await buildFixtureLegacyWritersForSource(
    frozenSource,
    DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  );
  const strictWriters = await buildFixtureLegacyWritersForSource(
    frozenSource,
    DERIVED_ALIAS_TAINT_MODES.STRICT,
  );
  const legacyBaseline =
    buildLegacyStateWriterSemanticAuthority(legacyWriters);
  const strictAuthority =
    buildLegacyStateWriterSemanticAuthority(strictWriters);
  const derivedAliasTaint = {
    algorithmVersion: 1,
    sourceBaseSha: "1".repeat(40),
    paths: ["js/fixture.js"],
    diagnosticDelta: buildDerivedAliasTaintDiagnosticDelta({
      legacySemanticBaseline: legacyBaseline,
      strictSemanticAuthority: strictAuthority,
    }),
  };
  const effectiveBaseline = composeLegacySemanticBaseline({
    legacyBaseline,
    derivedAliasTaint,
  });

  assert.deepEqual(
    validateLegacyStateWriterSemanticAuthority({
      baseline: effectiveBaseline,
      writers: strictWriters,
    }).violations.map(({ section }) => section),
    ["memberships", "aliasSites"],
  );
});

test("derived alias diagnostic baseline composes additive diagnostic multiplicity", () => {
  const legacyBaseline = createEmptyLegacySemanticAuthority();
  legacyBaseline.ambiguousSites = ["a", "a"];
  legacyBaseline.unsupportedSites = ["u"];
  const effectiveBaseline = composeLegacySemanticBaseline({
    legacyBaseline,
    derivedAliasTaint: {
      diagnosticDelta: {
        ambiguousSites: ["a", "a", "a", "b"],
        unsupportedSites: ["u"],
      },
    },
  });

  assert.deepEqual(
    effectiveBaseline.ambiguousSites,
    ["a", "a", "a", "a", "a", "b"],
  );
  assert.deepEqual(effectiveBaseline.unsupportedSites, ["u", "u"]);
});

test("previous-active authority receives only the incremental derived baseline", () => {
  const previousBaseline = {
    algorithmVersion: 1,
    sourceBaseSha: "1".repeat(40),
    paths: ["js/first.js"],
    diagnosticDelta: {
      ambiguousSites: ["a"],
      unsupportedSites: ["u", "u"],
    },
  };
  const currentBaseline = {
    algorithmVersion: 1,
    sourceBaseSha: "1".repeat(40),
    paths: ["js/first.js", "js/second.js"],
    diagnosticDelta: {
      ambiguousSites: ["a", "b"],
      unsupportedSites: ["u", "u", "v"],
    },
  };

  assert.deepEqual(
    buildIncrementalDerivedAliasTaintBaseline({
      currentBaseline,
      previousBaseline,
    }),
    {
      algorithmVersion: 1,
      sourceBaseSha: "1".repeat(40),
      paths: ["js/second.js"],
      diagnosticDelta: {
        ambiguousSites: ["b"],
        unsupportedSites: ["v"],
      },
    },
  );
});

test("derived alias diagnostic baseline removes only admitted progress counts", () => {
  assert.deepEqual(
    buildUnbaselinedLegacyDiagnosticCounts({
      legacySemanticAuthority: {
        ambiguousSites: ["a", "a", "b"],
        unsupportedSites: ["u", "u"],
      },
      derivedAliasTaint: {
        diagnosticDelta: {
          ambiguousSites: ["a", "a", "a"],
          unsupportedSites: ["u"],
        },
      },
    }),
    {
      ambiguousSites: 1,
      unsupportedSites: 1,
    },
  );
});

test("legacy semantic authority preserves duplicate site multiplicity", () => {
  const fixture = createPolicyFixture();
  const grant = fixture.writers[0].bindings[0].grants[0];
  const site = {
    alias: "bootAlias",
    operation: "assign",
    key: "bootPhase",
    line: 2,
    column: 3,
    sourceFingerprint: "a".repeat(64),
  };
  grant.aliasSites = [site];
  const baseline = buildLegacyStateWriterSemanticAuthority(fixture.writers);
  grant.aliasSites = [site, { ...site, line: 9, column: 10 }];
  const validation = validateLegacyStateWriterSemanticAuthority({
    baseline,
    writers: fixture.writers,
  });
  assert.deepEqual(
    validation.violations.map(
      ({ code, section, allowedCount, actualCount }) => ({
        code,
        section,
        allowedCount,
        actualCount,
      }),
    ),
    [{
      code: "legacy-semantic-authority-added",
      section: "aliasSites",
      allowedCount: 1,
      actualCount: 2,
    }],
  );
});

test("legacy semantic retirement ledger blocks reintroduction and ledger drift", () => {
  const fixture = createPolicyFixture();
  const baseline = buildLegacyStateWriterSemanticAuthority(fixture.writers);
  const emptyCurrent = buildLegacyStateWriterSemanticAuthority([]);
  const retired = subtractLegacyStateWriterSemanticAuthority(
    baseline,
    emptyCurrent,
  );
  assert.deepEqual(
    validateLegacyStateWriterSemanticLedger({
      baseline,
      writers: [],
      retired,
    }).violations,
    [],
  );
  assert.deepEqual(
    validateLegacyStateWriterSemanticLedger({
      baseline,
      writers: fixture.writers,
      retired: subtractLegacyStateWriterSemanticAuthority(
        baseline,
        buildLegacyStateWriterSemanticAuthority(fixture.writers),
      ),
      previousWriters: [],
      previousRetired: retired,
    }).violations.map(({ code }) => code),
    [
      "legacy-semantic-authority-added",
      "legacy-semantic-authority-added",
      "legacy-semantic-retirement-regressed",
      "legacy-semantic-retirement-regressed",
    ],
  );
  assert.deepEqual(
    validateLegacyStateWriterSemanticLedger({
      baseline,
      writers: [],
      retired: {
        ...retired,
        memberships: [],
      },
    }).violations.map(({ code, section }) => [code, section]),
    [
      ["legacy-semantic-retired-ledger-drift", "memberships"],
    ],
  );
  assert.deepEqual(
    validateLegacyStateWriterSemanticLedger({
      baseline,
      writers: fixture.writers,
      retired: subtractLegacyStateWriterSemanticAuthority(
        baseline,
        buildLegacyStateWriterSemanticAuthority(fixture.writers),
      ),
      previousWriters: [],
      previousAuthorityBaseline: baseline,
    }).violations,
    [],
  );
});

test("legacy membership retirement requires a matching domain action replacement", () => {
  const fixture = createPolicyFixture();
  const previousWriters = [fixture.writers[0]];
  assert.deepEqual(
    validateLegacyMembershipRetirementReplacements({
      previousWriters,
      writers: [],
    }).map(({ code, key }) => [code, key]),
    [
      ["legacy-membership-retirement-replacement-missing", "bootPhase"],
    ],
  );

  const actionWriter = structuredClone(fixture.writers[0]);
  actionWriter.path = "js/core/state/actions/boot_actions.js";
  actionWriter.authority = "domain-action";
  actionWriter.bindings[0] = {
    ...actionWriter.bindings[0],
    kind: "function-parameter",
    functionName: "setBootStateFields",
    parameterIndex: 0,
    parameterPath: "$",
    authority: "domain-action",
  };
  assert.deepEqual(
    validateLegacyMembershipRetirementReplacements({
      previousWriters,
      writers: [actionWriter],
    }).map(({ code, key }) => [code, key]),
    [
      ["legacy-membership-retirement-replacement-missing", "bootPhase"],
    ],
  );
  const callerBindingIdentity =
    buildStableStateBindingIdentity(
      previousWriters[0].bindings[0],
    );
  assert.deepEqual(
    validateLegacyMembershipRetirementReplacements({
      previousWriters,
      writers: [actionWriter],
      callerToActionLedger: {
        schemaVersion: 1,
        entries: [{
          retiredMembershipIdentity: [
            "js/fixture.js",
            callerBindingIdentity,
            "boot",
            "P4.1",
            "assign",
            "bootPhase",
          ].join("|"),
          callerPath: "js/fixture.js",
          callerBindingIdentity,
          domain: "boot",
          migrationPhase: "P4.1",
          operation: "assign",
          key: "bootPhase",
          actionModulePath:
            "js/core/state/actions/boot_actions.js",
          actionExportName: "setBootStateFields",
        }],
      },
    }),
    [],
  );
});

test("caller-to-action ledger schema rejects malformed duplicate and unsorted entries", () => {
  const first = createCallerActionLedgerEntry(0);
  const second = createCallerActionLedgerEntry(1);
  const cases = [
    {
      name: "schema version",
      mutate(policy) {
        policy.progress.callerToActionLedger.schemaVersion = 2;
      },
      expectedCode: "caller-action-ledger-schema-version-invalid",
    },
    {
      name: "malformed entry",
      mutate(policy) {
        policy.progress.callerToActionLedger.entries[0].callerPath = "";
      },
      expectedCode: "caller-action-ledger-entry-invalid",
    },
    {
      name: "forged backfill provenance",
      mutate(policy) {
        const entry =
          policy.progress.callerToActionLedger.entries[0];
        entry.retiredInPhase = "P4.0";
        entry.recordedInPhase = "P4.1";
        entry.backfilled = false;
      },
      expectedCode: "caller-action-ledger-entry-invalid",
    },
    {
      name: "duplicate entry",
      entries: [first, structuredClone(first)],
      expectedCode: "caller-action-ledger-entry-duplicate",
    },
    {
      name: "unsorted entries",
      entries: [second, first],
      expectedCode: "caller-action-ledger-order-invalid",
    },
  ];

  for (const fixture of cases) {
    const policy = createCallerActionLedgerPolicy(
      structuredClone(fixture.entries || [first]),
    );
    fixture.mutate?.(policy);
    const violations = validateStateWriterPolicySchema(policy);
    assert.ok(
      violations.some(({ code }) => code === fixture.expectedCode),
      `${fixture.name}: ${JSON.stringify(violations, null, 2)}`,
    );
  }
});

test("P4.2a bootstrap extracts exact P4.1 backfill coverage from an intermediate ledger", () => {
  const first = createCallerActionLedgerEntry(0);
  const second = createCallerActionLedgerEntry(1);
  const later = {
    ...createCallerActionLedgerEntry(2),
    retiredInPhase: "P4.2a",
    recordedInPhase: "P4.2a",
    backfilled: false,
  };
  const previousPolicy = {
    progress: {
      latestPhase: "P4.1",
      retiredLegacySemanticAuthority: {
        ...createEmptyLegacySemanticAuthority(),
        memberships: [
          first.retiredMembershipIdentity,
          second.retiredMembershipIdentity,
        ].sort(),
      },
    },
  };
  const transitionPolicy = {
    schemaVersion: 1,
    progress: {
      latestPhase: "P4.2a",
      callerToActionLedger: {
        schemaVersion: 1,
        entries: [later, second, first],
      },
    },
  };

  assert.deepEqual(
    extractP42aCallerToActionBootstrapSeed({
      previousPolicy,
      transitionPolicy,
    }).map(({ retiredMembershipIdentity }) =>
      retiredMembershipIdentity
    ),
    [
      first.retiredMembershipIdentity,
      second.retiredMembershipIdentity,
    ].sort(),
  );

  transitionPolicy.progress.callerToActionLedger.entries = [
    first,
    structuredClone(first),
    later,
  ];
  assert.throws(
    () =>
      extractP42aCallerToActionBootstrapSeed({
        previousPolicy,
        transitionPolicy,
      }),
    (error) =>
      error?.code
      === "caller-action-ledger-transition-coverage-invalid",
  );
});

test("P4.2a bootstrap seed selects and regenerates the current action edge", () => {
  const previousWriter = createPolicyFixture().writers[0];
  const previousBinding = previousWriter.bindings[0];
  const callerBindingIdentity =
    buildStableStateBindingIdentity(previousBinding);
  const retiredLegacySemanticAuthority =
    subtractLegacyStateWriterSemanticAuthority(
      buildLegacyStateWriterSemanticAuthority([previousWriter]),
      buildLegacyStateWriterSemanticAuthority([]),
    );
  const [retiredMembershipIdentity] =
    retiredLegacySemanticAuthority.memberships;
  const previousPolicy = {
    writers: [previousWriter],
    progress: {
      latestPhase: "P4.1",
      retiredLegacySemanticAuthority,
    },
  };
  const actionWriter = structuredClone(previousWriter);
  actionWriter.path = "js/core/state/actions/boot_actions.js";
  actionWriter.authority = "domain-action";
  actionWriter.bindings[0] = {
    ...actionWriter.bindings[0],
    id: "function:setBootStateFields:0:$",
    kind: "function-parameter",
    functionName: "setBootStateFields",
    parameterIndex: 0,
    parameterPath: "$",
    authority: "domain-action",
  };
  const enclosingFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "replacementCaller", ordinal: 0 }],
  });
  const currentEdge = {
    callerPath: previousWriter.path,
    callerBindingId: previousBinding.id,
    callerBindingIdentity,
    enclosingFunctionIdentity,
    actionModulePath: actionWriter.path,
    actionExportName: "setBootStateFields",
    targetArgumentIndex: 0,
    start: 240,
    end: 280,
    line: 24,
    column: 3,
    sourceFingerprint: "b".repeat(64),
  };
  const seed = {
    retiredMembershipIdentity,
    callerPath: previousWriter.path,
    callerBindingIdentity,
    actionModulePath: actionWriter.path,
    actionExportName: "setBootStateFields",
    targetArgumentIndex: 0,
    actionCallEdgeIdentity: "f".repeat(64),
    occurrenceIndex: 0,
    sourceFingerprint: currentEdge.sourceFingerprint,
    retiredInPhase: "P4.1",
    recordedInPhase: "P4.2a",
    backfilled: true,
  };
  const [normalizedCurrentEdge] =
    normalizeStateActionDelegations([currentEdge]);
  const ledger = buildCallerToActionLedger({
    phase: "P4.2a",
    previousPolicy,
    bootstrapSeedEntries: [seed],
    writers: [actionWriter],
    retiredLegacySemanticAuthority,
    actionDelegations: [currentEdge],
  });

  assert.equal(ledger.entries.length, 1);
  assert.equal(
    ledger.entries[0].actionCallEdgeIdentity,
    normalizedCurrentEdge.actionCallEdgeIdentity,
  );
  assert.equal(ledger.entries[0].start, currentEdge.start);
  assert.equal(
    ledger.entries[0].proofPrecision,
    "historical-backfill",
  );
  assert.throws(
    () =>
      buildCallerToActionLedger({
        phase: "P4.2a",
        previousPolicy,
        bootstrapSeedEntries: [seed, structuredClone(seed)],
        writers: [actionWriter],
        retiredLegacySemanticAuthority,
        actionDelegations: [currentEdge],
      }),
    (error) =>
      error?.code
      === "caller-action-ledger-bootstrap-seed-invalid",
  );
});

test("same-phase policy rebuild refreshes live caller evidence", () => {
  const entry = createCallerActionLedgerEntry(0);
  const initialEdge = createActionDelegationObservation(entry);
  const [normalizedInitialEdge] =
    normalizeStateActionDelegations([initialEdge]);
  Object.assign(entry, {
    actionCallEdgeIdentity:
      normalizedInitialEdge.actionCallEdgeIdentity,
    occurrenceIndex: normalizedInitialEdge.occurrenceIndex,
  });
  const previousPolicy =
    createCallerActionLedgerPolicy([entry]);
  const movedEdge = {
    ...initialEdge,
    callerBindingId: "module:runtimeState:shifted",
    start: initialEdge.start + 500,
    end: initialEdge.end + 500,
    line: initialEdge.line + 17,
    column: initialEdge.column + 2,
    sourceFingerprint: "e".repeat(64),
  };

  const ledger = buildCallerToActionLedger({
    phase: "P4.2a",
    previousPolicy,
    writers: previousPolicy.writers,
    retiredLegacySemanticAuthority:
      previousPolicy.progress.retiredLegacySemanticAuthority,
    actionDelegations: [movedEdge],
  });

  assert.deepEqual(
    {
      callerBindingId: ledger.entries[0].callerBindingId,
      start: ledger.entries[0].start,
      end: ledger.entries[0].end,
      line: ledger.entries[0].line,
      column: ledger.entries[0].column,
      sourceFingerprint: ledger.entries[0].sourceFingerprint,
    },
    {
      callerBindingId: movedEdge.callerBindingId,
      start: movedEdge.start,
      end: movedEdge.end,
      line: movedEdge.line,
      column: movedEdge.column,
      sourceFingerprint: movedEdge.sourceFingerprint,
    },
  );
  assert.equal(
    ledger.entries[0].retiredMembershipIdentity,
    entry.retiredMembershipIdentity,
  );
  assert.equal(
    ledger.entries[0].recordedInPhase,
    entry.recordedInPhase,
  );
});

test("same-phase policy rebuild preserves the committed progress checkpoint", () => {
  const committedCheckpoint = Object.freeze({
    phase: "P4.2b",
    productionLegacyDirectFiles: 75,
    productionLegacyMemberships: 1011,
    productionLegacyDynamicSites: 138,
    productionLegacyAliasSites: 218,
    productionLegacyAmbiguousSites: 621,
    productionLegacyUnsupportedSites: 4079,
  });
  const progress = buildProgressState({
    phase: "P4.2b",
    currentMetrics: {
      ...committedCheckpoint,
      productionLegacyUnsupportedSites: 4075,
    },
    previousPolicy: {
      progress: {
        checkpoints: [committedCheckpoint],
      },
    },
    refreshP4Baseline: false,
    retiredLegacySemanticAuthority: {
      bindings: [],
      memberships: [],
      writes: [],
      sites: [],
    },
    callerToActionLedger: null,
  });

  assert.equal(progress.latestPhase, "P4.2b");
  assert.deepEqual(progress.checkpoints, [committedCheckpoint]);
});

test("checker replays derived alias diagnostics from accepted transition checkpoints", async () => {
  const sourceBaseSha = "1".repeat(40);
  const acceptedSourceSha = "2".repeat(40);
  const policyBlobSha256 = "3".repeat(64);
  const frozenSource = `
    export function update(model) {
      model.bootPhase = "ready";
    }
  `;
  const acceptedSource = `
    export function update(model) {
      model.bootPhase = "ready";
      consumeUnknown(model.renderPerfMetrics);
    }
  `;
  const legacyWriters = await buildFixtureLegacyWritersForSource(
    frozenSource,
    DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  );
  const legacySemanticAuthority =
    buildLegacyStateWriterSemanticAuthority(legacyWriters);
  const derivedAliasTaint = await buildFrozenDerivedAliasTaintBaseline({
    sourceBaseSha,
    relativePaths: ["js/fixture.js"],
    legacySemanticBaseline: legacySemanticAuthority,
    acceptedPolicyCheckpoint: {
      sourceSha: acceptedSourceSha,
      policyBlobSha256,
    },
    readSourceAtRevision: async () => acceptedSource,
  });
  const previousPolicy = {
    schemaVersion: 2,
    baseline: { sourceBaseSha },
    baselines: {
      legacySemanticAuthority,
      derivedAliasTaint: {
        algorithmVersion: 1,
        sourceBaseSha,
        paths: [],
        diagnosticDelta: {
          ambiguousSites: [],
          unsupportedSites: [],
        },
      },
    },
    progress: { latestPhase: "P4.2c" },
    writers: legacyWriters,
  };
  const currentPolicy = {
    schemaVersion: 2,
    baseline: { sourceBaseSha },
    baselines: { legacySemanticAuthority, derivedAliasTaint },
    progress: { latestPhase: "P4.3" },
  };
  const reads = [];
  const runGit = (args) => {
    const joined = args.join(" ");
    if (joined === `rev-parse --verify ${sourceBaseSha}^{commit}`) {
      return `${sourceBaseSha}\n`;
    }
    if (joined === `merge-base --is-ancestor ${sourceBaseSha} HEAD`) {
      return "";
    }
    if (joined === `diff --name-only ${sourceBaseSha} -- js`) {
      return "js/fixture.js\n";
    }
    if (joined === "ls-files --others --exclude-standard -- js") {
      return "";
    }
    throw new Error(`unexpected git call: ${joined}`);
  };

  const expected = await recomputeDerivedAliasTaintBaseline({
    previousPolicy,
    currentPolicy,
    candidatePaths: ["js/fixture.js"],
    runGit,
    readSourceAtRevision: async (revision, relativePath) => {
      reads.push([revision, relativePath]);
      return revision === acceptedSourceSha ? acceptedSource : frozenSource;
    },
  });

  assert.deepEqual(reads, [[acceptedSourceSha, "js/fixture.js"]]);
  assert.deepEqual(expected, derivedAliasTaint);
});

test("checker proves added transition provenance against the previous accepted policy blob", () => {
  const sourceSha = "2".repeat(40);
  const previousPolicy = {
    schemaVersion: 2,
    progress: { latestPhase: "P4.2c" },
  };
  const source = `${JSON.stringify(previousPolicy, null, 2)}\n`;
  const policyBlobSha256 = createHash("sha256")
    .update(source)
    .digest("hex");
  const currentPolicy = {
    schemaVersion: 2,
    baselines: {
      derivedAliasTaint: {
        transitionCheckpoints: [{
          sourceSha,
          policyBlobSha256,
          paths: ["js/fixture.js"],
        }],
      },
    },
    progress: {
      latestPhase: "P4.3",
      checkpoints: [{
        phase: "P4.3",
        previousAcceptedSourceSha: sourceSha,
        previousAcceptedPolicyBlobSha256: policyBlobSha256,
      }],
    },
  };
  const readPolicySourceAtRevision = (revision) => {
    assert.equal(revision, sourceSha);
    return source;
  };

  assert.deepEqual(
    validateDerivedAliasTaintTransitionCheckpointProof({
      previousPolicy,
      currentPolicy,
      acceptedPolicyCheckpoint: {
        sourceSha,
        policyBlobSha256,
      },
      readPolicySourceAtRevision,
      isSourceAncestor: () => true,
    }),
    [],
  );

  assert.deepEqual(
    validateDerivedAliasTaintTransitionCheckpointProof({
      previousPolicy,
      currentPolicy,
      acceptedPolicyCheckpoint: {
        sourceSha: "4".repeat(40),
        policyBlobSha256,
      },
      readPolicySourceAtRevision,
      isSourceAncestor: () => true,
    }).map(({ code }) => code),
    ["derived-alias-taint-transition-canonical-checkpoint-mismatch"],
  );
  assert.deepEqual(
    validateDerivedAliasTaintTransitionCheckpointProof({
      previousPolicy,
      currentPolicy,
      acceptedPolicyCheckpoint: {
        sourceSha,
        policyBlobSha256,
      },
      readPolicySourceAtRevision,
      isSourceAncestor: () => false,
    }).map(({ code }) => code),
    ["derived-alias-taint-transition-source-not-ancestor"],
  );

  const tampered = structuredClone(currentPolicy);
  tampered.baselines.derivedAliasTaint.transitionCheckpoints[0]
    .policyBlobSha256 = "3".repeat(64);
  assert.deepEqual(
    validateDerivedAliasTaintTransitionCheckpointProof({
      previousPolicy,
      currentPolicy: tampered,
      acceptedPolicyCheckpoint: {
        sourceSha,
        policyBlobSha256,
      },
      readPolicySourceAtRevision,
      isSourceAncestor: () => true,
    }).map(({ code }) => code),
    [
      "derived-alias-taint-transition-canonical-checkpoint-mismatch",
      "derived-alias-taint-transition-policy-blob-mismatch",
      "progress-accepted-policy-checkpoint-mismatch",
    ],
  );
});

test("new phase progress records the previous accepted policy checkpoint", () => {
  const acceptedPolicyCheckpoint = {
    sourceSha: "2".repeat(40),
    policyBlobSha256: "3".repeat(64),
  };
  const metrics = {
    productionLegacyDirectFiles: 70,
    productionLegacyMemberships: 700,
    productionLegacyDynamicSites: 50,
    productionLegacyAliasSites: 80,
    productionLegacyAmbiguousSites: 60,
    productionLegacyUnsupportedSites: 40,
  };
  const progress = buildProgressState({
    phase: "P4.3",
    currentMetrics: metrics,
    previousPolicy: {
      progress: {
        latestPhase: "P4.2c",
        checkpoints: [{ phase: "P4.2c", ...metrics }],
      },
    },
    refreshP4Baseline: false,
    retiredLegacySemanticAuthority: {},
    acceptedPolicyCheckpoint,
  });

  assert.deepEqual(progress.checkpoints.at(-1), {
    phase: "P4.3",
    ...metrics,
    previousAcceptedSourceSha: acceptedPolicyCheckpoint.sourceSha,
    previousAcceptedPolicyBlobSha256:
      acceptedPolicyCheckpoint.policyBlobSha256,
  });
});

test("next-phase policy rebuild freezes P4.2b and appends the live P4.2c checkpoint", () => {
  const p42bCheckpoint = Object.freeze({
    phase: "P4.2b",
    productionLegacyDirectFiles: 75,
    productionLegacyMemberships: 1011,
    productionLegacyDynamicSites: 138,
    productionLegacyAliasSites: 218,
    productionLegacyAmbiguousSites: 621,
    productionLegacyUnsupportedSites: 4079,
  });
  const p42cMetrics = Object.freeze({
    ...p42bCheckpoint,
    phase: "P4.2c",
    productionLegacyUnsupportedSites: 4075,
  });
  const progress = buildProgressState({
    phase: "P4.2c",
    currentMetrics: p42cMetrics,
    previousPolicy: {
      progress: {
        checkpoints: [p42bCheckpoint],
      },
    },
    refreshP4Baseline: false,
    retiredLegacySemanticAuthority: {
      bindings: [],
      memberships: [],
      writes: [],
      sites: [],
    },
    callerToActionLedger: null,
  });

  assert.equal(progress.latestPhase, "P4.2c");
  assert.deepEqual(progress.checkpoints, [p42bCheckpoint, p42cMetrics]);
});

test("P4.2a caller proofs remain compatible while later entries require exact mutation-site evidence", () => {
  const historicalEntry = createCallerActionLedgerEntry(0);
  const historicalPolicy =
    createCallerActionLedgerPolicy([historicalEntry]);
  assert.ok(
    !validateStateWriterPolicySchema(historicalPolicy).some(
      ({ code }) => code === "caller-action-ledger-entry-invalid",
    ),
  );

  const futureEntry = {
    ...createCallerActionLedgerEntry(1),
    retiredInPhase: "P4.2b",
    recordedInPhase: "P4.2b",
    backfilled: false,
  };
  const futurePolicy = createCallerActionLedgerPolicy([futureEntry]);
  futurePolicy.progress.latestPhase = "P4.2b";
  assert.ok(
    validateStateWriterPolicySchema(futurePolicy).some(
      ({ code }) => code === "caller-action-ledger-entry-invalid",
    ),
  );

  const enclosingFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "applyFixture01", ordinal: 0 }],
  });
  Object.assign(futureEntry, {
    enclosingFunctionIdentity,
    retiredEnclosingFunctionIdentity:
      enclosingFunctionIdentity,
    retiredMutationSiteFingerprint: "e".repeat(64),
    retiredMutationSiteCount: 1,
    proofPrecision: "exact-site",
  });
  const preciseFuturePolicy =
    createCallerActionLedgerPolicy([futureEntry]);
  preciseFuturePolicy.progress.latestPhase = "P4.2b";
  assert.ok(
    !validateStateWriterPolicySchema(preciseFuturePolicy).some(
      ({ code }) => code === "caller-action-ledger-entry-invalid",
    ),
  );
});

test("policy snapshot requires the retired caller to reach its registered action edge", () => {
  const entry = createCallerActionLedgerEntry(0);
  const policy = createCallerActionLedgerPolicy([entry]);
  const actionWriter = policy.writers[0];
  const scans = [{
    path: actionWriter.path,
    surface: actionWriter.surface,
    bindingId: actionWriter.bindings[0].id,
    findings: [
      createFinding({
        filePath: actionWriter.path,
        bindingId: actionWriter.bindings[0].id,
      }),
    ],
  }];

  const missingEdge = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [],
    scans,
    actionDelegations: [],
  });
  assert.ok(
    missingEdge.violations.some(
      ({ code, retiredMembershipIdentity }) =>
        code === "caller-action-ledger-observation-missing"
        && retiredMembershipIdentity === entry.retiredMembershipIdentity,
    ),
    JSON.stringify(missingEdge.violations, null, 2),
  );

  const shiftedOffsets = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [],
    scans,
    actionDelegations: [
      createActionDelegationObservation(entry, {
        start: entry.start + 20,
        end: entry.end + 20,
      }),
    ],
  });
  assert.ok(
    !shiftedOffsets.violations.some(
      ({ code }) => code === "caller-action-ledger-observation-mismatch",
    ),
    JSON.stringify(shiftedOffsets.violations, null, 2),
  );

  const wrongBinding = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [],
    scans,
    actionDelegations: [
      createActionDelegationObservation(entry, {
        callerBindingId: "function:wrongBinding:0:$",
      }),
    ],
  });
  assert.ok(
    wrongBinding.violations.some(
      ({ code, retiredMembershipIdentity }) =>
        code === "caller-action-ledger-observation-mismatch"
        && retiredMembershipIdentity === entry.retiredMembershipIdentity,
    ),
    JSON.stringify(wrongBinding.violations, null, 2),
  );
});

test("caller-to-action normalization rejects stable binding identities shared by distinct bindings", () => {
  const callerBindingIdentity = JSON.stringify({
    kind: "function-parameter",
    name: "",
    functionName: "applyScenario",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "$",
    importSource: "",
    importedName: "",
    aliasSources: [],
    aliasOperators: [],
  });
  const base = {
    callerPath: "js/core/scenario_fixture.js",
    callerBindingIdentity,
    actionModulePath: "js/core/state/actions/boot_actions.js",
    actionExportName: "setBootStateFields",
    targetArgumentIndex: 0,
    start: 10,
    end: 20,
    line: 2,
    column: 1,
    sourceFingerprint: "a".repeat(64),
  };

  assert.throws(
    () => normalizeStateActionDelegations([
      { ...base, callerBindingId: "scope-one" },
      {
        ...base,
        callerBindingId: "scope-two",
        start: 30,
        end: 40,
        line: 4,
        sourceFingerprint: "b".repeat(64),
      },
    ]),
    (error) =>
      error?.code === "caller-action-binding-identity-ambiguous",
  );
});

test("enclosing-function occurrence groups keep sibling action identities stable", () => {
  const callerBindingIdentity = JSON.stringify({
    kind: "module",
    name: "runtimeState",
    functionName: "",
    parameterName: "",
    parameterIndex: 0,
    parameterPath: "",
    importSource: "./state.js",
    importedName: "state",
    aliasSources: [],
    aliasOperators: [],
  });
  const firstFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "firstCaller", ordinal: 0 }],
  });
  const secondFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "secondCaller", ordinal: 0 }],
  });
  const edge = (enclosingFunctionIdentity, start) => ({
    callerPath: "js/core/fixture.js",
    callerBindingId: "module:runtimeState",
    callerBindingIdentity,
    enclosingFunctionIdentity,
    actionModulePath: "js/core/state/actions/boot_actions.js",
    actionExportName: "setBootStateFields",
    targetArgumentIndex: 0,
    start,
    end: start + 10,
    line: start,
    column: 1,
    sourceFingerprint: `${start % 10}`.repeat(64),
  });
  const before = normalizeStateActionDelegations([
    edge(firstFunctionIdentity, 10),
    edge(secondFunctionIdentity, 20),
  ]);
  const after = normalizeStateActionDelegations([
    edge(firstFunctionIdentity, 5),
    edge(firstFunctionIdentity, 10),
    edge(secondFunctionIdentity, 20),
  ]);

  assert.equal(
    before.find(
      ({ enclosingFunctionIdentity }) =>
        enclosingFunctionIdentity === secondFunctionIdentity,
    ).actionCallEdgeIdentity,
    after.find(
      ({ enclosingFunctionIdentity }) =>
        enclosingFunctionIdentity === secondFunctionIdentity,
    ).actionCallEdgeIdentity,
  );
});

test("P4.2a historical ledger identities match the compatibility edge identity", () => {
  const prototype = createCallerActionLedgerEntry(0);
  const enclosingFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "applyFixture00", ordinal: 0 }],
  });
  const [observation] = normalizeStateActionDelegations([{
    callerPath: prototype.callerPath,
    callerBindingId: prototype.callerBindingId,
    callerBindingIdentity: prototype.callerBindingIdentity,
    enclosingFunctionIdentity,
    actionModulePath: prototype.actionModulePath,
    actionExportName: prototype.actionExportName,
    targetArgumentIndex: prototype.targetArgumentIndex,
    start: prototype.start,
    end: prototype.end,
    line: prototype.line,
    column: prototype.column,
    sourceFingerprint: prototype.sourceFingerprint,
  }]);
  const entry = {
    ...prototype,
    actionCallEdgeIdentity:
      observation.legacyActionCallEdgeIdentity,
    occurrenceIndex: observation.legacyOccurrenceIndex,
  };
  const policy = createCallerActionLedgerPolicy([entry]);
  const actionWriter = policy.writers[0];
  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [],
    scans: [{
      path: actionWriter.path,
      surface: actionWriter.surface,
      bindingId: actionWriter.bindings[0].id,
      findings: [
        createFinding({
          filePath: actionWriter.path,
          bindingId: actionWriter.bindings[0].id,
        }),
      ],
    }],
    actionDelegations: [observation],
  });

  assert.ok(
    !result.violations.some(
      ({ code }) =>
        code === "caller-action-ledger-observation-missing"
        || code === "caller-action-ledger-observation-mismatch",
    ),
    JSON.stringify(result.violations, null, 2),
  );
});

test("caller-to-action ledger rejects binding identity collisions even when only one binding calls an action", () => {
  const sharedBinding = {
    kind: "function-parameter",
    name: "targetState",
    functionName: "applyScenario",
    parameterName: "targetState",
    parameterIndex: 0,
    parameterPath: "$",
    importSource: "",
    importedName: "",
    aliasSources: [],
    aliasOperators: [],
    authority: "legacy-target",
    grants: [],
  };

  assert.throws(
    () => buildCallerToActionLedger({
      phase: "P4.2a",
      writers: [{
        path: "js/core/scenario_fixture.js",
        surface: "production",
        authority: "legacy-target",
        bindings: [
          { ...sharedBinding, id: "scope-one" },
          { ...sharedBinding, id: "scope-two" },
        ],
      }],
      retiredLegacySemanticAuthority:
        createEmptyLegacySemanticAuthority(),
      actionDelegations: [{
        callerPath: "js/core/scenario_fixture.js",
        callerBindingId: "scope-two",
        callerBindingIdentity:
          buildStableStateBindingIdentity(sharedBinding),
        actionModulePath:
          "js/core/state/actions/boot_actions.js",
        actionExportName: "setBootStateFields",
        targetArgumentIndex: 0,
        start: 10,
        end: 20,
        line: 2,
        column: 1,
        sourceFingerprint: "a".repeat(64),
      }],
    }),
    (error) =>
      error?.code === "caller-action-binding-identity-ambiguous",
  );
});

test("binding grants retain stable exact mutation-site evidence for future retirement proofs", () => {
  const enclosingFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "applyBoot", ordinal: 0 }],
  });
  const grants = buildStateWriterBindingGrants(
    [
      createFinding({
        operation: "assign",
        key: "bootPhase",
        line: 7,
        column: 3,
        sourceFingerprint: "a".repeat(64),
        enclosingFunctionIdentity,
      }),
      createFinding({
        operation: "assign",
        key: "bootPhase",
        line: 9,
        column: 3,
        sourceFingerprint: "a".repeat(64),
        enclosingFunctionIdentity,
      }),
    ],
    "js/bootstrap/fixture.js",
    buildCanonicalStateKeyAuthorityIndex(),
    "production",
  );

  assert.deepEqual(
    grants[0].memberships[0].mutationSites,
    [
      {
        enclosingFunctionIdentity,
        sourceFingerprint: "a".repeat(64),
        occurrenceIndex: 0,
      },
      {
        enclosingFunctionIdentity,
        sourceFingerprint: "a".repeat(64),
        occurrenceIndex: 1,
      },
    ],
  );
});

test("caller-to-action proof requires the action edge in the retired mutation's enclosing function", () => {
  const previousWriter = createPolicyFixture().writers[0];
  const previousBinding = previousWriter.bindings[0];
  const callerBindingIdentity =
    buildStableStateBindingIdentity(previousBinding);
  const firstFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "firstCaller", ordinal: 0 }],
  });
  const siblingFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "secondCaller", ordinal: 0 }],
  });
  previousBinding.grants[0].memberships[0].mutationSites = [{
    enclosingFunctionIdentity: firstFunctionIdentity,
    sourceFingerprint: "a".repeat(64),
    occurrenceIndex: 0,
  }];

  const actionWriter = structuredClone(previousWriter);
  actionWriter.path = "js/core/state/actions/boot_actions.js";
  actionWriter.authority = "domain-action";
  actionWriter.bindings[0] = {
    ...actionWriter.bindings[0],
    id: "function:setBootStateFields:0:$",
    kind: "function-parameter",
    functionName: "setBootStateFields",
    parameterIndex: 0,
    parameterPath: "$",
    authority: "domain-action",
  };
  const retiredLegacySemanticAuthority =
    subtractLegacyStateWriterSemanticAuthority(
      buildLegacyStateWriterSemanticAuthority([previousWriter]),
      buildLegacyStateWriterSemanticAuthority([]),
    );
  const previousPolicy = {
    writers: [previousWriter],
    progress: {
      latestPhase: "P4.2a",
      retiredLegacySemanticAuthority:
        createEmptyLegacySemanticAuthority(),
      callerToActionLedger: {
        schemaVersion: 1,
        entries: [],
      },
    },
  };
  const baseEdge = {
    callerPath: previousWriter.path,
    callerBindingId: previousBinding.id,
    callerBindingIdentity,
    actionModulePath: actionWriter.path,
    actionExportName: "setBootStateFields",
    targetArgumentIndex: 0,
    start: 10,
    end: 20,
    line: 2,
    column: 1,
    sourceFingerprint: "b".repeat(64),
  };

  assert.throws(
    () => buildCallerToActionLedger({
      phase: "P4.2b",
      previousPolicy,
      writers: [actionWriter],
      retiredLegacySemanticAuthority,
      actionDelegations: [{
        ...baseEdge,
        enclosingFunctionIdentity: siblingFunctionIdentity,
      }],
    }),
    (error) =>
      error?.code === "caller-action-ledger-proof-missing",
  );

  const ledger = buildCallerToActionLedger({
    phase: "P4.2b",
    previousPolicy,
    writers: [actionWriter],
    retiredLegacySemanticAuthority,
    actionDelegations: [{
      ...baseEdge,
      enclosingFunctionIdentity: firstFunctionIdentity,
    }],
  });
  assert.equal(ledger.entries.length, 1);
  assert.deepEqual(
    {
      enclosingFunctionIdentity:
        ledger.entries[0].enclosingFunctionIdentity,
      retiredEnclosingFunctionIdentity:
        ledger.entries[0].retiredEnclosingFunctionIdentity,
      retiredMutationSiteCount:
        ledger.entries[0].retiredMutationSiteCount,
      proofPrecision: ledger.entries[0].proofPrecision,
    },
    {
      enclosingFunctionIdentity: firstFunctionIdentity,
      retiredEnclosingFunctionIdentity: firstFunctionIdentity,
      retiredMutationSiteCount: 1,
      proofPrecision: "exact-site",
    },
  );
  assert.match(
    ledger.entries[0].retiredMutationSiteFingerprint,
    /^[a-f0-9]{64}$/,
  );
});

test("cross-phase policy rebuild refreshes one owned action successor and preserves retirement evidence", () => {
  const enclosingFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "applyFixture00", ordinal: 0 }],
  });
  const entry = createCallerActionLedgerEntry(0, {
    enclosingFunctionIdentity,
    retiredEnclosingFunctionIdentity: enclosingFunctionIdentity,
    retiredMutationSiteFingerprint: "a".repeat(64),
    retiredMutationSiteCount: 2,
    proofPrecision: "exact-site",
  });
  const [normalizedInitialEdge] = normalizeStateActionDelegations([
    createActionDelegationObservation(entry, {
      enclosingFunctionIdentity,
    }),
  ]);
  Object.assign(entry, {
    actionCallEdgeIdentity:
      normalizedInitialEdge.actionCallEdgeIdentity,
    occurrenceIndex: normalizedInitialEdge.occurrenceIndex,
  });
  const previousPolicy = createCallerActionLedgerPolicy([entry]);
  const successorWriter = structuredClone(previousPolicy.writers[0]);
  successorWriter.bindings[0].id =
    "function:replaceBootMetricsState:0:$";
  successorWriter.bindings[0].functionName =
    "replaceBootMetricsState";
  const successorEdge = createActionDelegationObservation(entry, {
    callerBindingId: "function:applyFixture00:renamed:$/property:targetState",
    enclosingFunctionIdentity,
    actionExportName: "replaceBootMetricsState",
    actionCallEdgeIdentity: undefined,
    occurrenceIndex: undefined,
    start: 500,
    end: 550,
    line: 50,
    column: 7,
    sourceFingerprint: "b".repeat(64),
  });
  const [normalizedSuccessorEdge] = normalizeStateActionDelegations([
    successorEdge,
  ]);
  const retirementFields = [
    "retiredMembershipIdentity",
    "retiredEnclosingFunctionIdentity",
    "retiredMutationSiteFingerprint",
    "retiredMutationSiteCount",
    "proofPrecision",
    "retiredInPhase",
    "recordedInPhase",
    "backfilled",
  ];

  const ledger = buildCallerToActionLedger({
    phase: "P4.2b",
    previousPolicy,
    writers: [successorWriter],
    retiredLegacySemanticAuthority:
      previousPolicy.progress.retiredLegacySemanticAuthority,
    actionDelegations: [successorEdge],
  });
  const [refreshed] = ledger.entries;

  assert.deepEqual(
    Object.fromEntries(retirementFields.map((field) => [
      field,
      refreshed[field],
    ])),
    Object.fromEntries(retirementFields.map((field) => [
      field,
      entry[field],
    ])),
  );
  assert.deepEqual(
    {
      actionModulePath: refreshed.actionModulePath,
      actionExportName: refreshed.actionExportName,
      targetArgumentIndex: refreshed.targetArgumentIndex,
      actionCallEdgeIdentity: refreshed.actionCallEdgeIdentity,
      occurrenceIndex: refreshed.occurrenceIndex,
      callerBindingId: refreshed.callerBindingId,
      start: refreshed.start,
      end: refreshed.end,
      line: refreshed.line,
      column: refreshed.column,
      sourceFingerprint: refreshed.sourceFingerprint,
    },
    {
      actionModulePath: normalizedSuccessorEdge.actionModulePath,
      actionExportName: normalizedSuccessorEdge.actionExportName,
      targetArgumentIndex: normalizedSuccessorEdge.targetArgumentIndex,
      actionCallEdgeIdentity:
        normalizedSuccessorEdge.actionCallEdgeIdentity,
      occurrenceIndex: normalizedSuccessorEdge.occurrenceIndex,
      callerBindingId: normalizedSuccessorEdge.callerBindingId,
      start: normalizedSuccessorEdge.start,
      end: normalizedSuccessorEdge.end,
      line: normalizedSuccessorEdge.line,
      column: normalizedSuccessorEdge.column,
      sourceFingerprint: normalizedSuccessorEdge.sourceFingerprint,
    },
  );

  const policy = createCallerActionLedgerPolicy([refreshed]);
  policy.writers = [successorWriter];
  policy.progress.latestPhase = "P4.2b";
  policy.progress.callerToActionLedger = ledger;
  assert.deepEqual(
    validateStateWriterPolicySchema(policy).filter(
      ({ code }) => String(code).startsWith("caller-action-ledger-"),
    ),
    [],
  );
  const snapshot = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [],
    scans: [{
      path: successorWriter.path,
      surface: successorWriter.surface,
      bindingId: successorWriter.bindings[0].id,
      findings: [createFinding({
        filePath: successorWriter.path,
        bindingId: successorWriter.bindings[0].id,
      })],
    }],
    actionDelegations: [normalizedSuccessorEdge],
  });
  assert.ok(
    !snapshot.violations.some(({ code }) =>
      code === "caller-action-ledger-observation-missing"
      || code === "caller-action-ledger-observation-mismatch"
    ),
    JSON.stringify(snapshot.violations, null, 2),
  );
});

test("cross-phase policy rebuild collapses repeated calls to one owned action successor", () => {
  const enclosingFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "applyFixture00", ordinal: 0 }],
  });
  const entry = createCallerActionLedgerEntry(0, {
    enclosingFunctionIdentity,
    actionExportName: "legacyBootStateAction",
  });
  const [normalizedInitialEdge] = normalizeStateActionDelegations([
    createActionDelegationObservation(entry, {
      enclosingFunctionIdentity,
    }),
  ]);
  entry.actionCallEdgeIdentity =
    normalizedInitialEdge.actionCallEdgeIdentity;
  entry.occurrenceIndex = normalizedInitialEdge.occurrenceIndex;
  const previousPolicy = createCallerActionLedgerPolicy([entry]);
  const successorWriter = structuredClone(previousPolicy.writers[0]);
  const successorEdge = (start) =>
    createActionDelegationObservation(entry, {
      enclosingFunctionIdentity,
      actionExportName: "setBootStateFields",
      actionCallEdgeIdentity: undefined,
      occurrenceIndex: undefined,
      start,
      end: start + 20,
      line: start,
      sourceFingerprint: `${start % 10}`.repeat(64),
    });
  const observedSuccessors = [successorEdge(30), successorEdge(20)];
  const [expectedSuccessor] = normalizeStateActionDelegations(
    observedSuccessors,
  );

  const ledger = buildCallerToActionLedger({
    phase: "P4.2b",
    previousPolicy,
    writers: [successorWriter],
    retiredLegacySemanticAuthority:
      previousPolicy.progress.retiredLegacySemanticAuthority,
    actionDelegations: observedSuccessors,
  });

  assert.equal(
    ledger.entries[0].actionCallEdgeIdentity,
    expectedSuccessor.actionCallEdgeIdentity,
  );
  assert.equal(ledger.entries[0].occurrenceIndex, 0);
  assert.equal(ledger.entries[0].start, 20);
});

test("cross-phase policy rebuild fails closed when two actions own the successor edge", () => {
  const enclosingFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "applyFixture00", ordinal: 0 }],
  });
  const entry = createCallerActionLedgerEntry(0, {
    enclosingFunctionIdentity,
    actionExportName: "legacyBootStateAction",
  });
  const [normalizedInitialEdge] = normalizeStateActionDelegations([
    createActionDelegationObservation(entry, {
      enclosingFunctionIdentity,
    }),
  ]);
  entry.actionCallEdgeIdentity =
    normalizedInitialEdge.actionCallEdgeIdentity;
  entry.occurrenceIndex = normalizedInitialEdge.occurrenceIndex;
  const previousPolicy = createCallerActionLedgerPolicy([entry]);
  const successorWriter = structuredClone(previousPolicy.writers[0]);
  const originalBinding = successorWriter.bindings[0];
  successorWriter.bindings = [
    "setBootStateFields",
    "replaceBootMetricsState",
  ].map((functionName) => ({
    ...structuredClone(originalBinding),
    id: `function:${functionName}:0:$`,
    functionName,
  }));
  const successorEdge = (actionExportName, start) =>
    createActionDelegationObservation(entry, {
      enclosingFunctionIdentity,
      actionExportName,
      actionCallEdgeIdentity: undefined,
      occurrenceIndex: undefined,
      start,
      end: start + 20,
      line: start,
      sourceFingerprint: `${start % 10}`.repeat(64),
    });

  assert.throws(
    () => buildCallerToActionLedger({
      phase: "P4.2b",
      previousPolicy,
      writers: [successorWriter],
      retiredLegacySemanticAuthority:
        previousPolicy.progress.retiredLegacySemanticAuthority,
      actionDelegations: [
        successorEdge("setBootStateFields", 20),
        successorEdge("replaceBootMetricsState", 30),
      ],
    }),
    (error) =>
      error?.code === "caller-action-ledger-proof-missing"
      && error.violations?.[0]?.reason
        === "caller-action-successor-edge-ambiguous",
  );
});

test("P4.2b wildcard replacement builds and validates one schema-v2 proof across every enclosing function", () => {
  const previousWriter = createPolicyFixture().writers[0];
  const previousBinding = previousWriter.bindings[0];
  const actionModulePath =
    "js/core/state/actions/scenario_activation_actions.js";
  const requiredConcreteMemberships = [
    ...STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT[0]
      .requiredConcreteMemberships,
  ];
  const retiredMembership = "scenario|P4.2|assign|*";
  previousWriter.domain = "scenario";
  previousWriter.migrationPhase = "P4.2";
  previousBinding.grants = [{
    domain: "scenario",
    migrationPhase: "P4.2",
    operations: ["assign"],
    keys: ["*"],
    memberships: [{
      operation: "assign",
      key: "*",
      mutationSites: [],
    }],
    aliasSites: [],
    dynamicSites: [],
    ambiguousSites: [],
    unsupportedSites: [],
  }];
  const callerBindingIdentity =
    buildStableStateBindingIdentity(previousBinding);
  const firstFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "firstCaller", ordinal: 0 }],
  });
  const secondFunctionIdentity = JSON.stringify({
    kind: "function",
    ancestry: [{ name: "secondCaller", ordinal: 0 }],
  });
  previousBinding.grants[0].memberships[0].mutationSites = [
    {
      enclosingFunctionIdentity: firstFunctionIdentity,
      sourceFingerprint: "a".repeat(64),
      occurrenceIndex: 0,
    },
    {
      enclosingFunctionIdentity: secondFunctionIdentity,
      sourceFingerprint: "b".repeat(64),
      occurrenceIndex: 0,
    },
  ];

  const actionGrants = () => [
    {
      domain: "scenario",
      migrationPhase: "P4.2",
      operations: ["assign"],
      keys: requiredConcreteMemberships
        .filter((membership) => membership.startsWith("scenario|"))
        .map((membership) => membership.split("|").at(-1)),
      memberships: requiredConcreteMemberships
        .filter((membership) => membership.startsWith("scenario|"))
        .map((membership) => ({
          operation: "assign",
          key: membership.split("|").at(-1),
          mutationSites: [],
        })),
      aliasSites: [],
      dynamicSites: [],
      ambiguousSites: [],
      unsupportedSites: [],
    },
    {
      domain: "ui",
      migrationPhase: "P4.4",
      operations: ["assign"],
      keys: ["specialZoneLayers"],
      memberships: [{
        operation: "assign",
        key: "specialZoneLayers",
        mutationSites: [],
      }],
      aliasSites: [],
      dynamicSites: [],
      ambiguousSites: [],
      unsupportedSites: [],
    },
  ];
  const actionWriter = {
    path: actionModulePath,
    surface: "production",
    domain: "scenario",
    authority: "domain-action",
    migrationPhase: "P4.2b",
    bindings: [
      "applyScenarioChunkOptionalLayerState",
      "restoreScenarioChunkPromotionState",
    ].map((functionName) => ({
      id: `function:${functionName}:0:$`,
      kind: "function-parameter",
      name: "target",
      functionName,
      parameterName: "target",
      parameterIndex: 0,
      parameterPath: "$",
      authority: "domain-action",
      grants: actionGrants(),
    })),
  };
  for (const binding of actionWriter.bindings) {
    const concreteMemberships = binding.grants.flatMap((grant) =>
      grant.memberships.map((membership) => [
        grant.domain,
        grant.migrationPhase,
        membership.operation,
        membership.key,
      ].join("|"))
    );
    assert.deepEqual(concreteMemberships, requiredConcreteMemberships);
    assert.equal(concreteMemberships.includes(retiredMembership), false);
  }
  const retiredLegacySemanticAuthority =
    subtractLegacyStateWriterSemanticAuthority(
      buildLegacyStateWriterSemanticAuthority([previousWriter]),
      buildLegacyStateWriterSemanticAuthority([]),
    );
  const previousPolicy = {
    writers: [previousWriter],
    progress: {
      latestPhase: "P4.2a",
      retiredLegacySemanticAuthority:
        createEmptyLegacySemanticAuthority(),
      callerToActionLedger: {
        schemaVersion: 1,
        entries: [],
      },
    },
  };
  const edge = (
    enclosingFunctionIdentity,
    start,
    actionExportName = "applyScenarioChunkOptionalLayerState",
  ) => ({
    callerPath: previousWriter.path,
    callerBindingId: previousBinding.id,
    callerBindingIdentity,
    enclosingFunctionIdentity,
    actionModulePath: actionWriter.path,
    actionExportName,
    targetArgumentIndex: 0,
    start,
    end: start + 10,
    line: start,
    column: 1,
    sourceFingerprint: `${start % 10}`.repeat(64),
  });
  const build = (actionDelegations) =>
    buildCallerToActionLedger({
      phase: "P4.2b",
      previousPolicy,
      writers: [actionWriter],
      retiredLegacySemanticAuthority,
      actionDelegations,
    });

  assert.throws(
    () => build([edge(firstFunctionIdentity, 10)]),
    (error) =>
      error?.code === "caller-action-ledger-proof-missing"
      && error.violations?.[0]?.reason
        === "matching-enclosing-function-action-edge-missing",
  );

  const ledger = build([
    edge(firstFunctionIdentity, 10),
    edge(
      secondFunctionIdentity,
      20,
      "restoreScenarioChunkPromotionState",
    ),
  ]);
  const [entry] = ledger.entries;
  assert.equal(ledger.schemaVersion, 2);
  assert.deepEqual(
    {
      proofPrecision: entry.proofPrecision,
      retiredMutationSiteCount: entry.retiredMutationSiteCount,
      retiredMutationFunctionCount:
        entry.retiredMutationFunctionCount,
      functionProofs: entry.functionProofs.map((proof) => ({
        enclosingFunctionIdentity:
          proof.enclosingFunctionIdentity,
        retiredEnclosingFunctionIdentity:
          proof.retiredEnclosingFunctionIdentity,
        retiredMutationSiteCount:
          proof.retiredMutationSiteCount,
        actionExportName: proof.actionExportName,
      })),
    },
    {
      proofPrecision: "exact-site-multi-function",
      retiredMutationSiteCount: 2,
      retiredMutationFunctionCount: 2,
      functionProofs: [
        {
          enclosingFunctionIdentity: firstFunctionIdentity,
          retiredEnclosingFunctionIdentity:
            firstFunctionIdentity,
          retiredMutationSiteCount: 1,
          actionExportName: "applyScenarioChunkOptionalLayerState",
        },
        {
          enclosingFunctionIdentity: secondFunctionIdentity,
          retiredEnclosingFunctionIdentity:
            secondFunctionIdentity,
          retiredMutationSiteCount: 1,
          actionExportName: "restoreScenarioChunkPromotionState",
        },
      ],
    },
  );
  assert.match(
    entry.retiredMutationSiteFingerprint,
    /^[a-f0-9]{64}$/,
  );
  assert.equal(entry.key, "*");
  assert.equal(
    entry.retiredMembershipIdentity.endsWith(`|${retiredMembership}`),
    true,
  );
  assert.deepEqual(
    validateLegacyMembershipRetirementReplacements({
      previousWriters: [previousWriter],
      writers: [actionWriter],
      callerToActionLedger: ledger,
    }),
    [],
  );

  const policy = createCallerActionLedgerPolicy([entry]);
  policy.writers = [structuredClone(actionWriter)];
  policy.progress.latestPhase = "P4.2b";
  policy.progress.callerToActionLedger = ledger;
  const callerActionSchemaViolations =
    validateStateWriterPolicySchema(policy).filter(
      ({ code }) => String(code).startsWith("caller-action-ledger-"),
    );
  assert.deepEqual(callerActionSchemaViolations, []);
  const invalidMultiProofMutations = [
    (multiEntry) => {
      multiEntry.functionProofs.pop();
    },
    (multiEntry) => {
      multiEntry.functionProofs.push(
        structuredClone(multiEntry.functionProofs[0]),
      );
    },
    (multiEntry) => {
      multiEntry.functionProofs.reverse();
    },
    (multiEntry) => {
      multiEntry.retiredMutationSiteCount += 1;
    },
    (multiEntry) => {
      multiEntry.retiredMutationSiteFingerprint = "invalid";
    },
  ];
  for (const mutate of invalidMultiProofMutations) {
    const invalidPolicy = structuredClone(policy);
    mutate(
      invalidPolicy.progress.callerToActionLedger.entries[0],
    );
    assert.ok(
      validateStateWriterPolicySchema(invalidPolicy).some(
        ({ code }) =>
          code === "caller-action-ledger-entry-invalid",
      ),
    );
  }

  const refreshedLedger = buildCallerToActionLedger({
    phase: "P4.2b",
    previousPolicy: {
      writers: [actionWriter],
      progress: {
        latestPhase: "P4.2b",
        retiredLegacySemanticAuthority,
        callerToActionLedger: ledger,
      },
    },
    writers: [actionWriter],
    retiredLegacySemanticAuthority,
    actionDelegations: [
      edge(firstFunctionIdentity, 11),
      edge(
        secondFunctionIdentity,
        22,
        "restoreScenarioChunkPromotionState",
      ),
    ],
  });
  assert.deepEqual(
    refreshedLedger.entries[0].functionProofs.map(
      ({ start, line, sourceFingerprint }) => ({
        start,
        line,
        sourceFingerprint,
      }),
    ),
    [
      {
        start: 11,
        line: 11,
        sourceFingerprint: "1".repeat(64),
      },
      {
        start: 22,
        line: 22,
        sourceFingerprint: "2".repeat(64),
      },
    ],
  );

  const normalizedEdges = normalizeStateActionDelegations([
    edge(firstFunctionIdentity, 10),
    edge(
      secondFunctionIdentity,
      20,
      "restoreScenarioChunkPromotionState",
    ),
  ]);
  const actionPolicyWriter = policy.writers[0];
  const scans = actionPolicyWriter.bindings.map((binding) => ({
    path: actionPolicyWriter.path,
    surface: actionPolicyWriter.surface,
    bindingId: binding.id,
    findings: [createFinding({
      filePath: actionPolicyWriter.path,
      bindingId: binding.id,
    })],
  }));
  const completeSnapshot = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [],
    scans,
    actionDelegations: normalizedEdges,
  });
  assert.ok(
    !completeSnapshot.violations.some(
      ({ code }) =>
        code === "caller-action-ledger-observation-missing"
        || code === "caller-action-ledger-observation-mismatch",
    ),
    JSON.stringify(completeSnapshot.violations, null, 2),
  );
  const omittedEdge = normalizedEdges.find(
    ({ enclosingFunctionIdentity }) =>
      enclosingFunctionIdentity === secondFunctionIdentity,
  );
  const missingSecondFunction = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [],
    scans,
    actionDelegations: normalizedEdges.filter(
      ({ actionCallEdgeIdentity }) =>
        actionCallEdgeIdentity !== omittedEdge.actionCallEdgeIdentity,
    ),
  });
  assert.ok(
    missingSecondFunction.violations.some(
      ({ code, actionCallEdgeIdentity }) =>
        code === "caller-action-ledger-observation-missing"
        && actionCallEdgeIdentity
          === omittedEdge.actionCallEdgeIdentity,
    ),
    JSON.stringify(missingSecondFunction.violations, null, 2),
  );
});

test("cross-file migration contract is deterministic and rejects forged or duplicate entries", () => {
  assert.deepEqual(
    validateStateActionCrossFileMigrationContract(),
    [],
  );
  const [registered] =
    STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT;
  const forged = structuredClone(registered);
  forged.replacementActionSourceFingerprint = "f".repeat(64);
  assert.ok(
    validateStateActionCrossFileMigrationContract([forged])
      .some(
        ({ code }) =>
          code
          === "state-action-cross-file-migration-entry-invalid",
      ),
  );
  assert.ok(
    validateStateActionCrossFileMigrationContract([
      registered,
      registered,
    ]).some(
      ({ code }) =>
        code
        === "state-action-cross-file-migration-entry-duplicate",
    ),
  );
});

test("caller-to-action ledger accepts only an exact explicit cross-file migration proof", () => {
  const fixture = createCrossFileMigrationFixture();
  const build = (overrides = {}) =>
    buildCallerToActionLedger({
      phase: "P4.2b",
      previousPolicy: fixture.previousPolicy,
      writers: [fixture.actionWriter],
      retiredLegacySemanticAuthority:
        fixture.retiredLegacySemanticAuthority,
      actionDelegations: [fixture.actionDelegation],
      crossFileMigrationContract: [fixture.contract],
      ...overrides,
    });
  const ledger = build();
  const [entry] = ledger.entries;
  assert.deepEqual(
    validateLegacyMembershipRetirementReplacements({
      previousWriters: [fixture.previousWriter],
      writers: [fixture.actionWriter],
      callerToActionLedger: ledger,
    }),
    [],
  );
  const expectedMutationSiteFingerprint =
    createHash("sha256")
      .update(
        JSON.stringify(fixture.contract.retiredMutationSites),
      )
      .digest("hex");
  assert.deepEqual(
    {
      callerPath: entry.callerPath,
      callerBindingIdentity: entry.callerBindingIdentity,
      enclosingFunctionIdentity:
        entry.enclosingFunctionIdentity,
      retiredCallerPath: entry.retiredCallerPath,
      retiredCallerBindingIdentity:
        entry.retiredCallerBindingIdentity,
      retiredEnclosingFunctionIdentity:
        entry.retiredEnclosingFunctionIdentity,
      retiredMutationSiteFingerprint:
        entry.retiredMutationSiteFingerprint,
      retiredMutationSiteCount:
        entry.retiredMutationSiteCount,
      proofPrecision: entry.proofPrecision,
      crossFileMigrationContractIdentity:
        entry.crossFileMigrationContractIdentity,
    },
    {
      callerPath: fixture.contract.replacementCallerPath,
      callerBindingIdentity:
        fixture.contract.replacementCallerBindingIdentity,
      enclosingFunctionIdentity:
        fixture.contract.replacementEnclosingFunctionIdentity,
      retiredCallerPath: fixture.contract.retiredCallerPath,
      retiredCallerBindingIdentity:
        fixture.contract.retiredCallerBindingIdentity,
      retiredEnclosingFunctionIdentity:
        fixture.contract.retiredMutationSites[0]
          .enclosingFunctionIdentity,
      retiredMutationSiteFingerprint:
        expectedMutationSiteFingerprint,
      retiredMutationSiteCount: 1,
      proofPrecision: "explicit-cross-file",
      crossFileMigrationContractIdentity:
        fixture.contract.contractIdentity,
    },
  );

  const successorWriter = structuredClone(fixture.actionWriter);
  successorWriter.bindings[0].id =
    "function:replaceBootMetricsState:0:$";
  successorWriter.bindings[0].functionName =
    "replaceBootMetricsState";
  assert.throws(
    () => buildCallerToActionLedger({
      phase: "P4.2b",
      previousPolicy: {
        writers: [fixture.actionWriter],
        progress: {
          latestPhase: "P4.2b",
          retiredLegacySemanticAuthority:
            fixture.retiredLegacySemanticAuthority,
          callerToActionLedger: ledger,
        },
      },
      writers: [successorWriter],
      retiredLegacySemanticAuthority:
        fixture.retiredLegacySemanticAuthority,
      actionDelegations: [{
        ...fixture.actionDelegation,
        actionExportName: "replaceBootMetricsState",
      }],
      crossFileMigrationContract: [fixture.contract],
    }),
    (error) =>
      error?.code === "caller-action-ledger-proof-missing"
      && error.violations?.[0]?.reason
        === "explicit-cross-file-action-edge-stale",
  );

  assert.throws(
    () => build({
      crossFileMigrationContract: [],
    }),
    (error) =>
      error?.code === "caller-action-ledger-proof-missing",
  );

  const staleContract = structuredClone(fixture.contract);
  staleContract.retiredMutationSites[0].sourceFingerprint =
    "c".repeat(64);
  staleContract.contractIdentity =
    buildStateActionCrossFileMigrationContractIdentity(
      staleContract,
    );
  assert.throws(
    () => build({
      crossFileMigrationContract: [staleContract],
    }),
    (error) =>
      error?.code === "caller-action-ledger-proof-missing"
      && error.violations?.[0]?.reason
        === "cross-file-retired-mutation-sites-do-not-match-policy",
  );

  assert.throws(
    () => build({
      actionDelegations: [{
        ...fixture.actionDelegation,
        sourceFingerprint: "d".repeat(64),
      }],
    }),
    (error) =>
      error?.code === "caller-action-ledger-proof-missing",
  );

  assert.throws(
    () => build({
      actionDelegations: [{
        ...fixture.actionDelegation,
        enclosingFunctionIdentity: JSON.stringify({
          kind: "function",
          ancestry: [{
            name: "createReplacementFixture",
            ordinal: 0,
          }, {
            name: "siblingCommit",
            ordinal: 0,
          }],
        }),
      }],
    }),
    (error) =>
      error?.code === "caller-action-ledger-proof-missing",
  );
});

test("domain-action membership authority is unique across action modules", () => {
  const policy = createCallerActionLedgerPolicy([]);
  policy.progress.latestPhase = "P4.1";
  delete policy.progress.callerToActionLedger;
  policy.progress.retiredLegacySemanticAuthority =
    createEmptyLegacySemanticAuthority();
  const bootWriter = structuredClone(policy.writers[0]);
  bootWriter.bindings[0].grants[0] = {
    domain: "boot",
    migrationPhase: "P4.1",
    operations: ["assign"],
    keys: ["bootPhase"],
    memberships: [{ operation: "assign", key: "bootPhase" }],
    aliasSites: [],
    dynamicSites: [],
    ambiguousSites: [],
    unsupportedSites: [],
  };
  const duplicateWriter = structuredClone(bootWriter);
  duplicateWriter.path =
    "js/core/state/actions/scenario_readiness_actions.js";
  duplicateWriter.bindings[0].id =
    "function:commitScenarioReadinessState:0:$";
  duplicateWriter.bindings[0].functionName =
    "commitScenarioReadinessState";
  policy.writers = [bootWriter, duplicateWriter];

  const violations = validateStateWriterPolicySchema(policy);
  assert.ok(
    violations.some(
      ({ code, domain, operation, key }) =>
        code === "duplicate-domain-action-membership-authority"
        && domain === "boot"
        && operation === "assign"
        && key === "bootPhase",
    ),
    JSON.stringify(violations, null, 2),
  );
});

test("multiple action exports in one module may share one membership authority", () => {
  const policy = createCallerActionLedgerPolicy([]);
  policy.progress.latestPhase = "P4.1";
  delete policy.progress.callerToActionLedger;
  policy.progress.retiredLegacySemanticAuthority =
    createEmptyLegacySemanticAuthority();
  const writer = policy.writers[0];
  writer.bindings.push({
    ...structuredClone(writer.bindings[0]),
    id: "function:replaceBootMetricsState:0:$",
    functionName: "replaceBootMetricsState",
  });

  assert.ok(
    !validateStateWriterPolicySchema(policy).some(
      ({ code }) =>
        code === "duplicate-domain-action-membership-authority",
    ),
  );
});

test("policy snapshot keeps every historical caller-to-action proof live after later phases", () => {
  const entry = createCallerActionLedgerEntry(0, {
    actionCallEdgeIdentity: "a".repeat(64),
  });
  const policy = createCallerActionLedgerPolicy([entry]);
  policy.progress.latestPhase = "P4.2b";
  const actionWriter = policy.writers[0];
  const scans = [{
    path: actionWriter.path,
    surface: actionWriter.surface,
    bindingId: actionWriter.bindings[0].id,
    findings: [
      createFinding({
        filePath: actionWriter.path,
        bindingId: actionWriter.bindings[0].id,
      }),
    ],
  }];

  const missingHistoricalEdge = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: [],
    scans,
    actionDelegations: [],
  });
  assert.ok(
    missingHistoricalEdge.violations.some(
      ({ code, retiredMembershipIdentity }) =>
        code === "caller-action-ledger-observation-missing"
        && retiredMembershipIdentity === entry.retiredMembershipIdentity,
    ),
    JSON.stringify(missingHistoricalEdge.violations, null, 2),
  );

  const movedButSemanticallyStableEdge =
    validateStateWriterPolicySnapshot({
      policy,
      legacyAllowlistPaths: [],
      scans,
      actionDelegations: [
        createActionDelegationObservation(entry, {
          callerBindingId: "renamed-local-binding-id",
          start: entry.start + 200,
          end: entry.end + 200,
          line: entry.line + 20,
          column: entry.column + 2,
          sourceFingerprint: "b".repeat(64),
        }),
      ],
    });
  assert.ok(
    !movedButSemanticallyStableEdge.violations.some(
      ({ code }) =>
        code === "caller-action-ledger-observation-missing"
        || code === "caller-action-ledger-observation-mismatch",
    ),
    JSON.stringify(
      movedButSemanticallyStableEdge.violations,
      null,
      2,
    ),
  );
});

test("current phase deterministically preserves exactly the 36 backfilled P4.1 caller-to-action proofs", async () => {
  const checkedIn = await readStateWriterPolicy();
  const build = () =>
    buildStateWriterPolicySnapshot({
      phase: checkedIn.progress.latestPhase,
      baseSha: checkedIn.baseline.sourceBaseSha,
      generatedAt: checkedIn.baseline.generatedAt,
      previousPolicy: checkedIn,
    });
  const first = await build();
  const second = await build();
  const entries = first.progress?.callerToActionLedger?.entries;

  assert.ok(Array.isArray(entries));
  const backfilledEntries = entries.filter(
    ({ backfilled }) => backfilled === true,
  );
  assert.equal(backfilledEntries.length, 36);
  assert.deepEqual(
    entries,
    [...entries].sort((left, right) =>
      left.retiredMembershipIdentity.localeCompare(
        right.retiredMembershipIdentity,
      )
      || left.actionCallEdgeIdentity.localeCompare(
        right.actionCallEdgeIdentity,
      )
    ),
  );
  assert.ok(
    backfilledEntries.every(
      ({ retiredInPhase, recordedInPhase, backfilled }) =>
        retiredInPhase === "P4.1"
        && recordedInPhase === "P4.2a"
        && backfilled === true,
    ),
  );
  assert.deepEqual(
    second.progress.callerToActionLedger,
    first.progress.callerToActionLedger,
  );
});

test("P4.5b closeout turns missed frozen targets into policy violations", () => {
  const targets = {
    productionLegacyDirectFiles: 54,
    productionLegacyMemberships: 726,
  };
  const currentMetrics = {
    productionLegacyDirectFiles: 55,
    productionLegacyMemberships: 727,
  };

  assert.deepEqual(
    buildStateWriterCloseoutTargetViolations({
      phase: "P4.5b",
      currentMetrics,
      targets,
    }),
    [
      {
        code: "closeout-legacy-direct-files-target-missed",
        actual: 55,
        target: 54,
      },
      {
        code: "closeout-legacy-memberships-target-missed",
        actual: 727,
        target: 726,
      },
    ],
  );
  assert.deepEqual(
    buildStateWriterCloseoutTargetViolations({
      phase: "P4.4",
      currentMetrics,
      targets,
    }),
    [],
  );
});

test("repository checker reports a passing closed-world policy and default-state shape", async () => {
  const policy = await readStateWriterPolicy();
  const report = await buildStateWriterPolicyReport();
  const currentCheckpoint = policy.progress.checkpoints.find(
    ({ phase }) => phase === policy.progress.latestPhase,
  );

  assert.equal(report.verdict, "pass", JSON.stringify(report.violations, null, 2));
  assert.equal(report.phase, policy.progress.latestPhase);
  assert.equal(report.metrics.unknownCandidateBindings, 0);
  assert.equal(report.metrics.stalePolicyBindings, 0);
  assert.equal(
    report.metrics.legacyMemberships.production,
    currentCheckpoint.productionLegacyMemberships,
  );
  assert.ok(
    report.metrics.legacyMemberships.production
      <= report.frozenMetrics.bindingScopedMemberships.production.legacyCombined,
  );
  assert.ok(
    report.metrics.bindingScoped.sites.alias.production.legacyCombined
      <= report.frozenMetrics.bindingScopedSites.alias.production.legacyCombined,
  );
  assert.ok(
    report.metrics.bindingScoped.sites.ambiguous.production.legacyCombined
      <= report.frozenMetrics.bindingScopedSites.ambiguous.production.legacyCombined,
  );
  assert.ok(
    report.metrics.bindingScoped.sites.unsupported.production.legacyCombined
      <= report.frozenMetrics.bindingScopedSites.unsupported.production.legacyCombined,
  );
  assert.deepEqual(report.targets, {
    productionLegacyDirectFiles: 54,
    productionLegacyMemberships: 949,
    productionLegacyMembershipRatio: 0.8,
    productionLegacyMembershipDenominator: 1187,
    source:
      "baselines.bindingScopedMemberships.production.legacyCombined",
  });
  assert.equal(report.defaultState.actual.preCompatKeys, 402);
  assert.equal(report.defaultState.actual.postCompatKeys, 488);
  assert.equal(report.defaultState.actual.collisions, 0);
});

test("checker rejects a requested phase that has no matching policy checkpoint", async () => {
  const report = await buildStateWriterPolicyReport({ phase: "P4.3" });
  assert.equal(report.phase, "P4.3");
  assert.equal(report.verdict, "fail");
  assert.ok(
    report.violations.some(({ code }) => code === "policy-phase-mismatch"),
  );
});

test("P4.0 freezes closeout targets from the authoritative membership denominator", () => {
  const baselines = {
    bindingScopedMemberships: {
      production: {
        legacyCombined: 1187,
      },
    },
  };

  assert.deepEqual(buildP4CloseoutTargets(baselines), {
    productionLegacyDirectFiles: 54,
    productionLegacyMemberships: 949,
    productionLegacyMembershipRatio: 0.8,
    productionLegacyMembershipDenominator: 1187,
    source:
      "baselines.bindingScopedMemberships.production.legacyCombined",
  });
  assert.deepEqual(
    validateFrozenCloseoutTargets({
      ...baselines,
      closeoutTargets: buildP4CloseoutTargets(baselines),
    }),
    [],
  );
  assert.deepEqual(
    validateFrozenCloseoutTargets({
      ...baselines,
      closeoutTargets: {
        ...buildP4CloseoutTargets(baselines),
        productionLegacyMembershipDenominator: 908,
      },
    }).map(({ code }) => code),
    ["closeout-target-denominator-drift"],
  );
  assert.deepEqual(
    validateFrozenCloseoutTargets({
      ...baselines,
      closeoutTargets: {
        productionLegacyDirectFiles: 999,
        productionLegacyMemberships: 830,
        productionLegacyMembershipRatio: 0.7,
        productionLegacyMembershipDenominator: 1187,
        source:
          "baselines.bindingScopedMemberships.production.legacyCombined",
      },
    }).map(({ code }) => code),
    [
      "closeout-target-ratio-drift",
      "closeout-membership-target-drift",
      "closeout-direct-files-target-drift",
    ],
  );
});

test("generic package verifier follows the checked-in policy phase", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const command = packageJson.scripts["verify:p4:state-writer-policy"];

  assert.equal(
    command,
    "npm run test:node:p4:state-writer-policy && node tools/check_state_writer_policy.mjs",
  );
});

test("canonical authority catalog detects collisions across factory explicit lazy and hook registrations", () => {
  const injected = buildCanonicalStateKeyAuthorityCatalog({
    additionalExplicitKeys: [
      {
        key: "bootPhase",
        domain: "boot",
        migrationPhase: "P4.1",
        owner: "explicit:fixture-boot-phase",
      },
    ],
    additionalLazyStateKeyDomains: {
      bootPhase: ["boot", "P4.1"],
      syncDayNightClockTimerFn: ["runtime-hooks", "P4.5"],
    },
    additionalCompatibilityHooks: ["startupInitialScenarioChunkVisualPromotion"],
  });

  assert.deepEqual(
    injected.collisions.map(({ key }) => key),
    [
      "bootPhase",
      "bootPhase",
      "startupInitialScenarioChunkVisualPromotion",
      "syncDayNightClockTimerFn",
    ],
  );
  assert.throws(
    () =>
      buildCanonicalStateKeyAuthorityIndex({
        additionalLazyStateKeyDomains: {
          bootPhase: ["boot", "P4.1"],
        },
      }),
    (error) =>
      error?.code === "state-key-authority-collision"
      && error.collisions.some(({ key }) => key === "bootPhase"),
  );
});

test("progress checkpoints require finite non-negative integer metrics", () => {
  const validMetrics = {
    productionLegacyDirectFiles: 75,
    productionLegacyMemberships: 1090,
    productionLegacyDynamicSites: 96,
    productionLegacyAliasSites: 96,
    productionLegacyAmbiguousSites: 216,
    productionLegacyUnsupportedSites: 2,
  };
  const invalidValues = [
    ["missing", undefined],
    ["nan", Number.NaN],
    ["negative", -1],
    ["fractional", 1.5],
    ["numeric-string", "2"],
  ];

  for (const [label, invalidValue] of invalidValues) {
    const currentMetrics = { ...validMetrics };
    if (label === "missing") {
      delete currentMetrics.productionLegacyUnsupportedSites;
    } else {
      currentMetrics.productionLegacyUnsupportedSites = invalidValue;
    }
    const result = validateStateWriterPolicyProgression({
      phase: "P4.0",
      currentMetrics,
    });
    assert.equal(result.verdict, "fail", label);
    assert.ok(
      result.violations.some(
        ({ code, metric, scope }) =>
          code === "progress-metric-invalid"
          && metric === "productionLegacyUnsupportedSites"
          && scope === "current",
      ),
      label,
    );
  }

  const invalidCheckpoint = validateStateWriterPolicyProgression({
    previousPolicy: {
      baseline: { phase: "P4.0" },
      progress: {
        latestPhase: "P4.0",
        checkpoints: [{
          phase: "P4.0",
          ...validMetrics,
          productionLegacyUnsupportedSites: Number.POSITIVE_INFINITY,
        }],
      },
    },
    phase: "P4.1",
    currentMetrics: validMetrics,
  });
  assert.ok(
    invalidCheckpoint.violations.some(
      ({ code, metric, scope }) =>
        code === "progress-metric-invalid"
        && metric === "productionLegacyUnsupportedSites"
        && scope === "checkpoint:P4.0",
    ),
  );

  const invalidAcceptedPolicyCheckpoint =
    validateStateWriterPolicyProgression({
      previousPolicy: {
        baseline: { phase: "P4.0" },
        progress: {
          latestPhase: "P4.2c",
          checkpoints: [{
            phase: "P4.2c",
            ...validMetrics,
            previousAcceptedSourceSha: "invalid",
            previousAcceptedPolicyBlobSha256: "invalid",
          }],
        },
      },
      phase: "P4.3",
      currentMetrics: validMetrics,
    });
  assert.ok(
    invalidAcceptedPolicyCheckpoint.violations.some(
      ({ code, phase }) =>
        code === "progress-accepted-policy-checkpoint-invalid"
        && phase === "P4.2c",
    ),
  );
});

test("policy snapshot admits exact non-ambiguous unsupported sites and rejects moved or stale sites", () => {
  const policy = createPolicyFixture();
  const grant = policy.writers[0].bindings[0].grants[0];
  grant.unsupportedSites.push({
    line: 11,
    column: 7,
    reason: "state-alias-escape",
    operation: "unsupported",
    key: "*",
  });
  const makeScans = (line, reason = "state-alias-escape") => [
    {
      path: "js/fixture.js",
      surface: "production",
      bindingId: "runtime-state",
      findings: [
        createFinding(),
        createFinding({
          operation: "unsupported",
          key: "*",
          unsupported: true,
          reason,
          line,
          column: 7,
        }),
      ],
    },
    {
      path: "tests/fixture.test.mjs",
      surface: "test",
      bindingId: "test-state",
      findings: [
        createFinding({
          filePath: "tests/fixture.test.mjs",
          bindingId: "test-state",
        }),
      ],
    },
  ];

  const exact = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans: makeScans(11),
  });
  const moved = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans: makeScans(12),
  });
  const changedReason = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans: makeScans(11, "unsupported-call-mutation"),
  });
  const stale = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans: makeScans(Number.NaN).map((scan, index) =>
      index === 0
        ? { ...scan, findings: [createFinding()] }
        : scan
    ),
  });

  assert.equal(exact.verdict, "pass", JSON.stringify(exact.violations));
  assert.equal(
    exact.metrics.bindingScoped.sites.unsupported.production.legacyCombined,
    1,
  );
  assert.ok(
    moved.violations.some(
      ({ code }) => code === "unknown-unsupported-site",
    ),
  );
  assert.ok(
    moved.violations.some(
      ({ code }) => code === "stale-unsupported-site",
    ),
  );
  assert.ok(
    changedReason.violations.some(
      ({ code }) => code === "unknown-unsupported-site",
    ),
  );
  assert.ok(
    changedReason.violations.some(
      ({ code }) => code === "stale-unsupported-site",
    ),
  );
  assert.ok(
    stale.violations.some(
      ({ code }) => code === "stale-unsupported-site",
    ),
  );
});

test("unsupported site progression is monotonic after the frozen baseline", () => {
  const previousPolicy = {
    baseline: { phase: "P4.0" },
    progress: {
      latestPhase: "P4.0",
      checkpoints: [
        {
          phase: "P4.0",
          productionLegacyDirectFiles: 75,
          productionLegacyMemberships: 1090,
          productionLegacyDynamicSites: 96,
          productionLegacyAliasSites: 96,
          productionLegacyAmbiguousSites: 216,
          productionLegacyUnsupportedSites: 2,
        },
      ],
    },
  };
  const result = validateStateWriterPolicyProgression({
    previousPolicy,
    phase: "P4.1",
    currentMetrics: {
      ...previousPolicy.progress.checkpoints[0],
      productionLegacyUnsupportedSites: 3,
    },
  });

  assert.ok(
    result.violations.some(
      ({ code }) => code === "legacy-unsupported-sites-increased",
    ),
  );
});

test("builder freezes exact diagnostic sites only for production bindings", () => {
  const unsupportedFinding = createFinding({
    operation: "unsupported",
    key: "*",
    unsupported: true,
    reason: "state-alias-escape",
    line: 9,
    column: 3,
  });
  const concreteFinding = createFinding({
    operation: "assign",
    key: "bootPhase",
    line: 10,
    column: 3,
  });
  const productionGrants = buildStateWriterBindingGrants(
    [unsupportedFinding],
    "js/bootstrap/fixture.js",
    buildCanonicalStateKeyAuthorityIndex(),
    "production",
  );
  const testGrants = buildStateWriterBindingGrants(
    [unsupportedFinding, concreteFinding],
    "tests/fixture.test.mjs",
    buildCanonicalStateKeyAuthorityIndex(),
    "test",
  );

  assert.equal(productionGrants.length, 1);
  assert.deepEqual(productionGrants[0].unsupportedSites, [
    {
      line: 9,
      column: 3,
      reason: "state-alias-escape",
      operation: "unsupported",
      key: "*",
    },
  ]);
  assert.equal(testGrants.length, 1);
  assert.deepEqual(testGrants[0].memberships, [
    {
      operation: "assign",
      key: "bootPhase",
    },
  ]);
  assert.deepEqual(testGrants[0].ambiguousSites, []);
  assert.deepEqual(testGrants[0].unsupportedSites, []);
  assert.deepEqual(
    buildStateWriterBindingGrants(
      [unsupportedFinding],
      "tests/diagnostic_only.test.mjs",
      buildCanonicalStateKeyAuthorityIndex(),
      "test",
    ),
    [],
  );
});

test("test-fixture diagnostics use aggregate budgets while concrete memberships remain exact", () => {
  const policy = createPolicyFixture();
  const testScan = {
    path: "tests/fixture.test.mjs",
    surface: "test",
    bindingId: "test-state",
    findings: [
      createFinding({
        filePath: "tests/fixture.test.mjs",
        bindingId: "test-state",
      }),
      createFinding({
        filePath: "tests/fixture.test.mjs",
        bindingId: "test-state",
        operation: "unsupported",
        key: "*",
        unsupported: true,
        reason: "ambiguous-alias-flow",
        line: 12,
        column: 2,
      }),
      createFinding({
        filePath: "tests/fixture.test.mjs",
        bindingId: "test-state",
        operation: "unsupported",
        key: "*",
        unsupported: true,
        reason: "state-alias-escape",
        line: 13,
        column: 2,
      }),
    ],
  };
  const scans = [
    {
      path: "js/fixture.js",
      surface: "production",
      bindingId: "runtime-state",
      findings: [createFinding()],
    },
    testScan,
  ];
  const result = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans,
  });

  assert.equal(result.verdict, "pass", JSON.stringify(result.violations));
  assert.deepEqual(result.metrics.bindingScoped.diagnostics.test, {
    byReason: {
      "ambiguous-alias-flow": 1,
      "state-alias-escape": 1,
    },
    total: 2,
  });

  const exactTestGrant = structuredClone(policy);
  exactTestGrant.writers[1].bindings[0].grants[0].unsupportedSites.push({
    line: 13,
    column: 2,
    reason: "state-alias-escape",
    operation: "unsupported",
    key: "*",
  });
  const exactGrantResult = validateStateWriterPolicySnapshot({
    policy: exactTestGrant,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans,
  });
  assert.ok(
    exactGrantResult.violations.some(
      ({ code }) =>
        code === "test-fixture-exact-diagnostic-grant-forbidden",
    ),
  );

  const concreteDrift = validateStateWriterPolicySnapshot({
    policy,
    legacyAllowlistPaths: ["js/fixture.js", "tests/fixture.test.mjs"],
    scans: [
      scans[0],
      {
        ...testScan,
        findings: [
          createFinding({
            filePath: "tests/fixture.test.mjs",
            bindingId: "test-state",
            key: "bootMessage",
          }),
        ],
      },
    ],
  });
  assert.ok(
    concreteDrift.violations.some(
      ({ code }) => code === "unknown-membership",
    ),
  );
  assert.ok(
    concreteDrift.violations.some(
      ({ code }) => code === "stale-membership",
    ),
  );
});

test("test diagnostic aggregate budget rejects new reasons and count increases", () => {
  const baseline = {
    byReason: {
      "ambiguous-alias-flow": 2,
      "state-alias-escape": 3,
    },
    total: 5,
  };
  assert.deepEqual(
    validateTestDiagnosticBudget({
      baseline,
      current: {
        byReason: {
          "ambiguous-alias-flow": 1,
          "state-alias-escape": 3,
        },
        total: 4,
      },
    }),
    [],
  );

  const violations = validateTestDiagnosticBudget({
    baseline,
    current: {
      byReason: {
        "ambiguous-alias-flow": 3,
        "state-alias-escape": 3,
        "unsupported-call-mutation": 1,
      },
      total: 7,
    },
  });
  assert.deepEqual(
    violations.map(({ code, reason }) => [code, reason || ""]),
    [
      ["test-diagnostic-reason-increased", "ambiguous-alias-flow"],
      ["test-diagnostic-reason-added", "unsupported-call-mutation"],
      ["test-diagnostic-total-increased", ""],
    ],
  );
  assert.deepEqual(
    validateTestDiagnosticBudget({
      baseline: {
        byReason: { "ambiguous-alias-flow": 2 },
        total: 1,
      },
      current: {
        byReason: { "ambiguous-alias-flow": 1 },
        total: 2,
      },
    }).map(({ code }) => code),
    [
      "test-diagnostic-baseline-total-mismatch",
      "test-diagnostic-total-mismatch",
      "test-diagnostic-total-increased",
    ],
  );
});

test("verification identity distinguishes source and verification SHAs and fails closed on tracked dirt", () => {
  const calls = [];
  const cleanIdentity = buildStateWriterVerificationIdentity({
    sourceBaseSha: "1".repeat(40),
    requireClean: true,
    runGit(args) {
      calls.push(args);
      const joined = args.join(" ");
      if (joined === "rev-parse --verify HEAD^{commit}") {
        return `${"2".repeat(40)}\n`;
      }
      if (joined === "rev-parse HEAD^{tree}") {
        return `${"3".repeat(40)}\n`;
      }
      if (joined.startsWith("status --porcelain")) {
        return "";
      }
      if (joined.startsWith("hash-object ")) {
        return `${"4".repeat(40)}\n`;
      }
      throw new Error(`unexpected git call: ${joined}`);
    },
    policyPath: "tools/state_writer_policy.json",
    configPaths: [
      "tools/state_writer_policy.mjs",
      "tools/build_state_writer_policy.mjs",
    ],
  });

  assert.equal(cleanIdentity.sourceBaseSha, "1".repeat(40));
  assert.equal(cleanIdentity.verificationSha, "2".repeat(40));
  assert.equal(cleanIdentity.verificationTreeSha, "3".repeat(40));
  assert.equal(cleanIdentity.trackedClean, true);
  assert.equal(cleanIdentity.policyBlobSha, "4".repeat(40));
  assert.equal(cleanIdentity.configBlobShas.length, 2);
  assert.match(cleanIdentity.configTreeIdentity, /^[0-9a-f]{64}$/);
  assert.deepEqual(cleanIdentity.violations, []);
  assert.ok(calls.length >= 5);
  assert.ok(
    calls.some(
      (args) =>
        args.join(" ")
        === "status --porcelain=v1 --untracked-files=all",
    ),
  );

  const dirtyIdentity = buildStateWriterVerificationIdentity({
    sourceBaseSha: "1".repeat(40),
    requireClean: true,
    runGit(args) {
      const joined = args.join(" ");
      if (joined === "rev-parse --verify HEAD^{commit}") {
        return `${"2".repeat(40)}\n`;
      }
      if (joined === "rev-parse HEAD^{tree}") {
        return `${"3".repeat(40)}\n`;
      }
      if (joined.startsWith("status --porcelain")) {
        return " M tools/state_writer_policy.mjs\n";
      }
      if (joined.startsWith("hash-object ")) {
        return `${"4".repeat(40)}\n`;
      }
      throw new Error(`unexpected git call: ${joined}`);
    },
  });

  assert.equal(dirtyIdentity.trackedClean, false);
  assert.deepEqual(
    dirtyIdentity.violations.map(({ code }) => code),
    ["tracked-worktree-dirty"],
  );

  const untrackedIdentity = buildStateWriterVerificationIdentity({
    sourceBaseSha: "1".repeat(40),
    requireClean: true,
    runGit(args) {
      const joined = args.join(" ");
      if (joined === "rev-parse --verify HEAD^{commit}") {
        return `${"2".repeat(40)}\n`;
      }
      if (joined === "rev-parse HEAD^{tree}") {
        return `${"3".repeat(40)}\n`;
      }
      if (joined.startsWith("status --porcelain")) {
        return "?? tools/state_writer_policy.json\n";
      }
      if (joined.startsWith("hash-object ")) {
        return `${"4".repeat(40)}\n`;
      }
      throw new Error(`unexpected git call: ${joined}`);
    },
  });
  assert.equal(untrackedIdentity.trackedClean, false);
  assert.deepEqual(
    untrackedIdentity.violations.map(({ code }) => code),
    ["tracked-worktree-dirty"],
  );
});

test("source base SHA resolves to a commit and rejects non-commit revisions", () => {
  const head = resolveGitCommitSha("HEAD");
  assert.match(head, /^[0-9a-f]{40}$/);
  assert.throws(
    () => resolveGitCommitSha("refs/heads/__missing_p4_fixture__"),
    /commit/i,
  );
});

test("accepted policy checkpoint resolves the newest exact committed policy blob", () => {
  const acceptedSha = "2".repeat(40);
  const olderSha = "1".repeat(40);
  const policy = {
    schemaVersion: 2,
    progress: { latestPhase: "P4.2c" },
  };
  const acceptedSource = `${JSON.stringify({
    progress: policy.progress,
    schemaVersion: policy.schemaVersion,
  }, null, 2)}\n`;
  const calls = [];
  const checkpoint = resolveAcceptedStateWriterPolicyCheckpoint({
    policy,
    runGit(args) {
      calls.push(args);
      const joined = args.join(" ");
      if (
        joined
        === "log --format=%H HEAD -- tools/state_writer_policy.json"
      ) {
        return `${acceptedSha}\n${olderSha}\n`;
      }
      if (
        joined
        === `show ${acceptedSha}:tools/state_writer_policy.json`
      ) {
        return acceptedSource;
      }
      if (
        joined
        === `show ${olderSha}:tools/state_writer_policy.json`
      ) {
        return "{}\n";
      }
      throw new Error(`unexpected git call: ${joined}`);
    },
  });

  assert.deepEqual(checkpoint, {
    sourceSha: acceptedSha,
    policyBlobSha256: createHash("sha256")
      .update(acceptedSource)
      .digest("hex"),
  });
  assert.deepEqual(calls, [
    ["log", "--format=%H", "HEAD", "--", "tools/state_writer_policy.json"],
    ["show", `${acceptedSha}:tools/state_writer_policy.json`],
  ]);
});

test("derived alias taint manifest makes changed production strict and preserves unchanged baseline production", () => {
  const baselineSha = "1".repeat(40);
  const candidatePaths = [
    "js/changed.js",
    "js/committed_since_baseline.js",
    "js/renamed_since_baseline.js",
    "js/copied_since_baseline.js",
    "js/staged_or_unstaged.js",
    "js/untracked.js",
    "js/persisted_strict.js",
    "js/unchanged.js",
    "js/core/state/actions/unchanged_action.js",
    "tests/changed_fixture.js",
  ];
  const calls = [];
  const manifest = buildStateWriterDerivedAliasTaintModeManifest({
    previousPolicy: {
      baseline: { sourceBaseSha: baselineSha },
      baselines: {
        derivedAliasTaint: {
          paths: ["js/persisted_strict.js"],
        },
      },
    },
    sourceBaseSha: baselineSha,
    candidatePaths,
    runGit(args) {
      calls.push(args);
      const joined = args.join(" ");
      if (
        joined
        === `rev-parse --verify ${baselineSha}^{commit}`
      ) {
        return `${baselineSha}\n`;
      }
      if (
        joined
        === `merge-base --is-ancestor ${baselineSha} HEAD`
      ) {
        return "";
      }
      if (
        joined
        === `diff --name-only ${baselineSha} -- js`
      ) {
        return [
          "js/changed.js",
          "js/committed_since_baseline.js",
          "js/renamed_since_baseline.js",
          "js/copied_since_baseline.js",
          "js/staged_or_unstaged.js",
        ].join("\n");
      }
      if (
        joined
        === "ls-files --others --exclude-standard -- js"
      ) {
        return "js/untracked.js\n";
      }
      throw new Error(`unexpected git call: ${joined}`);
    },
  });

  assert.deepEqual(
    manifest.changedProductionPaths,
    [
      "js/changed.js",
      "js/committed_since_baseline.js",
      "js/copied_since_baseline.js",
      "js/renamed_since_baseline.js",
      "js/staged_or_unstaged.js",
      "js/untracked.js",
    ],
  );
  for (const relativePath of [
    "js/changed.js",
    "js/committed_since_baseline.js",
    "js/renamed_since_baseline.js",
    "js/copied_since_baseline.js",
    "js/staged_or_unstaged.js",
    "js/untracked.js",
    "js/persisted_strict.js",
    "js/core/state/actions/unchanged_action.js",
  ]) {
    assert.equal(
      manifest.modeByPath[relativePath],
      DERIVED_ALIAS_TAINT_MODES.STRICT,
      relativePath,
    );
  }
  assert.equal(
    manifest.modeByPath["js/unchanged.js"],
    DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  );
  assert.equal(
    manifest.modeByPath["tests/changed_fixture.js"],
    DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  );
  assert.deepEqual(
    manifest.persistentStrictProductionPaths,
    ["js/persisted_strict.js"],
  );
  assert.deepEqual(
    validateStateWriterDerivedAliasTaintModeManifest(manifest),
    [],
  );
  assert.equal(calls.length, 4);
});

test("derived alias taint manifest rejects changed-path legacy resolution, git failures, and baseline drift", () => {
  const baselineSha = "1".repeat(40);
  const strictManifest = {
    sourceBaseSha: baselineSha,
    changedProductionPaths: ["js/changed.js"],
    modeByPath: {
      "js/changed.js":
        DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
    },
  };
  assert.ok(
    validateStateWriterDerivedAliasTaintModeManifest(strictManifest)
      .some(
        ({ code }) =>
          code
          === "derived-alias-taint-changed-path-resolved-legacy",
      ),
  );

  assert.throws(
    () =>
      buildStateWriterDerivedAliasTaintModeManifest({
        previousPolicy: {
          baseline: { sourceBaseSha: baselineSha },
        },
        sourceBaseSha: baselineSha,
        candidatePaths: ["js/changed.js"],
        runGit(args) {
          if (args[0] === "rev-parse") {
            return `${baselineSha}\n`;
          }
          if (args[0] === "merge-base") {
            return "";
          }
          throw new Error("diff unavailable");
        },
      }),
    (error) =>
      error?.code === "derived-alias-taint-git-diff-failed",
  );

  assert.throws(
    () =>
      buildStateWriterDerivedAliasTaintModeManifest({
        previousPolicy: {
          baseline: { sourceBaseSha: baselineSha },
        },
        sourceBaseSha: "2".repeat(40),
        candidatePaths: ["js/changed.js"],
        runGit(args) {
          const revision = String(args[2] || "")
            .replace(/\^\{commit\}$/, "");
          return `${revision}\n`;
        },
      }),
    (error) =>
      error?.code === "derived-alias-taint-baseline-drift",
  );

  assert.throws(
    () =>
      buildStateWriterDerivedAliasTaintModeManifest({
        previousPolicy: {
          baseline: { sourceBaseSha: "invalid-base" },
        },
        candidatePaths: ["js/changed.js"],
        runGit() {
          throw new Error("unknown revision");
        },
      }),
    (error) => error?.code === "source-base-sha-invalid",
  );

  assert.throws(
    () =>
      buildStateWriterDerivedAliasTaintModeManifest({
        previousPolicy: {
          baseline: { sourceBaseSha: baselineSha },
        },
        sourceBaseSha: baselineSha,
        candidatePaths: ["js/changed.js"],
        runGit(args) {
          if (args[0] === "rev-parse") {
            return `${baselineSha}\n`;
          }
          if (args[0] === "merge-base") {
            throw new Error("not an ancestor");
          }
          throw new Error(`unexpected git call: ${args.join(" ")}`);
        },
      }),
    (error) =>
      error?.code
      === "derived-alias-taint-baseline-not-ancestor",
  );
});

test("binding discovery honors the same derived alias taint mode as candidate scanning", async () => {
  const source = `
    function identity(value) {
      return value;
    }
    export function update(model) {
      const alias = identity(model);
      alias.bootPhase = "ready";
    }
  `;
  const strictBindings = await discoverStateWriterBindingsForSource(
    "js/changed_derived_alias_fixture.js",
    source,
    "production",
    {
      scanAllParameters: true,
      derivedAliasTaintMode:
        DERIVED_ALIAS_TAINT_MODES.STRICT,
    },
  );
  const legacyBindings = await discoverStateWriterBindingsForSource(
    "js/unchanged_derived_alias_fixture.js",
    source,
    "production",
    {
      scanAllParameters: true,
      derivedAliasTaintMode:
        DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
    },
  );

  assert.equal(
    strictBindings.some(
      ({ functionName }) => functionName === "update",
    ),
    true,
  );
  assert.equal(
    legacyBindings.some(
      ({ functionName }) => functionName === "update",
    ),
    false,
  );
});

test("default-state key shape is hermetic across child-process global variations", () => {
  const moduleUrl = new URL("../tools/state_writer_policy.mjs", import.meta.url)
    .href;
  const runProbe = (globals) => {
    const script = `
      Object.assign(globalThis, ${JSON.stringify(globals)});
      const { buildDefaultStateOwnershipReport } = await import(${JSON.stringify(moduleUrl)});
      const report = await buildDefaultStateOwnershipReport();
      process.stdout.write(JSON.stringify({
        factoryGroups: report.factoryGroups.map(({ id, keys }) => ({ id, keys })),
        explicitKeys: report.explicitKeys,
        compatibilityHooks: report.compatibilityHooks,
        preCompatKeyCount: report.preCompatKeyCount,
        postCompatKeyCount: report.postCompatKeyCount,
        actualFacadeKeys: report.actualFacadeKeys,
      }));
    `;
    const child = spawnSync(process.execPath, [
      "--input-type=module",
      "--eval",
      script,
    ], {
      encoding: "utf8",
    });
    assert.equal(child.status, 0, child.stderr);
    return JSON.parse(child.stdout);
  };

  const baseline = runProbe({
    currentLanguage: "",
    devicePixelRatio: 0,
    topojson: null,
  });
  const varied = runProbe({
    currentLanguage: "zh-CN",
    devicePixelRatio: 3,
    topojson: { feature: "fixture" },
  });

  assert.deepEqual(varied, baseline);
  assert.equal(baseline.preCompatKeyCount, 402);
  assert.equal(baseline.postCompatKeyCount, 488);
});
