import assert from "node:assert/strict";
import test from "node:test";
import { buildRecommendation } from "../tools/select_verification_targets.mjs";

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
