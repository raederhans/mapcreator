from pathlib import Path
import re
import unittest

from tools.pages_artifact_root import resolve_pages_artifact_root

REPO_ROOT = Path(__file__).resolve().parents[1]
PAGES_DIST_ROOT = resolve_pages_artifact_root(repo_root=REPO_ROOT)
DEV_MUTATION_SERVICE_JS = REPO_ROOT / "js" / "ui" / "dev_workspace" / "dev_mutation_service.js"
DEV_WORKSPACE_JS = REPO_ROOT / "js" / "ui" / "dev_workspace.js"
DEV_STATE_JS = REPO_ROOT / "js" / "core" / "state" / "dev_state.js"
SCENARIO_TEXT_EDITORS_CONTROLLER_JS = REPO_ROOT / "js" / "ui" / "dev_workspace" / "scenario_text_editors_controller.js"
DEV_WORKSPACE_SHELL_BUILDER_JS = REPO_ROOT / "js" / "ui" / "dev_workspace" / "dev_workspace_shell_builder.js"
SCENARIO_COUNTRY_COLOR_EDITOR_JS = REPO_ROOT / "js" / "ui" / "dev_workspace" / "scenario_country_color_editor.js"
DIST_DEV_STATE_JS = PAGES_DIST_ROOT / "app" / "js" / "core" / "state" / "dev_state.js"
DIST_SCENARIO_TEXT_EDITORS_CONTROLLER_JS = (
    PAGES_DIST_ROOT / "app" / "js" / "ui" / "dev_workspace" / "scenario_text_editors_controller.js"
)
DIST_DEV_WORKSPACE_SHELL_BUILDER_JS = (
    PAGES_DIST_ROOT / "app" / "js" / "ui" / "dev_workspace" / "dev_workspace_shell_builder.js"
)
DIST_SCENARIO_COUNTRY_COLOR_EDITOR_JS = (
    PAGES_DIST_ROOT / "app" / "js" / "ui" / "dev_workspace" / "scenario_country_color_editor.js"
)


