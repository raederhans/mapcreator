from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
SCENARIO_MANAGER = REPO_ROOT / "js" / "core" / "scenario_manager.js"
SCENARIO_APPLY_PIPELINE = REPO_ROOT / "js" / "core" / "scenario_apply_pipeline.js"
SCENARIO_RUNTIME_STATE = REPO_ROOT / "js" / "core" / "state" / "scenario_runtime_state.js"
SCENARIO_LIFECYCLE_RUNTIME = REPO_ROOT / "js" / "core" / "scenario" / "lifecycle_runtime.js"


class ScenarioManagerBoundaryContractTest(unittest.TestCase):
    def test_scenario_manager_no_longer_owns_panel_dom(self):
        content = SCENARIO_MANAGER.read_text(encoding="utf-8")

        self.assertNotIn('document.getElementById("scenario', content)
        self.assertIsNone(re.search(r"state\.updateScenarioUIFn\s*=(?!=)", content))
        self.assertNotIn("initScenarioManager", content)
        self.assertNotIn("function syncScenarioUi()", content)
        self.assertIsNone(re.search(r"^function\s+captureScenarioApplyRollbackSnapshot\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+restoreScenarioApplyRollbackSnapshot\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+runPostRollbackRestoreEffects\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^(async\s+)?function\s+ensureActiveScenarioOptionalLayerLoaded\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^(async\s+)?function\s+ensureActiveScenarioOptionalLayersForVisibility\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^(async\s+)?function\s+ensureScenarioGeoLocalePatchForLanguage\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+hydrateActiveScenarioBundle\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^(async\s+)?function\s+loadScenarioAuditPayload\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^(async\s+)?function\s+loadScenarioBundle\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^(async\s+)?function\s+loadScenarioRegistry\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+releaseScenarioAuditPayload\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^(async\s+)?function\s+validateImportedScenarioBaseline\b", content, re.MULTILINE))
        self.assertNotIn("SCENARIO_OPTIONAL_LAYER_CONFIGS", content)
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bensureActiveScenarioOptionalLayerLoaded\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bensureActiveScenarioOptionalLayersForVisibility\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bensureScenarioGeoLocalePatchForLanguage\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bhydrateActiveScenarioBundle\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bloadScenarioAuditPayload\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bloadScenarioBundle\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bloadScenarioRegistry\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\breleaseScenarioAuditPayload\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bvalidateImportedScenarioBaseline\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bapplyDefaultScenarioOnStartup\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bformatScenarioFatalRecoveryMessage\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\bgetScenarioFatalRecoveryState\b", content))
        self.assertIsNone(re.search(r"export\s*\{[\s\S]*\brefreshScenarioShellOverlays\b", content))

    def test_active_scenario_country_names_do_not_fall_back_to_global_map(self):
        content = SCENARIO_APPLY_PIPELINE.read_text(encoding="utf-8")

        self.assertIn('countryNames: staged.mapSemanticMode === "blank"', content)
        self.assertIn("? countryNames", content)
        self.assertIn(": staged.scenarioNameMap,", content)
        self.assertNotIn("countryNames: {\n        ...countryNames,\n        ...staged.scenarioNameMap,\n      },", content)

    def test_scenario_manager_keeps_transaction_coordinator_role(self):
        content = SCENARIO_MANAGER.read_text(encoding="utf-8")

        self.assertIn('./scenario/presentation_runtime.js', content)
        self.assertIn('./scenario/lifecycle_runtime.js', content)
        self.assertIn("createScenarioPresentationRuntime({", content)
        self.assertIn("createScenarioLifecycleRuntime({", content)
        self.assertIn("applyScenarioBundle,", content)
        self.assertIn("applyScenarioById,", content)
        self.assertIn("resetToScenarioBaseline,", content)
        self.assertIn("clearActiveScenario,", content)
        self.assertIn("let activeScenarioApplyPromise = null;", content)
        self.assertIn("captureScenarioApplyRollbackSnapshot()", content)
        self.assertIn("restoreScenarioApplyRollbackSnapshot(rollbackSnapshot", content)
        self.assertIn("enterScenarioFatalRecovery({", content)
        self.assertIn('loadScenarioBundle(request.scenarioId, { bundleLevel: "full" })', content)
        self.assertIn("async function runScenarioApplyRequest(request) {", content)
        self.assertIn("beginScenarioApplyRequestState(runtimeState, {", content)
        self.assertIn("clearActiveScenarioApplyRequestState(runtimeState);", content)
        self.assertIn("activeScenarioApplyPromise = (async () => {", content)
        self.assertIn("syncScenarioUi();", content)
        self.assertIn("getScenarioDefaultCountryCode as getBundleLoaderDefaultCountryCode", content)
        self.assertIn("function canReuseActiveScenarioBundle(cachedScenarioBundle, normalizedScenarioId)", content)
        self.assertIn("const reuseCachedScenarioBundle =", content)
        self.assertIn("const reuseActiveScenarioApply = Boolean(", content)
        self.assertIn("reuseCachedScenarioBundle || reuseActiveScenarioApply", content)
        self.assertIn(": nextScenarioApplyEpoch(runtimeState, {", content)
        self.assertIn("if (reuseCachedScenarioBundle) {", content)
        self.assertIn("if (reuseActiveScenarioApply) {", content)
        self.assertIn("const cachedManifest = cachedScenarioBundle.manifest || null;", content)
        self.assertIn("const cachedBaselineHash = String(getScenarioBaselineHashFromBundle(cachedScenarioBundle) || \"\").trim();", content)
        self.assertIn("const requiresMeshPack = !!String(cachedManifest?.mesh_pack_url || \"\").trim();", content)
        self.assertIn("const hasMeshPack = !requiresMeshPack || !!runtimeState.activeScenarioMeshPack;", content)
        self.assertIn('assertScenarioInteractionsAllowed("exit the active scenario", {', content)
        self.assertIn("allowDuringBootBlocking,", content)

    def test_scenario_manager_delegates_presentation_runtime_owner(self):
        content = SCENARIO_MANAGER.read_text(encoding="utf-8")

        self.assertIsNone(re.search(r"^function\s+captureScenarioDisplaySettingsBeforeActivate\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+applyScenarioPerformanceHints\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+restoreScenarioDisplaySettingsAfterExit\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+getScenarioOceanFillOverride\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+updateScenarioOceanFill\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+syncScenarioOceanFillForActivation\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+restoreScenarioOceanFillAfterExit\b", content, re.MULTILINE))
        self.assertIn("const {", content)
        self.assertIn("applyScenarioPerformanceHints,", content)
        self.assertIn("restoreScenarioDisplaySettingsAfterExit,", content)
        self.assertIn("restoreScenarioOceanFillAfterExit,", content)
        self.assertIn("syncScenarioOceanFillForActivation,", content)

    def test_scenario_manager_delegates_lifecycle_runtime_owner(self):
        content = SCENARIO_MANAGER.read_text(encoding="utf-8")

        self.assertIsNone(re.search(r"^function\s+syncScenarioInspectorSelection\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+disableScenarioParentBorders\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+restoreParentBordersAfterScenario\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+applyScenarioPaintMode\b", content, re.MULTILINE))
        self.assertIsNone(re.search(r"^function\s+restorePaintModeAfterScenario\b", content, re.MULTILINE))
        self.assertIn("createScenarioLifecycleRuntime({", content)
        self.assertIn("clearActiveScenario: clearActiveScenarioRuntime,", content)
        self.assertIn("resetToScenarioBaseline: resetToScenarioBaselineRuntime,", content)
        self.assertIn("syncScenarioInspectorSelection,", content)
        self.assertIn("disableScenarioParentBorders,", content)
        self.assertIn("applyScenarioPaintMode,", content)
        self.assertIn("resetToScenarioBaselineRuntime({", content)
        self.assertIn("clearActiveScenarioRuntime({", content)
        self.assertNotIn("if (changed) {\n    recalculateScenarioOwnerControllerDiffCount();\n  }", content)

    def test_scenario_manager_releases_state_apply_pipeline_owner(self):
        content = SCENARIO_MANAGER.read_text(encoding="utf-8")

        self.assertIn("runtimeState: state,", content)
        self.assertNotRegex(content, r"^async function prepareScenarioApplyState\b", re.MULTILINE)
        self.assertNotIn("runtimeState.scenarioRuntimeTopologyData = staged.runtimeTopologyPayload;", content)
        self.assertNotIn("runtimeState.scenarioBaselineOwnersByFeatureId = { ...staged.resolvedOwners };", content)
        self.assertNotIn('runtimeState.countryNames = staged.mapSemanticMode', content)
        self.assertNotIn('runtimeState.scheduleScenarioChunkRefreshFn = scenarioSupportsChunkedRuntime(bundle) ? scheduleScenarioChunkRefresh : null;', content)
        self.assertNotIn('cityOverridesPayload: staged.mapSemanticMode === "blank"', content)

    def test_apply_pipeline_owner_moves_to_new_module(self):
        content = SCENARIO_APPLY_PIPELINE.read_text(encoding="utf-8")
        state_content = SCENARIO_RUNTIME_STATE.read_text(encoding="utf-8")
        lifecycle_content = SCENARIO_LIFECYCLE_RUNTIME.read_text(encoding="utf-8")

        self.assertIn("prepareScenarioActivationContext(bundle)", content)
        self.assertIn("buildScenarioActivationCommitState(bundle, staged)", content)
        self.assertIn("publishScenarioActivationStateObservers(bundle, staged)", content)
        self.assertIn(
            "buildScenarioActivationTransactionPatch(bundle, staged)",
            content,
        )
        self.assertIn("runScenarioActivationPostCommitPhase(bundle, staged)", content)
        self.assertIn("commitScenarioChunkRuntimeState(bundle, staged)", content)
        self.assertIn("prepareScenarioApplyState", content)
        self.assertIn("applyPreparedScenarioState", content)
        self.assertIn("commitScenarioActivationAuthorityState(", content)
        self.assertIn("commitScenarioReadinessState(", content)
        self.assertIn("commitScenarioPresentationState(", content)
        self.assertIn("commitScenarioPaletteState(", content)
        self.assertNotIn("runtimeState.scenarioRuntimeTopologyData =", content)
        self.assertNotIn("runtimeState.scenarioBaselineOwnersByFeatureId =", content)
        self.assertNotIn('runtimeState.countryNames = staged.mapSemanticMode', content)
        self.assertIn("setScenarioChunkRuntimeHooksState(runtimeState, {", content)
        self.assertNotIn("runtimeState.scheduleScenarioChunkRefreshFn =", content)
        self.assertNotIn("runtimeState.awaitInitialScenarioChunkVisualPromotionFn =", content)
        self.assertIn("syncScenarioLocalizationState({", content)
        self.assertIn("resetScenarioChunkRuntimeState(", content)
        self.assertNotIn("runtimeState.defaultRuntimePoliticalTopology =", content)
        self.assertNotIn('./scenario_manager.js', content)
        self.assertIn("export function commitScenarioActivationRuntimeState(target, nextState = {}) {", state_content)
        self.assertIn("setHydratedScenarioRuntimeTopologyState(target, {", state_content)
        self.assertIn("setScenarioRuntimeOptionalLayerState(target, {", state_content)
        self.assertIn('syncScenarioInspectorSelection("");', content)
        self.assertIn("scenarioApplyRequestId", content)
        self.assertIn("disableScenarioParentBorders();", content)
        self.assertIn("applyScenarioPaintMode();", content)
        self.assertNotIn('./scenario_apply_pipeline.js', lifecycle_content)

    def test_apply_pipeline_names_pre_commit_commit_post_commit_order(self):
        content = SCENARIO_APPLY_PIPELINE.read_text(encoding="utf-8")
        match = re.search(
            r"function\s+applyPreparedScenarioState\(bundle,\s*staged\)\s*\{(?P<body>[\s\S]*?)\n  \}",
            content,
        )
        self.assertIsNotNone(match)
        body = match.group("body")
        self.assertRegex(
            body,
            r"assertCompleteScenarioActivationTransactionPatch\(transactionPatch\);"
            r"[\s\S]*validateScenarioActivationCommitState\("
            r"[\s\S]*commitScenarioActivationState\(transactionPatch,\s*staged\);"
            r"[\s\S]*publishScenarioActivationObservers\(bundle,\s*staged\);",
        )

    def test_commit_scenario_activation_runtime_state_stays_pure_state_commit(self):
        state_content = SCENARIO_RUNTIME_STATE.read_text(encoding="utf-8")
        start = state_content.index("export function commitScenarioActivationRuntimeState(target, nextState = {}) {")
        end = state_content.index("\nexport function normalizeScenarioHydrationHealthGateState", start)
        body = state_content[start:end]
        side_effect_calls = [
            "syncScenarioLocalizationState",
            "applyBlankScenarioPresentationDefaults",
            "setScenarioAuditUiState",
            "markLegacyColorStateDirty",
            "syncScenarioInspectorSelection",
            "disableScenarioParentBorders",
            "applyScenarioPaintMode",
            "syncScenarioOceanFillForActivation",
            "applyScenarioPerformanceHints",
            "commitScenarioChunkRuntimeState",
            "recalculateScenarioOwnerControllerDiffCount",
        ]
        for call_name in side_effect_calls:
            self.assertNotIn(call_name, body)


if __name__ == "__main__":
    unittest.main()
