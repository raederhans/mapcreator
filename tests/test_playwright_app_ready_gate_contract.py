import json
from pathlib import Path
import tomllib
import unittest

from tools.browser_smoke_profile_contract import validate_profile_path, validate_profile_payload


REPO_ROOT = Path(__file__).resolve().parents[1]
PLAYWRIGHT_APP_JS = REPO_ROOT / "tests" / "e2e" / "support" / "playwright-app.js"
SCENARIO_BOUNDARY_SPEC = REPO_ROOT / "tests" / "e2e" / "scenario_boundary_regression.spec.js"
BROWSER_SMOKE_SCRIPT = REPO_ROOT / "ops" / "browser-mcp" / "run-smoke-browser-inspection.sh"
BROWSER_SMOKE_PROFILE = REPO_ROOT / "ops" / "browser-mcp" / "inspection-profile.toml"
SCENARIOS_DIR = REPO_ROOT / "data" / "scenarios"


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
        self.assertIn("&& currentScenarioState.runtimeReady", content)
        self.assertIn("globalThis.__playwrightIsScenarioRuntimeReady = Function(`return (${readyPredicateSource});`)();", content)
        self.assertIn("function isScenarioRuntimeReadyForPlaywright(state) {", content)
        self.assertIn("const selectionVersion = Math.max(0, Number(loadState.selectionVersion || 0));", content)
        self.assertIn("const politicalFeatureCount = Array.isArray(state?.scenarioPoliticalChunkData?.features)", content)
        self.assertIn("const manifestUsesChunkRuntime = !!state?.activeScenarioManifest?.detail_chunk_manifest_url;", content)
        self.assertIn("const usesChunkRuntime = manifestUsesChunkRuntime || chunkRuntimeStateActive;", content)
        self.assertIn("const chunkVisualReady = (", content)
        self.assertIn("selectionVersion > 0", content)
        self.assertIn("politicalFeatureCount > 0", content)
        self.assertIn("if (usesChunkRuntime) return chunkVisualReady;", content)
        self.assertIn("isScenarioRuntimeReadyForPlaywright,", content)
        self.assertIn("globalThis.__playwrightIsScenarioRuntimeReady(state)", content)
        self.assertNotIn("scenarioAutoShellControllerByFeatureId", content)
        self.assertIn("forceApply = false,", content)
        self.assertIn("!forceApply", content)
        self.assertNotIn("page.waitForFunction(async () => {", content)

    def test_runtime_topology_only_scenarios_do_not_force_chunk_ready_gate(self):
        content = PLAYWRIGHT_APP_JS.read_text(encoding="utf-8")
        predicate_source = content[
            content.index("function isScenarioRuntimeReadyForPlaywright(state) {"):
            content.index("\n\nasync function primeStateRef(page)")
        ]

        for scenario_id in ("blank_base", "modern_world"):
            manifest = json.loads((SCENARIOS_DIR / scenario_id / "manifest.json").read_text(encoding="utf-8"))
            self.assertTrue(manifest.get("runtime_topology_url"), scenario_id)
            self.assertFalse(manifest.get("detail_chunk_manifest_url"), scenario_id)

        self.assertNotIn("runtime_topology_url", predicate_source)
        self.assertNotIn("runtime_meta_url", predicate_source)

    def test_scenario_boundary_spec_uses_sync_wait_predicates_for_state_gate(self):
        content = SCENARIO_BOUNDARY_SPEC.read_text(encoding="utf-8")

        self.assertIn("await primeStateRef(page);", content)
        self.assertIn("const state = globalThis.__playwrightStateRef || null;", content)
        self.assertNotIn("waitForFunction(async () => {", content)
        self.assertNotIn("waitForFunction(async (expectedScenarioId) => {", content)

    def test_browser_smoke_uses_current_playwright_cli_network_surface(self):
        content = BROWSER_SMOKE_SCRIPT.read_text(encoding="utf-8")

        self.assertIn('python3 tools/browser_smoke_profile_contract.py "$PROFILE_PATH" >/dev/null', content)
        self.assertLess(
            content.index('python3 tools/browser_smoke_profile_contract.py "$PROFILE_PATH" >/dev/null'),
            content.index('python3 - "$PROFILE_PATH" "$PARSE_DIR"'),
        )
        self.assertIn('run_pwcli requests > "$network_log" || true', content)
        self.assertNotIn("run_pwcli network", content)
        self.assertIn('printf \'%s\\n\' "$pointer_log" > "$src_file"', content)

    def test_browser_smoke_profile_keeps_runtime_output_and_budget_contract(self):
        profile = tomllib.loads(BROWSER_SMOKE_PROFILE.read_text(encoding="utf-8"))

        self.assertEqual([], validate_profile_path(BROWSER_SMOKE_PROFILE))
        self.assertEqual(profile["outputs"]["artifact_dir"], ".runtime/browser/mcp-artifacts")
        self.assertEqual(
            profile["outputs"]["report_path"],
            ".runtime/reports/generated/browser/ai-browser-mcp-smoketest.md",
        )
        self.assertLess(
            profile["budgets"]["quick"]["max_runtime_sec"],
            profile["budgets"]["full"]["max_runtime_sec"],
        )
        routes_by_id = {route["id"]: route for route in profile["routes"]}
        route_ids = set(routes_by_id)
        self.assertIn("home", route_ids)
        self.assertIn("docs", route_ids)
        self.assertIn("data_readme", route_ids)
        self.assertIn("quick", routes_by_id["home"]["enabled_modes"])
        self.assertNotIn("quick", routes_by_id["docs"]["enabled_modes"])

    def test_browser_smoke_profile_validator_reports_contract_errors(self):
        errors = validate_profile_payload({"routes": {}}, path="<test-profile>")

        self.assertIn("<test-profile>: version must be an integer.", errors)
        self.assertIn("<test-profile>: defaults must be a table.", errors)
        self.assertIn("<test-profile>: routes must be an array of tables.", errors)

    def test_browser_smoke_profile_validator_rejects_invalid_modes_and_references(self):
        profile = _minimal_browser_smoke_profile()
        profile["routes"][0]["enabled_modes"] = ["quick", "slow"]
        profile["sections"][0]["page"] = "missing"
        profile["routes"][0]["url"] = "docs/"

        errors = validate_profile_payload(profile, path="<test-profile>")

        self.assertIn("<test-profile>: routes[home].enabled_modes has invalid mode: slow.", errors)
        self.assertIn("<test-profile>: sections[left_sidebar].page references unknown route: missing.", errors)
        self.assertIn("<test-profile>: routes[home].url must start with '/', 'http://', or 'https://'.", errors)

    def test_browser_smoke_profile_validator_rejects_unknown_fields(self):
        profile = _minimal_browser_smoke_profile()
        profile["routes"][0]["enabled_mode"] = ["quick"]
        profile["sections"][0]["capture_networks"] = True

        errors = validate_profile_payload(profile, path="<test-profile>")

        self.assertIn("<test-profile>: routes[home] has unknown field: enabled_mode.", errors)
        self.assertIn("<test-profile>: sections[left_sidebar] has unknown field: capture_networks.", errors)

    def test_browser_smoke_profile_validator_requires_gesture_type(self):
        profile = _minimal_browser_smoke_profile()
        del profile["gestures"][0]["type"]

        errors = validate_profile_payload(profile, path="<test-profile>")

        self.assertIn("<test-profile>: gestures[map_pan_zoom].type must be one of: drag_zoom.", errors)

    def test_browser_smoke_profile_validator_rejects_runtime_output_escape(self):
        profile = _minimal_browser_smoke_profile()
        profile["outputs"]["artifact_dir"] = "../browser-artifacts"
        profile["outputs"]["report_path"] = "/tmp/browser-smoke.md"

        errors = validate_profile_payload(profile, path="<test-profile>")

        self.assertIn("<test-profile>: outputs.artifact_dir must stay under .runtime/browser/.", errors)
        self.assertIn("<test-profile>: outputs.report_path must stay under .runtime/reports/generated/browser/.", errors)

    def test_browser_smoke_profile_validator_keeps_quick_budgets_within_full(self):
        profile = _minimal_browser_smoke_profile()
        profile["budgets"]["quick"]["max_runtime_sec"] = 500

        errors = validate_profile_payload(profile, path="<test-profile>")

        self.assertIn(
            "<test-profile>: budgets.quick.max_runtime_sec must be less than or equal to budgets.full.max_runtime_sec.",
            errors,
        )


