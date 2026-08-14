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
        self.assertGreaterEqual(payload["summary"]["specFileCount"], 44)
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
        self.assertGreaterEqual(payload["summary"]["specCount"], 44)
        self.assertIn("tests/e2e/main_shell_i18n.spec.js", payload["specs"])
        self.assertIn("tests/e2e/support/playwright-app.js", payload["reverseIndex"])
        self.assertTrue(summary_json.exists())
        self.assertTrue(summary_md.exists())

    def test_visual_color_readiness_keeps_shared_interaction_infra_gate(self) -> None:
        support_source = (REPO_ROOT / "tests" / "e2e" / "support" / "playwright-app.js").read_text(encoding="utf-8")
        scenario_source = (
            REPO_ROOT
            / "tests"
            / "e2e"
            / "dev"
            / "scenario_chunk_exact_after_settle_regression.dev.spec.js"
        ).read_text(encoding="utf-8")

        shared_chunk_idle = support_source[
            support_source.index("async function waitForChunkIdle"):
            support_source.index("async function waitForRenderIdle")
        ]
        political_color_wait = scenario_source[
            scenario_source.index("async function waitForFullPoliticalColorCoverage"):
            scenario_source.index("async function collectPostEditPoliticalSnapshot")
        ]
        post_edit_paint_wait = scenario_source[
            scenario_source.index("async function waitForPostEditPoliticalPaint"):
            scenario_source.index("async function startChunkPromotionProbe")
        ]

        self.assertIn("requireInfra = true", shared_chunk_idle)
        self.assertIn("&& (!requiresInfra || !loadState.pendingInfraPromotion)", shared_chunk_idle)
        self.assertNotIn("&& !loadState.pendingInfraPromotion", political_color_wait)
        self.assertNotIn("&& !loadState.pendingInfraPromotion", post_edit_paint_wait)
        self.assertIn("pendingInfraPromotion: !!loadState.pendingInfraPromotion", political_color_wait)

        fixtures_source = (REPO_ROOT / "tests" / "e2e" / "support" / "fixtures.js").read_text(encoding="utf-8")
        city_label_source = (REPO_ROOT / "tests" / "e2e" / "city_label_i18n_redraw.spec.js").read_text(encoding="utf-8")
        city_lights_source = (REPO_ROOT / "tests" / "e2e" / "city_lights_layer_regression.spec.js").read_text(encoding="utf-8")
        self.assertIn("sharedCityRequireInfraIdle: [true", fixtures_source)
        self.assertIn('}, { scope: "worker", timeout: SHARED_CITY_BOOT_TIMEOUT_MS }]', fixtures_source)
        self.assertIn("test.use({ sharedCityRequireInfraIdle: false })", city_label_source)
        self.assertIn("requireInfraIdle: true", city_label_source)
        self.assertNotIn("async function ensureScenario", city_label_source)
        self.assertNotIn("async function ensureBaseCityDataLoaded", city_label_source)
        self.assertNotIn("async function setZoomPercent", city_label_source)
        self.assertIn("test.use({ sharedCityRequireInfraIdle: false })", city_lights_source)
        self.assertIn("requireInfraIdle: true", city_lights_source)
        self.assertIn("async function waitForVisualRenderIdle(page, options = {})", city_lights_source)
        self.assertIn("await waitForRenderIdle(page, { ...options, requireInfra: false });", city_lights_source)
        self.assertNotIn("async function waitForScenarioInteractionsReady", city_lights_source)
        self.assertNotIn("async function waitForDefaultScenario", city_lights_source)
        self.assertNotIn("async function ensureScenario", city_lights_source)

        appearance_wait_caller = city_lights_source[
            city_lights_source.index("async function configureCityLights"):
            city_lights_source.index("async function setMapZoom")
        ]
        self.assertIn("await waitForVisualRenderIdle(page", appearance_wait_caller)
        self.assertNotIn("await waitForRenderIdle(page", appearance_wait_caller)

        final_visual_wait_caller = city_lights_source[
            city_lights_source.index("async function setMapZoom"):
            city_lights_source.index("async function sampleWindowLuminance")
        ]
        self.assertIn("await waitForRenderIdle(page", final_visual_wait_caller)
        self.assertNotIn("await waitForVisualRenderIdle(page", final_visual_wait_caller)

    def test_pages_public_release_gate_requires_explicit_candidate_url(self) -> None:
        package_json = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))
        scripts = package_json["scripts"]
        spec = (REPO_ROOT / "tests" / "e2e" / "release" / "pages_public_release_gate.spec.js").read_text(encoding="utf-8")
        web_server = (REPO_ROOT / "tests" / "e2e" / "support" / "playwright-web-server.js").read_text(encoding="utf-8")

        self.assertIn("test:e2e:pages-public-release-gate", scripts)
        self.assertIn("test:e2e:pages-public-release-gate:deployed", scripts)
        self.assertIn("SCENARIO_FORGE_PAGES_URL", spec)
        self.assertIn("PLAYWRIGHT_TEST_BASE_URL", spec)
        self.assertIn("process.env.SCENARIO_FORGE_PAGES_URL", web_server)
        self.assertIn("SCENARIO_FORGE_ALLOW_DEFAULT_PAGES_URL", spec)
        self.assertIn('npm_lifecycle_event === "test:e2e:pages-public-release-gate:deployed"', spec)
        self.assertIn("Set SCENARIO_FORGE_PAGES_URL or PLAYWRIGHT_TEST_BASE_URL", spec)
        self.assertIn("../support/release-smoke", spec)
        self.assertIn("runReleaseSmokePreflight", spec)
        self.assertIn("RELEASE_SMOKE_RETRY_DELAY_MS", spec)
        self.assertIn("browser.newContext()", spec)
        config_probe = """
const lifecycleEvent = process.argv[1];
if (lifecycleEvent) process.env.npm_lifecycle_event = lifecycleEvent;
else delete process.env.npm_lifecycle_event;
const config = require('./playwright.config.cjs');
const ignores = (Array.isArray(config.testIgnore) ? config.testIgnore : [config.testIgnore])
  .filter(Boolean)
  .map((entry) => String(entry));
process.stdout.write(JSON.stringify(ignores));
"""
        default_config = run_command("node", "-e", config_probe, "")
        release_config = run_command("node", "-e", config_probe, "test:e2e:pages-public-release-gate")
        deployed_config = run_command("node", "-e", config_probe, "test:e2e:pages-public-release-gate:deployed")
        self.assert_command_ok(default_config)
        self.assert_command_ok(release_config)
        self.assert_command_ok(deployed_config)
        self.assertTrue(any("release" in entry for entry in json.loads(default_config.stdout)))
        self.assertFalse(any("release" in entry for entry in json.loads(release_config.stdout)))
        self.assertFalse(any("release" in entry for entry in json.loads(deployed_config.stdout)))
        self.assertIn("issueSummary.unexpectedNetworkFailures.length > 0", spec)
        self.assertIn("originalPhase", spec)
        landing_phase_index = spec.index("await withReleaseSmokePhase(RELEASE_SMOKE_PHASES.LANDING_PREFLIGHT")
        landing_assertion_index = spec.index("await expect.poll(() => readLandingSampleDownloadState(page)", landing_phase_index)
        landing_phase_block = spec[landing_phase_index:landing_assertion_index]
        self.assertIn('await page.goto(publicUrl(""), { waitUntil: "domcontentloaded" });', landing_phase_block)
        self.assertIn('await page.waitForLoadState("networkidle", { timeout: 30000 });', landing_phase_block)
        self.assertNotIn("const landingSampleState = await readLandingSampleDownloadState(page);", landing_phase_block)

    def test_deploy_workflow_smokes_deployed_pages_url(self) -> None:
        workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text(encoding="utf-8")

        deployment_step = "uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4"
        smoke_step = "name: Smoke deployed Pages URL"
        self.assertIn(deployment_step, workflow)
        self.assertIn(smoke_step, workflow)
        self.assertGreater(workflow.index(smoke_step), workflow.index(deployment_step))
        self.assertIn("PLAYWRIGHT_BROWSERS_PATH: .runtime/browser/ms-playwright", workflow)
        self.assertIn("uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4", workflow)
        self.assertIn("uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4", workflow)
        self.assertIn("npx playwright install chromium", workflow)
        self.assertIn("SCENARIO_FORGE_PAGES_URL: ${{ steps.deployment.outputs.page_url }}", workflow)
        self.assertIn("PLAYWRIGHT_TEST_BASE_URL: ${{ steps.deployment.outputs.page_url }}", workflow)
        self.assertIn("npm run test:e2e:pages-public-release-gate", workflow)

    def test_scenario_contract_matrix_pushes_create_a_real_skip_job(self) -> None:
        workflow = (REPO_ROOT / ".github" / "workflows" / "scenario-contract-matrix.yml").read_text(encoding="utf-8")
        transport_workflow = (REPO_ROOT / ".github" / "workflows" / "transport-contract-required.yml").read_text(encoding="utf-8")

        self.assertIn("  push:", workflow)
        self.assertIn("      - main", workflow)
        self.assertIn('event_name="$GITHUB_EVENT_NAME"', workflow)
        self.assertNotIn("github.event.pull_request", workflow)
        self.assertNotIn("github.event.pull_request", transport_workflow)
        self.assertIn("GITHUB_EVENT_PATH", workflow)
        self.assertIn("GITHUB_EVENT_PATH", transport_workflow)
        self.assertIn('if [ "$event_name" = "workflow_dispatch" ]; then', workflow)
        self.assertIn('elif [ "$event_name" = "push" ]; then', workflow)
        self.assertIn('payload.get("before")', workflow)
        self.assertIn('git diff --name-only "$base_sha..$head_sha"', workflow)
        self.assertIn('cache: "pip"', workflow)
        self.assertIn("python -m pip install -r requirements-dev.lock.txt", workflow)
        self.assertIn('run: |\n          echo "Scenario contract matrix skipped:', workflow)
        self.assertIn('run: |\n          echo "Transport contract skipped:', transport_workflow)

    def test_gitignore_policy_keeps_local_state_ignored_and_templates_trackable(self) -> None:
        expectations = {
            ".env": True,
            ".env.local": True,
            ".env.example": False,
            ".env.template": False,
            ".vercel/project.json": True,
        }

        for path, should_be_ignored in expectations.items():
            with self.subTest(path=path):
                result = run_command("git", "check-ignore", "--no-index", "-q", "--", path)
                self.assertIn(result.returncode, {0, 1}, result.stderr)
                self.assertEqual(
                    should_be_ignored,
                    result.returncode == 0,
                    f"{path} ignore status drifted",
                )

    def test_console_allowlist_decay_passes_with_registered_exception(self) -> None:
        result = run_command("node", "tools/check_console_allowlist_decay.mjs")
        self.assert_command_ok(result)
        self.assertIn("Console allowlist passed with 1 entries.", result.stdout)

    def test_timeout_guardrails_pass(self) -> None:
        result = run_command("node", "tools/check_test_timeout_guardrails.mjs")
        self.assert_command_ok(result)
        self.assertIn("Test timeout guardrails passed", result.stdout)

    def test_verification_selector_routes_bootstrap_detail_promotion_changes(self) -> None:
        script = """
const { buildRecommendation } = await import('./tools/select_verification_targets.mjs');
const report = buildRecommendation(['js/bootstrap/deferred_detail_promotion.js']);
const commands = report.recommendedCommands.map((entry) => entry.commandRef);
if (!commands.includes('node tools/e2e_layering.mjs run-spec tests/e2e/startup_bundle_recovery_contract.spec.js')) {
  throw new Error(`missing startup route: ${commands.join(', ')}`);
}
if (!commands.includes('node tools/e2e_layering.mjs run-spec tests/e2e/tno_startup_visible_context_layers_contract.spec.js')) {
  throw new Error(`missing tno-startup route: ${commands.join(', ')}`);
}
if (!commands.includes('node tools/e2e_layering.mjs run-spec tests/e2e/city_label_i18n_redraw.spec.js')) {
  throw new Error(`missing city-runtime route: ${commands.join(', ')}`);
}
if (!commands.includes('python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_scenario_renderer_bridge_boundary_contract -q')) {
  throw new Error(`missing deferred-detail python contract: ${commands.join(', ')}`);
}
if (commands.some((command) => command.includes('run-domain'))) {
  throw new Error(`fallback set should stay spec-level: ${commands.join(', ')}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_adaptive_runner_discovers_workspace_only_by_default(self) -> None:
        script = """
