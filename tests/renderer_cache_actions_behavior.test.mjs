import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  clearSphericalFeatureDiagnosticsCacheState,
  commitProjectedBoundsCacheState,
  commitRenderPassCacheState,
  getSphericalFeatureDiagnosticsCacheEntryState,
  setSphericalFeatureDiagnosticsCacheEntryState,
} from "../js/core/state/actions/renderer_cache_actions.js";
import {
  createDefaultRenderPassCacheState,
  ensureRenderPassCacheState,
} from "../js/core/state/renderer_runtime_state.js";

test("renderer cache actions stay import-free with target-first exports", async () => {
  const source = await readFile(
    new URL("../js/core/state/actions/renderer_cache_actions.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /^\s*import\s/m);
  for (const name of [
    "commitRenderPassCacheState",
    "commitProjectedBoundsCacheState",
    "clearSphericalFeatureDiagnosticsCacheState",
    "getSphericalFeatureDiagnosticsCacheEntryState",
    "setSphericalFeatureDiagnosticsCacheEntryState",
  ]) {
    assert.match(source, new RegExp(`export function ${name}\\(\\s*target[,)]`));
  }
  assert.doesNotMatch(source, /ensureRenderPassCacheState/);
});

test("cache actions reject invalid targets", () => {
  for (const target of [null, undefined, [], "state"]) {
    assert.throws(() => commitRenderPassCacheState(target, {}), /target must be an object/);
    assert.throws(() => commitProjectedBoundsCacheState(target, {
      projectedBoundsById: new Map(),
      sphericalFeatureDiagnosticsById: new Map(),
    }), /target must be an object/);
    assert.throws(() => clearSphericalFeatureDiagnosticsCacheState(target), /target must be an object/);
    assert.throws(() => getSphericalFeatureDiagnosticsCacheEntryState(target, "A"), /target must be an object/);
    assert.throws(() => setSphericalFeatureDiagnosticsCacheEntryState(target, "A", {}), /target must be an object/);
  }
});

test("render pass cache commit preserves the prepared holder identity", () => {
  const target = {};
  const cache = { counters: { frames: 7 }, canvases: {} };
  assert.equal(commitRenderPassCacheState(target, cache), true);
  assert.equal(target.renderPassCache, cache);
});

test("runtime compatibility helper prepares before committing", () => {
  const original = createDefaultRenderPassCacheState();
  original.politicalPathCacheTransform = { x: 1, y: 2, k: 3 };
  delete original.dirty.background;
  const target = { renderPassCache: original };

  assert.throws(() => ensureRenderPassCacheState(target, {
    renderPassNames: ["background"],
    cloneZoomTransform() {
      throw new Error("clone failed");
    },
  }), /clone failed/);
  assert.equal(target.renderPassCache, original);
  assert.deepEqual(original.politicalPathCacheTransform, { x: 1, y: 2, k: 3 });
  assert.equal("background" in original.dirty, false);
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

test("spherical diagnostics cache actions keep mutable state private", () => {
  const target = { sphericalFeatureDiagnosticsById: new Map() };
  const diagnostics = {
    area: 7,
    bounds: [[-10, -5], [10, 5]],
    invalid: false,
  };

  assert.equal(
    setSphericalFeatureDiagnosticsCacheEntryState(target, "B", diagnostics),
    true,
  );
  diagnostics.bounds[0][0] = 999;

  const firstRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "B");
  assert.deepEqual(firstRead, {
    area: 7,
    bounds: [[-10, -5], [10, 5]],
    invalid: false,
  });
  firstRead.bounds[1][1] = 999;
  assert.deepEqual(getSphericalFeatureDiagnosticsCacheEntryState(target, "B"), {
    area: 7,
    bounds: [[-10, -5], [10, 5]],
    invalid: false,
  });
  assert.equal(getSphericalFeatureDiagnosticsCacheEntryState(target, "missing"), null);

  assert.equal(clearSphericalFeatureDiagnosticsCacheState(target), true);
  assert.equal(target.sphericalFeatureDiagnosticsById.size, 0);
});

test("spherical diagnostics cache keys use stable string semantics", () => {
  const target = { sphericalFeatureDiagnosticsById: new Map() };

  setSphericalFeatureDiagnosticsCacheEntryState(target, 7, { label: "numeric" });
  setSphericalFeatureDiagnosticsCacheEntryState(target, "", { label: "empty" });
  setSphericalFeatureDiagnosticsCacheEntryState(target, null, { label: "null" });

  assert.deepEqual(getSphericalFeatureDiagnosticsCacheEntryState(target, "7"), { label: "numeric" });
  assert.deepEqual(getSphericalFeatureDiagnosticsCacheEntryState(target, ""), { label: "empty" });
  assert.deepEqual(getSphericalFeatureDiagnosticsCacheEntryState(target, null), { label: "null" });
});

test("spherical diagnostics cache preserves structured clone values", () => {
  const target = { sphericalFeatureDiagnosticsById: new Map() };
  const diagnostics = {
    reasons: new Map([["unsafe", { count: 1 }]]),
    tags: new Set(["world-bounds"]),
  };
  diagnostics.self = diagnostics;

  setSphericalFeatureDiagnosticsCacheEntryState(target, "cyclic", diagnostics);
  diagnostics.reasons.get("unsafe").count = 99;
  diagnostics.tags.add("mutated");

  const firstRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "cyclic");
  assert.equal(firstRead.self, firstRead);
  assert.deepEqual(firstRead.reasons, new Map([["unsafe", { count: 1 }]]));
  assert.deepEqual(firstRead.tags, new Set(["world-bounds"]));

  firstRead.reasons.get("unsafe").count = 77;
  const secondRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "cyclic");
  assert.equal(secondRead.reasons.get("unsafe").count, 1);
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
  assert.throws(() => clearSphericalFeatureDiagnosticsCacheState(target), /sphericalFeatureDiagnosticsById must be a Map/);
  assert.throws(() => getSphericalFeatureDiagnosticsCacheEntryState(target, "A"), /sphericalFeatureDiagnosticsById must be a Map/);
  assert.throws(() => setSphericalFeatureDiagnosticsCacheEntryState(target, "A", {}), /sphericalFeatureDiagnosticsById must be a Map/);
});
