const base = require("@playwright/test");
const {
  getAppUrl,
  gotoApp,
  waitForAppInteractive,
  waitForShellReady,
  waitForScenarioApplyIdle,
  waitForRenderIdle,
  readFailureContextSnapshot,
  writeFailureContextArtifact,
} = require("./playwright-app");
const { mergeSmokeFailureSelectors } = require("./playwright-selectors");

const VIEW_SETTINGS_STORAGE_KEY = "map_view_settings_v1";
const DEFAULT_STORAGE_KEYS = Object.freeze([VIEW_SETTINGS_STORAGE_KEY]);
const DEFAULT_FAILURE_SELECTORS = Object.freeze(
  mergeSmokeFailureSelectors("bootShell", "mainShell", "scenarioShell", "cityRuntime"),
);
const PAGE_EVENT_NAMES = Object.freeze(["console", "pageerror", "requestfailed", "response"]);

function normalizeStorageKeys(storageKeys = DEFAULT_STORAGE_KEYS) {
  return [...new Set((Array.isArray(storageKeys) ? storageKeys : [storageKeys]).filter(Boolean).map((value) => String(value)))];
}

async function clearPageEventListeners(page) {
  for (const eventName of PAGE_EVENT_NAMES) {
    page.removeAllListeners(eventName);
  }
}

async function waitForSharedCityExactRender(page, {
  scenarioId = "",
  timeout = 30_000,
  requireInfraIdle = true,
} = {}) {
  await waitForRenderIdle(page, { scenarioId, timeout, requireInfra: requireInfraIdle });
  await page.waitForFunction(async () => {
    const { state } = await import("/js/core/state.js");
    return String(state.renderPhase || "") === "idle"
      && !state.deferExactAfterSettle
      && !state.exactAfterSettleHandle;
  }, undefined, { timeout });
}

async function ensureSharedCityBaseDataLoaded(page, reason = "shared-city-runtime", {
  timeout = 120_000,
  requireInfraIdle = true,
} = {}) {
  await page.evaluate(async (loadReason) => {
    const { state } = await import("/js/core/state.js");
    if (typeof state.ensureBaseCityDataFn === "function") {
      await state.ensureBaseCityDataFn({ reason: loadReason, renderNow: true });
    }
  }, reason);
  await page.waitForFunction(async () => {
    const { state } = await import("/js/core/state.js");
    return state.baseCityDataState === "loaded"
      && Array.isArray(state.worldCitiesData?.features)
      && state.worldCitiesData.features.length > 0;
  }, undefined, { timeout });
  await waitForSharedCityExactRender(page, { timeout, requireInfraIdle });
}

async function captureSharedCityRuntimeSnapshot(page) {
  await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    const cloneRuntimeValue = (value) => {
      if (value == null) {
        return null;
      }
      if (typeof globalThis.structuredClone === "function") {
        return globalThis.structuredClone(value);
      }
      return JSON.parse(JSON.stringify(value));
    };
    globalThis.__sharedCityWorldCitiesSnapshot = cloneRuntimeValue(state.worldCitiesData);
    globalThis.__sharedCityScenarioOverridesSnapshot = cloneRuntimeValue(state.scenarioCityOverridesData);
  });
}

async function ensureSharedCityScenario(page, scenarioId, {
  timeout = 120_000,
  requireInfraIdle = true,
} = {}) {
  const expectedScenarioId = String(scenarioId || "").trim();
  await page.waitForFunction((targetScenarioId) => {
    const select = document.querySelector("#scenarioSelect");
    return !!select && !!select.querySelector(`option[value="${targetScenarioId}"]`);
  }, expectedScenarioId, { timeout });
  const initialScenarioId = await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return String(state.activeScenarioId || "");
  });
  if (initialScenarioId !== expectedScenarioId) {
    await page.selectOption("#scenarioSelect", expectedScenarioId);
    const applyButton = page.locator("#applyScenarioBtn");
    const applyVisible = await applyButton.isVisible().catch(() => false);
    const applyEnabled = applyVisible ? await applyButton.isEnabled().catch(() => false) : false;
    if (applyVisible && applyEnabled) {
      await applyButton.click();
    }
  }
  await waitForScenarioApplyIdle(page, { scenarioId: expectedScenarioId, timeout });
  await waitForSharedCityExactRender(page, {
    scenarioId: expectedScenarioId,
    timeout,
    requireInfraIdle,
  });
}

