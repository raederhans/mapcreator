from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
DEV_MUTATION_SERVICE_JS = REPO_ROOT / "js" / "ui" / "dev_workspace" / "dev_mutation_service.js"
DEV_WORKSPACE_JS = REPO_ROOT / "js" / "ui" / "dev_workspace.js"
SCENARIO_TAG_CREATOR_CONTROLLER_JS = REPO_ROOT / "js" / "ui" / "dev_workspace" / "scenario_tag_creator_controller.js"


class DevWorkspaceSplitBoundaryContractTest(unittest.TestCase):
    def test_dev_workspace_imports_scenario_tag_creator_controller(self):
        content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")

        self.assertIn('./dev_workspace/scenario_tag_creator_controller.js', content)
        self.assertIn("createScenarioTagCreatorController", content)

    def test_scenario_tag_creator_owner_moves_to_controller(self):
        donor_content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")
        owner_content = SCENARIO_TAG_CREATOR_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertIn("export function createScenarioTagCreatorController", owner_content)
        self.assertIn("const ensureTagCreatorState = () => {", owner_content)
        self.assertIn("const buildTagCreatorPaletteRows = () => {", owner_content)
        self.assertIn("const buildScenarioTagCreatorPayload = () => {", owner_content)
        self.assertIn("const applyScenarioTagCreatorSuccess = (response, payload, targetIds = []) => {", owner_content)
        self.assertIn("const clearScenarioTagCreatorSelectionTarget = () => {", owner_content)
        self.assertIn("const render = ({ hasActiveScenario }) => {", owner_content)
        self.assertIn("const bindEvents = () => {", owner_content)

        self.assertIsNone(re.search(r"function\s+readStoredTagCreatorRecentColors\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+ensureTagCreatorState\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+buildScenarioTagCreatorPayload\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+applyScenarioTagCreatorSuccess\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+clearScenarioTagCreatorSelectionTarget\s*\(", donor_content))

    def test_dev_workspace_keeps_render_facade_contract(self):
        content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")

        self.assertIn("scenarioTagCreatorController = createScenarioTagCreatorController({", content)
        self.assertIn("scenarioTagCreatorController?.render({ hasActiveScenario });", content)
        self.assertIn("scenarioTagCreatorController.bindEvents();", content)
        self.assertIn('registerRuntimeHook(state, "updateDevWorkspaceUIFn", renderWorkspace);', content)
        self.assertIn('registerRuntimeHook(state, "setDevWorkspaceExpandedFn", (nextValue) => {', content)
        self.assertIn("export { getScenarioGeoLocaleEntry, initDevWorkspace };", content)

    def test_controller_keeps_tag_create_runtime_contracts(self):
        owner_content = SCENARIO_TAG_CREATOR_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertIn('import { postDevScenarioMutation } from "./dev_mutation_service.js";', owner_content)
        self.assertIn('postDevScenarioMutation("/__dev/scenario/tag/create", built.payload)', owner_content)
        self.assertIn('runtimeState.devWorkspaceTagPopoverDismissHandler = (event) => {', owner_content)
        self.assertIn('flushDevWorkspaceRender("dev-workspace-tag-create");', owner_content)
        self.assertIn('flushDevWorkspaceRender("dev-workspace-tag-clear-target");', owner_content)
        self.assertIn('runtimeState.devScenarioTagCreator = {', owner_content)

    def test_dev_mutation_service_is_narrow_post_boundary(self):
        helper_content = DEV_MUTATION_SERVICE_JS.read_text(encoding="utf-8")

        self.assertIn('export async function postDevScenarioMutation(endpoint, payload)', helper_content)
        self.assertIn('const DEV_SCENARIO_MUTATION_PREFIX = "/__dev/scenario/";', helper_content)
        self.assertIn("const DEV_SCENARIO_MUTATION_ENDPOINTS = new Set([", helper_content)
        self.assertEqual(8, len(re.findall(r'"/__dev/scenario/[^"]+"', helper_content)))
        self.assertIn('method: "POST",', helper_content)
        self.assertIn('"Content-Type": "application/json"', helper_content)
        self.assertIn('body: JSON.stringify(payload)', helper_content)
        self.assertNotIn('/api/scenario-diagnostics/', helper_content)
        self.assertNotIn('/.runtime/dev/active_server.json', helper_content)
        self.assertNotIn('/__dev/startup-support/key-usage-report', helper_content)


if __name__ == "__main__":
    unittest.main()
