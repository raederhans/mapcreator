from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
BOOT_STATE_JS = REPO_ROOT / "js" / "core" / "state" / "boot_state.js"
BOOT_ACTIONS_JS = REPO_ROOT / "js" / "core" / "state" / "actions" / "boot_actions.js"


class BootStateActionsBoundaryContractTest(unittest.TestCase):
    def test_canonical_action_module_owns_boot_mutations(self):
        actions_content = BOOT_ACTIONS_JS.read_text(encoding="utf-8")

        required_exports = (
            "setStartupInteractionMode",
            "setBootPreviewVisibleState",
            "commitStartupReadonlyStateFields",
            "clearStartupReadonlyStateFields",
            "clearStartupReadonlyStateForReason",
            "setBootStateFields",
            "replaceBootMetricsState",
            "replaceStartupBootCacheState",
            "setStartupScenarioBootstrapCacheStatus",
            "replaceSampleProjectDeeplinkState",
            "setActivePostReadyTask",
            "clearActivePostReadyTask",
            "replacePostReadyTaskDiagnostics",
            "setLongAnimationFrameObserver",
            "setStartupInitialScenarioChunkVisualPromotion",
            "setUiShellDebugState",
            "setUiShellDebugTerritorySeededState",
        )
        for export_name in required_exports:
            self.assertRegex(
                actions_content,
                rf"export function {re.escape(export_name)}\(\s*target(?:,|\))",
            )

        self.assertNotRegex(actions_content, re.compile(r"^\s*import\s", re.MULTILINE))
        self.assertNotIn("Date.now", actions_content)
        self.assertNotIn("runtimeState", actions_content)
        self.assertNotIn("document", actions_content)
        self.assertNotIn("window", actions_content)
        self.assertNotIn("globalThis", actions_content)
        self.assertNotIn("callRuntimeHook", actions_content)
        self.assertNotIn("recordRenderPerfMetric", actions_content)

    def test_boot_state_keeps_defaults_normalization_and_compatibility_wrappers(self):
        state_content = BOOT_STATE_JS.read_text(encoding="utf-8")

        self.assertIn("export function createDefaultStartupBootCacheState()", state_content)
        self.assertIn("export function createDefaultSampleProjectDeeplinkState()", state_content)
        self.assertIn("export function createDefaultBootState()", state_content)
        self.assertIn("function normalizeStartupInteractionMode(", state_content)
        self.assertIn("since = Date.now()", state_content)
        self.assertIn("...createDefaultStartupBootCacheState(),", state_content)
        self.assertIn("...(", state_content)
        self.assertIn('from "./actions/boot_actions.js";', state_content)

        mutating_assignments = re.findall(
            r"\btarget\.(?:"
            r"bootPhase|bootMessage|bootProgress|bootBlocking|bootPreviewVisible|"
            r"bootError|bootCanContinueWithoutScenario|startupInteractionMode|"
            r"startupReadonly|startupReadonlyReason|startupReadonlyUnlockInFlight|"
            r"startupReadonlySince|bootMetrics|startupBootCacheState|"
            r"sampleProjectDeeplink|activePostReadyTaskKey|"
            r"activePostReadyTaskStartedAt|postReadyTaskDiagnostics|"
            r"longAnimationFrameObserver|startupInitialScenarioChunkVisualPromotion|"
            r"uiShellDebug|uiShellDebugTerritorySeeded"
            r")\s*=",
            state_content,
        )
        self.assertEqual(mutating_assignments, [])

    def test_boot_action_surface_covers_all_p4_1_keys(self):
        actions_content = BOOT_ACTIONS_JS.read_text(encoding="utf-8")
        expected_keys = {
            "bootPhase",
            "bootMessage",
            "bootProgress",
            "bootBlocking",
            "bootPreviewVisible",
            "bootError",
            "bootCanContinueWithoutScenario",
            "startupInteractionMode",
            "startupReadonly",
            "startupReadonlyReason",
            "startupReadonlyUnlockInFlight",
            "startupReadonlySince",
            "bootMetrics",
            "startupBootCacheState",
            "sampleProjectDeeplink",
            "activePostReadyTaskKey",
            "activePostReadyTaskStartedAt",
            "postReadyTaskDiagnostics",
            "longAnimationFrameObserver",
            "startupInitialScenarioChunkVisualPromotion",
            "uiShellDebug",
            "uiShellDebugTerritorySeeded",
        }
        observed_keys = set(re.findall(r"\btarget\.([A-Za-z_$][\w$]*)\s*=", actions_content))
        self.assertEqual(observed_keys, expected_keys)


if __name__ == "__main__":
    unittest.main()
