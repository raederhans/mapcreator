const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { gotoApp, waitForAppInteractive } = require("./support/playwright-app");

const TARGET_PACKS = [
  ["road", "germany_road"],
  ["road", "uk_road"],
  ["road", "usa_road"],
  ["rail", "france_rail"],
  ["rail", "germany_rail"],
  ["airport", "usa_airport"],
  ["airport", "china_airport"],
  ["airport", "russia_airport"],
  ["airport", "india_airport"],
  ["airport", "germany_airport"],
  ["airport", "france_airport"],
  ["airport", "uk_airport"],
  ["port", "usa_port"],
  ["port", "germany_port"],
  ["port", "france_port"],
  ["port", "uk_port"],
  ["port", "china_port"],
  ["port", "india_port"],
  ["port", "russia_port"],
  ["energy_facilities", "germany_energy_facilities"],
  ["mineral_resources", "germany_mineral_resources"],
  ["industrial_zones", "germany_industrial_zones"],
  ["logistics_hubs", "germany_logistics_hubs"],
];

const FULL_OVERLAY_PACKS = [
  "germany_road",
  "uk_road",
  "usa_road",
  "france_rail",
  "germany_rail",
  "usa_airport",
  "china_airport",
  "russia_airport",
  "india_airport",
  "germany_airport",
  "france_airport",
  "uk_airport",
  "usa_port",
  "germany_port",
  "france_port",
  "uk_port",
  "china_port",
  "india_port",
  "russia_port",
];

test.setTimeout(300000);

async function openTransportWorkbench(page) {
  const projectTab = page.locator("#inspectorSidebarTabProject");
  if ((await projectTab.getAttribute("aria-selected")) !== "true") {
    await projectTab.click();
  }
  await expect(projectTab).toHaveAttribute("aria-selected", "true");
  const transportSection = page.locator("#transportProjectSection");
  if ((await transportSection.evaluate((node) => node.open)) !== true) {
    await page.locator("#lblTransportProject").click();
  }
  await expect(transportSection).toHaveJSProperty("open", true);
  await page.locator("#projectSidebarPanel #scenarioTransportWorkbenchBtn").click();
  await page.waitForFunction(() => {
    const panel = document.querySelector("#transportWorkbenchOverlay");
    return !!panel && panel.getAttribute("aria-hidden") === "false";
  }, { timeout: 120000 });
  await page.waitForSelector(".transport-workbench-carrier-screen-labels", { timeout: 120000 });
}

