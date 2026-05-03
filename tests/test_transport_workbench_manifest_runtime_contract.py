from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
VARIANT_HELPER_JS = REPO_ROOT / "js" / "ui" / "transport_workbench_manifest_variants.js"
PORT_PREVIEW_JS = REPO_ROOT / "js" / "ui" / "transport_workbench_port_preview.js"
INDUSTRIAL_PREVIEW_JS = REPO_ROOT / "js" / "ui" / "transport_workbench_industrial_zone_preview.js"
POINT_PREVIEW_SHARED_JS = REPO_ROOT / "js" / "ui" / "transport_workbench_point_preview_shared.js"
POINT_DENSITY_HELPERS_JS = REPO_ROOT / "js" / "ui" / "transport_workbench_density_helpers.js"
LINE_RUNTIME_SHARED_JS = REPO_ROOT / "js" / "ui" / "transport_workbench_line_runtime_shared.js"
FAMILY_PREVIEW_JS = REPO_ROOT / "js" / "ui" / "transport_workbench_family_preview.js"
MANIFEST_PREVIEW_JS = REPO_ROOT / "js" / "ui" / "transport_workbench_manifest_preview.js"
FAMILY_REGISTRY_JS = REPO_ROOT / "js" / "ui" / "transport_workbench_family_registry.js"
TRANSPORT_CAPABILITY_REGISTRY_JS = REPO_ROOT / "js" / "core" / "transport_capability_registry.js"
STATE_DEFAULTS_JS = REPO_ROOT / "js" / "core" / "state_defaults.js"
UI_STATE_JS = REPO_ROOT / "js" / "core" / "state" / "ui_state.js"
TOOLBAR_JS = REPO_ROOT / "js" / "ui" / "toolbar.js"
TRANSPORT_WORKBENCH_CONTROLLER_JS = REPO_ROOT / "js" / "ui" / "toolbar" / "transport_workbench_controller.js"
LOCALES_JSON = REPO_ROOT / "data" / "locales.json"
STARTUP_LOCALE_FILES = [
    REPO_ROOT / "data" / "scenarios" / "hoi4_1936" / "locales.startup.json",
    REPO_ROOT / "data" / "scenarios" / "hoi4_1939" / "locales.startup.json",
    REPO_ROOT / "data" / "scenarios" / "tno_1962" / "locales.startup.json",
]


