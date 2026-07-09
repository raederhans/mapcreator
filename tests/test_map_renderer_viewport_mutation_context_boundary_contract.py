from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RUNTIME_CONTEXT_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "renderer_runtime_context.js"
PUBLIC_FACADE_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "public.js"
STATE_WRITE_ALLOWLIST = REPO_ROOT / "tools" / "eslint-rules" / "state-writer-allowlist.json"


def get_function_body(source, function_name):
    match = re.search(
        rf"function {re.escape(function_name)}\([^)]*\) \{{(?P<body>[\s\S]*?)\n\}}",
        source,
    )
    if match is None:
        raise AssertionError(f"Expected function {function_name} to exist")
    return match.group("body")


class MapRendererViewportMutationContextBoundaryContractTest(unittest.TestCase):
    def test_runtime_context_contains_only_viewport_mutation_read_accessors(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        context_content = RUNTIME_CONTEXT_JS.read_text(encoding="utf-8")
        runtime_context_body = get_function_body(renderer_content, "getRendererRuntimeContext")

        for token in [
            '"getMapContainer"',
            '"getViewportGroup"',
            '"getGlobal"',
            '"getDevicePixelRatio"',
            '"hasLandFeatures"',
            "getMapContainer: viewportAccessors.getMapContainer,",
            "getViewportGroup: viewportAccessors.getViewportGroup,",
            "getGlobal: viewportAccessors.getGlobal,",
            "getDevicePixelRatio: viewportAccessors.getDevicePixelRatio,",
            "hasLandFeatures: viewportAccessors.hasLandFeatures,",
        ]:
            self.assertIn(token, context_content)

        for token in [
            "getMapContainer: () => rendererSurfaceHost.getMapContainer(),",
            "getViewportGroup: () => rendererSurfaceHost.getViewportGroup(),",
            "getGlobal: () => globalThis,",
            "getDevicePixelRatio: () => globalThis.devicePixelRatio,",
            "hasLandFeatures: () => !!runtimeState.landData?.features?.length,",
        ]:
            self.assertIn(token, runtime_context_body)

        for forbidden in [
            "scheduleDeferredWork",
            "cancelDeferredWork",
            "nowMs",
            "recordRenderPerfMetric",
            "effects:",
            "import ",
        ]:
            self.assertNotIn(forbidden, context_content)
        self.assertNotIn("viewport.lifecycle", context_content)
        self.assertNotIn("viewport.effects", context_content)

    def test_viewport_receiver_validates_live_surface_global_and_land_accessors(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        viewport_receiver = get_function_body(renderer_content, "getViewportReceiverContext")

        for token in [
            "const rendererContext = getRenderPassReceiverContext();",
            "RendererRuntimeContext.viewport receiver is required.",
            "rendererContext.viewport.getRuntimeState() !== runtimeState",
            "rendererContext.viewport.getSurfaceHost() !== rendererSurfaceHost",
            "rendererContext.viewport.getMapContainer() !== rendererSurfaceHost.getMapContainer()",
            "rendererContext.viewport.getViewportGroup() !== rendererSurfaceHost.getViewportGroup()",
            "rendererContext.viewport.getGlobal() !== globalThis",
            "rendererContext.viewport.getDevicePixelRatio() !== globalThis.devicePixelRatio",
            "rendererContext.viewport.hasLandFeatures() !== !!runtimeState.landData?.features?.length",
            "return rendererContext;",
        ]:
            self.assertIn(token, viewport_receiver)

    def test_fit_projection_owner_receives_read_dependencies_through_context(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        fit_owner = get_function_body(renderer_content, "getRendererFitProjectionOwner")

        for token in [
            "const rendererContext = getViewportReceiverContext();",
            "const viewportContext = rendererContext.viewport;",
            "const viewportHelpers = viewportContext.helpers;",
            "const runtime = viewportContext.getRuntimeState();",
            "const surfaceHost = viewportContext.getSurfaceHost();",
            "surfaceHost,",
            "state: runtime,",
            "projectionFitPaddingRatio: viewportContext.constants.projectionFitPaddingRatio,",
            "getLogicalCanvasDimensions: viewportHelpers.getLogicalCanvasDimensions,",
            "getRenderableLandFeatures: viewportHelpers.getRenderableLandFeatures,",
        ]:
            self.assertIn(token, fit_owner)

        for forbidden in [
            "surfaceHost: rendererSurfaceHost,",
            "state,",
            "projectionFitPaddingRatio: PROJECTION_FIT_PADDING_RATIO,",
            "      getLogicalCanvasDimensions,\n",
            "      getRenderableLandFeatures,\n",
        ]:
            self.assertNotIn(forbidden, fit_owner)

    def test_viewport_update_owner_uses_context_runtime_and_group_getter(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        update_owner = get_function_body(renderer_content, "getRendererViewportUpdateOwner")
        owner_source = (
            REPO_ROOT / "js" / "core" / "renderer" / "renderer_viewport_update_owner.js"
        ).read_text(encoding="utf-8")

        for token in [
            "const rendererContext = getViewportReceiverContext();",
            "const viewportContext = rendererContext.viewport;",
            "const runtime = viewportContext.getRuntimeState();",
            "getViewportGroup: viewportContext.getViewportGroup,",
            "runtime.zoomTransform = transform;",
            "runtime.hitCanvasDirty = true;",
            "runtime.updateZoomUIFn",
            "drawCanvas();",
        ]:
            self.assertIn(token, update_owner)

        self.assertIn("const getViewportGroup = requireFunction(getters, \"getViewportGroup\", \"getters\");", owner_source)
        self.assertIn("const viewportGroup = getViewportGroup();", owner_source)
        self.assertIn("viewportGroup.attr(\"transform\"", owner_source)
        self.assertNotIn("rendererSurfaceHost.getViewportGroup()", update_owner)
        self.assertNotIn("runtimeState.zoomTransform = transform;", update_owner)
        self.assertNotIn("runtimeState.hitCanvasDirty = true;", update_owner)

    def test_resize_lifecycle_owner_uses_context_runtime_and_viewport_accessors(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        resize_owner = get_function_body(renderer_content, "getViewportResizeLifecycleOwner")

        for token in [
            "const rendererContext = getViewportReceiverContext();",
            "const viewportContext = rendererContext.viewport;",
            "const runtime = viewportContext.getRuntimeState();",
            "state: runtime,",
            "getMapContainer: viewportContext.getMapContainer,",
            "getGlobal: viewportContext.getGlobal,",
            "getDevicePixelRatio: viewportContext.getDevicePixelRatio,",
            "hasLandFeatures: viewportContext.hasLandFeatures,",
            "scheduleDeferredWork,",
            "cancelDeferredWork,",
            "nowMs,",
            "recordRenderPerfMetric,",
        ]:
            self.assertIn(token, resize_owner)

        self.assertNotIn("state,", resize_owner)
        self.assertNotIn("getMapContainer: () => rendererSurfaceHost.getMapContainer()", resize_owner)
        self.assertNotIn("getGlobal: () => globalThis", resize_owner)
        self.assertNotIn("getDevicePixelRatio: () => globalThis.devicePixelRatio", resize_owner)
        self.assertNotIn("hasLandFeatures: () => !!runtimeState.landData?.features?.length", resize_owner)

    def test_public_draw_pass_click_and_state_boundaries_remain_private(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        public_content = PUBLIC_FACADE_JS.read_text(encoding="utf-8")
        allowlist_content = STATE_WRITE_ALLOWLIST.read_text(encoding="utf-8")

        for token in [
            "function drawCanvas()",
            "function renderPassToCache(passName, drawFn, transform, timings)",
            "async function handleClick(event, _interactionContext = null)",
            "dispatchMapClick,",
        ]:
            self.assertIn(token, renderer_content)

        render_pass_body = get_function_body(renderer_content, "renderPassToCache")
        for token in [
            "getRenderPassCacheHostOwner().prepareRenderPassHost({",
            "getRenderPassCommitAccountingOwner().commitRenderPass({",
            "hostSummary: hostResult,",
        ]:
            self.assertIn(token, render_pass_body)

        self.assertNotIn("RendererRuntimeContext", public_content)
        self.assertNotIn("renderer_runtime_context", public_content)
        self.assertNotIn("rendererRuntimeContext", allowlist_content)
        self.assertNotIn("renderer_runtime_context", allowlist_content)


if __name__ == "__main__":
    unittest.main()
