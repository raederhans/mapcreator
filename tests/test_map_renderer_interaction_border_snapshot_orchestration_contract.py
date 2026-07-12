from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RENDER_CACHE_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "render_cache_owner.js"
ZOOM_INTERACTION_LIFECYCLE_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "zoom_interaction_lifecycle_owner.js"
TRANSFORMED_FRAME_COMPOSITOR_OWNER_JS = (
    REPO_ROOT / "js" / "core" / "map_renderer" / "transformed_frame_compositor_owner.js"
)


class MapRendererInteractionBorderSnapshotOrchestrationContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        cls.render_cache_owner_content = RENDER_CACHE_OWNER_JS.read_text(encoding="utf-8")
        cls.zoom_interaction_lifecycle_owner_content = ZOOM_INTERACTION_LIFECYCLE_OWNER_JS.read_text(encoding="utf-8")
        cls.transformed_frame_compositor_owner_content = (
            TRANSFORMED_FRAME_COMPOSITOR_OWNER_JS.read_text(encoding="utf-8")
        )

    def test_borders_invalidation_still_invalidates_interaction_snapshot(self):
        self.assertIn('targetPassNames.includes("borders")', self.renderer_content)
        self.assertIn("hostFollowUps.needsInteractionBorderSnapshotInvalidation", self.renderer_content)
        self.assertIn('invalidateInteractionBorderSnapshot(reason);', self.renderer_content)

    def test_clear_reference_transform_for_borders_still_invalidates_snapshot(self):
        self.assertIn('const needsInteractionBorderSnapshotInvalidation = targetPassNames.includes("borders");', self.render_cache_owner_content)
        self.assertIn("clearPassFullReferenceTransforms(targetPassNames);", self.render_cache_owner_content)
        self.assertIn('invalidateInteractionBorderSnapshot(mutation.reason || "clear-reference-transform");', self.renderer_content)
        self.assertRegex(
            self.renderer_content,
            re.compile(
                r"if \(hostFollowUps\.needsInteractionBorderSnapshotInvalidation \|\| mutation\.interactionBorderSnapshotInvalidated\) \{\s*"
                r'invalidateInteractionBorderSnapshot\(mutation\.reason \|\| "clear-reference-transform"\);',
                re.S,
            ),
        )

    def test_transformed_frame_still_prefers_snapshot_before_border_pass_fallback(self):
        self.assertIn("drawInteractionBorderSnapshot,", self.renderer_content)
        self.assertIn("drawBordersPass,", self.renderer_content)
        fallback_block = re.search(
            r'if \(!drawInteractionBorderSnapshot\(currentTransform\)\) \{(?P<body>[\s\S]*?)drawBordersPass\(k, \{ interactive: !!interactiveBorders \}\);',
            self.transformed_frame_compositor_owner_content,
        )
        self.assertIsNotNone(fallback_block)
        body = fallback_block.group("body")
        self.assertIn("const k = Math.max(0.0001, Number(currentTransform?.k || 1));", body)
        self.assertIn("const dpr = getDpr();", body)
        self.assertIn(".setTransform(dpr, 0, 0, dpr, 0, 0);", body)
        self.assertIn(".translate(currentTransform.x, currentTransform.y);", body)
        self.assertIn(".scale(k, k);", body)

    def test_zoom_start_still_captures_interaction_border_snapshot(self):
        self.assertIn("effects.captureInteractionBorderSnapshot?.(getCurrentTransform());", self.zoom_interaction_lifecycle_owner_content)
        self.assertIn("captureInteractionBorderSnapshot,", self.renderer_content)
        self.assertRegex(
            self.zoom_interaction_lifecycle_owner_content,
            re.compile(
                r"function handleZoomStart\(\) \{[\s\S]*?"
                r"effects\.setRenderPhase\?\.\(renderPhaseInteracting\);[\s\S]*?"
                r"effects\.captureInteractionBorderSnapshot\?\.\(getCurrentTransform\(\)\);",
                re.S,
            ),
        )


if __name__ == "__main__":
    unittest.main()
