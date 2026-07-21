import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  STATE_ACTION_CROSS_FILE_MIGRATION_CONTRACT,
  STATE_TARGET_PURE_READER_CONTRACT,
  validateStateTargetPureReaderContract,
} from "../tools/state_action_delegation_contract.mjs";
import {
  applyStateWriterBindingFindingContracts,
  discoverStateWriterBindingsForSource,
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
