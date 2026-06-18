from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
FACADE_SPATIAL_RUNTIME_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "facade_spatial_runtime.js"
SPATIAL_INDEX_RUNTIME_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "spatial_index_runtime_owner.js"
SPATIAL_INDEX_RUNTIME_BUILDERS_JS = REPO_ROOT / "js" / "core" / "renderer" / "spatial_index_runtime_builders.js"
SPATIAL_INDEX_RUNTIME_STATE_OPS_JS = REPO_ROOT / "js" / "core" / "renderer" / "spatial_index_runtime_state_ops.js"
SPATIAL_INDEX_RUNTIME_DERIVATION_JS = REPO_ROOT / "js" / "core" / "renderer" / "spatial_index_runtime_derivation.js"


class MapRendererSpatialIndexRuntimeOwnerBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_keeps_interaction_startup_orchestration_while_spatial_runtime_moves_to_facade_and_owner_helpers(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        facade_content = FACADE_SPATIAL_RUNTIME_JS.read_text(encoding="utf-8")
        owner_content = SPATIAL_INDEX_RUNTIME_OWNER_JS.read_text(encoding="utf-8")
        builders_content = SPATIAL_INDEX_RUNTIME_BUILDERS_JS.read_text(encoding="utf-8")
        state_ops_content = SPATIAL_INDEX_RUNTIME_STATE_OPS_JS.read_text(encoding="utf-8")
        derivation_content = SPATIAL_INDEX_RUNTIME_DERIVATION_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn("import { createSpatialIndexRuntimeOwner } from './renderer/spatial_index_runtime_owner.js';", renderer_imports)
        self.assertIn("from './map_renderer/facade_spatial_runtime.js';", renderer_imports)
        self.assertIn("let spatialIndexRuntimeOwner = null;", renderer_content)
        self.assertIn("function getSpatialIndexRuntimeOwner() {", renderer_content)
        self.assertIn("rebuildAuxiliaryRegionIndexes,", renderer_content)
        self.assertIn("getLogicalCanvasDimensions,", renderer_content)
        self.assertIn("getProjectedFeatureBounds,", renderer_content)
        self.assertIn("hitGridTargetCols: HIT_GRID_TARGET_COLS,", renderer_content)
        self.assertIn("hitGridMinCellPx: HIT_GRID_MIN_CELL_PX,", renderer_content)
        self.assertIn("hitGridMaxCellPx: HIT_GRID_MAX_CELL_PX,", renderer_content)
        self.assertIn("hitMaxCellsPerItem: HIT_MAX_CELLS_PER_ITEM,", renderer_content)
        self.assertIn("import { getSpatialBucketKey } from \"./renderer/spatial_index_runtime_builders.js\";", renderer_content)
        self.assertNotIn("function buildSpatialGrid(", renderer_content)
        self.assertIn("setInteractionInfrastructureState,", renderer_content)
        self.assertIn("yieldToMain,", renderer_content)
        self.assertIn("getFeatureBorderMeshCountryCodeNormalized,", renderer_content)
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+resetSecondarySpatialIndexState\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+resetSecondarySpatialIndexState\s*\(", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+buildSecondarySpatialIndexes\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+buildSecondarySpatialIndexes\s*\(", renderer_content))
        self.assertEqual(renderer_content.count("getSpatialIndexRuntimeOwner().resetSecondarySpatialIndexState({"), 3)
        self.assertEqual(renderer_content.count("preserveCurrent: true"), 3)
        self.assertEqual(renderer_content.count("getSpatialIndexRuntimeOwner().buildSecondarySpatialIndexes({"), 3)
        self.assertIn("function rebuildRuntimeDerivedState({", renderer_content)
        self.assertIn("async function buildBasicInteractionInfrastructureAfterStartup({", renderer_content)
        self.assertIn("async function buildFullInteractionInfrastructureAfterStartup({", renderer_content)
        self.assertIn("function initMap({", renderer_content)
        self.assertIn("function setMapData({", renderer_content)
        self.assertIn("function refreshMapDataForScenarioApply({", renderer_content)
        self.assertIn("function resetRendererRefreshTransactionState({", renderer_content)
        set_map_data_start = renderer_content.index("function setMapData({")
        refresh_transaction_start = renderer_content.index("function resetRendererRefreshTransactionState({")
        scenario_apply_start = renderer_content.index("function refreshMapDataForScenarioApply({")
        set_map_data_body = renderer_content[set_map_data_start:refresh_transaction_start]
        scenario_apply_body = renderer_content[
            scenario_apply_start:renderer_content.index("\n// Batch 5 facade note:", scenario_apply_start)
        ]
        refresh_transaction_body = renderer_content[
            refresh_transaction_start:renderer_content.index(
                "\nfunction cancelDeferredScenarioChunkPromotionInfraRefresh(",
                refresh_transaction_start,
            )
        ]
        self.assertIn("resetRendererTransactionState({", set_map_data_body)
        self.assertIn("cancelHoverOverlayRender: true,", set_map_data_body)
        self.assertIn("cancelSecondarySpatialBuild: true,", set_map_data_body)
        self.assertIn('clearLastGoodFrame("set-map-data");', set_map_data_body)
        self.assertIn('invalidateAllRenderPasses("set-map-data");', set_map_data_body)
        self.assertRegex(
            set_map_data_body,
            re.compile(
                r"runtimeState\.countryBaseColors = sanitizeCountryColorMap\(runtimeState\.countryBaseColors\);[\s\S]*?"
                r"runtimeState\.featureOverrides = sanitizeColorMap\(runtimeState\.featureOverrides\);[\s\S]*?"
                r"runtimeState\.waterRegionOverrides = sanitizeColorMap\(runtimeState\.waterRegionOverrides\);[\s\S]*?"
                r"runtimeState\.specialRegionOverrides = \{\};[\s\S]*?"
                r"migrateLegacyColorState\(\);[\s\S]*?"
                r"setCanvasSize\(\);[\s\S]*?"
                r"buildRuntimePoliticalMeta\(\);",
                re.S,
            ),
        )
        self.assertIn("resetRendererTransactionState({ hitCanvasDirty: true });", scenario_apply_body)
        self.assertIn("if (cancelHoverOverlay) {", refresh_transaction_body)
        self.assertIn("if (cancelSecondarySpatialBuild) {", refresh_transaction_body)
        self.assertNotIn("getRenderPassCacheState()", refresh_transaction_body)
        self.assertNotIn("runtimeState.topologyRevision", refresh_transaction_body)
        self.assertRegex(
            refresh_transaction_body,
            re.compile(
                r"clearPendingDynamicBorderTimer\(\);[\s\S]*?"
                r"clearRenderPhaseTimer\(\);[\s\S]*?"
                r"cancelPendingIndexUiRefresh\(\);[\s\S]*?"
                r"cancelPendingSidebarRefresh\(\);[\s\S]*?"
                r"if \(cancelHoverOverlay\) \{[\s\S]*?"
                r"cancelScheduledHoverOverlayRender\(\);[\s\S]*?"
                r"setRenderPhase\(RENDER_PHASE_IDLE\);[\s\S]*?"
                r"resetRenderDiagnostics\(\);[\s\S]*?"
                r"clearStagedMapDataTasks\(\);[\s\S]*?"
                r"cancelExactAfterSettleRefresh\(\);[\s\S]*?"
                r"cancelDeferredWork\(runtimeState\.hitCanvasBuildScheduled\);[\s\S]*?"
                r"runtimeState\.hitCanvasBuildScheduled = null;[\s\S]*?"
                r"if \(cancelSecondarySpatialBuild\) \{[\s\S]*?"
                r"cancelDeferredWork\(secondarySpatialBuildHandle\);[\s\S]*?"
                r"pendingSecondarySpatialBuildReasons\.clear\(\);[\s\S]*?"
                r"runtimeState\.deferContextBasePass = false;[\s\S]*?"
                r"runtimeState\.deferHitCanvasBuild = false;[\s\S]*?"
                r"runtimeState\.deferExactAfterSettle = false;[\s\S]*?"
                r"layerResolverCache\.primaryRef = null;[\s\S]*?"
                r"layerResolverCache\.detailRef = null;[\s\S]*?"
                r"layerResolverCache\.bundleMode = null;[\s\S]*?"
                r"layerResolverCache\.contextRevision = 0;[\s\S]*?"
                r"runtimeState\.devHoverHit = null;[\s\S]*?"
                r"runtimeState\.devSelectedHit = null;[\s\S]*?"
                r"runtimeState\.devSelectionFeatureIds = new Set\(\);[\s\S]*?"
                r"runtimeState\.devSelectionOrder = \[\];[\s\S]*?"
                r"runtimeState\.devClipboardFallbackText = \"\";[\s\S]*?"
                r"runtimeState\.devClipboardPreviewFormat = \"names_with_ids\";[\s\S]*?"
                r"resetPhysicalLandClipPathCache\(\);",
                re.S,
            ),
        )
        self.assertNotIn("function buildIndex({ scheduleUiMode = \"immediate\" } = {}) {", renderer_content)
        self.assertNotIn("function buildSpatialIndex({", renderer_content)
        self.assertNotIn("const buildIndexChunked = (...args) => getSpatialIndexRuntimeOwner().buildIndexChunked(...args);", renderer_content)

        self.assertIn("export function configureSpatialRuntimeFacade(nextState = {}) {", facade_content)
        self.assertIn("export function buildIndex({ scheduleUiMode = 'immediate' } = {}) {", facade_content)
        self.assertIn("export function buildSpatialIndex({", facade_content)
        self.assertIn("export const buildIndexChunked = (...args) => readSpatialOwner().buildIndexChunked(...args);", facade_content)
        self.assertIn("export const buildSpatialIndexChunked = (...args) =>", facade_content)

        self.assertIn("export function createSpatialIndexRuntimeOwner({", owner_content)
        self.assertIn("appendLandIndexEntriesRange", owner_content)
        self.assertIn("appendLandSpatialItemsRange", owner_content)
        self.assertIn("captureSpatialGridBuild", owner_content)
        self.assertNotIn("buildSpatialGrid = () => {}", owner_content)
        self.assertIn("getFeatureBorderMeshCountryCodeNormalized = () => \"\",", owner_content)
        self.assertIn("./spatial_index_runtime_state_ops.js", owner_content)
        self.assertIn("./spatial_index_runtime_derivation.js", owner_content)
        self.assertIn("function buildIndex({ scheduleUiMode = \"immediate\" } = {}) {", owner_content)
        self.assertIn("function rebuildRuntimePrimaryIndex({", owner_content)
        self.assertIn("function resetSecondarySpatialIndexState({", owner_content)
        self.assertIn("markSecondarySpatialBuildPending(state, {", owner_content)
        self.assertIn("function buildSecondarySpatialIndexes({", owner_content)
        self.assertIn("function buildSpatialIndex({", owner_content)
        self.assertIn("async function buildIndexChunked({", owner_content)
        self.assertIn("async function buildSpatialIndexChunked({", owner_content)
        self.assertIn("clearPrimaryIndexMaps(state);", owner_content)
        self.assertIn("applyPrimarySpatialSnapshot(state, {", owner_content)
        self.assertIn("applySecondarySpatialSnapshot(state, {", owner_content)
        self.assertIn("createSpatialIndexPerfPayload({", owner_content)
        self.assertIn("spatialGridCells: state.spatialGrid?.size || 0,", owner_content)
        self.assertIn("waterGridCells: state.waterSpatialGrid?.size || 0,", owner_content)
        self.assertIn("specialGridCells: state.specialSpatialGrid?.size || 0,", owner_content)
        self.assertIn("deriveRuntimePrimaryFeaturePayload({", owner_content)
        self.assertNotIn("function rebuildRuntimeDerivedState({", owner_content)
        self.assertIn("getProjectedFeatureBounds(feature, {", builders_content)
        self.assertIn("borderMeshCountryCode: resolveBorderMeshCountryCode(feature),", builders_content)
        self.assertIn("typeof getFeatureBorderMeshCountryCodeNormalized === \"function\"", builders_content)
        self.assertIn("function captureSpatialGridBuild(", builders_content)
        self.assertIn("export function buildSpatialGridSnapshot({", builders_content)
        self.assertIn("export function getSpatialBucketKey(col, row) {", builders_content)

        self.assertIn("export function clearPrimaryIndexMaps(state) {", state_ops_content)
        self.assertIn("export function resetPrimarySpatialState(state) {", state_ops_content)
        self.assertIn("export function resetSecondarySpatialState(state) {", state_ops_content)
        self.assertIn("export function applyPrimarySpatialSnapshot(state, {", state_ops_content)
        self.assertIn("export function applySecondarySpatialSnapshot(state, {", state_ops_content)
        self.assertIn("export function deriveRuntimePrimaryFeaturePayload({", derivation_content)
        self.assertIn("export function createSpatialIndexPerfPayload({", derivation_content)
        self.assertIn("spatialGridCells = 0,", derivation_content)
        self.assertIn("waterGridGlobals = 0,", derivation_content)
        self.assertIn("specialGridGlobals = 0,", derivation_content)


if __name__ == "__main__":
    unittest.main()
