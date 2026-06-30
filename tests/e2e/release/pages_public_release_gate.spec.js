const { test, expect } = require("@playwright/test");
const {
  waitForShellReady,
  waitForScenarioApplyIdle,
  readSmokeFailureSnapshot,
  writeFailureContextArtifact,
} = require("../support/playwright-app");

// JUSTIFY: public Pages deploy smoke waits for CDN network idle plus full TNO startup and export UI readiness.
test.setTimeout(180000);

const DEFAULT_DEPLOYED_PAGES_URL = "https://raederhans.github.io/scenario-forge/";
const EXPLICIT_PUBLIC_BASE_URL = String(
  process.env.SCENARIO_FORGE_PAGES_URL
  || process.env.PLAYWRIGHT_TEST_BASE_URL
  || ""
).trim();
const ALLOW_DEFAULT_DEPLOYED_URL = process.env.SCENARIO_FORGE_ALLOW_DEFAULT_PAGES_URL === "1"
  || process.env.npm_lifecycle_event === "test:e2e:pages-public-release-gate:deployed";
const PUBLIC_BASE_URL = EXPLICIT_PUBLIC_BASE_URL
  || (ALLOW_DEFAULT_DEPLOYED_URL ? DEFAULT_DEPLOYED_PAGES_URL : "");

if (!PUBLIC_BASE_URL) {
  throw new Error(
    "Set SCENARIO_FORGE_PAGES_URL or PLAYWRIGHT_TEST_BASE_URL before running the Pages release gate. "
    + "Use npm run test:e2e:pages-public-release-gate:deployed to validate the default deployed Pages URL."
  );
}

function publicUrl(pathname = "") {
  const baseUrl = PUBLIC_BASE_URL.endsWith("/") ? PUBLIC_BASE_URL : `${PUBLIC_BASE_URL}/`;
  const relativePath = String(pathname || "").replace(/^\/+/, "");
  return new URL(relativePath, baseUrl).toString();
}

async function readPublicReleaseGateState(page) {
  return page.evaluate(async () => {
    const stateModuleUrl = new URL("./js/core/state.js", globalThis.location.href).toString();
    const { state } = await import(stateModuleUrl);
    const scenarioSelect = document.querySelector("#scenarioSelect");
    return {
      activeScenarioId: String(state.activeScenarioId || ""),
      bootBlocking: state.bootBlocking === false ? false : !!state.bootBlocking,
      scenarioApplyInFlight: !!state.scenarioApplyInFlight,
      optionValues: Array.from(scenarioSelect?.options || []).map((option) => option.value),
      hgoPreviewEnabled: !!state.hgoRuntimePreview?.enabled,
      hasHgoRuntimeAssets: !!state.dataManifest?.assets?.hgo_runtime_manifest,
      sampleProjectDeeplink: {
        status: String(state.sampleProjectDeeplink?.status || ""),
        sampleId: String(state.sampleProjectDeeplink?.sampleId || ""),
        scenarioId: String(state.sampleProjectDeeplink?.scenarioId || ""),
      },
    };
  });
}

function isExpectedAnonymousBackendProbe(failure) {
  try {
    const url = new URL(String(failure?.url || ""));
    return url.pathname === "/api/backend/auth/me"
      && (failure.status === 401 || failure.status === 404);
  } catch {
    return false;
  }
}

function isExpectedNavigationAbort(failure) {
  return failure?.status === "failed"
    && String(failure?.errorText || "") === "net::ERR_ABORTED"
    && failure?.resourceType === "document"
    && failure?.isNavigationRequest === true;
}

function filterUnexpectedConsoleIssues(consoleIssues, { ignoredAnonymousBackendProbeCount }) {
  return consoleIssues.filter((issue) => {
    const text = String(issue?.text || "");
    if (/preload/i.test(text)) return false;
    if (/^\[map_renderer\] Removed \d+ D3-unsafe water geometry part\(s\): /i.test(text)) return false;
    if (
      ignoredAnonymousBackendProbeCount > 0
      && /^Failed to load resource: the server responded with a status of (401|404)/i.test(text)
    ) {
      return false;
    }
    return true;
  });
}

