import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverFunctionParameterBindings,
  scanStateMutations,
} from "../tools/state_writer_inventory.mjs";

const STATE_ROOT = ["sta", "te"].join("");
const RUNTIME_STATE_ROOT = ["runtime", "State"].join("");
const member = (path) => `${STATE_ROOT}.${path}`;
const assign = (path, value, operator = "=") =>
  `${member(path)} ${operator} ${value};`;
const scanModule = (source, options = {}) =>
  scanStateMutations(source, {
    filePath: "fixtures/state-writer.js",
    bindings: [{ id: "runtime-state", kind: "module", name: STATE_ROOT }],
    ...options,
  });
const scanRuntimeParameter = (body) =>
  scanStateMutations(
    `function owner(${RUNTIME_STATE_ROOT}, condition) {${body}}`,
    {
      filePath: "fixtures/runtime-parameter-writer.js",
      bindings: [
        {
          id: "runtime-parameter",
          kind: "function-parameter",
          functionName: "owner",
          parameterName: RUNTIME_STATE_ROOT,
        },
      ],
    },
  );

test("scanner binds the configured module state identifier and ignores comments and strings", () => {
  const source = `
    // ${assign("commentOnly", "true")}
    const sample = "${assign("stringOnly", "true")}";
    ${assign("bootStatus", '"ready"')}
  `;

  const findings = scanStateMutations(source, {
    bindings: [
      {
        id: "runtime-state",
        kind: "module",
        name: "state",
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ bindingId, operation, key }) => ({ bindingId, operation, key })),
    [
      {
        bindingId: "runtime-state",
        operation: "assign",
        key: "bootStatus",
      },
    ],
  );
});

test("module bindings stop at a shadowing function parameter", () => {
  const source = `
    ${assign("before", "1")}
    function inspect(${STATE_ROOT}) {
      ${assign("shadowed", "2")}
    }
    ${assign("after", "3")}
  `;

  const findings = scanStateMutations(source, {
    bindings: [
      {
        id: "runtime-state",
        kind: "module",
        name: "state",
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ key }) => key),
    ["before", "after"],
  );
});

test("function-parameter bindings apply only to the registered function parameter", () => {
  const source = `
    function setBootStateFields(target, patch) {
      target.bootStatus = patch.bootStatus;
    }
    function normalizePreview(target) {
      target.bootPreviewVisible = Boolean(target.bootPreviewVisible);
    }
  `;

  const findings = scanStateMutations(source, {
    bindings: [
      {
        id: "boot-target",
        kind: "function-parameter",
        functionName: "setBootStateFields",
        parameterName: "target",
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ bindingId, key }) => ({ bindingId, key })),
    [
      {
        bindingId: "boot-target",
        key: "bootStatus",
      },
    ],
  );
});

test("scanner classifies direct, nested, computed, update, and delete mutations", () => {
  const source = `
    ${assign("cache.current", "payload")}
    ${assign("bootStatus", '"ready"', "||=")}
    ${STATE_ROOT}["activeScenarioId"] = scenarioId;
    ${STATE_ROOT}[keyName] = payload;
    ${member("frameCount")}++;
    --${member("retryCount")};
    delete ${member("pendingWork")};
  `;

  const findings = scanStateMutations(source, {
    bindings: [{ id: "runtime-state", kind: "module", name: "state" }],
  });

  assert.deepEqual(
    findings.map(({ operation, key, dynamic }) => ({ operation, key, dynamic })),
    [
      { operation: "assign", key: "cache", dynamic: false },
      { operation: "compound-assign", key: "bootStatus", dynamic: false },
      { operation: "assign", key: "activeScenarioId", dynamic: false },
      { operation: "assign", key: "*", dynamic: true },
      { operation: "update", key: "frameCount", dynamic: false },
      { operation: "update", key: "retryCount", dynamic: false },
      { operation: "delete", key: "pendingWork", dynamic: false },
    ],
  );
});

test("scanner classifies Object and Reflect mutation APIs", () => {
  const source = `
    Object.assign(${STATE_ROOT}, patch);
    Object.assign(${member("renderCache")}, patch);
    Object.defineProperty(${STATE_ROOT}, "bootStatus", descriptor);
    Object.defineProperties(${STATE_ROOT}, descriptors);
    Reflect.set(${STATE_ROOT}, "activeScenarioId", scenarioId);
    Reflect.deleteProperty(${STATE_ROOT}, "pendingWork");
  `;

  const findings = scanStateMutations(source, {
    bindings: [{ id: "runtime-state", kind: "module", name: "state" }],
  });

  assert.deepEqual(
    findings.map(({ operation, key, dynamic }) => ({ operation, key, dynamic })),
    [
      { operation: "object-assign", key: "*", dynamic: true },
      { operation: "object-assign", key: "renderCache", dynamic: true },
      { operation: "define-property", key: "bootStatus", dynamic: false },
      { operation: "define-properties", key: "*", dynamic: true },
      { operation: "reflect-set", key: "activeScenarioId", dynamic: false },
      { operation: "reflect-delete", key: "pendingWork", dynamic: false },
    ],
  );
});

test("scanner detects destructuring targets and collection mutators", () => {
  const source = `
    ({ ready: ${member("bootReady")} } = payload);
    [${member("firstItem")}] = values;
    ${member("pendingIds.add")}(id);
    ${member("pendingIds.delete")}(id);
    ${member("queue.push")}(item);
    ${member("queue.splice")}(0, 1);
    ${member("cacheById.set")}(id, payload);
    ${member("cacheById.clear")}();
  `;

  const findings = scanStateMutations(source, {
    bindings: [{ id: "runtime-state", kind: "module", name: "state" }],
  });

  assert.deepEqual(
    findings.map(({ operation, key }) => ({ operation, key })),
    [
      { operation: "destructure-assign", key: "bootReady" },
      { operation: "destructure-assign", key: "firstItem" },
      { operation: "collection-mutate", key: "pendingIds" },
      { operation: "collection-mutate", key: "pendingIds" },
      { operation: "collection-mutate", key: "queue" },
      { operation: "collection-mutate", key: "queue" },
      { operation: "collection-mutate", key: "cacheById" },
      { operation: "collection-mutate", key: "cacheById" },
    ],
  );
});

test("scanner detects collection mutators reached through optional chains", () => {
  const findings = scanModule(`
    ${member("queue")}?.push(item);
    ${member("cacheById")}?.set(id, payload);
  `);

  assert.deepEqual(
    findings.map(({ operation, key }) => ({ operation, key })),
    [
      { operation: "collection-mutate", key: "queue" },
      { operation: "collection-mutate", key: "cacheById" },
    ],
  );
});

test("scanner evaluates template interpolations while ignoring template text", () => {
  const source = `
    const ignored = \`${assign("rawTemplate", "true")}\`;
    const evaluated = \`status:\${${member("bootStatus")} = "ready"}\`;
  `;

  const findings = scanStateMutations(source, {
    bindings: [{ id: "runtime-state", kind: "module", name: "state" }],
  });

  assert.deepEqual(
    findings.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "bootStatus" }],
  );
});

test("module bindings stop at local declarations that shadow the imported state", () => {
  const source = `
    function createPreview() {
      const ${STATE_ROOT} = { localOnly: true };
      ${assign("localOnly", "false")}
    }
    ${assign("globalStatus", '"ready"')}
  `;

  const findings = scanStateMutations(source, {
    bindings: [{ id: "runtime-state", kind: "module", name: "state" }],
  });

  assert.deepEqual(
    findings.map(({ key }) => key),
    ["globalStatus"],
  );
});

test("function-parameter bindings support named arrow functions without leaking to siblings", () => {
  const source = `
    const setBootStateFields = (target, patch) => {
      target.bootStatus = patch.bootStatus;
    };
    const normalizePreview = (target) => {
      target.bootPreviewVisible = Boolean(target.bootPreviewVisible);
    };
  `;

  const findings = scanStateMutations(source, {
    bindings: [
      {
        id: "boot-target",
        kind: "function-parameter",
        functionName: "setBootStateFields",
        parameterName: "target",
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ bindingId, key }) => ({ bindingId, key })),
    [{ bindingId: "boot-target", key: "bootStatus" }],
  );
});

