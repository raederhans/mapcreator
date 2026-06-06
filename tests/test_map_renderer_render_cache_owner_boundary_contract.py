from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RENDER_CACHE_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "render_cache_owner.js"


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
        self.assertIn("interactionCompositePassNames: INTERACTION_COMPOSITE_PASS_NAMES,", renderer_content)
        self.assertIn("renderPassNames: RENDER_PASS_NAMES,", renderer_content)
        self.assertIn("transformedFramePassNames: TRANSFORM_REUSED_RENDER_PASS_NAMES,", renderer_content)
        self.assertIn("function getRenderPassCacheState() {", renderer_content)
        self.assertIn("return getRenderCacheOwner().getRenderPassCacheState();", renderer_content)
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
        self.assertIn("function getRenderPassCacheState() {", owner_content)
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
        self.assertIn("function getInteractionCompositeReuseDecision(", owner_content)
        self.assertIn('new Set(["selection-version-mismatch", "topology-revision-mismatch"])', owner_content)
        self.assertIn("allowSelectionTopologyContinuity", owner_content)
        self.assertIn("function canDrawInteractionComposite(currentTransform, cache = getRenderPassCacheState()) {", owner_content)
        self.assertIn("invalidateInteractionComposite(rejectReason);", owner_content)
        self.assertIn("getInteractionCompositeReuseDecision,", owner_content)
        self.assertIn("return transform ? cloneZoomTransform(transform) : null;", owner_content)
        self.assertIn("cache.fullReferenceTransforms[passName] = cloneZoomTransform(transform);", owner_content)
        self.assertNotIn("return cache.referenceTransform ? cloneZoomTransform(cache.referenceTransform) : null;", owner_content.split("function getPassFullReferenceTransform(passName) {", 1)[1].split("function setPassFullReferenceTransform", 1)[0])

        self.assertIsNone(re.search(r"function\s+buildRenderPassLayout\s*\(", renderer_content))
        self.assertIsNone(re.search(r"function\s+getInteractionCompositeRejectReason\s*\(", renderer_content))

    def test_modern_city_lights_static_cache_excludes_clock_fields(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        signature_match = re.search(
            r"function getModernCityLightsStaticConfigSignature\(config\) \{(?P<body>[\s\S]*?)\n\}",
            renderer_content,
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
            r"function getModernCityLightsStaticLayerKey\(config\) \{(?P<body>[\s\S]*?)\n\}",
            renderer_content,
        )
        self.assertIsNotNone(key_match)
        key_body = key_match.group("body")
        self.assertIn("getModernCityLightsStaticConfigSignature(config)", key_body)
        self.assertIn("getTransformSignature(runtimeState.zoomTransform", key_body)
        self.assertIn("runtimeState.contextLayerRevision", key_body)
        self.assertIn("runtimeState.cityLayerRevision", key_body)
        self.assertNotIn("manualUtcMinutes", key_body)
        self.assertNotIn("getDayNightSignatureClockToken", key_body)
        self.assertNotIn("shadowOpacity", key_body)
        self.assertNotIn("twilightWidthDeg", key_body)
        self.assertNotIn("solarState", key_body)

        self.assertRegex(
            renderer_content,
            r"function drawModernNightLightsLayer\(k, config, solarState\) \{[\s\S]*?"
            r"const staticLayerCanvas = getModernCityLightsStaticLayerCanvas\(k, config, intensity\);[\s\S]*?"
            r"context\.drawImage\(staticLayerCanvas, 0, 0\);",
        )

    def test_modern_city_lights_advanced_controls_reach_draw_algorithms(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")

        texture_match = re.search(
            r"function drawModernCityLightsTexture\(config, intensity\) \{(?P<body>[\s\S]*?)\n\}",
            renderer_content,
        )
        self.assertIsNotNone(texture_match)
        texture_body = texture_match.group("body")
        self.assertIn("config.cityLightsTextureOpacity", texture_body)
        self.assertIn("textureOpacity <= 0", texture_body)
        self.assertIn("textureOpacity *", texture_body)

        corridor_match = re.search(
            r"function drawModernCityLightsCorridors\(config, intensity\) \{(?P<body>[\s\S]*?)\n\}",
            renderer_content,
        )
        self.assertIsNotNone(corridor_match)
        corridor_body = corridor_match.group("body")
        self.assertIn("config.cityLightsCorridorStrength", corridor_body)
        self.assertIn("corridorStrength <= 0", corridor_body)
        self.assertIn("corridorStrength *", corridor_body)

        core_match = re.search(
            r"function drawModernCityLightsCores\(k, config, _intensity, coreEntries = null\) \{(?P<body>[\s\S]*?)\n\}",
            renderer_content,
        )
        self.assertIsNotNone(core_match)
        core_body = core_match.group("body")
        self.assertIn("config.cityLightsCoreSharpness", core_body)
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
