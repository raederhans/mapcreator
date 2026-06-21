import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

function readRepoFile(...relativeParts) {
  return fs.readFileSync(path.join(REPO_ROOT, ...relativeParts), "utf8");
}

test("scenario manager owns apply requests with same-target reuse and latest-target queue", () => {
  const source = readRepoFile("js", "core", "scenario_manager.js");

  [
    "let activeScenarioApplyRequestId = 0;",
    "let latestQueuedScenarioApplyRequest = null;",
    "let queuedScenarioApplyDrainPromise = null;",
    "function createScenarioApplyRequest(",
    "function isScenarioApplyRequestCurrent(",
    "function runScenarioApplyRequest(",
    "function drainQueuedScenarioApplyRequests()",
    "scenario-apply-reused-active-target",
    "scenario-apply-queued-latest-target",
    "scenario-apply-queue-drain-started",
    "scenario-apply-queue-drain-skipped-stale",
    "scenario-apply-queue-drain-complete",
    "scenario-apply-target-committed",
    "scenario-apply-stale-rollback-complete",
    "resolution: \"queued-latest-request\"",
    "resolution: \"replaced-by-latest-request\"",
    "resolution: \"fatal-recovery-lock\"",
    "activeScenarioApplyPromise === requestPromise && activeScenarioApplyRequestId === request.requestId",
    "restoreStaleScenarioApplyRollbackSnapshot",
    "restoreScenarioApplyRollbackSnapshot(rollbackSnapshot)",
    "runPostRollbackRestoreEffects({ renderNow })",
  ].forEach((token) => assert.ok(source.includes(token), `scenario_manager should include ${token}`));

  assert.match(
    source,
    /if \(!activeScenarioApplyTargetId \|\| activeScenarioApplyTargetId === normalizedScenarioId\) \{[\s\S]*?return activeScenarioApplyPromise;[\s\S]*?\}/,
    "same-target in-flight apply should reuse the active promise",
  );
  assert.match(
    source,
    /recordRenderInvariantWarning\(runtimeState,[\s\S]*?scenarioApplyInflightTargetMismatch[\s\S]*?queueLatestScenarioApplyRequest\(request\);[\s\S]*?return drainQueuedScenarioApplyRequests\(\);/,
    "different-target in-flight apply should queue the latest request",
  );
});

test("stale scenario apply callbacks are fenced at post-apply, optional layer, and chunk writes", () => {
  const postApply = readRepoFile("js", "core", "scenario_post_apply_effects.js");
  const resources = readRepoFile("js", "core", "scenario_resources.js");
  const chunkRuntime = readRepoFile("js", "core", "scenario", "chunk_runtime.js");
  const pipeline = readRepoFile("js", "core", "scenario_apply_pipeline.js");

  [
    "scenario-apply-stale-callback-skipped",
    "shouldContinueScenarioApplyContext(currentnessContext, \"detail-prewarm-after-load\")",
    "shouldContinueScenarioApplyContext(currentnessContext, \"coarse-prewarm-finally-refresh\")",
    "shouldContinueScenarioApplyContext(currentnessContext, \"post-apply-before-data-health\")",
  ].forEach((token) => assert.ok(postApply.includes(token), `post_apply should include ${token}`));

  [
    "applyScenarioOptionalLayerState(",
    "scenarioApplyRequestId = 0",
    "optional-layer-state-apply",
    "optional-layer-visibility-sync-after-load",
  ].forEach((token) => assert.ok(resources.includes(token), `scenario_resources should include ${token}`));

  [
    "scenarioApplyRequestIdBySelectionVersion",
    "pendingPromotion.scenarioApplyRequestId",
    "political-chunk-payload-write",
    "chunk-refresh-timer",
    "post-commit-refresh-replay",
  ].forEach((token) => assert.ok(chunkRuntime.includes(token), `chunk_runtime should include ${token}`));

  assert.ok(pipeline.includes("scenarioApplyRequestId: Math.max(0, Number(scenarioApplyRequestId || 0))"));
  assert.ok(pipeline.includes("scenarioApplyRequestId: Math.max(0, Number(staged?.scenarioApplyRequestId || 0))"));
});

test("stale commit-start path restores prepare-time palette and detail runtime writes", () => {
  const source = readRepoFile("js", "core", "scenario_manager.js");

  assert.match(
    source,
    /phase: "scenario-apply-stale-callback-skipped"[\s\S]*?callbackPhase: "commit-start"[\s\S]*?restoreStaleScenarioApplyRollbackSnapshot\(\{[\s\S]*?callbackPhase: "commit-start"[\s\S]*?\}\);[\s\S]*?return;/,
    "stale commit-start skip should restore the pre-apply rollback snapshot before returning",
  );
  assert.match(
    source,
    /const restoreStaleScenarioApplyRollbackSnapshot = \(\{ scenarioId, callbackPhase \}\) => \{[\s\S]*?restoreScenarioApplyRollbackSnapshot\(rollbackSnapshot\);[\s\S]*?runPostRollbackRestoreEffects\(\{ renderNow \}\);[\s\S]*?phase: "scenario-apply-stale-rollback-complete"/,
    "stale rollback helper should use the normal rollback snapshot and post-rollback effects",
  );
});