test("scanner ignores regular-expression text that resembles a state mutation", () => {
  const fakeWritePattern = assign("fakeWrite", "true").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = `
    const stateWritePattern = /${fakeWritePattern}/g;
    ${assign("realWrite", "true")}
  `;

  const findings = scanStateMutations(source, {
    bindings: [{ id: "runtime-state", kind: "module", name: "state" }],
  });

  assert.deepEqual(
    findings.map(({ key }) => key),
    ["realWrite"],
  );
});

test("block-scoped declarations shadow module bindings only inside their block", () => {
  const source = `
    ${assign("beforeBlock", "1")}
    {
      const ${STATE_ROOT} = { localOnly: true };
      ${assign("localOnly", "false")}
    }
    ${assign("afterBlock", "2")}
  `;

  assert.deepEqual(
    scanModule(source).map(({ key }) => key),
    ["beforeBlock", "afterBlock"],
  );
});

test("method, catch, and destructured parameters shadow module bindings", () => {
  const source = `
    const owner = {
      apply(${STATE_ROOT}) {
        ${assign("methodLocal", "true")}
      }
    };
    try {
      throw new Error("fixture");
    } catch (${STATE_ROOT}) {
      ${assign("catchLocal", "true")}
    }
    const inspect = ({ ${STATE_ROOT} }) => {
      ${assign("destructuredLocal", "true")}
    };
    ${assign("moduleVisible", "true")}
  `;

  assert.deepEqual(
    scanModule(source).map(({ key }) => key),
    ["moduleVisible"],
  );
});

test("registered function targets stop at a nested same-name parameter", () => {
  const source = `
    function setBootStateFields(target, patch) {
      target.beforeNested = patch.beforeNested;
      function nested(target) {
        target.shadowed = true;
      }
      target.afterNested = patch.afterNested;
    }
  `;

  const findings = scanStateMutations(source, {
    bindings: [
      {
        id: "boot-target",
        kind: "function-parameter",
        functionName: "setBootStateFields",
        parameterName: "target",
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ key }) => key),
    ["beforeNested", "afterNested"],
  );
});

test("aliases inherit binding identity until reassigned", () => {
  const source = `
    const runtimeAlias = ${STATE_ROOT};
    runtimeAlias.bootStatus = "ready";
    runtimeAlias = {};
    runtimeAlias.untrackedAfterKill = true;
  `;

  const findings = scanModule(source);

  assert.deepEqual(
    findings.map(({ bindingId, operation, key, alias }) => ({
      bindingId,
      operation,
      key,
      alias,
    })),
    [
      {
        bindingId: "runtime-state",
        operation: "assign",
        key: "bootStatus",
        alias: "runtimeAlias",
      },
    ],
  );
});

test("nested aliases and Object APIs preserve the top-level key and full path", () => {
  const source = `
    const cacheAlias = ${member("renderCache")};
    cacheAlias.dirty = true;
    Object.defineProperty(${member("renderCache")}, "signature", descriptor);
    Reflect.set(${member("renderCache")}, "generation", 4);
    Object.assign(${member("renderCache")}, patch);
  `;

  const findings = scanModule(source);

  assert.deepEqual(
    findings.map(({ operation, key, pathSegments, dynamic }) => ({
      operation,
      key,
      pathSegments,
      dynamic,
    })),
    [
      {
        operation: "assign",
        key: "renderCache",
        pathSegments: ["renderCache", "dirty"],
        dynamic: false,
      },
      {
        operation: "define-property",
        key: "renderCache",
        pathSegments: ["renderCache", "signature"],
        dynamic: false,
      },
      {
        operation: "reflect-set",
        key: "renderCache",
        pathSegments: ["renderCache", "generation"],
        dynamic: false,
      },
      {
        operation: "object-assign",
        key: "renderCache",
        pathSegments: ["renderCache", "*"],
        dynamic: true,
      },
    ],
  );
});

test("destructuring detection separates writes from state-reference escapes", () => {
  const source = `
    const snapshot = { ready: ${member("bootReady")} };
    consume({ current: ${member("bootStatus")} });
    ({ ready: ${member("bootReady")} } = payload);
  `;

  assert.deepEqual(
    scanModule(source).map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "bootReady",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "bootStatus",
        reason: "state-alias-escape",
      },
      {
        operation: "destructure-assign",
        key: "bootReady",
        reason: "",
      },
    ],
  );
});

