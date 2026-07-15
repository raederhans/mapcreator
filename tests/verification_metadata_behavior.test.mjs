import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildCoreVerificationPlan,
} from "../tools/run_core_verification.mjs";
import {
  buildRecommendation,
} from "../tools/select_verification_targets.mjs";
import {
  buildRouteIndex,
} from "../tools/test_route_registry.mjs";
import {
  VERIFICATION_DOMAINS,
} from "../tools/verification/verification_domains.mjs";
import {
  buildVerificationMetadataRoutes,
  buildVerifyCoreDefaultGroups,
  buildVerifyCoreMainThreadGroup,
  getVerifyCoreOptionalMainThreadCommands,
  validateVerificationMetadata,
} from "../tools/verification/verification_metadata_helpers.mjs";

const REPO_ROOT = process.cwd();

function readJson(...parts) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ...parts), "utf8"));
}

function commandRefsFromGroups(groups) {
  return groups.flatMap((group) => group.commands);
}

function routeFields(route) {
  return {
    commandRef: route.commandRef,
    sourceRef: route.sourceRef,
    domain: route.domain,
    ownerHint: route.ownerHint,
    layer: route.layer,
    cost: route.cost,
    resourceLocks: route.resourceLocks,
    executionOwner: route.executionOwner,
    ciProfile: route.ciProfile,
  };
}

test("verification metadata validates against package scripts and supervisor domains", () => {
  const packageJson = readJson("package.json");
  const domainRegistry = readJson("tools", "ai_test_supervisor", "domain_registry.json");
  const supervisorDomainIds = domainRegistry.domains.map((domain) => domain.id);

  assert.deepEqual(
    validateVerificationMetadata({
      packageScripts: packageJson.scripts,
      supervisorDomainIds,
    }),
    {
      count: VERIFICATION_DOMAINS.length,
      routeRegistryCount: buildVerificationMetadataRoutes().length,
      verifyCoreDefaultCount: commandRefsFromGroups(buildVerifyCoreDefaultGroups()).length,
      verifyCoreMainThreadCount: buildVerifyCoreMainThreadGroup().commands.length,
      optionalMainThreadCount: getVerifyCoreOptionalMainThreadCommands().length,
    },
  );
});

test("P3.0 renderer pass family route is child-safe, exact, and part of renderer-owner", () => {
  const expectedSourceRefs = [
    "js",
    "dist",
    "tools/renderer_pass_family_inventory.mjs",
    "tests/renderer_pass_family_inventory_behavior.test.mjs",
    "js/core/renderer/render_pipeline_catalog.js",
    "js/core/map_renderer/render_pass_catalog.js",
    "js/core/map_renderer.js",
    "js/core/map_renderer/hgo_runtime_preview_render_owner.js",
    "js/core/renderer/transport_overview_render_owner.js",
    "js/core/state/ui_state.js",
    "docs/active/renderer-pass-family-p3-20260713/plan.md",
    "docs/active/renderer-pass-family-p3-20260713/context.md",
    "docs/active/renderer-pass-family-p3-20260713/task.md",
    "docs/active/renderer-pass-family-coupling-matrix-p3-0-20260713.md",
    "package.json",
  ];
  const entry = VERIFICATION_DOMAINS.find((candidate) => (
    candidate.id === "verify-core:test:node:renderer-pass-family-inventory"
  ));

  assert.deepEqual(entry, {
    id: "verify-core:test:node:renderer-pass-family-inventory",
    commandRef: "test:node:renderer-pass-family-inventory",
    commandType: "package-script",
    packageScriptRequired: true,
    sourceRefs: expectedSourceRefs,
    domain: "renderer-runtime",
    ownerHint: "renderer-runtime",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
    verifyCoreDefaultGroup: "renderer-owner",
    supervisorDomain: "renderer-runtime",
    routeRegistry: true,
  });
  assert.ok(buildVerificationMetadataRoutes().some((route) => route.commandRef === entry.commandRef));
  assert.ok(commandRefsFromGroups(buildVerifyCoreDefaultGroups()).includes(entry.commandRef));
  assert.equal(buildVerifyCoreMainThreadGroup().commands.includes(entry.commandRef), false);
  assert.equal(getVerifyCoreOptionalMainThreadCommands().includes(entry.commandRef), false);

  for (const sourceRef of expectedSourceRefs.filter((candidate) => candidate !== "package.json")) {
    const report = buildRecommendation([sourceRef]);
    assert.equal(report.unmatchedChangedFiles.length, 0, `${sourceRef} should be routed`);
    assert.equal(
      report.recommendedCommands.some((command) => command.commandRef === entry.commandRef),
      true,
      `${sourceRef} should select the inventory contract`,
    );
  }
  const unrelatedReport = buildRecommendation(["tests/render_pass_catalog_behavior.test.mjs"]);
  assert.equal(
    unrelatedReport.recommendedCommands.some((command) => command.commandRef === entry.commandRef),
    false,
  );
  const hgoOwnerReport = buildRecommendation(["js/core/map_renderer/hgo_runtime_preview_render_owner.js"]);
  assert.equal(
    hgoOwnerReport.recommendedCommands.some((command) => command.commandRef === entry.commandRef),
    true,
  );
  for (const routedProductPath of ["js/core/renderer/ocean_render_owner.js", "dist/app.js"]) {
    const productReport = buildRecommendation([routedProductPath]);
    assert.equal(productReport.unmatchedChangedFiles.length, 0, `${routedProductPath} should be routed`);
    assert.equal(
      productReport.recommendedCommands.some((command) => command.commandRef === entry.commandRef),
      true,
      `${routedProductPath} should select the inventory contract`,
    );
  }
});

