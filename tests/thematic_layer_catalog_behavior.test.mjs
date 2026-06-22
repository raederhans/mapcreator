import assert from "node:assert/strict";
import test from "node:test";

import thematicIndex from "../data/thematic_layers/index.json" with { type: "json" };
import politicalManifest from "../data/thematic_layers/political/state_capacity_demo/manifest.json" with { type: "json" };
import socialManifest from "../data/thematic_layers/social/human_development_demo/manifest.json" with { type: "json" };
import populationManifest from "../data/thematic_layers/population/population_density_demo/manifest.json" with { type: "json" };
import {
  listDefaultThematicLayerSummaries,
  loadThematicLayerCatalogPreview,
  normalizeThematicLayerCatalogPayload,
  THEMATIC_LAYER_RENDER_DISABLED_REASON,
  THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON,
  THEMATIC_SOURCE_POLICY_FIXTURE_ONLY,
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
    assert.equal(layer.sourcePolicy, THEMATIC_SOURCE_POLICY_FIXTURE_ONLY);
    assert.equal(layer.fixtureOnly, true);
    assert.equal(layer.hiddenByDefault, true);
    assert.equal(layer.supportsRuntimePreview, true);
    assert.equal(layer.supportsMainMapRender, false);
    assert.equal(layer.disabledReason, THEMATIC_LAYER_RENDER_DISABLED_REASON);
    assert.equal(layer.realSourceStatus, THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON);
  });
});

test("catalog normalization joins index rows with loaded manifests", () => {
  const preview = normalizeThematicLayerCatalogPayload(thematicIndex, {
    assetKey: "thematic_layer_catalog",
    manifestByLayerId: {
      political_state_capacity_demo: politicalManifest,
      social_human_development_demo: socialManifest,
      population_density_demo: populationManifest,
    },
  });

  assert.equal(preview.status, "ready");
  assert.equal(preview.assetKey, "thematic_layer_catalog");
  assert.equal(preview.layerCount, 3);
  assert.equal(preview.loadedManifestCount, 3);
  assert.equal(preview.layers[0].payloadKind, "Admin metrics available");
  assert.equal(preview.layers[2].payloadKind, "Grid payload available");
  assert.equal(preview.layers[2].featureCount, 259200);
  assert.equal(preview.layers[2].renderer, "grid_heatmap");
});

test("catalog loader uses data service asset keys for index and manifests", async () => {
  const payloadsByKey = {
    thematic_layer_catalog: thematicIndex,
    "thematic_layer:political_state_capacity_demo": politicalManifest,
    "thematic_layer:social_human_development_demo": socialManifest,
    "thematic_layer:population_density_demo": populationManifest,
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
  ]);
  assert.equal(preview.layerCount, 3);
  assert.equal(preview.loadedManifestCount, 3);
  assert.equal(preview.layers.every((layer) => layer.supportsMainMapRender === false), true);
});