const calls = [];
const nul = String.fromCharCode(0);
const fakeRunner = (_bin, args) => {
  calls.push(args.join(' '));
  const joined = args.join(' ');
  if (joined.includes('diff --name-only --diff-filter=ACMRD -z')) {
    return { status: 0, stdout: ['js/ui/sidebar.js', ''].join(nul) };
  }
  if (joined.includes('diff --name-only --cached --diff-filter=ACMRD -z')) {
    return { status: 0, stdout: ['tests/test_startup_shell.py', ''].join(nul) };
  }
  if (joined.includes('ls-files --others --exclude-standard -z')) {
    return { status: 0, stdout: ['tools/run_adaptive_tests.mjs', ''].join(nul) };
  }
  return { status: 0, stdout: ['SHOULD_NOT_APPEAR', ''].join(nul) };
};
const { discoverChangedFiles } = await import('./tools/run_adaptive_tests.mjs');
const files = discoverChangedFiles({ runner: fakeRunner });
if (calls.some((entry) => entry.includes('origin/main...HEAD') || entry.includes('HEAD^'))) {
  throw new Error(`history-based discovery should stay disabled by default: ${calls.join(' | ')}`);
}
if (files.join(',') !== 'js/ui/sidebar.js,tests/test_startup_shell.py,tools/run_adaptive_tests.mjs') {
  throw new Error(`unexpected discovered files: ${files.join(',')}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_adaptive_runner_import_has_no_top_level_side_effects(self) -> None:
        script = """
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-runner-import-'));
const jsonOut = path.join(tempRoot, '.runtime', 'reports', 'generated', 'test-adaptive-selection.json');
const mdOut = path.join(tempRoot, '.runtime', 'reports', 'generated', 'test-adaptive-selection.md');
process.chdir(tempRoot);
await import(pathToFileURL(path.join(repoRoot, 'tools', 'run_adaptive_tests.mjs')).href);
if (fs.existsSync(jsonOut) || fs.existsSync(mdOut)) {
  throw new Error(`import should stay side-effect free: ${jsonOut}, ${mdOut}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)
        self.assertEqual(result.stdout.strip(), "")
        self.assertEqual(result.stderr.strip(), "")

    def test_adaptive_runner_history_discovery_includes_deleted_files(self) -> None:
        script = """
const calls = [];
const fakeRunner = (_bin, args) => {
  calls.push(args.join(' '));
  return { status: 0, stdout: '' };
};
const { discoverChangedFiles } = await import('./tools/run_adaptive_tests.mjs');
discoverChangedFiles({ runner: fakeRunner, includeBranchHistory: true });
const requiredCalls = [
  'diff --name-only origin/main...HEAD --diff-filter=ACMRD -z',
];
for (const expected of requiredCalls) {
  if (!calls.some((entry) => entry.includes(expected))) {
    throw new Error(`missing history diff-filter call ${expected}: ${calls.join(' | ')}`);
  }
}
if (calls.some((entry) => entry.includes('HEAD^ HEAD'))) {
  throw new Error(`branch history must not shrink to the latest commit: ${calls.join(' | ')}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_adaptive_runner_accepts_an_exact_history_base(self) -> None:
        script = """
const calls = [];
const fakeRunner = (_bin, args) => {
  calls.push(args.join(' '));
  return { status: 0, stdout: '' };
};
const { discoverChangedFiles } = await import('./tools/run_adaptive_tests.mjs');
discoverChangedFiles({ runner: fakeRunner, historyBase: 'HEAD^' });
const exactCall = 'diff --name-only HEAD^ HEAD --diff-filter=ACMRD -z';
if (!calls.some((entry) => entry.includes(exactCall))) {
  throw new Error(`missing exact phase-boundary call ${exactCall}: ${calls.join(' | ')}`);
}
if (calls.some((entry) => entry.includes('origin/main...HEAD'))) {
  throw new Error(`exact phase boundary must exclude broad branch history: ${calls.join(' | ')}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_adaptive_runner_normalizes_nul_delimited_git_paths(self) -> None:
        script = """
const { parseGitPathOutput } = await import('./tools/run_adaptive_tests.mjs');
const files = parseGitPathOutput('js/ui/sidebar.js\\0\\"tests/e2e/dev/tno_ready_state_contract.dev.spec.js\\"\\0\\0');
if (files.length !== 2) {
  throw new Error(`expected 2 files, got ${files.length}`);
}
if (files[0] !== 'js/ui/sidebar.js' || files[1] !== 'tests/e2e/dev/tno_ready_state_contract.dev.spec.js') {
  throw new Error(`unexpected normalized files: ${files.join(',')}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_adaptive_runner_uses_project_python_wrapper_on_windows(self) -> None:
        script = """
import process from 'node:process';
const { commandToProcess } = await import('./tools/run_adaptive_tests.mjs');
const cases = [
  {
    commandRef: 'python -m unittest tests.test_e2e_structural_tooling -q',
    args: ['-m', 'unittest', 'tests.test_e2e_structural_tooling', '-q'],
  },
  {
    commandRef: 'python tools/check_state_writer_policy.py --report "C:/Temp Path/report.json"',
    args: ['tools/check_state_writer_policy.py', '--report', 'C:/Temp Path/report.json'],
  },
  {
    commandRef: 'python -m pytest "tests/path with spaces.py" -q',
    args: ['-m', 'pytest', 'tests/path with spaces.py', '-q'],
  },
];
for (const testCase of cases) {
  const windowsCommand = commandToProcess(testCase.commandRef, 'win32');
  const expectedWindowsCommand = {
    bin: process.execPath,
    args: ['tools/run_python.mjs', ...testCase.args],
  };
  if (JSON.stringify(windowsCommand) !== JSON.stringify(expectedWindowsCommand)) {
    throw new Error(`unexpected Windows Python command: ${JSON.stringify(windowsCommand)}`);
  }
  const linuxCommand = commandToProcess(testCase.commandRef, 'linux');
  if (JSON.stringify(linuxCommand) !== JSON.stringify({ bin: 'python', args: testCase.args })) {
    throw new Error(`unexpected Linux Python command: ${JSON.stringify(linuxCommand)}`);
  }
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_adaptive_execute_plan_blocks_main_thread_by_default(self) -> None:
        script = """
const { buildExecutionPlan } = await import('./tools/run_adaptive_tests.mjs');
const tnoWaterCommand = 'python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_report.json';
const report = {
  childAgentStaticTasks: [{ commandRef: 'verify:test:e2e-layers' }],
  mainThreadSerialVerification: [{ commandRef: tnoWaterCommand }],
};
const plan = buildExecutionPlan(report, { includeMainThread: false });
if (plan.commandsToRun.join(',') !== 'verify:test:e2e-layers') {
  throw new Error(`unexpected runnable commands: ${plan.commandsToRun.join(',')}`);
}
if (plan.blockedMainThreadCommands.join(',') !== tnoWaterCommand) {
  throw new Error(`main-thread command should stay blocked by default: ${plan.blockedMainThreadCommands.join(',')}`);
}
const mainThreadPlan = buildExecutionPlan(report, { includeMainThread: true });
if (!mainThreadPlan.commandsToRun.includes(tnoWaterCommand) || mainThreadPlan.blockedMainThreadCommands.length !== 0) {
  throw new Error(`includeMainThread should run the reserved command: ${JSON.stringify(mainThreadPlan)}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_adaptive_execute_blocks_unmatched_files_before_running_commands(self) -> None:
        result = run_command(
            "node",
            "tools/run_adaptive_tests.mjs",
            "--execute",
            "--changed-file",
            "tools/ai_test_supervisor/supervise_adaptive_verification.mjs",
            "--changed-file",
            "docs/active/unrelated-task/context.md",
            "--json-out",
            ".runtime/reports/generated/test-adaptive-unmatched-execute.json",
            "--md-out",
            ".runtime/reports/generated/test-adaptive-unmatched-execute.md",
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unmatched changed files", result.stderr)
        payload = json.loads((REPO_ROOT / ".runtime/reports/generated/test-adaptive-unmatched-execute.json").read_text(encoding="utf-8"))
        self.assertIn("docs/active/unrelated-task/context.md", payload["unmatchedChangedFiles"])
        self.assertIsNone(payload["executionResults"])

    def test_adaptive_execute_can_defer_main_thread_routes_with_evidence(self) -> None:
        json_out = TMP_ROOT / "test-adaptive-deferred-main-thread.json"
        md_out = TMP_ROOT / "test-adaptive-deferred-main-thread.md"
        result = run_command(
            "node",
            "tools/run_adaptive_tests.mjs",
            "--execute",
            "--defer-main-thread",
            "--changed-file",
            "tests/e2e/sample_guide_deeplink.spec.js",
            "--json-out",
            str(json_out),
            "--md-out",
            str(md_out),
        )
        self.assert_command_ok(result)
        payload = json.loads(json_out.read_text(encoding="utf-8"))
        self.assertEqual(payload["mainThreadDisposition"], "deferred")
        self.assertIn(
            "verify:demo",
            payload["executionPlan"]["blockedMainThreadCommands"],
        )
        self.assertTrue(payload["executionResults"])
        self.assertTrue(all(entry["exitCode"] == 0 for entry in payload["executionResults"]))
        self.assertIn("mainThreadDisposition: deferred", md_out.read_text(encoding="utf-8"))

    def test_route_registry_includes_every_package_test_node_script(self) -> None:
        script = """
import fs from 'node:fs';
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const expectedScripts = Object.keys(packageJson.scripts).filter((name) => name.startsWith('test:node:')).sort();
const { buildRouteIndex } = await import('./tools/test_route_registry.mjs');
const routes = buildRouteIndex();
const nodeRoutes = routes.filter((route) => route.id.startsWith('node:'));
const actualScripts = nodeRoutes.map((route) => route.commandRef).sort();
const missing = expectedScripts.filter((name) => !actualScripts.includes(name));
if (missing.length) {
  throw new Error(`missing node routes: ${missing.join(', ')}`);
}
const fullP4PolicyRoute = nodeRoutes.find((route) => route.commandRef === 'test:node:p4:state-writer-policy');
if (
  !fullP4PolicyRoute
  || fullP4PolicyRoute.executionOwner !== 'main-thread'
  || fullP4PolicyRoute.cost !== 'heavy'
  || fullP4PolicyRoute.ciProfile !== 'full'
  || !fullP4PolicyRoute.resourceLocks.includes('.runtime-output')
) {
  throw new Error(`full P4 policy route must preserve its serialized lane: ${JSON.stringify(fullP4PolicyRoute)}`);
}
const prNodeRoutes = nodeRoutes.filter((route) => route !== fullP4PolicyRoute);
if (prNodeRoutes.some((route) => route.executionOwner !== 'child-safe' || route.resourceLocks.length > 0 || route.ciProfile !== 'pr-fast')) {
  throw new Error('focused node routes must stay child-safe, lock-free, and pr-fast');
}
const observabilityRoute = routes.find((route) => route.id === 'infra:playwright-observability');
if (!observabilityRoute) {
  throw new Error('missing playwright observability route');
}
for (const sourceRef of ['tests/e2e/support/fixtures.js', 'tests/e2e/support/playwright-app.js', 'tests/e2e/support/reporters']) {
  if (!observabilityRoute.sourceRef.includes(sourceRef)) {
    throw new Error(`observability route must cover ${sourceRef}: ${observabilityRoute.sourceRef}`);
  }
}
const tnoWaterRoute = routes.find((route) => route.id === 'infra:tno-water-validator');
if (!tnoWaterRoute) {
  throw new Error('missing TNO water validator route');
}
if (tnoWaterRoute.domain !== 'tno-water' || tnoWaterRoute.executionOwner !== 'main-thread' || tnoWaterRoute.cost !== 'heavy') {
  throw new Error(`unexpected TNO water route metadata: ${JSON.stringify(tnoWaterRoute)}`);
}
for (const lock of ['heavy-geo', 'scenario-data', '.runtime-output']) {
  if (!tnoWaterRoute.resourceLocks.includes(lock)) {
    throw new Error(`TNO water route missing lock ${lock}: ${tnoWaterRoute.resourceLocks.join(',')}`);
  }
}
if (!tnoWaterRoute.guidance?.ownerFiles?.includes('tools/validate_tno_water_geometries.py')) {
  throw new Error(`TNO water route must expose owner-file guidance: ${JSON.stringify(tnoWaterRoute.guidance)}`);
}
for (const [routeId, commandRef] of [
  ['infra:tno-coverage-ledger', 'verify:tno-coverage-ledger'],
  ['infra:tno-atlantropa-coverage', 'verify:tno-atlantropa-coverage'],
  ['infra:tno-polar-coverage', 'verify:tno-polar-coverage'],
  ['infra:tno-coverage-chain', 'verify:tno-coverage-chain'],
]) {
  const route = routes.find((candidate) => candidate.id === routeId);
  if (!route || route.commandRef !== commandRef || route.executionOwner !== 'main-thread') {
    throw new Error(`missing or invalid TNO coverage route ${routeId}: ${JSON.stringify(route)}`);
  }
}
const transportRoute = routes.find((route) => route.id === 'infra:transport-manifest-contracts');
if (!transportRoute || transportRoute.executionOwner !== 'child-safe' || transportRoute.resourceLocks.length !== 0) {
  throw new Error(`transport manifest route must stay child-safe and lock-free: ${JSON.stringify(transportRoute)}`);
}
const dataHealthRoute = routes.find((route) => route.id === 'infra:data-health');
if (!dataHealthRoute || dataHealthRoute.executionOwner !== 'child-safe' || dataHealthRoute.resourceLocks.length !== 0) {
  throw new Error(`data health route must stay child-safe and lock-free: ${JSON.stringify(dataHealthRoute)}`);
}
const browserSmokeRoute = routes.find((route) => route.id === 'infra:browser-smoke-static-contract');
if (
  !browserSmokeRoute
  || browserSmokeRoute.domain !== 'browser-smoke'
  || browserSmokeRoute.executionOwner !== 'child-safe'
  || browserSmokeRoute.resourceLocks.length !== 0
  || browserSmokeRoute.cost !== 'fast'
) {
  throw new Error(`browser smoke route must stay static, child-safe, and lock-free: ${JSON.stringify(browserSmokeRoute)}`);
}
for (const sourceRef of ['ops/browser-mcp/run-smoke-browser-inspection.sh', 'ops/browser-mcp/inspection-profile.toml', 'ops/browser-mcp/inspection-profile.schema.md', 'tools/browser_smoke_profile_contract.py']) {
  if (!browserSmokeRoute.sourceRef.includes(sourceRef)) {
    throw new Error(`browser smoke route must cover ${sourceRef}: ${browserSmokeRoute.sourceRef}`);
  }
}
const releaseSmokeHelperRoute = routes.find((route) => route.id === 'node:test:node:release-smoke-helper');
if (
  !releaseSmokeHelperRoute
  || releaseSmokeHelperRoute.domain !== 'release-smoke'
  || releaseSmokeHelperRoute.ownerHint !== 'release-smoke'
  || releaseSmokeHelperRoute.executionOwner !== 'child-safe'
  || releaseSmokeHelperRoute.resourceLocks.length !== 0
  || releaseSmokeHelperRoute.ciProfile !== 'pr-fast'
) {
  throw new Error(`release smoke helper route must stay child-safe and release-scoped: ${JSON.stringify(releaseSmokeHelperRoute)}`);
}
for (const sourceRef of ['tests/release_smoke_retry_behavior.node.test.mjs', 'tests/e2e/support/release-smoke.js']) {
  if (!releaseSmokeHelperRoute.sourceRef.includes(sourceRef)) {
    throw new Error(`release smoke helper route must cover ${sourceRef}: ${releaseSmokeHelperRoute.sourceRef}`);
  }
}
const releaseGateRoute = routes.find((route) => route.id === 'direct-e2e:test:e2e:pages-public-release-gate');
if (
  !releaseGateRoute
  || releaseGateRoute.commandRef !== 'test:e2e:pages-public-release-gate'
  || releaseGateRoute.sourceRef !== 'tests/e2e/release/pages_public_release_gate.spec.js'
  || releaseGateRoute.domain !== 'release-smoke'
  || releaseGateRoute.ownerHint !== 'deploy-runtime'
  || releaseGateRoute.executionOwner !== 'main-thread'
  || releaseGateRoute.ciProfile !== 'deploy-minimal'
) {
  throw new Error(`release gate route must be explicit and main-thread owned: ${JSON.stringify(releaseGateRoute)}`);
}
for (const lock of ['browser-dev-server', 'playwright-browser', '.runtime-output']) {
  if (!releaseGateRoute.resourceLocks.includes(lock)) {
    throw new Error(`release gate route missing lock ${lock}: ${releaseGateRoute.resourceLocks.join(',')}`);
  }
}
const transportWorkbenchControllerRoute = routes.find((route) => route.id === 'node:test:node:transport-workbench-controller');
if (!transportWorkbenchControllerRoute) {
  throw new Error('missing transport workbench aggregate node route');
}
for (const sourceRef of ['tests/transport_workbench_event_owner_behavior.test.mjs', 'tests/transport_workbench_shell_owner_behavior.test.mjs']) {
  if (!transportWorkbenchControllerRoute.sourceRef.includes(sourceRef)) {
    throw new Error(`aggregate node route must expand ${sourceRef}: ${transportWorkbenchControllerRoute.sourceRef}`);
  }
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_route_registry_rejects_invalid_guidance_shape(self) -> None:
        script = """
const { validateRoute } = await import('./tools/test_route_registry.mjs');
const baseRoute = {
  id: 'test:bad-guidance',
  commandRef: 'python tools/data_health.py --json',
  sourceRef: 'tools/data_health.py',
  domain: 'test-routing',
  ownerHint: 'test-infra',
  layer: 'contract',
  cost: 'contract',
  resourceLocks: [],
  executionOwner: 'child-safe',
  ciProfile: 'pr-fast',
  guidance: { ownerFiles: 'tools/data_health.py' },
};
let rejected = false;
try {
  validateRoute(baseRoute);
} catch (error) {
  rejected = String(error.message).includes('guidance.ownerFiles');
}
if (!rejected) {
  throw new Error('route guidance ownerFiles must reject non-array values');
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_node_route_registry_expands_common_npm_run_forms(self) -> None:
        script = """
const { buildNodeRoutes } = await import('./tools/test_route_registry.mjs');
const packageJson = {
  scripts: {
    'test:node:aggregate': 'npm run -s test:node:first && npm run-script --if-present test:node:second -- --grep owner',
    'test:node:first': 'node --test tests/transport_workbench_event_owner_behavior.test.mjs',
    'test:node:second': 'node --test tests/transport_workbench_shell_owner_behavior.test.mjs',
  },
};
const route = buildNodeRoutes(packageJson).find((candidate) => candidate.id === 'node:test:node:aggregate');
if (!route) {
  throw new Error('missing aggregate route');
}
for (const sourceRef of ['tests/transport_workbench_event_owner_behavior.test.mjs', 'tests/transport_workbench_shell_owner_behavior.test.mjs']) {
  if (!route.sourceRef.includes(sourceRef)) {
    throw new Error(`aggregate route must expand ${sourceRef}: ${route.sourceRef}`);
  }
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_e2e_routes_are_spec_level_and_unique(self) -> None:
        script = """
const { buildE2eRoutes } = await import('./tools/test_route_registry.mjs');
const routes = buildE2eRoutes();
const commandRefs = routes.map((route) => route.commandRef);
const sourceRefs = routes.map((route) => route.sourceRef);
if (new Set(commandRefs).size !== commandRefs.length) {
  throw new Error('E2E commandRef values must stay unique at spec granularity');
}
if (new Set(sourceRefs).size !== sourceRefs.length) {
  throw new Error('E2E sourceRef values must stay unique at spec granularity');
}
for (const route of routes) {
  const expected = route.ciProfile === 'demo'
    ? 'verify:demo'
    : `node tools/e2e_layering.mjs run-spec ${route.sourceRef}`;
  if (route.commandRef !== expected) {
    throw new Error(`unexpected spec command for ${route.sourceRef}: ${route.commandRef}`);
  }
}
const cityRuntimeCount = routes.filter((route) => route.domain === 'city-runtime').length;
if (cityRuntimeCount !== 6) {
  throw new Error(`expected 6 city-runtime spec routes, got ${cityRuntimeCount}`);
}
const demoRoutes = routes.filter((route) => route.ciProfile === 'demo');
if (demoRoutes.length !== 1 || demoRoutes[0].sourceRef !== 'tests/e2e/sample_guide_deeplink.spec.js') {
  throw new Error(`canonical Demo profile must select only the Golden Demo route: ${JSON.stringify(demoRoutes)}`);
}
if (demoRoutes[0].commandRef !== 'verify:demo') {
  throw new Error(`Golden Demo route must be consumed by the canonical Demo entrypoint: ${JSON.stringify(demoRoutes[0])}`);
}
if (demoRoutes[0].executionOwner !== 'main-thread' || !demoRoutes[0].resourceLocks.includes('playwright-browser')) {
  throw new Error(`Golden Demo route must preserve main-thread browser ownership: ${JSON.stringify(demoRoutes[0])}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_verification_selector_routes_test_infra_owner_files(self) -> None:
        script = """
const { buildRecommendation } = await import('./tools/select_verification_targets.mjs');
for (const filePath of ['tools/select_verification_targets.mjs', 'tools/test_route_registry.mjs']) {
  const report = buildRecommendation([filePath]);
  const commands = report.recommendedCommands.map((entry) => entry.commandRef);
  if (!commands.includes('python -m unittest tests.test_e2e_structural_tooling -q')) {
    throw new Error(`missing structural tooling route for ${filePath}: ${commands.join(', ')}`);
  }
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_verification_selector_routes_backend_cloud_support_files(self) -> None:
        script = """
const { buildRecommendation } = await import('./tools/select_verification_targets.mjs');
const expectedCommands = ['test:node:backend-cloud-support', 'test:py:backend-cloud-support'];
for (const filePath of ['map_backend/routes.py', 'js/api/backend_client.js', 'js/ui/sidebar/project_support_diagnostics_controller.js']) {
  const report = buildRecommendation([filePath]);
  const commands = report.recommendedCommands.map((entry) => entry.commandRef);
  for (const expectedCommand of expectedCommands) {
    if (!commands.includes(expectedCommand)) {
      throw new Error(`missing ${expectedCommand} route for ${filePath}: ${commands.join(', ')}`);
    }
  }
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_verification_selector_golden_cases_for_adaptive_routing(self) -> None:
        script = """
const { buildRecommendation } = await import('./tools/select_verification_targets.mjs');

const cases = [
  {
    name: 'selector tooling routes to structural contract and selector check',
    changedFiles: ['tools/select_verification_targets.mjs'],
    expectedCommands: [
      'python -m unittest tests.test_e2e_structural_tooling -q',
      'node tools/select_verification_targets.mjs --check',
    ],
  },
  {
    name: 'route registry changes route to structural contract and selector check',
    changedFiles: ['tools/test_route_registry.mjs'],
    expectedCommands: [
      'python -m unittest tests.test_e2e_structural_tooling -q',
      'node tools/select_verification_targets.mjs --check',
    ],
  },
  {
    name: 'gitignore policy changes route to selector contract',
    changedFiles: ['.gitignore'],
    expectedCommands: [
      'python -m unittest tests.test_e2e_structural_tooling -q',
      'node tools/select_verification_targets.mjs --check',
    ],
    exactCommands: [
      'python -m unittest tests.test_e2e_structural_tooling -q',
      'node tools/select_verification_targets.mjs --check',
    ],
    exactExecutionOwners: ['child-safe'],
    exactResourceLocks: [],
    exactMainThreadCommands: [],
    expectedUnmatched: [],
  },
  {
    name: 'perf gate workflow routes to its contract without claiming a live runtime delta',
    changedFiles: ['.github/workflows/perf-pr-gate.yml'],
    expectedCommands: ['verify:perf-gate-contract'],
    exactCommands: ['verify:perf-gate-contract'],
    exactExecutionOwners: ['child-safe'],
    exactResourceLocks: [],
    exactMainThreadCommands: [],
    expectedUnmatched: [],
  },
  {
    name: 'package metadata routes to dev e2e scripts and guardrails',
    changedFiles: ['package.json'],
    expectedCommands: [
      'test:e2e:dev:tno-ready-state',
      'test:e2e:dev:scenario-chunk-runtime',
      'verify:test-timeout-guardrails',
      'verify:perf-gate-contract',
    ],
  },
  {
    name: 'browser smoke tooling routes to static contract',
    changedFiles: [
      'ops/browser-mcp/run-smoke-browser-inspection.sh',
      'ops/browser-mcp/inspection-profile.toml',
      'ops/browser-mcp/inspection-profile.schema.md',
      'tools/browser_smoke_profile_contract.py',
    ],
    expectedCommands: ['python -m unittest tests.test_playwright_app_ready_gate_contract -q'],
    exactCommands: ['python -m unittest tests.test_playwright_app_ready_gate_contract -q'],
    forbiddenCommands: [
      'perf:gate',
      'verify:perf-gate-contract',
      'python -m unittest tests.test_perf_gate_contract -q',
    ],
    exactExecutionOwners: ['child-safe'],
    exactResourceLocks: [],
    exactMainThreadCommands: [],
  },
  {
    name: 'playwright fixtures route to observability contract and city runtime specs',
    changedFiles: ['tests/e2e/support/fixtures.js'],
    expectedCommands: [
      'python -m unittest tests.test_e2e_structural_tooling -q',
      'node tools/e2e_layering.mjs run-spec tests/e2e/city_label_i18n_redraw.spec.js',
    ],
  },
  {
    name: 'dev tno ready spec routes to direct dev script',
    changedFiles: ['tests/e2e/dev/tno_ready_state_contract.dev.spec.js'],
    expectedCommands: ['test:e2e:dev:tno-ready-state'],
  },
  {
    name: 'startup hydration behavior routes to node behavior test',
    changedFiles: ['js/core/scenario/startup_hydration.js'],
    expectedCommands: ['test:node:startup-hydration-behavior'],
  },
  {
    name: 'scenario lifecycle behavior routes to node behavior test',
    changedFiles: ['js/core/scenario/lifecycle_runtime.js'],
    expectedCommands: ['test:node:scenario-lifecycle-runtime-behavior'],
  },
  {
    name: 'tno water data routes to serial validator with locks',
    changedFiles: ['data/scenarios/tno_1962/water_regions.geojson'],
    expectedCommands: [
      'python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_report.json',
    ],
    expectedExecutionOwners: ['main-thread'],
    expectedResourceLocks: ['heavy-geo', 'scenario-data', '.runtime-output'],
  },
  {
    name: 'backend route changes select node and python cloud support checks',
    changedFiles: ['map_backend/routes.py'],
    expectedCommands: ['test:node:backend-cloud-support', 'test:py:backend-cloud-support'],
  },
  {
    name: 'thematic builder and contracts route to thematic contract suite',
    changedFiles: [
      'tools/build_thematic_layers.py',
      'map_builder/thematic_layer_contracts.py',
      'map_builder/thematic_wgi_ingest.py',
      'data/thematic_layers/index.json',
      'tests/test_thematic_layer_contracts.py',
      'tests/test_thematic_wgi_source_ingest.py',
    ],
    expectedCommands: ['test:py:thematic-layer-contracts'],
    expectedExecutionOwners: ['child-safe'],
    expectedResourceLocks: [],
  },
  {
    name: 'pytest style tno water file routes through pytest',
    changedFiles: ['tests/test_tno_water_geometries.py'],
    expectedCommands: ['python -m pytest tests/test_tno_water_geometries.py -q'],
    forbiddenCommands: ['python -m unittest tests.test_tno_water_geometries -q'],
  },
];

for (const testCase of cases) {
  const report = buildRecommendation(testCase.changedFiles);
  const commands = report.recommendedCommands.map((entry) => entry.commandRef);
  for (const expectedCommand of testCase.expectedCommands) {
    if (!commands.includes(expectedCommand)) {
      throw new Error(`${testCase.name}: missing ${expectedCommand}; got ${commands.join(', ')}`);
    }
  }
  for (const forbiddenCommand of testCase.forbiddenCommands || []) {
    if (commands.includes(forbiddenCommand)) {
      throw new Error(`${testCase.name}: saw forbidden ${forbiddenCommand}; got ${commands.join(', ')}`);
    }
  }
  if (testCase.exactCommands) {
    const expected = [...testCase.exactCommands].sort();
    const actual = [...commands].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${testCase.name}: expected exact commands ${expected.join(', ')}; got ${actual.join(', ')}`);
    }
  }
  for (const expectedOwner of testCase.expectedExecutionOwners || []) {
    if (!report.executionOwners.includes(expectedOwner)) {
      throw new Error(`${testCase.name}: missing owner ${expectedOwner}; got ${report.executionOwners.join(', ')}`);
    }
  }
  for (const expectedLock of testCase.expectedResourceLocks || []) {
    if (!report.resourceLocks.includes(expectedLock)) {
      throw new Error(`${testCase.name}: missing lock ${expectedLock}; got ${report.resourceLocks.join(', ')}`);
    }
  }
  if (testCase.exactExecutionOwners) {
    const expected = [...testCase.exactExecutionOwners].sort();
    const actual = [...report.executionOwners].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${testCase.name}: expected exact owners ${expected.join(', ')}; got ${actual.join(', ')}`);
    }
  }
  if (testCase.exactResourceLocks) {
    const expected = [...testCase.exactResourceLocks].sort();
    const actual = [...report.resourceLocks].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${testCase.name}: expected exact locks ${expected.join(', ')}; got ${actual.join(', ')}`);
    }
  }
  if (testCase.exactMainThreadCommands) {
    const expected = [...testCase.exactMainThreadCommands].sort();
    const actual = report.mainThreadSerialVerification.map((entry) => entry.commandRef).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${testCase.name}: expected exact main-thread commands ${expected.join(', ')}; got ${actual.join(', ')}`);
    }
  }
  if (testCase.expectedUnmatched) {
    const expected = [...testCase.expectedUnmatched].sort();
    const actual = [...report.unmatchedChangedFiles].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${testCase.name}: expected unmatched ${expected.join(', ')}; got ${actual.join(', ')}`);
    }
  }
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_verification_selector_routes_tno_water_health_gate(self) -> None:
        script = """
const { buildRecommendation } = await import('./tools/select_verification_targets.mjs');
const tnoWaterCommand = 'python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_report.json';
const report = buildRecommendation(['data/scenarios/tno_1962/water_regions.geojson']);
const commands = report.recommendedCommands.map((entry) => entry.commandRef);
if (!commands.includes(tnoWaterCommand)) {
  throw new Error(`missing TNO water validator command: ${commands.join(', ')}`);
}
const mainThreadEntry = report.mainThreadSerialVerification.find((entry) => entry.commandRef === tnoWaterCommand);
if (!mainThreadEntry) {
  throw new Error(`TNO water validator must be main-thread serial: ${JSON.stringify(report.mainThreadSerialVerification)}`);
}
for (const lock of ['heavy-geo', 'scenario-data', '.runtime-output']) {
  if (!mainThreadEntry.resourceLocks.includes(lock)) {
    throw new Error(`TNO water validator missing lock ${lock}: ${mainThreadEntry.resourceLocks.join(',')}`);
  }
}
const diagnostic = report.diagnosticNextSteps.find((entry) => entry.commandRef === tnoWaterCommand);
if (!diagnostic || !diagnostic.guidance.ownerFiles.includes('tools/validate_tno_water_geometries.py')) {
  throw new Error(`TNO water diagnostic guidance missing: ${JSON.stringify(report.diagnosticNextSteps)}`);
}
if (!report.advisoryNotes.some((note) => note.includes('main-thread serial ownership'))) {
  throw new Error(`missing main-thread advisory note: ${report.advisoryNotes.join(' | ')}`);
}
const testReport = buildRecommendation(['tests/test_tno_water_geometries.py']);
const testCommands = testReport.recommendedCommands.map((entry) => entry.commandRef);
if (!testCommands.includes('python -m pytest tests/test_tno_water_geometries.py -q')) {
  throw new Error(`pytest-style TNO water test must use pytest: ${testCommands.join(', ')}`);
}
if (testCommands.includes('python -m unittest tests.test_tno_water_geometries -q')) {
  throw new Error(`pytest-style TNO water test must not use unittest: ${testCommands.join(', ')}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_verification_selector_routes_targeted_node_behavior_files(self) -> None:
        script = """
const { buildRecommendation } = await import('./tools/select_verification_targets.mjs');
const startupReport = buildRecommendation(['js/core/scenario/startup_hydration.js']);
const startupCommands = startupReport.recommendedCommands.map((entry) => entry.commandRef);
if (!startupCommands.includes('test:node:startup-hydration-behavior')) {
  throw new Error(`missing startup hydration node behavior route: ${startupCommands.join(', ')}`);
}
const lifecycleReport = buildRecommendation(['js/core/scenario/lifecycle_runtime.js']);
const lifecycleCommands = lifecycleReport.recommendedCommands.map((entry) => entry.commandRef);
if (!lifecycleCommands.includes('test:node:scenario-lifecycle-runtime-behavior')) {
  throw new Error(`missing scenario lifecycle node behavior route: ${lifecycleCommands.join(', ')}`);
}
const sampleGuideReport = buildRecommendation(['js/core/sample_project_import_workflow.js']);
const sampleGuideCommands = sampleGuideReport.recommendedCommands.map((entry) => entry.commandRef);
if (!sampleGuideCommands.includes('test:node:sample-project-contracts')) {
  throw new Error(`missing sample project node contract route: ${sampleGuideCommands.join(', ')}`);
}
if (!sampleGuideCommands.includes('verify:demo')) {
  throw new Error(`missing sample guide E2E route: ${sampleGuideCommands.join(', ')}`);
}
const goldenDemoCommand = sampleGuideReport.recommendedCommands.find(
  (entry) => entry.commandRef === 'verify:demo',
);
if (!goldenDemoCommand?.ciProfiles.includes('demo')) {
  throw new Error(`sample guide E2E route must use the canonical Demo profile: ${JSON.stringify(goldenDemoCommand)}`);
}
const sampleAssetReport = buildRecommendation(['landing/assets/sample-runs.json']);
const sampleAssetCommands = sampleAssetReport.recommendedCommands.map((entry) => entry.commandRef);
if (!sampleAssetCommands.includes('test:node:sample-project-contracts')) {
  throw new Error(`missing sample asset node contract route: ${sampleAssetCommands.join(', ')}`);
}
"""
        result = run_command("node", "--input-type=module", "-e", script)
        self.assert_command_ok(result)

    def test_verification_selector_routes_pages_dist_mirrors_to_pages_dist_gate(self) -> None:
        script = """
const { buildRecommendation } = await import('./tools/select_verification_targets.mjs');
const report = buildRecommendation([
  'dist/app/js/core/map_renderer/hit_canvas_scheduling_owner.js',
  'dist/app/css/style.css',
  'dist/pages-dist-manifest.json',
]);
const commands = report.recommendedCommands.map((entry) => entry.commandRef);
if (!commands.includes('verify:pages-dist-and-drift')) {
  throw new Error(`missing Pages dist verification route: ${commands.join(', ')}`);
}
if (report.unmatchedChangedFiles.length) {
  throw new Error(`Pages dist mirror files should be matched: ${report.unmatchedChangedFiles.join(', ')}`);
}
const mainThreadEntry = report.mainThreadSerialVerification.find((entry) => entry.commandRef === 'verify:pages-dist-and-drift');
if (!mainThreadEntry) {
  throw new Error(`Pages dist verification must be main-thread serial: ${JSON.stringify(report.mainThreadSerialVerification)}`);
}
for (const lock of ['dist', '.runtime-output']) {
  if (!mainThreadEntry.resourceLocks.includes(lock)) {
    throw new Error(`Pages dist verification missing lock ${lock}: ${mainThreadEntry.resourceLocks.join(',')}`);
  }
}
const sourceReport = buildRecommendation([
  'js/core/map_renderer.js',
  'js/core/map_renderer/render_pass_cache_host_owner.js',
]);
const sourceCommands = sourceReport.recommendedCommands.map((entry) => entry.commandRef);
if (!sourceCommands.includes('verify:pages-dist-and-drift')) {
  throw new Error(`missing Pages dist source mirror route: ${sourceCommands.join(', ')}`);
}
for (const filePath of ['js/core/map_renderer.js', 'js/core/map_renderer/render_pass_cache_host_owner.js']) {
  if (sourceReport.unmatchedChangedFiles.includes(filePath)) {
    throw new Error(`Pages dist source mirror file should be matched: ${filePath}`);
  }
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

    def test_shared_city_worker_fixture_has_dedicated_boot_timeout(self) -> None:
        source = (REPO_ROOT / "tests" / "e2e" / "support" / "fixtures.js").read_text(encoding="utf-8")
        fixture_start = source.index("sharedCityBootHarness:")
        fixture_end = source.index("\n  page: async", fixture_start)
        fixture_source = source[fixture_start:fixture_end]
        self.assertIn("const SHARED_CITY_BOOT_TIMEOUT_MS = 150_000;", source)
        self.assertIn('}, { scope: "worker", timeout: SHARED_CITY_BOOT_TIMEOUT_MS }]', fixture_source)
        self.assertIn("waitForAppInteractive(page, { timeout: 120_000 });", fixture_source)
        self.assertIn("waitForShellReady(page, { timeout: 120_000 });", fixture_source)

    def test_city_label_i18n_redraw_has_coherent_budget_and_cjk_sample(self) -> None:
        source = (REPO_ROOT / "tests" / "e2e" / "city_label_i18n_redraw.spec.js").read_text(encoding="utf-8")
        stable_wait_start = source.index("async function waitForStableExactRender")
        stable_wait_end = source.index("\n}\n", stable_wait_start)
        stable_wait_source = source[stable_wait_start:stable_wait_end]
        self.assertIn("test.setTimeout(240_000);", source)
        self.assertIn(r'const ZH_LABEL = "\u6d4b\u8bd5\u57ce";', source)
        self.assertIn("}, undefined, { timeout });", stable_wait_source)
        self.assertIn("async function clearCityLabelDrawLog(page)", source)
        self.assertIn("async function waitForLabelDraw(page, label)", source)
        self.assertIn("globalThis.__resetE2ECityLabelDraws?.();", source)
        self.assertIn("globalThis.__e2eCityLabelDraws", source)

    def test_shared_city_fixtures_restore_runtime_snapshots_on_reset(self) -> None:
        source = (REPO_ROOT / "tests" / "e2e" / "support" / "fixtures.js").read_text(encoding="utf-8")
        reset_call = """await resetSharedCityRuntimeState(page, {
      storageKeys,
      timeout: resetTimeout,
      requireInfraIdle: sharedCityRequireInfraIdle,
    });"""
        self.assertIn("captureSharedCityRuntimeSnapshot", source)
        self.assertIn("__sharedCityWorldCitiesSnapshot", source)
        self.assertIn("__sharedCityScenarioOverridesSnapshot", source)
        self.assertIn('state.worldCitiesData = cloneRuntimeValue(globalThis.__sharedCityWorldCitiesSnapshot);', source)
        self.assertIn('state.scenarioCityOverridesData = cloneRuntimeValue(globalThis.__sharedCityScenarioOverridesSnapshot);', source)
        self.assertIn("worldOverrideCount", source)
        self.assertIn("scenarioOverrideCount", source)
        self.assertIn("display-name overrides remained after reset", source)
        self.assertIn("const resetTimeout = Math.max(30_000, Number(testInfo.timeout) || 0);", source)
        self.assertIn(reset_call, source)

    def test_tno_land_feature_action_clock_wait_has_a_local_deadline(self) -> None:
        source = (REPO_ROOT / "tests" / "e2e" / "tno_open_ocean_rendering.spec.js").read_text(encoding="utf-8")
        self.assertIn("const actionAdvanceDeadline = performance.now() + 1000;", source)
        self.assertIn("performance.now() >= actionAdvanceDeadline", source)
        self.assertIn("Timed out waiting for the action clock to advance", source)

    def test_shared_city_fixture_captures_failure_context_before_reset_cleanup(self) -> None:
        source = (REPO_ROOT / "tests" / "e2e" / "support" / "fixtures.js").read_text(encoding="utf-8")
        reset_call = """await resetSharedCityRuntimeState(page, {
          storageKeys,
          timeout: resetTimeout,
          requireInfraIdle: sharedCityRequireInfraIdle,
        });"""
        failed_index = source.index("const failed = testInfo.status !== testInfo.expectedStatus;")
        snapshot_index = source.index("const failureSnapshot = await readFailureContextSnapshot(page, DEFAULT_FAILURE_SELECTORS);", failed_index)
        write_index = source.index("await writeFailureContextArtifact(testInfo, failureSnapshot);", snapshot_index)
        cleanup_index = source.index("await clearPageEventListeners(page);", write_index)
        reset_index = source.index(reset_call, cleanup_index)
        self.assertLess(failed_index, snapshot_index)
        self.assertLess(snapshot_index, write_index)
        self.assertLess(write_index, cleanup_index)
        self.assertLess(cleanup_index, reset_index)

    def test_verification_selector_routes_helper_workflow_and_dev_spec_changes(self) -> None:
        helper_explain = run_command("node", "tools/select_verification_targets.mjs", "explain", "tests/e2e/support/playwright-app.js")
        self.assert_command_ok(helper_explain)
        helper_payload = json.loads(helper_explain.stdout)
        self.assertEqual(helper_payload["mode"], "recommendation-fallback")
        helper_commands = [entry["commandRef"] for entry in helper_payload["recommendation"]["recommendedCommands"]]
        self.assertEqual(helper_commands[0], "python -m unittest tests.test_e2e_structural_tooling -q")
        self.assertIn("python -m unittest tests.test_e2e_structural_tooling -q", helper_commands)
        self.assertIn("node tools/e2e_layering.mjs run-spec tests/e2e/ui_contract_foundation.spec.js", helper_commands)

        fixtures_result = run_command("node", "tools/select_verification_targets.mjs", "tests/e2e/support/fixtures.js", "--json")
        self.assert_command_ok(fixtures_result)
        fixtures_payload = json.loads(fixtures_result.stdout)
        self.assertIn("python -m unittest tests.test_e2e_structural_tooling -q", [entry["commandRef"] for entry in fixtures_payload["recommendedCommands"]])

        reporter_result = run_command("node", "tools/select_verification_targets.mjs", "tests/e2e/support/reporters/failure-context-reporter.js", "--json")
        self.assert_command_ok(reporter_result)
        reporter_payload = json.loads(reporter_result.stdout)
        self.assertIn("python -m unittest tests.test_e2e_structural_tooling -q", [entry["commandRef"] for entry in reporter_payload["recommendedCommands"]])

        workflow_result = run_command("node", "tools/select_verification_targets.mjs", ".github/workflows/pr-verify.yml", "--json")
        self.assert_command_ok(workflow_result)
        workflow_payload = json.loads(workflow_result.stdout)
        workflow_commands = [entry["commandRef"] for entry in workflow_payload["recommendedCommands"]]
        self.assertIn("node tools/select_verification_targets.mjs --check", workflow_commands)
        self.assertIn("verify:test-import-graph", workflow_commands)
        self.assertIn("verify:architecture-boundaries", workflow_commands)

        dev_ready_result = run_command("node", "tools/select_verification_targets.mjs", "tests/e2e/dev/tno_ready_state_contract.dev.spec.js", "--json")
        self.assert_command_ok(dev_ready_result)
        dev_ready_payload = json.loads(dev_ready_result.stdout)
        self.assertIn("test:e2e:dev:tno-ready-state", [entry["commandRef"] for entry in dev_ready_payload["recommendedCommands"]])

        dev_chunk_result = run_command("node", "tools/select_verification_targets.mjs", "tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js", "--json")
        self.assert_command_ok(dev_chunk_result)
        dev_chunk_payload = json.loads(dev_chunk_result.stdout)
        self.assertIn("test:e2e:dev:scenario-chunk-runtime", [entry["commandRef"] for entry in dev_chunk_payload["recommendedCommands"]])

        release_helper_result = run_command("node", "tools/select_verification_targets.mjs", "tests/e2e/support/release-smoke.js", "--json")
        self.assert_command_ok(release_helper_result)
        release_helper_payload = json.loads(release_helper_result.stdout)
        release_helper_commands = [entry["commandRef"] for entry in release_helper_payload["recommendedCommands"]]
        self.assertIn("test:node:release-smoke-helper", release_helper_commands)
        self.assertIn("test:e2e:pages-public-release-gate", release_helper_commands)

        release_spec_result = run_command("node", "tools/select_verification_targets.mjs", "tests/e2e/release/pages_public_release_gate.spec.js", "--json")
        self.assert_command_ok(release_spec_result)
        release_spec_payload = json.loads(release_spec_result.stdout)
        release_spec_commands = [entry["commandRef"] for entry in release_spec_payload["recommendedCommands"]]
        self.assertIn("test:e2e:pages-public-release-gate", release_spec_commands)

        release_node_result = run_command("node", "tools/select_verification_targets.mjs", "tests/release_smoke_retry_behavior.node.test.mjs", "--json")
        self.assert_command_ok(release_node_result)
        release_node_payload = json.loads(release_node_result.stdout)
        release_node_commands = [entry["commandRef"] for entry in release_node_payload["recommendedCommands"]]
        self.assertIn("test:node:release-smoke-helper", release_node_commands)

        unknown_result = run_command("node", "tools/select_verification_targets.mjs", "explain", "docs/unknown-route-sentinel.txt")
        self.assertNotEqual(unknown_result.returncode, 0)
        self.assertIn("No route found", f"{unknown_result.stdout}\n{unknown_result.stderr}")

    def test_verification_selector_routes_package_metadata_to_dev_scripts_and_guardrails(self) -> None:
        for package_path in ("package.json", "package-lock.json"):
            package_result = run_command("node", "tools/select_verification_targets.mjs", package_path, "--json")
            self.assert_command_ok(package_result)
            package_payload = json.loads(package_result.stdout)
            package_commands = [entry["commandRef"] for entry in package_payload["recommendedCommands"]]
            self.assertIn("test:e2e:dev:tno-ready-state", package_commands)
            self.assertIn("test:e2e:dev:scenario-chunk-runtime", package_commands)
            self.assertIn("verify:test-timeout-inventory", package_commands)
            self.assertIn("verify:test-console-allowlist", package_commands)
            self.assertIn("verify:test-timeout-guardrails", package_commands)
            self.assertIn("verify:architecture-boundaries", package_commands)
            self.assertIn("verify:perf-gate-contract", package_commands)

    def test_verify_shared_checks_checked_in_import_graph_before_building_artifact_copy(self) -> None:
        workflow = (REPO_ROOT / ".github" / "workflows" / "verify-shared.yml").read_text(encoding="utf-8")
        verify_index = workflow.index("npm run verify:test-import-graph")
        build_index = workflow.index("node tools/build_test_import_graph.mjs --graph-out .runtime/reports/generated/test-import-graph.json")
        selector_check_index = workflow.index("node tools/select_verification_targets.mjs --check")
        architecture_index = workflow.index("npm run verify:architecture-boundaries")
        selector_explain_index = workflow.index("node tools/select_verification_targets.mjs --changed-files-list")
        self.assertLess(verify_index, build_index)
        self.assertLess(build_index, selector_check_index)
        self.assertLess(selector_check_index, architecture_index)
        self.assertLess(architecture_index, selector_explain_index)
        self.assertIn(".runtime/reports/generated/test-import-graph.json", workflow)
        self.assertIn(".runtime/tmp/verification-selector-changed-files.txt", workflow)

    def test_verify_shared_pr_fast_runner_executes_the_adaptive_child_safe_plan(self) -> None:
        workflow = (REPO_ROOT / ".github" / "workflows" / "verify-shared.yml").read_text(encoding="utf-8")
        self.assertIn("tests.test_main_deferred_detail_promotion_boundary_contract", workflow)
        self.assertIn("tests.test_perf_gate_contract", workflow)
        self.assertIn("node tools/run_adaptive_tests.mjs", workflow)
        self.assertIn("--changed-files-list .runtime/tmp/verification-selector-changed-files.txt", workflow)
        self.assertIn("--execute", workflow)
        self.assertIn("--defer-main-thread", workflow)
        self.assertIn("verification-selector-execution.json", workflow)
        self.assertIn('test -s "$changed_files"', workflow)
        self.assertIn("npm run verify:script-portfolio", workflow)
        self.assertNotIn("name.startsWith('test:node:')", workflow)
        self.assertNotIn("spawnSync('npm', ['run', name]", workflow)

    def test_pr_required_chain_consumes_the_canonical_golden_demo_profile(self) -> None:
        shared_workflow = (REPO_ROOT / ".github" / "workflows" / "verify-shared.yml").read_text(encoding="utf-8")
        pr_workflow = (REPO_ROOT / ".github" / "workflows" / "pr-verify.yml").read_text(encoding="utf-8")

        fast_job_index = pr_workflow.index("  pr-verify-fast:")
        smoke_job_index = pr_workflow.index("  pr-verify-smoke:")
        demo_job_index = pr_workflow.index("  pr-verify-demo:")
        self.assertLess(fast_job_index, smoke_job_index)
        self.assertLess(smoke_job_index, demo_job_index)
        self.assertIn("needs: pr-verify-fast", pr_workflow[smoke_job_index:demo_job_index])
        self.assertIn("needs: pr-verify-smoke", pr_workflow[demo_job_index:])
        self.assertIn("profile: demo", pr_workflow[demo_job_index:])

        demo_node_condition = "inputs.profile == 'full' || inputs.profile == 'pr-fast' || inputs.profile == 'pr-smoke' || inputs.profile == 'demo'"
        demo_browser_condition = "(inputs.profile == 'full' && inputs.run-e2e-smoke) || inputs.profile == 'pr-smoke' || inputs.profile == 'demo'"
        self.assertGreaterEqual(shared_workflow.count(demo_node_condition), 2)
        self.assertGreaterEqual(shared_workflow.count(demo_browser_condition), 2)
        self.assertIn("- name: Run Golden Demo E2E\n        if: inputs.profile == 'demo'\n        run: npm run verify:demo", shared_workflow)
        demo_spec = (REPO_ROOT / "tests/e2e/sample_guide_deeplink.spec.js").read_text(encoding="utf-8")
        self.assertEqual(demo_spec.count("@golden-demo"), 1)
        self.assertIn("name: demo-timing-and-failure-context", shared_workflow)
        self.assertIn(".runtime/reports/generated/test-timings-summary.json", shared_workflow)
        self.assertIn(".runtime/tests/playwright/**/failure-context.json", shared_workflow)

    def test_verify_shared_rejects_unknown_profiles_before_profile_steps(self) -> None:
        workflow = (REPO_ROOT / ".github" / "workflows" / "verify-shared.yml").read_text(encoding="utf-8")
        validation_index = workflow.index("- name: Validate verification profile")
        setup_python_index = workflow.index("- name: Setup Python")
        self.assertLess(validation_index, setup_python_index)
        self.assertIn("full|pr-fast|pr-smoke|demo|deploy-minimal", workflow)
        self.assertIn("unknown verification profile", workflow)
        self.assertIn("exit 2", workflow[validation_index:setup_python_index])

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