test("P3.1, P3.2, and P3.3a pass-family contracts stay in the child-safe renderer lane", () => {
  const expectedEntries = [
    {
      id: "verify-core:test:node:visual-effects-pass-owner",
      commandRef: "test:node:visual-effects-pass-owner",
      requiredSourceRefs: [
        "js/core/map_renderer.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "tests/visual_effects_pass_owner_behavior.test.mjs",
      ],
    },
    {
      id: "verify-core:test:node:context-pass-orchestrator-owner",
      commandRef: "test:node:context-pass-orchestrator-owner",
      requiredSourceRefs: [
        "js/core/map_renderer.js",
        "js/core/renderer/context_pass_orchestrator_owner.js",
        "tests/context_pass_orchestrator_owner_behavior.test.mjs",
      ],
    },
    {
      id: "verify-core:test:node:renderer-political-pass-orchestration-preflight",
      commandRef: "test:node:renderer-political-pass-orchestration-preflight",
      requiredSourceRefs: [
        "js/core",
        "tests/renderer_political_pass_orchestration_preflight.test.mjs",
        "docs/active/renderer-political-pass-preflight-p3-3a-20260714.md",
      ],
    },
    {
      id: "verify-core:test:python:map-renderer-render-pipeline-passes-boundary",
      commandRef: "test:python:map-renderer-render-pipeline-passes-boundary",
      requiredSourceRefs: [
        "js/core/map_renderer.js",
        "js/core/renderer/visual_effects_pass_owner.js",
        "js/core/renderer/context_pass_orchestrator_owner.js",
        "tests/test_map_renderer_render_pipeline_passes_boundary_contract.py",
      ],
    },
  ];

  for (const expected of expectedEntries) {
    const entry = VERIFICATION_DOMAINS.find((candidate) => candidate.id === expected.id);
    assert.ok(entry, `${expected.id} should exist`);
    assert.equal(entry.commandRef, expected.commandRef);
    assert.equal(entry.domain, "renderer-runtime");
    assert.equal(entry.ownerHint, "renderer-runtime");
    assert.equal(entry.executionOwner, "child-safe");
    assert.equal(entry.verifyCoreDefaultGroup, "renderer-owner");
    assert.equal(entry.routeRegistry, true);
    for (const sourceRef of expected.requiredSourceRefs) {
      assert.ok(entry.sourceRefs.includes(sourceRef), `${entry.id} should route ${sourceRef}`);
    }
    assert.ok(buildVerificationMetadataRoutes().some((route) => route.commandRef === entry.commandRef));
    assert.ok(commandRefsFromGroups(buildVerifyCoreDefaultGroups()).includes(entry.commandRef));
  }
});

test("P3 pass-family owner changes select their full contract, dist, browser, and perf lanes", () => {
  const packageJson = readJson("package.json");
  const contextReport = buildRecommendation([
    "js/core/renderer/context_pass_orchestrator_owner.js",
  ]);
  const contextCommandRefs = new Set(
    contextReport.recommendedCommands.map((command) => command.commandRef),
  );
  assert.deepEqual(contextReport.unmatchedChangedFiles, []);
  for (const commandRef of [
    "test:node:context-pass-orchestrator-owner",
    "test:node:renderer-pass-family-inventory",
    "test:python:map-renderer-render-pipeline-passes-boundary",
    "test:node:physical-layer-contracts",
    "test:node:river-layer-contracts",
    "test:node:scenario-chunk-contracts",
    "verify:pages-dist",
    "perf:gate",
    "test:e2e:physical-layer-runtime-contract",
    "test:e2e:water-rendering",
    "test:e2e:scenario-resilience",
    "test:e2e:tno-contracts",
    "test:e2e:city-rendering",
  ]) {
    assert.equal(
      contextCommandRefs.has(commandRef),
      true,
      `context owner should select ${commandRef}`,
    );
  }

  const visualReport = buildRecommendation([
    "js/core/renderer/visual_effects_pass_owner.js",
  ]);
  const visualCommandRefs = new Set(
    visualReport.recommendedCommands.map((command) => command.commandRef),
  );
  assert.deepEqual(visualReport.unmatchedChangedFiles, []);
  for (const commandRef of [
    "test:node:visual-effects-pass-owner",
    "test:node:renderer-pass-family-inventory",
    "test:python:map-renderer-render-pipeline-passes-boundary",
    "verify:pages-dist",
    "perf:gate",
    "test:e2e:layer:regression",
    "test:e2e:city-rendering",
  ]) {
    assert.equal(
      visualCommandRefs.has(commandRef),
      true,
      `visual effects owner should select ${commandRef}`,
    );
  }

  const politicalPreflightReport = buildRecommendation([
    "tests/renderer_political_pass_orchestration_preflight.test.mjs",
  ]);
  const politicalPreflightCommandRefs = new Set(
    politicalPreflightReport.recommendedCommands.map((command) => command.commandRef),
  );
  assert.deepEqual(politicalPreflightReport.unmatchedChangedFiles, []);
  assert.equal(
    politicalPreflightCommandRefs.has("test:node:renderer-political-pass-orchestration-preflight"),
    true,
  );

  assert.match(
    packageJson.scripts["test:python:map-renderer-render-pipeline-passes-boundary"],
    /tests\.test_map_renderer_render_pipeline_passes_boundary_contract[\s\S]*tests\.test_map_renderer_strategic_values_render_contract/,
  );
  const pipelineBoundaryEntry = VERIFICATION_DOMAINS.find((candidate) => (
    candidate.id === "verify-core:test:python:map-renderer-render-pipeline-passes-boundary"
  ));
  assert.ok(
    pipelineBoundaryEntry.sourceRefs.includes(
      "tests/test_map_renderer_strategic_values_render_contract.py",
    ),
  );
});

