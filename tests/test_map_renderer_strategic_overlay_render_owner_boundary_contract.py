from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
RENDER_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_render_owner.js"
HELPERS_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_helpers.js"
RUNTIME_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "strategic_overlay_runtime_owner.js"


class MapRendererStrategicOverlayRenderOwnerBoundaryContractTest(unittest.TestCase):
    def test_render_owner_does_not_write_interaction_overlay_state(self):
        render_owner_content = RENDER_OWNER_JS.read_text(encoding="utf-8")

        self.assertNotIn("state.inspectorOverlayDirty", render_owner_content)
        self.assertNotIn("state.hoverOverlayDirty", render_owner_content)

    def test_render_owner_does_not_import_runtime_or_leaf_draw_owners(self):
        render_owner_content = RENDER_OWNER_JS.read_text(encoding="utf-8")
        helpers_owner_content = HELPERS_OWNER_JS.read_text(encoding="utf-8")
        runtime_owner_content = RUNTIME_OWNER_JS.read_text(encoding="utf-8")

        self.assertNotIn("./strategic_overlay_helpers.js", render_owner_content)
        self.assertNotIn("./strategic_overlay_runtime_owner.js", render_owner_content)
        self.assertNotIn("./strategic_overlay_render_owner.js", helpers_owner_content)
        self.assertNotIn("./strategic_overlay_render_owner.js", runtime_owner_content)
        self.assertNotIn('markDirty("move-unit-counter");', render_owner_content)


if __name__ == "__main__":
    unittest.main()
