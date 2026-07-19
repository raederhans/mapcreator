import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverStateWriterBindingsForSource,
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

test("changed arbitrary parameters retain dynamic-only state targets", async () => {
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

test("changed arbitrary parameters retain diagnostic-only state targets", async () => {
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

  assert.deepEqual(
    bindings.map(({ functionName, parameterName, parameterIndex }) => ({
      functionName,
      parameterName,
      parameterIndex,
    })),
    [{
      functionName: "dispatchValue",
      parameterName: "model",
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

  assert.equal(bindings.length, 2);
  assert.ok(
    bindings.every(({ functionName }) =>
      functionName.startsWith("<anonymous>@")
    ),
  );
  assert.equal(new Set(bindings.map(({ functionName }) => functionName)).size, 2);
  assert.deepEqual(
    bindings.map(({ parameterName }) => parameterName).sort(),
    ["diagnosticModel", "model"],
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