test("verify-core default plan is generated from verification metadata", () => {
  const packageJson = readJson("package.json");
  const metadataDefaultRefs = commandRefsFromGroups(buildVerifyCoreDefaultGroups());
  const plan = buildCoreVerificationPlan({ packageScripts: packageJson.scripts });

  assert.deepEqual(
    plan.commandsToRun.map((entry) => entry.commandRef),
    metadataDefaultRefs,
  );
  assert.equal(plan.omittedCommands.length, 0);
  assert.equal(plan.duplicateCommands.length, 0);
  assert.ok(metadataDefaultRefs.includes("test:node:verification-metadata"));
});

test("verify-core main-thread and optional E2E commands are generated from verification metadata", () => {
  const packageJson = readJson("package.json");
  const includeMainThreadPlan = buildCoreVerificationPlan({
    packageScripts: packageJson.scripts,
    includeMainThread: true,
  });

  assert.deepEqual(
    includeMainThreadPlan.groups.find((group) => group.id === "main-thread-e2e")?.commands.map((entry) => entry.commandRef),
    buildVerifyCoreMainThreadGroup().commands,
  );
  assert.deepEqual(
    includeMainThreadPlan.skippedMainThreadCommands.map((entry) => entry.commandRef),
    getVerifyCoreOptionalMainThreadCommands(),
  );
});

test("route registry consumes verification metadata route projection", () => {
  const routesById = new Map(buildRouteIndex().map((route) => [route.id, route]));
  for (const metadataRoute of buildVerificationMetadataRoutes()) {
    assert.deepEqual(
      routeFields(routesById.get(metadataRoute.id)),
      routeFields(metadataRoute),
      `${metadataRoute.id} should match the verification metadata route projection`,
    );
  }
});

