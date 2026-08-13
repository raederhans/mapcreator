import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  discoverStateWriterBindingsForSource,
  scanStateWriterBindingInventoriesBatch,
  validateStateActionNonTargetParameterMutations,
} from "../tools/build_state_writer_policy.mjs";
import {
  DERIVED_ALIAS_TAINT_MODES,
  discoverFunctionParameterBindings,
  normalizeDerivedAliasTaintMode,
  scanStateMutationInventory,
  scanStateMutations,
} from "../tools/state_writer_inventory.mjs";

function summarizeBindings(bindings = []) {
  return bindings.map(
    ({
      functionName,
      parameterName,
      parameterIndex,
      parameterPath,
      locator,
    }) => ({
      functionName,
      parameterName,
      parameterIndex,
      parameterPath,
      locator,
    }),
  );
}

function scanWithFunctionTrace(source, {
  binding,
  analysisTraversalMode = "auto",
  filePath = "js/scanner_scope_fixture.js",
} = {}) {
  const processedFunctions = [];
  const inventory = scanStateMutationInventory(source, {
    filePath,
    bindings: [binding],
    analysisTraversalMode,
    analysisInstrumentation: {
      onProcessFunction({ functionName }) {
        processedFunctions.push(functionName);
      },
    },
  });
  return {
    inventory,
    processedFunctions,
  };
}

test("unique function-parameter analysis matches full-program semantics while skipping unrelated function bodies", () => {
  const unrelatedFunctions = Array.from(
    { length: 80 },
    (_, index) => [
      `export function unrelated${index}(otherState) {`,
      `  otherState.unrelated${index} = true;`,
      "}",
    ].join("\n"),
  ).join("\n\n");
  const source = [
    'import { setBootStateFields } from "../core/state/actions/boot_actions.js";',
    "",
    "let escapedModuleState = null;",
    "function commitThroughLocalHelper(value) {",
    "  value.helperWrite = true;",
    "  setBootStateFields(value, { bootPhase: 'helper' });",
    "}",
    "const identityThroughConstHelper = (value) => value;",
    "",
    "export function updateScopedState({ target = fallbackState } = {}, ...rest) {",
    "  target.directWrite = rest.length;",
    "  const nestedClosure = () => {",
    "    target.nestedWrite = true;",
    "  };",
    "  nestedClosure();",
    "  commitThroughLocalHelper(target);",
    "  const helperReturnAlias = identityThroughConstHelper(target);",
    "  helperReturnAlias.helperReturnWrite = true;",
    "  const containerAlias = { value: target };",
    "  containerAlias.value.containerWrite = true;",
    "  escapedModuleState = target;",
    "  let reassignedAlias = target;",
    "  reassignedAlias = {};",
    "  reassignedAlias.ignoredAfterIdentityTransition = true;",
    "",
    "  function returnedObjectMethod() {",
    "    target.objectMethodWrite = true;",
    "    setBootStateFields(target, { bootReady: true });",
    "  }",
    "  const returnedArrayMethod = () => {",
    "    target.arrayMethodWrite = true;",
    "    setBootStateFields(target, { bootPreviewVisible: true });",
    "  };",
    "  function uncalledSibling() {",
    "    setBootStateFields(target, { bootPhase: 'uncalled' });",
    "  }",
    "",
    "  return Object.freeze({",
    "    returnedObjectMethod,",
    "    methods: [returnedArrayMethod],",
    "  });",
    "}",
    "",
    unrelatedFunctions,
    "",
  ].join("\n");
  const binding = {
    id: "parameter:updateScopedState:target",
    kind: "function-parameter",
    name: "target",
    functionName: "updateScopedState",
    parameterName: "target",
    parameterIndex: 0,
    parameterPath: "$/property:target",
  };

  const scoped = scanWithFunctionTrace(source, { binding });
  const fullProgram = scanWithFunctionTrace(source, {
    binding,
    analysisTraversalMode: "full-program",
  });

  assert.deepEqual(scoped.inventory, fullProgram.inventory);
  assert.ok(
    scoped.processedFunctions.includes("updateScopedState"),
    JSON.stringify(scoped.processedFunctions),
  );
  assert.ok(
    scoped.processedFunctions.includes("commitThroughLocalHelper"),
    JSON.stringify(scoped.processedFunctions),
  );
  assert.ok(
    scoped.processedFunctions.includes("returnedObjectMethod"),
    JSON.stringify(scoped.processedFunctions),
  );
  assert.ok(
    scoped.processedFunctions.includes("returnedArrayMethod"),
    JSON.stringify(scoped.processedFunctions),
  );
  assert.equal(
    scoped.processedFunctions.some((name) => name.startsWith("unrelated")),
    false,
    JSON.stringify(scoped.processedFunctions),
  );
  assert.equal(
    fullProgram.processedFunctions.filter(
      (name) => name.startsWith("unrelated"),
    ).length,
    80,
  );
  assert.equal(
    scoped.inventory.actionDelegations.some(
      ({ enclosingFunctionIdentity }) =>
        enclosingFunctionIdentity.includes("uncalledSibling"),
    ),
    false,
  );
});

