from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RENDER_PIPELINE_PASSES_JS = REPO_ROOT / "js" / "core" / "renderer" / "render_pipeline_passes.js"
EXACT_AFTER_SETTLE_PLANS_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "exact_after_settle_refresh_plans.js"
EXACT_AFTER_SETTLE_SCHEDULER_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "exact_after_settle_scheduler.js"
HGO_RUNTIME_PREVIEW_RENDER_OWNER_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "hgo_runtime_preview_render_owner.js"
HGO_RUNTIME_PREVIEW_FRAME_COMMIT_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "hgo_runtime_preview_frame_commit.js"


class MapRendererRenderPipelinePassesBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_keeps_pass_orchestration_shell_while_idle_pass_owner_moves_to_module(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = RENDER_PIPELINE_PASSES_JS.read_text(encoding="utf-8")
        exact_plan_content = EXACT_AFTER_SETTLE_PLANS_JS.read_text(encoding="utf-8")
        exact_scheduler_content = EXACT_AFTER_SETTLE_SCHEDULER_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        # 这个静态合同锁的是“map_renderer 只保留编排壳，idle pass 细节归 owner”。
        # 后续拆分 render pass 时应改 owner 入口，让长函数维持在 owner 内。
        self.assertIn(
            "import { createRenderPipelinePassesOwner } from './renderer/render_pipeline_passes.js';",
            renderer_imports,
        )
        self.assertIn("let renderPipelinePassesOwner = null;", renderer_content)
        self.assertIn("function getRenderPipelinePassesOwner() {", renderer_content)
        self.assertIn("exactAfterSettleDeferredPassNames: EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES,", renderer_content)
        self.assertIn("resolveExactAfterSettleTargetPasses", exact_scheduler_content)
        self.assertIn("drawContextScenarioPass,", renderer_content)
        self.assertIn("drawHgoPreviewPass,", renderer_content)
        self.assertIn("drawTextureLabelEffectsPass,", renderer_content)
        self.assertIn("getContextScenarioReuseDecision,", renderer_content)
        self.assertIn("tryPartialPoliticalPassRepaint,", renderer_content)
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+getIdleRenderPassDefinitions\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+prepareIdleRenderPassDefinition\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+ensureIdleRenderPasses\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+getIdleRenderPassDefinitions\s*\(", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+prepareIdleRenderPassDefinition\s*\(", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+ensureIdleRenderPasses\s*\(", renderer_content))
        self.assertEqual(renderer_content.count("getRenderPipelinePassesOwner().getIdleRenderPassDefinitions()"), 0)
        self.assertEqual(exact_scheduler_content.count("getRenderPipelinePassesOwner().getIdleRenderPassDefinitions()"), 4)
        self.assertEqual(
            renderer_content.count(
                "getRenderPipelinePassesOwner().prepareIdleRenderPassDefinition(passName, drawFn, transform, timings, cache);"
            ),
            0,
        )
        self.assertEqual(
            exact_scheduler_content.count(
                "getRenderPipelinePassesOwner().prepareIdleRenderPassDefinition(passName, drawFn, transform, timings, cache);"
            ),
            2,
        )
        self.assertEqual(renderer_content.count("getRenderPipelinePassesOwner().ensureIdleRenderPasses("), 2)

        self.assertIn("export function createRenderPipelinePassesOwner({", owner_content)
        self.assertIn("function getIdleRenderPassDefinitions() {", owner_content)
        self.assertIn('["background", (k) => drawBackgroundPass(k)],', owner_content)
        self.assertIn('["hgoPreview", (k) => drawHgoPreviewPass(k)],', owner_content)
        self.assertIn('["contextScenario", (k) => drawContextScenarioPass(k)],', owner_content)
        self.assertIn('["textureLabels", (k) => drawTextureLabelEffectsPass(k)],', owner_content)
        self.assertIn("function shouldDeferExactAfterSettlePassForCriticalPaint(passName", owner_content)
        self.assertIn("function prepareIdleRenderPassDefinition(passName, drawFn, transform, timings", owner_content)
        self.assertIn('recordRenderPerfMetric("contextScenarioSignatureChanged"', owner_content)
        self.assertIn('recordRenderPerfMetric("contextScenarioReuseSkipped"', owner_content)
        self.assertIn("function didHgoPreviewVisibilityTokenChange(previousSignature, nextSignature)", owner_content)
        self.assertIn('cache.reasons[passName] = "hgo-runtime-preview";', owner_content)
        self.assertIn('tryPartialPoliticalPassRepaint(transform, nextSignature, timings)', owner_content)
        self.assertIn("function getPoliticalPassFineBaselineMismatch(", renderer_content)
        self.assertIn("const politicalPassCurrent = !!(", renderer_content)
        self.assertIn('return "coarse-baseline";', renderer_content)
        self.assertIn('return "scene-snapshot-mismatch";', renderer_content)
        self.assertIn('return "scenario-data-generation-mismatch";', renderer_content)
        partial_repaint_body = renderer_content.split("function tryPartialPoliticalPassRepaint(", 1)[1].split(
            "\nfunction drawPoliticalPass",
            1,
        )[0]
        self.assertIn("const fineBaselineMismatch = getPoliticalPassFineBaselineMismatch(transform);", partial_repaint_body)
        self.assertIn("return fallback(fineBaselineMismatch);", partial_repaint_body)
        political_draw_body = renderer_content.split("function drawPoliticalPass(", 1)[1].split(
            "\nfunction getContextScenarioLayerCacheEntry",
            1,
        )[0]
        self.assertIn('politicalDataStage: "coarse"', political_draw_body)
        self.assertIn('politicalDataStage: "fine"', political_draw_body)
        self.assertIn('finePoliticalCacheReady: true', political_draw_body)
        self.assertIn("function isScenarioPoliticalBackgroundDeferredFullCacheStateCurrent(", renderer_content)
        self.assertIn('cancelScenarioPoliticalBackgroundDeferredFullCache("scene-snapshot-mismatch");', renderer_content)
        self.assertIn("sceneGeneration: identity.sceneGeneration,", renderer_content)
        self.assertIn("scenarioDataGeneration: identity.scenarioDataGeneration,", renderer_content)
        self.assertIn("function ensureIdleRenderPasses(timings, passNames = null) {", owner_content)
        self.assertIn("const requestedPassNames = Array.isArray(passNames) ? new Set(passNames.filter(Boolean)) : null;", owner_content)
        self.assertIn("detectContextScenarioReasonMismatch({ cache, renderPerf: state.renderPerfMetrics || {} });", owner_content)
        self.assertIn("const EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES = new Set", exact_plan_content)
        self.assertIn("function resolveExactAfterSettleTargetPasses({", exact_plan_content)
        self.assertIn("function filterExactAfterSettleIdleRenderPassDefinitions(", exact_plan_content)
        self.assertIn("filterExactAfterSettleIdleRenderPassDefinitions(", exact_scheduler_content)

    def test_water_hover_uses_svg_overlay_while_selected_water_invalidates_canvas_layer(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        water_token_body = renderer_content.split("function getScenarioWaterVisualRevisionToken() {", 1)[1].split("\n}", 1)[0]
        water_highlight_body = renderer_content.split("function drawScenarioWaterHighlightLayer(k) {", 1)[1].split(
            "\nfunction drawScenarioSpecialRegionOverlaysLayer",
            1,
        )[0]
        hover_overlay_body = renderer_content.split("function renderHoverOverlay() {", 1)[1].split(
            "\nfunction renderInspectorHighlightOverlay",
            1,
        )[0]

        self.assertIn('`water-selected:${String(runtimeState.selectedWaterRegionId || "").trim()}`', water_token_body)
        self.assertIn('String(runtimeState.selectedWaterRegionId || "").trim()', water_highlight_body)
        self.assertNotIn("runtimeState.hoveredWaterRegionId", water_highlight_body)
        self.assertIn('.attr("stroke-linejoin", "round")', hover_overlay_body)
        self.assertIn('.attr("stroke-linecap", "round")', hover_overlay_body)
        self.assertIn('runtimeState.hoveredWaterRegionId ? 1.25 : 1.45', hover_overlay_body)

    def test_hgo_preview_ready_replaces_normal_overlay_passes(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        hgo_preview_owner_content = HGO_RUNTIME_PREVIEW_RENDER_OWNER_JS.read_text(encoding="utf-8")
        hgo_preview_commit_content = HGO_RUNTIME_PREVIEW_FRAME_COMMIT_JS.read_text(encoding="utf-8")
        signature_body = renderer_content.split("function getRenderPassSignature(passName", 1)[1].split(
            "\nfunction resolveHitMode",
            1,
        )[0]

        self.assertIn("function getHgoRuntimePreviewVisibilitySignature() {", renderer_content)
        hgo_signature_body = signature_body.split('if (passName === "hgoPreview")', 1)[1].split(
            "\n  if (passName === ",
            1,
        )[0]
        self.assertIn('isHgoRuntimePreviewReady() ? "hgo:on" : "hgo:off"', hgo_signature_body)
        self.assertIn('String(preview.status || "")', hgo_signature_body)
        self.assertIn('projection ? transformSignature : "projection:none"', hgo_signature_body)
        hgo_preview_pass_body = hgo_preview_owner_content.split("function drawPreviewPass()", 1)[1].split(
            "\n\n  function normalizeHitPayload",
            1,
        )[0]
        hgo_preview_commit_body = hgo_preview_commit_content.split("function drawPreviewPass()", 1)[1].split(
            "\n\n  return Object.freeze",
            1,
        )[0]
        self.assertIn("return frameCommitter.drawPreviewPass();", hgo_preview_pass_body)
        self.assertIn('renderFrame: (targetCanvas) => renderIfReady("hgo-preview-pass", {', hgo_preview_owner_content)
        self.assertLess(
            hgo_preview_commit_body.index("if (!isReady())"),
            hgo_preview_commit_body.index("const targetCanvas = getTargetCanvas();"),
        )
        self.assertLess(
            hgo_preview_commit_body.index("getFrameRejectionReason(rendered, stats)"),
            hgo_preview_commit_body.index("resetCanvasContext(targetContext, targetCanvas.width, targetCanvas.height);"),
        )
        self.assertNotIn("projectionTransform: null", hgo_preview_owner_content)
        self.assertIn('const HGO_RUNTIME_PREVIEW_RENDER_PASS_NAMES = Object.freeze([\n  "hgoPreview",\n]);', hgo_preview_owner_content)
        self.assertIn(
            'const HGO_RUNTIME_PREVIEW_TRANSFORMED_FRAME_PASS_NAMES = Object.freeze([\n  "hgoPreview",\n]);',
            hgo_preview_owner_content,
        )
        self.assertIn("return getHgoRuntimePreviewRenderOwner().getActiveRenderPassNames();", renderer_content)
        self.assertIn(
            "return isReady() ? HGO_RUNTIME_PREVIEW_RENDER_PASS_NAMES : vectorRenderPassNames;",
            hgo_preview_owner_content,
        )
        self.assertIn("return getHgoRuntimePreviewRenderOwner().getActiveTransformedFramePassNames();", renderer_content)
        self.assertIn(
            "return isReady() ? HGO_RUNTIME_PREVIEW_TRANSFORMED_FRAME_PASS_NAMES : vectorTransformedFramePassNames;",
            hgo_preview_owner_content,
        )
        interaction_composite_body = renderer_content.split("const INTERACTION_COMPOSITE_PASS_NAMES = [", 1)[1].split(
            "];",
            1,
        )[0]
        self.assertNotIn('"hgoPreview"', interaction_composite_body)
        self.assertIn("const activeRenderPassNames = getActiveRenderPassNames();", renderer_content)
        self.assertIn("getRenderPipelinePassesOwner().ensureIdleRenderPasses(frameTimings, activeRenderPassNames);", renderer_content)
        self.assertIn("drewExactFrame = composeCachedPasses(activeRenderPassNames);", renderer_content)
        self.assertIn("function getProjectedHgoRuntimePreviewBounds() {", renderer_content)
        self.assertIn("function getProjectedBounds() {", hgo_preview_owner_content)
        render_pass_to_cache_body = renderer_content.split("function renderPassToCache(passName, drawFn, transform, timings) {", 1)[1].split(
            "\n\nfunction resetCanvasContext",
            1,
        )[0]
        self.assertLess(
            render_pass_to_cache_body.index("drawResult.committed === false"),
            render_pass_to_cache_body.index("setPassReferenceTransform(passName, transform);"),
        )
        self.assertIn('recordRenderPerfMetric("renderPassCommitSkipped"', render_pass_to_cache_body)
        self.assertIn("cache.politicalPassDataStage = politicalDataStage;", render_pass_to_cache_body)
        self.assertIn("cache.politicalPassFineCacheReady = politicalFineCacheReady;", render_pass_to_cache_body)
        self.assertIn("if (politicalFineCacheReady) {", render_pass_to_cache_body)
        self.assertIn("clearPassFullReferenceTransforms([passName]);", render_pass_to_cache_body)
        self.assertLess(
            render_pass_to_cache_body.index("if (politicalFineCacheReady) {"),
            render_pass_to_cache_body.index("cache.partialPoliticalDirtyIds.clear();"),
        )
        self.assertIn("if (isHgoRuntimePreviewReady()) {\n    return getProjectedHgoRuntimePreviewBounds();\n  }", renderer_content)
        pan_extent_body = renderer_content.split("function calculatePanExtent()", 1)[1].split(
            "\n\nfunction updateZoomTranslateExtent",
            1,
        )[0]
        self.assertIn("if (isHgoRuntimePreviewReady()) {", pan_extent_body)
        self.assertIn("const bounds = getProjectedHgoRuntimePreviewBounds();", pan_extent_body)
        reset_zoom_body = renderer_content.split("function resetZoomToFit(", 1)[1].split(
            "\n\nfunction zoomByStep",
            1,
        )[0]
        self.assertLess(
            reset_zoom_body.index("updateZoomTranslateExtent();"),
            reset_zoom_body.index("const transform = centerContent"),
        )
        self.assertEqual(signature_body.count("getHgoRuntimePreviewVisibilitySignature()"), 7)
        political_body = signature_body.split('if (passName === "political")', 1)[1].split(
            "\n  if (passName === ",
            1,
        )[0]
        self.assertLess(
            political_body.index("runtimeState.colorRevision || 0"),
            political_body.index("getHgoRuntimePreviewVisibilitySignature()"),
        )
        for pass_name in (
            "political",
            "contextBase",
            "contextMarkers",
            "labels",
            "contextScenario",
            "textureLabels",
            "borders",
        ):
            pass_body = signature_body.split(f'if (passName === "{pass_name}")', 1)[1].split(
                "\n  if (passName === ",
                1,
            )[0]
            self.assertIn("getHgoRuntimePreviewVisibilitySignature()", pass_body)

        for function_name in (
            "drawPoliticalPass",
            "drawContextBasePass",
            "drawContextMarkersPass",
            "drawContextScenarioPass",
            "drawTextureLabelEffectsPass",
            "drawBordersPass",
            "drawLabelsPass",
        ):
            pass_body = renderer_content.split(f"function {function_name}(", 1)[1].split("\nfunction ", 1)[0]
            self.assertRegex(
                pass_body,
                re.compile(
                    r"if \(isHgoRuntimePreviewReady\(\)\) \{[\s\S]*?"
                    r'reason: "hgo-runtime-preview"[\s\S]*?'
                    r"return;",
                    re.S,
                ),
            )

    def test_empty_click_clears_water_and_special_selection(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        click_body = renderer_content.split("async function handleClick(event, _interactionContext = null) {", 1)[1].split(
            "\nfunction handleRectangularSelection",
            1,
        )[0]
        empty_click_body = click_body.split("if (!id) {", 1)[1].split("\n  }", 1)[0]

        self.assertIn("runtimeState.selectedWaterRegionId = \"\";", empty_click_body)
        self.assertIn("refreshWaterRegionSidebarRowsNow([previousWaterRegionId]);", empty_click_body)
        self.assertIn('requestInteractionRender("clear-water-selection-empty-click");', empty_click_body)
        self.assertIn("runtimeState.selectedSpecialRegionId = \"\";", empty_click_body)
        self.assertIn("refreshSpecialRegionSidebarRowsNow([previousSpecialRegionId]);", empty_click_body)
        self.assertIn('requestInteractionRender("clear-special-selection-empty-click");', empty_click_body)

    def test_selection_only_water_click_paths_request_interaction_render(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        click_body = renderer_content.split("async function handleClick(event, _interactionContext = null) {", 1)[1].split(
            "\nfunction handleRectangularSelection",
            1,
        )[0]
        water_click_body = click_body.split('if (hit.targetType === "water") {', 1)[1].split(
            "\n  if (runtimeState.selectedWaterRegionId)",
            1,
        )[0]
        special_click_body = click_body.split('if (hit.targetType === "special") {', 1)[1].split(
            '\n  if (hit.targetType === "water")',
            1,
        )[0]

        self.assertRegex(
            special_click_body,
            re.compile(
                r'runtimeState\.selectedSpecialRegionId = id;[\s\S]*?'
                r'refreshSpecialRegionSidebarRowsNow\(\[previousSpecialRegionId, id\]\);[\s\S]*?'
                r'requestInteractionRender\("select-special-region"\);',
                re.S,
            ),
        )
        self.assertRegex(
            water_click_body,
            re.compile(
                r'if \(macroOceanSelectionOnly\) \{\s*'
                r'requestInteractionRender\("click-select-open-ocean"\);',
                re.S,
            ),
        )
        self.assertRegex(
            water_click_body,
            re.compile(
                r'if \(runtimeState\.currentTool === "eyedropper"\) \{[\s\S]*?'
                r'requestInteractionRender\("eyedropper-water"\);[\s\S]*?'
                r'noteRenderAction\("eyedropper-water"',
                re.S,
            ),
        )
        self.assertRegex(
            click_body,
            re.compile(
                r'if \(runtimeState\.selectedWaterRegionId\) \{[\s\S]*?'
                r'runtimeState\.selectedWaterRegionId = "";[\s\S]*?'
                r'refreshWaterRegionSidebarRowsNow\(\[previousWaterRegionId\]\);[\s\S]*?'
                r'requestInteractionRender\("clear-water-selection-land-click"\);',
                re.S,
            ),
        )
        self.assertRegex(
            click_body,
            re.compile(
                r'if \(runtimeState\.selectedSpecialRegionId\) \{[\s\S]*?'
                r'runtimeState\.selectedSpecialRegionId = "";[\s\S]*?'
                r'refreshSpecialRegionSidebarRowsNow\(\[previousSpecialRegionId\]\);[\s\S]*?'
                r'requestInteractionRender\("clear-special-selection-land-click"\);',
                re.S,
            ),
        )
        self.assertRegex(
            renderer_content,
            re.compile(
                r'function applyWaterRegionFill[\s\S]*?if \(currentColor === color\) \{[\s\S]*?'
                r'refreshWaterRegionSidebarRowsNow\(\[resolvedId\]\);[\s\S]*?'
                r'requestInteractionRender\(kind\);[\s\S]*?'
                r'return false;',
                re.S,
            ),
        )


if __name__ == "__main__":
    unittest.main()