class TransportWorkbenchManifestRuntimeContractTest(unittest.TestCase):
    def test_shared_variant_helper_exposes_shared_manifest_contract(self) -> None:
        content = VARIANT_HELPER_JS.read_text(encoding="utf-8")

        self.assertIn("manifest?.variants", content)
        self.assertIn("manifest?.default_variant", content)
        self.assertNotIn("coverage_variants", content)
        self.assertNotIn("distribution_variants", content)
        self.assertNotIn("default_coverage_tier", content)
        self.assertNotIn("default_distribution_variant", content)

    def test_port_preview_uses_shared_variant_contract_only(self) -> None:
        content = PORT_PREVIEW_JS.read_text(encoding="utf-8")

        self.assertIn('./transport_workbench_manifest_variants.js', content)
        self.assertIn("resolveTransportWorkbenchManifestVariantId", content)
        self.assertIn("getTransportWorkbenchManifestVariantMeta", content)
        self.assertNotIn("coverage_variants", content)
        self.assertNotIn("default_coverage_tier", content)

    def test_industrial_preview_uses_shared_variant_contract_only(self) -> None:
        content = INDUSTRIAL_PREVIEW_JS.read_text(encoding="utf-8")

        self.assertIn('./transport_workbench_manifest_variants.js', content)
        self.assertIn("resolveTransportWorkbenchManifestVariantId", content)
        self.assertIn("getTransportWorkbenchManifestVariantMeta", content)
        self.assertIn("getTransportWorkbenchManifestDefaultVariantId", content)
        self.assertNotIn("distribution_variants", content)
        self.assertNotIn("default_distribution_variant", content)

    def test_toolbar_no_longer_reads_legacy_transport_variant_fields(self) -> None:
        toolbar_content = TOOLBAR_JS.read_text(encoding="utf-8")
        controller_content = TRANSPORT_WORKBENCH_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertIn('./toolbar/transport_workbench_controller.js', toolbar_content)
        self.assertIn('../transport_workbench_manifest_variants.js', controller_content)
        self.assertIn("listTransportWorkbenchManifestVariantEntries", controller_content)
        self.assertIn("getTransportWorkbenchManifestDefaultVariantId", controller_content)
        self.assertIn("getTransportWorkbenchManifestVariantMeta", controller_content)
        self.assertNotIn("coverage_variants", controller_content)
        self.assertNotIn("distribution_variants", controller_content)
        self.assertNotIn("default_coverage_tier", controller_content)
        self.assertNotIn("default_distribution_variant", controller_content)
        self.assertIn("getTransportWorkbenchOverviewBridgeSupport", controller_content)

    def test_transport_capability_registry_owns_family_capability_truth(self) -> None:
        registry_content = TRANSPORT_CAPABILITY_REGISTRY_JS.read_text(encoding="utf-8")
        state_defaults_content = STATE_DEFAULTS_JS.read_text(encoding="utf-8")
        ui_state_content = UI_STATE_JS.read_text(encoding="utf-8")
        family_registry_content = (REPO_ROOT / "js" / "ui" / "transport_workbench_family_registry.js").read_text(encoding="utf-8")
        descriptor_content = (REPO_ROOT / "js" / "ui" / "toolbar" / "transport_workbench_descriptor.js").read_text(encoding="utf-8")

        self.assertIn("TRANSPORT_CAPABILITY_REGISTRY", registry_content)
        self.assertIn("TRANSPORT_CAPABILITY_APPLY_COMPATIBILITY", registry_content)
        self.assertIn("TRANSPORT_CAPABILITY_FAMILY_IDS = Object.freeze(Object.keys(TRANSPORT_CAPABILITY_REGISTRY))", registry_content)
        self.assertIn("listTransportCapabilityFamilyIds", registry_content)
        self.assertIn("listTransportRuntimeCapabilityFamilyIds", registry_content)
        self.assertIn("TRANSPORT_CAPABILITY_FAMILY_IDS.filter((familyId) => TRANSPORT_CAPABILITY_REGISTRY[familyId].runtimeKind", registry_content)
        self.assertIn("TRANSPORT_OVERVIEW_VISUAL_MODES", registry_content)
        self.assertIn("resolveTransportOverviewPatchFromWorkbench", registry_content)
        self.assertIn("getTransportWorkbenchOverviewBridgeSupport", registry_content)
        self.assertIn("resolveTransportOverviewPointStrategy", registry_content)
        self.assertIn("resolveTransportOverviewLineStrategy", registry_content)
        self.assertIn("TRANSPORT_OVERVIEW_CAPABILITY_FAMILY_IDS", state_defaults_content)
        self.assertIn("TRANSPORT_OVERVIEW_FAMILY_IDS = TRANSPORT_OVERVIEW_CAPABILITY_FAMILY_IDS", state_defaults_content)
        self.assertIn("../core/transport_capability_registry.js", family_registry_content)
        self.assertIn("../../core/transport_capability_registry.js", descriptor_content)
        self.assertIn("getTransportCapabilityFamilyMetadata", family_registry_content)
        self.assertIn("getTransportCapabilityFamilyMetadata", descriptor_content)
        self.assertIn("return listTransportRuntimeCapabilityFamilyIds();", family_registry_content)
        self.assertIn("listTransportCapabilityFamilyIds().map(createTransportWorkbenchFamilyDescriptor)", descriptor_content)
        self.assertIn('listTransportRuntimeCapabilityFamilyIds', ui_state_content)
        self.assertIn('layerOrder: [...TRANSPORT_WORKBENCH_RUNTIME_FAMILY_IDS],', ui_state_content)
        self.assertNotIn('["road", "rail", "airport", "port"]', family_registry_content)
        self.assertNotIn('["road", "rail", "airport", "port"]', descriptor_content)

    def test_label_separation_contract_stays_in_the_same_range_across_state_and_preview(self) -> None:
        state_defaults_content = STATE_DEFAULTS_JS.read_text(encoding="utf-8")
        controller_content = TRANSPORT_WORKBENCH_CONTROLLER_JS.read_text(encoding="utf-8")
        density_helper_content = POINT_DENSITY_HELPERS_JS.read_text(encoding="utf-8")

        self.assertIn("separationStrength: 1,", state_defaults_content)
        self.assertIn("toFiniteNumber(rawLabels.separationStrength, defaults.labels.separationStrength)", state_defaults_content)
        self.assertIn("0.7,", state_defaults_content)
        self.assertIn("1.8", state_defaults_content)
        self.assertIn("Math.max(0.7, Math.min(1.8, Number(source.labelSeparation)", controller_content)
        self.assertIn("return clamp(normalizeNumber(config?.labelSeparation, 1), 0.7, 1.8);", density_helper_content)

    def test_preview_pack_loaders_reject_missing_pack_paths_before_fetch(self) -> None:
        point_content = POINT_PREVIEW_SHARED_JS.read_text(encoding="utf-8")
        industrial_content = INDUSTRIAL_PREVIEW_JS.read_text(encoding="utf-8")
        line_content = LINE_RUNTIME_SHARED_JS.read_text(encoding="utf-8")

        self.assertLess(point_content.index("if (!packPath)"), point_content.index("getTransportAsset(packPath"))
        self.assertLess(industrial_content.index("if (!packPath)"), industrial_content.index("getTransportAsset(packPath"))
        self.assertIn("Transport workbench manifest is missing ${mode}/${key} pack path.", line_content)

    def test_preview_gets_route_through_data_service(self) -> None:
        point_content = POINT_PREVIEW_SHARED_JS.read_text(encoding="utf-8")
        industrial_content = INDUSTRIAL_PREVIEW_JS.read_text(encoding="utf-8")
        line_content = LINE_RUNTIME_SHARED_JS.read_text(encoding="utf-8")
        manifest_content = MANIFEST_PREVIEW_JS.read_text(encoding="utf-8")

        self.assertIn("../core/data_service.js", point_content)
        self.assertIn("getTransportAsset", point_content)
        self.assertIn("../core/data_service.js", industrial_content)
        self.assertIn("getTransportAsset", industrial_content)
        self.assertIn("../core/data_service.js", line_content)
        self.assertIn("loadTransportAsset", line_content)
        self.assertIn("../core/data_service.js", manifest_content)
        self.assertIn("getTransportAsset", manifest_content)
        self.assertNotIn("fetch(packPath", point_content)
        self.assertNotIn("fetch(packPath", industrial_content)


    def test_family_preview_dispatch_is_config_driven(self) -> None:
        preview_content = FAMILY_PREVIEW_JS.read_text(encoding="utf-8")
        registry_content = FAMILY_REGISTRY_JS.read_text(encoding="utf-8")

        self.assertIn("createPreviewHandler", preview_content)
        self.assertIn("getTransportWorkbenchFamilyPreviewConfig", preview_content)
        self.assertIn("listTransportWorkbenchFamilyPreviewConfigs", preview_content)
        self.assertIn("PREVIEW_MODULES_BY_KEY", preview_content)
        self.assertNotIn("FAMILY_PREVIEW_HANDLERS", preview_content)
        self.assertIn("TRANSPORT_WORKBENCH_FAMILY_PREVIEW_EXPORTS", registry_content)
        self.assertIn("previewOnly: true", registry_content)
        self.assertIn('moduleKey: "road"', registry_content)
        self.assertIn('moduleKey: "rail"', registry_content)
        self.assertIn("export function getTransportWorkbenchFamilyPreviewConfig", registry_content)
        self.assertIn("export function listTransportWorkbenchFamilyPreviewConfigs", registry_content)

    def test_apply_bridge_only_accepts_main_map_expressible_workbench_filters(self) -> None:
        registry_content = TRANSPORT_CAPABILITY_REGISTRY_JS.read_text(encoding="utf-8")
        controller_content = TRANSPORT_WORKBENCH_CONTROLLER_JS.read_text(encoding="utf-8")

        self.assertIn('if (normalizedFamilyId === "road" || normalizedFamilyId === "rail") {', registry_content)
        road_rail_section = registry_content.split('if (normalizedFamilyId === "road" || normalizedFamilyId === "rail") {', 1)[1].split(
            'if (normalizedFamilyId === "airport")',
            1,
        )[0]
        self.assertIn("supported: false", road_rail_section)
        self.assertIn("overview renderer 真正吃同一份 pack contract", road_rail_section)
        self.assertIn('hasExactTransportWorkbenchBridgeValueSet(familyConfig.airportTypes, supportedValues.airportTypes)', registry_content)
        self.assertIn('hasExactTransportWorkbenchBridgeValueSet(familyConfig.statuses, supportedValues.statuses)', registry_content)
        self.assertIn('hasExactTransportWorkbenchBridgeValueSet(familyConfig.legalDesignations, supportedValues.legalDesignations)', registry_content)
        self.assertIn('hasExactTransportWorkbenchBridgeValueSet(familyConfig.managerTypes, supportedValues.managerTypes)', registry_content)
        self.assertIn("Keep future main-map bridge families closed until they declare an exact", registry_content)
        self.assertIn("const bridgeSupport = getTransportWorkbenchOverviewBridgeSupport(familyId, familyConfig);", registry_content)
        self.assertIn("|| !bridgeSupport.supported", registry_content)
        self.assertNotRegex(registry_content, re.compile(r"return\s*\{[\s\S]*?\bdisplayConfig\s*,[\s\S]*?\};"))
        self.assertIn('label: t("Workbench preview only", "ui")', controller_content)

    def test_transport_copy_drops_road_only_legacy_phrases_from_runtime_and_startup_locales(self) -> None:
        stale_phrases = [
            "Only the road family is live right now",
            "Road and rail are the only Japan families with detailed controls right now.",
            "Use the center board to sort the seven transport families.",
            "These controls style only the future rail overlay shell.",
        ]

        locales_content = LOCALES_JSON.read_text(encoding="utf-8")
        controller_content = TRANSPORT_WORKBENCH_CONTROLLER_JS.read_text(encoding="utf-8")

        for phrase in stale_phrases:
            self.assertNotIn(phrase, locales_content)
            self.assertNotIn(phrase, controller_content)
            for startup_locale_file in STARTUP_LOCALE_FILES:
                self.assertNotIn(phrase, startup_locale_file.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
