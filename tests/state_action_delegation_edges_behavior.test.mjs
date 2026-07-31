import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import {
  STATE_ACTION_DELEGATION_CONTRACT,
  STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT,
  STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT,
  STATE_TARGET_PURE_READER_CONTRACT,
  validateStateActionModuleSource,
  validateStateActionModulePhaseAdmissions,
  validateStateTargetPureReaderContract,
} from "../tools/state_action_delegation_contract.mjs";
import {
  applyStateWriterBindingFindingContracts,
  discoverStateWriterBindingsForSource,
  normalizeStateActionDelegations,
  scanStateWriterBindingInventoriesBatch,
} from "../tools/build_state_writer_policy.mjs";
import {
  scanStateMutationInventory,
  scanStateMutations,
} from "../tools/state_writer_inventory.mjs";

const FILE_PATH = "js/bootstrap/state_action_edge_fixture.js";
const MODULE_BINDING = Object.freeze({
  id: "module:runtimeState",
  kind: "module",
  name: "runtimeState",
  importSource: "../core/state.js",
  importedName: "state",
});

function scan(source) {
  return scanStateMutationInventory(source, {
    filePath: FILE_PATH,
    bindings: [MODULE_BINDING],
  });
}

test("P4.2b optional and city action exports have one canonical owner", () => {
  const expectedOwners = new Map([
    ["applyScenarioChunkOptionalLayerState", "js/core/state/actions/scenario_activation_actions.js"],
    ["restoreScenarioChunkPromotionState", "js/core/state/actions/scenario_activation_actions.js"],
    ["applyScenarioChunkCityExternalEffectState", "js/core/state/actions/scenario_presentation_actions.js"],
    ["finalizeScenarioChunkCityExternalEffectState", "js/core/state/actions/scenario_presentation_actions.js"],
  ]);
  for (const [exportName, modulePath] of expectedOwners) {
    const entries = STATE_ACTION_DELEGATION_CONTRACT.filter(
      (entry) => entry.exportName === exportName,
    );
    assert.equal(entries.length, 1, `${exportName} must have one registered owner`);
    assert.equal(entries[0].modulePath, modulePath);
    assert.equal(entries[0].introducedInPhase, "P4.2b");
  }
  assert.ok(STATE_ACTION_LEGACY_MEMBERSHIP_REPLACEMENT_CONTRACT.every(
    ({ modulePath }) =>
      modulePath === "js/core/state/actions/scenario_activation_actions.js",
  ));
  assert.deepEqual(
    validateStateActionModulePhaseAdmissions({
      modulePaths: ["js/core/state/actions/scenario_activation_actions.js"],
      phase: "P4.2b",
    }),
    [],
  );
  assert.ok(validateStateActionModulePhaseAdmissions({
    modulePaths: ["js/core/state/actions/scenario_activation_actions.js"],
    phase: "P4.2a",
  }).some(({ code }) => code === "state-action-module-phase-not-admitted"));
});

test("P4.2c scenario health actions have canonical owners and cross-file retirement proofs", () => {
  const expectedOwners = new Map([
    ["setScenarioHydrationHealthGateState", "js/core/state/actions/scenario_health_actions.js"],
    ["restoreScenarioHydrationHealthGateState", "js/core/state/actions/scenario_health_actions.js"],
    ["setScenarioDataHealthState", "js/core/state/actions/scenario_health_actions.js"],
    ["restoreScenarioDataHealthState", "js/core/state/actions/scenario_health_actions.js"],
    ["setActiveScenarioPerformanceHintsState", "js/core/state/actions/scenario_presentation_actions.js"],
  ]);
  for (const [exportName, modulePath] of expectedOwners) {
    const entries = STATE_ACTION_DELEGATION_CONTRACT.filter(
      (entry) => entry.exportName === exportName,
    );
    assert.equal(entries.length, 1, `${exportName} must have one registered owner`);
    assert.equal(entries[0].modulePath, modulePath);
    assert.equal(entries[0].introducedInPhase, "P4.2c");
  }

  const healthRetirementProofs = STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT
    .filter(({ key }) => [
      "scenarioDataHealth",
      "scenarioHydrationHealthGate",
    ].includes(key));
  assert.deepEqual(
    healthRetirementProofs.map(({ key, actionExportName }) => ({
      key,
      actionExportName,
    })),
    [
      {
        key: "scenarioDataHealth",
        actionExportName: "setScenarioDataHealthState",
      },
      {
        key: "scenarioHydrationHealthGate",
        actionExportName: "setScenarioHydrationHealthGateState",
      },
    ],
  );
});

