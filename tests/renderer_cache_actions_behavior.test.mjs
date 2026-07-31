import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  commitProjectedBoundsCacheState,
  commitRenderPassCacheState,
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
