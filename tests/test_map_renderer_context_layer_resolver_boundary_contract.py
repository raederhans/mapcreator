from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
CONTEXT_LAYER_RESOLVER_JS = REPO_ROOT / "js" / "core" / "renderer" / "context_layer_resolver.js"


class MapRendererContextLayerResolverBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_keeps_pass_dispatch_while_context_layer_resolution_moves_to_owner(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = CONTEXT_LAYER_RESOLVER_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn(
            "import { createContextLayerResolverOwner } from './renderer/context_layer_resolver.js';",
            renderer_imports,
        )
        self.assertIn("runtimeState: state,", renderer_content)
        self.assertIn("function invalidateContextLayerVisualStateBatch(layerNames, reason = \"context-layer-loaded\", { renderNow = true } = {}) {", renderer_content)
        self.assertIn('const targetPasses = new Set(["contextBase"]);', renderer_content)
        self.assertIn('requestRendererRender(`context-layer-visual:${reason}`, { flush: true });', renderer_content)

        self.assertIn("export function createContextLayerResolverOwner({", owner_content)


if __name__ == "__main__":
    unittest.main()
