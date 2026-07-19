import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverGlobalStateImportBindings,
  validateDomainActionSourceBoundary,
  validateStateWriterPolicySnapshot,
} from "../tools/state_writer_policy.mjs";
import {
  buildLegacyStateWriterSemanticAuthority,
  discoverStateWriterBindingsForSource,
  subtractLegacyStateWriterSemanticAuthority,
} from "../tools/build_state_writer_policy.mjs";
import {
  scanStateMutations,
} from "../tools/state_writer_inventory.mjs";
import * as policyChecker from "../tools/check_state_writer_policy.mjs";

function createLegacyWriter() {
  return {
    path: "js/fixture.js",
    surface: "production",
    domain: "boot",
    authority: "legacy-direct",
    migrationPhase: "P4.1",
    bindings: [{
      id: "runtime-state",
      kind: "module",
      name: "state",
      authority: "legacy-direct",
      grants: [{
        domain: "boot",
        migrationPhase: "P4.1",
        operations: ["assign"],
        keys: ["bootPhase"],
        memberships: [{
          operation: "assign",
          key: "bootPhase",
        }],
        aliasSites: [],
        dynamicSites: [],
        ambiguousSites: [],
        unsupportedSites: [],
      }],
    }],
  };
}

function createPolicy(writers, frozenAuthority, retiredAuthority) {
  return {
    schemaVersion: 1,
    baseline: {
      phase: "P4.0",
      sourceBaseSha: "1".repeat(40),
      generatedAt: "2026-07-19T00:00:00.000Z",
    },
    baselines: {
      legacySemanticAuthority: frozenAuthority,
    },
    writers,
    progress: {
      latestPhase: "P4.1",
      checkpoints: [],
      retiredLegacySemanticAuthority: retiredAuthority,
    },
  };
}

function createProgressPolicy() {
  const emptyAuthority = buildLegacyStateWriterSemanticAuthority([]);
  return {
    schemaVersion: 1,
    baseline: {
      phase: "P4.0",
      sourceBaseSha: "1".repeat(40),
      generatedAt: "2026-07-19T00:00:00.000Z",
    },
    baselines: {
      legacyDirectFiles: {
        production: 75,
        test: 43,
        total: 118,
      },
      bindingScopedMemberships: {
        production: {
          legacyCombined: 1187,
        },
      },
      bindingScopedSites: {
        dynamic: {
          production: {
            legacyCombined: 142,
          },
        },
        alias: {
          production: {
            legacyCombined: 227,
          },
        },
        ambiguous: {
          production: {
            legacyCombined: 901,
          },
        },
        unsupported: {
          production: {
            legacyCombined: 6692,
          },
        },
      },
      legacySemanticAuthority: emptyAuthority,
    },
    writers: [],
    progress: {
      latestPhase: "P4.1",
      checkpoints: [
        {
          phase: "P4.0",
          productionLegacyDirectFiles: 75,
          productionLegacyMemberships: 1187,
          productionLegacyDynamicSites: 142,
          productionLegacyAliasSites: 227,
          productionLegacyAmbiguousSites: 901,
          productionLegacyUnsupportedSites: 6692,
        },
        {
          phase: "P4.1",
          productionLegacyDirectFiles: 70,
          productionLegacyMemberships: 1100,
          productionLegacyDynamicSites: 130,
          productionLegacyAliasSites: 210,
          productionLegacyAmbiguousSites: 850,
          productionLegacyUnsupportedSites: 6500,
        },
      ],
      retiredLegacySemanticAuthority:
        subtractLegacyStateWriterSemanticAuthority(
          emptyAuthority,
          emptyAuthority,
        ),
    },
  };
}

test("production binding discovery rejects non-named access to the canonical state facade", () => {
  for (const { source, filePath } of [
    {
      source: `import * as stateModule from "./core/state.js";
       stateModule.state.bootPhase = "ready";`,
      filePath: "js/main.js",
    },
    {
      source: `const stateModule = await import("./core/state.js");
       stateModule.state.bootPhase = "ready";`,
      filePath: "js/main.js",
    },
    {
      source: `export { state as runtimeState } from "./core/state.js";`,
      filePath: "js/main.js",
    },
    {
      source: `import { state as sharedState } from "./core/state.js";
       export { sharedState as state };`,
      filePath: "js/bridge.js",
    },
    {
      source: `import { state as runtimeState } from "/js/core/state.js";
       runtimeState.bootPhase = "ready";`,
      filePath: "js/main.js",
    },
    {
      source: `import { state as runtimeState } from "https://example.test/scenario-forge/js/core/state.js";
       runtimeState.bootPhase = "ready";`,
      filePath: "js/main.js",
    },
  ]) {
    assert.throws(
      () => discoverGlobalStateImportBindings(source, { filePath }),
      (error) =>
        error?.code === "unsupported-global-state-facade-access"
        && Array.isArray(error.references)
        && error.references.length === 1,
    );
  }
});

