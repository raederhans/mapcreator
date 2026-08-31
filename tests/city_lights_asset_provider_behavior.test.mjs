import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createCityLightsAssetProvider,
  MODERN_CITY_LIGHTS_ASSET_SPECIFIER,
} from "../js/core/renderer/city_lights_asset_provider.js";

const rendererSource = await readFile(new URL("../js/core/map_renderer.js", import.meta.url), "utf8");
const providerSource = await readFile(
  new URL("../js/core/renderer/city_lights_asset_provider.js", import.meta.url),
  "utf8",
);

function createModernAsset(overrides = {}) {
  return {
    MODERN_CITY_LIGHTS_BASE_THRESHOLD: 2,
    MODERN_CITY_LIGHTS_CORRIDOR_THRESHOLD: 14,
    MODERN_CITY_LIGHTS_GRID: new Uint8Array([1, 2, 3, 4]),
    MODERN_CITY_LIGHTS_GRID_HEIGHT: 2,
    MODERN_CITY_LIGHTS_GRID_WIDTH: 2,
    MODERN_CITY_LIGHTS_STATS: { max: 4 },
    MODERN_CITY_LIGHTS_STEP_LAT_DEG: 90,
    MODERN_CITY_LIGHTS_STEP_LON_DEG: 180,
    ...overrides,
  };
}

test("map renderer startup graph has no static Modern City Lights asset import", () => {
  assert.doesNotMatch(rendererSource, /from\s+["']\.\/city_lights_modern_asset\.js["']/);
  assert.match(rendererSource, /createCityLightsAssetProvider\(\)/);
  assert.match(rendererSource, /return getCityLightsRenderOwner\(\)\.drawNightLightsLayer\(k, config, solarState\);/);
  assert.match(providerSource, /import\(["']\.\.\/city_lights_modern_asset\.js["']\)/);
  assert.doesNotMatch(providerSource, /from\s+["']\.\.\/city_lights_modern_asset\.js["']/);
});

test("provider does not import the modern asset until explicitly requested", async () => {
  const imports = [];
  const historicalEntries = [{ name: "historical" }];
  const provider = createCityLightsAssetProvider({
    historicalEntries,
    importModernAsset: async (specifier) => {
      imports.push(specifier);
      return createModernAsset();
    },
  });

  const initialAssets = provider.getAssets();
  assert.deepEqual(imports, []);
  assert.equal(initialAssets.HISTORICAL_1930_CITY_LIGHTS_ENTRIES, historicalEntries);
  assert.deepEqual(initialAssets.MODERN_CITY_LIGHTS_GRID, []);
  assert.equal(provider.isModernAssetsReady(), false);

  const loadedAssets = await provider.ensureModernAssets();

  assert.deepEqual(imports, [MODERN_CITY_LIGHTS_ASSET_SPECIFIER]);
  assert.equal(loadedAssets.MODERN_CITY_LIGHTS_GRID.length, 4);
  assert.equal(provider.getAssets().MODERN_CITY_LIGHTS_GRID, loadedAssets.MODERN_CITY_LIGHTS_GRID);
  assert.equal(provider.isModernAssetsReady(), true);
});

test("provider coalesces concurrent loads and retries after a rejected import", async () => {
  let attempts = 0;
  let resolveFirstImport;
  const provider = createCityLightsAssetProvider({
    importModernAsset: () => {
      attempts += 1;
      if (attempts === 1) {
        return new Promise((_resolve, reject) => {
          resolveFirstImport = () => reject(new Error("network unavailable"));
        });
      }
      return Promise.resolve(createModernAsset());
    },
  });

  const first = provider.ensureModernAssets();
  const second = provider.ensureModernAssets();
  assert.equal(first, second);
  assert.equal(attempts, 0, "import starts in a microtask so disabled boot remains side-effect free");
  await Promise.resolve();
  assert.equal(attempts, 1);
  resolveFirstImport();
  await assert.rejects(first, /network unavailable/);

  await provider.ensureModernAssets();
  assert.equal(attempts, 2);
  assert.equal(provider.isModernAssetsReady(), true);
});

test("provider rejects malformed modern grid dimensions", async () => {
  const provider = createCityLightsAssetProvider({
    importModernAsset: async () => createModernAsset({
      MODERN_CITY_LIGHTS_GRID_WIDTH: 3,
    }),
  });

  await assert.rejects(provider.ensureModernAssets(), /dimensions do not match/);
  assert.equal(provider.isModernAssetsReady(), false);
});