test("destructuring assignments report state escapes into external member sinks", () => {
  const findings = scanModule(`
    ({ value: holder.value } = { value: ${STATE_ROOT} });
    [holder.value] = [${member("activeScenarioId")}];
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "activeScenarioId",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("findings include file, line, column, path, and supported status", () => {
  const source = `
${assign("renderCache.dirty", "true")}
  `;

  const [finding] = scanModule(source);

  assert.deepEqual(
    {
      filePath: finding.filePath,
      line: finding.line,
      column: finding.column,
      pathSegments: finding.pathSegments,
      unsupported: finding.unsupported,
    },
    {
      filePath: "fixtures/state-writer.js",
      line: 2,
      column: 1,
      pathSegments: ["renderCache", "dirty"],
      unsupported: false,
    },
  );
});

test("unbalanced executable syntax fails closed with an unsupported finding", () => {
  const source = `
    ${member("renderCache")}["dirty" = true;
  `;

  const findings = scanModule(source);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].operation, "unsupported");
  assert.equal(findings[0].unsupported, true);
  assert.equal(findings[0].filePath, "fixtures/state-writer.js");
});

test("nested computed paths keep top-level authority and mark the dynamic segment", () => {
  const source = `
    ${member("renderCache")}[cacheKey] += 1;
  `;

  assert.deepEqual(
    scanModule(source).map(({ operation, key, pathSegments, dynamic }) => ({
      operation,
      key,
      pathSegments,
      dynamic,
    })),
    [
      {
        operation: "compound-assign",
        key: "renderCache",
        pathSegments: ["renderCache", "*"],
        dynamic: true,
      },
    ],
  );
});

test("deterministic alias chains retain provenance", () => {
  const source = `
    const firstAlias = ${STATE_ROOT};
    const secondAlias = firstAlias;
    secondAlias.ready = true;
  `;

  assert.deepEqual(
    scanModule(source).map(({ key, alias, aliasChain }) => ({
      key,
      alias,
      aliasChain,
    })),
    [
      {
        key: "ready",
        alias: "secondAlias",
        aliasChain: ["firstAlias", "secondAlias"],
      },
    ],
  );
});

test("destructuring defaults stay read-only while containers expose alias escapes", () => {
  const source = `
    ({ value = ${member("fallbackValue")} } = payload);
    const list = [${member("listValue")}, local = 1];
    const config = { value: ${member("configValue")}, fallback: local = 1 };
  `;

  assert.deepEqual(
    scanModule(source).map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "listValue",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "configValue",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("regular expressions after control conditions remain lexical noise", () => {
  const fakeWritePattern = `${member("controlRegexNoise")} = true`;
  const source = `
    if (ready) /${fakeWritePattern}/.test(text);
    ${assign("controlRegexReal", "true")}
  `;

  assert.deepEqual(
    scanModule(source).map(({ key }) => key),
    ["controlRegexReal"],
  );
});

test("regular expressions inside template interpolation do not terminate the interpolation", () => {
  const source = `
    const sample = \`\${ /}/.test(text) ? (${member("templateInner")} = 1) : 0 }\`;
    ${assign("templateAfter", "2")}
  `;

  assert.deepEqual(
    scanModule(source).map(({ key }) => key),
    ["templateInner", "templateAfter"],
  );
});

test("registered bindings remain isolated inside one file", () => {
  const source = `
    ${assign("sharedKey", "1")}
    function setBootStateFields(target) {
      target.sharedKey = 2;
      target.bootOnly = 3;
    }
  `;

  const findings = scanStateMutations(source, {
    bindings: [
      { id: "runtime-state", kind: "module", name: STATE_ROOT },
      {
        id: "boot-target",
        kind: "function-parameter",
        functionName: "setBootStateFields",
        parameterName: "target",
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ bindingId, key }) => ({ bindingId, key })),
    [
      { bindingId: "runtime-state", key: "sharedKey" },
      { bindingId: "boot-target", key: "sharedKey" },
      { bindingId: "boot-target", key: "bootOnly" },
    ],
  );
});

test("cached analysis remains isolated across sequential binding scans", () => {
  const source = `
    ${assign("moduleOnly", "true")}
    function owner(${RUNTIME_STATE_ROOT}) {
      ${RUNTIME_STATE_ROOT}.parameterOnly = true;
    }
  `;
  const moduleOptions = {
    filePath: "fixtures/cached-binding-isolation.js",
    bindings: [
      { id: "runtime-state", kind: "module", name: STATE_ROOT },
    ],
  };
  const parameterOptions = {
    filePath: "fixtures/cached-binding-isolation.js",
    bindings: [
      {
        id: "runtime-parameter",
        kind: "function-parameter",
        functionName: "owner",
        parameterName: RUNTIME_STATE_ROOT,
      },
    ],
  };

  const firstModuleScan = scanStateMutations(source, moduleOptions);
  const parameterScan = scanStateMutations(source, parameterOptions);
  const secondModuleScan = scanStateMutations(source, moduleOptions);

  assert.deepEqual(
    firstModuleScan.map(({ bindingId, key }) => ({ bindingId, key })),
    [{ bindingId: "runtime-state", key: "moduleOnly" }],
  );
  assert.deepEqual(
    parameterScan.map(({ bindingId, key }) => ({ bindingId, key })),
    [{ bindingId: "runtime-parameter", key: "parameterOnly" }],
  );
  assert.deepEqual(secondModuleScan, firstModuleScan);
});

test("function-parameter binding locators fail closed when they are missing or ambiguous", () => {
  const missing = scanStateMutations("const sample = 1;", {
    filePath: "fixtures/missing-binding.js",
    bindings: [
      {
        id: "missing-target",
        kind: "function-parameter",
        functionName: "missingOwner",
        parameterName: "target",
      },
    ],
  });
  const ambiguousSource = `
    function duplicateOwner(target) { target.first = 1; }
    function duplicateOwner(target) { target.second = 2; }
  `;
  const ambiguous = scanStateMutations(ambiguousSource, {
    filePath: "fixtures/ambiguous-binding.js",
    bindings: [
      {
        id: "duplicate-target",
        kind: "function-parameter",
        functionName: "duplicateOwner",
        parameterName: "target",
      },
    ],
  });

  assert.equal(missing[0]?.operation, "unsupported");
  assert.equal(missing[0]?.reason, "binding-locator-missing");
  assert.equal(ambiguous[0]?.operation, "unsupported");
  assert.equal(ambiguous[0]?.reason, "binding-locator-ambiguous");
});

test("ambiguous alias initialization and reassignment fail closed", () => {
  const conditionalAlias = scanModule(`
    const runtimeAlias = enabled ? ${STATE_ROOT} : fallback;
    runtimeAlias.ready = true;
  `);
  const conditionalReassignment = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    runtimeAlias.before = true;
    runtimeAlias = enabled ? fallback : ${STATE_ROOT};
    runtimeAlias.after = true;
  `);

  assert.equal(conditionalAlias[0]?.operation, "unsupported");
  assert.equal(conditionalAlias[0]?.reason, "ambiguous-alias-flow");
  assert.equal(conditionalReassignment.at(-1)?.operation, "unsupported");
  assert.equal(conditionalReassignment.at(-1)?.reason, "ambiguous-alias-flow");
});

test("unterminated strings, comments, and templates fail closed", () => {
  const samples = [
    `${member("stringValue")} = "unterminated`,
    `${member("commentValue")} = true; /* unterminated`,
    `const sample = \`\${${member("templateValue")} = true}`,
  ];

  for (const source of samples) {
    const findings = scanModule(source);
    assert.equal(findings[0]?.operation, "unsupported");
    assert.equal(findings[0]?.unsupported, true);
  }
});

test("function-local bindings support exact body-destructured state locators", () => {
  const source = `
    function createRefreshOwner(deps) {
      const { ${STATE_ROOT}, render } = deps;
      ${assign("refreshRevision", "1")}
      render();
    }
  `;

  const findings = scanStateMutations(source, {
    bindings: [
      {
        id: "refresh-local-state",
        kind: "function-local",
        functionName: "createRefreshOwner",
        name: STATE_ROOT,
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ bindingId, key }) => ({ bindingId, key })),
    [{ bindingId: "refresh-local-state", key: "refreshRevision" }],
  );
});

test("function parameter discovery reports exact named owner locations", () => {
  const source = `
    function createBootOwner(target) {
      target.ready = true;
    }
    const createScenarioOwner = (${RUNTIME_STATE_ROOT}) => {
      ${RUNTIME_STATE_ROOT}.ready = true;
    };
  `;

  assert.deepEqual(
    discoverFunctionParameterBindings(source).bindings.map(
      ({ functionName, parameterName }) => ({ functionName, parameterName }),
    ),
    [
      { functionName: "createBootOwner", parameterName: "target" },
      {
        functionName: "createScenarioOwner",
        parameterName: RUNTIME_STATE_ROOT,
      },
    ],
  );
});

test("function parameter discovery includes targetState without broad parameter matching", () => {
  const source = `
    function applySnapshot(targetState, context) {
      targetState.ready = true;
      context.ready = true;
    }
    function ordinaryOwner(payload, options) {
      payload.ready = true;
      options.ready = true;
    }
  `;

  assert.deepEqual(
    discoverFunctionParameterBindings(source).bindings.map(
      ({ functionName, parameterName }) => ({ functionName, parameterName }),
    ),
    [
      {
        functionName: "applySnapshot",
        parameterName: "targetState",
      },
    ],
  );
});

test("function parameter discovery can enumerate every named parameter by ordinal", () => {
  const source = `
    function applySnapshot(model, context) {
      model.bootPhase = "ready";
      context.ready = true;
    }
  `;

  assert.deepEqual(
    discoverFunctionParameterBindings(
      source,
      { parameterNames: null },
    ).bindings.map(
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
    [
      {
        functionName: "applySnapshot",
        parameterName: "model",
        parameterIndex: 0,
      },
      {
        functionName: "applySnapshot",
        parameterName: "context",
        parameterIndex: 1,
      },
    ],
  );
});

test("function parameter discovery covers async arrows and generators", () => {
  const source = `
    const createAsyncOwner = async (target) => {
      target.ready = true;
    };
    function* createGeneratorOwner(runtimeState) {
      runtimeState.ready = true;
    }
  `;

  assert.deepEqual(
    discoverFunctionParameterBindings(source).bindings.map(
      ({ functionName, parameterName }) => ({ functionName, parameterName }),
    ),
    [
      { functionName: "createAsyncOwner", parameterName: "target" },
      {
        functionName: "createGeneratorOwner",
        parameterName: RUNTIME_STATE_ROOT,
      },
    ],
  );
});

test("AST discovery covers methods, getters, setters, defaults, and destructured parameters", () => {
  const source = `
    const owner = {
      async apply(target = {}) {
        target.ready = true;
      },
      get snapshot() {
        return null;
      },
      set snapshot(runtimeState) {
        runtimeState.ready = true;
      },
    };
    class RuntimeOwner {
      *applyState({ state, ...rest } = {}) {
        state.ready = Boolean(rest);
      }
    }
  `;

  assert.deepEqual(
    discoverFunctionParameterBindings(source).bindings.map(
      ({ functionName, parameterName }) => ({ functionName, parameterName }),
    ),
    [
      { functionName: "apply", parameterName: "target" },
      { functionName: "snapshot", parameterName: RUNTIME_STATE_ROOT },
      { functionName: "applyState", parameterName: STATE_ROOT },
    ],
  );
});

test("function locators disambiguate same-name owners by exact body location", () => {
  const source = `
    function duplicateOwner(target) {
      target.first = true;
    }
    function duplicateOwner(target) {
      target.second = true;
    }
  `;
  const discovered = discoverFunctionParameterBindings(source).bindings;
  const second = discovered[1];
  const findings = scanStateMutations(source, {
    bindings: [
      {
        id: "second-target",
        kind: "function-parameter",
        functionName: "duplicateOwner",
        parameterName: "target",
        locator: {
          line: second.line,
          column: second.column,
        },
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ bindingId, key }) => ({ bindingId, key })),
    [{ bindingId: "second-target", key: "second" }],
  );
});

test("optional-chain properties stay read-only while receiver calls fail closed", () => {
  assert.deepEqual(
    scanModule(`
      const pending = ${member("queue")}?.length;
      const cached = ${member("cacheById")}?.get(id);
    `).map(({ operation, key, reason }) => ({ operation, key, reason })),
    [{
      operation: "unsupported",
      key: "cacheById",
      reason: "unsupported-call-mutation",
    }],
  );

  const invalid = scanModule(`${member("queue")}?.length = 1;`);
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0]?.operation, "unsupported");
  assert.equal(invalid[0]?.reason, "javascript-parse-error");
});