async function selectPackAndWaitForPreview(page, familyId, packId) {
  await page.locator(`.transport-workbench-family-tab[data-transport-family="${familyId}"]`).click();
  await page.waitForFunction(
    ({ expectedPackId }) => Array.from(document.querySelector("#transportWorkbenchPackSelect")?.options || [])
      .some((option) => option.value === expectedPackId),
    { expectedPackId: packId },
    { timeout: 120000 },
  );
  await page.locator("#transportWorkbenchPackSelect").selectOption(packId);
  await page.waitForFunction(
    async ({ nextFamilyId, nextPackId }) => {
      const { state } = await import("/js/core/state.js");
      const ui = state?.transportWorkbenchUi || {};
      const selectedValue = document.querySelector("#transportWorkbenchPackSelect")?.value || "";
      return ui.activeFamily === nextFamilyId
        && selectedValue === nextPackId
        && (ui.activePackIdByFamily?.[nextFamilyId] || ui.activePackId) === nextPackId;
    },
    { nextFamilyId: familyId, nextPackId: packId },
    { timeout: 120000 },
  );

  return page.evaluate(async ({ nextFamilyId, nextPackId }) => {
    const { state } = await import("/js/core/state.js");
    const {
      getTransportWorkbenchFamilyPreviewSnapshot,
      renderTransportWorkbenchFamilyPreview,
      warmTransportWorkbenchFamilyPreview,
    } = await import("/js/ui/transport_workbench_family_preview.js");

    const waitForFrames = async (count = 3) => {
      for (let index = 0; index < count; index += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    };

    const activePackId = state.transportWorkbenchUi?.activePackIdByFamily?.[nextFamilyId]
      || state.transportWorkbenchUi?.activePackId
      || "";
    if (state.transportWorkbenchUi?.activeFamily !== nextFamilyId || activePackId !== nextPackId) {
      throw new Error(`UI selection did not activate ${nextPackId}: ${JSON.stringify({
        activeFamily: state.transportWorkbenchUi?.activeFamily,
        activePackId,
      })}`);
    }
    const familyConfig = state.transportWorkbenchUi.familyConfigs[nextFamilyId] || {};
    familyConfig.showLabels = true;
    familyConfig.showStationLabels = true;
    await waitForFrames(4);

    const config = {
      ...(state.transportWorkbenchUi.familyConfigs[nextFamilyId] || {}),
      activePackId,
    };
    let lastRenderError = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        await warmTransportWorkbenchFamilyPreview(nextFamilyId, { includeFull: false });
        await renderTransportWorkbenchFamilyPreview(nextFamilyId, config);
        lastRenderError = null;
        break;
      } catch (error) {
        lastRenderError = error;
        if (!String(error?.message || error).includes("carrier geometry is not ready")) {
          throw error;
        }
        state.refreshTransportWorkbenchUiFn?.();
        await waitForFrames(5);
      }
    }
    if (lastRenderError) throw lastRenderError;
    await waitForFrames(4);

    const readFeatureStats = (snapshot) => {
      const stats = snapshot?.stats || {};
      const total = Object.entries(stats)
        .filter(([key, value]) => key.startsWith("total") && Number(value) > 0)
        .reduce((sum, [, value]) => sum + Number(value || 0), 0);
      const visible = Object.entries(stats)
        .filter(([key, value]) => key.startsWith("visible") && Number(value) > 0)
        .reduce((sum, [, value]) => sum + Number(value || 0), 0);
      return { total, visible };
    };

    for (let attempt = 0; attempt < 120; attempt += 1) {
      const snapshot = getTransportWorkbenchFamilyPreviewSnapshot(nextFamilyId, config);
      const featureStats = readFeatureStats(snapshot);
      if (
        snapshot?.status === "ready"
        && featureStats.total > 0
        && featureStats.visible > 0
      ) {
        return {
          familyId: nextFamilyId,
          packId: nextPackId,
          status: snapshot.status,
          totalFeatures: featureStats.total,
          visibleFeatures: featureStats.visible,
          activeVariant: snapshot.activeVariant || "",
          packMode: snapshot.packMode || "",
        };
      }
      await waitForFrames(2);
    }

    const snapshot = getTransportWorkbenchFamilyPreviewSnapshot(nextFamilyId, config);
    throw new Error(`Preview did not settle for ${nextPackId}: ${JSON.stringify(snapshot)}`);
  }, {
    nextFamilyId: familyId,
    nextPackId: packId,
  });
}

test("transport workbench loads every target country pack and main-map overlay samples", async ({ page }) => {
  test.setTimeout(300000);

  await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);
  await openTransportWorkbench(page);

  const previewResults = [];
  for (const [familyId, packId] of TARGET_PACKS) {
    previewResults.push(await selectPackAndWaitForPreview(page, familyId, packId));
  }

  const overlayResults = await page.evaluate(async ({ samplePackIds }) => {
    const { loadTransportCountryOverlayState } = await import("/js/core/transport_country_overlay.js");
    const results = [];
    for (const packId of samplePackIds) {
      const overlayState = await loadTransportCountryOverlayState(packId, { mode: "full" });
      const layerCounts = Object.fromEntries(
        Object.entries(overlayState.collectionsByLayer || {})
          .map(([key, collection]) => [key, Array.isArray(collection?.features) ? collection.features.length : 0]),
      );
      results.push({
        packId,
        family: overlayState.family,
        status: overlayState.status,
        layerCounts,
      });
    }
    return results;
  }, {
    samplePackIds: FULL_OVERLAY_PACKS,
  });

  const screenshotPath = path.join(process.cwd(), ".runtime", "browser", "mcp-artifacts", "transport-workbench-country-pack-smoke.png");
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: false });

  expect(previewResults).toHaveLength(TARGET_PACKS.length);
  for (const result of previewResults) {
    expect(result.status, `${result.packId} preview status`).toBe("ready");
    expect(result.totalFeatures, `${result.packId} total features`).toBeGreaterThan(0);
    expect(result.visibleFeatures, `${result.packId} visible features`).toBeGreaterThan(0);
  }
  for (const result of overlayResults) {
    expect(result.status, `${result.packId} overlay status`).toBe("ready");
    expect(Object.values(result.layerCounts).reduce((sum, count) => sum + count, 0), `${result.packId} overlay feature count`).toBeGreaterThan(0);
  }
});