test("module bindings retain full-program traversal under automatic scoping", () => {
  const source = [
    'import { state as runtimeState } from "../core/state.js";',
    "export function firstModuleWriter() {",
    "  let alias = runtimeState;",
    "  alias.bootReady = true;",
    "  alias = {};",
    "  alias.bootPhase = 'ignored-after-identity-transition';",
    "}",
    "export function secondModuleWriter() {",
    "  publishUnknown(runtimeState);",
    "  runtimeState.bootPreviewVisible = true;",
    "}",
    "",
  ].join("\n");
  const binding = {
    id: "module:runtimeState",
    kind: "module",
    name: "runtimeState",
  };

  const automatic = scanWithFunctionTrace(source, { binding });
  const fullProgram = scanWithFunctionTrace(source, {
    binding,
    analysisTraversalMode: "full-program",
  });

  assert.deepEqual(automatic.inventory, fullProgram.inventory);
  assert.deepEqual(
    automatic.processedFunctions,
    fullProgram.processedFunctions,
  );
  assert.deepEqual(
    automatic.processedFunctions.sort(),
    ["firstModuleWriter", "secondModuleWriter"],
  );
  assert.equal(
    automatic.inventory.findings.some(
      ({ operation, key }) =>
        operation === "assign" && key === "bootReady",
    ),
    true,
  );
  assert.equal(
    automatic.inventory.findings.some(
      ({ reason, evidenceKind }) =>
        reason === "state-alias-escape"
        && evidenceKind === "unknown-call-argument",
    ),
    true,
  );
});

test("ambiguous function-parameter owners remain fail-closed in scoped and full modes", () => {
  const source = [
    "function update(target) {",
    "  target.bootReady = true;",
    "}",
    "function update(target) {",
    "  target.bootPreviewVisible = true;",
    "}",
    "",
  ].join("\n");
  const binding = {
    id: "parameter:update:target",
    kind: "function-parameter",
    name: "target",
    functionName: "update",
    parameterName: "target",
    parameterIndex: 0,
    parameterPath: "$",
  };

  const scoped = scanWithFunctionTrace(source, { binding });
  const fullProgram = scanWithFunctionTrace(source, {
    binding,
    analysisTraversalMode: "full-program",
  });

  assert.deepEqual(scoped.inventory, fullProgram.inventory);
  assert.deepEqual(scoped.processedFunctions, []);
  assert.equal(scoped.inventory.findings.length, 1);
  assert.equal(
    scoped.inventory.findings[0].reason,
    "binding-locator-ambiguous",
  );
});

test("formal parameter indexes and structural paths remain stable across destructured identifiers", () => {
  const discovery = discoverFunctionParameterBindings(
    `
      export function updateBoot(
        { ordinary, model, nested: { targetState } },
        [first, runtimeState],
        appState,
      ) {
        model.bootPhase = "ready";
      }
    `,
    { parameterNames: null },
  );

  assert.deepEqual(
    discovery.bindings.map(({ parameterName, parameterIndex, parameterPath }) => ({
      parameterName,
      parameterIndex,
      parameterPath,
    })),
    [
      {
        parameterName: "model",
        parameterIndex: 0,
        parameterPath: "$/property:model",
      },
      {
        parameterName: "ordinary",
        parameterIndex: 0,
        parameterPath: "$/property:ordinary",
      },
      {
        parameterName: "targetState",
        parameterIndex: 0,
        parameterPath: "$/property:nested/property:targetState",
      },
      {
        parameterName: "first",
        parameterIndex: 1,
        parameterPath: "$/index:0",
      },
      {
        parameterName: "runtimeState",
        parameterIndex: 1,
        parameterPath: "$/index:1",
      },
      {
        parameterName: "appState",
        parameterIndex: 2,
        parameterPath: "$",
      },
    ],
  );
});

