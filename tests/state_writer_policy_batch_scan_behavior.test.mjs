import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

test("policy snapshot reuses the candidate discovery inventories", () => {
  const source = scanStateWriterPolicySnapshot.toString();

  assert.match(source, /candidatesBySignature/);
  assert.doesNotMatch(
    source,
    /scanStateWriterBindingInventoriesBatch\s*\(/,
  );
  assert.doesNotMatch(source, /fs\.readFile\s*\(/);
});