test("domain action boundary rejects state imports routed through a local bridge", () => {
  const violations = validateDomainActionSourceBoundary(
    `import { state as runtimeState } from "../../../bridge.js";
     runtimeState.bootPhase = "ready";`,
    {
      filePath: "js/core/state/actions/boot_actions.js",
    },
  );

  assert.ok(
    violations.some(
      ({ code, importedName }) =>
        code === "domain-action-state-shaped-import"
        && importedName === "state",
    ),
    JSON.stringify(violations, null, 2),
  );
});

test("canonical state aliases cannot escape through module export surfaces", async () => {
  for (const source of [
    `import { state as s } from "./core/state.js";
     const bridge = s;
     export { bridge as state };`,
    `import { state as s } from "./core/state.js";
     export default s;`,
    `import { state as s } from "./core/state.js";
     const bridge = s;
     export default bridge;`,
    `import { state as s } from "./core/state.js";
     export function getState() { return s; }`,
  ]) {
    const bindings = await discoverStateWriterBindingsForSource(
      "js/bridge.js",
      source,
      "production",
    );
    const findings = scanStateMutations(source, {
      filePath: "js/bridge.js",
      bindings,
    });
    assert.ok(
      findings.some(
        ({ reason, unsupported }) =>
          reason === "state-alias-escape"
          && unsupported === true,
      ),
      JSON.stringify({ source, bindings, findings }, null, 2),
    );
  }
});

test("production binding discovery ignores same-named noncanonical state modules", () => {
  for (const { source, filePath } of [
    {
      source: `import { state as localState } from "./state.js";`,
      filePath: "js/feature/widget.js",
    },
    {
      source: `import { state as packageState } from "some-package/state.js";`,
      filePath: "js/main.js",
    },
    {
      source: `import { state as absoluteState } from "/vendor/state.js";`,
      filePath: "js/main.js",
    },
    {
      source: `import { state as nestedState } from "./core/state/index.js";`,
      filePath: "js/main.js",
    },
    {
      source: `import { state as contextFreeSibling } from "./state.js";`,
      filePath: "",
    },
    {
      source: `import { state as contextFreePackage } from "some-package/state.js";`,
      filePath: "",
    },
  ]) {
    assert.deepEqual(
      discoverGlobalStateImportBindings(source, { filePath }),
      [],
      `${filePath || "<context-free>"}: ${source}`,
    );
  }
});

test("production binding discovery accepts only the canonical state facade path", () => {
  assert.deepEqual(
    discoverGlobalStateImportBindings(
      `import { state as runtimeState } from "./core/state.js";`,
      { filePath: "js/main.js" },
    ),
    [{
      importSource: "./core/state.js",
      importedName: "state",
      localName: "runtimeState",
    }],
  );
  assert.deepEqual(
    discoverGlobalStateImportBindings(
      `import { state as runtimeState } from "./core/state.js";`,
    ),
    [{
      importSource: "./core/state.js",
      importedName: "state",
      localName: "runtimeState",
    }],
  );
});

test("policy snapshot rejects observed exact-site occurrences beyond the frozen grant multiplicity", () => {
  const sourceFingerprint = "a".repeat(64);
  const writer = createLegacyWriter();
  writer.bindings[0].grants[0].aliasSites = [{
    alias: "runtimeAlias",
    aliasChain: ["state", "runtimeAlias"],
    operation: "assign",
    key: "bootPhase",
    line: 2,
    column: 3,
    sourceFingerprint,
  }];
  const finding = {
    filePath: writer.path,
    bindingId: "runtime-state",
    operation: "assign",
    key: "bootPhase",
    dynamic: false,
    alias: "runtimeAlias",
    aliasChain: ["state", "runtimeAlias"],
    line: 2,
    column: 3,
    sourceFingerprint,
  };
  const result = validateStateWriterPolicySnapshot({
    policy: {
      schemaVersion: 1,
      baseline: { phase: "P4.0" },
      writers: [writer],
    },
    legacyAllowlistPaths: [writer.path],
    scans: [{
      path: writer.path,
      surface: "production",
      bindingId: "runtime-state",
      findings: [
        finding,
        {
          ...finding,
          line: 20,
          column: 5,
        },
      ],
    }],
  });

  assert.ok(
    result.violations.some(
      ({ code, siteKind }) =>
        code === "observed-site-occurrence-overflow"
        && siteKind === "alias",
    ),
    JSON.stringify(result.violations, null, 2),
  );
});

test("policy snapshot counts one physical source site once across duplicate scanner findings", () => {
  const sourceFingerprint = "b".repeat(64);
  const writer = createLegacyWriter();
  writer.bindings[0].grants[0].aliasSites = [{
    alias: "runtimeAlias",
    aliasChain: ["state", "runtimeAlias"],
    operation: "assign",
    key: "bootPhase",
    line: 2,
    column: 3,
    sourceFingerprint,
  }];
  const finding = {
    filePath: writer.path,
    bindingId: "runtime-state",
    operation: "assign",
    key: "bootPhase",
    dynamic: false,
    alias: "runtimeAlias",
    aliasChain: ["state", "runtimeAlias"],
    line: 2,
    column: 3,
    sourceFingerprint,
  };
  const result = validateStateWriterPolicySnapshot({
    policy: {
      schemaVersion: 1,
      baseline: { phase: "P4.0" },
      writers: [writer],
    },
    legacyAllowlistPaths: [writer.path],
    scans: [{
      path: writer.path,
      surface: "production",
      bindingId: "runtime-state",
      findings: [finding, { ...finding }],
    }],
  });

  assert.ok(
    !result.violations.some(
      ({ code }) => code === "observed-site-occurrence-overflow",
    ),
    JSON.stringify(result.violations, null, 2),
  );
});

