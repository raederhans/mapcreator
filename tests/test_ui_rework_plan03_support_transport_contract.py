from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
RIVER_LAYER_RENDER_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "river_layer_render_owner.js"


class UiReworkPlan03SupportTransportContractTest(unittest.TestCase):
    def test_agent_tiers_doc_exists_for_multi_agent_runs(self):
        content = (REPO_ROOT / "docs" / "shared" / "agent-tiers.md").read_text(encoding="utf-8")
        self.assertIn("## LOW", content)
        self.assertIn("## STANDARD", content)
        self.assertIn("## THOROUGH", content)
        self.assertIn("## 多代理启动前必看文件", content)
        self.assertIn("## 收尾前最低验证要求", content)
        self.assertIn("## 什么算真正收尾", content)

    def test_main_paths_no_longer_ship_old_inspector_summary_classes(self):
        index_content = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        css_content = (REPO_ROOT / "css" / "style.css").read_text(encoding="utf-8")
        self.assertNotIn("inspector-section-summary-copy", index_content)
        self.assertNotIn("class=\"section-header inspector-section-summary", index_content)
        self.assertNotIn(".inspector-section-summary {", css_content)
        self.assertNotIn(".inspector-section-summary-copy {", css_content)

    def test_support_surface_tool_panels_keep_help_copy_and_drop_export_tooltip(self):
        content = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        css_content = (REPO_ROOT / "css" / "style.css").read_text(encoding="utf-8")
        self.assertIn('id="scenarioGuideBackdrop"', content)
        self.assertIn('id="scenarioGuidePopover"', content)
        self.assertIn('id="scenarioGuideCloseBtn"', content)
        self.assertIn("scenario-guide-modal", content)
        self.assertNotIn("scenarioGuideSupportHint", content)
        self.assertNotIn("scenarioGuideStatus", content)
        self.assertNotIn("scenarioGuideStatusChips", content)
        self.assertNotIn("Open this manual from the scenario bar or the Utilities panel. Both Guide buttons open the same help surface, so you can keep the next editing step visible while you work.", content)
        self.assertIn("Check the top status chips first: confirm Mode, View, and Split match the scenario you are about to edit.", content)
        self.assertIn("Before a broad edit or before loading another project file, download the current project JSON from Project Management.", content)
        self.assertIn("After loading, return to Inspector to confirm the target country and active owner", content)
        self.assertNotIn("Save the current working state before you load a different project file.", content)
        self.assertNotIn("You can open Guide from the top scenario bar or from Project › Utilities.", content)
        self.assertIn("scenario-guide-tool-accordion", content)
        self.assertIn('class="scenario-guide-tool-panel" open', content)
        self.assertIn("Use Project tools as a publish checklist: save the project, add strategic context, align references, then export.", content)
        self.assertIn("Contains Download Project, Load Project, selected file status, and import safety checks.", content)
        self.assertIn("Contains derived frontlines, operational lines, operation graphics, and unit counters.", content)
        self.assertIn("Contains local image upload, opacity, scale, horizontal offset, and vertical offset controls.", content)
        self.assertIn("Contains target selection, format, export resolution, preview, layer order, text stacks, and image adjustments.", content)
        self.assertIn("Treat saving and exporting as two separate handoff steps: save the editable project first", content)
        self.assertIn("Project JSON save", content)
        self.assertIn("Use Download Project to save the current editable state: scenario choice, ownership edits, appearance, transport, strategic annotations, reference alignment values, and export settings.", content)
        self.assertIn("Export workflow", content)
        self.assertIn("Export creates the final image, per-layer PNG set, or bake pack; it does not replace the editable project JSON.", content)
        self.assertIn("Final handoff check", content)
        self.assertIn("keep one editable project JSON and one exported output from the same reviewed state", content)
        self.assertNotIn("Before publishing, confirm strategic annotations are present, map labels are readable", content)
        self.assertNotIn("For project handoff, save a project JSON, reload it once", content)
        self.assertNotIn("Reference: After you upload a local image, the most stable alignment order is opacity", content)
        self.assertNotIn("Export: Keep Strategic annotations enabled when you want frontlines, operational lines, graphics, and unit counters in the final image or bake pack.", content)
        self.assertNotIn("Frontlines & Annotations: Use derived frontlines for conflict edges, then add operational lines, graphics, and unit counters as strategic annotations for export.", content)
        self.assertNotIn("Use Guide for workflow steps and Reference for visual alignment. Both stay in the Project tab so you can check instructions without losing context.", content)
        self.assertNotIn("Use Frontline after you apply a scenario. This section combines", content)
        self.assertNotIn("lblExportInfoTooltip", content)
        for token in [
            "width: min(680px, calc(100vw - 32px));",
            ".scenario-guide-tool-accordion {",
            ".scenario-guide-tool-summary {",
            ".scenario-guide-tool-steps li {",
            "grid-template-columns: 74px minmax(0, 1fr);",
        ]:
            self.assertIn(token, css_content)
        for removed in [
            ".scenario-guide-status {",
            ".scenario-guide-status-chips {",
            ".scenario-guide-status-pill {",
        ]:
            self.assertNotIn(removed, css_content)


    def test_left_sidebar_typography_and_redundant_copy_contract(self):
        index_content = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        css_content = (REPO_ROOT / "css" / "style.css").read_text(encoding="utf-8")

        for token in [
            'id="scenarioStatus" class="body-text visually-hidden"',
            'id="scenarioAuditHint" class="body-text visually-hidden hidden"',
        ]:
            self.assertIn(token, index_content)

        for removed in [
            'id="appearanceLayerFilter"',
            'id="lblAppearanceFilter"',
            'id="lblTextureInfo"',
            'Apply a subtle overlay texture for a vintage map feel.',
            'id="cityPointsPresetDensityGroupHint"',
            'id="cityPointsMarkerDensityHint"',
            'id="cityPointsLabelDensityHint"',
            'id="cityPointsAdvancedHint"',
        ]:
            self.assertNotIn(removed, index_content)

        for token in [
            "#leftSidebar {",
            "--left-panel-font-section: 0.86rem;",
            "--left-panel-font-control: 0.74rem;",
            "#leftSidebar .toggle-label,",
            "#leftSidebar .palette-library-title,",
            "#appearancePanelLayers .appearance-subsection-stack,",
            "#appearancePanelTexture > .space-y-3",
            ".appearance-control-card {",
            ".appearance-ocean-grid {",
            ".appearance-day-night-stack {",
            "#appearancePanelLayers .appearance-mini-section .ml-5 {",
            ".city-points-toggle-card,",
            ".rivers-toggle-card,",
            ".transport-family-body > section,",
            ".transport-family-section {",
        ]:
            self.assertIn(token, css_content)

        for token in [
            'class="appearance-control-card" aria-labelledby="lblOceanSurfaceCard"',
            'id="lblOceanStyleCard" class="appearance-control-card-title"',
            'id="lblOceanTextureCard" class="appearance-control-card-title"',
            'class="toggle-label appearance-day-night-card"',
            'id="dayNightManualControls" class="appearance-day-night-card"',
            'id="dayNightSyncComputerUtcBtn"',
            'id="cityPointsHelpTooltip" class="info-tooltip"',
            'id="lblCityPointsStyleGroup" class="appearance-control-card-title"',
            'id="lblCityPointsLabelGroup" class="appearance-control-card-title"',
            'id="lblRiversStrokeGroup" class="appearance-control-card-title"',
            'id="lblRiversOutlineGroup" class="appearance-control-card-title"',
            'class="toggle-label transport-master-toggle-card"',
        ]:
            self.assertIn(token, index_content)

    def test_river_dash_style_applies_to_outline_and_core_strokes(self):
        owner_content = RIVER_LAYER_RENDER_OWNER_JS.read_text(encoding="utf-8")
        self.assertIn("const resolvedDashPattern = dashPattern.map((value) => value / scale);", owner_content)
        self.assertGreaterEqual(owner_content.count("context.setLineDash(resolvedDashPattern);"), 2)
        self.assertIn('dashStyle: String(cfg.dashStyle || "solid"),', owner_content)
        self.assertIn("dashPattern: resolvedDashPattern,", owner_content)

    def test_transport_shell_uses_phase03_titles_and_status_contract(self):
        content = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        required_tokens = [
            'id="transportWorkbenchInfoTitle" class="transport-workbench-info-title" data-i18n="Transport guide"',
            'class="transport-workbench-column-kicker" data-i18n="Lens">Lens',
            'class="transport-workbench-column-kicker" data-i18n="Inspector">Inspector',
            'id="transportWorkbenchInspectorEmptyTitle" class="transport-workbench-empty-title" data-i18n="No transport schema loaded yet"',
        ]
        for token in required_tokens:
            self.assertIn(token, content)
        self.assertNotIn("transportWorkbenchPreviewActions", content)
        self.assertNotIn("transportWorkbenchCompareBtn", content)
        self.assertNotIn("transportWorkbenchCompareStatus", content)

    def test_appearance_transport_visual_mode_dom_and_controller_contract(self):
        index_content = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        css_content = (REPO_ROOT / "css" / "style.css").read_text(encoding="utf-8")
        controller_content = (REPO_ROOT / "js" / "ui" / "toolbar" / "transport_appearance_controller.js").read_text(encoding="utf-8")
        state_defaults_content = (REPO_ROOT / "js" / "core" / "state_defaults.js").read_text(encoding="utf-8")
        registry_content = (REPO_ROOT / "js" / "core" / "transport_capability_registry.js").read_text(encoding="utf-8")

        for token in [
            'id="transportVisualModeControls" class="appearance-control-card transport-visual-mode-card" aria-labelledby="lblTransportVisualMode"',
            'class="toggle-label transport-master-toggle-card"',
            'id="transportAppearanceMasterToggle" type="checkbox" class="checkbox-input"',
            'id="lblTransportVisualMode" class="range-label" for="transportVisualMode" data-i18n="Transport Visual Mode"',
            'id="transportVisualMode" class="select-input mt-2"',
            'id="optTransportVisualModeDistribution" value="distribution" selected data-i18n="Distribution"',
            'id="optTransportVisualModeNetwork" value="network" data-i18n="Network"',
            'id="optTransportVisualModeCoverage" value="coverage" data-i18n="Coverage"',
        ]:
            self.assertIn(token, index_content)
        self.assertNotIn("transportVisualModeHint", index_content)

        for token in [
            "#appearancePanelTransport .transport-visual-mode-card #transportVisualMode {",
            "appearance: none;",
            "background-position: 0 0, right 11px center;",
            "#appearancePanelTransport .transport-visual-mode-card #transportVisualMode:focus-visible {",
            "#appearancePanelTransport .transport-visual-mode-card #transportVisualMode:disabled {",
        ]:
            self.assertIn(token, css_content)

        for token in [
            'const transportVisualMode = document.getElementById("transportVisualMode");',
            'const getTransportAppearanceVisualMode = () => normalizeTransportOverviewVisualMode(',
            'if (transportVisualMode) transportVisualMode.value = visualMode;',
            'if (transportVisualMode) transportVisualMode.disabled = !transportEnabled;',
            'transportVisualMode.addEventListener("change", (event) => {',
            'getTransportAppearanceConfig().visualMode = normalizeTransportOverviewVisualMode(',
            'renderTransportAppearanceDirty("transport-visual-mode");',
        ]:
            self.assertIn(token, controller_content)

        self.assertIn('visualMode: "distribution",', state_defaults_content)
        self.assertIn('visualMode: normalizeTransportOverviewVisualMode(source.visualMode, "distribution"),', state_defaults_content)
        self.assertIn('TRANSPORT_OVERVIEW_VISUAL_MODES = Object.freeze(["distribution", "network", "coverage"])', registry_content)

    def test_appearance_transport_summary_reports_class_source_and_phase(self):
        index_content = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        controller_content = (REPO_ROOT / "js" / "ui" / "toolbar" / "transport_appearance_controller.js").read_text(encoding="utf-8")
        summary_content = (REPO_ROOT / "js" / "ui" / "toolbar" / "appearance_transport_summary.js").read_text(encoding="utf-8")
        registry_content = (REPO_ROOT / "js" / "core" / "transport_capability_registry.js").read_text(encoding="utf-8")
        i18n_content = (REPO_ROOT / "js" / "ui" / "i18n_catalog.js").read_text(encoding="utf-8")

        for token in [
            'id="roadLabelsEnabled"',
            'id="roadLabelDensity"',
            'data-i18n="Road labels use segment ref/name when present."',
        ]:
            self.assertIn(token, index_content)

        for token in [
            'from "./appearance_transport_summary.js";',
            'buildTransportFamilySummaryTextForState',
            'formatTransportPercent',
            'formatTransportScopeLabel',
            'formatTransportThresholdLabel',
        ]:
            self.assertIn(token, controller_content)

        for token in [
            'metrics,',
            "const metrics = metricsSource && typeof metricsSource === \"object\" ? metricsSource : {};",
            'metrics.contextBreakdown',
            'getTransportOverviewLineSummaryMeta',
            'getTransportLineClassCoverage',
            'formatTransportPercent',
            'formatTransportScopeLabel',
            'formatTransportThresholdLabel',
            'primary/secondary pending',
            'secondary full-only',
        ]:
            self.assertIn(token, summary_content)

        for token in [
            'TRANSPORT_OVERVIEW_LINE_SUMMARY_META',
            'ref sidecar Phase B',
            'major stations Phase B',
            'checked-in Overture',
        ]:
            self.assertIn(token, registry_content)

        for token in [
            '"Loaded classes:"',
            '"Phase:"',
            '"Source:"',
            '"checked-in Overture"',
            '"Road labels use segment ref/name when present."',
        ]:
            self.assertIn(token, i18n_content)

    def test_toolbar_drops_legacy_transport_info_renderer_and_uses_new_copy(self):
        toolbar_content = (REPO_ROOT / "js" / "ui" / "toolbar.js").read_text(encoding="utf-8")
        controller_content = (REPO_ROOT / "js" / "ui" / "toolbar" / "transport_workbench_controller.js").read_text(encoding="utf-8")
        shell_owner_content = (REPO_ROOT / "js" / "ui" / "toolbar" / "transport_workbench_shell_owner.js").read_text(encoding="utf-8")
        self.assertNotIn("renderTransportWorkbenchInfoPopoverLegacy", toolbar_content)
        self.assertIn("inspectorTitle,", shell_owner_content)
        self.assertIn('syncTextContent(inspectorTitle, `${translate(family.label)} ${translate("inspector")}`)', shell_owner_content)
        self.assertIn("transportWorkbenchShellOwner.render(context);", controller_content)
        self.assertNotIn("transportWorkbenchCompareBtn", toolbar_content)
        self.assertNotIn("transportWorkbenchCompareStatus", toolbar_content)
        self.assertNotIn("transportWorkbenchCompareStatus.textContent", controller_content)

    def test_toolbar_language_toggle_displays_current_language_state(self):
        toolbar_content = (REPO_ROOT / "js" / "ui" / "toolbar.js").read_text(encoding="utf-8")
        self.assertIn('const currentLangLabel = runtimeState.currentLanguage === "zh" ? "ZH" : "EN";', toolbar_content)
        self.assertIn("toggleLang.textContent = currentLangLabel;", toolbar_content)
        self.assertIn("toggleLang.setAttribute(\"title\", `${t(\"Language\", \"ui\")}: ${currentLangLabel}`);", toolbar_content)
        self.assertIn("renderSpecialZoneEditorUI();\n    updateLanguageToggleUi();", toolbar_content)
        self.assertIn("updateUIText();\n  updateLanguageToggleUi();", toolbar_content)
        self.assertNotIn('"ZH / EN"', toolbar_content)
        self.assertNotIn('"EN / ZH"', toolbar_content)

    def test_adaptive_popover_and_palette_contracts_are_wired(self):
        index_content = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        css_content = (REPO_ROOT / "css" / "style.css").read_text(encoding="utf-8")
        palette_content = (REPO_ROOT / "js" / "ui" / "toolbar" / "palette_library_panel.js").read_text(encoding="utf-8")
        sidebar_content = (REPO_ROOT / "js" / "ui" / "sidebar.js").read_text(encoding="utf-8")

        for token in [
            'id="paletteLibraryList" class="palette-library-list mt-3 u-scroll-y"',
            'id="transportWorkbenchInfoPopover" class="transport-workbench-info-popover u-scroll-y hidden"',
            'id="transportWorkbenchSectionHelpPopover" class="transport-workbench-section-help-popover u-scroll-y hidden"',
        ]:
            self.assertIn(token, index_content)

        for token in [
            "width: var(--layout-popover-inline);",
            "max-block-size: var(--layout-popover-block);",
            "min-height: var(--palette-library-list-min-block);",
            "max-height: var(--palette-library-list-max-block);",
        ]:
            self.assertIn(token, css_content)

        self.assertIn('readPaletteLibraryBlockSize("--palette-library-list-min-block"', palette_content)
        self.assertIn('readPaletteLibraryBlockSize("--palette-library-list-max-block"', palette_content)
        self.assertIn('title.className = "palette-library-title u-truncate";', palette_content)
        self.assertIn('fileName.className = "project-file-name u-truncate";', sidebar_content)

        for token in [
            "#projectLegendSection,",
            "#frontlineProjectSection,",
            "#transportProjectSection,",
            "#exportProjectSection,",
            "#inspectorUtilitiesSection,",
            "#diagnosticsSection {",
            ".frontline-tab-card {",
            "border-radius: 18px;",
            ".strategic-accordion-section {",
            "border-radius: 15px;",
            ".strategic-accordion-body {",
            "max-height: min(52vh, 460px);",
            "scrollbar-gutter: stable;",
        ]:
            self.assertIn(token, css_content)

        for token in [
            't("Project-local lines, graphics, and unit counters for export.", "ui")',
            't("Plan lines.", "ui")',
            't("Arrows and markers.", "ui")',
            't("Map pieces.", "ui")',
        ]:
            self.assertIn(token, sidebar_content)
        self.assertNotIn("Operation graphics and unit counters stay in the same frontline workspace", sidebar_content)
        self.assertNotIn("Counters should read like map pieces first", sidebar_content)


if __name__ == "__main__":
    unittest.main()
