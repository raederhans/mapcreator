import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(...segments) {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

test("main imports and creates the startup ready handoff owner", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.ok(mainSource.includes('from "./bootstrap/startup_ready_handoff.js";'));
  assert.ok(mainSource.includes("createStartupReadyHandoffOwner({"));
  assert.ok(mainSource.includes("function getStartupReadyHandoffOwner()"));
  assert.ok(mainSource.includes('getStartupReadyHandoffOwner().scheduleReadyPostBootWork(renderDispatcher, "ready-state")'));
  assert.ok(mainSource.includes('getStartupReadyHandoffOwner().reset("bootstrap")'));
});

test("main no longer owns ready handoff policy implementation", () => {
  const mainSource = readRepoFile("js", "main.js");
  const forbiddenMainTokens = [
    "function scheduleReadyPostBootWork(",
    "function flushPendingScenarioChunkRefreshAfterReady(",
    "function startDeferredFullInteractionInfrastructureBuild(",
    "function schedulePostReadyHydration(",
    "function schedulePostReadyDeferredContextWarmup(",
    "function schedulePostReadyVisualWarmup(",
    "function schedulePostReadyCityWarmup(",
    "let postReadyContextWarmupScheduled",
    "let postReadyHydrationScheduled",
  ];

  for (const token of forbiddenMainTokens) {
    assert.equal(mainSource.includes(token), false, `main.js still contains ${token}`);
  }
});

test("startup ready handoff owner owns all post-ready task keys", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "startup_ready_handoff.js");
  const taskKeys = [
    "post-ready-localization-hydration",
    "post-ready-scenario-hydration",
    "post-ready-detail-promotion-political-reconcile",
    "post-ready-full-interaction-infra",
    "post-ready-visual-warmup",
    "post-ready-context-warmup",
    "post-ready-contour-warmup",
  ];

  for (const taskKey of taskKeys) {
    assert.ok(ownerSource.includes(taskKey), `missing task key ${taskKey}`);
  }
  assert.equal(ownerSource.includes("schedulePostReadyCityWarmup"), false);
});

test("startup ready handoff owner uses target-first actions without importing global state", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "startup_ready_handoff.js");
  const coreStateImports = [...ownerSource.matchAll(
    /from\s+["']([^"']*core\/state(?:\.js|\/[^"']+))["']/g,
  )].map((match) => match[1]);

  assert.deepEqual(coreStateImports, [
    "../core/state/actions/scenario_chunk_runtime_actions.js",
    "../core/state/actions/boot_actions.js",
  ]);
  assert.ok(ownerSource.includes("patchScenarioChunkLoadState(targetRuntime,"));
  assert.ok(ownerSource.includes("setUiHydrationState(targetRuntime,"));
  assert.equal(/from\s+["'][^"']*map_renderer\/public\.js["']/.test(ownerSource), false);
  assert.equal(/from\s+["'][^"']*startup_data_pipeline\.js["']/.test(ownerSource), false);
  assert.ok(ownerSource.includes("runtimeState,"));
  assert.ok(ownerSource.includes("postReadyScheduler,"));
  assert.ok(ownerSource.includes("helpers = {},"));
});

test("package exposes the startup ready handoff node test script", () => {
  const packageSource = readRepoFile("package.json");

  assert.ok(packageSource.includes('"test:node:startup-ready-handoff": "node --test tests/startup_ready_handoff_behavior.test.mjs tests/main_startup_ready_handoff_boundary.test.mjs"'));
});