async function setSharedCityZoomPercent(page, percent, {
  timeout = 30_000,
  requireInfraIdle = true,
} = {}) {
  await page.evaluate(async (targetPercent) => {
    const { setZoomPercent } = await import("/js/core/map_renderer.js");
    setZoomPercent(targetPercent);
  }, percent);
  await waitForSharedCityExactRender(page, { timeout, requireInfraIdle });
}

async function resetSharedCityZoom(page, {
  timeout = 30_000,
  requireInfraIdle = true,
} = {}) {
  await page.evaluate(async () => {
    const { resetZoomToFit } = await import("/js/core/map_renderer.js");
    resetZoomToFit();
  });
  await waitForSharedCityExactRender(page, { timeout, requireInfraIdle });
}

async function installSharedCityLabelDrawHook(page) {
  await page.evaluate(() => {
    const globalKey = "__e2eCityLabelDraws";
    if (!Array.isArray(globalThis[globalKey])) {
      globalThis[globalKey] = [];
    }
    globalThis.__resetE2ECityLabelDraws = () => {
      globalThis[globalKey] = [];
    };
    if (!globalThis.__e2eCityLabelDrawHookInstalled) {
      globalThis.__e2eCityLabelDrawHookInstalled = true;
      const pushEntry = (kind, text) => {
        if (typeof text !== "string") {
          return;
        }
        const trimmed = text.trim();
        if (!trimmed) {
          return;
        }
        const next = Array.isArray(globalThis[globalKey]) ? globalThis[globalKey] : [];
        next.push({ kind, text: trimmed, recordedAt: Date.now() });
        if (next.length > 200) {
          next.splice(0, next.length - 200);
        }
        globalThis[globalKey] = next;
      };
      const patchMethod = (methodName) => {
        const proto = globalThis.CanvasRenderingContext2D?.prototype;
        if (!proto) {
          return;
        }
        const original = proto[methodName];
        if (typeof original !== "function" || original.__sharedCityLabelDrawPatched) {
          return;
        }
        const patched = function patchedCityLabelDraw(text, ...rest) {
          pushEntry(methodName, text);
          return original.call(this, text, ...rest);
        };
        patched.__sharedCityLabelDrawPatched = true;
        proto[methodName] = patched;
      };
      patchMethod("fillText");
      patchMethod("strokeText");
    }
    globalThis.__resetE2ECityLabelDraws?.();
  });
}

async function seedSharedCityViewSettings(page, payload, {
  storageKey = VIEW_SETTINGS_STORAGE_KEY,
  timeout = 30_000,
  requireInfraIdle = true,
} = {}) {
  await page.evaluate(async ({ targetStorageKey, nextPayload }) => {
    localStorage.setItem(targetStorageKey, JSON.stringify(nextPayload));
    const { hydrateViewSettings } = await import("/js/bootstrap/startup_bootstrap_support.js");
    const { state } = await import("/js/core/state.js");
    hydrateViewSettings?.();
    state.updateToolbarInputsFn?.();
    state.renderNowFn?.();
  }, {
    targetStorageKey: storageKey,
    nextPayload: payload,
  });
  await waitForSharedCityExactRender(page, { timeout, requireInfraIdle });
}

