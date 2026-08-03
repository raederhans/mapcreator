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

test("plain spherical diagnostics cache entries are immutable and reuse one hot-path reference", () => {
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
  assert.equal(Object.isFrozen(firstRead), true);
  assert.equal(Object.isFrozen(firstRead.bounds), true);
  assert.equal(Object.isFrozen(firstRead.bounds[0]), true);
  assert.throws(() => {
    firstRead.bounds[1][1] = 999;
  }, TypeError);
  assert.equal(
    getSphericalFeatureDiagnosticsCacheEntryState(target, "B"),
    firstRead,
  );
  assert.equal(getSphericalFeatureDiagnosticsCacheEntryState(target, "missing"), null);

  assert.equal(clearSphericalFeatureDiagnosticsCacheState(target), true);
  assert.equal(target.sphericalFeatureDiagnosticsById.size, 0);
});

test("plain cyclic diagnostics freeze recursively and keep cycle identity", () => {
  const target = { sphericalFeatureDiagnosticsById: new Map() };
  const diagnostics = { nested: { count: 1 } };
  diagnostics.self = diagnostics;

  setSphericalFeatureDiagnosticsCacheEntryState(target, "cycle", diagnostics);
  const firstRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "cycle");
  const secondRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "cycle");

  assert.equal(firstRead, secondRead);
  assert.equal(firstRead.self, firstRead);
  assert.equal(Object.isFrozen(firstRead), true);
  assert.equal(Object.isFrozen(firstRead.nested), true);
  assert.throws(() => {
    firstRead.nested.count = 2;
  }, TypeError);
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

test("spherical diagnostics cache keeps rich mutable collections detached", () => {
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

test("typed arrays and array buffers stay detached on every cache read", () => {
  const target = { sphericalFeatureDiagnosticsById: new Map() };
  setSphericalFeatureDiagnosticsCacheEntryState(target, "typed", {
    bytes: new Uint8Array([1, 2, 3]),
    buffer: new Uint8Array([4, 5, 6]).buffer,
  });

  const firstRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "typed");
  const secondRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "typed");
  assert.notEqual(firstRead, secondRead);
  assert.notEqual(firstRead.bytes, secondRead.bytes);
  assert.notEqual(firstRead.buffer, secondRead.buffer);

  firstRead.bytes[0] = 99;
  new Uint8Array(firstRead.buffer)[0] = 88;
  const thirdRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "typed");
  assert.deepEqual([...thirdRead.bytes], [1, 2, 3]);
  assert.deepEqual([...new Uint8Array(thirdRead.buffer)], [4, 5, 6]);
});

test("custom prototype values and independent writes never inherit shareable trust", () => {
  class DiagnosticRecord {
    constructor(value) {
      this.value = value;
    }
  }

  const firstTarget = { sphericalFeatureDiagnosticsById: new Map() };
  const secondTarget = { sphericalFeatureDiagnosticsById: new Map() };
  const diagnostics = { record: new DiagnosticRecord(7), nested: { count: 1 } };
  setSphericalFeatureDiagnosticsCacheEntryState(firstTarget, "custom", diagnostics);
  setSphericalFeatureDiagnosticsCacheEntryState(secondTarget, "custom", diagnostics);

  diagnostics.nested.count = 99;
  const firstRead = getSphericalFeatureDiagnosticsCacheEntryState(firstTarget, "custom");
  const firstReadAgain = getSphericalFeatureDiagnosticsCacheEntryState(firstTarget, "custom");
  const secondRead = getSphericalFeatureDiagnosticsCacheEntryState(secondTarget, "custom");
  assert.notEqual(firstRead, firstReadAgain);
  assert.notEqual(firstRead, secondRead);
  assert.equal(firstRead.nested.count, 1);
  assert.equal(secondRead.nested.count, 1);
});

test("accessor shape changes cannot mark a rich detached clone as shareable", () => {
  const target = { sphericalFeatureDiagnosticsById: new Map() };
  let reads = 0;
  const diagnostics = {};
  Object.defineProperty(diagnostics, "payload", {
    enumerable: true,
    get() {
      reads += 1;
      return reads === 1
        ? { count: 1 }
        : new Map([["count", 1]]);
    },
  });

  setSphericalFeatureDiagnosticsCacheEntryState(target, "accessor", diagnostics);
  const firstRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "accessor");
  const secondRead = getSphericalFeatureDiagnosticsCacheEntryState(target, "accessor");
  assert.notEqual(firstRead, secondRead);
  assert.equal(firstRead.payload instanceof Map, true);
  firstRead.payload.set("count", 99);
  assert.equal(
    getSphericalFeatureDiagnosticsCacheEntryState(target, "accessor").payload.get("count"),
    1,
  );
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
