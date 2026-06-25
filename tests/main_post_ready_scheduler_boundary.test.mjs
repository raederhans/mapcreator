import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(...segments) {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

function sliceFunction(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.ok(start >= 0, `expected ${functionName} in source`);
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  return nextFunction >= 0 ? source.slice(start, nextFunction) : source.slice(start);
}

test("main imports and initializes the post-ready scheduler owner", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.match(mainSource, /from "\.\/bootstrap\/post_ready_scheduler\.js";/);
  assert.match(mainSource, /const postReadyScheduler = createPostReadyScheduler\(\{ targetState: runtimeState \}\);/);
  assert.match(mainSource, /canRunPostReadyIdleWork: postReadyScheduler\.canRunIdleWork,/);
  assert.match(mainSource, /postReadyScheduler\.reset\("bootstrap"\);/);
});

test("main no longer owns post-ready scheduler internals", () => {
  const mainSource = readRepoFile("js", "main.js");
  const forbiddenTokens = [
    "let postReadyTaskHandles",
    "let postReadyTaskDiagnostics",
    "let postReadyTaskEpoch",
    "function schedulePostReadyTask(",
    "function updatePostReadySchedulerDiagnostics(",
    "function resolvePostReadyIdleBlockReason(",
    "function runPostReadyTaskCallback(",
    "function reschedulePostReadyTask(",
    "function clearPostReadyTaskHandle(",
  ];

  for (const token of forbiddenTokens) {
    assert.equal(mainSource.includes(token), false, `main.js still owns ${token}`);
  }
});

test("main keeps post-ready policy functions and task keys", () => {
  const mainSource = readRepoFile("js", "main.js");

  for (const token of [
    "function schedulePostReadyHydration()",
    "function schedulePostReadyDeferredContextWarmup()",
    "function schedulePostReadyVisualWarmup()",
    "function startDeferredFullInteractionInfrastructureBuild(",
    "function schedulePostReadyPoliticalReconcile(",
    "post-ready-localization-hydration",
    "post-ready-scenario-hydration",
    "post-ready-detail-promotion-political-reconcile",
    "post-ready-full-interaction-infra",
    "post-ready-visual-warmup",
    "post-ready-context-warmup",
    "post-ready-contour-warmup",
  ]) {
    assert.ok(mainSource.includes(token), `missing policy token ${token}`);
  }
});

test("ready-state post-boot scheduling order stays stable", () => {
  const mainSource = readRepoFile("js", "main.js");
  const readyBody = sliceFunction(mainSource, "scheduleReadyPostBootWork");
  const orderedTokens = [
    "checkpointBootMetric(\"time-to-interactive\");",
    "checkpointBootMetric(\"first-interactive\");",
    "completeBootSequenceLogging();",
    "flushPendingScenarioChunkRefreshAfterReady(reason);",
    "scheduleDeferredDetailPromotion(renderDispatcher);",
    "startDeferredFullInteractionInfrastructureBuild(reason);",
    "schedulePostReadyHydration();",
    "schedulePostReadyDeferredContextWarmup();",
    "schedulePostReadyVisualWarmup();",
  ];
  let cursor = -1;
  for (const token of orderedTokens) {
    const next = readyBody.indexOf(token, cursor + 1);
    assert.ok(next > cursor, `expected ${token} after previous token`);
    cursor = next;
  }
});

test("post-ready scheduler owner exports constants and keeps diagnostics contract", () => {
  const schedulerSource = readRepoFile("js", "bootstrap", "post_ready_scheduler.js");

  assert.ok(schedulerSource.includes("export function createPostReadyScheduler"));
  assert.ok(schedulerSource.includes("export const POST_READY_IDLE_QUIET_MS = 850;"));
  assert.ok(schedulerSource.includes("export const POST_READY_IDLE_TIME_REMAINING_MS = 8;"));
  assert.ok(schedulerSource.includes("pendingTaskKeys"));
  assert.ok(schedulerSource.includes("maxRetryCount"));
  assert.ok(schedulerSource.includes("reasonStateHint"));
  assert.ok(schedulerSource.includes("targetState.postReadyTaskDiagnostics"));
  assert.ok(schedulerSource.includes("targetState.renderPerfMetrics.postReadySchedulerState"));
  assert.ok(schedulerSource.includes("globalScope.__renderPerfMetrics"));
  assert.equal(/\bruntimeState\b|\bappState\b|\bconst state\b|\blet state\b/.test(schedulerSource), false);
});