test("P4.2c scenario health cross-file proofs match one live caller edge", async () => {
  const healthRetirementProofs = STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT
    .filter(({ key }) => [
      "scenarioDataHealth",
      "scenarioHydrationHealthGate",
    ].includes(key));

  for (const proof of healthRetirementProofs) {
    const source = fs.readFileSync(proof.replacementCallerPath, "utf8");
    const inventory = await discoverStateWriterBindingsForSource(
      proof.replacementCallerPath,
      source,
      "production",
      { scanAllParameters: true, includeInventories: true },
    );
    const edges = normalizeStateActionDelegations(
      inventory.bindingInventories.flatMap(
        ({ actionDelegations = [] }) => actionDelegations,
      ),
    );
    const matches = edges.filter((edge) => (
      edge.callerPath === proof.replacementCallerPath
      && edge.callerBindingIdentity
        === proof.replacementCallerBindingIdentity
      && edge.enclosingFunctionIdentity
        === proof.replacementEnclosingFunctionIdentity
      && edge.actionModulePath === proof.actionModulePath
      && edge.actionExportName === proof.actionExportName
      && edge.targetArgumentIndex === proof.targetArgumentIndex
      && edge.sourceFingerprint
        === proof.replacementActionSourceFingerprint
    ));
    assert.equal(matches.length, 1, `${proof.key} must have one exact live replacement edge`);
  }
});

test("P4.3 renderer cross-boundary proofs lock retired evidence and exact replacement calls", async () => {
  const rendererProofs =
    STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT
      .filter(({ domain, migrationPhase }) =>
        domain === "renderer"
        && migrationPhase === "P4.3"
      );
  assert.deepEqual(
    rendererProofs.map((proof) => [
      proof.retiredCallerPath,
      proof.key,
      proof.actionExportName,
      proof.retiredMutationSites.length,
    ]),
    [
      ["js/core/map_renderer.js", "deferExactAfterSettle", "setDeferExactAfterSettleState", 3],
      ["js/core/map_renderer.js", "dprLastStageSwitchAt", "commitRendererDprStageState", 1],
      ["js/core/map_renderer.js", "dprStage", "commitRendererDprStageState", 1],
      ["js/core/map_renderer.js", "firstVisibleFramePainted", "setFirstVisibleFramePaintedState", 1],
      ["js/core/map_renderer.js", "pendingExactPoliticalFastFrame", "setPendingExactPoliticalFastFrameState", 2],
      ["js/core/map_renderer.js", "projectedBoundsById", "commitProjectedBoundsCacheState", 1],
      ["js/core/map_renderer.js", "projectedBoundsDiagnostics", "setProjectedBoundsDiagnosticsState", 2],
      ["js/core/map_renderer.js", "renderPerfMetrics", "ensureRenderPerfMetricsState", 1],
      ["js/core/map_renderer.js", "renderPerfMetricSequence", "commitRenderPerfMetricState", 1],
      ["js/core/state/renderer_runtime_state.js", "exactAfterSettleController", "ensureExactAfterSettleControllerState", 2],
      ["js/core/state/renderer_runtime_state.js", "renderPassCache", "ensureRenderPassCacheState", 49],
      ["js/core/state/renderer_runtime_state.js", "exactAfterSettleController", "resetExactAfterSettleControllerState", 2],
    ],
  );

  const runtimeStateProofs = rendererProofs.filter(
    ({ replacementCallerPath }) =>
      replacementCallerPath
        === "js/core/state/renderer_runtime_state.js",
  );
  const runtimeStatePath =
    "js/core/state/renderer_runtime_state.js";
  const runtimeStateSource = fs.readFileSync(
    runtimeStatePath,
    "utf8",
  );
  const runtimeStateInventory =
    await discoverStateWriterBindingsForSource(
      runtimeStatePath,
      runtimeStateSource,
      "production",
      { scanAllParameters: true, includeInventories: true },
    );
  const runtimeStateEdges = normalizeStateActionDelegations(
    runtimeStateInventory.bindingInventories.flatMap(
      ({ actionDelegations = [] }) => actionDelegations,
    ),
  );
  for (const proof of runtimeStateProofs) {
    const matches = runtimeStateEdges.filter((edge) => (
      edge.callerPath === proof.replacementCallerPath
      && edge.callerBindingIdentity
        === proof.replacementCallerBindingIdentity
      && edge.enclosingFunctionIdentity
        === proof.replacementEnclosingFunctionIdentity
      && edge.actionModulePath === proof.actionModulePath
      && edge.actionExportName === proof.actionExportName
      && edge.targetArgumentIndex === proof.targetArgumentIndex
      && edge.sourceFingerprint
        === proof.replacementActionSourceFingerprint
    ));
    assert.equal(
      matches.length,
      1,
      `${proof.key} must have one exact live renderer-state replacement edge`,
    );
  }

  const mapRendererSource = fs.readFileSync(
    "js/core/map_renderer.js",
    "utf8",
  );
  for (const [actionCall, actionExportName] of [
    [
      "ensureRenderPerfMetricsState(runtimeState)",
      "ensureRenderPerfMetricsState",
    ],
    [
      "commitRenderPerfMetricState(runtimeState, payload)",
      "commitRenderPerfMetricState",
    ],
  ]) {
    const proof = rendererProofs.find(
      (entry) => entry.actionExportName === actionExportName,
    );
    assert.equal(
      mapRendererSource.split(actionCall).length - 1,
      1,
      `${actionExportName} must have one exact call source`,
    );
    assert.equal(
      createHash("sha256").update(actionCall).digest("hex"),
      proof.replacementActionSourceFingerprint,
    );
  }
});