test("public Pages release gate", async ({ page }, testInfo) => {
  const consoleIssues = [];
  const networkFailures = [];

  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      consoleIssues.push({ type, text: msg.text() });
    }
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
      errorText: request.failure()?.errorText || "requestfailed",
      resourceType: request.resourceType(),
      isNavigationRequest: request.isNavigationRequest(),
    });
  });

  try {
    await page.goto(publicUrl(""), { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await expect.poll(async () => page.locator("a[href*='app']").count()).toBeGreaterThan(0);
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    await page.goto(publicUrl("app/?sample=tno-1962-atlantropa-briefing&view=guide"), { waitUntil: "domcontentloaded" });
    await waitForShellReady(page, { timeout: 120000, requireCanvas: true });
    await expect(page.locator("#scenarioGuidePopover")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("#scenarioGuideTitle")).toContainText(/Scenario Quick Start/i);

    await waitForScenarioApplyIdle(page, { scenarioId: "tno_1962", timeout: 120000 });
    await expect(page.locator("#scenarioStatus")).toContainText("TNO 1962", { timeout: 30000 });
    await expect.poll(() => readPublicReleaseGateState(page), { timeout: 30000 }).toMatchObject({
      activeScenarioId: "tno_1962",
      scenarioApplyInFlight: false,
      sampleProjectDeeplink: {
        status: "success",
        sampleId: "tno-1962-atlantropa-briefing",
        scenarioId: "tno_1962",
      },
    });

    const releaseState = await readPublicReleaseGateState(page);
    expect(releaseState.optionValues).toContain("tno_1962");
    expect(releaseState.optionValues).not.toContain("hgo_1936");
    expect(releaseState.optionValues).not.toContain("__hgo_runtime_preview__");
    expect(releaseState.hgoPreviewEnabled).toBe(false);
    expect(releaseState.hasHgoRuntimeAssets).toBe(false);

    await page.keyboard.press("Escape");
    await expect(page.locator("#scenarioGuidePopover")).toBeHidden({ timeout: 30000 });
    const projectTab = page.locator("#inspectorSidebarTabProject");
    if (await projectTab.isVisible()) {
      await projectTab.click();
    }
    await page.locator("#exportProjectSection").evaluate((section) => {
      if (section instanceof HTMLDetailsElement) section.open = true;
    });
    await expect(page.locator("#dockExportBtn")).toBeVisible({ timeout: 30000 });
    await page.locator("#dockExportBtn").click();
    await expect(page.locator("#exportWorkbenchOverlay")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("#exportWorkbenchPanel")).toBeVisible();
    await expect(page.locator("#exportWorkbenchSnapshotBtn")).toBeVisible();

    const unexpectedNetworkFailures = networkFailures.filter((failure) => (
      !isExpectedAnonymousBackendProbe(failure)
      && !isExpectedNavigationAbort(failure)
    ));
    const ignoredAnonymousBackendProbeCount = networkFailures.length - unexpectedNetworkFailures.length;
    const unexpectedConsoleIssues = filterUnexpectedConsoleIssues(consoleIssues, { ignoredAnonymousBackendProbeCount });
    expect(unexpectedNetworkFailures).toEqual([]);
    expect(unexpectedConsoleIssues).toEqual([]);

    console.log(JSON.stringify({
      baseUrl: PUBLIC_BASE_URL,
      activeScenarioId: releaseState.activeScenarioId,
      sampleProjectDeeplink: releaseState.sampleProjectDeeplink,
      optionValues: releaseState.optionValues,
      hgoPreviewEnabled: releaseState.hgoPreviewEnabled,
      hasHgoRuntimeAssets: releaseState.hasHgoRuntimeAssets,
      consoleIssueCount: consoleIssues.length,
      networkFailureCount: networkFailures.length,
      ignoredAnonymousBackendProbeCount,
    }, null, 2));
  } catch (error) {
    const snapshot = await readSmokeFailureSnapshot(page, [
      "body",
      "#scenarioGuidePopover",
      "#scenarioStatus",
      "#scenarioSelect",
      "#exportWorkbenchOverlay",
      "#exportWorkbenchPanel",
    ]);
    await writeFailureContextArtifact(testInfo, snapshot, {
      fileName: "pages-public-release-gate-failure-context.json",
      attachmentName: "pages-public-release-gate-failure-context",
    });
    throw error;
  }
});
