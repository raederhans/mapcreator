from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RENDER_CACHE_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "render_cache_owner.js"
CITY_LIGHTS_RENDER_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "city_lights_render_owner.js"
LEGACY_MODERN_CITY_LIGHTS_RENDER_OWNER_JS = (
    REPO_ROOT / "js" / "core" / "renderer" / "modern_city_lights_render_owner.js"
)


class MapRendererRenderCacheOwnerBoundaryContractTest(unittest.TestCase):
    def test_map_renderer_keeps_cache_facade_while_render_cache_owner_holds_canvas_and_signature_state(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = RENDER_CACHE_OWNER_JS.read_text(encoding="utf-8")
        renderer_imports = renderer_content.replace('"', "'")

        self.assertIn(
            "import { createRenderCacheOwner } from './renderer/render_cache_owner.js';",
            renderer_imports,
        )
        self.assertIn("let renderCacheOwner = null;", renderer_content)
        self.assertIn("function getRenderCacheOwner() {", renderer_content)
        get_owner_match = re.search(
            r"function getRenderCacheOwner\(\) \{(?P<body>[\s\S]*?)\n\}",
            renderer_content,
        )
        self.assertIsNotNone(get_owner_match)
        get_owner_body = get_owner_match.group("body")
        self.assertIn("const rendererContext = getRenderCacheReceiverContext();", get_owner_body)
        self.assertIn("const runtime = rendererContext.state.runtimeState;", get_owner_body)
        self.assertIn("const surfaceHost = rendererContext.surface.host;", get_owner_body)
        self.assertIn("const renderCacheContext = rendererContext.renderCache;", get_owner_body)
        self.assertIn("surfaceHost !== renderCacheContext.getSurfaceHost()", get_owner_body)
        self.assertIn("const renderCacheConstants = renderCacheContext.constants;", get_owner_body)
        self.assertIn("const renderCacheHelpers = renderCacheContext.helpers;", get_owner_body)
        self.assertIn("renderCacheOwner = createRenderCacheOwner({", get_owner_body)
        self.assertIn("state: runtime,", get_owner_body)
        self.assertIn("interactionCompositePassNames: renderCacheConstants.interactionCompositePassNames,", get_owner_body)
        self.assertIn("renderPassNames: renderCacheConstants.renderPassNames,", get_owner_body)
        self.assertIn("transformedFramePassNames: renderCacheConstants.transformedFramePassNames,", get_owner_body)
        self.assertIn("getContext: () => renderCacheContext.getMainContext(),", get_owner_body)
        self.assertIn("getTransformSignature: renderCacheHelpers.getTransformSignature,", get_owner_body)
        self.assertIn("getVisibleFrameIdentity: renderCacheHelpers.getVisibleFrameIdentity,", get_owner_body)
        self.assertNotIn("invalidateInteractionComposite,", get_owner_body)
        self.assertNotIn("state,", get_owner_body)
        self.assertNotIn("getContext: () => rendererSurfaceHost.getContext(),", get_owner_body)
        self.assertNotIn("rendererRuntimeContext:", get_owner_body)
        self.assertIn("function getRenderPassCacheState() {", renderer_content)
        self.assertIn("return getRenderCacheOwner().getRenderPassCacheState();", renderer_content)
        self.assertIn("return getRenderCacheOwner().clearLastGoodFrame(reason);", renderer_content)
        self.assertIn("return getRenderCacheOwner().invalidateInteractionComposite(reason);", renderer_content)
        self.assertIn("function getMutationPassNames(mutation = {}) {", renderer_content)
        self.assertIn("return mutation.normalizedPassNames;", renderer_content)
        self.assertIn("const hostFollowUps = mutation.effects?.hostFollowUps || {};", renderer_content)
        self.assertIn("return applyRenderPassInvalidationEffects(getRenderCacheOwner().invalidateRenderPasses(passNames, reason));", renderer_content)
        self.assertIn("return applyRenderPassInvalidationEffects(getRenderCacheOwner().invalidateAllRenderPasses(reason));", renderer_content)
        self.assertIn("const mutation = getRenderCacheOwner().clearRenderPassReferenceTransforms(passNames);", renderer_content)
        self.assertIn("return getRenderCacheOwner().getRenderPassLayout(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().resizeRenderPassCanvases(passNames);", renderer_content)
        self.assertIn("return getRenderCacheOwner().ensureRenderPassCanvas(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().ensureLastGoodFrameCanvas();", renderer_content)
        self.assertIn("return getRenderCacheOwner().ensureInteractionCompositeCanvas();", renderer_content)
        self.assertIn("return getRenderCacheOwner().ensureCompositeBufferCanvas();", renderer_content)
        self.assertIn("return getRenderCacheOwner().getPassReferenceTransform(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().setPassReferenceTransform(passName, transform);", renderer_content)
        self.assertIn("return getRenderCacheOwner().getPassFullReferenceTransform(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().setPassFullReferenceTransform(passName, transform);", renderer_content)
        self.assertIn("return getRenderCacheOwner().hasPassFullReferenceTransform(passName);", renderer_content)
        self.assertIn("return getRenderCacheOwner().clearPassFullReferenceTransforms(passNames);", renderer_content)
        self.assertIn("return getRenderCacheOwner().getInteractionCompositeSignature(cache);", renderer_content)
        self.assertIn("return getRenderCacheOwner().getInteractionCompositeReuseDecision(currentTransform, cache, options);", renderer_content)
        self.assertIn("return getRenderCacheOwner().canDrawInteractionComposite(currentTransform, cache);", renderer_content)

        self.assertIn("export function createRenderCacheOwner({", owner_content)
        self.assertIn("const RENDER_CACHE_OWNER_SUMMARY_VERSION = 1;", owner_content)
        self.assertIn("function getRenderPassCacheState() {", owner_content)
        self.assertIn("function normalizeRenderPassRequest(passNames, { filterKnown = true } = {}) {", owner_content)
        self.assertIn("function createMutationSummary({", owner_content)
        self.assertIn("version: RENDER_CACHE_OWNER_SUMMARY_VERSION,", owner_content)
        self.assertIn("requestedPassNames,", owner_content)
        self.assertIn("normalizedPassNames,", owner_content)
        self.assertIn("droppedPassNames,", owner_content)
        self.assertIn("sharedReferenceTransformCleared", owner_content)
        self.assertIn("function invalidateRenderPasses(passNames, reason = \"unspecified\") {", owner_content)
        self.assertIn("function invalidateAllRenderPasses(reason = \"unspecified\") {", owner_content)
        self.assertIn("function clearRenderPassReferenceTransforms(passNames = null) {", owner_content)
        self.assertIn("function invalidateInteractionComposite(reason = \"interaction-composite-invalidation\") {", owner_content)
        self.assertIn("function clearLastGoodFrame(reason = \"clear\") {", owner_content)
        self.assertNotIn("invalidateInteractionComposite = () => {}", owner_content)
        self.assertIn("function buildRenderPassLayout(passName) {", owner_content)
        self.assertIn("function resizeRenderPassCanvases(passNames = renderPassNames) {", owner_content)
        self.assertIn("function ensureRenderPassCanvas(passName) {", owner_content)
        self.assertRegex(
            owner_content,
            r"(?s)function ensureRenderPassCanvas\(passName\) \{"
            r".*?resizeRenderPassCanvases\(\[passName\]\);"
            r".*?return cache\.canvases\[passName\];",
        )
        self.assertIn("function ensureLastGoodFrameCanvas() {", owner_content)
        self.assertIn("function ensureInteractionCompositeCanvas() {", owner_content)
        self.assertIn("function ensureCompositeBufferCanvas() {", owner_content)
        self.assertIn("function getPassFullReferenceTransform(passName) {", owner_content)
        self.assertIn("function setPassFullReferenceTransform(passName, transform) {", owner_content)
        self.assertIn("function hasPassFullReferenceTransform(passName) {", owner_content)
        self.assertIn("function clearPassFullReferenceTransforms(passNames = null) {", owner_content)
        self.assertIn("function getInteractionCompositeMismatchReasons(composite, currentTransform, cache = getRenderPassCacheState()) {", owner_content)
        self.assertIn('mismatchReasons.push("scene-generation-mismatch");', owner_content)
        self.assertIn('mismatchReasons.push("scenario-data-generation-mismatch");', owner_content)
        self.assertIn("function getInteractionCompositeReuseDecision(", owner_content)
        self.assertIn('new Set(["selection-version-mismatch", "topology-revision-mismatch"])', owner_content)
        self.assertIn("allowSelectionTopologyContinuity", owner_content)
        self.assertIn("function canDrawInteractionComposite(currentTransform, cache = getRenderPassCacheState()) {", owner_content)
        self.assertIn("invalidateInteractionComposite(rejectReason);", owner_content)
        self.assertIn("invalidateRenderPasses,", owner_content)
        self.assertIn("invalidateAllRenderPasses,", owner_content)
        self.assertIn("clearRenderPassReferenceTransforms,", owner_content)
        self.assertIn("invalidateInteractionComposite,", owner_content)
        self.assertIn("clearLastGoodFrame,", owner_content)
        self.assertIn("getInteractionCompositeReuseDecision,", owner_content)
        self.assertIn("return transform ? cloneZoomTransform(transform) : null;", owner_content)
        self.assertIn("cache.fullReferenceTransforms[passName] = cloneZoomTransform(transform);", owner_content)
        self.assertNotIn("return cache.referenceTransform ? cloneZoomTransform(cache.referenceTransform) : null;", owner_content.split("function getPassFullReferenceTransform(passName) {", 1)[1].split("function setPassFullReferenceTransform", 1)[0])

        self.assertIsNone(re.search(r"function\s+buildRenderPassLayout\s*\(", renderer_content))
        self.assertIsNone(re.search(r"function\s+getInteractionCompositeRejectReason\s*\(", renderer_content))

    def test_modern_city_lights_static_cache_excludes_clock_fields(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = CITY_LIGHTS_RENDER_OWNER_JS.read_text(encoding="utf-8")
        signature_match = re.search(
            r"function getModernCityLightsStaticConfigSignature\(config\) \{(?P<body>[\s\S]*?)\n  \}",
            owner_content,
        )
        self.assertIsNotNone(signature_match)
        signature_body = signature_match.group("body")

        self.assertIn("cityLightsIntensity", signature_body)
        self.assertIn("cityLightsTextureOpacity", signature_body)
        self.assertIn("cityLightsCorridorStrength", signature_body)
        self.assertIn("cityLightsCoreSharpness", signature_body)
        self.assertIn("cityLightsPopulationBoostStrength", signature_body)
        self.assertNotIn("manualUtcMinutes", signature_body)
        self.assertNotIn("shadowOpacity", signature_body)
        self.assertNotIn("twilightWidthDeg", signature_body)

        key_match = re.search(
            r"function getModernCityLightsStaticLayerKey\(config\) \{(?P<body>[\s\S]*?)\n  \}",
            owner_content,
        )
        self.assertIsNotNone(key_match)
        key_body = key_match.group("body")
        self.assertIn("getModernCityLightsStaticConfigSignature(config)", key_body)
        self.assertIn("getTransformSignature(getZoomTransform())", key_body)
        self.assertIn("runtimeState.contextLayerRevision", key_body)
        self.assertIn("runtimeState.cityLayerRevision", key_body)
        self.assertIn("intensityFields?.channels?.urbanGlow?.revision", key_body)
        self.assertNotIn("manualUtcMinutes", key_body)
        self.assertNotIn("getDayNightSignatureClockToken", key_body)
        self.assertNotIn("shadowOpacity", key_body)
        self.assertNotIn("twilightWidthDeg", key_body)
        self.assertNotIn("solarState", key_body)

        self.assertRegex(
            owner_content,
            r"function drawModernNightLightsLayer\(k, config, solarState\) \{[\s\S]*?"
            r"const staticLayerCanvas = getModernCityLightsStaticLayerCanvas\(k, config, intensity\);[\s\S]*?"
            r"context\.drawImage\(staticLayerCanvas, 0, 0\);",
        )
        self.assertIn("drawNightLightsLayer(k, config, solarState);", renderer_content)
        self.assertIn("return getCityLightsRenderOwner().drawNightLightsLayer(k, config, solarState);", renderer_content)
        self.assertIn("function drawHistoricalNightLightsLayer(k, config, solarState) {", owner_content)
        self.assertNotIn("const historicalCityLightsFallbackCache = {", renderer_content)
        self.assertNotIn("function getHistoricalCityLightsDensity(config) {", renderer_content)
        self.assertNotIn("allowStaticBuild", renderer_content)
        self.assertNotIn("allowBuild: allowStaticBuild", renderer_content)

    def test_city_lights_implementation_responsibilities_cannot_flow_back_to_map_renderer(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = CITY_LIGHTS_RENDER_OWNER_JS.read_text(encoding="utf-8")

        cache_declarations = (
            "const modernCityLightsGeometryCache = {",
            "const modernCityLightsPopulationBoostCache = {",
            "const modernCityLightsStaticLayerCache = {",
            "const historicalCityLightsDerivedGlowCache = {",
            "const historicalCityLightsFallbackCache = {",
        )
        implementation_functions = (
            "drawModernCityLightsTexture",
            "drawModernCityLightsCorridors",
            "collectModernUrbanCoreEntries",
            "drawModernCityLightsCores",
            "drawModernCityFallbackLights",
            "drawModernCityLightsPopulationBoostLayer",
            "drawModernCityLightsStaticLayer",
            "drawHistoricalDerivedGlowLayer",
            "drawHistoricalNightLightsLayer",
            "getHistoricalCityLightsDensity",
            "getHistoricalCityLightsSecondaryRetention",
            "interpolateHistoricalThreshold",
            "getHistoricalCityLightCapitalBoost",
            "sanitizeHistoricalCityLightEntry",
            "shouldRenderHistoricalCityLightEntry",
            "getHistoricalProxyAssetEntries",
            "computeHistoricalFallbackCityLightWeight",
            "getHistoricalProxyFallbackEntries",
            "getHistoricalNightLightEntries",
            "getHistoricalDerivedGlowEntries",
        )

        for declaration in cache_declarations:
            with self.subTest(declaration=declaration):
                self.assertNotIn(declaration, renderer_content)
                self.assertIn(declaration, owner_content)

        for function_name in implementation_functions:
            declaration_pattern = rf"function\s+{re.escape(function_name)}\s*\("
            with self.subTest(function_name=function_name):
                self.assertIsNone(re.search(declaration_pattern, renderer_content))
                self.assertIsNotNone(re.search(declaration_pattern, owner_content))

        modern_wrapper_match = re.search(
            r"function drawModernNightLightsLayer\(\.\.\.args\) \{(?P<body>[\s\S]*?)\n\}",
            renderer_content,
        )
        self.assertIsNotNone(modern_wrapper_match)
        self.assertEqual(
            modern_wrapper_match.group("body").strip(),
            "return getCityLightsRenderOwner().drawModernNightLightsLayer(...args);",
        )
        self.assertIn("function drawModernNightLightsLayer(k, config, solarState) {", owner_content)

    def test_legacy_modern_city_lights_owner_path_stays_removed(self):
        self.assertFalse(LEGACY_MODERN_CITY_LIGHTS_RENDER_OWNER_JS.exists())

    def test_modern_city_lights_advanced_controls_reach_draw_algorithms(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner_content = CITY_LIGHTS_RENDER_OWNER_JS.read_text(encoding="utf-8")

        texture_match = re.search(
            r"function drawModernCityLightsTexture\(config, intensity\) \{(?P<body>[\s\S]*?)\n  \}",
            owner_content,
        )
        self.assertIsNotNone(texture_match)
        texture_body = texture_match.group("body")
        self.assertIn('getModernDayNightNumber(config, "cityLightsTextureOpacity")', texture_body)
        self.assertIn("textureOpacity <= 0", texture_body)
        self.assertIn("textureOpacity *", texture_body)

        corridor_match = re.search(
            r"function drawModernCityLightsCorridors\(config, intensity\) \{(?P<body>[\s\S]*?)\n  \}",
            owner_content,
        )
        self.assertIsNotNone(corridor_match)
        corridor_body = corridor_match.group("body")
        self.assertIn('getModernDayNightNumber(config, "cityLightsCorridorStrength")', corridor_body)
        self.assertIn("corridorStrength <= 0", corridor_body)
        self.assertIn("corridorStrength *", corridor_body)

        core_match = re.search(
            r"function drawModernCityLightsCores\(k, config, _intensity, coreEntries = null\) \{(?P<body>[\s\S]*?)\n  \}",
            owner_content,
        )
        self.assertIsNotNone(core_match)
        core_body = core_match.group("body")
        self.assertIn('getModernDayNightNumber(config, "cityLightsCoreSharpness")', core_body)
        self.assertIn("haloSpread", core_body)
        self.assertIn("coreSpread", core_body)
        self.assertIn("coreInnerStop", core_body)
        self.assertIn("coreMidStop", core_body)

    def test_active_scenario_shell_empty_political_baseline_cannot_fall_back_to_primary(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")

        self.assertIn(
            "const runtimeBaseCollection = getRuntimePoliticalBaseCollection(runtimeCollection);",
            renderer_content,
        )
        self.assertIn(
            'const hasScenarioRuntimePoliticalSource = !!String(runtimeState.activeScenarioId || "").trim()',
            renderer_content,
        )
        self.assertIn("&& !!runtimeTopology?.objects?.political;", renderer_content)
        self.assertRegex(
            renderer_content,
            r"if \(runtimeBaseCollection\) \{[\s\S]*?"
            r"fullCollection = runtimeBaseCollection;[\s\S]*?"
            r"\} else if \(hasScenarioRuntimePoliticalSource\) \{[\s\S]*?"
            r"fullCollection = \{ type: \"FeatureCollection\", features: \[\] \};[\s\S]*?"
            r"\} else if \(primaryTopology\?\.objects\?\.political",
        )
        self.assertIn(
            "appendUniqueFeatureCollections(\n    fullCollection,\n    buildAtlantropaLandLikeFeatureCollection()\n  );",
            renderer_content,
        )


if __name__ == "__main__":
    unittest.main()
