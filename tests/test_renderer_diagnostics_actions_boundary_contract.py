from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
ACTION_MODULE = REPO_ROOT / "js/core/state/actions/renderer_diagnostics_actions.js"
PERF_METRICS_OWNER = REPO_ROOT / "js/core/renderer/render_perf_metrics_runtime_owner.js"
MAP_RENDERER = REPO_ROOT / "js/core/map_renderer.js"
STARTUP_SUPPORT = REPO_ROOT / "js/bootstrap/startup_bootstrap_support.js"
SCENARIO_CHUNK_RUNTIME = REPO_ROOT / "js/core/scenario/chunk_runtime.js"
RUNTIME_CONTEXT = REPO_ROOT / "js/core/map_renderer/renderer_runtime_context.js"
PUBLIC_FACADE = REPO_ROOT / "js/core/map_renderer/public.js"
STATE_WRITER_ALLOWLIST = REPO_ROOT / "tools/eslint-rules/state-writer-allowlist.json"


DIAGNOSTICS_ACTION_IMPORT = "renderer_diagnostics_actions.js"
DIAGNOSTICS_KEYS = {
    "renderPerfMetrics",
    "renderPerfMetricSequence",
    "firstVisibleFramePainted",
    "projectedBoundsDiagnostics",
    "debugCountryCoverage",
}
ACTION_NAMES = {
    "ensureRenderPerfMetricsState",
    "setRenderPerfMetricEntryState",
    "setRenderPerfContextBreakdownState",
    "commitRenderPerfMetricState",
    "setFirstVisibleFramePaintedState",
    "resetProjectedBoundsDiagnosticsState",
    "setProjectedBoundsDiagnosticsState",
    "setDebugCountryCoverageState",
}


def assigned_target_keys(source):
    return set(re.findall(r"\btarget\.([A-Za-z_$][\w$]*)\s*=(?!=)", source))


def direct_runtime_writes(source):
    key_pattern = "|".join(sorted(map(re.escape, DIAGNOSTICS_KEYS)))
    return re.findall(
        rf"\b(?:runtimeState|state|appState)\.(?:{key_pattern})\s*(?:=(?!=)|\+=|-=|\+\+|--)",
        source,
    )


def function_body(source, function_name):
    match = re.search(rf"\bfunction\s+{re.escape(function_name)}\s*\(", source)
    if not match:
        raise AssertionError(f"missing function {function_name}")
    parameter_start = source.index("(", match.start())
    depth = 0
    parameter_end = None
    for index in range(parameter_start, len(source)):
        token = source[index]
        if token == "(":
            depth += 1
        elif token == ")":
            depth -= 1
            if depth == 0:
                parameter_end = index
                break
    if parameter_end is None:
        raise AssertionError(f"unterminated parameters for {function_name}")
    body_start = source.index("{", parameter_end)
    depth = 0
    for index in range(body_start, len(source)):
        token = source[index]
        if token == "{":
            depth += 1
        elif token == "}":
            depth -= 1
            if depth == 0:
                return source[body_start + 1:index]
    raise AssertionError(f"unterminated body for {function_name}")


class RendererDiagnosticsActionsBoundaryContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.actions = ACTION_MODULE.read_text(encoding="utf-8")
        cls.perf_metrics_owner = PERF_METRICS_OWNER.read_text(encoding="utf-8")
        cls.map_renderer = MAP_RENDERER.read_text(encoding="utf-8")
        cls.startup_support = STARTUP_SUPPORT.read_text(encoding="utf-8")
        cls.scenario_chunk_runtime = SCENARIO_CHUNK_RUNTIME.read_text(encoding="utf-8")

    def test_canonical_action_module_is_import_free_target_first_and_key_bounded(self):
        self.assertFalse(re.search(r"^\s*import\s", self.actions, re.MULTILINE))
        self.assertEqual(assigned_target_keys(self.actions), DIAGNOSTICS_KEYS)
        for action_name in ACTION_NAMES:
            self.assertRegex(
                self.actions,
                rf"export function {re.escape(action_name)}\(\s*target(?:\s*,|\s*\))",
            )
        for forbidden_token in (
            "map_renderer",
            "runtimeState",
            "globalThis",
            "document",
            "window",
            "requestAnimationFrame",
            "Date.now",
        ):
            self.assertNotIn(forbidden_token, self.actions)

    def test_map_renderer_delegates_diagnostics_root_writes_to_actions(self):
        self.assertIn(
            'from "./state/actions/renderer_diagnostics_actions.js";',
            self.map_renderer,
        )
        for action_name in ACTION_NAMES:
            self.assertIn(action_name, self.map_renderer)
        self.assertEqual(direct_runtime_writes(self.map_renderer), [])

    def test_map_renderer_wires_perf_metrics_owner_factory_and_thin_wrappers(self):
        self.assertIn(
            'from "./renderer/render_perf_metrics_runtime_owner.js";',
            self.map_renderer,
        )
        factory_body = function_body(self.map_renderer, "getRenderPerfMetricsRuntimeOwner")
        for dependency in (
            "contextBreakdownMetricNames: CONTEXT_BREAKDOWN_METRIC_NAMES",
            "getRenderPerfMetrics: () => runtimeState.renderPerfMetrics",
            "getRenderPerfMetricSequence: () => runtimeState.renderPerfMetricSequence",
            "nowMs: () => Date.now()",
            "ensureRenderPerfMetricsState(runtimeState)",
            "commitRenderPerfMetricState(runtimeState, payload)",
            "setRenderPerfContextBreakdownState(runtimeState, breakdown)",
            "globalThis.__renderPerfMetrics = metrics",
        ):
            self.assertIn(dependency, factory_body)

        for wrapper_name in (
            "ensureRenderPerfMetrics",
            "recordRenderPerfMetric",
            "beginContextMetricSession",
            "collectContextMetric",
            "endContextMetricSession",
            "resetContextBreakdownForExactFrame",
        ):
            body = function_body(self.map_renderer, wrapper_name)
            self.assertIn(
                f"getRenderPerfMetricsRuntimeOwner().{wrapper_name}(",
                body,
            )
            self.assertEqual(body.count("return "), 1, wrapper_name)
            self.assertNotRegex(body, r"\b(?:if|for|while|switch|try)\b")

    def test_startup_and_scenario_chunk_metrics_delegate_without_losing_mirrors(self):
        for source, import_path in (
            (
                self.startup_support,
                '../core/state/actions/renderer_diagnostics_actions.js',
            ),
            (
                self.scenario_chunk_runtime,
                '../state/actions/renderer_diagnostics_actions.js',
            ),
        ):
            self.assertIn(import_path, source)
            self.assertIn("setRenderPerfMetricEntryState(runtimeState", source)
            self.assertIn("globalThis.__renderPerfMetrics", source)
            self.assertEqual(direct_runtime_writes(source), [])

    def test_metric_orchestration_lives_in_owner_and_actions_remain_constant_time(self):
        for owner_token in (
            "const nextSequence =",
            "const nextEntry = {",
            "name: normalizedName",
            "entry: nextEntry",
            "mirrorRenderPerfMetrics(metrics)",
        ):
            self.assertIn(owner_token, self.perf_metrics_owner)
        for action_name in ACTION_NAMES:
            body = function_body(self.actions, action_name)
            self.assertNotRegex(
                body,
                r"\b(?:for|while|do)\b|\.forEach\s*\(|\.map\s*\(|\.reduce\s*\(",
                action_name,
            )
        self.assertIn("new globalThis.PerformanceObserver", self.startup_support)
        self.assertIn("recordedAt: Date.now()", self.startup_support)
        self.assertIn("recordedAt: Date.now()", self.scenario_chunk_runtime)

    def test_runtime_context_public_facade_and_legacy_allowlist_do_not_expose_actions(self):
        for protected_path in (RUNTIME_CONTEXT, PUBLIC_FACADE, STATE_WRITER_ALLOWLIST):
            protected_source = protected_path.read_text(encoding="utf-8")
            self.assertNotIn(DIAGNOSTICS_ACTION_IMPORT, protected_source)
            self.assertNotIn("renderer_diagnostics_actions", protected_source)


if __name__ == "__main__":
    unittest.main()
