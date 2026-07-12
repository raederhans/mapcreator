from pathlib import Path
import importlib.util
import json
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKAGE_JSON = REPO_ROOT / "package.json"
WORKFLOW_FILE = REPO_ROOT / ".github" / "workflows" / "perf-pr-gate.yml"
BASELINE_MD = REPO_ROOT / "docs" / "perf" / "baseline_2026-04-20.md"
BASELINE_JSON = REPO_ROOT / "docs" / "perf" / "baseline_2026-04-20.json"
PERF_SCRIPT = REPO_ROOT / "tools" / "perf" / "run_baseline.mjs"
RENDER_SAMPLE_ROLE_POLICY = REPO_ROOT / "tools" / "perf" / "render_sample_role_policy.mjs"
RENDER_SAMPLE_ROLE_ANALYZER = REPO_ROOT / "tools" / "perf" / "analyze_render_sample_roles.mjs"
EDITOR_BENCHMARK_SCRIPT = REPO_ROOT / "ops" / "browser-mcp" / "editor-performance-benchmark.py"


def load_editor_benchmark_module():
    spec = importlib.util.spec_from_file_location("editor_performance_benchmark", EDITOR_BENCHMARK_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PerfGateContractTest(unittest.TestCase):
    def test_package_perf_gate_uses_real_gate_scenarios(self):
        package_payload = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
        perf_baseline_script = package_payload["scripts"]["perf:baseline"]
        perf_gate_script = package_payload["scripts"]["perf:gate"]
        self.assertEqual(
            package_payload["scripts"].get("verify:perf-gate-contract"),
            "npm run python -- -m unittest tests.test_perf_gate_contract -q",
        )
        self.assertEqual(
            package_payload["scripts"].get("bench:editor-performance"),
            "npm run python -- ops/browser-mcp/editor-performance-benchmark.py --out .runtime/output/perf/editor-performance-benchmark.json --screenshot-dir .runtime/browser/mcp-artifacts/perf",
        )
        self.assertIn("--warmups 3", perf_baseline_script)
        self.assertIn("--scenarios tno_1962,hoi4_1939", perf_gate_script)
        self.assertIn("--warmups 3", perf_gate_script)
        self.assertNotIn("blank_base", perf_gate_script)

    def test_workflow_matches_checked_in_baseline_environment(self):
        workflow_content = WORKFLOW_FILE.read_text(encoding="utf-8")
        baseline_payload = json.loads(BASELINE_JSON.read_text(encoding="utf-8"))
        baseline_os = str(baseline_payload["environment"]["os"])
        baseline_node = str(baseline_payload["environment"]["node"])
        self.assertTrue(baseline_os.startswith("win32 "), baseline_os)
        self.assertTrue(baseline_node.startswith("v22."), baseline_node)
        self.assertIn("runs-on: windows-latest", workflow_content)
        self.assertRegex(workflow_content, r'node-version:\s*[\"\']22[\"\']')
        self.assertRegex(workflow_content, r'python-version:\s*[\"\']3\.12[\"\']')
        self.assertIn("cache: 'pip'", workflow_content)
        self.assertIn("python -m pip install -r requirements-dev.lock.txt", workflow_content)
        self.assertIn("npx playwright install chromium", workflow_content)
        self.assertIn("npm run perf:gate", workflow_content)
        self.assertLess(
            workflow_content.index("python -m pip install -r requirements-dev.lock.txt"),
            workflow_content.index("      - name: Run perf gate"),
        )

    def test_baseline_markdown_declares_gate_vs_observation_roles(self):
        markdown = BASELINE_MD.read_text(encoding="utf-8")
        self.assertIn("- Gate scenarios: tno_1962, hoi4_1939", markdown)
        self.assertIn("- Observation samples: blank_base", markdown)
        self.assertRegex(markdown, r"## Scenario: blank_base\s+- sample_role: observation")
        self.assertRegex(markdown, r"## Scenario: tno_1962\s+- sample_role: gate")
        self.assertRegex(markdown, r"## Scenario: hoi4_1939\s+- sample_role: gate")

    def test_perf_script_locks_hardening_contract(self):
        script = PERF_SCRIPT.read_text(encoding="utf-8")
        self.assertIn('benchmarkMetricsSchemaVersion: "3.3"', script)
        self.assertIn('probeSchema: "mc_perf_snapshot"', script)
        self.assertIn('const PERF_REPORT_CONTRACT_FIELDS = [', script)
        self.assertIn('getPerfReportContractMismatches(baselineReport, "baseline", { allowLegacySchema: true })', script)
        self.assertIn('getPerfReportContractMismatches(currentReport, "current")', script)
        self.assertIn("const CURRENT_PERF_REPORT_SCHEMA_VERSION = 2;", script)
        self.assertIn("const LEGACY_PERF_REPORT_SCHEMA_VERSION = 1;", script)
        self.assertIn('from "./render_sample_role_policy.mjs";', script)
        self.assertIn("canonicalRenderSampleMs", script)
        self.assertIn("renderSampleRoleSummary", script)
        self.assertIn("collectGovernedRenderSampleRoleMismatches", script)
        self.assertIn("Perf gate render sample role mismatch.", script)
        self.assertIn("renderSampleRoleMismatches", script)
        self.assertIn('const DEFAULT_GATE_SCENARIOS = ["tno_1962", "hoi4_1939"];', script)
        self.assertIn("const MIN_GATE_WARMUPS = 3;", script)
        self.assertIn("const DEFAULT_WARMUPS = MIN_GATE_WARMUPS;", script)
        self.assertIn('throw new Error(`[perf-baseline] Gate warmups must be at least ${MIN_GATE_WARMUPS}; received ${options.warmups}.`);', script)
        self.assertIn("warmups mismatch: baseline=", script)
        self.assertIn('if (activeScenarioId !== normalizeScenarioId(scenarioId)) {', script)
        self.assertIn('{ key: "scenarioAppliedMs", label: "scenarioAppliedMs" }', script)
        self.assertIn('{ key: "applyScenarioBundleMs", label: "applyScenarioBundleMs" }', script)
        self.assertIn('{ key: "refreshScenarioApplyMs", label: "refreshScenarioApplyMs" }', script)
        self.assertIn('{ key: "renderSampleMedianMs", label: "renderSampleMedianMs", threshold: 1.25 }', script)
        self.assertIn("function summarizeSampleSpread", script)
        self.assertIn("function buildReportWorkloadIdentity", script)
        self.assertIn("sampleSpread: buildAggregateSampleSpread(runs)", script)
        self.assertIn("workloadIdentity: buildScenarioWorkloadIdentity", script)
        self.assertIn("workloadIdentity: buildReportWorkloadIdentity(options, measurement)", script)
        self.assertIn("function activeServerMetadataMatchesRepo(metadata, { expectedPid = null } = {})", script)
        self.assertIn("function resolveDevServerPythonCommand()", script)
        self.assertIn('import { spawn, spawnSync } from "node:child_process";', script)
        self.assertIn("process.env.pythonLocation || process.env.Python_ROOT_DIR || process.env.Python3_ROOT_DIR", script)
        self.assertIn('path.join(setupPythonRoot, process.platform === "win32" ? "python.exe" : "bin/python")', script)
        self.assertIn('const pythonExecutable = resolveWindowsPythonExecutable();', script)
        self.assertIn('return { command: pythonExecutable, args: ["tools/dev_server.py"] };', script)
        self.assertIn('return { command: "python3", args: ["tools/dev_server.py"] };', script)
        self.assertIn(
            'const pythonProbe = spawnSync("py", ["-3", "-c", "import sys; print(sys.executable)"], {\n'
            "    cwd: REPO_ROOT,\n"
            '    encoding: "utf8",\n'
            "    windowsHide: true,\n"
            "  });",
            script,
        )
        self.assertIn("pythonProbe.error", script)
        self.assertIn("pythonProbe.status === null", script)
        self.assertIn("pythonProbe.status !== 0", script)
        self.assertIn("!pythonExecutable", script)
        self.assertIn("truncateStderr(pythonProbe.stderr)", script)
        self.assertNotIn('return { command: "py", args: ["-3", "tools/dev_server.py"] };', script)
        self.assertIn("expectedPid = null", script)
        self.assertIn("const metadataPid = Number(metadata?.pid);", script)
        self.assertIn("isProcessIdRunning(metadataPid)", script)
        self.assertIn("Number.isInteger(expectedNumericPid)", script)
        self.assertIn("metadataPid === expectedNumericPid", script)
        self.assertIn("normalizeMetadataPath(metadataCwd) === normalizeMetadataPath(REPO_ROOT)", script)
        self.assertIn('MAPCREATOR_RUNTIME_ROOT: PERF_SERVER_RUNTIME_ROOT', script)
        self.assertIn("function shouldReuseActiveServer()", script)
        self.assertIn("process.env.PERF_REUSE_ACTIVE_SERVER", script)
        self.assertIn("resolveExistingServerBaseUrl(PERF_SERVER_ACTIVE_SERVER_PATH, {", script)
        self.assertIn("expectedPid: serverOwner.child.pid", script)
        self.assertIn("if (!activeServerMetadataMatchesRepo(metadata, options))", script)
        self.assertIn("async function ensureMeasurementServer(serverLease)", script)
        self.assertIn("serverLeaseRef.current = await ensureMeasurementServer(serverLeaseRef.current)", script)
        self.assertIn("async function readPerfRuntimeState(page)", script)
        self.assertIn('globalThis.__mapcreator__?.snapshot', script)
        self.assertNotIn('new URL("./js/core/state.js"', script)
        self.assertIn('path.join(REPO_ROOT, ".runtime", "tests", "playwright", "perf-baseline")', script)
        self.assertIn("function createPerfBrowserDiagnostics(page,", script)
        self.assertIn('page.on("console"', script)
        self.assertIn('page.on("pageerror"', script)
        self.assertIn('page.on("requestfailed"', script)
        self.assertIn('kind: "http-error"', script)
        self.assertIn("[perf-baseline] Browser diagnostics:", script)
        self.assertIn("runLabel: `warmup-${String(index + 1).padStart(2, \"0\")}`", script)
        self.assertIn("runLabel: `run-${String(index + 1).padStart(2, \"0\")}`", script)
        self.assertIn("manifestSha256", script)
        self.assertIn("function validateGateCurrentReport(currentReport, scenarioIds", script)
        self.assertIn("Current report has invalid gate metrics for scenarios", script)
        self.assertIn('validateGateCurrentReport(report, options.scenarios, "current report")', script)
        for field_name in (
            "scenarioFullHydrateMs",
            "interactionInfraMs",
            "scenarioChunkPromotionInfraStageMs",
            "scenarioChunkPromotionVisualStageMs",
            "zoomEndToChunkVisibleMs",
            "interactionRecoveryWindowMs",
            "interactionRecoveryTaskMs",
            "visibleFrameTransactionMs",
            "visibleFrameTransactionCount",
            "visibleFrameRejectedCount",
            "visibleFrameMissingCount",
            "continuityFrameStaleAgeMs",
            "missingVisibleFrameCount",
            "fillPatchInputToFirstPixelMs",
            "postReadyMaxPendingAgeMs",
            "postReadyMaxRetryCount",
            "startupBundleSource",
            "startupShellApplyReadyMs",
            "loadScenarioBundleMs",
            "drawContextScenarioPassMs",
            "setMapDataFirstPaintMs",
            "buildHitCanvasMs",
            "settleExactRefreshMs",
            "settleExactRefreshApplyMs",
            "settleExactRefreshPassesMs",
            "settleExactRefreshWaitForPaintMs",
            "settleExactRefreshFinalizeMs",
            "settleExactRefreshPhaseBreakdownMs",
        ):
            self.assertIn(field_name, script)
        self.assertIn('bootMetrics["scenario-apply"]?.source', script)
        self.assertIn("workerDecodeMs", script)
        self.assertIn("workerMetaBuildMs", script)
        self.assertIn("Perf gate baseline contract mismatch.", script)

    def test_render_sample_role_policy_and_governed_analyzer_are_explicit_contracts(self):
        policy = RENDER_SAMPLE_ROLE_POLICY.read_text(encoding="utf-8")
        analyzer = RENDER_SAMPLE_ROLE_ANALYZER.read_text(encoding="utf-8")
        package_payload = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))

        self.assertIn('RENDER_SAMPLE_ROLE_POLICY_ID = "render-sample-role-v2"', policy)
        self.assertIn('CANONICAL_RENDER_SAMPLE_ROLE_ID = "last-post-promotion-idle-scenario-frame-v1"', policy)
        self.assertIn('GOVERNED_RENDER_SAMPLE_SCENARIOS = Object.freeze(["tno_1962", "hoi4_1939"])', policy)
        for contract_token in (
            '"declared-sample-count"',
            '"sample-array-count"',
            '"sample-sequence"',
            '"canonical-candidate-unique"',
            '"canonical-candidate-is-last"',
            '"all-pre-canonical-samples-before-promotion"',
            '"last-active-scenario"',
            '"last-phase-idle"',
            '"last-political-bg-progressive"',
            '"last-context-scenario-positive"',
            '"last-recorded-after-promotion"',
        ):
            self.assertIn(contract_token, policy)
        self.assertIn("buildGovernedCompanionReport", analyzer)
        self.assertIn("accepted-with-governed-reanalysis", analyzer)
        self.assertIn("blocked-rerun-required", analyzer)
        self.assertIn("DEFAULT_EXPECTED_SOURCE_SHA256", analyzer)
        self.assertIn("rawFileCount", analyzer)
        self.assertIn("roleMatches", analyzer)
        self.assertIn("legacyDecision", analyzer)
        self.assertIn("pathToFileURL", analyzer)
        self.assertEqual(
            package_payload["scripts"].get("test:node:render-sample-role-policy"),
            "node --test tests/render_sample_role_policy_behavior.test.mjs tests/perf_role_governed_report_behavior.test.mjs",
        )
        self.assertEqual(
            package_payload["scripts"].get("perf:analyze-render-sample-roles"),
            "node tools/perf/analyze_render_sample_roles.mjs",
        )

    def test_checked_in_baseline_keeps_report_identity_and_worker_summary_fields(self):
        baseline_payload = json.loads(BASELINE_JSON.read_text(encoding="utf-8"))
        self.assertEqual(baseline_payload.get("schemaVersion"), 1)
        self.assertEqual(baseline_payload.get("benchmarkMetricsSchemaVersion"), "3.3")
        self.assertEqual(baseline_payload.get("probeSchema"), "mc_perf_snapshot")
        self.assertRegex(str(baseline_payload.get("gitHead", "")), r"^[0-9a-f]{40}$")
        self.assertEqual(baseline_payload.get("config", {}).get("warmups"), 3)
        for scenario_id in ("tno_1962", "hoi4_1939"):
            summary = baseline_payload.get("scenarios", {}).get(scenario_id, {}).get("summary", {})
            self.assertIn("workerDecodeMs", summary)
            self.assertIn("workerMetaBuildMs", summary)
            self.assertIsInstance(summary.get("workerDecodeMs"), (int, float))
            self.assertIsInstance(summary.get("workerMetaBuildMs"), (int, float))

    def test_editor_benchmark_locks_identity_and_fill_black_pixel_contract(self):
        script = EDITOR_BENCHMARK_SCRIPT.read_text(encoding="utf-8")
        self.assertIn('"schemaVersion": 1', script)
        self.assertIn('"probeSchema": "mc_perf_snapshot"', script)
        self.assertIn('"interactionProbeSchema": "mc_repeated_zoom_regions_v1"', script)
        self.assertIn('"passAttributionSchema": "mc_pass_attribution_v1"', script)
        self.assertIn('"benchmarkMetricsSchemaVersion": "3.3"', script)
        self.assertIn('"servedRuntimeIdentity": build_served_runtime_identity', script)
        self.assertIn('"metricValidity": build_metric_validity_by_scenario', script)
        self.assertIn('"argv": sys.argv', script)
        self.assertIn('"processId": os.getpid()', script)
        self.assertIn("--repeated-zoom-regions", script)
        self.assertIn("--repeated-zoom-cycles", script)
        self.assertIn("--repeated-zoom-wheels-per-cycle", script)
        self.assertIn('"repeatedZoomRegions": repeated_zoom_regions_probe', script)
        self.assertIn('runtime_chunk_perf="1"', script)
        self.assertIn("sample_canvas_black_pixel_details_js", script)
        self.assertIn("usedJSHeapSize", script)
        self.assertIn("const memoryBefore = await page.evaluate(() => {{ return", script)
        self.assertIn("const memoryAfter = await page.evaluate(() => {{ return", script)
        self.assertIn("timeout_sec = max(300, (len(regions) * cycles * max(20, wheels_per_cycle * 2)) + 240)", script)
        self.assertIn("return run_code_json(js, timeout_sec=timeout_sec)", script)
        self.assertIn("clone_runtime_chunk_load_state_summary_js", script)
        self.assertIn("clone_repeated_zoom_render_metrics_summary_js", script)
        self.assertIn("clone_repeated_zoom_pass_attribution_js", script)
        self.assertIn("mc_black_pixel_attribution_v1", script)
        self.assertIn("blank-frame-candidate", script)
        self.assertIn("mergedLayerPayloadCacheLayerCount", script)
        self.assertIn("includeHeavyMetrics: false", script)
        self.assertIn("includeHeavyMetrics: true", script)
        self.assertIn("includeBlackPixels: false", script)
        self.assertIn("const includeBlackPixels = payload.includeBlackPixels !== false;", script)
        self.assertIn("blackPixelRatio: blackPixelSamples?.ratio ?? null", script)
        self.assertIn("payload.includeBlackPixels === false ? null", script)
        self.assertIn("const readIdleState = async () => page.evaluate", script)
        self.assertIn("const chunkState = state.runtimeChunkLoadState && typeof state.runtimeChunkLoadState === 'object'", script)
        self.assertIn("chunkState.promotionCommitInFlight", script)
        self.assertIn("chunkState.pendingPostCommitRefresh", script)
        self.assertIn("chunkActive: !!snapshot.chunkActive", script)
        self.assertIn("const postReadyActive = !!state.interactionInfrastructureBuildInFlight", script)
        self.assertIn("postReadyActive: !!snapshot.postReadyActive", script)
        self.assertIn("timedOut: !snapshot.settled", script)
        self.assertIn("firstIdleAfterLastWheelMs = idleState?.timedOut", script)
        self.assertIn("const attributionSampleContext = {{", script)
        self.assertIn("firstIdleAfterLastWheelMs,", script)
        self.assertIn("attributionSampleContext,", script)
        self.assertIn("result.finalReset = await waitForIdle(7000)", script)
        self.assertIn("activeScenarioId: await readActiveScenarioId()", script)
        self.assertIn("result.activeScenarioId = await readActiveScenarioId()", script)
        self.assertIn("attribution: Array.from(entry.attribution || [])", script)
        self.assertIn("mc_long_task_attribution_v1", script)
        self.assertIn("mc_long_task_attribution_gate_v1", script)
        self.assertIn("mc_long_task_subowner_v1", script)
        self.assertIn("LONG_TASK_ATTRIBUTION_ALLOWED_CATEGORIES", script)
        self.assertIn("subOwner", script)
        self.assertIn("subOwnerCounts", script)
        self.assertIn("unknownSubOwnerCount", script)
        self.assertIn("missingSubOwnerEvidenceCount", script)
        self.assertIn("topSubOwnerActionable", script)
        self.assertIn("shortArtifactPassed", script)
        self.assertIn("fullArtifactPassed", script)
        self.assertIn("category: 'render-pass'", script)
        self.assertIn("schedulerMetric=${{schedulerEntry.metricName}}", script)
        self.assertIn("scheduler-duration-overlap", script)
        self.assertIn("scheduler:deferred-exact-context-pass", script)
        self.assertIn("scheduler-label-observed", script)
        self.assertRegex(
            script,
            r"const schedulerEntry = metricEntry\([\s\S]*?schedulerDeferredExactLabel \? 'scheduler:deferred-exact-context-pass' : 'scheduler:queue-depth'[\s\S]*?schedulerDeferredExactLabel \? 'scheduler-label-observed' : 'scheduler-duration-overlap'[\s\S]*?\);[\s\S]*?schedulerEntry\.durationMs >= 350 \|\| schedulerEntry\.durationMs >= durationMs \* 0\.25",
        )
        self.assertIn("partial-render-pass-overlap", script)
        self.assertNotIn("if (schedulerDepth > 0) {{", script)
        self.assertIn("hasMeaningfulBrowserAttribution", script)
        self.assertNotIn("if (attribution.length) {{", script)
        self.assertIn("unknownLongTaskCount", script)
        self.assertIn("evidence: evidence.length ? [...evidence, 'no-pass-or-browser-attribution'] : ['no-pass-or-browser-attribution']", script)
        self.assertIn('"git", "rev-parse", "HEAD"', script)
        self.assertIn('SCENARIO_IDS = ["none", "hoi4_1939", "tno_1962"]', script)
        self.assertIn('"politicalRasterWorker": political_raster_worker', script)
        self.assertIn("def resolve_runtime_output_path", script)
        self.assertIn("resolved.relative_to(runtime_root)", script)
        self.assertIn("acceptedCount: Number(source.acceptedCount || 0)", script)
        self.assertIn("rejectedStaleCount: Number(source.rejectedStaleCount || 0)", script)
        self.assertIn("fallbackCount: Number(source.fallbackCount || 0)", script)
        self.assertIn('"missing-last-action"', script)
        self.assertIn("const sampleRegions = [", script)
        self.assertIn("sampleContext.drawImage(canvas, sourceX, sourceY", script)
        self.assertIn("const sampleEpochMs = (sampleContext = null) =>", script)
        self.assertIn("return timeOrigin && sampledAt ? timeOrigin + sampledAt : sampledAt;", script)
        self.assertNotIn("metricRecordedAt: sampleContext?.sampledAt || 0", script)
        self.assertNotIn("metricRecordedAt: Math.max(0, Number(sampleContext?.sampledAt || 0))", script)

    def test_editor_benchmark_output_paths_stay_inside_runtime(self):
        benchmark = load_editor_benchmark_module()
        inside = benchmark.resolve_runtime_output_path(".runtime/output/perf/report.json", label="test")
        self.assertEqual(inside, (REPO_ROOT / ".runtime" / "output" / "perf" / "report.json").resolve())
        with self.assertRaises(ValueError):
            benchmark.resolve_runtime_output_path("../outside.json", label="test")

    def test_repeated_zoom_regions_metric_summarizes_degradation_black_longtask_and_memory(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "repeatedZoomRegions": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "interactionProbeSchema": "mc_repeated_zoom_regions_v1",
                "passAttributionSchema": "mc_pass_attribution_v1",
                "cyclesPerRegion": 2,
                "wheelsPerCycle": 5,
                "regions": {
                    "europe": {
                        "cycles": [
                            {
                                "firstIdleAfterLastWheelMs": 100,
                                "passAttribution": {
                                    "passes": {
                                        "politicalBg": {"durationMs": 12},
                                    },
                                },
                                "longTaskAttribution": {
                                    "schema": "mc_long_task_attribution_v1",
                                    "unknownLongTaskCount": 0,
                                    "topOwner": "render-pass",
                                    "categoryCounts": {"render-pass": 1},
                                    "tasks": [
                                        {
                                            "category": "render-pass",
                                            "subOwner": "render-pass:politicalBg",
                                            "subOwnerEvidence": {
                                                "metricName": "politicalBg",
                                                "metricDurationMs": 900,
                                                "metricRecordedAt": 1000,
                                                "taskWindowMs": [900, 1900],
                                                "matchReason": "dominant-render-pass-overlap",
                                                "renderPass": "politicalBg",
                                            },
                                            "subOwnerConfidence": "high",
                                            "durationMs": 900,
                                            "startTime": 123,
                                            "evidence": ["politicalBg=900ms"],
                                            "confidence": "high",
                                        }
                                    ],
                                },
                                "blackPixelAttribution": {
                                    "classification": "normal",
                                },
                            },
                            {
                                "firstIdleAfterLastWheelMs": 125,
                                "passAttribution": {
                                    "passes": {
                                        "politicalBg": {"durationMs": 18},
                                    },
                                },
                                "longTaskAttribution": {
                                    "schema": "mc_long_task_attribution_v1",
                                    "unknownLongTaskCount": 1,
                                    "topOwner": "unknown",
                                    "categoryCounts": {"unknown": 1},
                                    "tasks": [
                                        {
                                            "category": "unknown",
                                            "subOwner": "unknown",
                                            "subOwnerEvidence": {
                                                "metricName": "unknown",
                                                "metricDurationMs": 800,
                                                "metricRecordedAt": 1200,
                                                "taskWindowMs": [1000, 1800],
                                                "matchReason": "no-subowner-match",
                                            },
                                            "subOwnerConfidence": "low",
                                            "durationMs": 800,
                                            "startTime": 456,
                                            "evidence": ["no-pass-or-browser-attribution"],
                                            "confidence": "low",
                                        }
                                    ],
                                },
                                "unknownLongTaskCount": 1,
                                "blackPixelAttribution": {
                                    "classification": "dark-content-candidate",
                                },
                            },
                        ],
                        "degradation": {"ratio": 1.25},
                        "maxBlackPixelRatio": 0.02,
                        "maxLongTaskMs": 30,
                        "memoryDelta": {"usedJSHeapSize": 2048},
                        "passAttributionSchema": "mc_pass_attribution_v1",
                    }
                },
            },
        }
        metric = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]
        self.assertTrue(metric["present"])
        self.assertEqual(metric["durationMs"], 125)
        self.assertEqual(metric["count"], 1.25)
        self.assertTrue(metric["details"]["sameScenario"])
        self.assertEqual(metric["details"]["interactionProbeSchema"], "mc_repeated_zoom_regions_v1")
        self.assertEqual(metric["details"]["passAttributionSchema"], "mc_pass_attribution_v1")
        self.assertEqual(metric["details"]["regions"]["europe"]["degradation"]["ratio"], 1.25)
        self.assertEqual(metric["details"]["passAttribution"]["politicalBg"]["max"], 18)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["schema"], "mc_long_task_attribution_v1")
        self.assertEqual(metric["details"]["longTask"]["attribution"]["subOwnerSchema"], "mc_long_task_subowner_v1")
        self.assertEqual(metric["details"]["longTask"]["attribution"]["unknownLongTaskCount"], 1)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["categoryCounts"]["render-pass"], 1)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["categoryCounts"]["unknown"], 1)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["subOwnerCounts"]["render-pass:politicalBg"], 1)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["subOwnerCounts"]["unknown"], 1)
        self.assertFalse(metric["details"]["longTask"]["attribution"]["gate"]["passed"])
        self.assertEqual(metric["details"]["longTask"]["attribution"]["gate"]["unknownLongTaskCount"], 1)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["gate"]["unknownTopOwnerCount"], 1)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["gate"]["unknownSubOwnerCount"], 1)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["gate"]["missingSubOwnerEvidenceCount"], 0)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["gate"]["missingSubOwnerConfidenceCount"], 0)
        self.assertEqual(metric["details"]["longTask"]["attribution"]["gate"]["invalidCategoryCount"], 0)
        self.assertEqual(metric["details"]["regions"]["europe"]["longTaskAttribution"]["unknownLongTaskCount"], 1)
        self.assertEqual(metric["details"]["regions"]["europe"]["longTaskAttribution"]["subOwnerSchema"], "mc_long_task_subowner_v1")
        self.assertEqual(metric["details"]["regions"]["europe"]["longTaskAttribution"]["subOwnerCounts"]["render-pass:politicalBg"], 1)
        self.assertEqual(metric["details"]["regions"]["europe"]["longTaskAttribution"]["subOwnerCounts"]["unknown"], 1)
        self.assertEqual(metric["details"]["regions"]["europe"]["longTaskAttribution"]["gate"]["unknownSubOwnerCount"], 1)
        self.assertFalse(metric["details"]["regions"]["europe"]["longTaskAttribution"]["gate"]["passed"])
        self.assertEqual(metric["details"]["blackPixelClassification"]["normal"], 1)
        self.assertEqual(metric["details"]["blackPixelClassification"]["dark-content-candidate"], 1)

    def test_repeated_zoom_regions_longtask_subowners_pass_when_all_tasks_are_owned(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "repeatedZoomRegions": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "interactionProbeSchema": "mc_repeated_zoom_regions_v1",
                "passAttributionSchema": "mc_pass_attribution_v1",
                "cyclesPerRegion": 1,
                "wheelsPerCycle": 1,
                "shortArtifactPass": True,
                "fullArtifactPass": True,
                "regions": {
                    "europe": {
                        "cycles": [
                            {
                                "firstIdleAfterLastWheelMs": 100,
                                "longTaskAttribution": {
                                    "schema": "mc_long_task_attribution_v1",
                                    "subOwnerSchema": "mc_long_task_subowner_v1",
                                    "unknownLongTaskCount": 0,
                                    "unknownSubOwnerCount": 0,
                                    "topOwner": "render-pass",
                                    "topSubOwner": "render-pass:politicalBg",
                                    "categoryCounts": {"render-pass": 1},
                                    "subOwnerCounts": {"render-pass:politicalBg": 1},
                                    "tasks": [
                                        {
                                            "category": "render-pass",
                                            "subOwner": "render-pass:politicalBg",
                                            "subOwnerEvidence": {
                                                "metricName": "politicalBg",
                                                "metricDurationMs": 900,
                                                "metricRecordedAt": 1000,
                                                "taskWindowMs": [900, 1900],
                                                "matchReason": "dominant-render-pass-overlap",
                                                "renderPass": "politicalBg",
                                            },
                                            "subOwnerConfidence": "high",
                                            "durationMs": 900,
                                            "startTime": 123,
                                            "evidence": ["politicalBg=900ms"],
                                            "confidence": "high",
                                        }
                                    ],
                                },
                            }
                        ],
                        "degradation": {"ratio": 1.0},
                        "maxLongTaskMs": 900,
                    }
                },
            },
        }

        metric = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]
        attribution = metric["details"]["longTask"]["attribution"]

        self.assertEqual(attribution["subOwnerSchema"], "mc_long_task_subowner_v1")
        self.assertEqual(attribution["subOwnerCounts"]["render-pass:politicalBg"], 1)
        self.assertTrue(attribution["gate"]["passed"])
        self.assertEqual(attribution["gate"]["unknownSubOwnerCount"], 0)
        self.assertEqual(attribution["gate"]["missingSubOwnerEvidenceCount"], 0)
        self.assertEqual(attribution["gate"]["missingSubOwnerConfidenceCount"], 0)
        self.assertTrue(attribution["gate"]["topSubOwnerActionable"])
        self.assertTrue(metric["details"]["artifactPassMarkers"]["shortArtifactPass"])
        self.assertTrue(metric["details"]["artifactPassMarkers"]["fullArtifactPass"])

    def test_repeated_zoom_regions_without_long_tasks_does_not_fail_top_subowner_gate(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "repeatedZoomRegions": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "interactionProbeSchema": "mc_repeated_zoom_regions_v1",
                "passAttributionSchema": "mc_pass_attribution_v1",
                "cyclesPerRegion": 1,
                "wheelsPerCycle": 1,
                "shortArtifactPass": True,
                "fullArtifactPass": True,
                "regions": {
                    "europe": {
                        "cycles": [
                            {
                                "firstIdleAfterLastWheelMs": 80,
                                "longTaskAttribution": {
                                    "schema": "mc_long_task_attribution_v1",
                                    "subOwnerSchema": "mc_long_task_subowner_v1",
                                    "thresholdMs": 750,
                                    "unknownLongTaskCount": 0,
                                    "unknownSubOwnerCount": 0,
                                    "topOwner": "",
                                    "topSubOwner": "",
                                    "categoryCounts": {},
                                    "subOwnerCounts": {},
                                    "tasks": [],
                                },
                            }
                        ],
                        "degradation": {"ratio": 1.0},
                        "maxLongTaskMs": 0,
                    }
                },
            },
        }

        metric = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]
        attribution = metric["details"]["longTask"]["attribution"]
        region_attribution = metric["details"]["regions"]["europe"]["longTaskAttribution"]

        self.assertTrue(attribution["gate"]["passed"])
        self.assertEqual(attribution["gate"]["taskCount"], 0)
        self.assertEqual(attribution["gate"]["unknownTopSubOwnerCount"], 0)
        self.assertEqual(attribution["gate"]["unknownSubOwnerCount"], 0)
        self.assertTrue(region_attribution["gate"]["passed"])
        self.assertEqual(region_attribution["gate"]["taskCount"], 0)
        self.assertEqual(region_attribution["gate"]["unknownTopSubOwnerCount"], 0)

    def test_repeated_zoom_regions_missing_artifact_markers_stay_unknown(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "repeatedZoomRegions": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "interactionProbeSchema": "mc_repeated_zoom_regions_v1",
                "regions": {},
            },
        }

        metric = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]

        selfIsNone = self.assertIsNone
        selfIsNone(metric["details"]["artifactPassMarkers"]["shortArtifactPass"])
        selfIsNone(metric["details"]["artifactPassMarkers"]["fullArtifactPass"])
        selfIsNone(metric["details"]["longTask"]["attribution"]["gate"]["shortArtifactPassed"])
        selfIsNone(metric["details"]["longTask"]["attribution"]["gate"]["fullArtifactPassed"])

    def test_repeated_zoom_regions_artifact_markers_require_real_booleans(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "repeatedZoomRegions": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "interactionProbeSchema": "mc_repeated_zoom_regions_v1",
                "shortArtifactPass": "false",
                "fullArtifactPass": "0",
                "regions": {},
            },
        }

        metric = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]

        self.assertIsNone(metric["details"]["artifactPassMarkers"]["shortArtifactPass"])
        self.assertIsNone(metric["details"]["artifactPassMarkers"]["fullArtifactPass"])
        self.assertIsNone(metric["details"]["longTask"]["attribution"]["gate"]["shortArtifactPassed"])
        self.assertIsNone(metric["details"]["longTask"]["attribution"]["gate"]["fullArtifactPassed"])

    def test_repeated_zoom_regions_naked_subowner_is_not_actionable(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "repeatedZoomRegions": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "interactionProbeSchema": "mc_repeated_zoom_regions_v1",
                "regions": {
                    "europe": {
                        "cycles": [
                            {
                                "firstIdleAfterLastWheelMs": 100,
                                "longTaskAttribution": {
                                    "schema": "mc_long_task_attribution_v1",
                                    "unknownLongTaskCount": 0,
                                    "topOwner": "chunk-promotion",
                                    "topSubOwner": "post-commit-replay",
                                    "categoryCounts": {"chunk-promotion": 1},
                                    "subOwnerCounts": {"post-commit-replay": 1},
                                    "tasks": [
                                        {
                                            "category": "chunk-promotion",
                                            "subOwner": "post-commit-replay",
                                            "subOwnerEvidence": {"matchReason": "legacy-naked-subowner"},
                                            "subOwnerConfidence": "medium",
                                            "durationMs": 900,
                                            "evidence": ["chunkMetric=zoomEndToChunkVisibleMs:900ms"],
                                            "confidence": "medium",
                                        }
                                    ],
                                },
                            }
                        ],
                        "degradation": {"ratio": 1.0},
                        "maxLongTaskMs": 900,
                    }
                },
            },
        }

        attribution = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]["details"]["longTask"]["attribution"]

        self.assertFalse(attribution["gate"]["passed"])
        self.assertFalse(attribution["gate"]["topSubOwnerActionable"])
        self.assertEqual(attribution["gate"]["unknownSubOwnerCount"], 1)
        self.assertEqual(attribution["gate"]["unknownTopSubOwnerCount"], 1)

    def test_repeated_zoom_regions_uses_aggregate_gate_when_tasks_are_truncated(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "repeatedZoomRegions": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "interactionProbeSchema": "mc_repeated_zoom_regions_v1",
                "regions": {
                    "europe": {
                        "cycles": [],
                        "longTaskAttribution": [
                            {
                                "schema": "mc_long_task_attribution_v1",
                                "subOwnerSchema": "mc_long_task_subowner_v1",
                                "unknownLongTaskCount": 2,
                                "topOwner": "unknown",
                                "topSubOwner": "unknown",
                                "categoryCounts": {"unknown": 2},
                                "subOwnerCounts": {"unknown": 2},
                                "subOwnerMaxMs": {"unknown": 1200},
                                "gate": {
                                    "schema": "mc_long_task_attribution_gate_v1",
                                    "taskCount": 25,
                                    "unknownLongTaskCount": 2,
                                    "unknownTopOwnerCount": 1,
                                    "unknownSubOwnerCount": 2,
                                    "unknownTopSubOwnerCount": 1,
                                    "invalidCategoryCount": 0,
                                    "missingEvidenceCount": 0,
                                    "missingConfidenceCount": 0,
                                    "missingSubOwnerEvidenceCount": 0,
                                    "missingSubOwnerConfidenceCount": 0,
                                },
                                "tasks": [
                                    {
                                        "category": "render-pass",
                                        "subOwner": "render-pass:politicalBg",
                                        "subOwnerEvidence": {"matchReason": "dominant-render-pass-overlap"},
                                        "subOwnerConfidence": "high",
                                        "durationMs": 800,
                                        "evidence": ["politicalBg=800ms"],
                                        "confidence": "high",
                                    }
                                ],
                            }
                        ],
                        "degradation": {"ratio": 1.0},
                        "maxLongTaskMs": 1200,
                    }
                },
            },
        }

        region_gate = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]["details"]["regions"]["europe"]["longTaskAttribution"]["gate"]

        self.assertFalse(region_gate["passed"])
        self.assertEqual(region_gate["taskCount"], 25)
        self.assertEqual(region_gate["unknownLongTaskCount"], 2)
        self.assertEqual(region_gate["unknownSubOwnerCount"], 2)

    def test_repeated_zoom_regions_aggregate_gate_sums_region_unknowns(self):
        benchmark = load_editor_benchmark_module()

        def cycle_with_unknown(render_duration, unknown_duration):
            return {
                "firstIdleAfterLastWheelMs": 100,
                "longTaskAttribution": {
                    "schema": "mc_long_task_attribution_v1",
                    "subOwnerSchema": "mc_long_task_subowner_v1",
                    "unknownLongTaskCount": 1,
                    "unknownSubOwnerCount": 1,
                    "topOwner": "render-pass",
                    "topSubOwner": "render-pass:contextScenario",
                    "categoryCounts": {"render-pass": 1, "unknown": 1},
                    "subOwnerCounts": {"render-pass:contextScenario": 1, "unknown": 1},
                    "tasks": [
                        {
                            "category": "render-pass",
                            "subOwner": "render-pass:contextScenario",
                            "subOwnerEvidence": {"matchReason": "dominant-render-pass-overlap"},
                            "subOwnerConfidence": "high",
                            "durationMs": render_duration,
                            "evidence": ["contextScenario=900ms"],
                            "confidence": "high",
                        },
                        {
                            "category": "unknown",
                            "subOwner": "unknown",
                            "subOwnerEvidence": {"matchReason": "no-subowner-match"},
                            "subOwnerConfidence": "low",
                            "durationMs": unknown_duration,
                            "evidence": ["no-pass-or-browser-attribution"],
                            "confidence": "low",
                        },
                    ],
                },
            }

        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "repeatedZoomRegions": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "interactionProbeSchema": "mc_repeated_zoom_regions_v1",
                "regions": {
                    "europe": {
                        "cycles": [cycle_with_unknown(1000, 800)],
                        "degradation": {"ratio": 1.0},
                        "maxLongTaskMs": 1000,
                    },
                    "east_asia": {
                        "cycles": [cycle_with_unknown(1100, 850)],
                        "degradation": {"ratio": 1.0},
                        "maxLongTaskMs": 1100,
                    },
                },
            },
        }

        metric = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]
        attribution = metric["details"]["longTask"]["attribution"]

        self.assertFalse(attribution["gate"]["passed"])
        self.assertEqual(attribution["gate"]["unknownLongTaskCount"], 2)
        self.assertEqual(attribution["gate"]["unknownSubOwnerCount"], 2)
        self.assertTrue(metric["details"]["regions"]["europe"]["longTaskAttribution"]["gate"]["passed"])
        self.assertTrue(metric["details"]["regions"]["east_asia"]["longTaskAttribution"]["gate"]["passed"])

    def test_repeated_zoom_regions_metric_requires_active_scenario_match(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "hoi4_1939",
            },
            "repeatedZoomRegions": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "hoi4_1939",
                "interactionProbeSchema": "mc_repeated_zoom_regions_v1",
                "passAttributionSchema": "mc_pass_attribution_v1",
                "cyclesPerRegion": 1,
                "wheelsPerCycle": 1,
                "regions": {
                    "europe": {
                        "cycles": [{"firstIdleAfterLastWheelMs": 100}],
                        "degradation": {"ratio": 1.0},
                    }
                },
            },
        }

        metric = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]
        self.assertTrue(metric["present"])
        self.assertFalse(metric["details"]["sameScenario"])

        del suite["repeatedZoomRegions"]["activeScenarioId"]
        missing_active_metric = benchmark.build_suite_benchmark_metrics(suite)["repeatedZoomRegions"]
        self.assertFalse(missing_active_metric["details"]["sameScenario"])

    def test_fill_action_metrics_carry_black_pixel_ratio(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "singleFill": {
                "lastActionDurationMs": 11,
                "lastAction": "single-fill",
                "blackPixelRatio": 0.12,
            },
            "doubleClickFill": {
                "lastActionDurationMs": 22,
                "lastAction": "double-click-fill",
                "blackPixelRatio": 0.34,
            },
        }
        metrics = benchmark.build_suite_benchmark_metrics(suite)["firstInteraction"]
        self.assertEqual(metrics["singleFillAction"]["details"]["blackPixelRatio"], 0.12)
        self.assertEqual(metrics["doubleClickFillAction"]["details"]["blackPixelRatio"], 0.34)
        self.assertTrue(metrics["singleFillAction"]["details"]["validity"]["valid"])
        self.assertTrue(metrics["doubleClickFillAction"]["details"]["validity"]["valid"])

    def test_fill_action_metric_is_invalid_without_last_action(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "singleFill": {
                "lastActionDurationMs": 11,
                "blackPixelRatio": 0.12,
            },
        }

        metric = benchmark.build_suite_benchmark_metrics(suite)["firstInteraction"]["singleFillAction"]
        self.assertFalse(metric["present"])
        self.assertIsNone(metric["durationMs"])
        self.assertEqual(metric["details"]["validity"]["reason"], "missing-last-action")

    def test_editor_metric_validity_report_groups_interaction_validity(self):
        benchmark = load_editor_benchmark_module()
        suites = {
            "tno_1962": {
                "benchmarkMetrics": {
                    "firstInteraction": {
                        "singleFillAction": {
                            "details": {"validity": {"valid": False, "reason": "missing-last-action"}}
                        },
                        "doubleClickFillAction": {
                            "details": {"validity": {"valid": True, "reason": "recorded-action"}}
                        },
                    }
                }
            }
        }

        validity = benchmark.build_metric_validity_by_scenario(suites)
        self.assertFalse(validity["tno_1962"]["firstInteraction"]["singleFillAction"]["valid"])
        self.assertEqual(
            validity["tno_1962"]["firstInteraction"]["singleFillAction"]["reason"],
            "missing-last-action",
        )

    def test_wheel_anchor_metric_prefers_last_wheel_clock_and_keeps_legacy_fallback(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "wheelAnchorTrace": {
                "requestedScenarioId": "tno_1962",
                "firstIdleAfterWheelMs": 900,
                "firstIdleAfterLastWheelMs": 123,
                "maxBlackPixelRatio": 0.1,
            },
        }

        metric = benchmark.build_suite_benchmark_metrics(suite)["wheelAnchorTrace"]
        self.assertEqual(metric["durationMs"], 123)
        self.assertEqual(metric["details"]["firstIdleAfterWheelMs"], 900)
        self.assertEqual(metric["details"]["firstIdleAfterLastWheelMs"], 123)
        self.assertEqual(metric["details"]["maxBlackPixelRatio"], 0.1)
        self.assertTrue(metric["details"]["sameScenario"])

        del suite["wheelAnchorTrace"]["firstIdleAfterLastWheelMs"]
        fallback_metric = benchmark.build_suite_benchmark_metrics(suite)["wheelAnchorTrace"]
        self.assertEqual(fallback_metric["durationMs"], 900)
        self.assertIsNone(fallback_metric["details"]["firstIdleAfterLastWheelMs"])

    def test_zoom_end_chunk_visible_metric_preserves_end_to_visible_duration(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "zoomEndChunkVisible": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "renderMetrics": {
                    "scenarioChunkPromotionVisualStage": {
                        "durationMs": 12,
                        "recordedAt": 300,
                        "activeScenarioId": "tno_1962",
                        "reason": "zoom-end",
                    },
                    "zoomEndToChunkVisibleMs": {
                        "durationMs": 850,
                        "recordedAt": 200,
                        "scenarioId": "tno_1962",
                    },
                },
                "runtimeChunkLoadState": {
                    "lastZoomEndToChunkVisibleMetric": {
                        "durationMs": 910,
                        "recordedAt": 190,
                        "scenarioId": "tno_1962",
                    },
                },
                "metricBaselines": {
                    "scenarioChunkPromotionVisualStageRecordedAt": 0,
                    "zoomEndToChunkVisibleRecordedAt": 0,
                    "lastZoomEndToChunkVisibleRecordedAt": 0,
                },
            },
        }

        metric = benchmark.build_suite_benchmark_metrics(suite)["zoomEndToChunkVisible"]
        self.assertEqual(metric["durationMs"], 850)
        self.assertEqual(metric["source"], "zoomEndChunkVisible.renderMetrics.zoomEndToChunkVisibleMs")
        self.assertEqual(metric["details"]["selectedVia"], "fresh-same-scenario")
        self.assertIn(
            "zoomEndChunkVisible.renderMetrics.scenarioChunkPromotionVisualStage",
            metric["details"]["candidateSources"],
        )

        del suite["zoomEndChunkVisible"]["renderMetrics"]["zoomEndToChunkVisibleMs"]
        runtime_metric = benchmark.build_suite_benchmark_metrics(suite)["zoomEndToChunkVisible"]
        self.assertEqual(runtime_metric["durationMs"], 910)
        self.assertEqual(
            runtime_metric["source"],
            "zoomEndChunkVisible.runtimeChunkLoadState.lastZoomEndToChunkVisibleMetric",
        )

        del suite["zoomEndChunkVisible"]["runtimeChunkLoadState"]["lastZoomEndToChunkVisibleMetric"]
        visual_fallback_metric = benchmark.build_suite_benchmark_metrics(suite)["zoomEndToChunkVisible"]
        self.assertEqual(visual_fallback_metric["durationMs"], 12)
        self.assertEqual(visual_fallback_metric["source"], "zoomEndChunkVisible.renderMetrics.scenarioChunkPromotionVisualStage")
        self.assertEqual(visual_fallback_metric["details"]["selectedVia"], "visual-stage-fallback")

