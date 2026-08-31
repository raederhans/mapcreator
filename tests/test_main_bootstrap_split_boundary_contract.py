from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAIN_JS = REPO_ROOT / "js" / "main.js"
STARTUP_BOOTSTRAP_SUPPORT_JS = REPO_ROOT / "js" / "bootstrap" / "startup_bootstrap_support.js"
STARTUP_FAILURE_RECOVERY_JS = REPO_ROOT / "js" / "bootstrap" / "startup_failure_recovery.js"


class MainBootstrapSplitBoundaryContractTest(unittest.TestCase):
    def test_main_imports_startup_bootstrap_support(self):
        content = MAIN_JS.read_text(encoding="utf-8")

        self.assertIn('./bootstrap/startup_bootstrap_support.js', content.replace('"', "'"))
        self.assertIn('./bootstrap/startup_data_pipeline.js', content.replace('"', "'"))
        self.assertIn('./bootstrap/startup_boot_overlay.js', content.replace('"', "'"))
        self.assertIn('./bootstrap/deferred_detail_promotion.js', content.replace('"', "'"))
        self.assertIn('./bootstrap/startup_scenario_boot.js', content.replace('"', "'"))
        self.assertIn("warnOnStartupBundleIntegrity", content)
        self.assertIn("createDeferredDetailPromotionOwner", content)
        self.assertIn("createStartupDataPipelineOwner", content)
        self.assertIn("createStartupScenarioBootOwner", content)

    def test_main_lazily_loads_startup_scenario_and_sample_deeplink_modules(self):
        content = MAIN_JS.read_text(encoding="utf-8")

        self.assertNotIn('from "./bootstrap/startup_scenario_boot.js";', content)
        self.assertNotIn('from "./bootstrap/startup_sample_project_deeplink.js";', content)
        self.assertEqual(content.count('import("./bootstrap/startup_scenario_boot.js")'), 1)
        self.assertEqual(content.count('import("./bootstrap/startup_sample_project_deeplink.js")'), 1)
        self.assertIn("startupScenarioBootOwnerLoader.loadValueOnce();", content)
        self.assertIn("startupScenarioBootOwnerLoader.preload();", content)
        self.assertIn("return runOptionalStartupTask({", content)
        self.assertLess(
            content.index("if (isUiShellDebugMode()) {"),
            content.index("startupScenarioBootOwnerLoader.preload();"),
        )
        self.assertLess(
            content.index("startupScenarioBootOwnerLoader.preload();"),
            content.index("await startupDataPipeline.loadStartupBaseData({"),
        )
        self.assertLess(
            content.index('assertStartupFirstVisibleFrameAccepted("bootstrap-first-political-frame");'),
            content.index("await finalizeReadyState(renderDispatcher);"),
        )
        self.assertLess(
            content.index("await finalizeReadyState(renderDispatcher);"),
            content.index("void observeUiHydration();"),
        )
        ui_observer_index = content.index("getStartupReadyHandoffOwner().observePostReadyUiBootstrap(")
        ui_ready_handler_index = content.index("handleUiBootstrapReady: async () => {", ui_observer_index)
        ui_ready_sample_index = content.index(
            "void tryScheduleStartupSampleProjectDeeplink();",
            ui_ready_handler_index,
        )
        self.assertLess(ui_observer_index, ui_ready_handler_index)
        self.assertLess(ui_ready_handler_index, ui_ready_sample_index)
        self.assertIn('deferredUiBootstrapper.setInteractionState("ready");', content)
        self.assertNotIn("await startupUiBootstrapPromise;", content)

    def test_startup_bootstrap_support_owns_startup_helpers(self):
        donor_content = MAIN_JS.read_text(encoding="utf-8")
        owner_content = STARTUP_BOOTSTRAP_SUPPORT_JS.read_text(encoding="utf-8")

        self.assertIn("export function processHierarchyData(data)", owner_content)
        self.assertIn("export function hydrateLanguage()", owner_content)
        self.assertIn("export function createRenderDispatcher(renderFn)", owner_content)
        self.assertIn("export function getConfiguredDefaultScenarioId()", owner_content)
        self.assertIn("export function createStartupBundleLoadDiagnostics({", owner_content)
        self.assertIn("export function createStartupBootArtifactsOverride({", owner_content)
        self.assertIn("export async function postStartupSupportKeyUsageReport({ scenarioId = \"\", source = \"\" } = {})", owner_content)

        self.assertIsNone(re.search(r"function\s+processHierarchyData\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+hydrateLanguage\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+createRenderDispatcher\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+getConfiguredDefaultScenarioId\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+createStartupBundleLoadDiagnostics\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+createStartupBootArtifactsOverride\s*\(", donor_content))

    def test_main_keeps_bootstrap_entry_and_overlay_facade(self):
        content = MAIN_JS.read_text(encoding="utf-8")

        self.assertIn("runtimeState: state,", content)
        self.assertIn("function requestMainRender(reason = \"\", { flush = false } = {}) {", content)
        self.assertIn("const bootOverlayController = createStartupBootOverlayController();", content)
        self.assertIn("const startupDataPipeline = getStartupDataPipelineOwner();", content)
        self.assertIn("const deferredDetailPromotion = getDeferredDetailPromotionOwner();", content)
        self.assertIn("const startupScenarioBoot = await getStartupScenarioBootOwner();", content)
        self.assertIn("startupDataPipeline.resolveStartupScenarioBootstrap({ d3Client });", content)
        self.assertIn("startupDataPipeline.loadStartupBaseData({", content)
        self.assertIn("startupDataPipeline.hydrateStartupBaseState({", content)
        self.assertIn("startupDataPipeline.decodeStartupPrimaryCollections({", content)
        self.assertIn("deferredDetailPromotion.scheduleDeferredDetailPromotion(renderDispatcher);", content)
        self.assertIn("startupScenarioBoot.runStartupScenarioBoot({", content)
        self.assertIn("async function bootstrap()", content)
        self.assertIn("bootstrap();", content)

    def test_main_keeps_ui_hydration_failure_orthogonal_to_startup_recovery(self):
        content = MAIN_JS.read_text(encoding="utf-8")
        failure_recovery_content = STARTUP_FAILURE_RECOVERY_JS.read_text(encoding="utf-8")

        self.assertIn("async function rollbackStartupScenarioToBaseMap() {", content)
        self.assertIn('const { clearActiveScenario } = await import("./core/scenario_manager.js");', content)
        self.assertNotIn("let startupUiBootstrapPromise = null;", content)
        self.assertIn("let uiHydrationObservation = null;", content)
        self.assertIn("getStartupUiBootstrapPromise: deferredUiBootstrapper.getPromise,", content)
        self.assertIn("void deferredUiBootstrapper.bootstrapDeferredUi(renderApp);", content)
        self.assertIn("bootstrapDeferredUi,", content)
        self.assertIn("if (!deferredUiBootstrapper.getPromise() || uiHydrationObservation)", content)
        self.assertIn("getStartupReadyHandoffOwner().observePostReadyUiBootstrap(", content)
        self.assertIn('deferredUiBootstrapper.setInteractionState("failed");', content)
        self.assertIn("async function tryScheduleStartupSampleProjectDeeplink()", content)
        self.assertNotIn("pausePostReadyWorkForUiFailure", content)
        self.assertIn("startupUiBootstrapPromise: null,", content)
        self.assertIn("startupUiBootstrapAwaited: true,", content)
        self.assertIn("startupUiBootstrapFailed: false,", content)
        self.assertIn("if (startupUiBootstrapPromise && !startupUiBootstrapAwaited) {", failure_recovery_content)
        self.assertIn("await helpers.rollbackStartupScenarioToBaseMap();", failure_recovery_content)
        self.assertIn("allowDuringBootBlocking: true,", content)

    def test_startup_bootstrap_support_keeps_runtime_contracts(self):
        owner_content = STARTUP_BOOTSTRAP_SUPPORT_JS.read_text(encoding="utf-8")

        self.assertIn('const STARTUP_SUPPORT_AUDIT_REPORT_URL = "/__dev/startup-support/key-usage-report";', owner_content)
        self.assertIn("export function configureStartupSupportKeyUsageAudit()", owner_content)
        self.assertIn("setStartupSupportKeyUsageAuditEnabled(isStartupSupportAuditEnabled());", owner_content)
        self.assertIn("consumeStartupSupportKeyUsageAuditReport()", owner_content)
        self.assertIn("hydrateHierarchyState(state, data, {", owner_content)
        self.assertIn("setCurrentLanguage(state, storedLang);", owner_content)
        self.assertIn("hydrateStoredViewSettings(state, parsed, { normalizeCityLayerStyleConfig });", owner_content)
        self.assertIn("const hasScenarioRuntimeBootstrap = hasScenarioRuntimeShellContract({", owner_content)


if __name__ == "__main__":
    unittest.main()
