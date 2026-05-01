from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
TMP_ROOT = REPO_ROOT / ".runtime" / "tmp" / "test_e2e_structural_tooling"


def run_command(*command: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(command),
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


class E2eStructuralToolingContractTest(unittest.TestCase):
    def setUp(self) -> None:
        TMP_ROOT.mkdir(parents=True, exist_ok=True)

    def assert_command_ok(self, result: subprocess.CompletedProcess[str]) -> None:
        if result.returncode == 0:
            return
        details = "\n".join(part for part in [result.stdout.strip(), result.stderr.strip()] if part)
        self.fail(details or "command failed")

    def test_timeout_inventory_writes_schema(self) -> None:
        json_out = TMP_ROOT / "timeout-inventory.json"
        md_out = TMP_ROOT / "timeout-inventory.md"
        result = run_command(
            "node",
            "tools/test_timeout_inventory.mjs",
            "--json-out",
            str(json_out),
            "--md-out",
            str(md_out),
        )
        self.assert_command_ok(result)
        payload = json.loads(json_out.read_text(encoding="utf-8"))
        self.assertEqual(payload["schemaVersion"], 1)
        self.assertGreaterEqual(payload["summary"]["specFileCount"], 45)
        self.assertTrue(any(entry["specPath"] == "tests/e2e/city_lights_layer_regression.spec.js" for entry in payload["entries"]))
        self.assertTrue(md_out.exists())

    def test_import_graph_writes_schema(self) -> None:
        graph_out = TMP_ROOT / "test-import-graph.json"
        summary_json = TMP_ROOT / "test-import-graph-summary.json"
        summary_md = TMP_ROOT / "test-import-graph-summary.md"
        result = run_command(
            "node",
            "tools/build_test_import_graph.mjs",
            "--graph-out",
            str(graph_out),
            "--summary-json-out",
            str(summary_json),
            "--summary-md-out",
            str(summary_md),
        )
        self.assert_command_ok(result)
        payload = json.loads(graph_out.read_text(encoding="utf-8"))
        self.assertEqual(payload["schemaVersion"], 1)
        self.assertGreaterEqual(payload["summary"]["specCount"], 45)
        self.assertIn("tests/e2e/main_shell_i18n.spec.js", payload["specs"])
        self.assertIn("tests/e2e/support/playwright-app.js", payload["reverseIndex"])
        self.assertTrue(summary_json.exists())
        self.assertTrue(summary_md.exists())

    def test_console_allowlist_decay_passes(self) -> None:
        result = run_command("node", "tools/check_console_allowlist_decay.mjs")
        self.assert_command_ok(result)
        self.assertIn("Console allowlist passed", result.stdout)

    def test_timeout_guardrails_pass(self) -> None:
        result = run_command("node", "tools/check_test_timeout_guardrails.mjs")
        self.assert_command_ok(result)
        self.assertIn("Test timeout guardrails passed", result.stdout)

    def test_verification_selector_routes_bootstrap_detail_promotion_changes(self) -> None:
        script = """
const { buildRecommendation } = await import('./tools/select_verification_targets.mjs');
const report = buildRecommendation(['js/bootstrap/deferred_detail_promotion.js']);
const commands = report.recommendedCommands.map((entry) => entry.commandRef);
if (!commands.includes('node tools/e2e_layering.mjs run-domain startup')) {
  throw new Error(`missing startup route: ${commands.join(', ')}`);
}
if (!commands.includes('node tools/e2e_layering.mjs run-domain tno-startup')) {
  throw new Error(`missing tno-startup route: ${commands.join(', ')}`);
}
if (!commands.includes('node tools/e2e_layering.mjs run-domain city-runtime')) {
  throw new Error(`missing city-runtime route: ${commands.join(', ')}`);
}
if (!commands.includes('python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_scenario_renderer_bridge_boundary_contract -q')) {
  throw new Error(`missing deferred-detail python contract: ${commands.join(', ')}`);
}
if (commands.includes('node tools/e2e_layering.mjs run-domain scenario-runtime')) {
  throw new Error(`scenario-runtime route should stay out of the fallback set: ${commands.join(', ')}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_shared_city_fixtures_pass_wait_timeout_as_playwright_option(self) -> None:
        script = """
const fixtures = require('./tests/e2e/support/fixtures.js');
const waitCalls = [];
const page = {
  waitForFunction(...args) {
    waitCalls.push(args);
    return Promise.resolve();
  },
  evaluate() {
    return Promise.resolve();
  },
};
(async () => {
  await fixtures.waitForSharedCityExactRender(page, { timeout: 45_000 });
  await fixtures.ensureSharedCityBaseDataLoaded(page, 'contract-shared-city', { timeout: 90_000 });
  const sawExactTimeout = waitCalls.some((args) => args.length === 3 && args[2]?.timeout === 45_000);
  const sawBaseDataTimeout = waitCalls.some((args) => args.length === 3 && args[2]?.timeout === 90_000);
  if (!sawExactTimeout) {
    throw new Error(`waitForSharedCityExactRender did not pass timeout as third argument: ${JSON.stringify(waitCalls)}`);
  }
  if (!sawBaseDataTimeout) {
    throw new Error(`ensureSharedCityBaseDataLoaded did not pass timeout as third argument: ${JSON.stringify(waitCalls)}`);
  }
})();
"""
        result = run_command("node", "-e", script)
        self.assert_command_ok(result)

    def test_shared_city_fixtures_restore_runtime_snapshots_on_reset(self) -> None:
        source = (REPO_ROOT / "tests" / "e2e" / "support" / "fixtures.js").read_text(encoding="utf-8")
        self.assertIn("captureSharedCityRuntimeSnapshot", source)
        self.assertIn("__sharedCityWorldCitiesSnapshot", source)
        self.assertIn("__sharedCityScenarioOverridesSnapshot", source)
        self.assertIn('state.worldCitiesData = cloneRuntimeValue(globalThis.__sharedCityWorldCitiesSnapshot);', source)
        self.assertIn('state.scenarioCityOverridesData = cloneRuntimeValue(globalThis.__sharedCityScenarioOverridesSnapshot);', source)
        self.assertIn("worldOverrideCount", source)
        self.assertIn("scenarioOverrideCount", source)
        self.assertIn("display-name overrides remained after reset", source)
        self.assertIn("const resetTimeout = Math.max(30_000, Number(testInfo.timeout) || 0);", source)
        self.assertIn("await resetSharedCityRuntimeState(page, { storageKeys, timeout: resetTimeout });", source)

    def test_failure_context_reporter_tracks_failure_context_attachment(self) -> None:
        script = """
const fs = require('fs');
const path = require('path');
const FailureContextReporter = require('./tests/e2e/support/reporters/failure-context-reporter.js');
const outputFile = path.join('.runtime', 'tmp', 'failure-context-reporter-contract.ndjson');
fs.rmSync(outputFile, { force: true });
process.env.PLAYWRIGHT_FAILURE_CONTEXT_INDEX_FILE = outputFile;
const reporter = new FailureContextReporter();
reporter.onTestEnd(
  { title: 'demo', location: { file: path.join(process.cwd(), 'tests/e2e/main_shell_i18n.spec.js') } },
  {
    status: 'failed',
    retry: 0,
    duration: 321,
    parallelIndex: 0,
    startTime: new Date('2026-05-01T00:00:00Z'),
    error: { message: 'boom' },
    attachments: [
      {
        name: 'failure-context',
        path: path.join(process.cwd(), '.runtime/tests/playwright/demo/failure-context.json'),
        contentType: 'application/json',
      },
    ],
  }
);
const lines = fs.readFileSync(outputFile, 'utf8').trim().split(/\\r?\\n/).filter(Boolean).map((line) => JSON.parse(line));
if (lines.length !== 1) {
  throw new Error(`expected exactly one reporter line, got ${lines.length}`);
}
if (!String(lines[0].failureContextPath || '').endsWith('failure-context.json')) {
  throw new Error(`expected failureContextPath, got ${lines[0].failureContextPath}`);
}
"""
        result = run_command("node", "-e", script)
        self.assert_command_ok(result)

    def test_timing_reporter_appends_ndjson_entry(self) -> None:
        script = """
const fs = require('fs');
const path = require('path');
const TimingReporter = require('./tests/e2e/support/reporters/timing-reporter.js');
const outputFile = path.join('.runtime', 'tmp', 'timing-reporter-contract.ndjson');
fs.rmSync(outputFile, { force: true });
process.env.PLAYWRIGHT_TIMING_OUTPUT_FILE = outputFile;
const reporter = new TimingReporter();
reporter.onTestEnd(
  { title: 'demo', location: { file: path.join(process.cwd(), 'tests/e2e/ui_contract_foundation.spec.js') } },
  {
    status: 'passed',
    retry: 0,
    duration: 123,
    parallelIndex: 1,
    startTime: new Date('2026-05-01T00:00:00Z'),
    attachments: [],
  }
);
const lines = fs.readFileSync(outputFile, 'utf8').trim().split(/\\r?\\n/).filter(Boolean).map((line) => JSON.parse(line));
if (lines.length !== 1) {
  throw new Error(`expected exactly one timing line, got ${lines.length}`);
}
if (lines[0].specPath !== 'tests/e2e/ui_contract_foundation.spec.js') {
  throw new Error(`unexpected specPath ${lines[0].specPath}`);
}
"""
        result = run_command("node", "-e", script)
        self.assert_command_ok(result)


if __name__ == "__main__":
    unittest.main()
