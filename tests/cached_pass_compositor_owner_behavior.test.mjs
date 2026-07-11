import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCachedPassCompositorOwner } from "../js/core/renderer/cached_pass_compositor_owner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const OWNER_PATH = path.join(REPO_ROOT, "js", "core", "renderer", "cached_pass_compositor_owner.js");

function createCanvasContext(label) {
  const calls = [];
  return {
    label,
    calls,
    save() {
      calls.push(["save"]);
    },
    setTransform(...values) {
      calls.push(["setTransform", ...values]);
    },
    translate(...values) {
      calls.push(["translate", ...values]);
    },
    scale(...values) {
      calls.push(["scale", ...values]);
    },
    drawImage(...values) {
      calls.push(["drawImage", ...values]);
    },
    restore() {
      calls.push(["restore"]);
    },
  };
}

function cloneZoomTransform(transform) {
  return {
    k: Number(transform?.k || 1),
    x: Number(transform?.x || 0),
    y: Number(transform?.y || 0),
  };
}

function areZoomTransformsEquivalent(a, b, epsilon = 0.01) {
  return Math.abs(Number(a?.k || 1) - Number(b?.k || 1)) <= epsilon
    && Math.abs(Number(a?.x || 0) - Number(b?.x || 0)) <= epsilon
    && Math.abs(Number(a?.y || 0) - Number(b?.y || 0)) <= epsilon;
}

function createHarness(overrides = {}) {
  const canvases = {
    background: { id: "background-canvas" },
    labels: { id: "labels-canvas" },
  };
  const references = {
    background: { k: 2, x: 10, y: 20 },
    labels: { k: 1, x: 0, y: 0 },
  };
  const layouts = {
    background: { offsetX: 3, offsetY: 4 },
    labels: { offsetX: 1.25, offsetY: 2.75 },
  };
  const dirty = { background: true, labels: false };
  const diagnostics = [];
  let activeTarget = createCanvasContext("first");
  const dependencies = {
    constants: {
      renderPassNames: ["background", "labels"],
    },
    getters: {
      getActiveTargetContext: () => activeTarget,
      getPassCanvas: (passName) => canvases[passName] || null,
      getPassReferenceTransform: (passName) => references[passName] || null,
      getRenderPassLayout: (passName) => layouts[passName] || null,
      getDpr: () => 2,
      getRenderPhase: () => "interacting",
      isPassDirty: (passName) => Boolean(dirty[passName]),
      isRenderDiagnosticsEnabled: () => true,
    },
    helpers: {
      cloneZoomTransform,
      areZoomTransformsEquivalent,
    },
    effects: {
      recordTransformedPassDiagnostics: (passName, detail) => {
        diagnostics.push({ passName, detail });
      },
    },
  };
  for (const namespace of ["constants", "getters", "helpers", "effects"]) {
    Object.assign(dependencies[namespace], overrides[namespace] || {});
  }
  return {
    owner: createCachedPassCompositorOwner(dependencies),
    canvases,
    references,
    layouts,
    diagnostics,
    get activeTarget() {
      return activeTarget;
    },
    setActiveTarget(nextTarget) {
      activeTarget = nextTarget;
    },
  };
}

test("factory validates the bounded dependency surface and freezes its API", () => {
  const harness = createHarness();
  assert.equal(Object.isFrozen(harness.owner), true);
  assert.deepEqual(Object.keys(harness.owner), [
    "drawTransformedPass",
    "composeRenderPassesToTarget",
  ]);

  for (const [namespace, name] of [
    ["getters", "getActiveTargetContext"],
    ["getters", "getPassCanvas"],
    ["getters", "getPassReferenceTransform"],
    ["getters", "getRenderPassLayout"],
    ["getters", "getDpr"],
    ["getters", "getRenderPhase"],
    ["getters", "isPassDirty"],
    ["getters", "isRenderDiagnosticsEnabled"],
    ["helpers", "cloneZoomTransform"],
    ["helpers", "areZoomTransformsEquivalent"],
    ["effects", "recordTransformedPassDiagnostics"],
  ]) {
    assert.throws(
      () => createHarness({ [namespace]: { [name]: null } }),
      new RegExp(`${namespace}\\.${name} must be a function`),
    );
  }
  assert.throws(
    () => createHarness({ constants: { renderPassNames: [] } }),
    /constants\.renderPassNames must be a non-empty array/,
  );
});

test("drawTransformedPass preserves missing-input and explicit-reference behavior", () => {
  let referenceReads = 0;
  const harness = createHarness({
    getters: {
      getPassReferenceTransform: (passName) => {
        referenceReads += 1;
        return harness.references[passName] || null;
      },
    },
  });
  assert.equal(harness.owner.drawTransformedPass("missing", { k: 1, x: 0, y: 0 }), false);
  assert.equal(referenceReads, 0);

  delete harness.references.background;
  assert.equal(harness.owner.drawTransformedPass("background", { k: 1, x: 0, y: 0 }), false);
  assert.equal(referenceReads, 1);

  assert.equal(
    harness.owner.drawTransformedPass(
      "background",
      { k: 4, x: 50, y: 70 },
      { k: 2, x: 10, y: 20 },
    ),
    true,
  );
  assert.equal(referenceReads, 1);
});