class DevWorkspaceScenarioTextEditorsBoundaryContractTest(unittest.TestCase):
    def test_dev_workspace_imports_scenario_text_editors_controller(self):
        content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")

        self.assertIn('./dev_workspace/scenario_text_editors_controller.js', content.replace('"', "'"))
        self.assertIn("createScenarioTextEditorsController", content)

    def test_scenario_text_editors_owner_moves_to_controller(self):
        donor_content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")
        owner_content = SCENARIO_TEXT_EDITORS_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertIn("export function createScenarioTextEditorsController", owner_content)
        self.assertIn("const resolveCountryEditorModel = () => {", owner_content)
        self.assertIn("const resolveCapitalEditorModel = () => {", owner_content)
        self.assertIn("const resolveLocaleEditorModel = () => {", owner_content)
        self.assertIn("const render = ({ hasActiveScenario }) => {", owner_content)
        self.assertIn("const bindEvents = () => {", owner_content)
        self.assertIn('import { postDevScenarioMutation } from "./dev_mutation_service.js";', owner_content)
        self.assertIn('postDevScenarioMutation("/__dev/scenario/country/save", built.payload)', owner_content)
        self.assertIn('postDevScenarioMutation("/__dev/scenario/capital/save", built.payload)', owner_content)
        self.assertIn('postDevScenarioMutation("/__dev/scenario/geo-locale/save", {', owner_content)
        self.assertNotIn('fetch("/__dev/scenario/country/save"', owner_content)
        self.assertNotIn('fetch("/__dev/scenario/capital/save"', owner_content)
        self.assertNotIn('fetch("/__dev/scenario/geo-locale/save"', owner_content)

        self.assertIsNone(re.search(r"function\s+resolveCountryEditorModel\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+resolveCapitalEditorModel\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+resolveLocaleEditorModel\s*\(", donor_content))
        self.assertIsNone(re.search(r'bindButtonAction\(panel\.querySelector\("#devScenarioSaveCountryBtn"\),', donor_content))
        self.assertIsNone(re.search(r'bindButtonAction\(panel\.querySelector\("#devScenarioSaveCapitalBtn"\),', donor_content))
        self.assertIsNone(re.search(r'bindButtonAction\(panel\.querySelector\("#devScenarioSaveLocaleBtn"\),', donor_content))

    def test_dev_workspace_keeps_text_editor_facade_contract(self):
        content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")

        self.assertIn("scenarioTextEditorsController = createScenarioTextEditorsController({", content)
        self.assertIn("scenarioTextEditorsController?.render({ hasActiveScenario });", content)
        self.assertIn("scenarioTextEditorsController.bindEvents();", content)
        self.assertIn('const scenarioCountryPanel = panel.querySelector("#devScenarioCountryPanel");', content)
        self.assertIn('const scenarioCapitalPanel = panel.querySelector("#devScenarioCapitalPanel");', content)
        self.assertIn('const scenarioLocalePanel = panel.querySelector("#devScenarioLocalePanel");', content)
        self.assertIn('syncCategoryPanel(scenarioCountryPanel, "scenario", hasActiveScenario);', content)
        self.assertIn('syncCategoryPanel(scenarioCapitalPanel, "scenario", hasActiveScenario);', content)
        self.assertIn('syncCategoryPanel(scenarioLocalePanel, "scenario", hasActiveScenario);', content)
        self.assertIn("export { getScenarioGeoLocaleEntry, initDevWorkspace };", content)
        self.assertIn('registerRuntimeHook(state, "updateDevWorkspaceUIFn", renderWorkspace);', content)

    def test_controller_keeps_country_capital_locale_runtime_contracts(self):
        owner_content = SCENARIO_TEXT_EDITORS_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertIn('flushDevWorkspaceRender("dev-workspace-country-save");', owner_content)
        self.assertIn('flushDevWorkspaceRender("dev-workspace-capital-save");', owner_content)
        self.assertIn('flushDevWorkspaceRender("dev-workspace-locale-save");', owner_content)
        self.assertIn("syncRuntimeScenarioCityOverrides(nextOverrides);", owner_content)
        self.assertIn("syncScenarioLocalizationState({", owner_content)
        self.assertIn("getScenarioGeoLocaleEntry(featureId)", owner_content)
        self.assertIn('import { normalizeScenarioGeoLocalePatchPayload } from "../../core/data_loader.js";', owner_content)
        self.assertIn('import { getScenarioGeoLocalePatchDescriptor } from "../../core/scenario/shared.js";', owner_content)
        self.assertIn("getScenarioGeoLocalePatchDescriptor(", owner_content)
        self.assertIn("normalizeScenarioGeoLocalePatchPayload(await patchResponse.json())", owner_content)
        self.assertIn('const savedGeoLocalePatchUrl = String(result.publishedPath || result.generatedPath || "").trim();', owner_content)
        self.assertIn("new URL(savedGeoLocalePatchUrl,", owner_content)
        self.assertIn('const patchResponse = await fetch(patchUrl.href, { cache: "no-store" });', owner_content)
        self.assertNotIn("new URL(geoLocalePatchUrl,", owner_content)

    def test_country_name_editor_color_controls_are_removed(self):
        shell_content = DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")
        owner_content = SCENARIO_TEXT_EDITORS_CONTROLLER_JS.read_text(encoding="utf-8")
        dist_shell_content = DIST_DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")
        dist_owner_content = DIST_SCENARIO_TEXT_EDITORS_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertFalse(SCENARIO_COUNTRY_COLOR_EDITOR_JS.exists())
        self.assertFalse(DIST_SCENARIO_COUNTRY_COLOR_EDITOR_JS.exists())

        state_blocks = []
        for content in [
            DEV_STATE_JS.read_text(encoding="utf-8"),
            DIST_DEV_STATE_JS.read_text(encoding="utf-8"),
        ]:
            match = re.search(r"devScenarioCountryEditor:\s*\{(?P<body>.*?)\n    \},", content, re.DOTALL)
            self.assertIsNotNone(match)
            state_blocks.append(match.group("body"))

        for token in [
            "devScenarioCountryColorInput",
            "devScenarioSaveCountryColorBtn",
            "devScenarioCountryColorStatus",
            "scenario_country_color_editor.js",
            "renderScenarioCountryColorEditor",
            "buildScenarioCountryColorSavePayload",
            "syncScenarioCountryColorEditorState",
            "lastColorSaveMessage",
            "lastColorSaveTone",
        ]:
            for content in [shell_content, owner_content, dist_shell_content, dist_owner_content]:
                self.assertNotIn(token, content)
            for state_block in state_blocks:
                self.assertNotIn(token, state_block)

        for state_block in state_blocks:
            self.assertNotIn("colorHex", state_block)


if __name__ == "__main__":
    unittest.main()
