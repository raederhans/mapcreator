from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
CITY_LABEL_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "city_label_owner.js"
CITY_POINTS_RENDER_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "city_points_render_owner.js"


class MapRendererCityLabelOwnerBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_keeps_label_pass_while_city_label_owner_draws_labels(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = CITY_LABEL_OWNER_JS.read_text(encoding="utf-8")
        city_points_owner_content = CITY_POINTS_RENDER_OWNER_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn(
            "import { createCityLabelOwner } from './renderer/city_label_owner.js';",
            renderer_imports,
        )
        self.assertIn("let cityLabelOwner = null;", renderer_content)
        self.assertIn("function getCityLabelOwner() {", renderer_content)
        self.assertIn("drawCityLabelsFromEntries: (...args) => getCityLabelOwner().drawCityLabelsFromEntries(...args),", renderer_content)
        self.assertIsNone(re.search(r"(?m)^\s*(?:const|let|var)\s+drawCityLabelsFromEntries\s*=", renderer_content))
        self.assertIsNone(re.search(r"function\s+drawCityLabelsFromEntries\s*\(", renderer_content))
        self.assertIn("function drawLabelsPass(k, { interactive = false } = {}) {", renderer_content)
        self.assertIn("return getCityPointsRenderOwner().drawLabelsPass(k, { interactive });", renderer_content)
        self.assertIn("const labelCount = drawCityLabelsFromEntries(renderState.labelEntries, {", city_points_owner_content)

        self.assertIn("export function createCityLabelOwner({ constants = {}, getters = {}, helpers = {} } = {}) {", owner_content)
        self.assertIn("function drawCityLabelsFromEntries(labelEntries, { config, scale } = {}) {", owner_content)
        self.assertIn("function doScreenBoxesOverlap(a, b) {", owner_content)
        self.assertIn("entry.acceptedLabelPlacement = acceptedPlacement.id;", owner_content)
        self.assertIn("entry.labelContrastMode = labelStyle.usesLightLabel ? \"light\" : \"default\";", owner_content)
        self.assertIsNone(re.search(r"function\s+doScreenBoxesOverlap\s*\(", renderer_content))

    def test_labels_pass_signature_tracks_city_style_once(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        labels_signature_token = 'if (passName === "labels") {'

        self.assertEqual(renderer_content.count(labels_signature_token), 1)
        labels_signature = renderer_content.split(labels_signature_token, 1)[1].split(
            'if (passName === "contextScenario") {',
            1,
        )[0]

        for token in [
            "getHgoRuntimePreviewVisibilitySignature()",
            'runtimeState.showBlankFeatureLabels ? "blank-feature-labels:on" : "blank-feature-labels:off"',
            '`cities:${Number(runtimeState.cityLayerRevision || 0)}`',
            '`colors:${Number(runtimeState.colorRevision || 0)}`',
            "stableJson(normalizeCityLayerStyleConfig(runtimeState.styleConfig?.cityPoints || {}))",
        ]:
            self.assertIn(token, labels_signature)


if __name__ == "__main__":
    unittest.main()
