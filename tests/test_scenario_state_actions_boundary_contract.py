from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
ACTIONS_ROOT = REPO_ROOT / "js" / "core" / "state" / "actions"
PIPELINE_JS = REPO_ROOT / "js" / "core" / "scenario_apply_pipeline.js"
MANAGER_JS = REPO_ROOT / "js" / "core" / "scenario_manager.js"
RESOURCES_JS = REPO_ROOT / "js" / "core" / "scenario_resources.js"
ROLLBACK_JS = REPO_ROOT / "js" / "core" / "scenario_rollback.js"
DELEGATION_CONTRACT = REPO_ROOT / "tools" / "state_action_delegation_contract.mjs"


ACTION_MODULE_EXPORTS = {
    "scenario_readiness_actions.js": (
        "captureScenarioReadinessState",
        "commitScenarioReadinessState",
        "restoreScenarioReadinessState",
    ),
    "scenario_activation_actions.js": (
        "captureScenarioActivationState",
        "commitScenarioActivationState",
        "restoreScenarioActivationState",
        "restoreScenarioActivationBeforeAuditState",
        "restoreScenarioActivationBeforeColorDirtyState",
        "restoreScenarioActivationAfterColorDirtyState",
    ),
    "scenario_presentation_actions.js": (
        "captureScenarioPresentationState",
        "commitScenarioPresentationState",
        "restoreScenarioPresentationState",
        "restoreScenarioTransactionPresentationBeforeAuditState",
        "restoreScenarioTransactionPresentationState",
    ),
    "scenario_apply_request_actions.js": (
        "setLatestScenarioApplyRequestState",
        "beginScenarioApplyRequestState",
        "clearActiveScenarioApplyRequestState",
    ),
    "scenario_palette_actions.js": (
        "commitScenarioPaletteState",
        "restoreScenarioPaletteState",
    ),
    "scenario_transaction_rollback_actions.js": (
        "restoreScenarioTransactionSupplementBeforeAuditState",
        "restoreScenarioTransactionSupplementBeforeColorDirtyState",
        "restoreScenarioTransactionSupplementAfterColorDirtyState",
    ),
}

READ_ONLY_ACTION_EXPORTS = {
    "scenario_transaction_rollback_actions.js": (
        "captureScenarioTransactionRollbackOptionalState",
        "validateScenarioTransactionRollbackSupplementalStatePatch",
    ),
}


