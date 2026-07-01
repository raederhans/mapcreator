const { test, expect } = require("@playwright/test");
const {
  gotoApp,
  waitForShellReady,
  waitForScenarioApplyIdle,
  readSmokeFailureSnapshot,
  writeFailureContextArtifact,
} = require("./support/playwright-app");

test.setTimeout(180000);

async function readSampleDeeplinkState(page) {
  return page.evaluate(async () => {
    const stateModuleUrl = new URL("./js/core/state.js", globalThis.location.href).toString();
    const { state } = await import(stateModuleUrl);
    return {
      activeScenarioId: String(state.activeScenarioId || ""),
      status: String(state.sampleProjectDeeplink?.status || ""),
      sampleId: String(state.sampleProjectDeeplink?.sampleId || ""),
      scenarioId: String(state.sampleProjectDeeplink?.scenarioId || ""),
      errorCode: String(state.sampleProjectDeeplink?.errorCode || ""),
    };
  });
}

async function writeSampleGuideFailureArtifact(page, testInfo) {
  const snapshot = await readSmokeFailureSnapshot(page, [
    "#scenarioGuidePopover",
    "[data-sample-guide-helper]",
    "[data-sample-guide-title]",
    "[data-sample-guide-choice]",
    "[data-sample-guide-status-message]",
    "[data-sample-guide-open-export]",
    "[data-sample-guide-download-original]",
    "[data-sample-guide-continue]",
    "[data-app-dialog-overlay='true']",
    "#exportWorkbenchOverlay",
    "#scenarioStatus",
  ]);
  await writeFailureContextArtifact(testInfo, snapshot, {
    fileName: "sample-guide-deeplink-failure-context.json",
    attachmentName: "sample-guide-deeplink-failure-context",
  });
}