test("previous structural parameter path survives a destructured target rename without claiming siblings", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function updateBoot({ ordinary, state: model }) {
        model.bootPhase = "ready";
        ordinary.ordinaryPayloadField = true;
      }
    `,
    "production",
    {
      previousWriter: {
        bindings: [{
          kind: "function-parameter",
          functionName: "updateBoot",
          parameterName: "runtimeState",
          parameterIndex: 0,
          parameterPath: "$/property:state",
        }],
      },
    },
  );

  assert.deepEqual(
    summarizeBindings(bindings).map(
      ({ functionName, parameterName, parameterIndex, parameterPath }) => ({
        functionName,
        parameterName,
        parameterIndex,
        parameterPath,
      }),
    ),
    [{
      functionName: "updateBoot",
      parameterName: "model",
      parameterIndex: 0,
      parameterPath: "$/property:state",
    }],
  );
});

test("direct formal parameter identity survives a local rename through the root path", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function updateBoot(model) {
        model.bootPhase = "ready";
      }
    `,
    "production",
    {
      previousWriter: {
        bindings: [{
          kind: "function-parameter",
          functionName: "updateBoot",
          parameterName: "runtimeState",
          parameterIndex: 0,
          parameterPath: "$",
        }],
      },
    },
  );

  assert.deepEqual(
    bindings.map(
      ({ functionName, parameterName, parameterIndex, parameterPath }) => ({
        functionName,
        parameterName,
        parameterIndex,
        parameterPath,
      }),
    ),
    [{
      functionName: "updateBoot",
      parameterName: "model",
      parameterIndex: 0,
      parameterPath: "$",
    }],
  );
});

test("changed arbitrary parameters do not gain state authority from dynamic-only mutations", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function updateValue(model, key) {
        model[key] = "ready";
      }
    `,
    "production",
    { scanAllParameters: true },
  );

  assert.deepEqual(bindings, []);
});

test("changed arbitrary parameters do not gain state authority from diagnostic-only escapes", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function dispatchValue(model) {
        unknownSink(model);
      }
    `,
    "production",
    { scanAllParameters: true },
  );

  assert.deepEqual(bindings, []);
});

test("changed arbitrary parameters gain state authority from canonical state-key mutations", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function updateBoot(model) {
        model.bootPhase = "ready";
      }
    `,
    "production",
    { scanAllParameters: true },
  );

  assert.deepEqual(
    bindings.map(({ functionName, parameterName, parameterIndex }) => ({
      functionName,
      parameterName,
      parameterIndex,
    })),
    [{
      functionName: "updateBoot",
      parameterName: "model",
      parameterIndex: 0,
    }],
  );
});

test("previous state-target identity retains dynamic-only mutations after a parameter rename", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function updateValue(model, key) {
        model[key] = "ready";
      }
    `,
    "production",
    {
      scanAllParameters: true,
      previousWriter: {
        bindings: [{
          kind: "function-parameter",
          functionName: "updateValue",
          parameterName: "runtimeState",
          parameterIndex: 0,
          parameterPath: "$",
        }],
      },
    },
  );

  assert.deepEqual(
    bindings.map(({ functionName, parameterName, parameterIndex }) => ({
      functionName,
      parameterName,
      parameterIndex,
    })),
    [{
      functionName: "updateValue",
      parameterName: "model",
      parameterIndex: 0,
    }],
  );
});

test("explicit state-target names retain fail-closed diagnostic-only mutations", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function dispatchValue(target) {
        unknownSink(target);
      }
    `,
    "production",
    { scanAllParameters: true },
  );

  assert.deepEqual(
    bindings.map(({ functionName, parameterName, parameterIndex }) => ({
      functionName,
      parameterName,
      parameterIndex,
    })),
    [{
      functionName: "dispatchValue",
      parameterName: "target",
      parameterIndex: 0,
    }],
  );
});

test("ordinary concrete payload fields stay outside state-target discovery", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function updatePayload(payload) {
        payload.ordinaryPayloadField = true;
      }
    `,
    "production",
    { scanAllParameters: true },
  );

  assert.deepEqual(bindings, []);
});