test("compatibility API returns findings plus canonical named action delegation edges", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  setBootStateFields as commitBootFields,",
    '} from "../core/state/actions/boot_actions.js";',
    "",
    "export function applyBootFields(target = runtimeState) {",
    '  commitBootFields(target, { bootPhase: "ready" });',
    "}",
    "",
  ].join("\n");

  const inventory = scan(source);
  assert.ok(Array.isArray(inventory.findings));
  assert.deepEqual(inventory.findings, []);
  assert.equal(inventory.actionDelegations.length, 1);

  const [edge] = inventory.actionDelegations;
  const expectedStart = source.indexOf("commitBootFields(target");
  assert.deepEqual(
    {
      filePath: edge.filePath,
      bindingId: edge.bindingId,
      bindingKind: edge.bindingKind,
      root: edge.root,
      functionName: edge.functionName,
      parameterName: edge.parameterName,
      parameterIndex: edge.parameterIndex,
      parameterPath: edge.parameterPath,
      importSource: edge.importSource,
      importedName: edge.importedName,
      aliasSources: edge.aliasSources,
      aliasOperators: edge.aliasOperators,
      locator: edge.locator,
      actionModulePath: edge.actionModulePath,
      actionExportName: edge.actionExportName,
      targetArgumentIndex: edge.targetArgumentIndex,
      start: edge.start,
      end: edge.end,
      line: edge.line,
      column: edge.column,
    },
    {
      filePath: FILE_PATH,
      bindingId: "module:runtimeState",
      bindingKind: "module",
      root: "runtimeState",
      functionName: "",
      parameterName: "runtimeState",
      parameterIndex: null,
      parameterPath: "",
      importSource: "../core/state.js",
      importedName: "state",
      aliasSources: [],
      aliasOperators: [],
      locator: null,
      actionModulePath: "js/core/state/actions/boot_actions.js",
      actionExportName: "setBootStateFields",
      targetArgumentIndex: 0,
      start: expectedStart,
      end: expectedStart
        + 'commitBootFields(target, { bootPhase: "ready" })'.length,
      line: 7,
      column: 3,
    },
  );
  assert.match(edge.sourceFingerprint, /^[a-f0-9]{64}$/);
  assert.match(
    edge.enclosingFunctionIdentity,
    /"name":"applyBootFields"/,
  );
  assert.ok(Array.isArray(scanStateMutations(source, {
    filePath: FILE_PATH,
    bindings: [MODULE_BINDING],
  })));
});

test("registered action payloads can project state while nested unknown calls remain diagnosed", () => {
  const directProjection = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  setBootStateFields as commitBootFields,",
    '} from "../core/state/actions/boot_actions.js";',
    "commitBootFields(runtimeState, {",
    "  bootPhase: runtimeState.bootPhase,",
    "  startupBootCacheState: {",
    "    phase: runtimeState.bootPhase,",
    "  },",
    "});",
    "",
  ].join("\n");
  const directInventory = scan(directProjection);
  assert.equal(directInventory.actionDelegations.length, 1);
  assert.deepEqual(directInventory.findings, []);

  const nestedUnknownCall = directProjection.replace(
    "bootPhase: runtimeState.bootPhase,",
    "bootPhase: consumeUnknown(runtimeState.bootPhase),",
  );
  const nestedInventory = scan(nestedUnknownCall);
  assert.equal(nestedInventory.actionDelegations.length, 1);
  assert.deepEqual(
    nestedInventory.findings.map(({ reason, evidenceKind, key }) => ({
      reason,
      evidenceKind,
      key,
    })),
    [{
      reason: "state-alias-escape",
      evidenceKind: "unknown-call-argument",
      key: "bootPhase",
    }],
  );
});

