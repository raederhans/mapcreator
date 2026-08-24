import assert from "node:assert/strict";
import test from "node:test";
import { buildRecommendation } from "../tools/select_verification_targets.mjs";
import { buildRouteIndex } from "../tools/test_route_registry.mjs";

const SF_ATS_CHANGED_FILES = [
  "AGENTS.md",
  "docs/testing/sf-ats-overview.md",
  "tools/ai_test_supervisor/domain_registry.json",
  "tools/ai_test_supervisor/check_supervisor_schemas.mjs",
  "tests/supervisor_domain_registry_behavior.test.mjs",
  "tests/supervisor_schema_contracts.test.mjs",
];

function recommendationFor(changedFiles) {
  return buildRecommendation(Array.isArray(changedFiles) ? changedFiles : [changedFiles]);
}

function commandRefs(report) {
  return report.recommendedCommands.map((command) => command.commandRef);
}

function routeForCommand(report, commandRef) {
  return report.recommendedCommands.find((command) => command.commandRef === commandRef);
}

test("SF-ATS contract files recommend the supervisor contract gate", () => {
  for (const changedFile of SF_ATS_CHANGED_FILES) {
    const report = recommendationFor(changedFile);

    assert.deepEqual(report.unmatchedChangedFiles, [], `${changedFile} must be matched by the adaptive selector.`);
    assert.ok(
      commandRefs(report).includes("verify:supervisor-contracts"),
      `${changedFile} must recommend verify:supervisor-contracts.`,
    );
  }
});

test("supervisor node tests classify as test-routing/test-infra", () => {
  const report = recommendationFor("tests/supervisor_domain_registry_behavior.test.mjs");
  const supervisorRoute = routeForCommand(report, "verify:supervisor-contracts");
  const supervisorNodeRoute = routeForCommand(report, "test:node:supervisor-contracts");

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(supervisorRoute, "supervisor test changes must recommend verify:supervisor-contracts.");
  assert.ok(supervisorNodeRoute, "supervisor test changes must recommend the direct supervisor node contract test.");
  assert.deepEqual(supervisorRoute.domains, ["test-routing"]);
  assert.deepEqual(supervisorRoute.ownerHints, ["test-infra"]);
  assert.deepEqual(supervisorNodeRoute.domains, ["test-routing"]);
  assert.deepEqual(supervisorNodeRoute.ownerHints, ["test-infra"]);
  assert.ok(!supervisorNodeRoute.domains.includes("renderer-runtime"));
});

test("explicit SF-ATS route coverage leaves no unmatched files", () => {
  const report = recommendationFor(SF_ATS_CHANGED_FILES);

  assert.deepEqual(report.unmatchedChangedFiles, []);
  for (const changedFile of SF_ATS_CHANGED_FILES) {
    const entry = report.matchedByFile.find((match) => match.changedFile === changedFile);
    assert.ok(entry, `${changedFile} must be present in matchedByFile.`);
    assert.ok(entry.matchedRouteIds.length > 0, `${changedFile} must have at least one matched route.`);
  }
});

test("Appearance Transport change-set modules and focused tests share the child-safe Node route", () => {
  const changedFiles = [
    "js/core/appearance_transport_change_set.js",
    "js/core/appearance_transport_change_set_contract.js",
    "js/core/appearance_transport_operation.js",
    "tests/appearance_transport_change_set_contract_behavior.test.mjs",
    "tests/appearance_transport_operation_behavior.test.mjs",
    "tests/helpers/appearance_transport_change_set_fixtures.mjs",
  ];
  const report = recommendationFor(changedFiles);
  const route = routeForCommand(report, "test:node:appearance-transport-change-set");
  const routeMetadata = buildRouteIndex().find(
    (entry) => entry.commandRef === "test:node:appearance-transport-change-set",
  );

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(route);
  assert.deepEqual(route.domains, ["transport-workbench"]);
  assert.deepEqual(route.ownerHints, ["transport-workbench"]);
  assert.ok(routeMetadata);
  const directSourceRefs = new Set(routeMetadata.sourceRef.split(","));
  for (const sourceRef of [
    "js/core/appearance_transport_change_set.js",
    "js/core/appearance_transport_change_set_contract.js",
    "js/core/appearance_transport_operation.js",
  ]) {
    assert.ok(directSourceRefs.has(sourceRef), `${sourceRef} must be a direct route sourceRef.`);
  }
  for (const changedFile of changedFiles) {
    assert.ok(
      report.matchedByFile.some((entry) => entry.changedFile === changedFile),
      `${changedFile} must be matched by the adaptive selector.`,
    );
  }
});

test("primary polar water outputs stay on the heavy spherical safety route", () => {
  const changedFiles = [
    "data/europe_topology.json",
    "data/water_regions.geojson",
  ];
  const report = recommendationFor(changedFiles);
  const route = routeForCommand(
    report,
    "python -m pytest tests/test_polar_water_spherical_safety.py -q",
  );

  assert.deepEqual(report.unmatchedChangedFiles, []);
  assert.ok(route);
  assert.deepEqual(route.domains, ["geo-contract", "tno-water"]);
  assert.deepEqual(route.ownerHints, ["polar-water-spherical-safety", "tno-water"]);
  assert.deepEqual(route.executionOwners, ["main-thread"]);
  assert.deepEqual(route.resourceLocks, [".runtime-output", "heavy-geo"]);
});

test("SF-ATS docs route stays scoped to registry and work package docs", () => {
  const registryReport = recommendationFor("docs/active/_worktree_registry.md");
  const unrelatedActiveDocReport = recommendationFor("docs/active/unrelated-task/context.md");
  const unrelatedTestingDocReport = recommendationFor("docs/testing/unrelated.md");

  assert.deepEqual(registryReport.unmatchedChangedFiles, []);
  assert.ok(commandRefs(registryReport).includes("verify:supervisor-contracts"));
  assert.deepEqual(unrelatedActiveDocReport.recommendedCommands, []);
  assert.deepEqual(unrelatedActiveDocReport.unmatchedChangedFiles, ["docs/active/unrelated-task/context.md"]);
  assert.deepEqual(unrelatedTestingDocReport.recommendedCommands, []);
  assert.deepEqual(unrelatedTestingDocReport.unmatchedChangedFiles, ["docs/testing/unrelated.md"]);
});