test("unterminated block comments inside template interpolation fail closed", () => {
  const findings = scanModule(`
    const sample = \`\${${member("templateValue")} = true; /* unterminated }\`;
  `);

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.operation, "unsupported");
  assert.equal(findings[0]?.reason, "unterminated-block-comment");
});

test("unterminated regular expressions fail closed", () => {
  const findings = scanModule(`
    const matcher = /${member("regexNoise")} = true;
    ${assign("realWrite", "true")}
  `);

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.operation, "unsupported");
  assert.equal(findings[0]?.reason, "unterminated-regular-expression");
});

test("aliases can acquire and reacquire binding identity through exact assignments", () => {
  const findings = scanModule(`
    let runtimeAlias;
    runtimeAlias = ${STATE_ROOT};
    runtimeAlias.first = true;
    runtimeAlias = {};
    runtimeAlias = ${STATE_ROOT};
    runtimeAlias.second = true;
  `);

  assert.deepEqual(
    findings.map(({ key, alias }) => ({ key, alias })),
    [
      { key: "first", alias: "runtimeAlias" },
      { key: "second", alias: "runtimeAlias" },
    ],
  );
});

test("destructured aliases retain top-level state provenance", () => {
  const findings = scanModule(`
    const { renderCache: cache } = ${STATE_ROOT};
    cache.dirty = true;
  `);

  assert.deepEqual(
    findings.map(({ key, pathSegments, aliasChain }) => ({
      key,
      pathSegments,
      aliasChain,
    })),
    [
      {
        key: "renderCache",
        pathSegments: ["renderCache", "dirty"],
        aliasChain: ["cache"],
      },
    ],
  );
});

test("registered coalesced aliases require exact source parameters", () => {
  const source = `
    function createRuntime({
      ${STATE_ROOT} = null,
      runtimeState: explicitRuntimeState = null,
    } = {}) {
      const runtimeState = explicitRuntimeState || ${STATE_ROOT};
      ${RUNTIME_STATE_ROOT}.ready = true;
    }
  `;
  const findings = scanStateMutations(source, {
    bindings: [
      {
        id: "coalesced-runtime-state",
        kind: "function-local-alias",
        functionName: "createRuntime",
        name: RUNTIME_STATE_ROOT,
        aliasSources: ["explicitRuntimeState", STATE_ROOT],
        aliasOperators: ["||"],
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ bindingId, key }) => ({ bindingId, key })),
    [
      {
        bindingId: "coalesced-runtime-state",
        key: "ready",
      },
    ],
  );
});

test("computed property reads in assignment patterns are not state writes", () => {
  const findings = scanModule(`
    ({ [${member("lookupKey")}]: localValue } = source);
  `);

  assert.deepEqual(findings, []);
});

test("for-of destructuring targets are state writes", () => {
  const findings = scanModule(`
    for ({ value: ${member("currentValue")} } of values) {
      consume(currentValue);
    }
  `);

  assert.deepEqual(
    findings.map(({ operation, key }) => ({ operation, key })),
    [
      {
        operation: "destructure-assign",
        key: "currentValue",
      },
    ],
  );
});

test("loop bindings shadow module state only inside the loop body", () => {
  const findings = scanModule(`
    ${assign("beforeLoop", "1")}
    for (const ${STATE_ROOT} of values) {
      ${assign("loopLocal", "2")}
    }
    ${assign("afterLoop", "3")}
  `);

  assert.deepEqual(
    findings.map(({ key }) => key),
    ["beforeLoop", "afterLoop"],
  );
});

test("regular expressions after else remain lexical noise", () => {
  const fakeWritePattern = `${member("elseRegexNoise")} = true`;
  const findings = scanModule(`
    if (ready) consume();
    else /${fakeWritePattern}/.test(text);
    ${assign("elseRegexReal", "true")}
  `);

  assert.deepEqual(
    findings.map(({ key }) => key),
    ["elseRegexReal"],
  );
});

test("Reflect.defineProperty is classified as a state mutation API", () => {
  const findings = scanModule(`
    Reflect.defineProperty(${STATE_ROOT}, "bootStatus", descriptor);
  `);

  assert.deepEqual(
    findings.map(({ operation, key, dynamic }) => ({
      operation,
      key,
      dynamic,
    })),
    [
      {
        operation: "reflect-define-property",
        key: "bootStatus",
        dynamic: false,
      },
    ],
  );
});

test("call results do not inherit writable state provenance", () => {
  const findings = scanModule(`
    const order = ${member("layers")}.map((layer) => layer.id);
    ({ first: order[0] } = payload);
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [{
      operation: "unsupported",
      key: "layers",
      reason: "unsupported-call-mutation",
    }],
  );
});

test("identity-changing compound alias assignments fail closed", () => {
  const findings = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    runtimeAlias.before = true;
    runtimeAlias ||= fallback;
    runtimeAlias.after = true;
  `);

  assert.equal(findings.at(-1)?.operation, "unsupported");
  assert.equal(findings.at(-1)?.reason, "ambiguous-alias-flow");
});

test("derived results stay untracked while unknown state inputs fail closed", () => {
  const findings = scanModule(`
    const enabled = !!String(${member("activeScenarioId")} || "").trim();
    const snapshot = {};
    snapshot.visualOverrides = clone(${member("visualOverrides")} || {});
    const normalized = normalize(${member("styleConfig")});
    normalized.mode = "paper";
    enabled.value = true;
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "styleConfig",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("test-file-root bindings cover fixture roots inside anonymous test scopes", () => {
  const source = `
    test("fixture", () => {
      const ${STATE_ROOT} = {};
      ${assign("fixtureKey", "true")}
    });
  `;
  const findings = scanStateMutations(source, {
    bindings: [
      {
        id: "test-state-root",
        kind: "test-file-root",
        name: STATE_ROOT,
      },
    ],
  });

  assert.deepEqual(
    findings.map(({ bindingId, key }) => ({ bindingId, key })),
    [
      {
        bindingId: "test-state-root",
        key: "fixtureKey",
      },
    ],
  );
});

test("ambiguous aliases retain deterministic findings from the same binding", () => {
  const findings = scanRuntimeParameter(`
    const alias = condition ? ${RUNTIME_STATE_ROOT} : {};
    alias.conditional = true;
    ${RUNTIME_STATE_ROOT}.secret = true;
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
      {
        operation: "assign",
        key: "secret",
        reason: "",
      },
    ],
  );
});

test("conditional alias resets merge exact and none identity as ambiguous", () => {
  const findings = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    if (condition) {
      runtimeAlias = {};
    }
    runtimeAlias.secret = true;
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
    ],
  );
});

test("catch alias resets merge the success and recovery paths as ambiguous", () => {
  const findings = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    try {
      consume();
    } catch (error) {
      runtimeAlias = {};
    }
    runtimeAlias.secret = true;
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
    ],
  );
});

test("loop alias resets merge zero and repeated iterations as ambiguous", () => {
  const findings = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    for (const item of items) {
      runtimeAlias = {};
    }
    runtimeAlias.secret = true;
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
    ],
  );
});

test("nested function alias exits do not alter the enclosing alias state", () => {
  const resetOnly = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    function resetLater() {
      runtimeAlias = {};
    }
    runtimeAlias.outer = true;
  `);
  const resetAndMutate = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    function resetLater() {
      runtimeAlias = {};
      runtimeAlias.inner = true;
    }
    runtimeAlias.outer = true;
  `);

  assert.deepEqual(
    resetOnly.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "outer" }],
  );
  assert.deepEqual(
    resetAndMutate.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "outer" }],
  );
});

test("function parameter and var redeclarations share one binding identity", () => {
  const preserved = scanStateMutations(
    `function owner(${RUNTIME_STATE_ROOT}) {
      var ${RUNTIME_STATE_ROOT};
      ${RUNTIME_STATE_ROOT}.ready = true;
    }`,
    {
      filePath: "fixtures/parameter-var-writer.js",
      bindings: [
        {
          id: "runtime-parameter",
          kind: "function-parameter",
          functionName: "owner",
          parameterName: RUNTIME_STATE_ROOT,
        },
      ],
    },
  );
  const replacedByInitializer = scanStateMutations(
    `function owner(${RUNTIME_STATE_ROOT}) {
      var ${RUNTIME_STATE_ROOT} = {};
      ${RUNTIME_STATE_ROOT}.ready = true;
    }`,
    {
      filePath: "fixtures/parameter-var-initializer.js",
      bindings: [
        {
          id: "runtime-parameter",
          kind: "function-parameter",
          functionName: "owner",
          parameterName: RUNTIME_STATE_ROOT,
        },
      ],
    },
  );
  const replacedByAssignment = scanRuntimeParameter(`
    ${RUNTIME_STATE_ROOT} = {};
    ${RUNTIME_STATE_ROOT}.ready = true;
  `);

  assert.deepEqual(
    preserved.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "ready" }],
  );
  assert.deepEqual(replacedByInitializer, []);
  assert.deepEqual(replacedByAssignment, []);
});

