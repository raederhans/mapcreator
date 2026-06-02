from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
SIDEBAR_JS = REPO_ROOT / "js" / "ui" / "sidebar.js"
PROJECT_SUPPORT_DIAGNOSTICS_CONTROLLER_JS = REPO_ROOT / "js" / "ui" / "sidebar" / "project_support_diagnostics_controller.js"
INTERACTION_FUNNEL_JS = REPO_ROOT / "js" / "core" / "interaction_funnel.js"
INTERACTION_FUNNEL_UI_SYNC_JS = REPO_ROOT / "js" / "core" / "interaction_funnel" / "ui_sync.js"
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
STYLE_CSS = REPO_ROOT / "css" / "style.css"
I18N_CATALOG_JS = REPO_ROOT / "js" / "ui" / "i18n_catalog.js"


class ProjectSupportDiagnosticsSidebarBoundaryContractTest(unittest.TestCase):
    # 这组静态合同锁 sidebar facade 与 controller owner 的边界；
    # 后续拆分要保持事件绑定和 runtime hook 继续留在 controller 外层。
    def test_sidebar_imports_project_support_diagnostics_controller(self):
        content = SIDEBAR_JS.read_text(encoding="utf-8")

        self.assertIn('import { createProjectSupportDiagnosticsController } from "./sidebar/project_support_diagnostics_controller.js";', content)
        self.assertIn('createProjectSupportDiagnosticsController', content)

    def test_project_support_owner_moves_to_controller(self):
        sidebar_content = SIDEBAR_JS.read_text(encoding="utf-8")
        owner_content = PROJECT_SUPPORT_DIAGNOSTICS_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertIn('export function createProjectSupportDiagnosticsController({', owner_content)
        self.assertIn('const renderScenarioAuditPanel = () => {', owner_content)
        self.assertIn('const refreshLegendEditor = () => {', owner_content)
        self.assertIn('const bindEvents = () => {', owner_content)
        self.assertIn('scenarioAuditSection.className = "inspector-tool-card scenario-audit-panel";', sidebar_content)
        self.assertIsNone(re.search(r"const\s+renderScenarioAuditPanel\s*=\s*\(\)\s*=>", sidebar_content))
        self.assertIsNone(re.search(r"const\s+refreshLegendEditor\s*=\s*\(\)\s*=>", sidebar_content))

    def test_scenario_audit_panel_has_overflow_safe_visual_contract(self):
        owner_content = PROJECT_SUPPORT_DIAGNOSTICS_CONTROLLER_JS.read_text(encoding="utf-8")
        css_content = STYLE_CSS.read_text(encoding="utf-8")

        for token in [
            'row.className = "scenario-audit-row";',
            'left.className = "inspector-mini-label scenario-audit-label";',
            'right.className = "country-row-title scenario-audit-value";',
            'list.className = "mt-2 flex flex-col gap-2 scenario-audit-list";',
            'row.className = "scenario-audit-row scenario-audit-check-row";',
            'className: "body-text scenario-audit-key",',
            'className: "inspector-mini-label scenario-audit-status",',
            'details.className = "inspector-preset-details scenario-audit-check-details";',
            'summary.className = "inspector-accordion-btn scenario-audit-check-summary";',
        ]:
            self.assertIn(token, owner_content)

        for token in [
            "#scenarioAuditPanel {",
            "  overflow: hidden;",
            ".scenario-audit-row {",
            "grid-template-columns: minmax(0, 1fr) minmax(0, 9ch);",
            ".scenario-audit-value,",
            ".scenario-audit-status {",
            "text-overflow: ellipsis;",
            ".scenario-audit-key,",
            ".scenario-audit-check-summary {",
            "overflow-wrap: anywhere;",
        ]:
            self.assertIn(token, css_content)

    def test_sidebar_keeps_project_support_facade_contract(self):
        content = SIDEBAR_JS.read_text(encoding="utf-8")

        self.assertIn('bindEvents: bindProjectSupportDiagnosticsEvents,', content)
        self.assertIn('refreshLegendEditor,', content)
        self.assertIn('renderScenarioAuditPanel,', content)
        self.assertIn('bindProjectSupportDiagnosticsEvents();', content)
        self.assertIn('registerRuntimeHook(state, "renderScenarioAuditPanelFn", renderScenarioAuditPanel);', content)
        self.assertIn('registerRuntimeHook(state, "updateLegendUI", refreshLegendEditor);', content)
        self.assertGreater(
            content.index('registerRuntimeHook(state, "renderScenarioAuditPanelFn", renderScenarioAuditPanel);'),
            content.index('bindProjectSupportDiagnosticsEvents();')
        )

    def test_project_support_release_surface_matches_source(self):
        pairs = [
            (SIDEBAR_JS, REPO_ROOT / "dist" / "app" / "js" / "ui" / "sidebar.js"),
            (
                PROJECT_SUPPORT_DIAGNOSTICS_CONTROLLER_JS,
                REPO_ROOT / "dist" / "app" / "js" / "ui" / "sidebar" / "project_support_diagnostics_controller.js",
            ),
            (I18N_CATALOG_JS, REPO_ROOT / "dist" / "app" / "js" / "ui" / "i18n_catalog.js"),
        ]

        for source_path, dist_path in pairs:
            with self.subTest(source=source_path.name):
                self.assertEqual(
                    source_path.read_text(encoding="utf-8"),
                    dist_path.read_text(encoding="utf-8"),
                )

    def test_project_support_events_move_to_controller(self):
        sidebar_content = SIDEBAR_JS.read_text(encoding="utf-8")
        owner_content = PROJECT_SUPPORT_DIAGNOSTICS_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertNotIn('downloadProjectBtn.addEventListener("click"', sidebar_content)
        self.assertNotIn('uploadProjectBtn.addEventListener("click"', sidebar_content)
        self.assertNotIn('projectFileInput.addEventListener("change"', sidebar_content)
        self.assertNotIn('debugModeSelect.addEventListener("change"', sidebar_content)
        self.assertIn('downloadProjectBtn.addEventListener("click"', owner_content)
        self.assertIn('uploadProjectBtn.addEventListener("click"', owner_content)
        self.assertIn('projectFileInput.addEventListener("change"', owner_content)
        self.assertIn('debugModeSelect.addEventListener("change"', owner_content)
        self.assertIn("refreshProjectSaveStatus", owner_content)

    def test_controller_keeps_project_import_and_legend_helpers(self):
        sidebar_content = SIDEBAR_JS.read_text(encoding="utf-8")
        owner_content = PROJECT_SUPPORT_DIAGNOSTICS_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertIn('legendManager: LegendManager,', sidebar_content)
        self.assertIn('fileManager: FileManager,', sidebar_content)
        self.assertIn('importProjectThroughFunnel,', sidebar_content)
        self.assertIn('invalidateFrontlineOverlayState: () => invalidateFrontlineOverlayState(),', sidebar_content)
        self.assertIn('legendManager.getUniqueColors(state)', owner_content)
        self.assertIn('legendManager.getSpecialZoneLayers(state)', owner_content)
        self.assertIn('legendManager.getSpecialZoneSignature(state)', owner_content)
        self.assertIn('fileManager.exportProject(state, {', owner_content)
        self.assertIn('projectDownloadFormat,', sidebar_content)
        self.assertIn('projectDownloadDestination,', sidebar_content)
        self.assertIn('projectLoadSource,', sidebar_content)
        self.assertIn('projectSaveStatus,', sidebar_content)
        self.assertIn('projectSaveStatus,', owner_content)
        self.assertIn('backendCloudStatus,', sidebar_content)
        self.assertIn('accountShelf.id = "rightSidebarAccountShelf";', sidebar_content)
        self.assertIn('accountShelf.append(accountPopover, accountDock);', sidebar_content)
        self.assertIn('rightSidebarContent?.appendChild(accountShelf);', sidebar_content)
        self.assertNotIn('actions.appendChild(accountDock);', sidebar_content)
        self.assertIn('accountToggleBtn.id = "backendAccountToggleBtn";', sidebar_content)
        self.assertIn('accountPopover.id = "backendAccountPopover";', sidebar_content)
        self.assertIn('cloudSection.id = "backendCloudSection";', sidebar_content)
        self.assertIn('cloudSection.hidden = true;', sidebar_content)
        self.assertIn('accountPopover.appendChild(cloudSection);', sidebar_content)
        self.assertIn('backendCloudSection,', sidebar_content)
        self.assertIn('setBackendAccountPopoverOpen', owner_content)
        self.assertIn('backendCloudSaveBtn,', owner_content)
        self.assertIn('setBackendCloudSessionState("anonymous")', owner_content)
        self.assertIn('setBackendCloudSessionState("authenticated")', owner_content)
        self.assertIn('createBackendSave({', owner_content)
        self.assertIn('const saveId = await resolveLatestCloudSaveId();', owner_content)
        self.assertIn('publishBackendSave(saveId)', owner_content)
        self.assertIn('listBackendSaves()', owner_content)
        self.assertIn('listCommunitySaves()', owner_content)
        self.assertIn('downloadCommunitySave(saveId)', owner_content)
        self.assertIn('refreshProjectSaveStatus,', sidebar_content)
        self.assertIn('registerRuntimeHook(state, "updateProjectSaveStatusFn", refreshProjectSaveStatus);', sidebar_content)
        self.assertIn('updateProjectSaveStatusFn: "sidebar:update-project-save-status"', (REPO_ROOT / "js" / "core" / "state" / "config.js").read_text(encoding="utf-8"))
        self.assertIn('callRuntimeHook(runtimeState, "updateProjectSaveStatusFn");', (REPO_ROOT / "js" / "core" / "dirty_state.js").read_text(encoding="utf-8"))
        self.assertIn('Project export includes appearance and transport settings.', sidebar_content)
        self.assertIn('Project exported. Appearance and transport settings are saved in the JSON file.', owner_content)
        self.assertIn('onProjectImportComplete: () => refreshProjectSaveStatus()', owner_content)
        self.assertIn('onProjectImportError: () => refreshProjectSaveStatus(t("Project import failed before completion. Review the current map state.", "ui"))', owner_content)
        self.assertIn('importProjectThroughFunnel(file, {', owner_content)
        self.assertIn('invalidateFrontlineOverlayState,', owner_content)

    def test_interaction_funnel_and_renderer_keep_project_support_callbacks(self):
        interaction_funnel_content = INTERACTION_FUNNEL_JS.read_text(encoding="utf-8")
        interaction_funnel_ui_sync_content = INTERACTION_FUNNEL_UI_SYNC_JS.read_text(encoding="utf-8")
        map_renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")

        self.assertIn('syncProjectImportUiStateHelper', interaction_funnel_content)
        self.assertIn("onProjectImportComplete", interaction_funnel_content)
        self.assertIn("onSuccess: () => hooks.onProjectImportComplete?.()", interaction_funnel_content)
        self.assertIn('emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_LEGEND_UI);', interaction_funnel_ui_sync_content)
        self.assertIn('emitStateBusEvent(STATE_BUS_EVENTS.RENDER_SCENARIO_AUDIT_PANEL);', interaction_funnel_ui_sync_content)
        self.assertIn('emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_TRANSPORT_APPEARANCE_UI);', interaction_funnel_ui_sync_content)
        self.assertIn('emitStateBusEvent(STATE_BUS_EVENTS.CLEAR_REFERENCE_IMAGE, { markDirty: false });', interaction_funnel_ui_sync_content)
        self.assertIn('runtimeState.updateLegendUI();', map_renderer_content)


if __name__ == "__main__":
    unittest.main()
