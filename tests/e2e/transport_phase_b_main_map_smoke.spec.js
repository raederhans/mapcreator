const { test, expect } = require("@playwright/test");
const { gotoApp, waitForAppInteractive, waitForRenderIdle } = require("./support/playwright-app");

const SMOKE_CASES = [
  { family: "road", packId: "germany_road", keys: ["roads", "road_labels"] },
  { family: "rail", packId: "france_rail", keys: ["railways", "rail_stations_major"] },
  { family: "airport", packId: "usa_airport", keys: ["airports"] },
];

async function applyPack(page, { family, packId, keys }) {
  await page.locator(`button[data-transport-family="${family}"]`).click();
  await page.locator("#transportWorkbenchPackSelect").selectOption(packId);
  await expect(page.locator("#transportWorkbenchApplyBtn")).toHaveText("Apply to Main Map", { timeout: 60_000 });
  await expect(page.locator("#transportWorkbenchApplyBtn")).toBeEnabled();
  await page.locator("#transportWorkbenchApplyBtn").click();
  await page.waitForFunction(({ expectedPackId, expectedFamily, expectedKeys }) => {
    const state = globalThis.__playwrightStateRef || null;
    const overlay = state?.transportCountryOverlayState || null;
    if (overlay?.status !== "ready" || overlay.activePackId !== expectedPackId || overlay.family !== expectedFamily) return false;
    return expectedKeys.every((key) => Array.isArray(overlay.collectionsByLayer?.[key]?.features) && overlay.collectionsByLayer[key].features.length > 0);
  }, { expectedPackId: packId, expectedFamily: family, expectedKeys: keys }, { timeout: 90_000 });
  await waitForRenderIdle(page, { timeout: 60_000 });
  return page.evaluate(({ expectedPackId, expectedFamily, expectedKeys }) => {
    const state = globalThis.__playwrightStateRef || {};
    const overlay = state.transportCountryOverlayState || {};
    return {
      activePackId: overlay.activePackId,
      family: overlay.family,
      status: overlay.status,
      sourceKeys: Object.keys(overlay.sourceSignature || {}),
      persistedPackId: state.styleConfig?.transportOverview?.activePackIdByFamily?.[expectedFamily] || "",
      counts: Object.fromEntries(expectedKeys.map((key) => [key, overlay.collectionsByLayer?.[key]?.features?.length || 0])),
      showTransport: !!state.showTransport,
      showRoad: !!state.showRoad,
      showRail: !!state.showRail,
      showAirports: !!state.showAirports,
    };
  }, { expectedPackId: packId, expectedFamily: family, expectedKeys: keys });
}

test("transport Phase B country packs apply to the main map", async ({ page }) => {
  test.setTimeout(180_000);
  await gotoApp(page, "/?render_profile=balanced&startup_interaction=readonly&startup_worker=1&startup_cache=1", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page, { timeout: 120_000 });

  await page.locator("#zoomControls #scenarioTransportWorkbenchBtn").click();
  await expect(page.locator("#transportWorkbenchOverlay")).toBeVisible();
  await expect(page.locator("#transportWorkbenchPackSelect")).toBeVisible();

  const snapshots = [];
  for (const smokeCase of SMOKE_CASES) {
    snapshots.push(await applyPack(page, smokeCase));
  }

  expect(snapshots.map((entry) => entry.activePackId)).toEqual(SMOKE_CASES.map((entry) => entry.packId));
  for (const snapshot of snapshots) {
    expect(snapshot.status).toBe("ready");
    expect(snapshot.persistedPackId).toBe(snapshot.activePackId);
    expect(snapshot.sourceKeys.length).toBeGreaterThan(0);
    for (const count of Object.values(snapshot.counts)) expect(count).toBeGreaterThan(0);
  }
});

