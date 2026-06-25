import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(...segments) {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

test("main imports and delegates startup failure recovery", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.match(mainSource, /from "\.\/bootstrap\/startup_failure_recovery\.js";/);
  assert.match(mainSource, /handleStartupFailure\(\{/);
  assert.match(mainSource, /startupUiBootstrapFailed = !!failureRecovery\.startupUiBootstrapFailed;/);
});

test("main no longer owns startup failure recovery strings", () => {
  const mainSource = readRepoFile("js", "main.js");
  const movedStrings = [
    "Deferred UI bootstrap failed during startup:",
    "Failed to boot application:",
    "Stack trace:",
    "Continuing with the base map only.",
    "正在以基础地图模式继续。",
    "Failed to load the default startup scenario.",
  ];

  for (const movedString of movedStrings) {
    assert.equal(mainSource.includes(movedString), false, `main.js still contains ${movedString}`);
  }
});

test("startup failure recovery owner exports the expected API", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "startup_failure_recovery.js");

  assert.ok(ownerSource.includes("export async function handleStartupFailure"));
  assert.ok(ownerSource.includes("Deferred UI bootstrap failed during startup:"));
  assert.ok(ownerSource.includes("Failed to boot application:"));
  assert.ok(ownerSource.includes("Stack trace:"));
  assert.ok(ownerSource.includes("Continuing with the base map only."));
  assert.ok(ownerSource.includes("正在以基础地图模式继续。"));
});

test("startup failure recovery owner keeps explicit helper boundary", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "startup_failure_recovery.js");
  const requiredHelpers = [
    "finalizeReadyState",
    "getBootLanguage",
    "getBootProgressWindow",
    "checkpointBootMetricOnce",
    "finishBootMetric",
    "invalidateAllRenderPasses",
    "rollbackStartupScenarioToBaseMap",
    "runPostScenarioUiReplay",
    "setBootContinueHandler",
    "setBootState",
    "setStartupReadonlyState",
  ];

  for (const helperName of requiredHelpers) {
    assert.ok(ownerSource.includes(`"${helperName}"`), `missing helper validation for ${helperName}`);
    assert.ok(ownerSource.includes(`helpers.${helperName}`), `missing helper use for ${helperName}`);
  }
});

test("startup failure recovery owner avoids direct runtime imports", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "startup_failure_recovery.js");
  const forbiddenImportFragments = [
    'from "../core/state.js"',
    'from "./core/state.js"',
    'from "../core/state/index.js"',
    'from "../core/scenario_manager.js"',
    'from "../core/map_renderer',
    'from "../core/render_boundary.js"',
    'from "../core/scenario_post_apply_effects.js"',
  ];

  assert.equal(ownerSource.includes("import "), false);
  for (const fragment of forbiddenImportFragments) {
    assert.equal(ownerSource.includes(fragment), false, `owner imports ${fragment}`);
  }
});

test("startup failure recovery owner only writes scenarioApplyInFlight on target state", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "startup_failure_recovery.js");
  const stateWritePattern = /\btargetState(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])+\s*(?:=(?!=|>)|\+=|-=|\*=|\/=|%=|\+\+|--)/g;
  const statePrefixWritePattern = /(?:\+\+|--)\s*\btargetState(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])+/g;

  const writes = [...ownerSource.matchAll(stateWritePattern)].map((match) => match[0]);
  const prefixWrites = [...ownerSource.matchAll(statePrefixWritePattern)].map((match) => match[0]);

  assert.deepEqual(writes, ["targetState.scenarioApplyInFlight ="]);
  assert.deepEqual(prefixWrites, []);
});
