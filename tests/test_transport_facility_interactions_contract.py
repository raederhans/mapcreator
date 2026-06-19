from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
TOOLBAR_JS = REPO_ROOT / "js" / "ui" / "toolbar.js"
TRANSPORT_APPEARANCE_CONTROLLER_JS = REPO_ROOT / "js" / "ui" / "toolbar" / "transport_appearance_controller.js"
FACILITY_SURFACE_JS = REPO_ROOT / "js" / "core" / "renderer" / "facility_surface.js"
TRANSPORT_OVERVIEW_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "transport_overview_render_owner.js"
TRANSPORT_FACILITY_DISPLAY_POLICY_JS = REPO_ROOT / "js" / "core" / "renderer" / "transport_facility_display_policy.js"
TRANSPORT_FACILITY_ICONS_JS = REPO_ROOT / "js" / "core" / "renderer" / "transport_facility_icons.js"
FACILITY_FACADE_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "facade_data_runtime.js"
CITY_POINTS_RENDER_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "city_points_render_owner.js"


class TransportFacilityInteractionsContractTest(unittest.TestCase):
    def test_index_ships_facility_info_card_surface(self):
        content = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        required_tokens = [
            'id="facilityInfoCard"',
            'id="facilityInfoCardTitle"',
            'id="facilityInfoCardBody"',
            'id="facilityInfoCardMoreBtn"',
            'id="facilityInfoCardZoomBtn"',
            'id="facilityInfoCardCloseBtn"',
            'id="airportPrimaryColor"',
            'id="portPrimaryColor"',
            'id="airportLabelSize"',
            'id="portLabelSize"',
            'id="airportLabelHalo"',
            'id="portLabelHalo"',
            'id="transportFacilityUnderlyingMapSelection"',
        ]
        for token in required_tokens:
            self.assertIn(token, content)

    def test_css_ships_facility_info_card_styles(self):
        content = (REPO_ROOT / "css" / "style.css").read_text(encoding="utf-8")
        required_tokens = [
            ".facility-info-card {",
            ".facility-info-card-row {",
            ".facility-info-card-label {",
            ".facility-info-card-actions {",
        ]
        for token in required_tokens:
            self.assertIn(token, content)

    def test_map_renderer_wires_facility_hover_and_card_logic(self):
        content = (REPO_ROOT / "js" / "core" / "map_renderer.js").read_text(encoding="utf-8")
        city_owner_content = CITY_POINTS_RENDER_OWNER_JS.read_text(encoding="utf-8")
        owner_content = FACILITY_SURFACE_JS.read_text(encoding="utf-8")
        transport_owner_content = TRANSPORT_OVERVIEW_OWNER_JS.read_text(encoding="utf-8")
        facade_content = FACILITY_FACADE_JS.read_text(encoding="utf-8")
        required_tokens = [
            "function getHoveredFacilityEntryFromEvent",
            'recordInteractionDurationMetric("interactionHoverFacilityProbeDuration"',
            "function applyFacilityInfoCardState",
            "function zoomToFacilityEntry",
            "const facilityDetailsActive = hoveredFacility ? isFacilityDetailsSurfaceActive(hoveredFacility.familyId) : false;",
            "const nextFacilityKey = buildFacilityEntryKey(hoveredFacility);",
            "const previousFacilityKey = buildFacilityEntryKey(hoveredFacilityEntry);",
            'setMapInteractionCursor(facilityDetailsActive ? "pointer" : "");',
            "if (clickedFacilityEntry && isFacilityDetailsSurfaceActive(clickedFacilityEntry.familyId)) {",
            'noteRenderAction("click-facility-info", actionStart);',
            "function shouldBlockUnderlyingSelectionForFacility",
            "function clearUnderlyingHoverForFacilityEntry",
            "if (clickedFacilityEntry && shouldBlockUnderlyingSelectionForFacility(clickedFacilityEntry)) {",
            'noteRenderAction("click-facility-block-underlying", actionStart);',
            "transportPanel.hidden !== true",
        ]
        for token in required_tokens:
            self.assertIn(token, content)
        self.assertIn('recordInteractionDurationMetric("interactionHoverCityProbeDuration"', city_owner_content)
        self.assertIn("readFacadeGetter('getFacilitySurfaceOwner')().buildFacilityTooltipText(entry);", facade_content)
        self.assertIn("getFacilitySurfaceOwner().applyFacilityInfoCardState(entry, {", content)
        self.assertIn("setVisibleFacilityHoverEntries(normalizedFamilyId, hoverEntries, {", transport_owner_content)
        self.assertIn("const nextEntriesByKey = new Map(", content)
        self.assertIn("function buildFacilityEntrySemanticKey", content)
        self.assertIn("dedupeFacilityHoverEntriesBySemanticKey(", content)
        self.assertIn("hoveredFacilityEntry = nextHoveredEntry;", content)
        self.assertIn("selectedFacilityEntry = nextSelectedEntry;", content)
        self.assertIn("function buildFacilityTooltipText", owner_content)
        self.assertIn("buildFacilityInfoCardFieldSections: buildFacilityInfoCardRows", owner_content)
        self.assertIn('facilityInfoCardMoreBtn.textContent = t(expanded ? "Less fields" : "More fields", "ui");', owner_content)

    def test_transport_overview_owner_delegates_facility_display_policy(self):
        transport_owner_content = TRANSPORT_OVERVIEW_OWNER_JS.read_text(encoding="utf-8")
        display_policy_content = TRANSPORT_FACILITY_DISPLAY_POLICY_JS.read_text(encoding="utf-8")
        self.assertIn("findTransportFacilityLabelPlacement,", transport_owner_content)
        self.assertIn("getTransportFacilityLabelCandidates,", transport_owner_content)
        self.assertIn("doTransportFacilityLabelBoxesOverlap(", transport_owner_content)
        self.assertIn("export function getTransportFacilityLabelCandidates(entries,", display_policy_content)
        self.assertIn("export function findTransportFacilityLabelPlacement(entry,", display_policy_content)
        self.assertIn("export function doTransportFacilityLabelBoxesOverlap(left, right)", display_policy_content)
        self.assertNotIn("function findTransportFacilityLabelPlacement", transport_owner_content)
        self.assertNotIn("function rectanglesOverlap", transport_owner_content)

    def test_airport_and_port_layers_use_icon_atlas_and_screen_space_hits(self):
        content = TRANSPORT_OVERVIEW_OWNER_JS.read_text(encoding="utf-8")
        icon_owner_content = TRANSPORT_FACILITY_ICONS_JS.read_text(encoding="utf-8")
        renderer_content = (REPO_ROOT / "js" / "core" / "map_renderer.js").read_text(encoding="utf-8")

        self.assertTrue((REPO_ROOT / "js" / "core" / "renderer" / "transport_facility_icon_atlas.png").exists())
        self.assertIn("resolveTransportFacilityIconKey", content)
        self.assertIn("getTransportFacilityIconAtlasImage", content)
        self.assertIn("context.drawImage(", content)
        self.assertIn("projectedPoint: [entry.x, entry.y]", content)
        self.assertIn("screenPoint: [entry.screenX, entry.screenY]", content)
        self.assertIn("const screenX = (x * zoomTransform.k) + zoomTransform.x;", content)
        self.assertIn("const screenY = (y * zoomTransform.k) + zoomTransform.y;", content)
        self.assertIn('shape: drawsAtlasIcon ? "icon" : shape', content)
        self.assertIn("markerRadiusPx: iconCell ? Math.max(4.5, iconSizePx * 0.52) : radiusBase * radiusScale", content)
        self.assertIn('iconAtlasStatus: iconAtlasStatus || undefined', content)
        self.assertIn('invalidateRenderPasses("contextMarkers", "transport-facility-icons-ready");', content)
        self.assertIn("invalidateRenderPasses,", renderer_content)
        self.assertIn('if (datum.shape === "icon")', renderer_content)
        self.assertIn("const facilityMarkerData = activeFacilityEntry?.projectedPoint?.length >= 2 ? [activeFacilityEntry] : [];", renderer_content)
        self.assertIn("const [x, y] = datum.projectedPoint || [];", renderer_content)
        self.assertIn('attr("vector-effect", "non-scaling-stroke")', renderer_content)
        self.assertIn("const zoomScale = Math.max(0.0001, Number(runtimeState.zoomTransform?.k || datum.screenScale || 1));", renderer_content)
        self.assertIn("const radius = Math.max(6.8, Number(datum.markerRadiusPx || 0) + 2.8) / zoomScale;", renderer_content)
        self.assertIn("Math.min(18, Number(entry?.markerRadiusPx || 0) + 5)", renderer_content)

        airport_section = content.split('familyId: "airport"', 1)[1].split("});", 1)[0]
        port_section = content.split('familyId: "port"', 1)[1].split("});", 1)[0]
        self.assertNotIn('shape: "diamond"', airport_section)
        self.assertIn('shape: "square"', port_section)

        for token in [
            "airport_major",
            "airport_regional",
            "airport_local",
            "airport_military",
            "airport_spaceport",
            "port_hub",
            "port_important",
            "port_local",
            "TRANSPORT_FACILITY_ICON_ATLAS_URL",
        ]:
            self.assertIn(token, icon_owner_content)

    def test_facility_entry_builder_uses_current_render_target_canvas(self):
        content = TRANSPORT_OVERVIEW_OWNER_JS.read_text(encoding="utf-8")
        section = content.split("function buildContextFacilityEntries", 1)[1].split(
            "function drawContextFacilityPointLayer",
            1,
        )[0]
        self.assertIn("const targetCanvas = context?.canvas || null;", section)
        self.assertIn("const viewportWidth = Number(targetCanvas?.width || 0);", section)
        self.assertIn("const viewportHeight = Number(targetCanvas?.height || 0);", section)
        self.assertNotIn("canvas?.width", section)
        self.assertNotIn("canvas?.height", section)

    def test_toolbar_summary_uses_filtered_transport_counts(self):
        toolbar_content = TOOLBAR_JS.read_text(encoding="utf-8")
        owner_content = TRANSPORT_APPEARANCE_CONTROLLER_JS.read_text(encoding="utf-8")
        summary_content = (REPO_ROOT / "js" / "ui" / "toolbar" / "appearance_transport_summary.js").read_text(encoding="utf-8")
        toolbar_required_tokens = [
            'registerRuntimeHook(state, "updateTransportAppearanceUIFn", renderTransportAppearanceUi);',
        ]
        owner_required_tokens = [
            'from "./appearance_transport_summary.js";',
            "getTransportAppearanceConfig().airport.primaryColor = normalizeOceanFillColor(event.target.value || airportDefaults.primaryColor);",
            "getTransportAppearanceConfig().port.primaryColor = normalizeOceanFillColor(event.target.value || portDefaults.primaryColor);",
            "buildTransportFamilySummaryTextForState({",
            "formatTransportPercent,",
            "formatTransportScopeLabel,",
            "formatTransportThresholdLabel,",
        ]
        summary_required_tokens = [
            'from "../../core/transport_overview_visibility_policy.js";',
            "export function getTransportFamilyFilteredCount({",
            "export function formatTransportFamilyCountText(familyId, count, translate)",
            "export function formatTransportPercent(value)",
            "export function formatTransportScopeLabel(value)",
            "export function formatTransportThresholdLabel(value)",
            "return getTransportOverviewFilteredFeatureCount({",
            "const filteredCount = getTransportFamilyFilteredCount({",
        ]
        for token in toolbar_required_tokens:
            self.assertIn(token, toolbar_content)
        for token in owner_required_tokens:
            self.assertIn(token, owner_content)
        for token in summary_required_tokens:
            self.assertIn(token, summary_content)
        self.assertNotIn("runtimeState", summary_content)
        self.assertNotIn("const formatTransportPercent = (value)", owner_content)

    def test_state_and_i18n_cover_transport_primary_color_and_more_fields(self):
        state_content = (
            (REPO_ROOT / "js" / "core" / "transport_capability_registry.js").read_text(encoding="utf-8")
            + "\n"
            + (REPO_ROOT / "js" / "core" / "state_defaults.js").read_text(encoding="utf-8")
        )
        i18n_content = (
            (REPO_ROOT / "js" / "ui" / "i18n.js").read_text(encoding="utf-8")
            + "\n"
            + (REPO_ROOT / "js" / "core" / "i18n_catalog.js").read_text(encoding="utf-8")
        )
        self.assertIn('primaryColor: "#1d4ed8"', state_content)
        self.assertIn('primaryColor: "#b45309"', state_content)
        self.assertIn("allowFacilityUnderlyingMapSelection: false", state_content)
        self.assertIn("labelSize: 9", state_content)
        self.assertIn("labelHalo: 0.22", state_content)
        self.assertIn("function normalizeTransportOverviewPrimaryColor", state_content)
        self.assertIn('import { normalizeHexColorWithFallback } from "./color_hex_utils.js";', state_content)
        self.assertIn('return normalizeHexColorWithFallback(value, fallback, "#1d4ed8");', state_content)
        self.assertIn('return normalizeHexColorWithFallback(value, fallback, "#475569");', state_content)
        for token in ['"Primary Color"', '"Label Halo"', '"Allow Underlying Map Selection"', '"More fields"', '"Less fields"', '"Locate and zoom"', '"airport"', '"airports"', '"port"', '"ports"', '"Owner"', '"Manager"', '"Status"', '"Agencies"', '"Ferry service"', '"Unnamed facility"']:
          self.assertIn(token, i18n_content)

    def test_toolbar_syncs_facility_card_visibility_when_transport_surface_changes(self):
        renderer_content = (REPO_ROOT / "js" / "core" / "map_renderer.js").read_text(encoding="utf-8")
        owner_content = TRANSPORT_APPEARANCE_CONTROLLER_JS.read_text(encoding="utf-8")
        self.assertIn("runtimeState.syncFacilityInfoCardVisibilityFn?.();", owner_content)
        self.assertIn("function syncFacilityInfoCardVisibility()", renderer_content)
        self.assertIn('document.getElementById("appearancePanelTransport")', renderer_content)
        self.assertIn("transportPanel.hidden !== true", renderer_content)
        self.assertIn("applyFacilityInfoCardState(null);", renderer_content)

    def test_map_renderer_coalesces_mousemove_hover_overlay_only(self):
        content = (REPO_ROOT / "js" / "core" / "map_renderer.js").read_text(encoding="utf-8")
        required_tokens = [
            "let hoverOverlayRenderRafHandle = null;",
            "function scheduleHoverOverlayRender()",
            "if (hoverOverlayRenderRafHandle !== null && hoverOverlayRenderRafHandle !== undefined) {",
            'hoverOverlayRenderRafHandle = typeof globalThis.requestAnimationFrame === "function"',
            'renderHoverOverlayIfNeeded({ eventType: "hover" });',
            "function cancelScheduledHoverOverlayRender()",
            "cancelScheduledHoverOverlayRender();",
            'recordInteractionDurationMetric("interactionHoverOverlayDuration"',
            'renderHoverOverlayIfNeeded({ eventType: "facility-card-visibility" });',
            'renderHoverOverlayIfNeeded({ eventType: "facility-card-open" });',
            'renderHoverOverlayIfNeeded({ eventType: "facility-card-clear" });',
            'renderHoverOverlayIfNeeded({ force: true, eventType: "zoom-start" });',
            'renderHoverOverlayIfNeeded({ eventType: "mouseleave" });',
            'renderHoverOverlayIfNeeded({ eventType: "facility-card-close" });',
        ]
        for token in required_tokens:
            self.assertIn(token, content)
        self.assertIn('interactionRect.on("mouseleave", () => {', content)
        self.assertIn('facilityInfoCardCloseBtn.addEventListener("click", () => {', content)


if __name__ == "__main__":
    unittest.main()