test("checker transition rejects legacy retirement without a domain action replacement", () => {
  assert.equal(
    typeof policyChecker.validateStateWriterPolicyTransition,
    "function",
  );
  const previousWriters = [createLegacyWriter()];
  const frozenAuthority = buildLegacyStateWriterSemanticAuthority(
    previousWriters,
  );
  const previousPolicy = createPolicy(
    previousWriters,
    frozenAuthority,
    subtractLegacyStateWriterSemanticAuthority(
      frozenAuthority,
      frozenAuthority,
    ),
  );
  const currentPolicy = createPolicy(
    [],
    frozenAuthority,
    subtractLegacyStateWriterSemanticAuthority(
      frozenAuthority,
      buildLegacyStateWriterSemanticAuthority([]),
    ),
  );

  const violations = policyChecker.validateStateWriterPolicyTransition({
    previousPolicy,
    currentPolicy,
  });

  assert.ok(
    violations.some(
      ({ code, key }) =>
        code === "legacy-membership-retirement-replacement-missing"
        && key === "bootPhase",
    ),
    JSON.stringify(violations, null, 2),
  );
});

test("checker transition rejects reintroduced retired legacy authority", () => {
  assert.equal(
    typeof policyChecker.validateStateWriterPolicyTransition,
    "function",
  );
  const currentWriters = [createLegacyWriter()];
  const frozenAuthority = buildLegacyStateWriterSemanticAuthority(
    currentWriters,
  );
  const emptyAuthority = buildLegacyStateWriterSemanticAuthority([]);
  const previousPolicy = createPolicy(
    [],
    frozenAuthority,
    subtractLegacyStateWriterSemanticAuthority(
      frozenAuthority,
      emptyAuthority,
    ),
  );
  const currentPolicy = createPolicy(
    currentWriters,
    frozenAuthority,
    subtractLegacyStateWriterSemanticAuthority(
      frozenAuthority,
      frozenAuthority,
    ),
  );

  const violations = policyChecker.validateStateWriterPolicyTransition({
    previousPolicy,
    currentPolicy,
  });
  const codes = violations.map(({ code }) => code);

  assert.ok(codes.includes("legacy-semantic-authority-added"), codes.join(", "));
  assert.ok(codes.includes("legacy-semantic-retirement-regressed"), codes.join(", "));
});

test("checker transition freezes the P4 baseline identity and metrics", () => {
  const writers = [createLegacyWriter()];
  const frozenAuthority = buildLegacyStateWriterSemanticAuthority(writers);
  const retiredAuthority = subtractLegacyStateWriterSemanticAuthority(
    frozenAuthority,
    frozenAuthority,
  );
  const previousPolicy = createPolicy(
    writers,
    frozenAuthority,
    retiredAuthority,
  );
  const currentPolicy = structuredClone(previousPolicy);
  currentPolicy.baseline.sourceBaseSha = "2".repeat(40);
  currentPolicy.baselines.closeoutTargets = {
    productionLegacyDirectFiles: 999,
  };

  const codes = policyChecker.validateStateWriterPolicyTransition({
    previousPolicy,
    currentPolicy,
  }).map(({ code }) => code);

  assert.ok(codes.includes("policy-baseline-drift"), codes.join(", "));
  assert.ok(codes.includes("policy-baselines-drift"), codes.join(", "));
});

test("P4.0 progress checkpoint must match the frozen baseline metrics", () => {
  assert.equal(
    typeof policyChecker.validateFrozenP4ProgressCheckpoint,
    "function",
  );
  const policy = createProgressPolicy();
  policy.progress.checkpoints[0].productionLegacyDirectFiles += 10;
  policy.progress.checkpoints[0].productionLegacyMemberships += 10;

  const codes = policyChecker.validateFrozenP4ProgressCheckpoint(policy)
    .map(({ code }) => code);

  assert.ok(
    codes.includes("p4-baseline-progress-checkpoint-drift"),
    codes.join(", "),
  );
});

test("checker transition freezes every previously committed progress checkpoint", () => {
  const previousPolicy = createProgressPolicy();
  const currentPolicy = structuredClone(previousPolicy);
  currentPolicy.progress.checkpoints[0].productionLegacyDirectFiles += 10;
  currentPolicy.progress.checkpoints[0].productionLegacyMemberships += 10;

  const codes = policyChecker.validateStateWriterPolicyTransition({
    previousPolicy,
    currentPolicy,
  }).map(({ code }) => code);

  assert.ok(
    codes.includes("progress-checkpoint-history-drift"),
    codes.join(", "),
  );
  assert.ok(
    codes.includes("p4-baseline-progress-checkpoint-drift"),
    codes.join(", "),
  );
});