test("registered action payload containers accept concrete non-root projections", () => {
  const imports = [
    'import { state as runtimeState } from "../core/state.js";',
    'import { setBootStateFields as commitBootFields } from "../core/state/actions/boot_actions.js";',
    'const dynamicKey = "bootPhase";',
  ];
  const scanPayload = (payload) => scan([
    ...imports,
    `commitBootFields(runtimeState, ${payload});`,
    "",
  ].join("\n"));

  const safeArrayInventory = scanPayload("[runtimeState.bootPhase]");
  assert.equal(safeArrayInventory.actionDelegations.length, 1);
  assert.deepEqual(safeArrayInventory.findings, []);

  for (const payload of [
    "{ ...runtimeState.startup }",
    "{ nested: { ...runtimeState.startup } }",
    "{ metric: runtimeState.bootMetrics[dynamicKey] }",
    "{ nested: { ...runtimeState.bootMetrics[dynamicKey] } }",
    "{ promotion: runtimeState.runtimeChunkLoadState.pendingPromotion || null }",
    "{ count: Math.max(0, Number(runtimeState.retryCount) || 0) }",
  ]) {
    const inventory = scanPayload(payload);
    assert.equal(inventory.actionDelegations.length, 1, payload);
    assert.deepEqual(inventory.findings, [], payload);
  }
});

test("registered action payload containers reject root, dynamic, and computed state aliases", () => {
  const imports = [
    'import { state as runtimeState } from "../core/state.js";',
    'import { setBootStateFields as commitBootFields } from "../core/state/actions/boot_actions.js";',
    'const dynamicKey = "bootPhase";',
  ];
  const scanPayload = (payload) => scan([
    ...imports,
    `commitBootFields(runtimeState, ${payload});`,
    "",
  ].join("\n"));

  for (const payload of [
    "{ nested: runtimeState }",
    "[runtimeState]",
    "{ ...runtimeState }",
    "{ nested: { ...runtimeState } }",
    "{ ...(runtimeState || {}) }",
    "{ [runtimeState.bootPhase]: 1 }",
    "{ nested: runtimeState[dynamicKey] }",
    '{ nested: runtimeState[dynamicKey] + "suffix" }',
    "{ nested: (runtimeState[dynamicKey], 1) }",
  ]) {
    const inventory = scanPayload(payload);
    assert.equal(inventory.actionDelegations.length, 1, payload);
    assert.deepEqual(
      inventory.findings.map(({ reason, evidenceKind, key }) => ({
        reason,
        evidenceKind,
        key,
      })),
      [{
        reason: "state-alias-escape",
        evidenceKind: "unknown-call-argument",
        key: "*",
      }],
      payload,
    );
  }
});

test("registered action payload Reflect.get accepts static projections and rejects dynamic root access", () => {
  const imports = [
    'import { state as runtimeState } from "../core/state.js";',
    'import { setBootStateFields as commitBootFields } from "../core/state/actions/boot_actions.js";',
    'const dynamicKey = "bootPhase";',
  ];
  const scanPayload = (payload) => scan([
    ...imports,
    `commitBootFields(runtimeState, ${payload});`,
    "",
  ].join("\n"));

  for (const payload of [
    '{ phase: Reflect.get(runtimeState, "bootPhase") }',
    '{ promotion: Reflect.get(runtimeState.runtimeChunkLoadState, "pendingPromotion") }',
  ]) {
    const inventory = scanPayload(payload);
    assert.equal(inventory.actionDelegations.length, 1, payload);
    assert.equal(inventory.findings.length, 0, payload);
  }

  for (const payload of [
    "{ phase: Reflect.get(runtimeState, dynamicKey) }",
    "{ promotion: Reflect.get(runtimeState.runtimeChunkLoadState, dynamicKey) }",
    "{ root: Reflect.get(runtimeState) }",
  ]) {
    const inventory = scanPayload(payload);
    assert.equal(inventory.actionDelegations.length, 1, payload);
    assert.equal(inventory.findings.length, 1, payload);
    assert.deepEqual(
      inventory.findings.map(({ reason, evidenceKind, key }) => ({
        reason,
        evidenceKind,
        key,
      })),
      [{
        reason: "state-alias-escape",
        evidenceKind: "unknown-call-argument",
        key: "*",
      }],
      payload,
    );
  }
});

