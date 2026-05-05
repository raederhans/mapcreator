const { test, expect } = require("@playwright/test");
const { getAppUrl } = require("./support/playwright-app");

test.setTimeout(90_000);

const APP_URL = getAppUrl();

async function waitForScenarioControlsReady(page) {
  await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const select = document.querySelector("#scenarioSelect");
    const applyButton = document.querySelector("#applyScenarioBtn");
    return !!select
      && !!applyButton
      && select.querySelectorAll("option").length > 0;
  }, { timeout: 60_000 });
  await expect.poll(async () => page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return {
      activeScenarioId: String(state.activeScenarioId || ""),
      scenarioApplyInFlight: !!state.scenarioApplyInFlight,
    };
  }), { timeout: 45_000 }).toEqual({
    activeScenarioId: "tno_1962",
    scenarioApplyInFlight: false,
  });
  await expect.poll(async () => page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return {
      startupReadonly: !!state.startupReadonly,
      startupReadonlyUnlockInFlight: !!state.startupReadonlyUnlockInFlight,
    };
  }), { timeout: 45_000 }).toEqual({
    startupReadonly: false,
    startupReadonlyUnlockInFlight: false,
  });
  await page.evaluate(() => {
    document.querySelector("#scenarioSelect")?.closest("details")?.setAttribute("open", "");
  });
  await expect(page.locator("#scenarioSelect")).toBeVisible();
}

async function waitForOwnershipOnlyControlsReady(page) {
  await expect.poll(async () => page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return {
      activeScenarioId: String(state.activeScenarioId || ""),
      scenarioApplyInFlight: !!state.scenarioApplyInFlight,
      startupReadonly: !!state.startupReadonly,
      startupReadonlyUnlockInFlight: !!state.startupReadonlyUnlockInFlight,
      detailPromotionInFlight: !!state.detailPromotionInFlight,
      hasViewModeSelect: !!document.querySelector("#scenarioViewModeSelect"),
    };
  }), { timeout: 45_000 }).toEqual({
    activeScenarioId: "tno_1962",
    scenarioApplyInFlight: false,
    startupReadonly: false,
    startupReadonlyUnlockInFlight: false,
    detailPromotionInFlight: false,
    hasViewModeSelect: false,
  });
}
test("scenario controls apply reset and exit stay on dispatcher-backed path", async ({ page }) => {
  await waitForScenarioControlsReady(page);

  await page.selectOption("#scenarioSelect", "hoi4_1939");
  await page.locator("#applyScenarioBtn").click();

  await expect.poll(async () => page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return {
      activeScenarioId: String(state.activeScenarioId || ""),
      scenarioApplyInFlight: !!state.scenarioApplyInFlight,
    };
  }), { timeout: 45_000 }).toEqual({
    activeScenarioId: "hoi4_1939",
    scenarioApplyInFlight: false,
  });
  const firstFrameChunkState = await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return {
      chunkFeatureCount: Array.isArray(state.scenarioPoliticalChunkData?.features)
        ? state.scenarioPoliticalChunkData.features.length
        : 0,
      loadedChunkCount: Array.isArray(state.activeScenarioChunks?.loadedChunkIds)
        ? state.activeScenarioChunks.loadedChunkIds.length
        : 0,
    };
  });
  expect(firstFrameChunkState.chunkFeatureCount).toBeGreaterThan(0);
  expect(firstFrameChunkState.loadedChunkCount).toBeGreaterThan(0);
  await expect(page.locator("#scenarioStatus")).toContainText("HOI4 1939");

  await page.locator("#resetScenarioBtn").click();
  await expect.poll(async () => page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return {
      activeScenarioId: String(state.activeScenarioId || ""),
      scenarioApplyInFlight: !!state.scenarioApplyInFlight,
    };
  }), { timeout: 45_000 }).toEqual({
    activeScenarioId: "hoi4_1939",
    scenarioApplyInFlight: false,
  });

  await page.locator("#clearScenarioBtn").click();
  await expect.poll(async () => page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return {
      activeScenarioId: String(state.activeScenarioId || ""),
      scenarioApplyInFlight: !!state.scenarioApplyInFlight,
    };
  }), { timeout: 45_000 }).toEqual({
    activeScenarioId: "",
    scenarioApplyInFlight: false,
  });
  await expect(page.locator("#scenarioStatus")).toContainText("No scenario active");
});

test("scenario controls expose ownership-only mode after control retirement", async ({ page }) => {
  await waitForScenarioControlsReady(page);
  await waitForOwnershipOnlyControlsReady(page);
  await expect(page.locator("#scenarioViewModeSelect")).toHaveCount(0);
});
