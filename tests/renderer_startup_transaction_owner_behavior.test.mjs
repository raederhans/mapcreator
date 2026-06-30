import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createRendererStartupTransactionOwner,
} from "../js/core/renderer/renderer_startup_transaction_owner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const EFFECT_ORDER = Object.freeze([
  "resetLayerResolverCache",
  "resetPhysicalLandClipPathCache",
  "resetExactRefreshOptimizationState",
  "bumpTopologyRevision",
  "resetHitCanvasTopologyRevision",
  "clearPendingPoliticalColorEdit",
  "clearRenderPassReferenceTransforms",
  "clearLastGoodFrame",
  "invalidateInteractionComposite",
  "resetFirstVisibleFramePainted",
  "setRenderPassPerfOverlayEnabled",
  "ensureLayerDataFromTopology",
  "rebuildPoliticalLandCollections",
  "applyRendererSurfaceBridgeState",
  "migrateLegacyColorState",
  "ensureSovereigntyState",
  "normalizeColorStateForRender",
  "setDebugMode",
  "resetRenderDiagnostics",
  "clearRenderPhaseTimer",
  "resetRenderPhaseState",
  "resetTooltipState",
  "cancelScheduledHoverOverlayRender",
  "markAllOverlaysDirty",
  "clearStagedMapDataTasks",
  "cancelExactAfterSettleRefresh",
  "cancelPendingIndexUiRefresh",
  "resetDeferredRenderFlags",
  "resetProjectedBoundsCacheState",
  "invalidateAllRenderPasses",
  "syncDayNightClockTimerBridge",
]);

function createHarness() {
  const calls = [];
  const payloads = [];
  const effects = {};
  for (const name of EFFECT_ORDER) {
    effects[name] = (...args) => {
      calls.push(name);
      payloads.push({ name, args });
    };
  }
  const getters = {
    isPerfOverlayEnabled: () => true,
  };
  const owner = createRendererStartupTransactionOwner({ effects, getters });
  return { calls, effects, getters, owner, payloads };
}

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(REPO_ROOT, ...parts), "utf8");
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

test("runInitMapResetTransaction runs effects in exact initMap order", () => {
  const { calls, owner } = createHarness();

  owner.runInitMapResetTransaction({ debugMode: "PROD" });

  assert.deepEqual(calls, EFFECT_ORDER);
});

test("topology and hit-canvas revision effects are called in order", () => {
  const { calls, owner } = createHarness();

  owner.runInitMapResetTransaction({ debugMode: "GEOMETRY" });

  assert.ok(calls.indexOf("bumpTopologyRevision") >= 0);
  assert.ok(calls.indexOf("resetHitCanvasTopologyRevision") >= 0);
  assert.ok(calls.indexOf("bumpTopologyRevision") < calls.indexOf("resetHitCanvasTopologyRevision"));
});

test("surface bridge state effect is between political rebuild and legacy color migration", () => {
  const { calls, owner } = createHarness();

  owner.runInitMapResetTransaction({ debugMode: "PROD" });

  assert.ok(calls.indexOf("rebuildPoliticalLandCollections") < calls.indexOf("applyRendererSurfaceBridgeState"));
  assert.ok(calls.indexOf("applyRendererSurfaceBridgeState") < calls.indexOf("migrateLegacyColorState"));
});

test("cancel and reset effects preserve startup transaction order", () => {
  const { calls, owner } = createHarness();

  owner.runInitMapResetTransaction({ debugMode: "PROD" });

  assert.deepEqual(calls.slice(22, 31), [
    "cancelScheduledHoverOverlayRender",
    "markAllOverlaysDirty",
    "clearStagedMapDataTasks",
    "cancelExactAfterSettleRefresh",
    "cancelPendingIndexUiRefresh",
    "resetDeferredRenderFlags",
    "resetProjectedBoundsCacheState",
    "invalidateAllRenderPasses",
    "syncDayNightClockTimerBridge",
  ]);
});

test("owner returns a diagnostics summary", () => {
  const { owner } = createHarness();

  const summary = owner.runInitMapResetTransaction({ debugMode: "ARTIFACTS" });

  assert.deepEqual(summary, {
    reason: "init-map",
    debugMode: "ARTIFACTS",
    effects: EFFECT_ORDER,
  });
  assert.throws(() => {
    summary.effects.push("extra");
  }, TypeError);
});

test("owner forwards exact effect payloads", () => {
  const { owner, payloads } = createHarness();

  owner.runInitMapResetTransaction({ debugMode: "ID_HASH" });

  assert.deepEqual(payloads.find((entry) => entry.name === "clearPendingPoliticalColorEdit")?.args, [
    {
      force: true,
      resetReason: "init-map",
      paintSource: "init-map",
    },
  ]);
  assert.deepEqual(payloads.find((entry) => entry.name === "clearLastGoodFrame")?.args, ["init-map"]);
  assert.deepEqual(payloads.find((entry) => entry.name === "invalidateInteractionComposite")?.args, ["init-map"]);
  assert.deepEqual(payloads.find((entry) => entry.name === "resetFirstVisibleFramePainted")?.args, ["init-map"]);
  assert.deepEqual(payloads.find((entry) => entry.name === "setRenderPassPerfOverlayEnabled")?.args, [true]);
  assert.deepEqual(payloads.find((entry) => entry.name === "setDebugMode")?.args, ["ID_HASH"]);
  assert.deepEqual(payloads.find((entry) => entry.name === "invalidateAllRenderPasses")?.args, ["init-map"]);
});

test("missing required effects and getters fail fast", () => {
  for (const missingName of EFFECT_ORDER) {
    const { effects, getters } = createHarness();
    delete effects[missingName];

    assert.throws(
      () => createRendererStartupTransactionOwner({ effects, getters }),
      new RegExp(`renderer startup transaction owner requires effects\\.${missingName}`),
    );
  }

  const { effects, getters } = createHarness();
  delete getters.isPerfOverlayEnabled;
  assert.throws(
    () => createRendererStartupTransactionOwner({ effects, getters }),
    /renderer startup transaction owner requires getters\.isPerfOverlayEnabled/,
  );
});

test("owner source stays import-safe and avoids forbidden renderer semantics", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_startup_transaction_owner.js");

  for (const tokenParts of [
    ["map_", "renderer.js"],
    ["runtime", "State"],
    ["draw", "Canvas"],
    ["renderPass", "ToCache"],
    ["build", "HitCanvas"],
    ["set", "MapData"],
    ["scenario", " refresh"],
    ["scenario", " chunk"],
    ["exactAfter", "Settle"],
    ["strategicOverlay", "Runtime"],
    ["init", "Zoom"],
    ["bind", "Events"],
    ["public", " facade"],
  ]) {
    assertExcludes(
      ownerSource,
      tokenParts.join(""),
      "startup transaction owner must avoid forbidden semantic token",
    );
  }
});