async function resetSharedCityRuntimeState(page, {
  storageKeys = DEFAULT_STORAGE_KEYS,
  timeout = 30_000,
  requireInfraIdle = true,
} = {}) {
  const normalizedStorageKeys = normalizeStorageKeys(storageKeys);
  await page.evaluate(async ({ targetStorageKeys }) => {
    const { state } = await import("/js/core/state.js");
    const { createDefaultStyleConfig } = await import("/js/core/state/ui_state.js");
    const cloneRuntimeValue = (value) => {
      if (value == null) {
        return null;
      }
      if (typeof globalThis.structuredClone === "function") {
        return globalThis.structuredClone(value);
      }
      return JSON.parse(JSON.stringify(value));
    };
    for (const storageKey of targetStorageKeys) {
      localStorage.removeItem(storageKey);
    }
    if ("__sharedCityWorldCitiesSnapshot" in globalThis) {
      state.worldCitiesData = cloneRuntimeValue(globalThis.__sharedCityWorldCitiesSnapshot);
      state.baseCityDataState = state.worldCitiesData ? "loaded" : "idle";
    }
    if ("__sharedCityScenarioOverridesSnapshot" in globalThis) {
      state.scenarioCityOverridesData = cloneRuntimeValue(globalThis.__sharedCityScenarioOverridesSnapshot);
    }
    state.styleConfig = createDefaultStyleConfig();
    state.showCityPoints = true;
    state.showUrban = true;
    state.showPhysical = true;
    state.showRivers = true;
    state.showTransport = true;
    state.showAirports = false;
    state.showPorts = false;
    state.showRail = false;
    globalThis.__playwrightScenarioApplyState = {
      targetScenarioId: "",
      settled: true,
      error: "",
      finishedAt: Date.now(),
    };
    globalThis.__resetE2ECityLabelDraws?.();
    state.cityLayerRevision = (Number(state.cityLayerRevision) || 0) + 1;
    state.updateToolbarInputsFn?.();
    state.renderNowFn?.();
  }, {
    targetStorageKeys: normalizedStorageKeys,
  });
  await waitForSharedCityExactRender(page, { timeout, requireInfraIdle });
}

async function prepareSharedCityRuntimeState(page, {
  scenarioId = "tno_1962",
  storageKeys = DEFAULT_STORAGE_KEYS,
  viewSettingsPayload = null,
  loadBaseCityDataReason = "",
  zoomPercent = null,
  installLabelDrawHook = false,
  timeout = 120_000,
  requireInfraIdle = true,
} = {}) {
  await waitForAppInteractive(page, { timeout });
  await waitForShellReady(page, { timeout });
  await resetSharedCityRuntimeState(page, {
    storageKeys,
    timeout: Math.min(timeout, 30_000),
    requireInfraIdle,
  });
  if (installLabelDrawHook) {
    await installSharedCityLabelDrawHook(page);
  }
  if (viewSettingsPayload) {
    await seedSharedCityViewSettings(page, viewSettingsPayload, {
      storageKey: normalizeStorageKeys(storageKeys)[0] || VIEW_SETTINGS_STORAGE_KEY,
      timeout: Math.min(timeout, 30_000),
      requireInfraIdle,
    });
  }
  const zoomSettleTimeout = Math.min(timeout, 60_000);
  await ensureSharedCityScenario(page, scenarioId, { timeout, requireInfraIdle });
  await resetSharedCityZoom(page, { timeout: zoomSettleTimeout, requireInfraIdle });
  if (loadBaseCityDataReason) {
    await ensureSharedCityBaseDataLoaded(page, loadBaseCityDataReason, { timeout, requireInfraIdle });
  } else {
    await waitForSharedCityExactRender(page, { scenarioId, timeout, requireInfraIdle });
  }
  if (Number.isFinite(Number(zoomPercent))) {
    await setSharedCityZoomPercent(page, Number(zoomPercent), {
      timeout: zoomSettleTimeout,
      requireInfraIdle,
    });
  }
  await captureSharedCityRuntimeSnapshot(page);
}

