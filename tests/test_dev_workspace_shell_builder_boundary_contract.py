from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
DEV_WORKSPACE_JS = REPO_ROOT / "js" / "ui" / "dev_workspace.js"
DEV_WORKSPACE_SHELL_BUILDER_JS = REPO_ROOT / "js" / "ui" / "dev_workspace" / "dev_workspace_shell_builder.js"
DEV_STATE_JS = REPO_ROOT / "js" / "core" / "state" / "dev_state.js"
STYLE_CSS = REPO_ROOT / "css" / "style.css"


class DevWorkspaceShellBuilderBoundaryContractTest(unittest.TestCase):
    def test_dev_workspace_imports_shell_builder(self):
        content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")

        self.assertIn('./dev_workspace/dev_workspace_shell_builder.js', content.replace('"', "'"))
        self.assertIn("createDevWorkspacePanel", content)
        self.assertIn("createDevWorkspaceQuickbar", content)
        self.assertIn("applyDevWorkspaceExpandedChrome", content)

    def test_shell_builder_owns_panel_quickbar_and_dock_chrome(self):
        donor_content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")
        owner_content = DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")

        self.assertIn("export function createDevWorkspacePanel", owner_content)
        self.assertIn("export function createDevWorkspaceQuickbar", owner_content)
        self.assertIn("export function applyDevWorkspaceExpandedChrome", owner_content)
        self.assertIn('section.id = "devWorkspacePanel";', owner_content)
        self.assertIn('quickbar.id = "devWorkspaceQuickbar";', owner_content)
        self.assertIn('toggleBtn.textContent = ui("Dev");', owner_content)
        self.assertIn('dockCollapseBtn.setAttribute("aria-label", t("Collapse quick dock", "ui"));', owner_content)

        self.assertIsNone(re.search(r"function\s+createDevWorkspacePanel\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+createDevWorkspaceQuickbar\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+updateToggleButton\s*\(", donor_content))
        self.assertIsNone(re.search(r"function\s+syncDockState\s*\(", donor_content))

    def test_dev_workspace_keeps_host_facade_contract(self):
        content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")

        self.assertIn("const quickbar = createDevWorkspaceQuickbar(bottomDock);", content)
        self.assertIn("const panel = createDevWorkspacePanel(bottomDock);", content)
        self.assertIn("applyDevWorkspaceExpandedChrome({", content)
        self.assertIn('registerRuntimeHook(state, "updateDevWorkspaceUIFn", renderWorkspace);', content)
        self.assertIn('registerRuntimeHook(state, "setDevWorkspaceExpandedFn", (nextValue) => {', content)
        self.assertIn("export { getScenarioGeoLocaleEntry, initDevWorkspace };", content)

    def test_shell_builder_preserves_dom_surface_contracts(self):
        owner_content = DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")

        self.assertIn('id="devScenarioOwnershipPanel"', owner_content)
        self.assertIn('id="devScenarioTagCreatorPanel"', owner_content)
        self.assertIn('id="devScenarioDistrictPanel"', owner_content)
        self.assertIn('quickbar.id = "devWorkspaceQuickbar";', owner_content)
        self.assertIn('id="devQuickRebuildBordersBtn"', owner_content)
        self.assertIn('applyDeclarativeTranslations(section);', owner_content)
        self.assertIn('applyDeclarativeTranslations(quickbar);', owner_content)
        self.assertNotIn('id="devScenarioTagCreatorHint"', owner_content)
        self.assertNotIn('id="devLocalRuntimeLabel"', owner_content)
        self.assertNotIn('id="devRuntimeMeta"', owner_content)

    def test_local_runtime_diagnostics_panel_is_removed(self):
        host_content = DEV_WORKSPACE_JS.read_text(encoding="utf-8")
        owner_content = DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")
        state_content = DEV_STATE_JS.read_text(encoding="utf-8")

        for token in [
            "Local Runtime",
            "devRuntimeTitle",
            "devRuntimeHint",
            "devRuntimeMeta",
            "resolveRuntimeRows",
            "loadRuntimeMeta",
            "/.runtime/dev/active_server.json",
        ]:
            self.assertNotIn(token, host_content)
            self.assertNotIn(token, owner_content)
            self.assertNotIn(token, state_content)

    def test_tag_creator_hint_copy_is_removed_from_controller(self):
        owner_content = DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")
        controller_content = (REPO_ROOT / "js" / "ui" / "dev_workspace" / "scenario_tag_creator_controller.js").read_text(encoding="utf-8")

        self.assertNotIn("devScenarioTagCreatorHint", owner_content)
        self.assertNotIn("devScenarioTagCreatorHint", controller_content)
        self.assertNotIn("resolveTagCreatorHint", controller_content)
        self.assertNotIn("Create a new scenario tag, optionally set a parent owner", controller_content)

    def test_collapsed_dev_quickbar_keeps_usable_width(self):
        css_content = STYLE_CSS.read_text(encoding="utf-8")

        for token in [
            ".bottom-dock.dev-workspace-mode.is-collapsed {",
            "width: min(760px, calc(100% - 44px));",
            "height: auto;",
            "padding: 8px 54px 8px 10px;",
            "contain: none;",
            ".bottom-dock.dev-workspace-mode.is-collapsed .dev-workspace-quickbar {",
            "width: 100%;",
        ]:
            self.assertIn(token, css_content)

    def test_tag_inspector_panel_uses_compact_self_sized_layout(self):
        css_content = STYLE_CSS.read_text(encoding="utf-8")

        for token in [
            "#devScenarioTagInspectorPanel {",
            "align-self: start;",
            "gap: 5px;",
            "padding: 8px 9px;",
            "#devScenarioTagInspectorPanel .dev-workspace-input,",
            "#devScenarioTagInspectorPanel .dev-workspace-select {",
            "min-height: 30px;",
            "#devScenarioTagInspectorPanel .dev-workspace-actions > .btn-secondary,",
        ]:
            self.assertIn(token, css_content)


if __name__ == "__main__":
    unittest.main()