class ScenarioStateActionsBoundaryContractTest(unittest.TestCase):
    def test_canonical_action_modules_are_import_free_state_only_surfaces(self):
        for file_name, export_names in ACTION_MODULE_EXPORTS.items():
            content = (ACTIONS_ROOT / file_name).read_text(encoding="utf-8")
            self.assertNotRegex(content, re.compile(r"^\s*import\s", re.MULTILINE))
            for forbidden in (
                "document",
                "window",
                "globalThis",
                "callRuntimeHook",
                "recordRenderPerfMetric",
                "renderNow",
                "showToast",
            ):
                self.assertNotIn(forbidden, content, f"{file_name} leaked {forbidden}")
            for export_name in export_names:
                self.assertRegex(
                    content,
                    rf"export function {re.escape(export_name)}\(\s*target(?:,|\))",
                )
        for file_name, export_names in READ_ONLY_ACTION_EXPORTS.items():
            content = (ACTIONS_ROOT / file_name).read_text(encoding="utf-8")
            for export_name in export_names:
                self.assertIn(f"export function {export_name}(", content)

    def test_transaction_pipeline_owns_validate_commit_publish_restore_order(self):
        content = PIPELINE_JS.read_text(encoding="utf-8")

        for module_name in (
            "scenario_readiness_actions.js",
            "scenario_activation_actions.js",
            "scenario_presentation_actions.js",
            "scenario_palette_actions.js",
        ):
            self.assertIn(f'from "./state/actions/{module_name}";', content)
        self.assertNotIn(
            'from "./state/scenario_runtime_state.js";',
            content,
        )
        apply_body = re.search(
            r"function applyPreparedScenarioState\([^)]*\)\s*\{(?P<body>[\s\S]*?)\n  \}",
            content,
        )
        self.assertIsNotNone(apply_body)
        body = apply_body.group("body")
        ordered_tokens = (
            "captureScenarioActivationTransactionState(",
            "validateScenarioActivationCommitState(",
            "commitScenarioActivationState(",
            "publishScenarioActivationObservers(",
        )
        positions = [body.find(token) for token in ordered_tokens]
        self.assertTrue(all(position >= 0 for position in positions))
        self.assertEqual(positions, sorted(positions))
        self.assertIn("restoreScenarioActivationTransactionState(", body)

        palette_stage = re.search(
            r"async function stageScenarioPalettePatch\([^)]*\)\s*\{(?P<body>[\s\S]*?)\n  \}",
            content,
        )
        self.assertIsNotNone(palette_stage)
        self.assertIn("syncUI: false", palette_stage.group("body"))

    def test_request_identity_writes_delegate_to_canonical_actions(self):
        content = MANAGER_JS.read_text(encoding="utf-8")

        self.assertIn(
            'from "./state/actions/scenario_apply_request_actions.js";',
            content,
        )
        for action_name in (
            "setLatestScenarioApplyRequestState",
            "beginScenarioApplyRequestState",
            "clearActiveScenarioApplyRequestState",
        ):
            self.assertRegex(content, rf"\b{action_name}\(\s*runtimeState")
        for direct_assignment in (
            "runtimeState.latestScenarioApplyRequestId =",
            "runtimeState.latestScenarioApplyTargetId =",
            "runtimeState.currentScenarioApplyRequestId =",
            "runtimeState.currentScenarioApplyTargetId =",
            "runtimeState.scenarioApplyActiveRequestId =",
            "runtimeState.scenarioApplyActiveTargetId =",
            "runtimeState.scenarioApplyInFlight =",
        ):
            self.assertNotIn(direct_assignment, content)

        pipeline_content = PIPELINE_JS.read_text(encoding="utf-8")
        self.assertIn(
            'from "./state/actions/scenario_palette_actions.js";',
            pipeline_content,
        )
        for action_name in (
            "commitScenarioPaletteState",
            "restoreScenarioPaletteState",
        ):
            self.assertRegex(
                pipeline_content,
                rf"\b{action_name}\(\s*runtimeState",
            )

    def test_readiness_staging_suppresses_detail_promotion_observers(self):
        pipeline_content = PIPELINE_JS.read_text(encoding="utf-8")
        manager_content = MANAGER_JS.read_text(encoding="utf-8")

        self.assertIn(
            "await prepareScenarioDetailTopologyState();",
            pipeline_content,
        )
        self.assertRegex(
            manager_content,
            re.compile(
                r"async function prepareScenarioDetailTopologyState\(\{\s*"
                r"targetState = runtimeState,\s*"
                r"loadDetailBundle = loadDeferredDetailBundle,\s*"
                r"hasUsableTopology = hasUsablePoliticalTopology,",
            ),
        )
        staging_body = manager_content[
            manager_content.index("async function prepareScenarioDetailTopologyState("):
            manager_content.index("const {", manager_content.index("async function prepareScenarioDetailTopologyState("))
        ]
        self.assertNotIn("ensureDetailTopologyBoundary(", staging_body)
        self.assertNotIn("syncScenarioUi(", staging_body)
        self.assertNotIn("syncCountryUi(", staging_body)
        self.assertNotIn("setMapData(", staging_body)
        self.assertIn("publishObservers: false", pipeline_content)
        self.assertIn("syncDefaultPalette: false", pipeline_content)

    def test_rollback_tracks_absent_authority_keys_and_all_new_sentinels(self):
        content = ROLLBACK_JS.read_text(encoding="utf-8")
        action_content = (
            ACTIONS_ROOT / "scenario_transaction_rollback_actions.js"
        ).read_text(encoding="utf-8")

        self.assertIn("rollbackPresentStateKeys", content)
        self.assertIn(
            "captureScenarioTransactionRollbackOptionalState(",
            content,
        )
        self.assertNotIn("restoreScenarioSnapshotProperty(", content)
        self.assertIn(
            'from "./state/actions/scenario_transaction_rollback_actions.js";',
            content,
        )
        for action_name in (
            "restoreScenarioActivationBeforeAuditState",
            "restoreScenarioActivationBeforeColorDirtyState",
            "restoreScenarioActivationAfterColorDirtyState",
            "restoreScenarioReadinessState",
            "restoreScenarioTransactionPresentationBeforeAuditState",
            "restoreScenarioTransactionPresentationState",
            "restoreScenarioPaletteState",
            "restoreScenarioTransactionSupplementBeforeAuditState",
            "restoreScenarioTransactionSupplementBeforeColorDirtyState",
            "restoreScenarioTransactionSupplementAfterColorDirtyState",
        ):
            self.assertRegex(content, rf"\b{action_name}\(\s*runtimeState")
        for sentinel_key in (
            "runtimePoliticalMetaSeed",
            "runtimePoliticalFeatureCollectionSeed",
            "scenarioAtlantropaData",
            "scenarioPresentationStyleBeforeActivate",
            "showScenarioAtlantropa",
            "topologyDetail",
            "topologyBundleMode",
            "detailDeferred",
            "detailPromotionCompleted",
            "detailPromotionInFlight",
            "detailSourceRequested",
            "locales",
            "geoAliasToStableKey",
        ):
            self.assertIn(f'"{sentinel_key}"', action_content)

    def test_deferred_metadata_is_fenced_by_request_and_epoch(self):
        content = RESOURCES_JS.read_text(encoding="utf-8")

        self.assertIn("function getCurrentScenarioApplyEpoch(", content)
        self.assertIn("function shouldContinueScenarioApplyContext(", content)
        self.assertIn("scenarioApplyEpoch = 0", content)
        self.assertIn("scenarioApplyRequestId = 0", content)
        self.assertIn('"deferred-metadata-before-apply"', content)
        self.assertIn('"deferred-metadata-commit"', content)
        self.assertRegex(
            content,
            re.compile(
                r"applyDeferredScenarioMetadata\(bundle,\s*\{[\s\S]*?"
                r"scenarioApplyEpoch:\s*transactionScenarioApplyEpoch,[\s\S]*?"
                r"scenarioApplyRequestId:\s*transactionScenarioApplyRequestId,[\s\S]*?"
                r"isScenarioApplyRequestCurrent,",
            ),
        )

    def test_delegation_contract_registers_only_mutating_scenario_exports(self):
        content = DELEGATION_CONTRACT.read_text(encoding="utf-8")

        for module_name in ACTION_MODULE_EXPORTS:
            self.assertIn(f'"js/core/state/actions/{module_name}"', content)
        for action_name in (
            "commitScenarioReadinessState",
            "restoreScenarioReadinessState",
            "commitScenarioActivationState",
            "restoreScenarioActivationState",
            "commitScenarioPresentationState",
            "restoreScenarioPresentationState",
            "setLatestScenarioApplyRequestState",
            "beginScenarioApplyRequestState",
            "clearActiveScenarioApplyRequestState",
            "commitScenarioPaletteState",
            "restoreScenarioPaletteState",
            "restoreScenarioActivationBeforeAuditState",
            "restoreScenarioActivationBeforeColorDirtyState",
            "restoreScenarioActivationAfterColorDirtyState",
            "restoreScenarioTransactionPresentationState",
            "restoreScenarioTransactionPresentationBeforeAuditState",
            "restoreScenarioTransactionSupplementBeforeAuditState",
            "restoreScenarioTransactionSupplementBeforeColorDirtyState",
            "restoreScenarioTransactionSupplementAfterColorDirtyState",
        ):
            self.assertIn(f'"{action_name}"', content)


if __name__ == "__main__":
    unittest.main()
