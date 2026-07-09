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
