import assert from "node:assert/strict";
import test from "node:test";

import thematicIndex from "../data/thematic_layers/index.json" with { type: "json" };
import politicalManifest from "../data/thematic_layers/political/state_capacity_demo/manifest.json" with { type: "json" };
import wgiManifest from "../data/thematic_layers/political/wgi_state_capacity_v1/manifest.json" with { type: "json" };
import socialManifest from "../data/thematic_layers/social/human_development_demo/manifest.json" with { type: "json" };
import populationManifest from "../data/thematic_layers/population/population_density_demo/manifest.json" with { type: "json" };
import {
  listDefaultThematicLayerSummaries,
  loadThematicLayerCatalogPreview,
  normalizeThematicLayerCatalogPayload,
  THEMATIC_LAYER_RENDER_DISABLED_REASON,
  THEMATIC_REAL_SOURCE_DERIVED_METADATA_REASON,
  THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON,
  THEMATIC_SOURCE_POLICY_FIXTURE_ONLY,
  THEMATIC_SOURCE_POLICY_REAL_SOURCE_CACHE_ONLY,
} from "../js/core/thematic_layer_catalog.js";
import {
  resolveThematicLayerCatalogAssetKey,
  resolveThematicLayerCatalogUrl,
  resolveThematicLayerManifestAssetKey,
  resolveThematicLayerManifestUrl,
} from "../js/core/runtime_asset_registry.js";

test("thematic registry resolvers expose the catalog and manifest asset keys", () => {
  assert.equal(resolveThematicLayerCatalogAssetKey(), "thematic_layer_catalog");
  assert.equal(resolveThematicLayerCatalogUrl(), "data/thematic_layers/index.json");
  assert.equal(
    resolveThematicLayerManifestAssetKey("population_density_demo"),
    "thematic_layer:population_density_demo",
  );
  assert.equal(
    resolveThematicLayerManifestUrl("political_state_capacity_demo"),
    "data/thematic_layers/political/state_capacity_demo/manifest.json",
  );
});

test("default thematic layer summaries stay read-only and fixture-labeled", () => {
  const layers = listDefaultThematicLayerSummaries();

  assert.equal(layers.length, thematicIndex.layers.length);
  layers.forEach((layer) => {
    if (layer.layerId === "political_wgi_state_capacity_v1") {
      assert.equal(layer.sourcePolicy, THEMATIC_SOURCE_POLICY_REAL_SOURCE_CACHE_ONLY);
      assert.equal(layer.fixtureOnly, false);
      assert.equal(layer.realSourceStatus, THEMATIC_REAL_SOURCE_DERIVED_METADATA_REASON);
    } else {
      assert.equal(layer.sourcePolicy, THEMATIC_SOURCE_POLICY_FIXTURE_ONLY);
      assert.equal(layer.fixtureOnly, true);
      assert.equal(layer.realSourceStatus, THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON);
    }
    assert.equal(layer.hiddenByDefault, true);
    assert.equal(layer.supportsRuntimePreview, true);
    assert.equal(layer.supportsMainMapRender, false);
    assert.equal(layer.disabledReason, THEMATIC_LAYER_RENDER_DISABLED_REASON);
  });
});

test("catalog normalization joins index rows with loaded manifests", () => {
  const preview = normalizeThematicLayerCatalogPayload(thematicIndex, {
    assetKey: "thematic_layer_catalog",
    manifestByLayerId: {
      political_state_capacity_demo: politicalManifest,
      social_human_development_demo: socialManifest,
      population_density_demo: populationManifest,
      political_wgi_state_capacity_v1: wgiManifest,
    },
  });

  assert.equal(preview.status, "ready");
  assert.equal(preview.assetKey, "thematic_layer_catalog");
  assert.equal(preview.layerCount, thematicIndex.layers.length);
  assert.equal(preview.loadedManifestCount, thematicIndex.layers.length);
  assert.equal(preview.layers[0].payloadKind, "Admin metrics available");
  assert.equal(preview.layers[2].payloadKind, "Grid payload available");
  assert.equal(preview.layers[2].featureCount, 259200);
  assert.equal(preview.layers[2].renderer, "grid_heatmap");
  const wgi = preview.layers.find((layer) => layer.layerId === "political_wgi_state_capacity_v1");
  assert.equal(wgi.title, "WGI Governance Proxy");
  assert.equal(wgi.sourcePolicy, THEMATIC_SOURCE_POLICY_REAL_SOURCE_CACHE_ONLY);
  assert.equal(wgi.realSourceStatus, THEMATIC_REAL_SOURCE_DERIVED_METADATA_REASON);
  assert.equal(wgi.supportsMainMapRender, false);
});

test("catalog loader uses data service asset keys for index and manifests", async () => {
  const payloadsByKey = {
    thematic_layer_catalog: thematicIndex,
    "thematic_layer:political_state_capacity_demo": politicalManifest,
    "thematic_layer:social_human_development_demo": socialManifest,
    "thematic_layer:population_density_demo": populationManifest,
    "thematic_layer:political_wgi_state_capacity_v1": wgiManifest,
  };
  const requestedKeys = [];

  const preview = await loadThematicLayerCatalogPreview({
    loadAsset: async (key) => {
      requestedKeys.push(key);
      return payloadsByKey[key];
    },
  });

  assert.deepEqual(requestedKeys, [
    "thematic_layer_catalog",
    "thematic_layer:political_state_capacity_demo",
    "thematic_layer:social_human_development_demo",
    "thematic_layer:population_density_demo",
    "thematic_layer:political_wgi_state_capacity_v1",
  ]);
  assert.equal(preview.layerCount, thematicIndex.layers.length);
  assert.equal(preview.loadedManifestCount, thematicIndex.layers.length);
  assert.equal(preview.layers.every((layer) => layer.supportsMainMapRender === false), true);
});