test("branch merges preserve exact identity only when every path preserves it", () => {
  const allExact = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    if (condition) {
      runtimeAlias = ${STATE_ROOT};
    } else {
      runtimeAlias = ${STATE_ROOT};
    }
    runtimeAlias.ready = true;
  `);
  const mixedIdentity = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    if (condition) {
      runtimeAlias = ${STATE_ROOT};
    } else {
      runtimeAlias = {};
    }
    runtimeAlias.ready = true;
  `);

  assert.deepEqual(
    allExact.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "ready" }],
  );
  assert.deepEqual(
    mixedIdentity.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
    ],
  );
});

test("switch analysis preserves fallthrough writes and branch exit ambiguity", () => {
  const fallthroughWrite = scanModule(`
    let runtimeAlias = {};
    switch (mode) {
      case "enable":
        runtimeAlias = ${STATE_ROOT};
      case "write":
        runtimeAlias.ready = true;
        break;
    }
  `);
  const ambiguousExit = scanModule(`
    let runtimeAlias = ${STATE_ROOT};
    switch (mode) {
      case "reset":
        runtimeAlias = {};
        break;
      default:
        runtimeAlias = ${STATE_ROOT};
    }
    runtimeAlias.ready = true;
  `);

  assert.deepEqual(
    fallthroughWrite.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "ready" }],
  );
  assert.deepEqual(
    ambiguousExit.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
    ],
  );
});

test("mutation targets retain provenance captured before RHS and argument effects", () => {
  const findings = scanModule(`
    let assignmentAlias = ${STATE_ROOT};
    assignmentAlias.ready = (assignmentAlias = {});
    let callAlias = ${STATE_ROOT};
    Object.assign(callAlias, (callAlias = {}));
  `);

  assert.deepEqual(
    findings.map(({ operation, key, alias }) => ({
      operation,
      key,
      alias,
    })),
    [
      {
        operation: "assign",
        key: "ready",
        alias: "assignmentAlias",
      },
      {
        operation: "object-assign",
        key: "*",
        alias: "callAlias",
      },
    ],
  );
});

test("try catch includes alias states from potential throw points", () => {
  const findings = scanRuntimeParameter(`
    let alias = {};
    try {
      alias = ${RUNTIME_STATE_ROOT};
      risky();
      alias = {};
    } catch (error) {
      alias.secret = true;
    }
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
    ],
  );
});

test("nested try and throwing updates preserve catch-entry alias states", () => {
  const nestedTry = scanModule(`
    let alias = {};
    try {
      try {
        alias = ${STATE_ROOT};
        risky();
        alias = {};
      } finally {
        cleanup();
      }
    } catch (error) {
      alias.secret = true;
    }
  `);
  const throwingUpdate = scanModule(`
    let alias = ${STATE_ROOT};
    try {
      alias++;
    } catch (error) {
      alias.secret = true;
    }
  `);

  for (const findings of [nestedTry, throwingUpdate]) {
    assert.deepEqual(
      findings.map(({ operation, key, reason }) => ({
        operation,
        key,
        reason,
      })),
      [
        {
          operation: "unsupported",
          key: "*",
          reason: "ambiguous-alias-flow",
        },
      ],
    );
  }
});

test("while for and do loops widen alias state across later iterations", () => {
  const samples = [
    `
      let alias = {};
      while (condition) {
        alias.secret = true;
        alias = ${STATE_ROOT};
      }
    `,
    `
      let alias = {};
      for (; condition;) {
        alias.secret = true;
        alias = ${STATE_ROOT};
      }
    `,
    `
      let alias = {};
      do {
        alias.secret = true;
        alias = ${STATE_ROOT};
      } while (condition);
    `,
  ];

  for (const source of samples) {
    const findings = scanModule(source);
    assert.deepEqual(
      findings.map(({ operation, key, reason }) => ({
        operation,
        key,
        reason,
      })),
      [
        {
          operation: "unsupported",
          key: "*",
          reason: "ambiguous-alias-flow",
        },
      ],
    );
  }
});

test("break and continue preserve their own loop completion states", () => {
  const samples = [
    `
      let alias = ${STATE_ROOT};
      while (condition) {
        alias = {};
        break;
        alias = ${STATE_ROOT};
      }
      alias.secret = true;
    `,
    `
      let alias = ${STATE_ROOT};
      while (condition) {
        alias = {};
        continue;
        alias = ${STATE_ROOT};
      }
      alias.secret = true;
    `,
  ];

  for (const source of samples) {
    const findings = scanModule(source);
    assert.deepEqual(
      findings.map(({ operation, key, reason }) => ({
        operation,
        key,
        reason,
      })),
      [
        {
          operation: "unsupported",
          key: "*",
          reason: "ambiguous-alias-flow",
        },
      ],
    );
  }
});

test("return and throw stop unreachable alias transitions", () => {
  const returned = scanRuntimeParameter(`
    let alias = ${RUNTIME_STATE_ROOT};
    if (condition) {
      alias = {};
      return;
    }
    alias.secret = true;
  `);
  const thrown = scanModule(`
    let alias = ${STATE_ROOT};
    try {
      alias = {};
      throw error;
      alias = ${STATE_ROOT};
    } catch (error) {
      alias.localOnly = true;
    }
  `);

  assert.deepEqual(
    returned.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "secret" }],
  );
  assert.deepEqual(
    thrown.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
    ],
  );
});

test("closures keep stable const aliases exact and widen mutable captures", () => {
  const stable = scanModule(`
    const alias = ${STATE_ROOT};
    function apply() {
      alias.secret = true;
    }
    apply();
  `);
  const acquiredLater = scanModule(`
    let alias = {};
    function apply() {
      alias.secret = true;
    }
    alias = ${STATE_ROOT};
    apply();
  `);
  const releasedLater = scanModule(`
    let alias = ${STATE_ROOT};
    function apply() {
      alias.secret = true;
    }
    alias = {};
    apply();
  `);

  assert.deepEqual(
    stable.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "secret" }],
  );
  for (const findings of [acquiredLater, releasedLater]) {
    assert.deepEqual(
      findings.map(({ operation, key, reason }) => ({
        operation,
        key,
        reason,
      })),
      [
        {
          operation: "unsupported",
          key: "*",
          reason: "ambiguous-alias-flow",
        },
      ],
    );
  }
});

test("closures declared before later bindings fail closed on captured writes", () => {
  const findings = scanModule(`
    function apply() {
      alias.secret = true;
    }
    const alias = ${STATE_ROOT};
    apply();
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
    ],
  );
});

test("switch case tests accumulate before matched cases and break stops fallthrough", () => {
  const findings = scanModule(`
    let alias = {};
    switch (mode) {
      case (alias = ${STATE_ROOT}, "enable"):
        break;
      case "write":
        alias.secret = true;
        break;
    }
  `);

  assert.deepEqual(
    findings.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "secret" }],
  );
});

test("destructuring assignment transfers identifier alias identity", () => {
  const findings = scanModule(`
    let alias = {};
    [alias] = [${STATE_ROOT}];
    alias.secret = true;
  `);

  assert.deepEqual(
    findings.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "secret" }],
  );
});

test("for of transfers exact iterable element identity into existing identifiers", () => {
  const findings = scanModule(`
    let alias = {};
    for (alias of [${STATE_ROOT}]) {
      alias.secret = true;
    }
  `);

  assert.deepEqual(
    findings.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "secret" }],
  );
});