test("registered action payload spreads reject immutable aliases that can be the state root", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    'import { setBootStateFields as commitBootFields } from "../core/state/actions/boot_actions.js";',
    "export function applyBootFields(explicitRuntimeState = null) {",
    "  const target = explicitRuntimeState || runtimeState;",
    "  commitBootFields(target, { ...target });",
    "}",
    "",
  ].join("\n");

  const inventory = scan(source);
  assert.equal(inventory.actionDelegations.length, 1);
  assert.deepEqual(
    inventory.findings.map(({ reason, evidenceKind, key }) => ({
      reason,
      evidenceKind,
      key,
    })),
    [{
      reason: "state-alias-escape",
      evidenceKind: "unknown-call-argument",
      key: "*",
    }],
  );
});

test("registered actions accept immutable unions whose tracked branch is the state root", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    'import { setBootStateFields as commitBootFields } from "../core/state/actions/boot_actions.js";',
    "export function applyBootFields(explicitRuntimeState = null) {",
    "  const target = explicitRuntimeState || runtimeState;",
    '  commitBootFields(target, { bootPhase: "ready" });',
    "}",
    "",
  ].join("\n");

  const inventory = scan(source);
  assert.deepEqual(inventory.findings, []);
  assert.equal(inventory.actionDelegations.length, 1);
  assert.equal(
    inventory.actionDelegations[0].actionExportName,
    "setBootStateFields",
  );
});

test("registered actions accept only declared static non-root read-only arguments", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  replaceScenarioChunkPendingPromotionIdentityState,",
    '} from "../core/state/actions/scenario_chunk_runtime_actions.js";',
    "replaceScenarioChunkPendingPromotionIdentityState(",
    "  runtimeState,",
    "  runtimeState.runtimeChunkLoadState.pendingPromotion,",
    "  { scenarioApplyRequestId: 7 },",
    ");",
    "",
  ].join("\n");

  const inventory = scan(source);
  assert.equal(inventory.actionDelegations.length, 1);
  assert.deepEqual(inventory.findings, []);

  const rootInventory = scan(source.replace(
    "runtimeState.runtimeChunkLoadState.pendingPromotion,",
    "runtimeState,",
  ));
  assert.equal(rootInventory.actionDelegations.length, 1);
  assert.deepEqual(
    rootInventory.findings.map(({ reason, evidenceKind, key }) => ({
      reason,
      evidenceKind,
      key,
    })),
    [{
      reason: "state-alias-escape",
      evidenceKind: "unknown-call-argument",
      key: "*",
    }],
  );

  const unionSource = source
    .replace(
      "replaceScenarioChunkPendingPromotionIdentityState(\n  runtimeState,",
      [
        "export function replacePendingIdentity(explicitRuntimeState = null) {",
        "  const target = explicitRuntimeState || runtimeState;",
        "  replaceScenarioChunkPendingPromotionIdentityState(\n  target,",
      ].join("\n"),
    )
    .replace(
      "runtimeState.runtimeChunkLoadState.pendingPromotion,",
      "target.runtimeChunkLoadState.pendingPromotion,",
    )
    .replace("\n);\n", "\n  );\n}\n");
  const unionInventory = scan(unionSource);
  assert.equal(unionInventory.actionDelegations.length, 1);
  assert.deepEqual(unionInventory.findings, []);

  const dynamicSource = source.replace(
    "runtimeState.runtimeChunkLoadState.pendingPromotion,",
    [
      "runtimeState.runtimeChunkLoadState[dynamicKey],",
      ");",
      "replaceScenarioChunkPendingPromotionIdentityState(",
      "  runtimeState,",
      "  runtimeState.runtimeChunkLoadState.pendingPromotion[dynamicKey],",
    ].join("\n"),
  ).replace(
    'import { state as runtimeState } from "../core/state.js";',
    [
      'import { state as runtimeState } from "../core/state.js";',
      'const dynamicKey = "pendingPromotion";',
    ].join("\n"),
  );
  const dynamicInventory = scan(dynamicSource);
  assert.equal(dynamicInventory.actionDelegations.length, 2);
  assert.equal(dynamicInventory.findings.length, 2);
  assert.deepEqual(
    dynamicInventory.findings.map(({ reason, evidenceKind, key }) => ({
      reason,
      evidenceKind,
      key,
    })),
    Array.from({ length: 2 }, () => ({
      reason: "state-alias-escape",
      evidenceKind: "unknown-call-argument",
      key: "runtimeChunkLoadState",
    })),
  );
});

