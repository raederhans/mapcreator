const { test, expect } = require("@playwright/test");
const { getAppUrl, waitForRenderIdle } = require("./support/playwright-app");

function resolveBaseUrl() {
  return getAppUrl();
}

async function waitForMapReady(page) {
  await page.waitForFunction(() => {
    const select = document.querySelector("#scenarioSelect");
    const canvas = Array.from(document.querySelectorAll("canvas"))
      .find((entry) => entry.width >= 200 && entry.height >= 120 && getComputedStyle(entry).display !== "none");
    return !!select && select.querySelectorAll("option").length > 0 && !!canvas;
  }, { timeout: 30_000 });
  await page.waitForTimeout(1_500);
}

async function captureCanvasSnapshot(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById("map-canvas");
    const context = canvas instanceof HTMLCanvasElement
      ? canvas.getContext("2d", { willReadFrequently: true })
      : null;
    if (!canvas || !context) {
      return null;
    }
    const { width, height } = canvas;
    const step = Math.max(6, Math.round(Math.min(width, height) / 180));
    const imageData = context.getImageData(0, 0, width, height).data;
    const pixels = [];
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const offset = (y * width + x) * 4;
        pixels.push(imageData[offset], imageData[offset + 1], imageData[offset + 2]);
      }
    }
    return { width, height, step, pixels };
  });
}

function getMeanRgbDiff(snapshotA, snapshotB) {
  if (!snapshotA || !snapshotB) {
    throw new Error("Missing canvas snapshot for RGB diff comparison.");
  }
  expect(snapshotA.width).toBe(snapshotB.width);
  expect(snapshotA.height).toBe(snapshotB.height);
  expect(snapshotA.step).toBe(snapshotB.step);
  expect(snapshotA.pixels.length).toBe(snapshotB.pixels.length);

  let diffTotal = 0;
  for (let index = 0; index < snapshotA.pixels.length; index += 1) {
    diffTotal += Math.abs(snapshotA.pixels[index] - snapshotB.pixels[index]);
  }
  return diffTotal / snapshotA.pixels.length;
}

function isAnonymousBackendProbeFailure(entry) {
  if (entry?.status !== 401) return false;
  try {
    return new URL(entry.url).pathname === "/api/backend/auth/me";
  } catch (_error) {
    return false;
  }
}

function filterExpectedBackendProbeConsoleErrors(consoleErrors, networkFailures) {
  const filtered = [...consoleErrors];
  const expectedProbeCount = networkFailures.filter(isAnonymousBackendProbeFailure).length;
  for (let index = 0; index < expectedProbeCount; index += 1) {
    const matchIndex = filtered.indexOf("Failed to load resource: the server responded with a status of 401 (Unauthorized)");
    if (matchIndex === -1) break;
    filtered.splice(matchIndex, 1);
  }
  return filtered;
}

