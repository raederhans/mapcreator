import test from "node:test";
import assert from "node:assert/strict";

import { createPhysicalLayerRenderOwner } from "../js/core/renderer/physical_layer_render_owner.js";

function createCanvasContext() {
  const calls = [];
  return {
    calls,
    fillStyle: "",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineCap: "",
    lineJoin: "",
    lineWidth: 1,
    strokeStyle: "",
    arc(x, y, radius) {
      calls.push({ type: "arc", x, y, radius });
    },
    beginPath() {
      calls.push({ type: "beginPath" });
    },
    createRadialGradient() {
      const stops = [];
      return {
        stops,
        addColorStop(offset, color) {
          stops.push({ offset, color });
        },
      };
    },
    fill() {
      calls.push({
        type: "fill",
        alpha: this.globalAlpha,
        composite: this.globalCompositeOperation,
        fillStyle: this.fillStyle,
      });
    },
    restore() {
      calls.push({ type: "restore" });
    },
    save() {
      calls.push({ type: "save" });
    },
    stroke() {
      calls.push({
        type: "stroke",
        alpha: this.globalAlpha,
        composite: this.globalCompositeOperation,
        lineWidth: this.lineWidth,
        strokeStyle: this.strokeStyle,
      });
    },
  };
}

function createAtlasFeature(atlasClass, layerName, id = `${atlasClass}:${layerName}`) {
  return {
    id,
    properties: {
      atlasClass,
      layerName,
    },
  };
}

function createContourFeature(id, elevation = 500) {
  return {
    id,
    properties: {
      elevation_m: elevation,
    },
  };
}

function createOwner({
  atlasFeatures = [],
  context = createCanvasContext(),
  contourMajorFeatures = [],
  contourMinorFeatures = [],
  intensityPoints = [],
  showPhysical = true,
} = {}) {
  const metrics = [];
  const pathCalls = [];
  const helperCalls = [];
  const state = {
    intensityFields: {
      channels: {
        physicalAtlas: {
          enabled: intensityPoints.length > 0,
          points: intensityPoints,
        },
      },
    },
    physicalContourMajorData: { type: "FeatureCollection", features: contourMajorFeatures },
    physicalContourMinorData: { type: "FeatureCollection", features: contourMinorFeatures },
    showPhysical,
    styleConfig: {
      physical: {
        atlasClassVisibility: {},
        atlasIntensity: 1,
        atlasOpacity: 1,
        blendMode: "multiply",
        contourColor: "#776655",
        contourMajorIntervalM: 500,
        contourMajorLowReliefCutoffM: 0,
        contourMajorWidth: 1,
        contourMinorIntervalM: 100,
        contourMinorLowReliefCutoffM: 0,
        contourMinorVisible: true,
        contourMinorWidth: 0.5,
        contourOpacity: 0.8,
        mode: "atlas_and_contours",
        opacity: 1,
      },
    },
  };
  const atlasCollection = { type: "FeatureCollection", features: atlasFeatures };
  const owner = createPhysicalLayerRenderOwner({
    state,
    constants: {
      PHYSICAL_ATLAS_PALETTE: {
        forest: "#446644",
        mountain: "#887766",
      },
    },
    getters: {
      getContext: () => context,
      getPathCanvas: () => (feature) => pathCalls.push(feature),
      getProjection: () => ([lon, lat]) => [lon * 10, lat * 10],
    },
    helpers: {
      applyPhysicalLandClipMask: () => helperCalls.push("clip"),
      clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
      collectContextMetric: (name, durationMs, details) => metrics.push({ name, durationMs, details }),
      getAdaptiveContourStrokeColor: (feature, baseColor) => (feature.id === "minor-a" ? "#334455" : baseColor),
      getAtlasFeatureAlphaMultiplier: (atlasClass) => (atlasClass === "mountain" ? 0.8 : 1),
      getContourVisibleFeatures: (collection) => collection?.features || [],
      getContourZoomStyleProfile: () => ({
        majorIntervalMultiplier: 1,
        majorMinScreenSpanPx: 0,
        majorOpacityMultiplier: 1,
        majorWidthMultiplier: 1,
        minorIntervalMultiplier: 1,
        minorMaxFeaturesBase: 10,
        minorMaxFeaturesHardCap: 100,
        minorMaxFeaturesPerMajor: 1,
        minorMinScreenSpanPx: 0,
        minorOpacityMultiplier: 0.5,
        minorVisible: true,
        minorWidthMultiplier: 1,
      }),
      getFeatureCollectionFeatureCount: (collection) => collection?.features?.length || 0,
      getFieldFeatureMultiplier: (channelId, feature) => (channelId === "physicalContour" && feature.id === "minor-a" ? 0.5 : 1),
      getPhysicalAtlasClass: (feature) => feature?.properties?.atlasClass || "",
      getPhysicalAtlasLayer: (feature) => feature?.properties?.layerName || "",
      getPhysicalLandMaskInfo: () => ({
        maskArcRefEstimate: 7,
        maskFeatureCount: 3,
        maskSource: "landData",
      }),
      getPhysicalPresetRenderProfile: () => ({
        majorContourOpacityMultiplier: 1,
        minorContourMinZoom: 1,
        minorContourOpacityRatio: 0.5,
        reliefBlendFallback: "source-over",
        reliefOpacityMultiplier: 0.8,
        reliefOverlayOpacityCap: 0.5,
        reliefOverlayOpacityRatio: 0.5,
        semanticBlendMode: "multiply",
        semanticOpacityMultiplier: 1,
      }),
      getPhysicalReliefOverlayBlendMode: () => "soft-light",
      getProjectedDegreeRadiusPx: () => 12,
      getResolvedPhysicalAtlasCollection: () => atlasCollection,
      getSafeBlendMode: (value, fallback) => value || fallback,
      getSafeCanvasColor: (value, fallback) => value || fallback,
      normalizeIntensityFieldsState: (fields) => fields,
      normalizePhysicalStyleConfig: (config) => config,
      nowMs: () => 10,
      pathBoundsInScreen: () => true,
      shouldReportDeferredContextLayerGap: () => true,
      warnMissingPhysicalContextOnce: (key) => helperCalls.push(`warn:${key}`),
    },
  });
  return { context, helperCalls, metrics, owner, pathCalls, state };
}