test("action edges carry stable enclosing function identities that distinguish sibling callers", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  setBootStateFields as commitBootFields,",
    '} from "../core/state/actions/boot_actions.js";',
    "",
    "export function firstCaller() {",
    "  commitBootFields(runtimeState, { bootPhase: 'first' });",
    "}",
    "",
    "export function secondCaller() {",
    "  commitBootFields(runtimeState, { bootPhase: 'second' });",
    "}",
    "",
  ].join("\n");

  const edges = scan(source).actionDelegations;
  assert.equal(edges.length, 2);
  assert.notEqual(
    edges[0].enclosingFunctionIdentity,
    edges[1].enclosingFunctionIdentity,
  );
  assert.match(edges[0].enclosingFunctionIdentity, /"name":"firstCaller"/);
  assert.match(edges[1].enclosingFunctionIdentity, /"name":"secondCaller"/);
});

test("uncalled local helpers and statically false branches provide no action proof", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  setBootStateFields as commitBootFields,",
    '} from "../core/state/actions/boot_actions.js";',
    "",
    "function unusedHelper() {",
    "  commitBootFields(runtimeState, { bootPhase: 'unused' });",
    "}",
    "",
    "const unusedArrow = () => {",
    "  commitBootFields(runtimeState, { bootPhase: 'unused-arrow' });",
    "};",
    "",
    "export function reachableCaller() {",
    "  if (false) {",
    "    commitBootFields(runtimeState, { bootPhase: 'unreachable' });",
    "  }",
    "  commitBootFields(runtimeState, { bootPhase: 'reachable' });",
    "}",
    "",
  ].join("\n");

  const edges = scan(source).actionDelegations;
  assert.equal(edges.length, 1);
  assert.equal(edges[0].line, 18);
  assert.match(
    edges[0].enclosingFunctionIdentity,
    /"name":"reachableCaller"/,
  );
});

test("methods returned by an exported factory reach their immutable local action helpers", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  setBootStateFields as commitBootFields,",
    '} from "../core/state/actions/boot_actions.js";',
    "",
    "export function createBootPipeline() {",
    "  function commitBoot() {",
    "    commitBootFields(runtimeState, { bootPhase: 'ready' });",
    "  }",
    "  function applyBoot() {",
    "    commitBoot();",
    "  }",
    "  function unusedSibling() {",
    "    commitBootFields(runtimeState, { bootPhase: 'unused' });",
    "  }",
    "  return { applyBoot };",
    "}",
    "",
  ].join("\n");

  const edges = scan(source).actionDelegations;
  assert.equal(edges.length, 1);
  assert.equal(edges[0].line, 8);
  assert.match(
    edges[0].enclosingFunctionIdentity,
    /"name":"commitBoot"/,
  );
});

test("canonical read-only action calls consume the state root without mutation authority", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  captureScenarioReadinessState,",
    '} from "../core/state/actions/scenario_readiness_actions.js";',
    "",
    "export function capture() {",
    "  return captureScenarioReadinessState(runtimeState);",
    "}",
    "",
  ].join("\n");

  const inventory = scan(source);
  assert.deepEqual(inventory.findings, []);
  assert.deepEqual(inventory.actionDelegations, []);
});

test("rollback supplemental capture is a registered read-only state action export", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  captureScenarioTransactionRollbackSupplementalState,",
    '} from "../core/state/actions/scenario_transaction_rollback_actions.js";',
    "",
    "export function capture() {",
    "  return captureScenarioTransactionRollbackSupplementalState(",
    "    runtimeState,",
    "    { cloneValue, readHookSource },",
    "  );",
    "}",
    "",
  ].join("\n");

  const inventory = scan(source);
  assert.deepEqual(inventory.findings, []);
  assert.deepEqual(inventory.actionDelegations, []);
});

test("a read-only-only action module remains valid only through its explicit export catalog", () => {
  const modulePath = "js/core/state/actions/scenario_transaction_rollback_actions.js";
  const source = fs.readFileSync(modulePath, "utf8");

  assert.deepEqual(
    validateStateActionModuleSource(source, { filePath: modulePath }),
    [],
  );
  assert.ok(
    validateStateActionModuleSource(
      `${source}\nexport function unregisteredRollbackReader() { return null; }\n`,
      { filePath: modulePath },
    ).some(({ code }) => code === "state-action-direct-export-unregistered"),
  );
});