test("drawTransformedPass preserves exact transform math diagnostics and dynamic target lookup", () => {
  const harness = createHarness();
  const firstTarget = harness.activeTarget;
  const currentTransform = { k: 4, x: 50, y: 70 };

  assert.equal(harness.owner.drawTransformedPass("background", currentTransform), true);
  assert.deepEqual(firstTarget.calls, [
    ["save"],
    ["setTransform", 1, 0, 0, 1, 0, 0],
    ["translate", 48, 44],
    ["scale", 2, 2],
    ["drawImage", harness.canvases.background, 0, 0],
    ["restore"],
  ]);
  assert.deepEqual(harness.diagnostics, [{
    passName: "background",
    detail: {
      current: { k: 4, x: 50, y: 70 },
      reference: { k: 2, x: 10, y: 20 },
      scaleRatio: 2,
      dx: 30,
      dy: 30,
      layout: { offsetX: 3, offsetY: 4 },
      phase: "interacting",
      dirty: true,
    },
  }]);

  const secondTarget = createCanvasContext("second");
  harness.setActiveTarget(secondTarget);
  assert.equal(harness.owner.drawTransformedPass("labels", { k: 1, x: 0, y: 0 }), true);
  assert.equal(firstTarget.calls.filter(([name]) => name === "drawImage").length, 1);
  assert.equal(secondTarget.calls.filter(([name]) => name === "drawImage").length, 1);
});

test("composeRenderPassesToTarget preserves missing target and require-all preflight priority", () => {
  let referenceReads = [];
  const harness = createHarness({
    getters: {
      getPassReferenceTransform: (passName) => {
        referenceReads.push(passName);
        return harness.references[passName] || null;
      },
    },
  });
  assert.deepEqual(
    harness.owner.composeRenderPassesToTarget(null, ["background"], { k: 1, x: 0, y: 0 }),
    { ok: false, reason: "missing-target-context" },
  );

  delete harness.canvases.background;
  delete harness.canvases.labels;
  harness.references.background = null;
  assert.deepEqual(
    harness.owner.composeRenderPassesToTarget(
      createCanvasContext("target"),
      ["background", "labels"],
      { k: 1, x: 0, y: 0 },
      { requireAllPasses: true },
    ),
    {
      ok: false,
      reason: "missing-pass-canvas",
      passName: "background",
      missingPassNames: ["background", "labels"],
    },
  );
  assert.deepEqual(referenceReads, []);
});

test("composeRenderPassesToTarget reports the complete require-all reference preflight", () => {
  const harness = createHarness();
  delete harness.references.background;
  delete harness.references.labels;
  assert.deepEqual(
    harness.owner.composeRenderPassesToTarget(
      createCanvasContext("target"),
      ["background", "labels"],
      { k: 1, x: 0, y: 0 },
      { requireAllPasses: true },
    ),
    {
      ok: false,
      reason: "missing-reference-transform",
      passName: "background",
      missingPassNames: ["background", "labels"],
    },
  );
});

test("composeRenderPassesToTarget keeps non-required missing references on the direct path", () => {
  const harness = createHarness();
  const target = createCanvasContext("target");
  delete harness.references.background;

  assert.deepEqual(
    harness.owner.composeRenderPassesToTarget(
      target,
      ["missing", "background"],
      { k: 1, x: 0, y: 0 },
    ),
    { ok: true },
  );
  assert.deepEqual(target.calls, [
    ["drawImage", harness.canvases.background, -6, -8],
  ]);
});

test("composeRenderPassesToTarget preserves transformed and equivalent direct composition", () => {
  const harness = createHarness();
  const transformedTarget = createCanvasContext("transformed");
  assert.deepEqual(
    harness.owner.composeRenderPassesToTarget(
      transformedTarget,
      ["background"],
      { k: 4, x: 50, y: 70 },
    ),
    { ok: true },
  );
  assert.deepEqual(transformedTarget.calls, [
    ["save"],
    ["setTransform", 1, 0, 0, 1, 0, 0],
    ["translate", 48, 44],
    ["scale", 2, 2],
    ["drawImage", harness.canvases.background, 0, 0],
    ["restore"],
  ]);

  const directTarget = createCanvasContext("direct");
  assert.deepEqual(
    harness.owner.composeRenderPassesToTarget(
      directTarget,
      null,
      { k: 2, x: 10, y: 20 },
    ),
    { ok: true },
  );
  assert.deepEqual(directTarget.calls, [
    ["drawImage", harness.canvases.background, -6, -8],
    ["save"],
    ["setTransform", 1, 0, 0, 1, 0, 0],
    ["translate", 15, 29],
    ["scale", 2, 2],
    ["drawImage", harness.canvases.labels, 0, 0],
    ["restore"],
  ]);
});

test("composeRenderPassesToTarget preserves equivalence layout and DPR read order", () => {
  const calls = [];
  const harness = createHarness({
    getters: {
      getRenderPassLayout: (passName) => {
        calls.push(`layout:${passName}`);
        return { offsetX: 0, offsetY: 0 };
      },
      getDpr: () => {
        calls.push("dpr");
        return 1;
      },
    },
    helpers: {
      areZoomTransformsEquivalent: (a, b) => {
        calls.push("equivalent");
        return areZoomTransformsEquivalent(a, b);
      },
    },
  });
  assert.deepEqual(
    harness.owner.composeRenderPassesToTarget(
      createCanvasContext("target"),
      ["background"],
      { k: 4, x: 50, y: 70 },
    ),
    { ok: true },
  );
  assert.deepEqual(calls, ["equivalent", "layout:background", "dpr"]);
});

test("owner source stays free of renderer globals imports and dynamic dispatch helpers", () => {
  const source = fs.readFileSync(OWNER_PATH, "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  for (const token of [
    "map_renderer.js",
    "RendererRuntimeContext",
    "globalThis",
    "document",
    "window",
    "runtimeState",
    "getRenderPassCacheState",
    "runGetter",
    "runEffect",
    "effectOrder",
    "getterOrder",
    "createTrace",
  ]) {
    assert.equal(source.includes(token), false, token);
  }
  assert.ok(source.split(/\r?\n/).length <= 320);
});
