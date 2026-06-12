from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
COLOR_RESOLUTION_STRATEGY_JS = REPO_ROOT / "js" / "core" / "renderer" / "color_resolution_strategy.js"


class MapRendererColorResolutionStrategyBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_keeps_color_facade_while_strategy_moves_to_owner(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = COLOR_RESOLUTION_STRATEGY_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn(
            "import { createColorResolutionStrategyOwner } from './renderer/color_resolution_strategy.js';",
            renderer_imports,
        )
        self.assertIn("let colorResolutionStrategyOwner = null;", renderer_content)
        self.assertIn("function getColorResolutionStrategyOwner() {", renderer_content)
        self.assertIn(
            "const getDisplayOwnerCode = (...args) => getColorResolutionStrategyOwner().getDisplayOwnerCode(...args);",
            renderer_content,
        )
        self.assertIn(
            "const getResolvedFeatureColor = (...args) => getColorResolutionStrategyOwner().getResolvedFeatureColor(...args);",
            renderer_content,
        )
        self.assertIn("const resolved = getResolvedFeatureColor(feature, id);", renderer_content)
        rebuild_start = renderer_content.index("function rebuildResolvedColors() {")
        rebuild_end = renderer_content.index("function shouldRefreshContextBaseContoursForColorChanges()", rebuild_start)
        rebuild_body = renderer_content[rebuild_start:rebuild_end]
        self.assertNotIn("getLogicalCanvasDimensions", rebuild_body)
        self.assertNotIn("shouldSkipFeature", rebuild_body)
        self.assertIn("const colorSourceFeatures = getResolvedColorSourceFeatures();", rebuild_body)
        self.assertIn("colorSourceFeatures.forEach((feature, index) => {", rebuild_body)
        self.assertIn("function findResolvedColorFeatureById(featureId) {", rebuild_body)
        refresh_start = renderer_content.index("function refreshResolvedColorsForFeatures(")
        refresh_end = renderer_content.index("function refreshResolvedColorsForOwners(", refresh_start)
        refresh_body = renderer_content[refresh_start:refresh_end]
        self.assertIn("const feature = findResolvedColorFeatureById(id);", refresh_body)
        self.assertIn("function collectResolvedColorFeatureIdsForOwners(ownerCodes = []) {", renderer_content)
        owner_refresh_start = renderer_content.index("function refreshResolvedColorsForOwners(")
        owner_refresh_end = renderer_content.index("function refreshColorState(", owner_refresh_start)
        owner_refresh_body = renderer_content[owner_refresh_start:owner_refresh_end]
        self.assertIn("const ids = collectResolvedColorFeatureIdsForOwners(ownerCodes);", owner_refresh_body)
        derived_start = renderer_content.index("function rebuildRuntimeDerivedState({")
        derived_end = renderer_content.index("async function buildHitCanvasAfterStartup(", derived_start)
        derived_body = renderer_content[derived_start:derived_end]
        self.assertIn("const nextColors = rebuildResolvedColors();", derived_body)
        self.assertNotIn("collectResolvedColor", derived_body)

        self.assertIn('import { resolveFeatureColor } from "../color_resolver.js";', owner_content)
        self.assertIn("export function createColorResolutionStrategyOwner({", owner_content)
        self.assertIn("function getDisplayOwnerCode(feature, id) {", owner_content)
        self.assertIn("function getResolvedFeatureColor(feature, id) {", owner_content)
        self.assertIn("getOwnerCode: getDisplayOwnerCode,", owner_content)
        self.assertIn("state.scenarioAutoShellOwnerByFeatureId?.[resolvedId]", owner_content)
        self.assertNotIn("scenarioControllersByFeatureId", owner_content)

        self.assertIsNone(re.search(r"function\s+getDisplayOwnerCode\s*\(", renderer_content))
        self.assertIsNone(re.search(r"function\s+getResolvedFeatureColor\s*\(", renderer_content))
        self.assertNotIn('from "./color_resolver.js"', renderer_content)


if __name__ == "__main__":
    unittest.main()