test("scenario chunk continuation capture is a registered read-only state action export", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  captureScenarioChunkLoadStateContinuation,",
    '} from "../core/state/actions/scenario_chunk_runtime_actions.js";',
    "",
    "export function capture() {",
    "  return captureScenarioChunkLoadStateContinuation(runtimeState);",
    "}",
    "",
  ].join("\n");

  const inventory = scan(source);
  assert.deepEqual(inventory.findings, []);
  assert.deepEqual(inventory.actionDelegations, []);
});

test("optional, local, reassigned, and wrong-target calls produce no action edge", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  setBootStateFields as commitBootFields,",
    '} from "../core/state/actions/boot_actions.js";',
    "",
    "commitBootFields?.(runtimeState, {});",
    "commitBootFields(runtimeState.bootMetrics, {});",
    "commitBootFields = consumeState;",
    "commitBootFields(runtimeState, {});",
    "{",
    "  const commitBootFields = consumeState;",
    "  commitBootFields(runtimeState, {});",
    "}",
    "",
  ].join("\n");

  assert.deepEqual(scan(source).actionDelegations, []);
});

test("inserted lines preserve semantic binding fields and source fingerprint", () => {
  const body = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  setBootStateFields as commitBootFields,",
    '} from "../core/state/actions/boot_actions.js";',
    "commitBootFields(runtimeState, {});",
    "",
  ].join("\n");
  const original = scan(body).actionDelegations[0];
  const shifted = scan(`// inserted one\n// inserted two\n${body}`)
    .actionDelegations[0];

  const stableFields = [
    "filePath",
    "bindingId",
    "bindingKind",
    "root",
    "functionName",
    "parameterName",
    "parameterIndex",
    "parameterPath",
    "importSource",
    "importedName",
    "actionModulePath",
    "actionExportName",
    "targetArgumentIndex",
    "sourceFingerprint",
  ];
  assert.deepEqual(
    Object.fromEntries(stableFields.map((field) => [field, original[field]])),
    Object.fromEntries(stableFields.map((field) => [field, shifted[field]])),
  );
  assert.equal(shifted.line, original.line + 2);
  assert.ok(shifted.start > original.start);
});

test("repeated control-flow visits dedupe one call per binding and retain distinct sites", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  setBootStateFields as commitBootFields,",
    '} from "../core/state/actions/boot_actions.js";',
    "for (let index = 0; index < 2; index += 1) {",
    "  commitBootFields(runtimeState, {});",
    "}",
    "commitBootFields(runtimeState, {});",
    "commitBootFields(runtimeState, {});",
    "",
  ].join("\n");

  const edges = scan(source).actionDelegations;
  assert.equal(edges.length, 3);
  assert.deepEqual(
    edges.map(({ line }) => line),
    [6, 8, 9],
  );
  assert.ok(
    edges.every((edge, index) =>
      index === 0 || edges[index - 1].start < edge.start
    ),
  );
});

test("defaulted full-root target is accepted while a defaulted child target is rejected", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "import {",
    "  setBootStateFields as commitBootFields,",
    '} from "../core/state/actions/boot_actions.js";',
    "export function commit(",
    "  target = runtimeState,",
    "  childTarget = runtimeState.bootMetrics,",
    ") {",
    "  commitBootFields(target, {});",
    "  commitBootFields(childTarget, {});",
    "}",
    "",
  ].join("\n");

  const edges = scan(source).actionDelegations;
  assert.equal(edges.length, 1);
  assert.equal(edges[0].line, 9);
  assert.equal(edges[0].actionExportName, "setBootStateFields");
});