test("sample guide card opens export from the TNO sample deeplink", async ({ page }, testInfo) => {
  try {
    await gotoApp(page, "/app/?sample=tno-1962-atlantropa-briefing&view=guide", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page, { timeout: 120000, requireCanvas: true });
    await expect(page.locator("#scenarioGuidePopover")).toBeVisible({ timeout: 30000 });

    await waitForScenarioApplyIdle(page, { scenarioId: "tno_1962", timeout: 120000 });
    await expect.poll(() => readSampleDeeplinkState(page), { timeout: 30000 }).toMatchObject({
      activeScenarioId: "tno_1962",
      status: "success",
      sampleId: "tno-1962-atlantropa-briefing",
      scenarioId: "tno_1962",
    });

    const guideCard = page.locator("[data-sample-guide-helper]");
    await expect(guideCard).toBeVisible({ timeout: 30000 });
    await expect(guideCard).toHaveAttribute("data-sample-guide-status", "success");
    await expect(page.locator("[data-sample-guide-title]")).toContainText(/TNO 1962 Atlantropa briefing/i);
    await expect(page.locator("[data-sample-guide-download-original]")).toHaveAttribute(
      "href",
      /\.\.\/assets\/sample-projects\/tno-1962-atlantropa-briefing\.project\.json$/,
    );

    const sampleChoices = page.locator("[data-sample-guide-choice]");
    await expect(sampleChoices).toHaveCount(5, { timeout: 30000 });
    await expect(page.locator("[data-sample-guide-choice='hgo-1936-atlas-preview']")).toHaveCount(0);
    await expect(page.locator("[data-sample-guide-choice='tno-1962-atlantropa-briefing']")).toHaveAttribute(
      "aria-current",
      "true",
    );

    await page.locator("[data-sample-guide-open-export]").click();
    await expect(page.locator("#exportWorkbenchOverlay")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("#exportWorkbenchPanel")).toBeVisible();
    await expect(page.locator("#exportWorkbenchSnapshotBtn")).toBeVisible();
    await page.locator("#exportWorkbenchCloseBtn").click();
    await expect(page.locator("#exportWorkbenchOverlay")).toBeHidden({ timeout: 30000 });
    if (await page.locator("#scenarioGuidePopover").isHidden()) {
      await page.locator("#scenarioGuideBtn").click();
      await expect(page.locator("#scenarioGuidePopover")).toBeVisible({ timeout: 30000 });
    }

    await page.locator("[data-sample-guide-choice='modern-world-japan-corridor']").click();
    await waitForScenarioApplyIdle(page, { scenarioId: "modern_world", timeout: 120000 });
    await expect.poll(() => readSampleDeeplinkState(page), { timeout: 30000 }).toMatchObject({
      activeScenarioId: "modern_world",
      status: "success",
      sampleId: "modern-world-japan-corridor",
      scenarioId: "modern_world",
    });
    await expect(page).toHaveURL(/sample=modern-world-japan-corridor/);
    await expect(page).toHaveURL(/view=guide/);
    await expect(page.locator("[data-sample-guide-choice='modern-world-japan-corridor']")).toHaveAttribute(
      "aria-current",
      "true",
    );

    await page.evaluate(async () => {
      const { markDirty } = await import("/js/core/dirty_state.js");
      markDirty("playwright-sample-switch-cancel");
    });
    if (await page.locator("#scenarioGuidePopover").isHidden()) {
      await page.locator("#scenarioGuideBtn").click();
      await expect(page.locator("#scenarioGuidePopover")).toBeVisible({ timeout: 30000 });
    }
    await page.locator("[data-sample-guide-choice='tno-1962-atlantropa-briefing']").click();
    const dirtyDialog = page.locator("[data-app-dialog-overlay='true']");
    await expect(dirtyDialog).toBeVisible({ timeout: 30000 });
    await expect(dirtyDialog.locator(".app-dialog-title")).toContainText(/Load another sample\?/i);
    await dirtyDialog.locator("[data-dialog-cancel='true']").click();
    await expect(dirtyDialog).toBeHidden({ timeout: 30000 });
    await expect.poll(() => readSampleDeeplinkState(page), { timeout: 30000 }).toMatchObject({
      activeScenarioId: "modern_world",
      status: "success",
      sampleId: "modern-world-japan-corridor",
      scenarioId: "modern_world",
    });
    await expect(page).toHaveURL(/sample=modern-world-japan-corridor/);
  } catch (error) {
    await writeSampleGuideFailureArtifact(page, testInfo);
    throw error;
  }
});

test("sample guide card shows a non-fatal error for a bad sample deeplink", async ({ page }, testInfo) => {
  try {
    await gotoApp(page, "/app/?sample=not-a-real-sample&view=guide", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page, { timeout: 120000 });
    await expect(page.locator("#scenarioGuidePopover")).toBeVisible({ timeout: 30000 });

    await expect.poll(() => readSampleDeeplinkState(page), { timeout: 30000 }).toMatchObject({
      status: "error",
      sampleId: "not-a-real-sample",
      errorCode: "unknown-sample-id",
    });

    const guideCard = page.locator("[data-sample-guide-helper]");
    await expect(guideCard).toBeVisible({ timeout: 30000 });
    await expect(guideCard).toHaveAttribute("data-sample-guide-status", "error");
    await expect(page.locator("[data-sample-guide-title]")).toContainText(/Sample unavailable/i);
    await expect(guideCard).toContainText(/not in the public sample list/i);
    await expect(page.locator("[data-sample-guide-open-export]")).toBeHidden();
    await expect(page.locator("[data-sample-guide-download-original]")).toBeHidden();
    await expect(page.locator("[data-sample-guide-continue]")).toBeVisible();

    await page.locator("[data-sample-guide-continue]").click();
    await expect(page.locator("#scenarioGuideSectionQuick")).toBeVisible();
    await expect(page.locator("#scenarioGuideStepApply")).toBeVisible();
  } catch (error) {
    await writeSampleGuideFailureArtifact(page, testInfo);
    throw error;
  }
});
