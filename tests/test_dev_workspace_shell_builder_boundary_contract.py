from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
DEV_WORKSPACE_JS = REPO_ROOT / "js" / "ui" / "dev_workspace.js"
DIST_DEV_WORKSPACE_JS = REPO_ROOT / "dist" / "app" / "js" / "ui" / "dev_workspace.js"
DEV_WORKSPACE_SHELL_BUILDER_JS = REPO_ROOT / "js" / "ui" / "dev_workspace" / "dev_workspace_shell_builder.js"
DIST_DEV_WORKSPACE_SHELL_BUILDER_JS = REPO_ROOT / "dist" / "app" / "js" / "ui" / "dev_workspace" / "dev_workspace_shell_builder.js"
DEV_STATE_JS = REPO_ROOT / "js" / "core" / "state" / "dev_state.js"
STYLE_CSS = REPO_ROOT / "css" / "style.css"
DIST_STYLE_CSS = REPO_ROOT / "dist" / "app" / "css" / "style.css"


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
        self.assertIn('label.className = "dev-workspace-toggle-label";', owner_content)
        self.assertIn('toggleBtn.replaceChildren(label);', owner_content)
        self.assertIn('label.textContent = ui("Dev");', owner_content)
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
        self.assertIn('class="dev-workspace-quick-owner-controls"', owner_content)
        self.assertIn('id="devQuickRemoveSelectedBtn"', owner_content)
        self.assertIn('id="devQuickUseTagBtn"', owner_content)
        self.assertIn('applyDeclarativeTranslations(section);', owner_content)
        self.assertIn('applyDeclarativeTranslations(quickbar);', owner_content)
        self.assertNotIn('id="devScenarioTagCreatorHint"', owner_content)
        self.assertNotIn('id="devLocalRuntimeLabel"', owner_content)
        self.assertNotIn('id="devRuntimeMeta"', owner_content)

    def test_quickbar_owner_controls_keep_compact_stacked_layout(self):
        owner_content = DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")
        dist_owner_content = DIST_DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")
        css_content = STYLE_CSS.read_text(encoding="utf-8")
        dist_css_content = DIST_STYLE_CSS.read_text(encoding="utf-8")

        for token in [
            'class="dev-workspace-quick-owner-controls"',
            'id="devQuickRemoveSelectedBtn"',
            'data-i18n="Remove Selection"',
            'id="devQuickUseTagBtn"',
        ]:
            self.assertIn(token, owner_content)
            self.assertIn(token, dist_owner_content)

        for token in [
            ".dev-workspace-quick-owner-row {",
            "grid-template-columns: minmax(96px, 1fr) minmax(120px, 0.82fr);",
            ".dev-workspace-quick-owner-controls {",
            "grid-template-rows: repeat(2, minmax(30px, 1fr));",
            ".dev-workspace-quick-owner-controls .btn-secondary {",
            "white-space: normal;",
        ]:
            self.assertIn(token, css_content)
            self.assertIn(token, dist_css_content)

    def test_feature_inspector_duplicate_hint_is_removed(self):
        contents = [
            DEV_WORKSPACE_JS.read_text(encoding="utf-8"),
            DIST_DEV_WORKSPACE_JS.read_text(encoding="utf-8"),
            DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8"),
            DIST_DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8"),
        ]

        for token in [
            "devFeatureInspectorHint",
            "Hover a region or click one to inspect live debug metadata.",
        ]:
            for content in contents:
                self.assertNotIn(token, content)

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
            "body.left-sidebar-collapsed.right-sidebar-collapsed .bottom-dock.dev-workspace-mode.is-collapsed {",
            "left: calc(50% + var(--bottom-dock-center-offset, 0px));",
            "transform: translateX(-50%);",
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

    def test_tag_creator_panel_uses_compact_bottom_dock_layout(self):
        owner_content = DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")
        css_content = STYLE_CSS.read_text(encoding="utf-8")

        for token in [
            'class="dev-scenario-tag-creator-head"',
            'class="dev-workspace-meta dev-scenario-tag-creator-meta"',
            'class="dev-workspace-form-grid dev-scenario-tag-creator-grid"',
            'class="dev-workspace-form-field dev-workspace-form-field-span-2 dev-scenario-tag-color-field"',
            'class="dev-workspace-actions dev-scenario-tag-creator-actions"',
            'class="dev-workspace-note dev-scenario-tag-creator-status"',
        ]:
            self.assertIn(token, owner_content)

        for token in [
            "#devScenarioTagCreatorPanel {",
            ".dev-scenario-tag-creator-head {",
            "grid-template-columns: minmax(150px, 0.64fr) minmax(0, 1.36fr);",
            ".dev-scenario-tag-creator-grid {",
            "grid-template-columns: minmax(96px, 0.65fr) minmax(120px, 0.8fr) minmax(150px, 1fr);",
            "#devScenarioTagCreatorPanel .dev-scenario-tag-color-field {",
            "display: grid;",
            ".dev-scenario-tag-color-field .dev-workspace-swatch-grid {",
            "grid-template-columns: max-content minmax(0, 1fr);",
            "grid-auto-flow: column;",
            "grid-auto-columns: 24px;",
            "overflow-x: auto;",
            "overflow-y: hidden;",
            "white-space: nowrap;",
            ".dev-scenario-tag-color-field #devScenarioTagRecentWrap {",
            ".dev-scenario-tag-color-field .dev-workspace-color-popover {",
            "top: calc(100% + 6px);",
            "grid-column: 1 / -1;",
            ".dev-scenario-tag-creator-status:empty {",
            "display: none;",
        ]:
            self.assertIn(token, css_content)

    def test_tag_creator_compact_layout_is_synced_to_dist_app(self):
        owner_content = DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")
        dist_owner_content = DIST_DEV_WORKSPACE_SHELL_BUILDER_JS.read_text(encoding="utf-8")
        css_content = STYLE_CSS.read_text(encoding="utf-8")
        dist_css_content = DIST_STYLE_CSS.read_text(encoding="utf-8")

        for token in [
            'class="dev-scenario-tag-creator-head"',
            'id="devScenarioTagColorPopoverAnchor"',
            'id="devScenarioTagColorPopover"',
            'class="dev-workspace-actions dev-scenario-tag-creator-actions"',
        ]:
            self.assertIn(token, owner_content)
            self.assertIn(token, dist_owner_content)

        for token in [
            "#devScenarioTagCreatorPanel {",
            ".dev-scenario-tag-creator-grid {",
            "#devScenarioTagCreatorPanel .dev-scenario-tag-color-field {",
            "display: grid;",
            "grid-template-columns: max-content minmax(0, 1fr);",
            ".dev-scenario-tag-color-field .dev-workspace-color-popover {",
            ".dev-scenario-tag-creator-status:empty {",
        ]:
            self.assertIn(token, css_content)
            self.assertIn(token, dist_css_content)


if __name__ == "__main__":
    unittest.main()