test("registered pure-reader target stays out of writer policy and fails closed on drift", async () => {
  const modulePath = "js/core/scenario_manager.js";
  const source = fs.readFileSync(modulePath, "utf8");
  const contractEntry = STATE_TARGET_PURE_READER_CONTRACT.find(
    (entry) =>
      entry.modulePath === modulePath
      && entry.functionName === "prepareScenarioDetailTopologyState",
  );

  assert.ok(contractEntry);
  assert.deepEqual(validateStateTargetPureReaderContract(), []);
  assert.equal(
    contractEntry.acceptedEscapes.some(({ key }) => key === "*"),
    false,
  );
  assert.equal(
    contractEntry.conservativeFindings.reduce(
      (total, { count }) => total + count,
      0,
    ),
    22,
  );
  assert.ok(
    contractEntry.conservativeFindings.every(
      ({
        enclosingFunctionIdentity,
        reason,
        operation,
        key,
        sourceFingerprint,
        count,
      }) =>
        enclosingFunctionIdentity
        && reason === "state-alias-escape"
        && operation === "unsupported"
        && key
        && /^[a-f0-9]{64}$/.test(sourceFingerprint)
        && Number.isInteger(count)
        && count > 0,
    ),
  );

  const discovery = await discoverStateWriterBindingsForSource(
    modulePath,
    source,
    "production",
    {
      scanAllParameters: true,
      includeInventories: true,
    },
  );
  const bindings = discovery.bindings;
  assert.equal(
    bindings.some(
      (binding) =>
        binding.functionName === contractEntry.functionName
        && binding.parameterIndex === contractEntry.targetParameterIndex
        && binding.parameterPath === contractEntry.targetParameterPath,
    ),
    false,
  );
  const conservativeFindingIdentities = new Set(
    contractEntry.conservativeFindings.map((finding) =>
      [
        finding.enclosingFunctionIdentity,
        finding.reason,
        finding.operation,
        finding.key,
        finding.sourceFingerprint,
      ].join("|")
    ),
  );
  const moduleInventory = discovery.bindingInventories.find(
    ({ binding }) =>
      binding.kind === "module"
      && binding.name === "runtimeState",
  );
  assert.ok(moduleInventory);
  const [rawModuleInventory] =
    scanStateWriterBindingInventoriesBatch(
      source,
      modulePath,
      [moduleInventory.binding],
    );
  assert.deepEqual(
    applyStateWriterBindingFindingContracts({
      relativePath: modulePath,
      binding: moduleInventory.binding,
      findings: rawModuleInventory.findings,
    }),
    moduleInventory.findings,
  );
  assert.equal(
    moduleInventory.findings.some((finding) =>
      conservativeFindingIdentities.has(
        [
          finding.enclosingFunctionIdentity,
          finding.reason,
          finding.operation,
          finding.key,
          finding.sourceFingerprint,
        ].join("|"),
      )
    ),
    false,
  );

  const mutatedSource = source.replace(
    "  const currentPatch = () => ({",
    [
      "  targetState.detailDeferred = false;",
      "  const currentPatch = () => ({",
    ].join("\n"),
  );
  await assert.rejects(
    () =>
      discoverStateWriterBindingsForSource(
        modulePath,
        mutatedSource,
        "production",
        { scanAllParameters: true },
      ),
    (error) =>
      error?.code === "state-target-pure-reader-contract-violation"
      && error.violations.some(
        (violation) =>
          violation.code === "state-target-pure-reader-mutation",
      ),
  );

  const escapedSource = source.replace(
    "  const hasDetailNow = hasUsableTopology(targetState.topologyDetail);",
    [
      "  consumeUnknownStateTarget(targetState.topologyDetail);",
      "  const hasDetailNow = hasUsableTopology(targetState.topologyDetail);",
    ].join("\n"),
  );
  await assert.rejects(
    () =>
      discoverStateWriterBindingsForSource(
        modulePath,
        escapedSource,
        "production",
        { scanAllParameters: true },
      ),
    (error) =>
      error?.code === "state-target-pure-reader-contract-violation"
      && error.violations.some(
        (violation) =>
          violation.code
          === "state-target-pure-reader-conservative-finding-unregistered",
      ),
  );
});

test("rollback snapshot composition has no state-alias escape from returned capture containers", async () => {
  const modulePath = "js/core/scenario_rollback.js";
  const source = fs.readFileSync(modulePath, "utf8");
  const discovery = await discoverStateWriterBindingsForSource(
    modulePath,
    source,
    "production",
    {
      scanAllParameters: true,
      includeInventories: true,
    },
  );
  const moduleInventory = discovery.bindingInventories.find(
    ({ binding }) =>
      binding.kind === "module"
      && binding.name === "runtimeState",
  );
  assert.ok(moduleInventory);
  assert.deepEqual(
    moduleInventory.findings.filter(
      (finding) =>
        finding.enclosingFunctionIdentity
          === '{"kind":"function","ancestry":[{"name":"captureScenarioApplyRollbackSnapshot","ordinal":0}]}'
        && finding.reason === "state-alias-escape",
    ),
    [],
  );
});

test("pure-reader contracts reject wildcard accepted escapes", () => {
  const [entry] = STATE_TARGET_PURE_READER_CONTRACT;
  const forged = [{
    ...entry,
    acceptedEscapes: [{
      reason: "state-alias-escape",
      key: "*",
      sourceFingerprint: "a".repeat(64),
      count: 1,
    }],
  }];

  assert.ok(
    validateStateTargetPureReaderContract(forged).some(
      ({ code }) =>
        code === "state-target-pure-reader-escape-wildcard-forbidden",
    ),
  );
});