def _minimal_browser_smoke_profile():
    return {
        "version": 1,
        "defaults": {
            "base_host": "localhost",
            "port_range_start": 8000,
            "port_range_end": 8010,
            "server_title_pattern": "Scenario Forge",
            "wsl_windows_fallback": True,
        },
        "decision": {
            "default_mode": "auto",
            "auto_start_mode": "quick",
            "upgrade_on_cross_section_anomaly": True,
            "cross_section_threshold": 2,
            "upgrade_on_insufficient_evidence": False,
            "min_sections_for_confidence": 4,
            "full_trigger_keywords": ["scan all sections"],
            "quick_trigger_keywords": ["inspect ui"],
        },
        "budgets": {
            "quick": {
                "max_sections": 2,
                "max_screenshots": 2,
                "max_runtime_sec": 60,
                "max_network_entries": 100,
            },
            "full": {
                "max_sections": 4,
                "max_screenshots": 4,
                "max_runtime_sec": 120,
                "max_network_entries": 100,
            },
        },
        "evidence": {
            "console_min_level": "warning",
            "network_include_static": True,
            "network_failed_only": True,
        },
        "outputs": {
            "artifact_dir": ".runtime/browser/mcp-artifacts",
            "report_path": ".runtime/reports/generated/browser/ai-browser-mcp-smoketest.md",
        },
        "routes": [
            {
                "id": "home",
                "url": "/app/",
                "scroll": 0,
                "screenshot": True,
                "capture_console": True,
                "capture_network": True,
                "enabled_modes": ["quick", "full"],
            }
        ],
        "sections": [
            {
                "id": "left_sidebar",
                "page": "home",
                "selector": "aside.sidebar",
                "expand": "none",
                "scroll": 0,
                "screenshot": "always",
                "priority": "high",
                "enabled_modes": ["quick", "full"],
            }
        ],
        "gestures": [
            {
                "id": "map_pan_zoom",
                "page": "home",
                "selector": "#mapContainer",
                "type": "drag_zoom",
                "from": [980, 500],
                "to": [1120, 580],
                "wheel": -700,
                "screenshot": True,
                "enabled_modes": ["quick", "full"],
            }
        ],
    }


if __name__ == "__main__":
    unittest.main()
