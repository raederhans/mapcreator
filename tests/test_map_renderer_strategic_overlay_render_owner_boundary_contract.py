from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RENDER_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_render_owner.js"
HELPERS_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_helpers.js"
RUNTIME_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_runtime_owner.js"
UNIT_COUNTER_DOMAIN_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_runtime" / "unit_counter_runtime_domain.js"


class MapRendererStrategicOverlayRenderOwnerBoundaryContractTest(unittest.TestCase):
    def test_render_owner_owns_strategic_overlay_render_gates(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        render_owner_content = RENDER_OWNER_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn("import { createStrategicOverlayRenderOwner } from './renderer/strategic_overlay_render_owner.js';", renderer_imports)
        self.assertIn("let strategicOverlayRenderOwner = null;", renderer_content)
        self.assertIn("function getStrategicOverlayRenderOwner() {", renderer_content)
        self.assertIn("export function createStrategicOverlayRenderOwner({", render_owner_content)

        for symbol in [
            "getSpecialZonesOverlaySignature",
            "getFrontlineOverlaySignature",
            "getOperationGraphicsOverlaySignature",
            "getOperationalLinesOverlaySignature",
            "getUnitCountersOverlaySignature",
        ]:
            self.assertNotIn(f"function {symbol}(", renderer_content)
            self.assertIn(f"function {symbol}(", render_owner_content)

        for symbol in [
            "renderSpecialZonesIfNeeded",
            "renderFrontlineOverlayIfNeeded",
            "renderOperationGraphicsIfNeeded",
            "renderOperationalLinesIfNeeded",
            "renderUnitCountersIfNeeded",
        ]:
            self.assertIn(f"function {symbol}({{ force = false }} = {{}}) {{", renderer_content)
            self.assertIn(f"getStrategicOverlayRenderOwner().{symbol}({{ force }});", renderer_content)
            self.assertIn(f"function {symbol}({{ force = false }} = {{}}) {{", render_owner_content)

        self.assertIn("getStrategicOverlayRenderOwner().syncUnitCounterScalesDuringZoom();", renderer_content)
        self.assertIn("syncUnitCounterScalesDuringZoom,", render_owner_content)
        self.assertIn("if (inspector) runtimeState.inspectorOverlayDirty = true;", renderer_content)
        self.assertIn("if (hover) runtimeState.hoverOverlayDirty = true;", renderer_content)
        self.assertNotIn("inspector =", render_owner_content)
        self.assertNotIn("hover =", render_owner_content)
        self.assertNotIn("state.inspectorOverlayDirty", render_owner_content)
        self.assertNotIn("state.hoverOverlayDirty", render_owner_content)

    def test_render_owner_does_not_import_runtime_or_leaf_draw_owners(self):
        render_owner_content = RENDER_OWNER_JS.read_text(encoding="utf-8")
        helpers_owner_content = HELPERS_OWNER_JS.read_text(encoding="utf-8")
        runtime_owner_content = RUNTIME_OWNER_JS.read_text(encoding="utf-8")
        unit_counter_domain_content = UNIT_COUNTER_DOMAIN_JS.read_text(encoding="utf-8")

        self.assertNotIn("./strategic_overlay_helpers.js", render_owner_content)
        self.assertNotIn("./strategic_overlay_runtime_owner.js", render_owner_content)
        self.assertNotIn("./strategic_overlay_render_owner.js", helpers_owner_content)
        self.assertNotIn("./strategic_overlay_render_owner.js", runtime_owner_content)
        self.assertIn("function beginUnitCounterDrag(counter = null) {", unit_counter_domain_content)
        self.assertIn("function moveUnitCounterDrag(counter = null, coord = null) {", unit_counter_domain_content)
        self.assertIn("function finishUnitCounterDrag(counter = null, { featureId = \"\" } = {}) {", unit_counter_domain_content)
        self.assertIn("function selectUnitCounterFromRender(counter = null) {", unit_counter_domain_content)
        self.assertNotIn('markDirty("move-unit-counter");', render_owner_content)


if __name__ == "__main__":
    unittest.main()
