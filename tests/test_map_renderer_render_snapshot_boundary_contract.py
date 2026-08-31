from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RENDER_SNAPSHOT_JS = REPO_ROOT / "js" / "core" / "renderer" / "render_snapshot.js"
RENDER_CHANGE_SET_JS = REPO_ROOT / "js" / "core" / "render_change_set.js"


def get_function_body(source, function_name):
    match = re.search(
        rf"function {re.escape(function_name)}\([^)]*\) \{{(?P<body>[\s\S]*?)\n\}}",
        source,
    )
    if match is None:
        raise AssertionError(f"Expected function {function_name} to exist")
    return match.group("body")


class MapRendererRenderSnapshotBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_owns_one_lazy_snapshot_owner_and_read_only_facade(self):
        renderer = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_body = get_function_body(renderer, "getRenderSnapshotOwner")
        facade_body = get_function_body(renderer, "captureRenderSnapshot")

        self.assertEqual(renderer.count("let renderSnapshotOwner = null;"), 1)
        self.assertIn(
            'import { createRenderSnapshotOwner } from "./renderer/render_snapshot.js";',
            renderer,
        )
        self.assertIn("renderSnapshotOwner = createRenderSnapshotOwner({", owner_body)
        self.assertIn("getSovereignBaseColors: () => runtimeState.sovereignBaseColors,", owner_body)
        self.assertIn("getSovereigntyByFeatureId: () => runtimeState.sovereigntyByFeatureId,", owner_body)
        self.assertIn("getViewportTransform: () => runtimeState.zoomTransform", owner_body)
        self.assertIn("getViewportRenderSignature", owner_body)
        self.assertIn("getProjectionRenderSignature", owner_body)
        self.assertIn("getViewportGeoBounds", owner_body)
        self.assertEqual(
            facade_body.strip(),
            "return getRenderSnapshotOwner().captureRenderSnapshot();",
        )
        self.assertRegex(renderer, r"\n\s+captureRenderSnapshot,\n")

    def test_snapshot_and_change_set_modules_are_declarative_only(self):
        snapshot = RENDER_SNAPSHOT_JS.read_text(encoding="utf-8")
        change_set = RENDER_CHANGE_SET_JS.read_text(encoding="utf-8")

        for token in [
            "sovereignBaseColors",
            "sovereigntyByFeatureId",
            "getViewportRenderSignature",
            "getProjectionRenderSignature",
            "getViewportGeoBounds",
        ]:
            self.assertIn(token, snapshot)

        for forbidden in [
            "history_manager",
            "pushHistoryEntry",
            "runtimeState",
            "requestRender",
            "render_boundary",
            "document.",
            "globalThis.d3",
        ]:
            self.assertNotIn(forbidden, snapshot)
            self.assertNotIn(forbidden, change_set)

        self.assertIn("sideEffectsPerformed: false", change_set)
        self.assertIn("RENDER_CHANGE_SET_ERROR.BASE_STALE", change_set)
        self.assertNotRegex(change_set, r"\.apply\(")
        self.assertNotRegex(change_set, r"\.undo\(")


if __name__ == "__main__":
    unittest.main()
