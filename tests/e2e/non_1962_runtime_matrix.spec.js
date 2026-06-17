const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const {
  getAppUrl,
  waitForAppInteractive,
} = require("./support/playwright-app");

const SCENARIOS = [
  { id: "blank_base", label: "Blank Map", paletteId: "hoi4_vanilla", expectedColors: {}, ownerless: true },
  { id: "hoi4_1936", label: "HOI4 1936", paletteId: "hoi4_vanilla", expectedColors: { USA: "#1485ed", ENG: "#c9385d" } },
  { id: "hoi4_1939", label: "HOI4 1939", paletteId: "hoi4_vanilla", expectedColors: { USA: "#1485ed", ENG: "#c9385d" } },
  { id: "modern_world", label: "Modern World", paletteId: "hoi4_vanilla", expectedColors: { AU: "#398f61", BR: "#4c913f" } },
];

const REPORT_DIR = path.join(
  ".runtime",
  "reports",
  "generated",
  "non-1962-scenario-audit"
);
const SCREENSHOT_DIR = path.join(
  ".runtime",
  "browser",
  "mcp-artifacts",
  "non-1962-runtime-matrix"
);

const ALLOWED_CONSOLE_WARNING_PATTERNS = [
  /^\[map_renderer\] Removed 2 D3-unsafe water geometry part\(s\): marine_arctic_ocean, marine_southern_ocean$/,
  /^\[physical\] global_physical_semantics\.topo\.json unavailable or deferred; disabling physical atlas instead of using the old fallback\.$/,
  /^\[physical\] global_contours\.major\.topo\.json unavailable or deferred; skipping terrain contours\.$/,
  /^\[scenario\] Applying bundle without confirmed detail promotion; health gate will validate runtime topology\.$/,
  /^\[scenario\] Detail visibility gate triggered for [a-z0-9_]+: runtime=\d+, expected=\d+, ratio=[0-9.]+ \(min=0\.7\)\.$/,
  /^\[map_renderer\] scenario_owner_only borders unavailable for scenario=[a-z0-9_]+; canonical country-border fallback suppressed to preserve scenario integrity\.$/,
];

function isActionableConsoleIssue(issue) {
  if (issue.type === "error") return true;
  return !ALLOWED_CONSOLE_WARNING_PATTERNS.some((pattern) => pattern.test(issue.text));
}

function isActionableNetworkFailure(response) {
  const status = response.status();
  const url = response.url();
  if (status < 400) return false;
  return !url.startsWith("data:");
}

test.describe("non-1962 scenario runtime matrix", () => {
  for (const scenario of SCENARIOS) {
    test(`${scenario.id} starts active without startup asset gaps`, async ({ page }) => {
      test.setTimeout(120000);
      const consoleIssues = [];
      const networkFailures = [];

      page.on("console", (msg) => {
        const type = msg.type();
        if (type === "error" || type === "warning") {
          consoleIssues.push({ type, text: msg.text() });
        }
      });
      page.on("response", (response) => {
        if (isActionableNetworkFailure(response)) {
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

      await page.goto(getAppUrl(`/?default_scenario=${scenario.id}`), {
        waitUntil: "domcontentloaded",
      });
      await waitForAppInteractive(page, { timeout: 90000 });
      await expect(page.locator("#scenarioStatus")).toContainText(scenario.label, {
        timeout: 30000,
      });
      await page.waitForFunction(() => {
        const statusText = String(document.querySelector("#scenarioStatus")?.textContent || "");
        const auditText = String(document.querySelector("#scenarioAuditHint")?.textContent || "");
        return !statusText.includes("coarse mode") && !auditText.includes("coarse mode");
      }, { timeout: 90000 });

      const runtimeState = await page.evaluate(async () => {
        const { state } = await import("/js/core/state.js");
        return {
          activeScenarioId: String(state.activeScenarioId || ""),
          scenarioStatusText: String(document.querySelector("#scenarioStatus")?.textContent || "").trim(),
          scenarioAuditHintText: String(document.querySelector("#scenarioAuditHint")?.textContent || "").trim(),
          runtimeFeatureCount: Number(
            state.runtimePoliticalTopology?.objects?.political?.geometries?.length || 0
          ),
          activePaletteId: String(state.activePaletteId || ""),
          scenarioGeneratedColorTags: [...(state.scenarioGeneratedColorTags || [])].sort(),
          scenarioFixedOwnerColors: Object.fromEntries(
            Object.keys(state.scenarioFixedOwnerColors || {})
              .sort()
              .map((tag) => [tag, state.scenarioFixedOwnerColors[tag]])
          ),
          health: state.scenarioDataHealth || null,
        };
      });

      fs.mkdirSync(REPORT_DIR, { recursive: true });
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      const screenshotPath = path.join(SCREENSHOT_DIR, `${scenario.id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const report = {
        scenario,
        runtimeState,
        consoleIssues,
        actionableConsoleIssues: consoleIssues.filter(isActionableConsoleIssue),
        networkFailures,
        screenshotPath,
      };
      fs.writeFileSync(
        path.join(REPORT_DIR, `${scenario.id}.runtime_matrix.json`),
        JSON.stringify(report, null, 2)
      );

      expect(runtimeState.activeScenarioId).toBe(scenario.id);
      expect(runtimeState.activePaletteId).toBe(scenario.paletteId);
      expect(runtimeState.scenarioGeneratedColorTags).toEqual([]);
      expect(runtimeState.health?.generatedColorTags || []).toEqual([]);
      expect(runtimeState.runtimeFeatureCount).toBeGreaterThan(0);
      for (const [tag, color] of Object.entries(scenario.expectedColors || {})) {
        expect(runtimeState.scenarioFixedOwnerColors[tag]).toBe(color);
      }
      if (scenario.ownerless) {
        expect(Object.keys(runtimeState.scenarioFixedOwnerColors || {}).length).toBeGreaterThan(0);
      }
      expect(runtimeState.scenarioStatusText).not.toContain("coarse mode");
      expect(runtimeState.scenarioAuditHintText).not.toContain("coarse mode");
      expect(consoleIssues.filter(isActionableConsoleIssue)).toEqual([]);
      expect(networkFailures).toEqual([]);
    });
  }
});