async function readSharedCityLeakSnapshot(page, {
  bootProfile = "",
  storageKeys = DEFAULT_STORAGE_KEYS,
} = {}) {
  const normalizedStorageKeys = normalizeStorageKeys(storageKeys);
  return page.evaluate(async ({ expectedBootProfile, targetStorageKeys }) => {
    const { state } = await import("/js/core/state.js");
    const storageValues = {};
    const collectOverrideLabels = (features) => (Array.isArray(features) ? features : [])
      .map((feature) => feature?.properties?.__city_display_name_override || null)
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        en: String(entry.en || "").trim(),
        zh: String(entry.zh || "").trim(),
      }))
      .filter((entry) => entry.en || entry.zh);
    const worldOverrideLabels = collectOverrideLabels(state.worldCitiesData?.features);
    const scenarioOverrideLabels = collectOverrideLabels(state.scenarioCityOverridesData?.featureCollection?.features);
    for (const storageKey of targetStorageKeys) {
      storageValues[storageKey] = localStorage.getItem(storageKey);
    }
    return {
      expectedBootProfile,
      actualBootProfile: String(globalThis.__sharedCityBootProfileKey || ""),
      location: `${globalThis.location.pathname}${globalThis.location.search}`,
      activeScenarioId: String(state.activeScenarioId || ""),
      scenarioApplyInFlight: !!state.scenarioApplyInFlight,
      startupReadonlyUnlockInFlight: !!state.startupReadonlyUnlockInFlight,
      bootBlocking: state.bootBlocking === false ? false : !!state.bootBlocking,
      renderPhase: String(state.renderPhase || ""),
      storageValues,
      labelDrawCount: Array.isArray(globalThis.__e2eCityLabelDraws) ? globalThis.__e2eCityLabelDraws.length : 0,
      worldOverrideCount: worldOverrideLabels.length,
      scenarioOverrideCount: scenarioOverrideLabels.length,
      overrideSamples: [...worldOverrideLabels, ...scenarioOverrideLabels].slice(0, 6),
    };
  }, {
    expectedBootProfile: String(bootProfile || ""),
    targetStorageKeys: normalizedStorageKeys,
  });
}

function collectSharedCityLeakIssues(snapshot) {
  const issues = [];
  if (snapshot.expectedBootProfile && snapshot.actualBootProfile !== snapshot.expectedBootProfile) {
    issues.push(`bootProfile drift: expected=${snapshot.expectedBootProfile}, actual=${snapshot.actualBootProfile}`);
  }
  if (snapshot.scenarioApplyInFlight) {
    issues.push("scenarioApplyInFlight remained true after reset");
  }
  if (snapshot.startupReadonlyUnlockInFlight) {
    issues.push("startupReadonlyUnlockInFlight remained true after reset");
  }
  if (snapshot.bootBlocking) {
    issues.push("bootBlocking stayed true after reset");
  }
  const dirtyStorageKeys = Object.entries(snapshot.storageValues || {})
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([key]) => key);
  if (dirtyStorageKeys.length) {
    issues.push(`storage not cleared: ${dirtyStorageKeys.join(", ")}`);
  }
  if (Number(snapshot.worldOverrideCount || 0) > 0 || Number(snapshot.scenarioOverrideCount || 0) > 0) {
    issues.push(
      `display-name overrides remained after reset: world=${Number(snapshot.worldOverrideCount || 0)}, scenario=${Number(snapshot.scenarioOverrideCount || 0)}`,
    );
  }
  return issues;
}

async function attachSharedCityLeakArtifact(testInfo, snapshot, issues = []) {
  const payload = {
    snapshot,
    issues,
  };
  await testInfo.attach?.("shared-city-leak", {
    body: Buffer.from(JSON.stringify(payload, null, 2), "utf8"),
    contentType: "application/json",
  });
}