class SettleExactMetricOwnershipTest(unittest.TestCase):
    def test_settle_exact_metric_ignores_legacy_fast_exact_and_keeps_skip_probe(self):
        benchmark = load_editor_benchmark_module()
        suite = {
            "scenarioId": "tno_1962",
            "scenarioApply": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
            },
            "zoomSettleFullRedraw": {
                "requestedScenarioId": "tno_1962",
                "activeScenarioId": "tno_1962",
                "metricBaselines": {
                    "settleExactRefreshRecordedAt": 100,
                    "settlePoliticalFastExactRecordedAt": 100,
                    "settlePoliticalFastExactSkippedRecordedAt": 100,
                },
                "renderMetrics": {
                    "settleExactRefresh": {
                        "durationMs": 320,
                        "recordedAt": 200,
                        "activeScenarioId": "tno_1962",
                    },
                    "settlePoliticalFastExact": {
                        "durationMs": 12,
                        "recordedAt": 300,
                        "activeScenarioId": "tno_1962",
                    },
                    "settlePoliticalFastExactSkipped": {
                        "durationMs": 0,
                        "recordedAt": 250,
                        "activeScenarioId": "tno_1962",
                        "reason": "defer-to-sliced-exact-refresh",
                    },
                },
            },
        }
        metric = benchmark.build_suite_benchmark_metrics(suite)["fullySettled"]["settleExactRefresh"]
        self.assertEqual(metric["durationMs"], 320)
        self.assertEqual(metric["source"], "zoomSettleFullRedraw.renderMetrics.settleExactRefresh")
        self.assertNotIn("settlePoliticalFastExact", metric["details"].get("candidateSources", []))
        script = EDITOR_BENCHMARK_SCRIPT.read_text(encoding="utf-8")
        self.assertIn("settlePoliticalFastExactSkipped", script)
        self.assertNotIn('"zoomSettleFullRedraw.renderMetrics.settlePoliticalFastExact"', script)


if __name__ == "__main__":
    unittest.main()
