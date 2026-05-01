const { test, expect } = require("@playwright/test");
const {
  gotoApp,
  primeStateRef,
  waitForAppInteractive,
  readSmokeFailureSnapshot,
  writeFailureContextArtifact,
} = require("./support/playwright-app");
const { mergeSmokeFailureSelectors } = require("./support/playwright-selectors");

async function readShellSnapshot(page) {
  return page.evaluate(() => {
    const state = globalThis.__playwrightStateRef || null;
    const text = (selector) => String(document.querySelector(selector)?.textContent || "").trim();
    return {
      currentLanguage: String(state?.currentLanguage || "en"),
      leftPanelText: text("#leftPanelToggle"),
      rightPanelText: text("#rightPanelToggle"),
      languageButtonText: text("#btnToggleLang"),
    };
  });
}

test("main shell static i18n updates key shell labels", async ({ page }, testInfo) => {
  test.setTimeout(90_000);

  try {
    await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
    await waitForAppInteractive(page, { timeout: 90_000 });
    await primeStateRef(page);

    await expect.poll(() => readShellSnapshot(page), { timeout: 20_000 }).toEqual({
      currentLanguage: "en",
      leftPanelText: "Panels",
      rightPanelText: "Inspector",
      languageButtonText: "EN / ZH",
    });
  } catch (error) {
    const smokeFailureSnapshot = await readSmokeFailureSnapshot(page, mergeSmokeFailureSelectors(
      "bootShell",
      "mainShell",
    ));
    await writeFailureContextArtifact(testInfo, smokeFailureSnapshot);
    throw error;
  }
});
