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
        self.assertIn("collectResolvedColor(id, resolvedColor) {", renderer_content)
        self.assertIn("const resolved = getResolvedFeatureColor(feature, id);", renderer_content)

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