test("for of reports state escapes into external member sinks", () => {
  const findings = scanModule(`
    for (holder.value of [${STATE_ROOT}]) {
      consume(holder.value);
    }
    for ([holder.value] of [[${STATE_ROOT}]]) {
      consume(holder.value);
    }
    for ({ value: holder.value } of [{ value: ${member("activeScenarioId")} }]) {
      consume(holder.value);
    }
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "activeScenarioId",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("nested for of destructuring transfers concrete alias provenance", () => {
  const findings = scanModule(`
    for (const [alias] of [[${STATE_ROOT}]]) {
      alias.secret = true;
    }
    for (const { value: alias } of [{ value: ${member("startup")} }]) {
      alias.ready = true;
    }
  `);

  assert.deepEqual(
    findings.map(({ operation, key, pathSegments, reason }) => ({
      operation,
      key,
      pathSegments,
      reason,
    })),
    [
      {
        operation: "assign",
        key: "secret",
        pathSegments: ["secret"],
        reason: "",
      },
      {
        operation: "assign",
        key: "startup",
        pathSegments: ["startup", "ready"],
        reason: "",
      },
    ],
  );
});

test("identifier updates terminate writable alias provenance", () => {
  const findings = scanModule(`
    let alias = ${STATE_ROOT};
    alias++;
    alias.localOnly = true;
  `);

  assert.deepEqual(findings, []);
});

test("catch entries fail closed across implicit throw expressions", () => {
  const samples = [
    `1n + 1`,
    `candidate instanceof 1`,
    "`${Symbol()}`",
    `({ [coercionKey]: true })`,
  ];

  for (const expression of samples) {
    const findings = scanModule(`
      let alias = {};
      try {
        alias = ${STATE_ROOT};
        ${expression};
        alias = {};
      } catch (error) {
        alias.secret = true;
      }
    `);
    assert.deepEqual(
      findings.map(({ operation, key, reason }) => ({
        operation,
        key,
        reason,
      })),
      [
        {
          operation: "unsupported",
          key: "*",
          reason: "ambiguous-alias-flow",
        },
      ],
    );
  }
});

test("standard Object and Reflect mutators retain explicit operations", () => {
  const findings = scanModule(`
    Object.setPrototypeOf(${STATE_ROOT}, null);
    Object.freeze(${STATE_ROOT});
    Object.seal(${STATE_ROOT});
    Object.preventExtensions(${STATE_ROOT});
    Reflect.setPrototypeOf(${STATE_ROOT}, null);
    Reflect.preventExtensions(${STATE_ROOT});
  `);

  assert.deepEqual(
    findings.map(({ operation, key }) => ({ operation, key })),
    [
      { operation: "set-prototype", key: "*" },
      { operation: "freeze", key: "*" },
      { operation: "seal", key: "*" },
      { operation: "prevent-extensions", key: "*" },
      { operation: "reflect-set-prototype", key: "*" },
      { operation: "reflect-prevent-extensions", key: "*" },
    ],
  );
});

test("unknown tracked calls fail closed while pure reads remain read-only", () => {
  const mutations = scanModule(`
    ${STATE_ROOT}.searchParams.append("key", "value");
    mutateUnknown(${STATE_ROOT});
  `);
  const receiverCalls = scanModule(`
    ${STATE_ROOT}.items.includes("key");
    ${STATE_ROOT}.items.get("key");
  `);
  const intrinsicReads = scanModule(`
    Object.keys(${STATE_ROOT});
    Object.getPrototypeOf(${STATE_ROOT});
    Reflect.get(${STATE_ROOT}, "ready");
    Reflect.has(${STATE_ROOT}, "ready");
  `);

  assert.deepEqual(
    mutations.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "searchParams",
        reason: "unsupported-call-mutation",
      },
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
    ],
  );
  assert.deepEqual(
    receiverCalls.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "items",
        reason: "unsupported-call-mutation",
      },
      {
        operation: "unsupported",
        key: "items",
        reason: "unsupported-call-mutation",
      },
    ],
  );
  assert.deepEqual(intrinsicReads, []);
});

test("registered action payload Reflect.get resolves only static non-root projections", () => {
  const findings = scanModule(`
    import { setBootStateFields } from "../js/core/state/actions/boot_actions.js";
    const dynamicKey = "ready";
    setBootStateFields(${STATE_ROOT}, {
      staticRootProjection: Reflect.get(${STATE_ROOT}, "ready"),
      staticNestedProjection: Reflect.get(${member("runtime")}, "ready"),
    });
    setBootStateFields(${STATE_ROOT}, {
      dynamicRootProjection: Reflect.get(${STATE_ROOT}, dynamicKey),
    });
    setBootStateFields(${STATE_ROOT}, {
      dynamicNestedProjection: Reflect.get(${member("runtime")}, dynamicKey),
    });
    setBootStateFields(${STATE_ROOT}, {
      rootProjection: Reflect.get(${STATE_ROOT}),
    });
  `);

  assert.equal(findings.length, 3);
  assert.deepEqual(
    findings.map(({ operation, key, reason, evidenceKind }) => ({
      operation,
      key,
      reason,
      evidenceKind,
    })),
    Array.from({ length: 3 }, () => ({
      operation: "unsupported",
      key: "*",
      reason: "state-alias-escape",
      evidenceKind: "unknown-call-argument",
    })),
  );
});

test("named class expressions shadow module state across every class surface", () => {
  const findings = scanModule(`
    const Example = class ${STATE_ROOT} {
      instanceMethod() {
        ${STATE_ROOT}.instanceOnly = true;
      }
      static staticMethod() {
        ${STATE_ROOT}.staticOnly = true;
      }
      static {
        ${STATE_ROOT}.blockOnly = true;
      }
    };
    ${STATE_ROOT}.outside = true;
  `);

  assert.deepEqual(
    findings.map(({ operation, key }) => ({ operation, key })),
    [{ operation: "assign", key: "outside" }],
  );
});

test("assignment-pattern defaults merge source and fallback provenance", () => {
  const samples = [
    `
      let alias = {};
      ({ value: alias = ${STATE_ROOT} } = {});
      alias.secret = true;
    `,
    `
      const [alias = ${STATE_ROOT}] = [];
      alias.secret = true;
    `,
    `
      for (let [alias = ${STATE_ROOT}] of [[]]) {
        alias.secret = true;
      }
    `,
    `
      function apply(alias = ${STATE_ROOT}) {
        alias.secret = true;
      }
    `,
  ];

  for (const source of samples) {
    const findings = scanModule(source);
    assert.deepEqual(
      findings.map(({ operation, key, reason }) => ({
        operation,
        key,
        reason,
      })),
      [
        {
          operation: "unsupported",
          key: "*",
          reason: "ambiguous-alias-flow",
        },
      ],
    );
  }
});

test("chained loop labels share one fixed-point continue target", () => {
  const findings = scanModule(`
    let alias = {};
    outer: inner: while (condition) {
      alias.secret = true;
      alias = ${STATE_ROOT};
      continue outer;
    }
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "ambiguous-alias-flow",
      },
    ],
  );
});

test("tracked aliases escaping into heap or unknown code fail closed", () => {
  const findings = scanModule(`
    const boxed = { value: ${STATE_ROOT} };
    const listed = [${STATE_ROOT}];
    holder.value = ${STATE_ROOT};
    exposeUnknown(${STATE_ROOT});
    new Holder(${STATE_ROOT});
    function expose() {
      return ${STATE_ROOT};
    }
    function* stream() {
      yield ${STATE_ROOT};
    }
  `);

  assert.deepEqual(
    findings.map(({ operation, reason }) => ({ operation, reason })),
    [
      { operation: "unsupported", reason: "state-alias-escape" },
      { operation: "unsupported", reason: "state-alias-escape" },
      { operation: "unsupported", reason: "state-alias-escape" },
      { operation: "unsupported", reason: "state-alias-escape" },
      { operation: "unsupported", reason: "state-alias-escape" },
      { operation: "unsupported", reason: "state-alias-escape" },
      { operation: "unsupported", reason: "state-alias-escape" },
    ],
  );
});

test("expression-bodied arrows report root and nested return escapes once", () => {
  const root = scanModule(`
    const exposeRoot = () => ${STATE_ROOT};
  `);
  const nested = scanModule(`
    const exposeNested = () => ${member("activeScenarioId")};
  `);

  assert.deepEqual(
    root.map(({ operation, key, pathSegments, reason }) => ({
      operation,
      key,
      pathSegments,
      reason,
    })),
    [{
      operation: "unsupported",
      key: "*",
      pathSegments: ["*"],
      reason: "state-alias-escape",
    }],
  );
  assert.deepEqual(
    nested.map(({ operation, key, pathSegments, reason }) => ({
      operation,
      key,
      pathSegments,
      reason,
    })),
    [{
      operation: "unsupported",
      key: "activeScenarioId",
      pathSegments: ["activeScenarioId"],
      reason: "state-alias-escape",
    }],
  );
});