test("changed destructured siblings do not inherit state authority from a target sibling", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function loadProject(sampleId, {
        targetState,
        helpers = {},
      } = {}) {
        targetState.bootPhase = "ready";
        consume({
          fetchImpl: helpers.fetchImpl,
          ui: helpers.ui,
          hooks: helpers.hooks,
        });
      }
    `,
    "production",
    { scanAllParameters: true },
  );

  assert.deepEqual(
    bindings.map(({ parameterName, parameterIndex, parameterPath }) => ({
      parameterName,
      parameterIndex,
      parameterPath,
    })),
    [{
      parameterName: "targetState",
      parameterIndex: 1,
      parameterPath: "$/property:targetState",
    }],
  );
});

test("changed nested-function payload parameters do not inherit an outer state binding", async () => {
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    `
      export function createController({ state }) {
        function hydrateBundle(bundle) {
          consume(bundle.runtimeTopologyPayload);
          consume(bundle.releasableCatalog);
          consume(bundle.auditPayload);
          state.bootPhase = "ready";
        }
        return { hydrateBundle };
      }
    `,
    "production",
    { scanAllParameters: true },
  );

  assert.deepEqual(
    bindings.map(({ functionName, parameterName, parameterPath }) => ({
      functionName,
      parameterName,
      parameterPath,
    })),
    [{
      functionName: "createController",
      parameterName: "state",
      parameterPath: "$/property:state",
    }],
  );
});

test("anonymous callback identities resolve their own parameter binding", async () => {
  const source = `
    consume((ordinary) => {
      ordinary.ordinaryPayloadField = true;
    });
    consume((model) => {
      model.bootPhase = "ready";
    });
    consume(function (diagnosticModel) {
      unknownSink(diagnosticModel);
    });
  `;
  const bindings = await discoverStateWriterBindingsForSource(
    "js/fixture.js",
    source,
    "production",
    { scanAllParameters: true },
  );

  assert.equal(bindings.length, 1);
  assert.ok(
    bindings.every(({ functionName }) =>
      functionName.startsWith("<anonymous>@")
    ),
  );
  assert.equal(new Set(bindings.map(({ functionName }) => functionName)).size, 1);
  assert.deepEqual(
    bindings.map(({ parameterName }) => parameterName).sort(),
    ["model"],
  );

  for (const binding of bindings) {
    const findings = scanStateMutations(source, {
      filePath: "js/fixture.js",
      bindings: [binding],
    });
    assert.ok(findings.length > 0);
    assert.ok(
      findings.every(({ root }) => root === binding.parameterName),
      JSON.stringify(findings),
    );
  }
});

test("registered imported actions accept a defaulted full-root state target only", () => {
  const source = `
    import { state as runtimeState } from "../core/state.js";
    import {
      setUiShellDebugTerritorySeededState,
    } from "../core/state/actions/boot_actions.js";
    import { consumeState } from "../core/other_helper.js";

    function update(
      state = runtimeState,
      childState = runtimeState.bootMetrics,
    ) {
      setUiShellDebugTerritorySeededState(state, true);
      setUiShellDebugTerritorySeededState(childState, true);
      consumeState(state);
    }
  `;
  const findings = scanStateMutations(source, {
    filePath: "js/bootstrap/ui_shell_debug_seed.js",
    bindings: [{
      id: "module:runtimeState",
      kind: "module",
      name: "runtimeState",
    }],
  });

  assert.deepEqual(
    findings.map(({ line, reason }) => ({ line, reason })),
    [
      { line: 13, reason: "state-alias-escape" },
      { line: 14, reason: "state-alias-escape" },
    ],
  );
});

test("local helper return aliases retain state identity through direct, wrapped, and container results", () => {
  const source = `
    function getState() {
      return state;
    }
    function identity(value) {
      return value;
    }
    function boxState() {
      return { value: state };
    }
    function writeThroughHelpers() {
      const direct = getState();
      direct.bootPhase = "direct";
      const wrapped = identity(state);
      wrapped.bootReady = true;
      const boxed = boxState();
      boxed.value.bootPreviewVisible = true;
    }
    writeThroughHelpers();
  `;
  const findings = scanStateMutations(source, {
    filePath: "tests/local_helper_return_alias_fixture.js",
    bindings: [{
      id: "test-file-root:state",
      kind: "test-file-root",
      name: "state",
    }],
  });

  assert.deepEqual(
    findings
      .filter(({ operation }) => operation === "assign")
      .map(({ key }) => key)
      .sort(),
    [
      "bootPhase",
      "bootReady",
    ],
  );
  assert.equal(
    findings.some(
      ({ operation, reason, line }) =>
        operation === "unsupported"
        && reason === "ambiguous-alias-flow"
        && line === 17,
    ),
    true,
  );
});

test("direct object containers retain state taint for downstream member writes", () => {
  const source = `
    const box = { value: state };
    box.value.bootPhase = "ready";
  `;
  const findings = scanStateMutations(source, {
    filePath: "tests/direct_state_container_fixture.js",
    bindings: [{
      id: "test-file-root:state",
      kind: "test-file-root",
      name: "state",
    }],
  });

  assert.equal(
    findings.some(
      ({ operation, reason, line }) =>
        operation === "unsupported"
        && reason === "ambiguous-alias-flow"
        && line === 3,
    ),
    true,
  );
});

test("computed state projections remain fail-closed in legacy-baseline mode", () => {
  const source = `
    const keys = ["bootPhase", "bootReady"];
    const patch = Object.fromEntries(
      keys.map((key) => [key, runtimeState[key]]),
    );
    consume(patch);
  `;
  const findings = scanStateMutations(source, {
    filePath: "tests/computed_state_projection_fixture.js",
    bindings: [{
      id: "test-file-root:runtimeState",
      kind: "test-file-root",
      name: "runtimeState",
    }],
    derivedAliasTaintMode:
      DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  });

  assert.equal(
    findings.some(
      ({ operation, key, reason }) =>
        operation === "unsupported"
        && key === "*"
        && reason === "state-alias-escape",
    ),
    true,
  );
});

test("derived alias taint defaults to strict and legacy-baseline preserves the frozen scanner result", () => {
  const source = `
    function identity(value) {
      return value;
    }
    function write(target) {
      const alias = identity(target);
      alias.bootPhase = "ready";
    }
    write(state);
  `;
  const options = {
    filePath: "js/strict_derived_alias_fixture.js",
    bindings: [{
      id: "test-file-root:state",
      kind: "test-file-root",
      name: "state",
    }],
  };

  const defaultFindings = scanStateMutations(source, options);
  const strictFindings = scanStateMutations(source, {
    ...options,
    derivedAliasTaintMode: DERIVED_ALIAS_TAINT_MODES.STRICT,
  });
  const legacyFindings = scanStateMutations(source, {
    ...options,
    derivedAliasTaintMode:
      DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  });

  assert.deepEqual(defaultFindings, strictFindings);
  assert.equal(
    strictFindings.some(
      ({ operation, key }) =>
        operation === "assign" && key === "bootPhase",
    ),
    true,
  );
  assert.equal(
    legacyFindings.some(
      ({ operation, key }) =>
        operation === "assign" && key === "bootPhase",
    ),
    false,
  );
  assert.equal(
    legacyFindings.some(
      ({ operation, reason }) =>
        operation === "unsupported"
        && reason === "state-alias-escape",
    ),
    true,
  );
});

test("immutable local callbacks remain code values across derived alias taint modes", () => {
  const source = `
    export function createController() {
      const sync = () => {
        if (runtimeState.paletteLibraryOpen) {
          consume(runtimeState.paletteLibrarySearch);
        }
      };
      const schedule = () => {
        globalThis.requestAnimationFrame(sync);
      };
      return { schedule };
    }
  `;
  const options = {
    filePath: "js/immutable_callback_fixture.js",
    bindings: [{
      id: "test-file-root:runtimeState",
      kind: "test-file-root",
      name: "runtimeState",
    }],
  };

  for (const derivedAliasTaintMode of [
    DERIVED_ALIAS_TAINT_MODES.STRICT,
    DERIVED_ALIAS_TAINT_MODES.LEGACY_BASELINE,
  ]) {
    const findings = scanStateMutations(source, {
      ...options,
      derivedAliasTaintMode,
    });
    assert.equal(
      findings.some(
        ({ reason, evidenceKind, line }) =>
          reason === "state-alias-escape"
          && evidenceKind === "unknown-call-argument"
          && line === 9,
      ),
      false,
      JSON.stringify(findings, null, 2),
    );
  }
});

test("derived alias taint mode rejects unknown values", () => {
  assert.equal(
    normalizeDerivedAliasTaintMode(),
    DERIVED_ALIAS_TAINT_MODES.STRICT,
  );
  assert.throws(
    () => normalizeDerivedAliasTaintMode("permissive"),
    (error) =>
      error?.code === "derived-alias-taint-mode-invalid",
  );
  assert.throws(
    () =>
      scanStateMutations("state.bootPhase = 'ready';", {
        filePath: "js/unknown_taint_mode_fixture.js",
        bindings: [{
          id: "test-file-root:state",
          kind: "test-file-root",
          name: "state",
        }],
        derivedAliasTaintMode: "unknown",
      }),
    (error) =>
      error?.code === "derived-alias-taint-mode-invalid",
  );
});

test("registered action exports reject concrete mutation through non-target parameters", async () => {
  const source = `
    export function setBootStateFields(target, options, metadata, key) {
      options.bootPhase = "ready";
      metadata[key] = "ready";
      Object.assign(metadata, { bootPhase: "ready" });
      target.bootPhase = "ready";
    }
  `;

  const violations = await validateStateActionNonTargetParameterMutations(
    "js/core/state/actions/boot_actions.js",
    source,
    [{
      modulePath: "js/core/state/actions/boot_actions.js",
      exportName: "setBootStateFields",
      targetArgumentIndex: 0,
    }],
  );

  assert.deepEqual(
    violations.map(({ code, exportName, parameterName, operation, key }) => ({
      code,
      exportName,
      parameterName,
      operation,
      key,
    })),
    [
      {
        code: "state-action-non-target-parameter-mutation",
        exportName: "setBootStateFields",
        parameterName: "options",
        operation: "assign",
        key: "bootPhase",
      },
      {
        code: "state-action-non-target-parameter-mutation",
        exportName: "setBootStateFields",
        parameterName: "metadata",
        operation: "assign",
        key: "*",
      },
      {
        code: "state-action-non-target-parameter-mutation",
        exportName: "setBootStateFields",
        parameterName: "metadata",
        operation: "object-assign",
        key: "*",
      },
    ],
  );
});

function legacyBindingIdPart(value) {
  return String(value || "")
    .replaceAll(/[^A-Za-z0-9_$.-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function createLegacyParameterBinding(candidate) {
  const parameterPath = String(candidate.parameterPath || "$");
  const parameterPathHash = createHash("sha256")
    .update(parameterPath)
    .digest("hex")
    .slice(0, 12);
  return {
    id: [
      "parameter",
      legacyBindingIdPart(candidate.functionName),
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

function validateNonTargetMutationsWithD873LegacyOracle(
  relativePath,
  source,
  contractEntries,
  {
    onRawInventory = () => {},
    onScan = () => {},
  } = {},
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
      const binding = createLegacyParameterBinding(candidate);
      const [inventory] = scanStateWriterBindingInventoriesBatch(
        source,
        relativePath,
        [binding],
        DERIVED_ALIAS_TAINT_MODES.STRICT,
        {
          recognizeCurrentContracts: true,
          scanner(scannerSource, options) {
            onScan(options.bindings[0]);
            const rawInventory = scanStateMutationInventory(
              scannerSource,
              options,
            );
            onRawInventory(rawInventory, options.bindings[0]);
            return rawInventory;
          },
        },
      );
      for (const finding of inventory.findings) {
        const conservativeMutationEvidence = Boolean(
          !finding?.unsupported
          || finding.reason !== "state-alias-escape"
          || finding.evidenceKind === "unknown-call-argument",
        );
        if (!conservativeMutationEvidence) {
          continue;
        }
        violations.push({
          code: "state-action-non-target-parameter-mutation",
          modulePath: String(relativePath || "").replaceAll("\\", "/"),
          exportName: entry.exportName,
          parameterName: candidate.parameterName,
          parameterIndex: candidate.parameterIndex,
          parameterPath: candidate.parameterPath,
          operation: finding.operation,
          key: finding.key,
          unsupported: Boolean(finding.unsupported),
          reason: String(finding.reason || ""),
          evidenceKind: String(finding.evidenceKind || ""),
          alias: String(finding.alias || ""),
          aliasChain: (finding.aliasChain || []).map(String),
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

test("non-target parameter batch matches the legacy single-binding oracle with one scanner setup", async () => {
  const modulePath = "js/core/state/actions/fixture_actions.js";
  const source = [
    "export function zeta({ branch }, other) {",
    '  branch.status = "nested";',
    '  other.status = "ready";',
    "  consumeUnknown(other);",
    "  consumeUnknown({ other, mirror: other });",
    "  return other;",
    "}",
    "export function alpha(target, value) {",
    '  value.count = 1;',
    '  target.count = 1;',
    "}",
  ].join("\n");
  const contract = [
    { modulePath, exportName: "zeta", targetArgumentIndex: 0 },
    { modulePath, exportName: "zeta", targetArgumentIndex: 0 },
    { modulePath, exportName: "zeta", targetArgumentIndex: 1 },
    { modulePath, exportName: "alpha", targetArgumentIndex: 0 },
  ];
  let legacyScans = 0;
  let rawRedundantContainerEscapes = 0;
  const expected = validateNonTargetMutationsWithD873LegacyOracle(
    modulePath,
    source,
    contract,
    {
      onScan() {
        legacyScans += 1;
      },
      onRawInventory(inventory) {
        rawRedundantContainerEscapes += inventory.findings.filter(
          ({ evidenceKind, line, reason }) =>
            reason === "state-alias-escape"
            && evidenceKind === "unknown-call-argument"
            && line === 5,
        ).length;
      },
    },
  );
  let batchScans = 0;
  let batchBindingIds = [];
  const actual = await validateStateActionNonTargetParameterMutations(
    modulePath,
    source,
    contract,
    {
      scanner(scannerSource, options) {
        batchScans += 1;
        batchBindingIds = options.bindings.map(({ id }) => id);
        assert.equal(
          options.derivedAliasTaintMode,
          DERIVED_ALIAS_TAINT_MODES.STRICT,
        );
        assert.equal(options.recognizeCurrentContracts, true);
        return scanStateMutationInventory(scannerSource, options);
      },
    },
  );

  assert.deepEqual(actual, expected);
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
  assert.equal(legacyScans, 6);
  assert.equal(rawRedundantContainerEscapes, 2);
  assert.equal(batchScans, legacyScans > 0 ? 1 : 0);
  assert.equal(batchBindingIds.length, 3);
  assert.deepEqual(
    actual.map(({ exportName }) => exportName),
    [
      "alpha",
      "zeta",
      "zeta",
      "zeta",
      "zeta",
      "zeta",
      "zeta",
      "zeta",
    ],
  );
  assert.equal(
    actual.some(({ parameterName }) => parameterName === "target"),
    false,
  );
  assert.equal(
    actual.filter(
      ({ parameterName, operation }) =>
        parameterName === "branch" && operation === "assign",
    ).length,
    3,
  );
  assert.equal(
    actual.filter(
      ({ parameterName, operation }) =>
        parameterName === "other" && operation === "assign",
    ).length,
    2,
  );
  assert.equal(
    actual.filter(
      ({ reason, evidenceKind }) =>
        reason === "state-alias-escape"
        && evidenceKind === "unknown-call-argument",
    ).length,
    2,
  );
  assert.equal(
    actual.some(({ evidenceKind }) => evidenceKind === "return-value"),
    false,
  );
  assert.equal(
    actual.some(({ line }) => line === 5),
    false,
  );
});

test("non-target parameter batch preserves discovery and scanner failures", async () => {
  const modulePath = "js/core/state/actions/fixture_actions.js";
  const contract = [{
    modulePath,
    exportName: "update",
    targetArgumentIndex: 0,
  }];
  let parseFailureScannerCalls = 0;
  assert.deepEqual(
    await validateStateActionNonTargetParameterMutations(
      modulePath,
      "export function update(target, other) {",
      contract,
      {
        scanner() {
          parseFailureScannerCalls += 1;
          throw new Error("scanner should not run after discovery failure");
        },
      },
    ),
    [],
  );
  assert.equal(parseFailureScannerCalls, 0);

  const source = [
    "export function update(target, other) {",
    '  other.status = "ready";',
    "}",
  ].join("\n");
  await assert.rejects(
    validateStateActionNonTargetParameterMutations(
      modulePath,
      source,
      contract,
      { scanner: () => { throw new Error("fixture scanner failure"); } },
    ),
    /fixture scanner failure/,
  );
  await assert.rejects(
    validateStateActionNonTargetParameterMutations(
      modulePath,
      source,
      contract,
      {
        scanner: () => ({
          findings: [{
            bindingId: "unknown-binding",
            unsupported: false,
            operation: "assign",
            key: "status",
          }],
          actionDelegations: [],
        }),
      },
    ),
    /unknown binding: unknown-binding/,
  );
});

test("registered action exports reject conservative container evidence through non-target parameters", async () => {
  const directContainerSource = `
    export function setBootStateFields(target, other) {
      const box = { value: other };
      box.value.bootPhase = "ready";
      target.bootPhase = "ready";
    }
  `;
  const helperContainerSource = `
    function boxValue(value) {
      return { value };
    }
    export function setBootStateFields(target, other) {
      const box = boxValue(other);
      box.value.bootPhase = "ready";
      target.bootPhase = "ready";
    }
  `;
  const directEscapeSource = `
    export function setBootStateFields(target, other) {
      consumeUnknown(other);
      target.bootPhase = "ready";
    }
  `;
  const aliasedEscapeSource = `
    export function setBootStateFields(target, other) {
      const alias = other;
      consumeUnknown(alias);
      target.bootPhase = "ready";
    }
  `;
  const contract = [{
    modulePath: "js/core/state/actions/boot_actions.js",
    exportName: "setBootStateFields",
    targetArgumentIndex: 0,
  }];

  for (const source of [
    directContainerSource,
    helperContainerSource,
    directEscapeSource,
    aliasedEscapeSource,
  ]) {
    const violations =
      await validateStateActionNonTargetParameterMutations(
        "js/core/state/actions/boot_actions.js",
        source,
        contract,
      );
    assert.ok(
      violations.some(
        ({
          code,
          parameterName,
          operation,
          reason,
          evidenceKind,
        }) =>
          code === "state-action-non-target-parameter-mutation"
          && parameterName === "other"
          && operation === "unsupported"
          && [
            "ambiguous-alias-flow",
            "state-alias-escape",
          ].includes(reason)
          && (
            reason !== "state-alias-escape"
            || evidenceKind === "unknown-call-argument"
          ),
      ),
      JSON.stringify(violations, null, 2),
    );
  }
});

test("registered action exports allow read-only value and options parameters", async () => {
  const source = `
    export function setBootStateFields(target, fields, options = {}) {
      const reason = options.reason || "unknown";
      target.bootPhase = fields.bootPhase;
      return reason;
    }
  `;

  assert.deepEqual(
    await validateStateActionNonTargetParameterMutations(
      "js/core/state/actions/boot_actions.js",
      source,
      [{
        modulePath: "js/core/state/actions/boot_actions.js",
        exportName: "setBootStateFields",
        targetArgumentIndex: 0,
      }],
    ),
    [],
  );
});

test("scenario activation action values remain provably read-only", async () => {
  const modulePath =
    "js/core/state/actions/scenario_activation_actions.js";
  const source = await readFile(
    new URL(`../${modulePath}`, import.meta.url),
    "utf8",
  );

  assert.deepEqual(
    await validateStateActionNonTargetParameterMutations(
      modulePath,
      source,
    ),
    [],
  );
});

test("renderer cache diagnostics traversal keeps the non-target value read-only", async () => {
  const modulePath = "js/core/state/actions/renderer_cache_actions.js";
  const source = await readFile(
    new URL(`../${modulePath}`, import.meta.url),
    "utf8",
  );

  assert.deepEqual(
    await validateStateActionNonTargetParameterMutations(
      modulePath,
      source,
    ),
    [],
  );
});

test("action binding discovery fails closed when a non-target parameter is mutated", async () => {
  await assert.rejects(
    discoverStateWriterBindingsForSource(
      "js/core/state/actions/boot_actions.js",
      `
        export function setBootStateFields(target, otherState, key) {
          otherState[key] = "ready";
          target.bootPhase = "ready";
        }
      `,
      "production",
      { scanAllParameters: true },
    ),
    (error) =>
      error?.code === "state-action-non-target-parameter-mutation"
      && error.violations?.[0]?.parameterName === "otherState"
      && error.violations?.[0]?.operation === "assign"
      && error.violations?.[0]?.key === "*",
  );
});
