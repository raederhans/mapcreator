import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createRendererViewportUpdateOwner } from "../js/core/renderer/renderer_viewport_update_owner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const EFFECT_NAMES = Object.freeze([
  "setZoomTransform",
  "setHitCanvasDirty",
  "updateZoomUi",
  "renderPhysicalIntensityBrushPreview",
  "syncUnitCounterScalesDuringZoom",
  "syncSpecialZonePatternTransformDuringZoom",
  "drawFrame",
]);

const UPDATE_ORDER = Object.freeze([
  "setZoomTransform",
  "setHitCanvasDirty",
  "updateZoomUi",
  "applyViewportTransform",
  "renderPhysicalIntensityBrushPreview",
  "syncUnitCounterScalesDuringZoom",
  "syncSpecialZonePatternTransformDuringZoom",
  "drawFrame",
]);

function createHarness(options = {}) {
  const calls = {
    order: [],
    setZoomTransform: [],
    applyViewportTransform: [],
  };
  const group = Object.hasOwn(options, "viewportGroup")
    ? options.viewportGroup
    : {
      attr(name, value) {
        calls.order.push("applyViewportTransform");
        calls.applyViewportTransform.push({ name, value });
      },
    };
  const effects = {};
  for (const name of EFFECT_NAMES) {
    effects[name] = (transform) => {
      calls.order.push(name);
      if (name === "setZoomTransform") {
        calls.setZoomTransform.push(transform);
      }
    };
  }
  const getters = {
    getViewportGroup: () => group,
  };
  const owner = createRendererViewportUpdateOwner({ effects, getters });
  return { calls, effects, getters, owner };
}

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(REPO_ROOT, ...parts), "utf8");
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected start marker ${JSON.stringify(startMarker)}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Expected end marker ${JSON.stringify(endMarker)}`);
  return source.slice(start, end);
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing ${JSON.stringify(token)}`);
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected ${JSON.stringify(token)}`);
}

test("updateMap runs viewport update effects in exact order", () => {
  const { calls, owner } = createHarness();
  const transform = { x: 12, y: -5, k: 3 };

  owner.updateMap(transform);

  assert.deepEqual(calls.order, [...UPDATE_ORDER]);
  assert.deepEqual(calls.setZoomTransform, [transform]);
  assert.deepEqual(calls.applyViewportTransform, [{
    name: "transform",
    value: "translate(12,-5) scale(3)",
  }]);
  assert.equal(calls.order.at(-1), "drawFrame");
  assert.equal(calls.order.filter((name) => name === "drawFrame").length, 1);
});

test("updateMap passes null and partial transforms through exactly", () => {
  const { calls, owner } = createHarness({ viewportGroup: false });
  const partialTransform = { x: 7 };

  owner.updateMap(null);
  assert.deepEqual(calls.order, EFFECT_NAMES);

  owner.updateMap(partialTransform);

  assert.deepEqual(calls.order, [...EFFECT_NAMES, ...EFFECT_NAMES]);
  assert.deepEqual(calls.setZoomTransform, [null, partialTransform]);
  assert.deepEqual(calls.applyViewportTransform, []);
});

test("owner fails fast when a required effect is missing", () => {
  for (const missingName of EFFECT_NAMES) {
    const { effects, getters } = createHarness();
    delete effects[missingName];

    assert.throws(
      () => createRendererViewportUpdateOwner({ effects, getters }),
      new RegExp(`renderer viewport update owner requires effects\\.${missingName}`),
    );
  }
});

test("owner fails fast when viewport group getter is missing", () => {
  const { getters, effects } = createHarness();
  delete getters.getViewportGroup;

  assert.throws(
    () => createRendererViewportUpdateOwner({ effects, getters }),
    /renderer viewport update owner requires getters\.getViewportGroup/,
  );
});

test("map_renderer imports wires and delegates viewport updates through the owner", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const updateMapWrapperSource = sliceBetween(
    rendererSource,
    "function updateMap(transform)",
    "function getProjectedHgoRuntimePreviewBounds()",
  );
  const zoomLifecycleFactorySource = sliceBetween(
    rendererSource,
    "function getZoomInteractionLifecycleOwner()",
    "function getMapInteractionEventBindingOwner()",
  );

  for (const token of [
    "import { createRendererViewportUpdateOwner } from \"./renderer/renderer_viewport_update_owner.js\";",
    "let rendererViewportUpdateOwner = null;",
    "function getRendererViewportUpdateOwner()",
    "const rendererContext = getViewportReceiverContext();",
    "const viewportContext = rendererContext.viewport;",
    "const runtime = viewportContext.getRuntimeState();",
    "rendererViewportUpdateOwner = createRendererViewportUpdateOwner({",
    "getters: {",
    "getViewportGroup: viewportContext.getViewportGroup,",
    "setZoomTransform: (transform) => {",
    "setHitCanvasDirty: () => {",
    "updateZoomUi: () => {",
    "renderPhysicalIntensityBrushPreview,",
    "syncUnitCounterScalesDuringZoom: () => {",
    "syncSpecialZonePatternTransformDuringZoom,",
    "drawFrame: () => {",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must wire viewport update owner");
  }

  assertIncludes(
    updateMapWrapperSource,
    "return getRendererViewportUpdateOwner().updateMap(transform);",
    "updateMap wrapper must delegate to viewport update owner",
  );
  assertIncludes(
    zoomLifecycleFactorySource,
    "updateMap,",
    "zoom lifecycle owner must still receive updateMap as an injected effect",
  );

  for (const tokenParts of [
    ["runtimeState.", "zoomTransform = transform;"],
    ["runtimeState.", "hitCanvasDirty = true;"],
    ["rendererSurfaceHost.getViewportGroup().attr("],
    ["rendererSurfaceHost.getViewportGroup()"],
    ["renderPhysicalIntensityBrushPreview();"],
    ["getStrategicOverlayRenderOwner().syncUnitCounterScalesDuringZoom();"],
    ["syncSpecialZonePatternTransformDuringZoom();"],
    ["draw", "Canvas();"],
  ]) {
    assertExcludes(
      updateMapWrapperSource,
      tokenParts.join(""),
      "updateMap wrapper must keep raw update work in the owner wiring",
    );
  }
});

test("viewport update owner avoids forbidden renderer semantics", () => {
  const ownerSource = readRepoFile("js", "core", "renderer", "renderer_viewport_update_owner.js");

  for (const tokenParts of [
    ["map_", "renderer.js"],
    ["runtime", "State"],
    ["draw", "Canvas"],
    ["renderPass", "ToCache"],
    ["build", "HitCanvas"],
    ["set", "MapData"],
    ["fit", "Projection"],
    ["exactAfter", "Settle"],
    ["scenario", " refresh"],
    ["scenario", " chunk"],
    ["strategicOverlay", "Runtime"],
    ["selection", "fill"],
  ]) {
    assertExcludes(
      ownerSource,
      tokenParts.join(""),
      "viewport update owner must avoid forbidden semantic token",
    );
  }
});