test("pure intrinsic reads require unshadowed global bindings", () => {
  const globals = scanModule(`
    Array.from(${member("scenarioApplyPendingRequests")});
    Object.keys(${STATE_ROOT});
    Reflect.get(${STATE_ROOT}, "ready");
    String(${member("activeScenarioId")});
    Number(${member("scenarioDataGeneration")});
  `);
  const shadowed = scanModule(`
    function inspect(Array, Object, Reflect, String, Number) {
      Array.from(${member("scenarioApplyPendingRequests")});
      Object.keys(${STATE_ROOT});
      Reflect.get(${STATE_ROOT}, "ready");
      String(${member("activeScenarioId")});
      Number(${member("scenarioDataGeneration")});
    }
  `);

  assert.deepEqual(globals, []);
  assert.deepEqual(
    shadowed.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "scenarioApplyPendingRequests",
        reason: "state-alias-escape",
      },
      { operation: "unsupported", key: "*", reason: "state-alias-escape" },
      { operation: "unsupported", key: "*", reason: "state-alias-escape" },
      {
        operation: "unsupported",
        key: "activeScenarioId",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "scenarioDataGeneration",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("unregistered intrinsic call paths remain fail-closed", () => {
  const findings = scanModule(`
    Object.prototype.hasOwnProperty.call(${STATE_ROOT}, "activeScenarioId");
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("registered static intrinsic reads fail closed after local mutation", () => {
  const fixtures = [
    `
      Array.from = consumeUnknown;
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      Array = FakeArray;
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      Object.hasOwn = consumeUnknown;
      Object.hasOwn(${STATE_ROOT}, "activeScenarioId");
    `,
    `
      Object = FakeObject;
      Object.hasOwn(${STATE_ROOT}, "activeScenarioId");
    `,
    `
      String = consumeUnknown;
      String(${member("activeScenarioId")});
    `,
    `
      Object.defineProperty(Array, "from", { value: consumeUnknown });
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      Reflect.set(Object, "hasOwn", consumeUnknown);
      Object.hasOwn(${STATE_ROOT}, "activeScenarioId");
    `,
    `
      ({ from: Array.from } = replacements);
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      globalThis.Array.from = consumeUnknown;
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      Object.defineProperty(
        globalThis,
        "Array",
        { value: FakeArray },
      );
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      Reflect.set(window, "Object", FakeObject);
      Object.hasOwn(${STATE_ROOT}, "activeScenarioId");
    `,
    `
      const IntrinsicArray = Array;
      IntrinsicArray.from = consumeUnknown;
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      const realm = globalThis;
      realm.Object.hasOwn = consumeUnknown;
      Object.hasOwn(${STATE_ROOT}, "activeScenarioId");
    `,
    `
      const define = Object.defineProperty;
      define(Array, "from", { value: consumeUnknown });
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      Object.assign(globalThis, { Array: FakeArray });
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      Object.defineProperties(globalThis, {
        Object: { value: FakeObject },
      });
      Object.hasOwn(${STATE_ROOT}, "activeScenarioId");
    `,
    `
      Object.assign(globalThis, replacements);
      String(${member("activeScenarioId")});
    `,
    `
      const { defineProperty } = Object;
      defineProperty(Array, "from", { value: consumeUnknown });
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
    `
      const { Array: IntrinsicArray } = globalThis;
      IntrinsicArray.from = consumeUnknown;
      Array.from(${member("scenarioApplyPendingRequests")});
    `,
  ];

  for (const source of fixtures) {
    assert.equal(
      scanModule(source).some(
        ({ operation, reason }) =>
          operation === "unsupported"
          && reason === "state-alias-escape",
      ),
      true,
      source,
    );
  }
});

test("generic tracked receiver methods remain conservative", () => {
  const methods = [
    "forEach",
    "map",
    "reduce",
    "toJSON",
    "toString",
    "valueOf",
    "get",
  ];
  const findings = scanModule(`
    ${methods.map((methodName) =>
      `${member("params")}.${methodName}(callback);`
    ).join("\n")}
    ${member("params")}.append("key", "value");
  `);

  assert.equal(findings.length, methods.length + 1);
  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    Array.from({ length: methods.length + 1 }, () => ({
      operation: "unsupported",
      key: "params",
      reason: "unsupported-call-mutation",
    })),
  );
});

test("unknown arguments escape once while unknown receivers stay unsupported", () => {
  const findings = scanModule(`
    unknown(${STATE_ROOT});
    unknown(${member("activeScenarioId")});
    ${member("commands")}.run();
    ${member("commands")}.apply(${member("activeScenarioManifest")});
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      { operation: "unsupported", key: "*", reason: "state-alias-escape" },
      {
        operation: "unsupported",
        key: "activeScenarioId",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "commands",
        reason: "unsupported-call-mutation",
      },
      {
        operation: "unsupported",
        key: "commands",
        reason: "unsupported-call-mutation",
      },
      {
        operation: "unsupported",
        key: "activeScenarioManifest",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("root and nested escapes retain every heap and completion boundary", () => {
  const findings = scanModule(`
    const objectBox = {
      root: ${STATE_ROOT},
      nested: ${member("activeScenarioId")},
    };
    const arrayBox = [${STATE_ROOT}, ${member("activeScenarioId")}];
    holder.root = ${STATE_ROOT};
    holder.nested = ${member("activeScenarioId")};
    function exposeRoot() {
      return ${STATE_ROOT};
    }
    function exposeNested() {
      return ${member("activeScenarioId")};
    }
    function* stream() {
      yield ${STATE_ROOT};
      yield ${member("activeScenarioId")};
    }
  `);

  assert.equal(findings.length, 10);
  assert.deepEqual(
    findings.map(({ reason }) => reason),
    Array.from({ length: 10 }, () => "state-alias-escape"),
  );
  assert.equal(findings.filter(({ key }) => key === "*").length, 5);
  assert.equal(
    findings.filter(({ key }) => key === "activeScenarioId").length,
    5,
  );
});

test("class fields, tagged templates, and spreads retain state escape provenance", () => {
  const findings = scanModule(`
    class RootBox {
      value = ${STATE_ROOT};
    }
    class NestedBox {
      value = ${member("activeScenarioId")};
    }
    renderTag\`\${${STATE_ROOT}}\${${member("bootStatus")}}\`;
    consume(...${STATE_ROOT});
    new Holder(...${member("activeScenarioId")});
    const spreadValues = [...${STATE_ROOT}, ...${member("bootStatus")}];
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "activeScenarioId",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "bootStatus",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "activeScenarioId",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "bootStatus",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("tracked tagged-template member receivers fail closed independently", () => {
  const findings = scanModule(`
    ${member("format")}\`plain\`;
    ${member("format")}\`\${${member("bootStatus")}}\`;
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "unsupported-call-mutation",
      },
      {
        operation: "unsupported",
        key: "*",
        reason: "unsupported-call-mutation",
      },
      {
        operation: "unsupported",
        key: "bootStatus",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("Object structural mutators preserve concrete nested mutation paths", () => {
  const findings = scanModule(`
    Object.freeze(${member("styleConfig.physical")});
    Object.setPrototypeOf(${member("styleConfig.physical")}, prototype);
  `);

  assert.deepEqual(
    findings.map(({ operation, key, pathSegments, reason }) => ({
      operation,
      key,
      pathSegments,
      reason,
    })),
    [
      {
        operation: "freeze",
        key: "styleConfig",
        pathSegments: ["styleConfig", "physical"],
        reason: "",
      },
      {
        operation: "set-prototype",
        key: "styleConfig",
        pathSegments: ["styleConfig", "physical"],
        reason: "",
      },
    ],
  );
});

test("Object and Reflect calls classify each tracked argument independently", () => {
  const findings = scanModule(`
    Reflect.set(holder, "value", ${STATE_ROOT});
    Reflect.get(holder, "value", ${member("activeScenarioId")});
    Reflect.set(${member("renderCache")}, "generation", ${member("bootStatus")});
    Object.assign(${member("renderCache")}, ${member("styleConfig")});
  `);

  assert.deepEqual(
    findings.map(({ operation, key, pathSegments, reason }) => ({
      operation,
      key,
      pathSegments,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        pathSegments: ["*"],
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "activeScenarioId",
        pathSegments: ["activeScenarioId"],
        reason: "state-alias-escape",
      },
      {
        operation: "reflect-set",
        key: "renderCache",
        pathSegments: ["renderCache", "generation"],
        reason: "",
      },
      {
        operation: "unsupported",
        key: "bootStatus",
        pathSegments: ["bootStatus"],
        reason: "state-alias-escape",
      },
      {
        operation: "object-assign",
        key: "renderCache",
        pathSegments: ["renderCache", "*"],
        reason: "",
      },
      {
        operation: "unsupported",
        key: "styleConfig",
        pathSegments: ["styleConfig"],
        reason: "state-alias-escape",
      },
    ],
  );
});

test("direct immutable local helpers delegate exact target parameters", () => {
  const findings = scanModule(`
    function setBoot(target) {
      target.bootStatus = "ready";
    }
    const setNested = (target) => {
      target.ready = true;
    };
    setBoot(${STATE_ROOT});
    setNested(${member("startup")});
  `);

  assert.deepEqual(
    findings.map(({ operation, key, pathSegments, reason }) => ({
      operation,
      key,
      pathSegments,
      reason,
    })),
    [
      {
        operation: "assign",
        key: "bootStatus",
        pathSegments: ["bootStatus"],
        reason: "",
      },
      {
        operation: "assign",
        key: "startup",
        pathSegments: ["startup", "ready"],
        reason: "",
      },
    ],
  );
});

test("safe target delegation rejects spread arguments", () => {
  const findings = scanModule(`
    import { setBootStateFields } from "../js/core/state/actions/boot_actions.js";
    function mutate(target) {
      target.bootStatus = "ready";
    }
    setBootStateFields(...${STATE_ROOT});
    mutate(...${member("startup")});
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "startup",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("await wrappers preserve state provenance across escape boundaries", () => {
  const findings = scanModule(`
    import { setBootStateFields } from "../js/core/state/actions/boot_actions.js";
    function mutate(target) {
      target.bootStatus = "ready";
    }
    consume(await ${STATE_ROOT});
    setBootStateFields(await ${STATE_ROOT}, {});
    mutate(await ${member("startup")});
    async function expose() {
      return await ${member("bootStatus")};
    }
    holder.value = await ${member("activeScenarioId")};
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "startup",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "bootStatus",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "activeScenarioId",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("mutable, aliased, member, and dynamic helper calls fail closed", () => {
  const samples = [
    `
      let apply = (target) => {
        target.ready = true;
      };
      apply(${STATE_ROOT});
    `,
    `
      const apply = (target) => {
        target.ready = true;
      };
      const alias = apply;
      alias(${STATE_ROOT});
    `,
    `
      const helpers = {
        apply(target) {
          target.ready = true;
        },
      };
      helpers.apply(${STATE_ROOT});
    `,
    `
      const apply = (target) => {
        target.ready = true;
      };
      const fallback = () => {};
      (condition ? apply : fallback)(${STATE_ROOT});
    `,
    `
      function apply(target) {
        target.ready = true;
      }
      apply = replacement;
      apply(${STATE_ROOT});
    `,
  ];

  for (const source of samples) {
    const findings = scanModule(source);
    assert.deepEqual(
      findings.map(({ operation, key, reason }) => ({
        operation,
        key,
        reason,
      })),
      [
        {
          operation: "unsupported",
          key: "*",
          reason: "state-alias-escape",
        },
      ],
    );
  }
});

test("exact named action and compatibility imports own direct root delegation", () => {
  const findings = scanModule(`
    import { setBootStateFields as applyBoot } from "../js/core/state/actions/boot_actions.js";
    import {
      bindStateCompatSurface,
      callRuntimeHook,
      callRuntimeHooks,
    } from "../js/core/state/index.js";
    applyBoot(${STATE_ROOT}, { bootStatus: "ready" });
    callRuntimeHook(${STATE_ROOT}, "renderNowFn");
    callRuntimeHooks(${STATE_ROOT}, ["renderNowFn"]);
    bindStateCompatSurface(${STATE_ROOT});
  `);

  assert.deepEqual(findings, []);
});

test("inexact action and compatibility calls fail closed", () => {
  const findings = scanModule(`
    import * as bootActions from "../js/core/state/actions/boot_actions.js";
    import * as stateApi from "../js/core/state/index.js";
    import { callRuntimeHook } from "./unrelated_hooks.js";
    bootActions.setBootState(${STATE_ROOT}, {});
    bootActions[actionName](${STATE_ROOT}, {});
    stateApi.callRuntimeHook(${STATE_ROOT}, "renderNowFn");
    callRuntimeHook(${STATE_ROOT}, "renderNowFn");
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    Array.from({ length: 4 }, () => ({
      operation: "unsupported",
      key: "*",
      reason: "state-alias-escape",
    })),
  );
});

test("trusted state action imports require the exact project-local module path", () => {
  const findings = scanModule(`
    import { setBootStateFields as packageAction } from "evil/state/actions/fake.js";
    import { setBootStateFields as siblingAction } from "../evil/state/actions/fake.js";
    packageAction(${STATE_ROOT}, {});
    siblingAction(${STATE_ROOT}, {});
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    Array.from({ length: 2 }, () => ({
      operation: "unsupported",
      key: "*",
      reason: "state-alias-escape",
    })),
  );
});

test("registered imported target helpers require an exact root argument", () => {
  const findings = scanModule(`
    import { setBootStateFields } from "../js/core/state/actions/boot_actions.js";
    import { callRuntimeHook } from "../js/core/state/index.js";
    setBootStateFields(${member("startup")}, {});
    callRuntimeHook(${member("runtimeHooks")}, "renderNowFn");
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "startup",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "runtimeHooks",
        reason: "state-alias-escape",
      },
    ],
  );
});

test("state action delegation trusts only registered direct named exports", () => {
  const findings = scanModule(`
    import {
      setBootStateFields as registeredAlias,
      stealState as unknownExport,
      default as defaultAsNamed,
    } from "../js/core/state/actions/boot_actions.js";
    registeredAlias(${STATE_ROOT}, { phase: "ready" });
    unknownExport(${STATE_ROOT});
    defaultAsNamed(${STATE_ROOT});
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    Array.from({ length: 2 }, () => ({
      operation: "unsupported",
      key: "*",
      reason: "state-alias-escape",
    })),
  );
});

test("state action delegation rejects optional calls and local aliases", () => {
  const findings = scanModule(`
    import { setBootStateFields } from "../js/core/state/actions/boot_actions.js";
    const localAlias = setBootStateFields;
    setBootStateFields?.(${STATE_ROOT}, { phase: "ready" });
    localAlias(${STATE_ROOT}, { phase: "ready" });
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    Array.from({ length: 2 }, () => ({
      operation: "unsupported",
      key: "*",
      reason: "state-alias-escape",
    })),
  );
});

test("state action delegation rejects reassigned imports, bridge modules, and dynamic imports", () => {
  const findings = scanModule(`
    import { setBootStateFields } from "../js/core/state/actions/boot_actions.js";
    import { setBootStateFields as bridgedAction } from "./boot_actions_bridge.js";
    setBootStateFields = replacement;
    setBootStateFields(${STATE_ROOT}, { phase: "ready" });
    bridgedAction(${STATE_ROOT}, { phase: "ready" });
    (await import("../js/core/state/actions/boot_actions.js"))
      .setBootStateFields(${STATE_ROOT}, { phase: "ready" });
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    Array.from({ length: 3 }, () => ({
      operation: "unsupported",
      key: "*",
      reason: "state-alias-escape",
    })),
  );
});

test("state action delegation rejects wrong-index and additional state arguments", () => {
  const findings = scanModule(`
    import { setBootStateFields } from "../js/core/state/actions/boot_actions.js";
    setBootStateFields({ phase: "ready" }, ${STATE_ROOT});
    setBootStateFields(${STATE_ROOT}, ${member("startup")});
    setBootStateFields(${STATE_ROOT}, { nested: ${STATE_ROOT} });
  `);

  assert.deepEqual(
    findings.map(({ operation, key, reason }) => ({
      operation,
      key,
      reason,
    })),
    [
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "startup",
        reason: "state-alias-escape",
      },
      {
        operation: "unsupported",
        key: "*",
        reason: "state-alias-escape",
      },
    ],
  );
});
