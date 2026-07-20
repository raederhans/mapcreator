import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverStateWriterBindingsForSource,
  validateStateActionNonTargetParameterMutations,
} from "../tools/build_state_writer_policy.mjs";
import {
  discoverFunctionParameterBindings,
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
