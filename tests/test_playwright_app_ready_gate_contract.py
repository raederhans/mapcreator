from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
PLAYWRIGHT_APP_JS = REPO_ROOT / "tests" / "e2e" / "support" / "playwright-app.js"
SCENARIO_BOUNDARY_SPEC = REPO_ROOT / "tests" / "e2e" / "scenario_boundary_regression.spec.js"
BROWSER_SMOKE_SCRIPT = REPO_ROOT / "ops" / "browser-mcp" / "run-smoke-browser-inspection.sh"


class PlaywrightReadyGateContractTest(unittest.TestCase):
    def test_shared_ready_gate_pins_state_ref_before_wait_for_function(self):
        content = PLAYWRIGHT_APP_JS.read_text(encoding="utf-8")

        self.assertIn("async function primeStateRef(page) {", content)
        self.assertIn("globalThis.__playwrightStateRef = stateModule?.state || null;", content)
        self.assertIn("await primeStateRef(page);", content)
        self.assertIn("state.bootBlocking === false", content)
        self.assertIn("!state.scenarioApplyInFlight", content)
        self.assertIn("!state.startupReadonlyUnlockInFlight", content)
        self.assertIn("currentScenarioState.activeScenarioId === expectedScenarioId", content)
        self.assertIn("&& !currentScenarioState.scenarioApplyInFlight", content)
        self.assertIn("&& currentScenarioState.shellReady", content)
        self.assertIn("const shellOwnerCount = Object.keys(state.scenarioAutoShellOwnerByFeatureId || {}).length;", content)
        self.assertNotIn("scenarioAutoShellControllerByFeatureId", content)
        self.assertIn("forceApply = false,", content)
        self.assertIn("!forceApply", content)
        self.assertNotIn("page.waitForFunction(async () => {", content)

    def test_scenario_boundary_spec_uses_sync_wait_predicates_for_state_gate(self):
        content = SCENARIO_BOUNDARY_SPEC.read_text(encoding="utf-8")

        self.assertIn("await primeStateRef(page);", content)
        self.assertIn("const state = globalThis.__playwrightStateRef || null;", content)
        self.assertNotIn("waitForFunction(async () => {", content)
        self.assertNotIn("waitForFunction(async (expectedScenarioId) => {", content)

    def test_browser_smoke_uses_current_playwright_cli_network_surface(self):
        content = BROWSER_SMOKE_SCRIPT.read_text(encoding="utf-8")

        self.assertIn('run_pwcli requests > "$network_log" || true', content)
        self.assertNotIn("run_pwcli network", content)
        self.assertIn('printf \'%s\\n\' "$pointer_log" > "$src_file"', content)


if __name__ == "__main__":
    unittest.main()
