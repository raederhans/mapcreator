from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
POLITICAL_COLLECTION_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "political_collection_owner.js"


class MapRendererPoliticalCollectionBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_keeps_transaction_owner_while_political_collection_moves_to_owner(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = POLITICAL_COLLECTION_OWNER_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn(
            "import { createPoliticalCollectionOwner } from './renderer/political_collection_owner.js';",
            renderer_imports,
        )
        self.assertIn("import { fragmentCamouflageRules } from './country_feature_policies.js';", renderer_imports)
        self.assertIn("fragmentCamouflageRules,", renderer_content)
        self.assertIn("function rebuildPoliticalLandCollections() {", renderer_content)
        self.assertIn("runtimeState.landDataFull = fullCollection;", renderer_content)
        self.assertIn("runtimeState.landData = interactiveCollection;", renderer_content)
        self.assertIn("setDebugCountryCoverageState(\n    runtimeState,", renderer_content)

        self.assertIn("export function createPoliticalCollectionOwner({", owner_content)


if __name__ == "__main__":
    unittest.main()
