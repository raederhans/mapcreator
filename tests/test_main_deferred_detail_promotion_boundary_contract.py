from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAIN_JS = REPO_ROOT / "js" / "main.js"
DEFERRED_DETAIL_PROMOTION_JS = REPO_ROOT / "js" / "bootstrap" / "deferred_detail_promotion.js"


class MainDeferredDetailPromotionBoundaryContractTest(unittest.TestCase):
    def test_main_imports_deferred_detail_promotion_owner(self):
        content = MAIN_JS.read_text(encoding="utf-8")

        self.assertIn("./bootstrap/deferred_detail_promotion.js", content.replace('"', "'"))
        self.assertIn("createDeferredDetailPromotionOwner", content)
        self.assertIn("let deferredDetailPromotionOwner = null;", content)
        self.assertIn("function getDeferredDetailPromotionOwner() {", content)

    def test_owner_keeps_detail_promotion_transaction_and_internal_handles(self):
        donor_content = MAIN_JS.read_text(encoding="utf-8")
        owner_content = DEFERRED_DETAIL_PROMOTION_JS.read_text(encoding="utf-8")

        self.assertIn("const MAX_FORCED_STARTUP_INFRA_RETRIES = 2;", owner_content)
        self.assertIn("let deferredPromotionHandle = null;", owner_content)
        self.assertIn("let forcedStartupReadonlyInfraRetryCount = 0;", owner_content)
        self.assertIn("export function createDeferredDetailPromotionOwner({", owner_content)
        self.assertIn("function hasDetailTopologyLoaded()", owner_content)
        self.assertIn("function prioritizeViewportFocusCountry({", owner_content)
        self.assertIn("function syncScenarioReadyUiAfterDetailPromotion()", owner_content)
        self.assertIn("function applyDetailPromotionMapRefresh({", owner_content)
        self.assertIn("async function ensureDetailTopologyReady({", owner_content)
        self.assertIn("async function unlockStartupReadonlyWithDetail(renderDispatcher)", owner_content)
        self.assertIn("function scheduleStartupReadonlyUnlock(", owner_content)
        self.assertIn("function scheduleDeferredDetailPromotion(renderDispatcher)", owner_content)
        self.assertIn("loadDeferredDetailBundle({", owner_content)
        self.assertIn("refreshScenarioDataHealth({", owner_content)
        self.assertIn("buildInteractionInfrastructureAfterStartup({", owner_content)
        self.assertIn("getDeferredPromotionDelay(runtimeState.renderProfile)", owner_content)
        self.assertIn("schedulePostReadyPoliticalReconcile", donor_content)
        self.assertIn("schedulePostReadyPoliticalReconcile", owner_content)

        self.assertNotIn("loadDeferredDetailBundle({", donor_content)
        self.assertNotIn("refreshScenarioDataHealth({", donor_content)
        self.assertNotIn("getDeferredPromotionDelay(runtimeState.renderProfile)", donor_content)

    def test_detail_promotion_recolors_then_defers_political_reconcile(self):
        owner_content = DEFERRED_DETAIL_PROMOTION_JS.read_text(encoding="utf-8")
        donor_content = MAIN_JS.read_text(encoding="utf-8")

        self.assertIn(
            "refreshMapDataForScenarioApply({ suppressRender: true, recolorAllFeatures: true });",
            owner_content,
        )
        detail_refresh_source = owner_content[
            owner_content.index("function applyDetailPromotionMapRefresh({"):
            owner_content.index("/**", owner_content.index("function applyDetailPromotionMapRefresh({"))
        ]
        active_scenario_refresh_source = detail_refresh_source[
            detail_refresh_source.index("if (hasActiveScenario) {"):
            detail_refresh_source.index("setMapData({", detail_refresh_source.index("if (hasActiveScenario) {"))
        ]
        self.assertIn(
            "refreshMapDataForScenarioApply({ suppressRender: true, recolorAllFeatures: true });",
            active_scenario_refresh_source,
        )
        self.assertNotIn("setMapData(", active_scenario_refresh_source)
        self.assertNotIn("setMapData-fallback", detail_refresh_source)
        self.assertNotIn("falling back to setMapData", detail_refresh_source)
        self.assertNotIn("catch (error)", detail_refresh_source)
        self.assertNotIn("forcePoliticalFullRepaint", owner_content)
        self.assertNotIn("detail-promotion-force", owner_content)
        self.assertRegex(
            owner_content,
            re.compile(
                r"runtimeState\.detailPromotionCompleted = true;\s*"
                r"if \(mapDataRefreshed\) \{\s*"
                r"schedulePostReadyPoliticalReconcile\?\.\(\"detail-topology-ready\"\);",
                re.S,
            ),
        )
        self.assertRegex(
            owner_content,
            re.compile(
                r"const refreshMode = applyDetailPromotionMapRefresh\([\s\S]*?"
                r"mapDataRefreshed = true;[\s\S]*?"
                r"schedulePostReadyPoliticalReconcile\?\.\(\"detail-topology-promoted\"\);",
                re.S,
            ),
        )
        self.assertIn(
            'const POST_READY_DETAIL_PROMOTION_POLITICAL_RECONCILE_TASK_KEY = "post-ready-detail-promotion-political-reconcile";',
            donor_content,
        )
        self.assertRegex(
            donor_content,
            re.compile(
                r"function schedulePostReadyPoliticalReconcile\(reason = \"detail-promotion-political-reconcile\"\) \{[\s\S]*?"
                r"if \(!runtimeState\.detailPromotionCompleted\) \{[\s\S]*?"
                r"return false;[\s\S]*?"
                r"return schedulePostReadyPoliticalReconcileTask\(reason\);",
                re.S,
            ),
        )
        self.assertIn("schedulePostReadyPoliticalReconcileTask(normalizedReason);", donor_content)

    def test_main_keeps_wrappers_and_ready_state_facade(self):
        donor_content = MAIN_JS.read_text(encoding="utf-8")

        self.assertIn("return getDeferredDetailPromotionOwner().hasDetailTopologyLoaded();", donor_content)
        self.assertIn("return getDeferredDetailPromotionOwner().ensureDetailTopologyReady({", donor_content)
        self.assertIn("return getDeferredDetailPromotionOwner().unlockStartupReadonlyWithDetail(renderDispatcher);", donor_content)
        self.assertIn("return getDeferredDetailPromotionOwner().scheduleStartupReadonlyUnlock(renderDispatcher, {", donor_content)
        self.assertIn("const deferredDetailPromotion = getDeferredDetailPromotionOwner();", donor_content)
        self.assertIn("return deferredDetailPromotion.scheduleDeferredDetailPromotion(renderDispatcher);", donor_content)
        self.assertIn("async function finalizeReadyState(renderDispatcher) {", donor_content)
        self.assertIn("scheduleStartupReadonlyUnlock(renderDispatcher);", donor_content)
        self.assertIn("scheduleDeferredDetailPromotion(renderDispatcher);", donor_content)
        self.assertIn("await finalizeReadyState(renderDispatcher);", donor_content)
        self.assertIsNone(re.search(r"function\s+prioritizeViewportFocusCountry\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+applyDetailPromotionMapRefresh\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+syncScenarioReadyUiAfterDetailPromotion\s*\(", donor_content))


if __name__ == "__main__":
    unittest.main()
