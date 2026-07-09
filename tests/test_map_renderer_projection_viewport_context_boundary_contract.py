from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RUNTIME_CONTEXT_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "renderer_runtime_context.js"
PUBLIC_FACADE_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "public.js"


def get_function_body(source, function_name):
    match = re.search(
        rf"function {re.escape(function_name)}\(\) \{{(?P<body>[\s\S]*?)\n\}}",
        source,
    )
    if match is None:
        raise AssertionError(f"Expected function {function_name} to exist")
    return match.group("body")


class MapRendererProjectionViewportContextBoundaryContractTest(unittest.TestCase):
    def test_projection_and_viewport_context_sections_are_read_models(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        context_content = RUNTIME_CONTEXT_JS.read_text(encoding="utf-8")
        public_content = PUBLIC_FACADE_JS.read_text(encoding="utf-8")
        runtime_context_body = get_function_body(renderer_content, "getRendererRuntimeContext")

        self.assertIn('"viewport"', context_content)
        self.assertIn("function createProjectionReadModel(projection)", context_content)
        self.assertIn("function createViewportReadModel(viewport, runtimeState, rendererSurfaceHost)", context_content)
        self.assertIn("projection: createProjectionReadModel(projection),", context_content)
        self.assertIn("viewport: createViewportReadModel(viewport, runtimeState, rendererSurfaceHost),", context_content)
        self.assertIn("projectionPrecision: readFiniteNumber", context_content)
        self.assertIn("pathPointRadius: readFiniteNumber", context_content)
        self.assertIn("minZoomScale must be less than maxZoomScale", context_content)
        self.assertIn("describeProjectionContext(context.projection)", context_content)
        self.assertIn("describeViewportContext(context.viewport)", context_content)

        for token in [
            "projection: {",
            "viewport: {",
            "projectionPrecision: PROJECTION_PRECISION,",
            "pathPointRadius: PATH_POINT_RADIUS,",
            "mapPanPaddingPx: MAP_PAN_PADDING_PX,",
            "minZoomScale: MIN_ZOOM_SCALE,",
            "maxZoomScale: MAX_ZOOM_SCALE,",
            "getRuntimeState: () => runtimeState,",
            "getSurfaceHost: () => rendererSurfaceHost,",
            "getZoomBehavior: () => rendererSurfaceHost.getZoomBehavior(),",
            "getInteractionRect: () => rendererSurfaceHost.getInteractionRect(),",
        ]:
            self.assertIn(token, runtime_context_body)

        for forbidden in [
            "setProjection:",
            "setPathSvg:",
            "setPathCanvas:",
            "setPathHitCanvas:",
        ]:
            self.assertNotIn(forbidden, runtime_context_body)

        self.assertNotIn("RendererRuntimeContext", public_content)
        self.assertNotIn("renderer_runtime_context", public_content)

    def test_projection_and_viewport_receivers_only_assemble_context(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        projection_receiver = get_function_body(renderer_content, "getProjectionReceiverContext")
        viewport_receiver = get_function_body(renderer_content, "getViewportReceiverContext")

        self.assertIn("const rendererContext = getRenderPassReceiverContext();", projection_receiver)
        self.assertIn("RendererRuntimeContext.projection receiver is required.", projection_receiver)
        self.assertIn("rendererContext.projection.getProjection() !== rendererSurfaceHost.getProjection()", projection_receiver)
        self.assertIn("rendererContext.projection.getPathSvg() !== rendererSurfaceHost.getPathSvg()", projection_receiver)
        self.assertIn("rendererContext.projection.getPathCanvas() !== rendererSurfaceHost.getPathCanvas()", projection_receiver)
        self.assertIn("rendererContext.projection.getPathHitCanvas() !== rendererSurfaceHost.getPathHitCanvas()", projection_receiver)
        self.assertIn("rendererContext.projection.getContext() !== rendererSurfaceHost.getContext()", projection_receiver)
        self.assertIn("rendererContext.projection.getHitContext() !== rendererSurfaceHost.getHitContext()", projection_receiver)
        self.assertIn("return rendererContext;", projection_receiver)
        self.assertIn("const rendererContext = getRenderPassReceiverContext();", viewport_receiver)
        self.assertIn("RendererRuntimeContext.viewport receiver is required.", viewport_receiver)
        self.assertIn("rendererContext.viewport.getRuntimeState() !== runtimeState", viewport_receiver)
        self.assertIn("rendererContext.viewport.getSurfaceHost() !== rendererSurfaceHost", viewport_receiver)
        self.assertIn("return rendererContext;", viewport_receiver)

        forbidden_tokens = [
            "globalThis.",
            "setProjection",
            "setPath",
            "setZoomTransform",
            "createRendererProjectionPathOwner",
            "createViewportReadModelOwner",
            "createViewportCommandOwner",
        ]
        receiver_text = f"{projection_receiver}\n{viewport_receiver}"
        for token in forbidden_tokens:
            self.assertNotIn(token, receiver_text)

    def test_three_owner_construction_paths_consume_projection_or_viewport_context(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        projection_owner = get_function_body(renderer_content, "getRendererProjectionPathOwner")
        viewport_read_owner = get_function_body(renderer_content, "getViewportReadModelOwner")
        viewport_command_owner = get_function_body(renderer_content, "getViewportCommandOwner")

        self.assertIn("const rendererContext = getProjectionReceiverContext();", projection_owner)
        self.assertIn("const projectionContext = rendererContext.projection;", projection_owner)
        self.assertIn("surfaceHost: rendererContext.surface.host,", projection_owner)
        self.assertIn("getD3: projectionContext.helpers.getD3,", projection_owner)
        self.assertIn("projectionPrecision: projectionContext.constants.projectionPrecision,", projection_owner)
        self.assertIn("pathPointRadius: projectionContext.constants.pathPointRadius,", projection_owner)
        self.assertNotIn("surfaceHost: rendererSurfaceHost,", projection_owner)
        self.assertNotIn("getD3: () => globalThis.d3,", projection_owner)

        for owner_body, create_token in [
            (viewport_read_owner, "viewportReadModelOwner = createViewportReadModelOwner({"),
            (viewport_command_owner, "viewportCommandOwner = createViewportCommandOwner({"),
        ]:
            self.assertIn("const rendererContext = getViewportReceiverContext();", owner_body)
            self.assertIn("const viewportContext = rendererContext.viewport;", owner_body)
            self.assertIn("const viewportConstants = viewportContext.constants;", owner_body)
            self.assertIn("const viewportHelpers = viewportContext.helpers;", owner_body)
            self.assertIn("const runtime = viewportContext.getRuntimeState();", owner_body)
            self.assertIn("state: runtime,", owner_body)
            self.assertIn(create_token, owner_body)
            self.assertNotIn("state,", owner_body)
            self.assertNotIn("rendererRuntimeContext:", owner_body)

        self.assertIn("getProjection: () => viewportContext.getProjection(),", viewport_read_owner)
        self.assertIn("getPathSvg: () => viewportContext.getPathSvg(),", viewport_read_owner)
        self.assertIn("getLogicalCanvasDimensions: viewportHelpers.getLogicalCanvasDimensions,", viewport_read_owner)
        self.assertIn("getRenderableLandFeatures: viewportHelpers.getRenderableLandFeatures,", viewport_read_owner)
        self.assertNotIn("getProjection: () => rendererSurfaceHost.getProjection(),", viewport_read_owner)

        self.assertIn("minZoomScale: viewportConstants.minZoomScale,", viewport_command_owner)
        self.assertIn("maxZoomScale: viewportConstants.maxZoomScale,", viewport_command_owner)
        self.assertIn("getZoomBehavior: () => viewportContext.getZoomBehavior(),", viewport_command_owner)
        self.assertIn("getInteractionRect: () => viewportContext.getInteractionRect(),", viewport_command_owner)
        self.assertIn("getD3: viewportHelpers.getD3,", viewport_command_owner)
        self.assertIn("calculatePanExtent,", viewport_command_owner)
        self.assertIn("getCenteredFitZoomTransform,", viewport_command_owner)
        self.assertIn("runtime.zoomTransform = transform;", viewport_command_owner)
        self.assertNotIn("MIN_ZOOM_SCALE", viewport_command_owner)
        self.assertNotIn("MAX_ZOOM_SCALE", viewport_command_owner)
        self.assertNotIn("runtimeState.zoomTransform = transform;", viewport_command_owner)

    def test_context_migration_does_not_cross_global_or_public_boundaries(self):
        renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        context_content = RUNTIME_CONTEXT_JS.read_text(encoding="utf-8")

        self.assertNotIn("globalThis.rendererRuntimeContext", renderer_content)
        self.assertNotIn("runtimeState.rendererRuntimeContext", renderer_content)
        self.assertNotIn("import ", context_content)
        self.assertNotIn("globalThis", context_content)
        self.assertNotIn("rendererSurfaceHost.set", context_content)


if __name__ == "__main__":
    unittest.main()
