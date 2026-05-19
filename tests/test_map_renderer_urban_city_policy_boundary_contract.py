from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
URBAN_CITY_POLICY_JS = REPO_ROOT / "js" / "core" / "renderer" / "urban_city_policy.js"


class MapRendererUrbanCityPolicyBoundaryContractTest(unittest.TestCase):
    def get_map_renderer_export_block(self, renderer_content):
        marker = "// Batch 5 facade note:"
        start = renderer_content.index(marker)
        block_start = renderer_content.index("export {", start)
        block_end = renderer_content.index("};", block_start)
        return renderer_content[block_start:block_end]

    def test_map_renderer_keeps_facade_while_urban_city_policy_owns_policy_logic(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        policy_content = URBAN_CITY_POLICY_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")
        renderer_export_block = self.get_map_renderer_export_block(renderer_content)

        self.assertIn("import { createUrbanCityPolicyOwner } from './renderer/urban_city_policy.js';", renderer_imports)
        self.assertIn("let urbanCityPolicyOwner = null;", renderer_content)
        self.assertIn("function getUrbanCityPolicyOwner() {", renderer_content)
        self.assertIn("const buildCityRevealPlan = (...args) => getUrbanCityPolicyOwner().buildCityRevealPlan(...args);", renderer_content)
        self.assertIn("const getEffectiveCityCollection = (...args) => getUrbanCityPolicyOwner().getEffectiveCityCollection(...args);", renderer_content)
        self.assertIn("buildCityRevealPlan,", renderer_export_block)
        self.assertIn("getEffectiveCityCollection,", renderer_export_block)
        self.assertNotIn("getCityScenarioTag", renderer_export_block)
        self.assertNotIn("doesScenarioCountryHideCityPoints", renderer_export_block)
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+getCityScenarioTag\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+getCityScenarioTag\s*\(", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+doesScenarioCountryHideCityPoints\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+doesScenarioCountryHideCityPoints\s*\(", renderer_content))
        self.assertNotIn("doesScenarioCountryHideCityPoints,", renderer_content)
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+getUrbanFeatureIndex\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+getUrbanFeatureIndex\s*\(", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+getCityUrbanRuntimeInfo\s*=", renderer_content))
        self.assertIsNone(re.search(r"(?m)^\s*function\s+getCityUrbanRuntimeInfo\s*\(", renderer_content))
        self.assertEqual(renderer_content.count("getUrbanCityPolicyOwner().getCityScenarioTag(feature)"), 2)
        self.assertEqual(renderer_content.count("getUrbanCityPolicyOwner().getUrbanFeatureIndex()"), 2)
        self.assertEqual(renderer_content.count("getUrbanCityPolicyOwner().getCityUrbanRuntimeInfo(feature, urbanIndex)"), 2)
        self.assertIn("const urbanFeatureIndexCache = {", renderer_content)
        self.assertIn("function getUrbanFeatureStableId(feature) {", renderer_content)
        self.assertIn("function getCityLayerRenderState(k, { interactive = false, cacheHoverEntries = false } = {}) {", renderer_content)
        self.assertIn("function drawCityPointsLayer(k, { interactive = false } = {}) {", renderer_content)
        self.assertIn("function drawLabelsPass(k, { interactive = false } = {}) {", renderer_content)

        self.assertIn("export function createUrbanCityPolicyOwner({", policy_content)
        self.assertIn("function getUrbanFeatureIndex() {", policy_content)
        self.assertIn("function getCityUrbanRuntimeInfo(feature, urbanIndex = getUrbanFeatureIndex()) {", policy_content)
        self.assertIn("function buildCityRevealPlan(cityCollection, scale, transform, config = {}) {", policy_content)
        self.assertIn("function getCityScenarioTag(feature) {", policy_content)
        self.assertIn("function doesScenarioCountryHideCityPoints(tag) {", policy_content)
        self.assertIn("function applyScenarioCityOverride(feature, overrideEntry) {", policy_content)
        self.assertIn("function getEffectiveCityCollection() {", policy_content)

        self.assertIsNone(re.search(r"function\s+cloneCityFeature\s*\(", renderer_content))
        self.assertIsNone(re.search(r"function\s+resolveCityFeatureKey\s*\(", renderer_content))
        self.assertIsNone(re.search(r"function\s+getScenarioCountryCodesForTag\s*\(", renderer_content))
        self.assertIsNone(re.search(r"function\s+compareCapitalCandidateEntries\s*\(", renderer_content))
        self.assertIsNone(re.search(r"function\s+applyScenarioCityOverride\s*\(", renderer_content))


if __name__ == "__main__":
    unittest.main()
