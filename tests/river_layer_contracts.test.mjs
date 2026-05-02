import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

function readRepoFile(...relativeParts) {
  return fs.readFileSync(path.join(REPO_ROOT, ...relativeParts), "utf8");
}

function readJsonRepoFile(...relativeParts) {
  return JSON.parse(readRepoFile(...relativeParts));
}

test("river layer contracts keep zoom gating, render metrics, and targeted regression coverage", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");
  const riverSpecSource = readRepoFile("tests", "e2e", "river_layer_regression.spec.js");

  const drawRiversLayerStart = rendererSource.indexOf("function drawRiversLayer");
  const drawRiversLayerEnd = rendererSource.indexOf("function drawTextureLabelEffectsPass", drawRiversLayerStart);
  const drawRiversLayerSource =
    drawRiversLayerStart >= 0 && drawRiversLayerEnd > drawRiversLayerStart
      ? rendererSource.slice(drawRiversLayerStart, drawRiversLayerEnd)
      : "";

  const contextBaseStart = rendererSource.indexOf("function drawContextBasePass");
  const contextBaseEnd = rendererSource.indexOf("function drawContextMarkersPass", contextBaseStart);
  const contextBaseSource =
    contextBaseStart >= 0 && contextBaseEnd > contextBaseStart
      ? rendererSource.slice(contextBaseStart, contextBaseEnd)
      : "";

  const checks = {
    hasDrawRiversLayerPass: drawRiversLayerSource.includes("function drawRiversLayer(k, { interactive = false } = {})"),
    riverPassRecordsPerfMetric:
      drawRiversLayerSource.includes('recordRenderPerfMetric("drawRiversLayer"')
      || drawRiversLayerSource.includes('collectContextMetric("drawRiversLayer"'),
    riverPassComputesZoomBucket:
      /zoomBucket/.test(drawRiversLayerSource)
      && /coreWidthFactor/.test(drawRiversLayerSource)
      && /outlineWidthFactor/.test(drawRiversLayerSource)
      && /outlineAlphaFactor/.test(drawRiversLayerSource),
    contextBaseInvokesRiverPass:
      contextBaseSource.includes("drawRiversLayer(k, { interactive });"),
    deferredContextStillRecordsRiverMetric:
      /collectContextMetric\("drawRiversLayer", 0, \{[\s\S]*?reason: "staged-apply"/.test(contextBaseSource),
    hasTargetedRiverRegressionSpec:
      riverSpecSource.includes("river layer major and mid-tier zoom gating regression")
      && riverSpecSource.includes("river layer lake and intermittent zoom gating regression")
      && riverSpecSource.includes("river layer canal zoom gating regression")
      && riverSpecSource.includes("readRiverRenderMetric")
      && riverSpecSource.includes("drawRiversLayer")
      && riverSpecSource.includes("zoomBucket")
      && riverSpecSource.includes("coreWidthFactor")
      && riverSpecSource.includes("outlineWidthFactor"),
    regressionSpecKeepsRepresentativeSubsets:
      riverSpecSource.includes("river-major")
      && riverSpecSource.includes("river-mid-tier")
      && riverSpecSource.includes("lake-centerline")
      && riverSpecSource.includes("river-intermittent")
      && riverSpecSource.includes("canal"),
  };

  Object.entries(checks).forEach(([label, ok]) => {
    assert.equal(ok, true, label);
  });
});

test("river layer data remains wired from runtime registry to deferred context loader", () => {
  const registry = readJsonRepoFile("data", "runtime_asset_registry.json");
  const manifest = readJsonRepoFile("data", "manifest.json");
  const dataLoaderSource = readRepoFile("js", "core", "data_loader.js");
  const startupDataPipelineSource = readRepoFile("js", "bootstrap", "startup_data_pipeline.js");
  const startupBundleSource = readRepoFile("tools", "build_startup_bundle.py");
  const pagesDistSource = readRepoFile("tools", "build_pages_dist.py");

  assert.equal(registry.assets?.["context_layer:rivers"]?.url, "data/global_rivers.geojson");
  assert.equal(manifest.runtime_asset_registry?.assets?.["context_layer:rivers"]?.url, "data/global_rivers.geojson");
  assert.ok(pagesDistSource.includes('"global_rivers.geojson"'));
  assert.ok(startupBundleSource.includes('"rivers",'));
  assert.ok(startupBundleSource.includes('"featurecla"'));
  assert.ok(startupBundleSource.includes('"scalerank"'));

  assert.ok(dataLoaderSource.includes('const GLOBAL_RIVERS_CONTEXT_PACK_URL = resolveDataAssetUrl("context_layer:rivers");'));
  assert.ok(/function normalizeRequestedContextLayerNames\(includeContextLayers\)[\s\S]*return \["rivers", \.\.\.Object\.keys\(CONTEXT_LAYER_PACKS\)\];/.test(dataLoaderSource));
  assert.ok(/if \(layerName === "rivers"\) \{[\s\S]*?return loadRiversFallbackCollection\(d3Client\);[\s\S]*?\}/.test(dataLoaderSource));
  assert.ok(/const CONTEXT_LAYER_LOAD_ORDER = \[[\s\S]*?"rivers",/.test(startupDataPipelineSource));
});
