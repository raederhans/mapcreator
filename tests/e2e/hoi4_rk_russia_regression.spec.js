const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const {
  applyScenarioAndWaitIdle,
  getAppUrl,
  waitForAppInteractive,
  waitForScenarioSelectReady,
} = require("./support/playwright-app");

const APP_URL = getAppUrl();

const SAMPLE_POINTS = [
  { id: 'volgograd', lon: 44.515, lat: 48.708 },
  { id: 'arkhangelsk', lon: 40.533, lat: 64.54 },
  { id: 'pechora', lon: 57.813, lat: 65.148 },
  { id: 'south_ural', lon: 60.994, lat: 51.064 },
  { id: 'arctic_land_west', lon: 53.029, lat: 66.808 },
  { id: 'arctic_land_east', lon: 58.72, lat: 66.95 },
];

async function reapplyCoreTerritory(page, tag) {
  await page.evaluate(() => {
    document.querySelector('#countryInspectorSection')?.setAttribute('open', '');
  });
  await page.fill('#countrySearch', tag);
  const row = page.locator(`.country-select-row[data-country-code="${tag}"] .country-select-main-btn`).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.click();
  const reapplyBtn = page.locator('#presetTree').getByRole('button', { name: 'Reapply Core Territory' });
  await expect(reapplyBtn).toBeVisible({ timeout: 15000 });
  await reapplyBtn.click();
  await page.waitForTimeout(1200);
}

test('hoi4 rkm/rko/rku reapply closes RU coverage gaps', async ({ page }) => {
  test.setTimeout(120000);
  const consoleIssues = [];
  const networkFailures = [];

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      consoleIssues.push({ type, text: msg.text() });
    }
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      networkFailures.push({ url: res.url(), status: res.status() });
    }
  });

  page.on('requestfailed', (req) => {
    networkFailures.push({
      url: req.url(),
      status: 'failed',
      errorText: req.failure() ? req.failure().errorText : 'requestfailed',
    });
  });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await waitForAppInteractive(page, { timeout: 90000 });
  await waitForScenarioSelectReady(page, { scenarioId: 'hoi4_1939', timeout: 90000 });
  await page.evaluate(() => {
    document.querySelector('#scenarioSelect')?.closest('details')?.setAttribute('open', '');
  });
  await applyScenarioAndWaitIdle(page, 'hoi4_1939', {
    timeout: 90000,
    renderMode: 'none',
    markDirtyReason: 'playwright-hoi4-rk-russia',
  });
  await expect(page.locator('#scenarioStatus')).toContainText('HOI4 1939', { timeout: 20000 });
  await page.waitForTimeout(1200);

  for (const tag of ['RKU', 'RKO', 'RKM']) {
    await reapplyCoreTerritory(page, tag);
  }

  await page.fill('#countrySearch', '');
  await page.waitForTimeout(600);

  const coverage = await page.evaluate(async (samplePoints) => {
    const { state } = await import('/js/core/state.js');
    const { resetZoomToFit } = await import('/js/core/map_renderer.js');
    if (typeof resetZoomToFit === 'function') {
      resetZoomToFit();
    }
    const d3 = globalThis.d3;
    const features = Array.isArray(state.landData?.features) ? state.landData.features : [];
    const results = samplePoints.map((point) => {
      let matchedFeature = null;
      for (const feature of features) {
        try {
          if (feature?.geometry && d3.geoContains(feature, [point.lon, point.lat])) {
            matchedFeature = feature;
            break;
          }
        } catch (error) {
          // Ignore malformed geometries while sampling coverage.
        }
      }
      const props = matchedFeature?.properties || {};
      const featureId = String(props.id || '').trim();
      return {
        ...point,
        featureId,
        featureName: String(props.name || '').trim(),
        countryCode: String(props.cntr_code || '').trim(),
        owner: featureId ? String(state.sovereigntyByFeatureId?.[featureId] || '') : '',
      };
    });
    return {
      activeScenarioId: state.activeScenarioId,
      runtimeFeatureCount: state.runtimePoliticalTopology?.objects?.political?.geometries?.length || 0,
      results,
    };
  }, SAMPLE_POINTS);

  for (const sample of coverage.results) {
    expect(sample.featureId, `missing feature at ${sample.id}`).toBeTruthy();
    expect(sample.owner, `missing owner at ${sample.id}`).toBeTruthy();
  }

  const screenshotDir = path.join('.runtime', 'browser', 'mcp-artifacts', 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  const fullShot = path.join(screenshotDir, 'hoi4_rk_russia_regression_full.png');
  const mapShot = path.join(screenshotDir, 'hoi4_rk_russia_regression_map.png');
  await page.screenshot({ path: fullShot, fullPage: true });
  await page.locator('#mapContainer').screenshot({ path: mapShot });

  console.log(JSON.stringify({
    scenarioStatus: await page.locator('#scenarioStatus').innerText(),
    scenarioAuditHint: await page.locator('#scenarioAuditHint').innerText(),
    consoleIssues,
    networkFailures,
    coverage,
    screenshots: [fullShot, mapShot],
  }, null, 2));
});
