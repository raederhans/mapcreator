import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  discoverStateWriterBindingsForSource,
  scanStateWriterBindingInventoriesBatch,
  scanStateWriterPolicySnapshot,
} from "../tools/build_state_writer_policy.mjs";
import {
  DERIVED_ALIAS_TAINT_MODES,
  scanStateMutationInventory,
} from "../tools/state_writer_inventory.mjs";

const FILE_PATH = "js/bootstrap/state_writer_batch_fixture.js";

const MODULE_BINDING = Object.freeze({
  id: "module:runtimeState",
  kind: "module",
  name: "runtimeState",
  importSource: "../core/state.js",
  importedName: "state",
});

const PARAMETER_BINDING = Object.freeze({
  id: "function:applyBootFields:param:0:$",
  kind: "function-parameter",
  name: "target",
  functionName: "applyBootFields",
  parameterName: "target",
  parameterIndex: 0,
  parameterPath: "$",
});

const DIAGNOSTIC_BINDING = Object.freeze({
  id: "function:broken:param:0:$",
  kind: "function-parameter",
  name: "target",
  functionName: "broken",
  parameterName: "target",
  parameterIndex: 0,
  parameterPath: "$",
  discoveryDiagnostics: Object.freeze([
    Object.freeze({ reason: "fixture-binding-discovery-failed" }),
  ]),
});

const SOURCE = [
  'import { state as runtimeState } from "../core/state.js";',
  "import {",
  "  setBootStateFields as commitBootFields,",
  '} from "../core/state/actions/boot_actions.js";',
  "",
  "function identity(value) {",
  "  return value;",
  "}",
  "",
  "export function applyBootFields(target = runtimeState) {",
  '  target.bootPhase = "ready";',
  "  const derived = identity(runtimeState);",
  '  derived.bootMessage = "ready";',
  '  commitBootFields(target, { bootProgress: 1 });',
  "}",
  "",
].join("\n");

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
    importSource: binding.importSource || "",
    importedName: binding.importedName || "",
    aliasSources: binding.aliasSources || [],
    aliasOperators: binding.aliasOperators || [],
    locator: binding.locator || null,
  };
}

