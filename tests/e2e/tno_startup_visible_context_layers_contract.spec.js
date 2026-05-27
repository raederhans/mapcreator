const { test, expect } = require("@playwright/test");
const { gotoApp } = require("./support/playwright-app");

const TNO_READY_PATH = "/?render_profile=balanced&startup_interaction=readonly&startup_worker=1&startup_cache=1&default_scenario=tno_1962";

async function readTnoStartupVisibleLayers(page) {
  return page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return {
      activeScenarioId: String(state.activeScenarioId || ""),
      startupReadonly: !!state.startupReadonly,
      startupReadonlyUnlockInFlight: !!state.startupReadonlyUnlockInFlight,
      scenarioApplyInFlight: !!state.scenarioApplyInFlight,
      detailPromotionCompleted: !!state.detailPromotionCompleted,
      topologyBundleMode: String(state.topologyBundleMode || ""),
      hasWaterRegionsData: !!state.waterRegionsData,
      hasOceanData: !!state.oceanData,
      hasLandBgData: !!state.landBgData,
      hasUrbanData: !!state.urbanData,
      hasPhysicalData: !!state.physicalData,
      hasRiversData: !!state.riversData,
      selectionVersion: Number(state.runtimeChunkLoadState?.selectionVersion || 0),
      scenarioPoliticalChunkFeatureCount: Array.isArray(state.scenarioPoliticalChunkData?.features)
        ? state.scenarioPoliticalChunkData.features.length
        : 0,
      landFeatureCount: Array.isArray(state.landData?.features) ? state.landData.features.length : 0,
      colorCount: state.colors && typeof state.colors === "object" ? Object.keys(state.colors).length : 0,
    };
  });
}

async function waitForTnoReady(page, { timeout = 120_000 } = {}) {
  await expect.poll(async () => {
    const runtime = await readTnoStartupVisibleLayers(page);
    return runtime.activeScenarioId === "tno_1962"
      && runtime.startupReadonly === false
      && runtime.startupReadonlyUnlockInFlight === false
      && runtime.scenarioApplyInFlight === false
      && runtime.selectionVersion >= 1
      && runtime.scenarioPoliticalChunkFeatureCount > 0
      && runtime.landFeatureCount > 0
      && runtime.colorCount > 0;
  }, { timeout }).toBe(true);
}

test("TNO startup keeps default visible context layers after startup-topology slimming", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, TNO_READY_PATH, { waitUntil: "domcontentloaded" });
  await waitForTnoReady(page);

  const runtime = await readTnoStartupVisibleLayers(page);
  expect(runtime.hasWaterRegionsData).toBe(true);
  expect(runtime.hasOceanData).toBe(true);
  expect(runtime.hasLandBgData).toBe(true);
  expect(runtime.hasUrbanData).toBe(true);
  expect(runtime.hasPhysicalData).toBe(true);
  expect(runtime.hasRiversData).toBe(true);
  expect(runtime.selectionVersion).toBeGreaterThanOrEqual(1);
  expect(runtime.scenarioPoliticalChunkFeatureCount).toBeGreaterThan(0);
  expect(runtime.landFeatureCount).toBeGreaterThan(0);
  expect(runtime.colorCount).toBeGreaterThan(0);
});
