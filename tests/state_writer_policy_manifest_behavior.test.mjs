import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

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
  buildP4CloseoutTargets,
  buildLegacyStateWriterSemanticAuthority,
  buildStateWriterBindingGrants,
  buildStateWriterPolicySnapshot,
  discoverCandidatePaths,
  discoverStateWriterBindingsForSource,
  hasCanonicalStateMutationFinding,
  readStateWriterPolicy,
  resolveGitCommitSha,
  scanStateWriterPolicySnapshot,
  subtractLegacyStateWriterSemanticAuthority,
  validateLegacyStateWriterSemanticAuthority,
  validateLegacyStateWriterSemanticLedger,
  validateLegacyMembershipRetirementReplacements,
  validateStateWriterPolicyProgression,
} from "../tools/build_state_writer_policy.mjs";
import {
  buildStateWriterVerificationIdentity,
  buildStateWriterCloseoutTargetViolations,
  buildStateWriterPolicyReport,
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

  assert.equal(expectedLazyKeys.length, 55);
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
    baseSha: checkedIn.baseline.sourceBaseSha,
    generatedAt: checkedIn.baseline.generatedAt,
  });

  assert.deepEqual(rebuilt, checkedIn);
});

test("later policy builds preserve the frozen P4.0 denominator", async () => {
  const checkedIn = await readStateWriterPolicy();
  const rebuilt = await buildStateWriterPolicySnapshot({
    phase: "P4.1",
    previousPolicy: checkedIn,
  });

  assert.deepEqual(rebuilt.baseline, checkedIn.baseline);
  assert.deepEqual(rebuilt.baselines, checkedIn.baselines);
  assert.equal(rebuilt.progress.latestPhase, "P4.1");
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
  actionWriter.bindings[0].authority = "domain-action";
  assert.deepEqual(
    validateLegacyMembershipRetirementReplacements({
      previousWriters,
      writers: [actionWriter],
    }),
    [],
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
  const report = await buildStateWriterPolicyReport({ phase: "P4.0" });

  assert.equal(report.verdict, "pass", JSON.stringify(report.violations, null, 2));
  assert.equal(report.metrics.unknownCandidateBindings, 0);
  assert.equal(report.metrics.stalePolicyBindings, 0);
  assert.equal(report.metrics.legacyMemberships.production, 1187);
  assert.equal(report.metrics.allMemberships.production, 1188);
  assert.deepEqual(
    report.metrics.bindingScoped.memberships,
    report.frozenMetrics.bindingScopedMemberships,
  );
  assert.deepEqual(
    report.metrics.bindingScoped.sites,
    report.frozenMetrics.bindingScopedSites,
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
  const report = await buildStateWriterPolicyReport({ phase: "P4.2c" });
  assert.equal(report.phase, "P4.2c");
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
