import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  commitProjectedBoundsCacheState,
  commitRenderPassCacheState,
  ensureRenderPassCacheState,
  setSphericalFeatureDiagnosticsCacheState,
} from "../js/core/state/actions/renderer_cache_actions.js";

test("renderer cache actions stay import-free with target-first exports", async () => {
  const source = await readFile(
    new URL("../js/core/state/actions/renderer_cache_actions.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /^\s*import\s/m);
  for (const name of [
    "commitRenderPassCacheState",
    "ensureRenderPassCacheState",
    "commitProjectedBoundsCacheState",
    "setSphericalFeatureDiagnosticsCacheState",
  ]) {
    assert.match(source, new RegExp(`export function ${name}\\(\\s*target[,)]`));
  }
});

test("cache actions reject invalid targets", () => {
  for (const target of [null, undefined, [], "state"]) {
    assert.throws(() => commitRenderPassCacheState(target, {}), /target must be an object/);
    assert.throws(() => commitProjectedBoundsCacheState(target, {
      projectedBoundsById: new Map(),
      sphericalFeatureDiagnosticsById: new Map(),
    }), /target must be an object/);
    assert.throws(() => setSphericalFeatureDiagnosticsCacheState(target, new Map()), /target must be an object/);
  }
});

test("render pass cache commit preserves the prepared holder identity", () => {
  const target = {};
  const cache = { counters: { frames: 7 }, canvases: {} };
  assert.equal(commitRenderPassCacheState(target, cache), true);
  assert.equal(target.renderPassCache, cache);
});

test("render pass cache repair prepares a detached holder before one atomic commit", () => {
  const defaults = {
    canvases: {},
    layouts: {},
    signatures: {},
    referenceTransforms: {},
    fullReferenceTransforms: {},
    contextScenarioLayerCache: {},
    compositeBuffer: { canvas: null },
    borderSnapshot: {
      canvas: null,
      layout: null,
      referenceTransform: null,
      valid: false,
      reason: "init",
    },
    lastGoodFrame: { capturedAt: 0 },
    interactionComposite: { capturedAt: 0 },
    partialPoliticalDirtyIds: new Set(),
    pendingPoliticalColorEditIds: new Set(),
    pendingPoliticalColorEditRevision: -1,
    pendingPoliticalColorEditScenarioId: "",
    pendingPoliticalColorEditReason: "",
    pendingPoliticalColorEditStartedAt: 0,
    pendingPoliticalColorEditInputLabel: "",
    pendingPoliticalColorEditFirstPixelRecorded: false,
    pendingPoliticalColorEditFirstPixelPaintSource: "",
    pendingPoliticalPatchOverlayTransformSignature: "",
    politicalPassSceneGeneration: 0,
    politicalPassScenarioDataGeneration: 0,
    politicalPassDataStage: "unknown",
    politicalPassFullReady: false,
    politicalPassFineCacheReady: false,
    politicalPathCache: new Map(),
    politicalPathCacheSignature: "",
    politicalPathCacheTransform: null,
    politicalPathWarmupQueue: [],
    politicalPathWarmupHandle: null,
    politicalPathWarmupSignature: "",
    politicalPathWarmupReason: "",
    contextScenarioReasonMismatchSignature: "",
    dirty: { background: true },
    reasons: { background: "init" },
    counters: { frames: 0 },
    lastFrame: null,
    lastAction: "",
    lastActionDurationMs: 0,
    lastActionAt: 0,
    perfOverlayEnabled: false,
    overlayElement: null,
  };
  const original = {
    dirty: {},
    reasons: {},
    counters: { frames: "3" },
    politicalPathCacheTransform: { x: 4, y: 5, k: 2 },
  };
  const target = { renderPassCache: original };

  const repaired = ensureRenderPassCacheState(target, {
    defaults,
    renderPassNames: ["background"],
    cloneZoomTransform: (transform) => ({ ...transform }),
  });

  assert.notEqual(repaired, original);
  assert.equal(target.renderPassCache, repaired);
  assert.equal(original.counters.frames, "3");
  assert.equal("background" in original.dirty, false);
  assert.equal(repaired.counters.frames, 3);
  assert.equal(repaired.dirty.background, true);
  assert.deepEqual(repaired.politicalPathCacheTransform, { x: 4, y: 5, k: 2 });
});

test("render pass cache repair leaves the original holder installed when preparation throws", () => {
  const defaults = {
    dirty: {},
    reasons: {},
    counters: {},
    politicalPathCacheTransform: null,
    politicalPathWarmupHandle: null,
  };
  const original = {
    dirty: {},
    reasons: {},
    counters: {},
    politicalPathCacheTransform: { x: 1, y: 2, k: 3 },
    politicalPathWarmupHandle: null,
  };
  const target = { renderPassCache: original };

  assert.throws(() => ensureRenderPassCacheState(target, {
    defaults,
    renderPassNames: ["background"],
    cloneZoomTransform() {
      throw new Error("clone failed");
    },
  }), /clone failed/);
  assert.equal(target.renderPassCache, original);
  assert.deepEqual(original.politicalPathCacheTransform, { x: 1, y: 2, k: 3 });
});

test("render pass cache initialization does not mutate the supplied defaults snapshot", () => {
  const defaults = {
    dirty: {},
    reasons: {},
    counters: { frames: 0 },
    politicalPathCacheTransform: null,
    politicalPathWarmupHandle: null,
  };
  const target = {};

  const initialized = ensureRenderPassCacheState(target, {
    defaults,
    renderPassNames: ["background"],
  });

  assert.equal(target.renderPassCache, initialized);
  assert.notEqual(initialized, defaults);
  assert.notEqual(initialized.dirty, defaults.dirty);
  assert.notEqual(initialized.reasons, defaults.reasons);
  assert.notEqual(initialized.counters, defaults.counters);
  assert.deepEqual(defaults, {
    dirty: {},
    reasons: {},
    counters: { frames: 0 },
    politicalPathCacheTransform: null,
    politicalPathWarmupHandle: null,
  });
});

test("projected bounds cache commit installs both exact Map identities", () => {
  const target = {};
  const projectedBoundsById = new Map([["A", { minX: 1 }]]);
  const sphericalFeatureDiagnosticsById = new Map([["A", null]]);
  assert.equal(commitProjectedBoundsCacheState(target, {
    projectedBoundsById,
    sphericalFeatureDiagnosticsById,
  }), true);
  assert.equal(target.projectedBoundsById, projectedBoundsById);
  assert.equal(target.sphericalFeatureDiagnosticsById, sphericalFeatureDiagnosticsById);
});

test("spherical diagnostics cache setter preserves the exact Map identity", () => {
  const target = { sphericalFeatureDiagnosticsById: new Map() };
  const cache = new Map([["B", { reason: "non-finite" }]]);
  assert.equal(setSphericalFeatureDiagnosticsCacheState(target, cache), true);
  assert.equal(target.sphericalFeatureDiagnosticsById, cache);
});

test("cache actions reject malformed prepared holders", () => {
  const target = {};
  for (const invalid of [null, [], "cache"]) {
    assert.throws(() => commitRenderPassCacheState(target, invalid), /renderPassCache must be an object/);
  }
  assert.throws(() => commitProjectedBoundsCacheState(target, {
    projectedBoundsById: {},
    sphericalFeatureDiagnosticsById: new Map(),
  }), /projectedBoundsById must be a Map/);
  assert.throws(() => setSphericalFeatureDiagnosticsCacheState(target, {}), /sphericalFeatureDiagnosticsById must be a Map/);
});