test("physical layer defaults and atlas rendering regression", async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = [];
  const pageErrors = [];
  const networkFailures = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message || error));
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      networkFailures.push({ url: response.url(), status: response.status() });
    }
  });

  page.on("requestfailed", (request) => {
    networkFailures.push({
      url: request.url(),
      status: "failed",
      errorText: request.failure() ? request.failure().errorText : "requestfailed",
    });
  });

  await page.goto(resolveBaseUrl(), { waitUntil: "domcontentloaded" });
  await waitForMapReady(page);

  const inspection = await page.evaluate(async () => {
    const { normalizePhysicalStyleConfig, PHYSICAL_ATLAS_PALETTE, state } = await import("/js/core/state.js");

    const defaults = {
      normalizedDefault: normalizePhysicalStyleConfig(null),
      normalizedExplicit: normalizePhysicalStyleConfig({
        blendMode: "overlay",
        atlasOpacity: 0.27,
      }),
      normalizedInvalidBlend: normalizePhysicalStyleConfig({
        blendMode: "totally-invalid-mode",
      }),
      normalizedNewSchemaOpacityOnly: normalizePhysicalStyleConfig({
        mode: "atlas_and_contours",
        opacity: 0.44,
        blendMode: "source-over",
      }),
      normalizedLegacyOpacityOnly: normalizePhysicalStyleConfig({
        opacity: 0.31,
      }),
    };

    state.showPhysical = true;
    state.deferContextBasePass = false;
    state.styleConfig.physical = normalizePhysicalStyleConfig({
      ...state.styleConfig.physical,
      mode: "atlas_and_contours",
      opacity: 0.58,
      atlasOpacity: 0.48,
      atlasIntensity: 0.88,
      blendMode: "totally-invalid-mode",
      contourMinorVisible: false,
    });
    state.physicalSemanticsData = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            atlas_class: "mountain_high_relief",
            atlas_layer: "relief_base",
          },
          geometry: {
            type: "Polygon",
            coordinates: [[[7, 44], [15, 44], [15, 48], [7, 48], [7, 44]]],
          },
        },
      ],
    };
    state.renderPassCache.dirty.physicalBase = true;
    state.renderPassCache.dirty.contextBase = true;
    state.renderPassCache.reasons.physicalBase = "physical-invalid-blend-regression";
    state.renderPassCache.reasons.contextBase = "physical-invalid-blend-regression";
    state.renderNowFn?.();

    return {
      defaults,
      palette: PHYSICAL_ATLAS_PALETTE,
      physicalBlendModeAfterNormalize: state.styleConfig.physical.blendMode,
    };
  });

  expect(inspection.defaults.normalizedDefault.blendMode).toBe("source-over");
  expect(inspection.defaults.normalizedDefault.preset).toBe("balanced");
  expect(inspection.defaults.normalizedDefault.atlasOpacity).toBeCloseTo(0.44, 5);
  expect(inspection.defaults.normalizedExplicit.blendMode).toBe("overlay");
  expect(inspection.defaults.normalizedExplicit.atlasOpacity).toBeCloseTo(0.27, 5);
  expect(inspection.defaults.normalizedInvalidBlend.blendMode).toBe("source-over");
  expect(inspection.defaults.normalizedNewSchemaOpacityOnly.opacity).toBeCloseTo(0.44, 5);
  expect(inspection.defaults.normalizedNewSchemaOpacityOnly.atlasOpacity).toBeCloseTo(0.44, 5);
  expect(inspection.defaults.normalizedLegacyOpacityOnly.atlasOpacity).toBeCloseTo(0.31, 5);
  expect(inspection.palette).toEqual({
    mountain_high_relief: "#6f4430",
    mountain_hills: "#9e6b4e",
    upland_plateau: "#bf8d63",
    badlands_canyon: "#b35b3c",
    plains_lowlands: "#91ab68",
    basin_lowlands: "#b8b07c",
    wetlands_delta: "#4d9a8d",
    forest_temperate: "#4e7240",
    rainforest_tropical: "#236148",
    grassland_steppe: "#c2b66d",
    desert_bare: "#d8b169",
    tundra_ice: "#b8c7d8",
  });
  expect(inspection.physicalBlendModeAfterNormalize).toBe("source-over");

  await page.evaluate(async () => {
    const { state, normalizePhysicalStyleConfig } = await import("/js/core/state.js");
    const reliefFeature = {
      type: "Feature",
      properties: {
        atlas_class: "mountain_high_relief",
        atlas_layer: "relief_base",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[-12, 36], [32, 36], [32, 60], [-12, 60], [-12, 36]]],
      },
    };

    state.physicalSemanticsData = {
      type: "FeatureCollection",
      features: [reliefFeature],
    };
    state.deferContextBasePass = false;
    state.styleConfig.physical = normalizePhysicalStyleConfig({
      ...state.styleConfig.physical,
      preset: "balanced",
      mode: "atlas_only",
      opacity: 0.56,
      atlasOpacity: 0.44,
      atlasIntensity: 0.96,
      blendMode: "source-over",
      contourMinorVisible: false,
    });
    Object.keys(state.renderPassCache.dirty || {}).forEach((key) => {
      state.renderPassCache.dirty[key] = true;
      state.renderPassCache.reasons[key] = "physical-visual-regression";
    });
    state.showPhysical = false;
    state.renderNowFn?.();
  });
  await waitForRenderIdle(page, { scenarioId: "tno_1962", timeout: 60_000 });
  const physicalOffSnapshot = await captureCanvasSnapshot(page);

  await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    state.showPhysical = true;
    Object.keys(state.renderPassCache.dirty || {}).forEach((key) => {
      state.renderPassCache.dirty[key] = true;
      state.renderPassCache.reasons[key] = "physical-visual-regression";
    });
    state.renderNowFn?.();
  });
  await waitForRenderIdle(page, { scenarioId: "tno_1962", timeout: 60_000 });
  const physicalOnSnapshot = await captureCanvasSnapshot(page);
  const renderDiagnostics = await page.evaluate(() => {
    const metrics = globalThis.__renderPerfMetrics || {};
    return {
      physicalRenderedCount: Number(metrics.drawPhysicalBasePass?.renderedCount || 0),
      reliefRenderedCount: Number(metrics.drawPhysicalReliefOverlayLayer?.renderedCount || 0),
    };
  });
  const reliefOverlayDiff = getMeanRgbDiff(physicalOffSnapshot, physicalOnSnapshot);
  const unexpectedConsoleErrors = filterExpectedBackendProbeConsoleErrors(consoleErrors, networkFailures);
  const unexpectedNetworkFailures = networkFailures.filter((entry) => !isAnonymousBackendProbeFailure(entry));

  expect(renderDiagnostics.physicalRenderedCount).toBeGreaterThan(0);
  expect(renderDiagnostics.reliefRenderedCount).toBeGreaterThan(0);
  // The synthetic polygon covers a narrow part of the full canvas; renderer metrics prove the draw path.
  expect(reliefOverlayDiff).toBeGreaterThan(0.25);
  expect(reliefOverlayDiff).toBeLessThan(120);
  expect(unexpectedConsoleErrors, `Console errors: ${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);
  expect(pageErrors, `Page errors: ${JSON.stringify(pageErrors, null, 2)}`).toEqual([]);
  expect(unexpectedNetworkFailures, `Network failures: ${JSON.stringify(networkFailures, null, 2)}`).toEqual([]);
});