const test = base.test.extend({
  useSharedCityBoot: [process.env.PLAYWRIGHT_SHARED_CITY_BOOT !== "0", { option: true, scope: "worker" }],
  sharedCityRequireInfraIdle: [true, { option: true }],
  sharedCityBootPath: ["/", { option: true, scope: "worker" }],
  sharedCityBootProfile: ["city-runtime-default", { option: true, scope: "worker" }],
  sharedCityBootHarness: [async ({
    browser,
    useSharedCityBoot,
    sharedCityBootPath,
    sharedCityBootProfile,
  }, use) => {
    if (!useSharedCityBoot) {
      await use(null);
      return;
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApp(page, sharedCityBootPath, { waitUntil: "domcontentloaded" });
    await waitForAppInteractive(page, { timeout: 120_000 });
    await waitForShellReady(page, { timeout: 120_000 });
    await page.evaluate((bootProfile) => {
      globalThis.__sharedCityBootProfileKey = String(bootProfile || "");
    }, sharedCityBootProfile);
    await use({
      context,
      page,
      bootProfile: sharedCityBootProfile,
      bootPath: sharedCityBootPath,
    });
    await context.close();
  }, { scope: "worker", timeout: 120_000 }],
  page: async ({
    browser,
    useSharedCityBoot,
    sharedCityBootHarness,
    sharedCityBootPath,
    sharedCityBootProfile,
    sharedCityRequireInfraIdle,
  }, use, testInfo) => {
    const usingSharedBoot = useSharedCityBoot && sharedCityBootHarness;
    const context = usingSharedBoot ? sharedCityBootHarness.context : await browser.newContext();
    const page = usingSharedBoot ? sharedCityBootHarness.page : await context.newPage();
    const bootProfile = usingSharedBoot ? sharedCityBootHarness.bootProfile : sharedCityBootProfile;
    const bootPath = usingSharedBoot ? sharedCityBootHarness.bootPath : sharedCityBootPath;
    const storageKeys = DEFAULT_STORAGE_KEYS;
    const resetTimeout = Math.max(30_000, Number(testInfo.timeout) || 0);

    if (!usingSharedBoot) {
      await gotoApp(page, bootPath, { waitUntil: "domcontentloaded" });
      await waitForAppInteractive(page, { timeout: 120_000 });
      await waitForShellReady(page, { timeout: 120_000 });
      await page.evaluate((nextBootProfile) => {
        globalThis.__sharedCityBootProfileKey = String(nextBootProfile || "");
      }, bootProfile);
    }

    await clearPageEventListeners(page);
    await resetSharedCityRuntimeState(page, {
      storageKeys,
      timeout: resetTimeout,
      requireInfraIdle: sharedCityRequireInfraIdle,
    });

    let resetSnapshot = null;
    let resetIssues = [];
    let resetError = null;
    let failureArtifactWritten = false;

    try {
      await use(page);
    } finally {
      const failed = testInfo.status !== testInfo.expectedStatus;
      if (failed) {
        try {
          const failureSnapshot = await readFailureContextSnapshot(page, DEFAULT_FAILURE_SELECTORS);
          await writeFailureContextArtifact(testInfo, failureSnapshot);
          failureArtifactWritten = true;
        } catch (error) {
          resetError = error;
        }
      }
      try {
        await clearPageEventListeners(page);
        await resetSharedCityRuntimeState(page, {
          storageKeys,
          timeout: resetTimeout,
          requireInfraIdle: sharedCityRequireInfraIdle,
        });
        resetSnapshot = await readSharedCityLeakSnapshot(page, {
          bootProfile,
          storageKeys,
        });
        resetIssues = collectSharedCityLeakIssues(resetSnapshot);
        if (resetIssues.length) {
          await attachSharedCityLeakArtifact(testInfo, resetSnapshot, resetIssues);
          if (!failed) {
            resetError = new Error(`[shared-city-fixture] leak guard failed: ${resetIssues.join("; ")}`);
          }
        }
      } catch (error) {
        resetError = error;
      }

      if (!failureArtifactWritten && resetError) {
        const failureSnapshot = await readFailureContextSnapshot(page, DEFAULT_FAILURE_SELECTORS);
        await writeFailureContextArtifact(testInfo, failureSnapshot);
      }

      if (!usingSharedBoot) {
        await context.close();
      }
    }

    if (resetError && testInfo.status === testInfo.expectedStatus) {
      throw resetError;
    }
  },
});

module.exports = {
  test,
  expect: base.expect,
  VIEW_SETTINGS_STORAGE_KEY,
  waitForSharedCityExactRender,
  ensureSharedCityBaseDataLoaded,
  setSharedCityZoomPercent,
  resetSharedCityZoom,
  installSharedCityLabelDrawHook,
  seedSharedCityViewSettings,
  resetSharedCityRuntimeState,
  prepareSharedCityRuntimeState,
};
