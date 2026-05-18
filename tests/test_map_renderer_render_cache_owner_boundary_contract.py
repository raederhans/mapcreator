from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RENDER_CACHE_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "render_cache_owner.js"


class MapRendererRenderCacheOwnerBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_keeps_cache_facade_while_render_cache_owner_holds_canvas_and_signature_state(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = RENDER_CACHE_OWNER_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn(
            "import { createRenderCacheOwner } from './renderer/render_cache_owner.js';",
            renderer_imports,
        )
        self.assertIn("let renderCacheOwner = null;", renderer_content)
        self.assertIn("function getRenderCacheOwner() {", renderer_content)
        self.assertIn("interactionCompositePassNames: INTERACTION_COMPOSITE_PASS_NAMES,", renderer_content)
        self.assertIn("renderPassNames: RENDER_PASS_NAMES,", renderer_content)
        self.assertIn("transformedFramePassNames: TRANSFORM_REUSED_RENDER_PASS_NAMES,", renderer_content)
        self.assertIn("function getRenderPassCacheState() {", renderer_content)
        self.assertIn("return getRenderCacheOwner().getRenderPassCacheState();", renderer_content)
        self.assertIn("return getRenderCacheOwner().getRenderPassLayout(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().resizeRenderPassCanvases(passNames);", renderer_content)
        self.assertIn("return getRenderCacheOwner().ensureRenderPassCanvas(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().ensureLastGoodFrameCanvas();", renderer_content)
        self.assertIn("return getRenderCacheOwner().ensureInteractionCompositeCanvas();", renderer_content)
        self.assertIn("return getRenderCacheOwner().ensureCompositeBufferCanvas();", renderer_content)
        self.assertIn("return getRenderCacheOwner().getPassReferenceTransform(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().setPassReferenceTransform(passName, transform);", renderer_content)
        self.assertIn("return getRenderCacheOwner().getPassFullReferenceTransform(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().setPassFullReferenceTransform(passName, transform);", renderer_content)
        self.assertIn("return getRenderCacheOwner().hasPassFullReferenceTransform(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().clearPassFullReferenceTransforms(passNames);", renderer_content)
        self.assertIn("return getRenderCacheOwner().getInteractionCompositeSignature(cache);", renderer_content)
        self.assertIn("return getRenderCacheOwner().canDrawInteractionComposite(currentTransform, cache);", renderer_content)

        self.assertIn("export function createRenderCacheOwner({", owner_content)
        self.assertIn("function getRenderPassCacheState() {", owner_content)
        self.assertIn("function buildRenderPassLayout(passName) {", owner_content)
        self.assertIn("function resizeRenderPassCanvases(passNames = renderPassNames) {", owner_content)
        self.assertIn("function ensureRenderPassCanvas(passName) {", owner_content)
        self.assertIn("resizeRenderPassCanvases([passName]);", owner_content)
        self.assertIn("function ensureLastGoodFrameCanvas() {", owner_content)
        self.assertIn("function ensureInteractionCompositeCanvas() {", owner_content)
        self.assertIn("function ensureCompositeBufferCanvas() {", owner_content)
        self.assertIn("function getPassFullReferenceTransform(passName) {", owner_content)
        self.assertIn("function setPassFullReferenceTransform(passName, transform) {", owner_content)
        self.assertIn("function hasPassFullReferenceTransform(passName) {", owner_content)
        self.assertIn("function clearPassFullReferenceTransforms(passNames = null) {", owner_content)
        self.assertIn("function getInteractionCompositeRejectReason(composite, currentTransform, cache = getRenderPassCacheState()) {", owner_content)
        self.assertIn("function canDrawInteractionComposite(currentTransform, cache = getRenderPassCacheState()) {", owner_content)
        self.assertIn("invalidateInteractionComposite(rejectReason);", owner_content)
        self.assertIn("return transform ? cloneZoomTransform(transform) : null;", owner_content)
        self.assertIn("cache.fullReferenceTransforms[passName] = cloneZoomTransform(transform);", owner_content)
        self.assertNotIn("return cache.referenceTransform ? cloneZoomTransform(cache.referenceTransform) : null;", owner_content.split("function getPassFullReferenceTransform(passName) {", 1)[1].split("function setPassFullReferenceTransform", 1)[0])

        self.assertIsNone(re.search(r"function\s+buildRenderPassLayout\s*\(", renderer_content))
        self.assertIsNone(re.search(r"function\s+getInteractionCompositeRejectReason\s*\(", renderer_content))


if __name__ == "__main__":
    unittest.main()
