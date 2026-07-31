import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCHEDULER_PATH = ROOT / "js/core/map_renderer/exact_after_settle_scheduler.js"
ACTION_MODULE_PATH = ROOT / "js/core/state/actions/renderer_exact_refresh_actions.js"


class RendererExactRefreshActionsBoundaryContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scheduler_source = SCHEDULER_PATH.read_text(encoding="utf-8")
        cls.action_source = ACTION_MODULE_PATH.read_text(encoding="utf-8")

    def test_scheduler_imports_exact_refresh_actions_directly(self):
        self.assertIn(
            'from "../state/actions/renderer_exact_refresh_actions.js";',
            self.scheduler_source,
        )
        for action_name in (
            "beginExactAfterSettleControllerApplyState",
            "beginExactAfterSettleControllerFinalizeState",
            "beginExactAfterSettleControllerScheduleState",
            "captureExactAfterSettleControllerState",
            "replaceExactAfterSettlePendingPlanState",
            "completeExactAfterSettleControllerApplyState",
            "ensureExactAfterSettleControllerState",
            "isExactAfterSettleControllerActiveState",
            "isExactAfterSettleGenerationCurrentState",
            "refreshExactAfterSettleControllerIdentityState",
            "resetExactAfterSettleControllerState",
            "setDeferExactAfterSettleState",
            "setExactAfterSettleHandleState",
            "setPendingExactPoliticalFastFrameState",
        ):
            self.assertIn(f"export function {action_name}(", self.action_source)
            self.assertIn(action_name, self.scheduler_source)

    def test_scheduler_has_no_direct_exact_refresh_root_writes(self):
        direct_root_write = re.compile(
            r"runtimeState\.(?:"
            r"deferExactAfterSettle|"
            r"exactAfterSettleHandle|"
            r"exactAfterSettleController|"
            r"pendingExactPoliticalFastFrame"
            r")\s*="
        )
        self.assertIsNone(direct_root_write.search(self.scheduler_source))

    def test_scheduler_has_no_direct_controller_transition_or_identity_writes(self):
        direct_controller_write = re.compile(
            r"controller\.(?:"
            r"phase|reason|pendingPlan|applyStartedAt|applyFinishedAt|"
            r"scenarioId|selectionVersion|topologyRevision|dpr|pixelWidth|"
            r"pixelHeight|colorRevision|contextFlagSignature|zoomToken|transformBucket"
            r")\s*="
        )
        self.assertIsNone(direct_controller_write.search(self.scheduler_source))
        self.assertNotRegex(
            self.scheduler_source,
            r"Object\.assign\(controller,\s*\{[^}]*\b(?:phase|reason|pendingPlan)\s*:",
        )

    def test_scheduler_keeps_plan_parameters_immutable(self):
        self.assertNotRegex(
            self.scheduler_source,
            r"\bplan\.[A-Za-z_$][\w$]*\s*=(?!=)",
        )

    def test_scheduler_returns_detached_controller_snapshots_and_scalar_schedule_generation(self):
        controller_reader = self.scheduler_source.split(
            "function getExactAfterSettleControllerState()", 1
        )[1].split("function getTransformBucketSignature", 1)[0]
        self.assertIn("ensureExactAfterSettleControllerState(runtimeState);", controller_reader)
        self.assertIn("return captureExactAfterSettleControllerState(runtimeState);", controller_reader)
        self.assertNotIn("const controller = runtimeState.exactAfterSettleController;", controller_reader)
        self.assertNotIn("return runtimeState.exactAfterSettleController", controller_reader)

        schedule_bridge = self.scheduler_source.split(
            "function beginExactAfterSettleControllerSchedule(scheduleStartedAt)", 1
        )[1].split("function isExactAfterSettleGenerationCurrent", 1)[0]
        self.assertIn("return beginExactAfterSettleControllerScheduleState(", schedule_bridge)
        self.assertNotIn("return getExactAfterSettleControllerState()", schedule_bridge)

        identity_bridge = self.scheduler_source.split(
            "function assignExactAfterSettleIdentity(", 1
        )[1].split("function isExactAfterSettleIdentityCurrent", 1)[0]
        self.assertNotIn("controller", identity_bridge.split(") {", 1)[0])
        self.assertIn("return refreshExactAfterSettleControllerIdentityState(", identity_bridge)


if __name__ == "__main__":
    unittest.main()
