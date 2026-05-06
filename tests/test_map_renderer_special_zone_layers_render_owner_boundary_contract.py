from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
SPECIAL_ZONE_RENDER_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "special_zone_layers_render_owner.js"


class MapRendererSpecialZoneLayersRenderOwnerBoundaryContractTest(unittest.TestCase):
    def test_special_zone_layers_render_owner_owns_patterns_and_merged_outlines(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = SPECIAL_ZONE_RENDER_OWNER_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn("import { createSpecialZoneLayersRenderOwner } from './renderer/special_zone_layers_render_owner.js';", renderer_imports)
        self.assertIn("let specialZoneLayersRenderOwner = null;", renderer_content)
        self.assertIn("function getSpecialZoneLayersRenderOwner() {", renderer_content)
        self.assertIn("getSpecialZoneLayersRenderOwner().updateSpecialZonesPaths();", renderer_content)
        self.assertIn("getSpecialZoneLayersRenderOwner().getEffectiveSpecialZonesFeatureCollection();", renderer_content)
        self.assertIn("syncSpecialZonePatternTransformDuringZoom();", renderer_content)

        self.assertIn("export function createSpecialZoneLayersRenderOwner({", owner_content)
        self.assertIn("buildSpecialZoneRenderFeatures", owner_content)
        self.assertIn("function renderPatternDefs(features) {", owner_content)
        self.assertIn('patternUnits", "userSpaceOnUse"', owner_content)
        self.assertIn("function getPatternTransform(transform = {}) {", owner_content)
        self.assertIn("function syncPatternTransformDuringZoom() {", owner_content)
        self.assertIn("function getLayerOutlineFeature(layer, geometryIndex, topology) {", owner_content)
        self.assertIn("function getLayerOutlineStyleCacheSignature(layer) {", owner_content)
        self.assertIn("String(style.stroke || \"\")", owner_content)
        self.assertIn("String(style.strokeOpacity ?? \"\")", owner_content)
        self.assertIn("String(style.strokeWidth ?? \"\")", owner_content)
        self.assertIn("String(style.pattern || \"\")", owner_content)
        self.assertIn("globalThis.topojson.merge(topology, geoms)", owner_content)
        self.assertIn('selectAll("path.special-zone-outline")', owner_content)

        self.assertNotIn("function renderSpecialZonePatternDefs(features) {", renderer_content)
        self.assertNotIn("function getSpecialZonePatternDefId(feature, style) {", renderer_content)


if __name__ == "__main__":
    unittest.main()