test("physical layer owner records skip metrics when hidden", () => {
  const harness = createOwner({
    atlasFeatures: [createAtlasFeature("forest", "semantic_overlay")],
    showPhysical: false,
  });

  harness.owner.drawPhysicalBasePass(1);

  assert.equal(harness.metrics.at(-1).name, "drawPhysicalBasePass");
  assert.equal(harness.metrics.at(-1).details.skipped, true);
  assert.equal(harness.metrics.at(-1).details.reason, "hidden");
  assert.equal(harness.context.calls.length, 0);
});

test("physical base pass draws semantic, intensity, and relief counts in order", () => {
  const semantic = createAtlasFeature("forest", "semantic_overlay", "semantic");
  const relief = createAtlasFeature("mountain", "relief_base", "relief");
  const harness = createOwner({
    atlasFeatures: [semantic, relief],
    intensityPoints: [{ lon: 1, lat: 2, radiusDeg: 1, strength: 1.5 }],
  });

  harness.owner.drawPhysicalBasePass(2);

  assert.deepEqual(harness.pathCalls.map((feature) => feature.id), ["semantic", "relief"]);
  const fills = harness.context.calls.filter((call) => call.type === "fill");
  assert.equal(fills.length, 3);
  assert.equal(harness.metrics.at(-1).name, "drawPhysicalBasePass");
  assert.equal(harness.metrics.at(-1).details.semanticRenderedCount, 1);
  assert.equal(harness.metrics.at(-1).details.intensityRenderedCount, 1);
  assert.equal(harness.metrics.at(-1).details.reliefRenderedCount, 1);
});

test("physical owner respects pre-applied clip masks", () => {
  const semantic = createAtlasFeature("forest", "semantic_overlay", "semantic");
  const relief = createAtlasFeature("mountain", "relief_base", "relief");
  const harness = createOwner({
    atlasFeatures: [semantic, relief],
    intensityPoints: [{ lon: 1, lat: 2, radiusDeg: 1, strength: 1.5 }],
  });
  const cfg = harness.state.styleConfig.physical;
  const atlasCollection = { type: "FeatureCollection", features: [semantic, relief] };

  harness.owner.drawPhysicalAtlasCollectionLayer(atlasCollection, "semantic_overlay", cfg, {
    clipAlreadyApplied: true,
  });
  harness.owner.drawPhysicalIntensityFieldLayer({ clipAlreadyApplied: true });
  harness.owner.drawPhysicalReliefOverlayLayer(2, { clipAlreadyApplied: true });

  assert.equal(harness.helperCalls.includes("clip"), false);
  assert.deepEqual(harness.pathCalls.map((feature) => feature.id), ["semantic", "relief"]);
});

test("physical contour collection batches colors and scales line width by zoom", () => {
  const major = createContourFeature("major-a", 500);
  const minor = createContourFeature("minor-a", 100);
  const harness = createOwner();

  const result = harness.owner.drawContourCollection(
    { type: "FeatureCollection", features: [major, minor] },
    {
      cacheSlot: "major",
      color: "#776655",
      colorResolver: (feature) => (feature.id === "minor-a" ? "#334455" : "#776655"),
      opacity: 0.8,
      width: 2,
      k: 4,
      opacityMultiplierResolver: (feature) => (feature.id === "minor-a" ? 0.5 : 1),
    },
  );

  const strokes = harness.context.calls.filter((call) => call.type === "stroke");
  assert.equal(result.renderedCount, 2);
  assert.equal(result.selectedCount, 2);
  assert.equal(strokes.length, 2);
  assert.equal(strokes[0].lineWidth, 0.5);
  assert.notEqual(strokes[0].strokeStyle, strokes[1].strokeStyle);
  assert.ok(strokes.some((stroke) => stroke.alpha === 0.4));
});

test("physical contour layer uses source-over and reports major and minor counts", () => {
  const harness = createOwner({
    contourMajorFeatures: [createContourFeature("major-a", 500)],
    contourMinorFeatures: [createContourFeature("minor-a", 100)],
  });

  harness.owner.drawPhysicalContourLayer(2);

  const strokes = harness.context.calls.filter((call) => call.type === "stroke");
  assert.equal(strokes.length, 2);
  assert.ok(strokes.every((stroke) => stroke.composite === "source-over"));
  assert.equal(harness.metrics.at(-1).name, "drawPhysicalContourLayer");
  assert.equal(harness.metrics.at(-1).details.majorFeatureCount, 1);
  assert.equal(harness.metrics.at(-1).details.minorFeatureCount, 1);
});