test("metadata files route to test-routing without unmatched changed files", () => {
  const report = buildRecommendation([
    "tools/verification/verification_domains.mjs",
    "tools/verification/verification_metadata_helpers.mjs",
    "tests/verification_metadata_behavior.test.mjs",
    "docs/testing/verification-metadata.md",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("test-routing"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:verification-metadata"));
});

test("renderer runtime context foundation files route to renderer owner verification", () => {
  const report = buildRecommendation([
    "js/core/map_renderer/renderer_runtime_context.js",
    "tests/renderer_runtime_context_foundation_behavior.test.mjs",
    "docs/active/renderer-runtime-context-foundation-p1-0-20260709.md",
    "package.json",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("renderer-runtime"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-foundation"));
});

test("renderer runtime context receiver files route to renderer owner verification", () => {
  const report = buildRecommendation([
    "js/core/map_renderer.js",
    "js/core/map_renderer/renderer_runtime_context.js",
    "js/core/map_renderer/render_pass_cache_host_owner.js",
    "js/core/map_renderer/render_pass_commit_accounting_owner.js",
    "tests/renderer_runtime_context_receiver_behavior.test.mjs",
    "docs/active/renderer-runtime-context-first-receiver-p1-1-20260709.md",
    "package.json",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("renderer-runtime"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-receiver"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:render-pass-cache-host-owner-suite"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:render-pass-commit-accounting-owner-suite"));
});

test("renderer runtime context render cache files route to renderer owner verification", () => {
  const report = buildRecommendation([
    "js/core/map_renderer.js",
    "js/core/map_renderer/renderer_runtime_context.js",
    "js/core/renderer/render_cache_owner.js",
    "tests/renderer_runtime_context_render_cache_behavior.test.mjs",
    "tests/renderer_runtime_context_receiver_behavior.test.mjs",
    "tests/test_map_renderer_render_cache_owner_boundary_contract.py",
    "docs/active/renderer-runtime-context-render-cache-read-model-p1-2-20260709.md",
    "package.json",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("renderer-runtime"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-render-cache"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-receiver"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:render-cache-owner"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:python:map-renderer-render-cache-owner-boundary"));
});

test("renderer runtime context projection and viewport files route to renderer owner verification", () => {
  const report = buildRecommendation([
    "js/core/map_renderer.js",
    "js/core/map_renderer/renderer_runtime_context.js",
    "js/core/renderer/renderer_projection_path_owner.js",
    "js/core/renderer/viewport_read_model_owner.js",
    "js/core/renderer/viewport_command_owner.js",
    "tests/renderer_runtime_context_projection_viewport_behavior.test.mjs",
    "tests/renderer_runtime_context_receiver_behavior.test.mjs",
    "tests/test_map_renderer_projection_viewport_context_boundary_contract.py",
    "docs/active/renderer-runtime-context-projection-viewport-p1-3-20260709.md",
    "package.json",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("renderer-runtime"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-projection-viewport"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-receiver"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:python:map-renderer-projection-viewport-context-boundary"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-projection-path-owner"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:viewport-read-model-owner"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:viewport-command-owner"));
});

test("renderer runtime context viewport mutation files route to renderer owner verification", () => {
  const report = buildRecommendation([
    "js/core/map_renderer.js",
    "js/core/map_renderer/renderer_runtime_context.js",
    "js/core/renderer/renderer_fit_projection_owner.js",
    "js/core/renderer/renderer_viewport_update_owner.js",
    "js/core/renderer/viewport_resize_lifecycle_owner.js",
    "tests/renderer_runtime_context_viewport_mutation_behavior.test.mjs",
    "tests/renderer_runtime_context_receiver_behavior.test.mjs",
    "tests/renderer_viewport_update_owner_behavior.test.mjs",
    "tests/viewport_resize_lifecycle_owner_behavior.test.mjs",
    "tests/test_map_renderer_viewport_mutation_context_boundary_contract.py",
    "docs/active/renderer-runtime-context-viewport-mutation-chain-p1-4-20260709.md",
    "package.json",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("renderer-runtime"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-viewport-mutation"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:python:map-renderer-viewport-mutation-context-boundary"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-viewport-update-owner"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:viewport-resize-lifecycle-owner"));
});

test("renderer runtime context interaction files route to interaction owner verification", () => {
  const report = buildRecommendation([
    "js/core/map_renderer.js",
    "js/core/map_renderer/renderer_runtime_context.js",
    "js/core/renderer/zoom_interaction_lifecycle_owner.js",
    "js/core/renderer/map_interaction_event_binding_owner.js",
    "tests/renderer_runtime_context_interaction_behavior.test.mjs",
    "tests/renderer_runtime_context_receiver_behavior.test.mjs",
    "tests/zoom_interaction_lifecycle_owner_behavior.test.mjs",
    "tests/map_interaction_event_binding_owner_behavior.test.mjs",
    "tests/test_map_renderer_interaction_context_boundary_contract.py",
    "docs/active/renderer-runtime-context-interaction-p1-5-20260709.md",
    "package.json",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("renderer-runtime"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-interaction"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-receiver"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:zoom-interaction-lifecycle-owner"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:map-interaction-event-binding-owner"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:python:map-renderer-interaction-context-boundary"));
});

test("renderer runtime context hit hover files route to hit hover owner verification", () => {
  const report = buildRecommendation([
    "js/core/map_renderer.js",
    "js/core/map_renderer/renderer_runtime_context.js",
    "js/core/map_renderer/hit_canvas_scheduling_owner.js",
    "js/core/map_renderer/map_hover_interaction_owner.js",
    "tests/renderer_runtime_context_hit_hover_behavior.test.mjs",
    "tests/renderer_runtime_context_interaction_behavior.test.mjs",
    "tests/hit_canvas_scheduling_owner_behavior.test.mjs",
    "tests/hit_canvas_scheduling_owner_inventory.test.mjs",
    "tests/map_hover_interaction_owner_behavior.test.mjs",
    "tests/map_hover_interaction_owner_inventory.test.mjs",
    "tests/test_map_renderer_hit_hover_context_boundary_contract.py",
    "docs/active/renderer-runtime-context-hit-hover-p1-6-20260709.md",
    "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
    "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
    "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
    "package.json",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("renderer-runtime"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-runtime-context-hit-hover"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:python:map-renderer-hit-hover-context-boundary"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:hit-canvas-scheduling-owner-suite"));
});

test("renderer click selection P1.8 files route to owner and both canonical boundary commands", () => {
  const expectedEntries = new Map([
    [
      "verify-core:test:node:click-selection-transaction-owner",
      "test:node:click-selection-transaction-owner",
    ],
    [
      "verify-core:test:node:renderer-click-selection-transaction-inventory",
      "test:node:renderer-click-selection-transaction-inventory",
    ],
    [
      "verify-core:test:python:map-renderer-click-selection-transaction-boundary",
      "test:python:map-renderer-click-selection-transaction-boundary",
    ],
  ]);
  for (const [id, commandRef] of expectedEntries) {
    const entry = VERIFICATION_DOMAINS.find((candidate) => candidate.id === id);
    assert.ok(entry, `${id} should exist in verification metadata`);
    assert.deepEqual(
      {
        commandRef: entry.commandRef,
        domain: entry.domain,
        ownerHint: entry.ownerHint,
        layer: entry.layer,
        cost: entry.cost,
        resourceLocks: entry.resourceLocks,
        executionOwner: entry.executionOwner,
        ciProfile: entry.ciProfile,
        verifyCoreDefaultGroup: entry.verifyCoreDefaultGroup,
        supervisorDomain: entry.supervisorDomain,
        routeRegistry: entry.routeRegistry,
      },
      {
        commandRef,
        domain: "renderer-runtime",
        ownerHint: "renderer-runtime",
        layer: "contract",
        cost: "fast",
        resourceLocks: [],
        executionOwner: "child-safe",
        ciProfile: "pr-fast",
        verifyCoreDefaultGroup: "renderer-owner",
        supervisorDomain: "renderer-runtime",
        routeRegistry: true,
      },
    );
    assert.ok(entry.sourceRefs.includes("docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md"));
    assert.ok(entry.sourceRefs.includes("docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md"));
    assert.ok(entry.sourceRefs.includes("js/core/map_renderer/click_selection_transaction_owner.js"));
    assert.ok(entry.sourceRefs.includes("tests/click_selection_transaction_owner_behavior.test.mjs"));
  }

  const ownerOnlyReport = buildRecommendation([
    "js/core/map_renderer/click_selection_transaction_owner.js",
  ]);
  assert.deepEqual(ownerOnlyReport.unmatchedChangedFiles, []);
  for (const commandRef of [
    "test:node:click-selection-transaction-owner",
    "test:node:renderer-click-selection-transaction-inventory",
    "test:python:map-renderer-click-selection-transaction-boundary",
    "verify:architecture-boundaries",
    "verify:pages-dist",
  ]) {
    assert.ok(
      ownerOnlyReport.recommendedCommands.some((command) => command.commandRef === commandRef),
      `owner-only routing must recommend ${commandRef}`,
    );
  }

  const report = buildRecommendation([
    "docs/active/_worktree_registry.md",
    "docs/active/renderer-click-selection-transaction-preflight-20260702.md",
    "docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md",
    "docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md",
    "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
    "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
    "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
    "package.json",
    "js/core/map_renderer.js",
    "js/core/map_renderer/click_selection_transaction_owner.js",
    "tests/click_selection_transaction_owner_behavior.test.mjs",
    "tests/renderer_click_selection_transaction_inventory_boundary.test.mjs",
    "tests/test_map_renderer_click_selection_transaction_boundary_contract.py",
    "tests/verification_metadata_behavior.test.mjs",
    "tests/verify_core_runner_behavior.test.mjs",
    "tools/check_architecture_boundaries.mjs",
    "tools/verification/verification_domains.mjs",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("renderer-runtime"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:click-selection-transaction-owner"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-click-selection-transaction-inventory"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:python:map-renderer-click-selection-transaction-boundary"));
});

test("renderer draw canvas P2.1 files route to owner behavior inventory and boundary commands", () => {
  const expectedEntries = new Map([
    [
      "verify-core:test:node:draw-canvas-orchestration-owner",
      "test:node:draw-canvas-orchestration-owner",
    ],
    [
      "verify-core:test:node:renderer-draw-canvas-orchestration-inventory",
      "test:node:renderer-draw-canvas-orchestration-inventory",
    ],
    [
      "verify-core:test:python:map-renderer-draw-canvas-orchestration-boundary",
      "test:python:map-renderer-draw-canvas-orchestration-boundary",
    ],
  ]);
  for (const [id, commandRef] of expectedEntries) {
    const entry = VERIFICATION_DOMAINS.find((candidate) => candidate.id === id);
    assert.ok(entry, `${id} should exist in verification metadata`);
    assert.deepEqual(
      {
        commandRef: entry.commandRef,
        domain: entry.domain,
        ownerHint: entry.ownerHint,
        layer: entry.layer,
        cost: entry.cost,
        resourceLocks: entry.resourceLocks,
        executionOwner: entry.executionOwner,
        ciProfile: entry.ciProfile,
        verifyCoreDefaultGroup: entry.verifyCoreDefaultGroup,
        supervisorDomain: entry.supervisorDomain,
        routeRegistry: entry.routeRegistry,
      },
      {
        commandRef,
        domain: "renderer-runtime",
        ownerHint: "renderer-runtime",
        layer: "contract",
        cost: "fast",
        resourceLocks: [],
        executionOwner: "child-safe",
        ciProfile: "pr-fast",
        verifyCoreDefaultGroup: "renderer-owner",
        supervisorDomain: "renderer-runtime",
        routeRegistry: true,
      },
    );
    assert.ok(entry.sourceRefs.includes("js/core/map_renderer/draw_canvas_orchestration_owner.js"));
    assert.ok(entry.sourceRefs.includes("tests/draw_canvas_orchestration_owner_behavior.test.mjs"));
    assert.ok(entry.sourceRefs.includes("docs/archive/renderer-frame-orchestration-p2-20260710/renderer-draw-canvas-orchestration-owner-p2-1-20260710.md"));
  }

  const ownerOnlyReport = buildRecommendation([
    "js/core/map_renderer/draw_canvas_orchestration_owner.js",
  ]);
  assert.deepEqual(ownerOnlyReport.unmatchedChangedFiles, []);
  for (const commandRef of [
    "test:node:draw-canvas-orchestration-owner",
    "test:node:renderer-draw-canvas-orchestration-inventory",
    "test:python:map-renderer-draw-canvas-orchestration-boundary",
    "verify:architecture-boundaries",
    "verify:pages-dist",
  ]) {
    assert.ok(
      ownerOnlyReport.recommendedCommands.some((command) => command.commandRef === commandRef),
      `owner-only routing must recommend ${commandRef}`,
    );
  }

  const report = buildRecommendation([
    "docs/active/_worktree_registry.md",
    "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-draw-canvas-orchestration-preflight-20260702.md",
    "docs/archive/renderer-frame-orchestration-p2-20260710/renderer-draw-canvas-orchestration-owner-p2-1-20260710.md",
    "docs/archive/renderer-frame-orchestration-p2-20260710/context.md",
    "docs/archive/renderer-frame-orchestration-p2-20260710/task.md",
    "package.json",
    "js/core/map_renderer.js",
    "js/core/map_renderer/draw_canvas_orchestration_owner.js",
    "tests/draw_canvas_orchestration_owner_behavior.test.mjs",
    "tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs",
    "tests/test_map_renderer_draw_canvas_orchestration_owner_boundary_contract.py",
    "tests/verification_metadata_behavior.test.mjs",
    "tests/verify_core_runner_behavior.test.mjs",
    "tools/check_architecture_boundaries.mjs",
    "tools/verification/verification_domains.mjs",
  ]);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.coveredDomains.includes("renderer-runtime"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:draw-canvas-orchestration-owner"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:renderer-draw-canvas-orchestration-inventory"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:python:map-renderer-draw-canvas-orchestration-boundary"));
});

test("renderer frame compositor P2.2 files route to behavior inventory boundary and Pages commands", () => {
  const expectedEntries = new Map([
    [
      "verify-core:test:node:cached-pass-compositor-owner",
      "test:node:cached-pass-compositor-owner",
    ],
    [
      "verify-core:test:node:transformed-frame-compositor-owner",
      "test:node:transformed-frame-compositor-owner",
    ],
    [
      "verify-core:test:python:map-renderer-frame-compositor-boundary",
      "test:python:map-renderer-frame-compositor-boundary",
    ],
  ]);
  for (const [id, commandRef] of expectedEntries) {
    const entry = VERIFICATION_DOMAINS.find((candidate) => candidate.id === id);
    assert.ok(entry, `${id} should exist in verification metadata`);
    assert.deepEqual(
      {
        commandRef: entry.commandRef,
        domain: entry.domain,
        ownerHint: entry.ownerHint,
        layer: entry.layer,
        cost: entry.cost,
        resourceLocks: entry.resourceLocks,
        executionOwner: entry.executionOwner,
        ciProfile: entry.ciProfile,
        verifyCoreDefaultGroup: entry.verifyCoreDefaultGroup,
        supervisorDomain: entry.supervisorDomain,
        routeRegistry: entry.routeRegistry,
      },
      {
        commandRef,
        domain: "renderer-runtime",
        ownerHint: "renderer-runtime",
        layer: "contract",
        cost: "fast",
        resourceLocks: [],
        executionOwner: "child-safe",
        ciProfile: "pr-fast",
        verifyCoreDefaultGroup: "renderer-owner",
        supervisorDomain: "renderer-runtime",
        routeRegistry: true,
      },
    );
    if (commandRef === "test:node:cached-pass-compositor-owner") {
      assert.ok(entry.sourceRefs.includes("js/core/renderer/cached_pass_compositor_owner.js"));
      assert.ok(entry.sourceRefs.includes("tests/cached_pass_compositor_owner_behavior.test.mjs"));
    }
    if (commandRef === "test:node:transformed-frame-compositor-owner") {
      assert.ok(entry.sourceRefs.includes("js/core/map_renderer/transformed_frame_compositor_owner.js"));
      assert.ok(entry.sourceRefs.includes("tests/transformed_frame_compositor_owner_behavior.test.mjs"));
    }
    assert.ok(entry.sourceRefs.some((sourceRef) => sourceRef.includes("renderer-") && sourceRef.endsWith(".md")));
  }

  const ownerOnlyReport = buildRecommendation([
    "js/core/renderer/cached_pass_compositor_owner.js",
    "js/core/map_renderer/transformed_frame_compositor_owner.js",
  ]);
  assert.deepEqual(ownerOnlyReport.unmatchedChangedFiles, []);
  for (const commandRef of [
    "test:node:cached-pass-compositor-owner",
    "test:node:transformed-frame-compositor-owner",
    "test:node:renderer-draw-canvas-orchestration-inventory",
    "test:python:map-renderer-frame-compositor-boundary",
    "verify:architecture-boundaries",
    "verify:pages-dist",
  ]) {
    assert.ok(
      ownerOnlyReport.recommendedCommands.some((command) => command.commandRef === commandRef),
      `cached-pass owner routing must recommend ${commandRef}`,
    );
  }
  const transformedRuntimeEntry = VERIFICATION_DOMAINS.find((entry) => entry.id === "renderer:transformed-frame-compositor-runtime");
  assert.ok(transformedRuntimeEntry);
  assert.equal(transformedRuntimeEntry.commandRef, "test:e2e:dev:scenario-chunk-runtime");
  assert.equal(transformedRuntimeEntry.executionOwner, "main-thread");
  assert.ok(transformedRuntimeEntry.sourceRefs.includes("js/core/map_renderer/transformed_frame_compositor_owner.js"));
  assert.ok(ownerOnlyReport.mainThreadSerialVerification.some((command) => (
    command.commandRef === "test:e2e:dev:scenario-chunk-runtime"
  )));
});

test("Williams crossover tooling routes to child-safe governance plus an explicit heavy perf lane", () => {
  const policyEntry = VERIFICATION_DOMAINS.find((entry) => entry.id === "infra:williams-crossover-governance");
  const jobRunnerEntry = VERIFICATION_DOMAINS.find((entry) => entry.id === "infra:williams-crossover-job-runner");
  const liveEntry = VERIFICATION_DOMAINS.find((entry) => entry.id === "perf:williams-crossover-live");
  const liveTelemetryEntry = VERIFICATION_DOMAINS.find((entry) => entry.id === "perf:williams-crossover-telemetry-live");
  assert.ok(policyEntry);
  assert.ok(jobRunnerEntry);
  assert.ok(liveEntry);
  assert.ok(liveTelemetryEntry);
  assert.equal(policyEntry.commandRef, "test:node:williams-crossover-governance");
  assert.equal(policyEntry.executionOwner, "child-safe");
  assert.equal(policyEntry.verifyCoreDefaultGroup, "infra");
  assert.equal(jobRunnerEntry.commandRef, "test:node:williams-crossover-job-runner");
  assert.equal(jobRunnerEntry.executionOwner, "child-safe");
  assert.equal(jobRunnerEntry.verifyCoreDefaultGroup, "infra");
  assert.deepEqual(liveEntry, {
    ...liveEntry,
    commandRef: "perf:williams-crossover:run",
    domain: "perf",
    ownerHint: "perf-runtime",
    layer: "heavy",
    cost: "heavy",
    resourceLocks: ["perf-dev-server", "browser-dev-server", "playwright-browser", ".runtime-output", "system-power-scheme"],
    executionOwner: "main-thread",
    ciProfile: "perf-pr-gate",
    supervisorDomain: "perf",
    routeRegistry: true,
  });
  assert.equal(liveEntry.verifyCoreDefaultGroup, undefined);
  assert.deepEqual(liveEntry.sourceRefs, [
    "tools/perf/williams_crossover_policy.mjs",
    "tools/perf/run_williams_crossover.mjs",
    "tools/perf/williams_crossover_windows_runtime.mjs",
    "tools/perf/williams_crossover_windows_job_runner.cs",
    "tools/perf/williams_crossover_power_scheme.ps1",
    "tools/perf/run_baseline.mjs",
    "tools/perf/render_sample_role_policy.mjs",
    "package-lock.json",
    "package.json",
  ]);
  assert.deepEqual(liveTelemetryEntry, {
    ...liveTelemetryEntry,
    commandRef: "test:node:williams-crossover-telemetry-live",
    domain: "perf",
    ownerHint: "perf-runtime",
    layer: "regression",
    cost: "contract",
    resourceLocks: ["perf-dev-server"],
    executionOwner: "main-thread",
    ciProfile: "perf-pr-gate",
    supervisorDomain: "perf",
    routeRegistry: true,
  });
  assert.equal(liveTelemetryEntry.verifyCoreDefaultGroup, undefined);

  const runtimeReport = buildRecommendation([
    "tools/perf/williams_crossover_policy.mjs",
    "tools/perf/run_williams_crossover.mjs",
    "tools/perf/williams_crossover_windows_runtime.mjs",
  ]);
  assert.deepEqual(runtimeReport.unmatchedChangedFiles, []);
  assert.ok(runtimeReport.coveredDomains.includes("perf"));
  assert.ok(runtimeReport.recommendedCommands.some((command) => command.commandRef === "test:node:williams-crossover-governance"));
  assert.ok(runtimeReport.recommendedCommands.some((command) => command.commandRef === "test:node:williams-crossover-job-runner"));
  assert.ok(runtimeReport.mainThreadSerialVerification.some((command) => command.commandRef === "perf:williams-crossover:run"));
  assert.ok(runtimeReport.mainThreadSerialVerification.some((command) => command.commandRef === "test:node:williams-crossover-telemetry-live"));

  const staticReport = buildRecommendation([
    "tests/williams_crossover_governance_behavior.test.mjs",
    "docs/archive/renderer-frame-orchestration-p2-20260710/plan.md",
    "docs/archive/renderer-frame-orchestration-p2-20260710/rerun07-final-repeat-governance.md",
    "docs/active/_worktree_registry.md",
  ]);
  assert.deepEqual(staticReport.unmatchedChangedFiles, []);
  assert.ok(staticReport.recommendedCommands.some((command) => command.commandRef === "test:node:williams-crossover-governance"));
  assert.equal(staticReport.mainThreadSerialVerification.some((command) => command.commandRef === "perf:williams-crossover:run"), false);

  const jobTestReport = buildRecommendation([
    "tests/williams_crossover_windows_job_runner_behavior.test.mjs",
    "tests/williams_crossover_windows_job_runner_integration.test.mjs",
  ]);
  assert.deepEqual(jobTestReport.unmatchedChangedFiles, []);
  assert.ok(jobTestReport.recommendedCommands.some((command) => command.commandRef === "test:node:williams-crossover-job-runner"));
  assert.equal(jobTestReport.mainThreadSerialVerification.some((command) => command.commandRef === "perf:williams-crossover:run"), false);
  assert.ok(jobTestReport.mainThreadSerialVerification.some((command) => command.commandRef === "test:node:williams-crossover-telemetry-live"));

  const defaultCoreCommands = buildVerifyCoreDefaultGroups()
    .flatMap((group) => group.commands.map((command) => command.commandRef));
  assert.equal(defaultCoreCommands.includes("test:node:williams-crossover-telemetry-live"), false);

  for (const sourceRef of ["tools/perf/run_baseline.mjs", "tools/perf/render_sample_role_policy.mjs", "package-lock.json"]) {
    const identityInputReport = buildRecommendation([sourceRef]);
    assert.ok(identityInputReport.mainThreadSerialVerification.some((command) => command.commandRef === "perf:williams-crossover:run"), sourceRef);
  }
});

test("dated schema-2 baseline artifacts route to the perf contract", () => {
  const entry = VERIFICATION_DOMAINS.find((candidate) => candidate.id === "infra:render-sample-role-policy");
  assert.ok(entry);
  for (const sourceRef of [
    "docs/perf/baseline_2026-07-14.json",
    "docs/perf/baseline_2026-07-14.md",
  ]) {
    assert.ok(entry.sourceRefs.includes(sourceRef), `${sourceRef} must be declared by the perf contract`);
    const report = buildRecommendation([sourceRef]);
    assert.deepEqual(report.unmatchedChangedFiles, []);
    assert.ok(
      report.recommendedCommands.some((command) => command.commandRef === entry.commandRef),
      `${sourceRef} must select ${entry.commandRef}`,
    );
  }
});

test("city policy and live power preflight have named verification ownership", () => {
  const cityPolicyEntry = VERIFICATION_DOMAINS.find((entry) => entry.id === "verify-core:test:node:city-points-render-owner");
  assert.ok(cityPolicyEntry);
  assert.equal(cityPolicyEntry.commandRef, "test:node:city-points-render-owner");
  assert.equal(cityPolicyEntry.executionOwner, "child-safe");
  assert.equal(cityPolicyEntry.verifyCoreDefaultGroup, "renderer-owner");
  assert.ok(cityPolicyEntry.sourceRefs.includes("tests/urban_city_policy_strategic_values_behavior.test.mjs"));

  const cityBoundaryEntry = VERIFICATION_DOMAINS.find((entry) => entry.id === "verify-core:test:python:map-renderer-city-points-boundary");
  assert.ok(cityBoundaryEntry);
  assert.equal(cityBoundaryEntry.commandRef, "test:python:map-renderer-city-points-boundary");
  assert.equal(cityBoundaryEntry.executionOwner, "child-safe");

  const powerPreflightEntry = VERIFICATION_DOMAINS.find((entry) => entry.id === "perf:williams-power-scheme-live-preflight");
  assert.ok(powerPreflightEntry);
  assert.equal(powerPreflightEntry.commandRef, "perf:williams-power-scheme:live-preflight");
  assert.equal(powerPreflightEntry.executionOwner, "main-thread");
  assert.equal(powerPreflightEntry.optionalMainThread, true);
  assert.deepEqual(powerPreflightEntry.resourceLocks, ["system-power-scheme"]);
  assert.ok(powerPreflightEntry.sourceRefs.includes("tools/perf/williams_crossover_power_scheme.ps1"));

  const report = buildRecommendation([
    "js/core/renderer/urban_city_policy.js",
    "tests/urban_city_policy_strategic_values_behavior.test.mjs",
    "tools/perf/williams_crossover_power_scheme.ps1",
  ]);
  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:node:city-points-render-owner"));
  assert.ok(report.recommendedCommands.some((command) => command.commandRef === "test:python:map-renderer-city-points-boundary"));
  assert.ok(report.mainThreadSerialVerification.some((command) => (
    command.commandRef === "perf:williams-power-scheme:live-preflight"
  )));
});
