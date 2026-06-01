from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RENDER_PIPELINE_PASSES_JS = REPO_ROOT / "js" / "core" / "renderer" / "render_pipeline_passes.js"


class MapRendererRenderPipelinePassesBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_keeps_pass_orchestration_shell_while_idle_pass_owner_moves_to_module(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = RENDER_PIPELINE_PASSES_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn(
            "import { createRenderPipelinePassesOwner } from './renderer/render_pipeline_passes.js';",
            renderer_imports,
        )
        self.assertIn("let renderPipelinePassesOwner = null;", renderer_content)
        self.assertIn("function getRenderPipelinePassesOwner() {", renderer_content)
        self.assertIn("exactAfterSettleDeferredPassNames: EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES,", renderer_content)
        self.assertIn("drawContextScenarioPass,", renderer_content)
        self.assertIn("drawTextureLabelEffectsPass,", renderer_content)
        self.assertIn("getContextScenarioReuseDecision,", renderer_content)
        self.assertIn("tryPartialPoliticalPassRepaint,", renderer_content)
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+getIdleRenderPassDefinitions\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+prepareIdleRenderPassDefinition\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+ensureIdleRenderPasses\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+getIdleRenderPassDefinitions\s*\(", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+prepareIdleRenderPassDefinition\s*\(", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+ensureIdleRenderPasses\s*\(", renderer_content))
        self.assertEqual(renderer_content.count("getRenderPipelinePassesOwner().getIdleRenderPassDefinitions()"), 5)
        self.assertEqual(
            renderer_content.count(
                "getRenderPipelinePassesOwner().prepareIdleRenderPassDefinition(passName, drawFn, transform, timings, cache);"
            ),
            2,
        )
        self.assertEqual(renderer_content.count("getRenderPipelinePassesOwner().ensureIdleRenderPasses("), 2)

        self.assertIn("export function createRenderPipelinePassesOwner({", owner_content)
        self.assertIn("function getIdleRenderPassDefinitions() {", owner_content)
        self.assertIn('["background", (k) => drawBackgroundPass(k)],', owner_content)
        self.assertIn('["contextScenario", (k) => drawContextScenarioPass(k)],', owner_content)
        self.assertIn('["textureLabels", (k) => drawTextureLabelEffectsPass(k)],', owner_content)
        self.assertIn("function shouldDeferExactAfterSettlePassForCriticalPaint(passName", owner_content)
        self.assertIn("function prepareIdleRenderPassDefinition(passName, drawFn, transform, timings", owner_content)
        self.assertIn('recordRenderPerfMetric("contextScenarioSignatureChanged"', owner_content)
        self.assertIn('recordRenderPerfMetric("contextScenarioReuseSkipped"', owner_content)
        self.assertIn('tryPartialPoliticalPassRepaint(transform, nextSignature, timings)', owner_content)
        self.assertIn("function ensureIdleRenderPasses(timings) {", owner_content)
        self.assertIn("detectContextScenarioReasonMismatch({ cache, renderPerf: state.renderPerfMetrics || {} });", owner_content)

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
        self.assertIn('runtimeState.hoveredWaterRegionId ? 1.25 : 2.0', hover_overlay_body)

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


if __name__ == "__main__":
    unittest.main()
