from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RUNTIME_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_runtime_owner.js"
HELPERS_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_helpers.js"
RENDER_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_render_owner.js"
SPECIAL_ZONES_DOMAIN_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_runtime" / "special_zones_runtime_domain.js"
UNIT_COUNTER_DOMAIN_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_runtime" / "unit_counter_runtime_domain.js"
UNIT_COUNTER_HELPERS_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_runtime" / "unit_counter_runtime_helpers.js"


class MapRendererStrategicOverlayRuntimeOwnerBoundaryContractTest(unittest.TestCase):
    def test_renderer_does_not_own_strategic_edit_transactions(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        special_zones_content = SPECIAL_ZONES_DOMAIN_JS.read_text(encoding="utf-8")

        self.assertNotIn("facade_overlay_runtime.js", renderer_content)

        self.assertNotIn("datum.__historyBefore", renderer_content)
        self.assertNotIn('kind: "insert-operation-graphic-vertex"', renderer_content)
        self.assertNotIn('kind: "move-operation-graphic-vertex"', renderer_content)
        self.assertNotIn("specialZoneMembershipDragSession = {", renderer_content)
        self.assertNotIn("kind: `special-zone-membership-${mode}`", renderer_content)
        self.assertNotIn("kind: `special-zone-membership-drag-${current.mode}`", renderer_content)
        self.assertNotIn("state.manualSpecialZones.features.push", special_zones_content)

    def test_runtime_owner_stays_separate_from_draw_helpers_owner(self):
        owner_content = RUNTIME_OWNER_JS.read_text(encoding="utf-8")
        helpers_content = HELPERS_OWNER_JS.read_text(encoding="utf-8")
        render_owner_content = RENDER_OWNER_JS.read_text(encoding="utf-8")
        unit_counter_domain_content = UNIT_COUNTER_DOMAIN_JS.read_text(encoding="utf-8")
        unit_counter_helpers_content = UNIT_COUNTER_HELPERS_JS.read_text(encoding="utf-8")

        self.assertNotIn("./strategic_overlay_helpers.js", owner_content)
        self.assertNotIn("./strategic_overlay_render_owner.js", owner_content)
        self.assertNotIn("./strategic_overlay_runtime_owner.js", helpers_content)
        self.assertNotIn("./strategic_overlay_render_owner.js", helpers_content)
        self.assertNotIn("./strategic_overlay_runtime_owner.js", render_owner_content)
        self.assertNotIn("./strategic_overlay_helpers.js", render_owner_content)
        self.assertNotIn("./strategic_overlay_helpers.js", unit_counter_domain_content)
        self.assertNotIn("./strategic_overlay_helpers.js", unit_counter_helpers_content)
        self.assertNotIn("./strategic_overlay_runtime_owner.js", unit_counter_domain_content)
        self.assertNotIn("./strategic_overlay_runtime_owner.js", unit_counter_helpers_content)


if __name__ == "__main__":
    unittest.main()