function fingerprintFindings(source, findings) {
  return findings.map((finding) => {
    const start = Math.max(0, Number(finding.start || 0));
    const end = Math.max(start, Number(finding.end || start));
    const sourceSlice = source
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

function scanSingleBinding(source, binding) {
  if (binding.discoveryDiagnostics?.length) {
    return {
      binding,
      findings: binding.discoveryDiagnostics.map((diagnostic) => ({
        filePath: FILE_PATH,
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
          .update([
            FILE_PATH,
            binding.id,
            diagnostic.reason || "binding-discovery-failed",
          ].join("|"))
          .digest("hex"),
      })),
      actionDelegations: [],
    };
  }
  const inventory = scanStateMutationInventory(source, {
    filePath: FILE_PATH,
    bindings: [toScannerBinding(binding)],
    derivedAliasTaintMode: DERIVED_ALIAS_TAINT_MODES.STRICT,
  });
  return {
    binding,
    findings: fingerprintFindings(source, inventory.findings),
    actionDelegations: inventory.actionDelegations,
  };
}

test("batch binding inventory is byte-equivalent to legacy single-binding scans", () => {
  const bindings = [
    MODULE_BINDING,
    PARAMETER_BINDING,
    DIAGNOSTIC_BINDING,
  ];
  const expected = bindings.map((binding) =>
    scanSingleBinding(SOURCE, binding)
  );

  const actual = scanStateWriterBindingInventoriesBatch(
    SOURCE,
    FILE_PATH,
    bindings,
    DERIVED_ALIAS_TAINT_MODES.STRICT,
  );

  assert.deepEqual(actual, expected);
  assert.ok(
    actual[0].findings.some(
      (finding) =>
        finding.key === "bootMessage"
        && finding.alias === "derived",
    ),
    "strict derived taint finding must remain assigned to the module binding",
  );
  assert.equal(
    actual.flatMap(({ actionDelegations }) => actionDelegations).length,
    expected.flatMap(({ actionDelegations }) => actionDelegations).length,
  );
});

test("state writer inventory is stable across LF and CRLF checkouts", () => {
  const options = {
    filePath: FILE_PATH,
    bindings: [MODULE_BINDING, PARAMETER_BINDING].map(toScannerBinding),
    derivedAliasTaintMode: DERIVED_ALIAS_TAINT_MODES.STRICT,
  };

  const lfInventory = scanStateMutationInventory(SOURCE, options);
  const crlfInventory = scanStateMutationInventory(
    SOURCE.replaceAll("\n", "\r\n"),
    options,
  );

  assert.deepEqual(crlfInventory, lfInventory);
});

test("batch binding inventory invokes the scanner once for all scannable bindings", () => {
  const calls = [];
  const scanner = (source, options) => {
    calls.push({ source, options });
    return scanStateMutationInventory(source, options);
  };

  const actual = scanStateWriterBindingInventoriesBatch(
    SOURCE,
    FILE_PATH,
    [MODULE_BINDING, PARAMETER_BINDING, DIAGNOSTIC_BINDING],
    DERIVED_ALIAS_TAINT_MODES.STRICT,
    { scanner },
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(
    calls[0].options.bindings.map(({ id }) => id),
    [MODULE_BINDING.id, PARAMETER_BINDING.id],
  );
  assert.deepEqual(
    actual.map(({ binding }) => binding.id),
    [
      MODULE_BINDING.id,
      PARAMETER_BINDING.id,
      DIAGNOSTIC_BINDING.id,
    ],
  );
});

test("batch binding inventory rejects duplicate ids before scanner execution", () => {
  const first = {
    ...PARAMETER_BINDING,
    id: "collision-binding",
  };
  const conflicting = {
    ...first,
    name: "otherTarget",
    parameterName: "otherTarget",
    parameterIndex: 1,
  };
  let scannerCalls = 0;
  const scanner = () => {
    scannerCalls += 1;
    return { findings: [], actionDelegations: [] };
  };

  assert.throws(
    () => scanStateWriterBindingInventoriesBatch(
      SOURCE,
      FILE_PATH,
      [first, conflicting],
      DERIVED_ALIAS_TAINT_MODES.STRICT,
      { scanner },
    ),
    (error) => (
      error?.code === "state-writer-batch-binding-id-collision"
      && error?.bindingId === "collision-binding"
      && error?.bindingIds?.length === 2
      && error?.bindingIds?.every((id) => id === "collision-binding")
      && error?.signatures?.length === 2
      && error.signatures[0] !== error.signatures[1]
    ),
  );
  assert.equal(scannerCalls, 0);

  const undefinedPayload = {
    ...first,
    aliasSources: [undefined],
  };
  const nullPayload = {
    ...first,
    aliasSources: [null],
  };
  assert.throws(
    () => scanStateWriterBindingInventoriesBatch(
      SOURCE,
      FILE_PATH,
      [undefinedPayload, nullPayload],
      DERIVED_ALIAS_TAINT_MODES.STRICT,
      { scanner },
    ),
    (error) => (
      error?.code === "state-writer-batch-binding-id-collision"
      && error?.signatures?.length === 2
      && error.signatures[0] !== error.signatures[1]
    ),
  );
  assert.equal(scannerCalls, 0);

  assert.throws(
    () => scanStateWriterBindingInventoriesBatch(
      SOURCE,
      FILE_PATH,
      [first, { ...first }],
      DERIVED_ALIAS_TAINT_MODES.STRICT,
      { scanner },
    ),
    (error) => (
      error?.code === "state-writer-batch-binding-id-collision"
      && error?.signatures?.[0] === error?.signatures?.[1]
    ),
  );
  assert.equal(scannerCalls, 0);
});

test("full-root leaf escapes replace redundant container diagnostics without hiding computed projections", () => {
  const sourceFor = (
    extraProperties,
    { includeFullRoot = true } = {},
  ) => [
    'import { state as runtimeState } from "../core/state.js";',
    "function consume(value) { return value; }",
    "consume({",
    ...(includeFullRoot ? ["  runtimeState,"] : []),
    ...extraProperties,
    "});",
  ].join("\n");
  const inspect = (source) => {
    const [inventory] = scanStateWriterBindingInventoriesBatch(
      source,
      FILE_PATH,
      [MODULE_BINDING],
      DERIVED_ALIAS_TAINT_MODES.STRICT,
    );
    const aggregate = inventory.findings.find(
      (finding) =>
        finding.reason === "state-alias-escape"
        && finding.evidenceKind === "unknown-call-argument"
        && finding.end - finding.start > "runtimeState".length,
    );
    const fullRootFingerprint = createHash("sha256")
      .update("runtimeState")
      .digest("hex");
    return {
      aggregate,
      fullRootEscapes: inventory.findings.filter(
        ({ reason, sourceFingerprint }) =>
          reason === "state-alias-escape"
          && sourceFingerprint === fullRootFingerprint,
      ).length,
    };
  };

  const first = inspect(
    sourceFor(['  label: "first",']),
  );
  const unrelatedFieldChanged = inspect(
    sourceFor([
      '  label: "second",',
      "  retries: 3,",
    ]),
  );
  const extraStateLeaf = inspect(
    sourceFor([
      '  label: "second",',
      "  mirror: runtimeState,",
    ]),
  );
  const computedProjection = inspect(
    sourceFor(
      ["  phase: runtimeState.bootPhase,"],
      { includeFullRoot: false },
    ),
  );

  assert.equal(first.aggregate, undefined);
  assert.equal(unrelatedFieldChanged.aggregate, undefined);
  assert.equal(extraStateLeaf.aggregate, undefined);
  assert.equal(first.fullRootEscapes, 1);
  assert.equal(unrelatedFieldChanged.fullRootEscapes, 1);
  assert.equal(extraStateLeaf.fullRootEscapes, 2);
  assert.ok(computedProjection.aggregate);
});

test("production candidate discovery scans all parameter candidates once per file", async () => {
  const calls = [];
  const scanner = (source, options) => {
    calls.push({ source, options });
    return scanStateMutationInventory(source, options);
  };

  const bindings = await discoverStateWriterBindingsForSource(
    FILE_PATH,
    SOURCE,
    "production",
    {
      scanAllParameters: true,
      derivedAliasTaintMode: DERIVED_ALIAS_TAINT_MODES.STRICT,
      scanner,
    },
  );

  assert.equal(calls.length, 1);
  assert.ok(
    calls[0].options.bindings.length >= 2,
    "module and parameter candidates must share one scanner invocation",
  );
  assert.ok(bindings.some(({ id }) => id === MODULE_BINDING.id));
  assert.ok(
    bindings.some(
      ({ functionName, parameterName }) =>
        functionName === "applyBootFields"
        && parameterName === "target",
    ),
  );
});

test("historical discovery cannot borrow current detached-capture authority", async () => {
  const relativePath = "js/core/map_renderer.js";
  const source = [
    'import { state as runtimeState } from "./state.js";',
    'import { captureRenderPerfMetricsState as capture } from "./state/actions/renderer_diagnostics_actions.js";',
    "const snapshot = capture(runtimeState);",
    "globalThis.snapshot = snapshot;",
    "",
  ].join("\n");

  const current = await discoverStateWriterBindingsForSource(
    relativePath,
    source,
    "production",
    {
      scanAllParameters: true,
      includeInventories: true,
    },
  );
  assert.deepEqual(
    current.bindingInventories.flatMap(({ findings }) => findings),
    [],
  );

  const historical = await discoverStateWriterBindingsForSource(
    relativePath,
    source,
    "production",
    {
      scanAllParameters: true,
      enforceCurrentContracts: false,
      includeInventories: true,
    },
  );
  assert.ok(
    historical.bindingInventories
      .flatMap(({ findings }) => findings)
      .some(({ reason }) => reason === "state-alias-escape"),
    "accepted historical source must fail closed when its own contract view is unavailable",
  );
});

test("validated detached-capture implementations stay outside writer diagnostics", async () => {
  const relativePath =
    "js/core/state/actions/renderer_diagnostics_actions.js";
  const source = await readFile(
    new URL(`../${relativePath}`, import.meta.url),
    "utf8",
  );
  const discovery = await discoverStateWriterBindingsForSource(
    relativePath,
    source,
    "production",
    {
      scanAllParameters: true,
      includeInventories: true,
    },
  );

  assert.equal(
    discovery.bindings.some(
      ({ functionName }) => functionName === "captureRenderPerfMetricsState",
    ),
    false,
  );
  assert.equal(
    discovery.bindingInventories.some(
      ({ binding, findings }) =>
        binding.functionName === "captureRenderPerfMetricsState"
        && findings.some(({ reason }) => reason === "state-alias-escape"),
    ),
    false,
  );
});

test("immutable exact refresh plans require no scanner exclusion", async () => {
  const relativePath =
    "js/core/map_renderer/exact_after_settle_scheduler.js";
  const source = [
    'import { state as runtimeState } from "../state.js";',
    "",
    "function applyExactAfterSettleRefreshPlan(plan) {",
    "  plan.exactTargetPasses = [];",
    '  runtime' + 'State.renderPhase = "idle";',
    "}",
    "",
    "function applyScheduledExactAfterSettleRefreshPlan(generation, plan) {",
    "  plan.controllerGeneration = generation;",
    "  applyExactAfterSettleRefreshPlan(plan);",
    "}",
    "",
    "function unrelatedStateMutation(plan) {",
    '  plan.bootPhase = "ready";',
    "}",
    "",
  ].join("\n");

  const bindings = await discoverStateWriterBindingsForSource(
    relativePath,
    source,
    "production",
    { scanAllParameters: true },
  );

  assert.ok(bindings.some(({ name }) => name === "runtimeState"));
  assert.equal(
    bindings.some(
      ({ functionName, parameterName }) =>
        functionName === "applyExactAfterSettleRefreshPlan"
        && parameterName === "plan",
    ),
    false,
  );
  assert.equal(
    bindings.some(
      ({ functionName, parameterName }) =>
        functionName === "applyScheduledExactAfterSettleRefreshPlan"
        && parameterName === "plan",
    ),
    false,
  );
  assert.ok(
    bindings.some(
      ({ functionName, parameterName }) =>
        functionName === "unrelatedStateMutation"
        && parameterName === "plan",
    ),
    "unrelated plan parameters must remain visible too",
  );
  const builderSource = await readFile(
    new URL("../tools/build_state_writer_policy.mjs", import.meta.url),
    "utf8",
  );
  const schedulerSource = await readFile(
    new URL("../js/core/map_renderer/exact_after_settle_scheduler.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    builderSource,
    /exact_after_settle_scheduler\.js#(?:applyExactAfterSettleRefreshPlan|applyScheduledExactAfterSettleRefreshPlan)#plan/,
  );
  assert.doesNotMatch(
    schedulerSource,
    /\bplan\.[A-Za-z_$][\w$]*\s*=(?!=)/,
    "exact refresh plan parameters must remain immutable",
  );
});

test("policy snapshot reuses the candidate discovery inventories", () => {
  const source = scanStateWriterPolicySnapshot.toString();

  assert.match(source, /candidatesBySignature/);
  assert.doesNotMatch(
    source,
    /scanStateWriterBindingInventoriesBatch\s*\(/,
  );
  assert.doesNotMatch(source, /fs\.readFile\s*\(/);
});
