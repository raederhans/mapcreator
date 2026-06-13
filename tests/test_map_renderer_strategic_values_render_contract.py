from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"


class MapRendererStrategicValuesRenderContractTest(unittest.TestCase):
    def test_resource_markers_are_owned_by_context_markers_pass(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        imports = renderer_content.replace('"', "'")
        context_markers_body = renderer_content.split(
            "function drawContextMarkersPass(k, { interactive = false } = {}) {",
            1,
        )[1].split(
            "\nfunction drawContextScenarioPass",
            1,
        )[0]
        context_signature_body = renderer_content.split(
            'if (passName === "contextMarkers") {',
            1,
        )[1].split(
            "\n  }",
            1,
        )[0]

        self.assertIn(
            "import { buildStrategicResourceMarkerEntries } from './renderer/strategic_resource_markers.js';",
            imports,
        )
        self.assertIn('"drawStrategicResourceMarkersLayer"', renderer_content)
        self.assertIn("function getStrategicResourceMarkerLayerState(k) {", renderer_content)
        self.assertIn("function drawStrategicResourceMarkersLayer(k, { interactive = false } = {}) {", renderer_content)
        self.assertIn("buildStrategicResourceMarkerEntries(payload, {", renderer_content)
        self.assertIn('reason: "diagnostic-errors"', renderer_content)
        self.assertIn("drawStrategicResourceMarkersLayer(k, { interactive });", context_markers_body)
        self.assertIn('collectContextMetric("drawStrategicResourceMarkersLayer", 0, {', context_markers_body)
        self.assertIn(
            'runtimeState.showStrategicResourceMarkers ? "strategic-resources:on" : "strategic-resources:off"',
            context_signature_body,
        )
        self.assertIn(
            '`strategic:${Number(runtimeState.scenarioStrategicValuesRevision || 0)}:${String(runtimeState.strategicChoroplethMetric || "")}`',
            context_signature_body,
        )


if __name__ == "__main__":
    unittest.main()
