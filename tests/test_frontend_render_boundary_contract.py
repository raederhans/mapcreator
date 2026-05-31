from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]


class FrontendRenderBoundaryContractTest(unittest.TestCase):
    def test_mainline_modules_do_not_directly_call_render_now(self):
        targets = [
            REPO_ROOT / "js" / "main.js",
            REPO_ROOT / "js" / "ui" / "sidebar.js",
            REPO_ROOT / "js" / "core" / "map_renderer.js",
            REPO_ROOT / "js" / "ui" / "dev_workspace.js",
            REPO_ROOT / "js" / "core" / "scenario_ownership_editor.js",
            REPO_ROOT / "js" / "core" / "history_manager.js",
            REPO_ROOT / "js" / "ui" / "shortcuts.js",
        ]

        offenders = []
        needle = "state.renderNowFn("
        for path in targets:
            content = path.read_text(encoding="utf-8")
            if needle in content:
                offenders.append(path.relative_to(REPO_ROOT).as_posix())

        self.assertEqual(
            offenders,
            [],
            msg=f"Direct renderNowFn calls reappeared in mainline modules: {', '.join(offenders)}",
        )

    def test_scenario_ownership_editor_uses_request_boundary(self):
        content = (REPO_ROOT / "js" / "core" / "scenario_ownership_editor.js").read_text(encoding="utf-8")
        self.assertNotIn('from "./render_boundary.js"', content)
        self.assertNotIn("flushRenderBoundary", content)
        self.assertIn("requestInteractionRender", content)
        self.assertIn("return requestInteractionRender(reason);", content)

    def test_render_boundary_reasons_survive_until_render_perf_snapshot(self):
        boundary = (REPO_ROOT / "js" / "core" / "render_boundary.js").read_text(encoding="utf-8")
        renderer = (REPO_ROOT / "js" / "core" / "map_renderer.js").read_text(encoding="utf-8")
        main_js = (REPO_ROOT / "js" / "main.js").read_text(encoding="utf-8")
        self.assertIn("lastScheduledReasons", boundary)
        self.assertIn("markRenderBoundaryFlushed", boundary)
        self.assertIn('recordRenderPerfMetric("renderBoundaryReasons", 0, getRenderBoundaryDebugState())', renderer)
        self.assertIn("markRenderBoundaryFlushed();", main_js)

    def test_map_container_resize_observer_keeps_stage_resize_centered(self):
        for renderer_path in (
            REPO_ROOT / "js" / "core" / "map_renderer.js",
            REPO_ROOT / "dist" / "app" / "js" / "core" / "map_renderer.js",
        ):
            content = renderer_path.read_text(encoding="utf-8")
            with self.subTest(renderer=renderer_path.relative_to(REPO_ROOT).as_posix()):
                self.assertIn("let mapContainerResizeObserver = null;", content)
                self.assertIn("let pendingMapResizeReason = \"\";", content)
                self.assertIn("let browserPixelRatioMediaQuery = null;", content)
                self.assertIn("function bindMapContainerResizeObserver()", content)
                self.assertIn("function shouldPreferFullResizeReason(currentReason, nextReason)", content)
                self.assertIn("function bindBrowserPixelRatioObserver()", content)
                self.assertIn("function bindVisualViewportResizeObserver()", content)
                self.assertIn("function bindBrowserZoomObservers()", content)
                self.assertIn("function handleBrowserPixelRatioRefresh(reason = \"browser-dpr-change\")", content)
                self.assertIn("new globalThis.ResizeObserver", content)
                self.assertIn('requestMapContainerResizeSync("map-container-resize");', content)
                self.assertIn('requestMapContainerResizeSync("browser-dpr-change");', content)
                self.assertIn('requestMapContainerResizeSync("visual-viewport-resize");', content)
                self.assertIn('if (resizeReason === "browser-dpr-change")', content)
                self.assertIn('if (pendingReason === "browser-dpr-change")', content)
                self.assertIn("pendingMapResizeReason = resizeReason;", content)
                self.assertIn("shouldPreferFullResizeReason(pendingMapResizeReason, resizeReason)", content)
                self.assertIn("handleBrowserPixelRatioRefresh(pendingReason);", content)
                self.assertIn("globalThis.matchMedia(getDevicePixelRatioMediaQuery())", content)
                self.assertIn('browserPixelRatioMediaQuery.removeEventListener("change", browserPixelRatioMediaQueryHandler);', content)
                self.assertIn('mediaQuery.addEventListener("change", handleBrowserPixelRatioChange);', content)
                self.assertIn('viewport.addEventListener("resize", visualViewportResizeHandler, { passive: true });', content)
                self.assertIn("forceDprInvalidation = false", content)
                self.assertIn("forceDprInvalidation || Math.abs(previousDpr - runtimeState.dpr) >= 0.01", content)
                self.assertIn("mapContainerResizeObserver.observe(mapContainer);", content)
                self.assertIn("let resizeSpatialRefreshHandle = null;", content)
                self.assertIn('window.addEventListener("mapcreator:sidebar-layout-start", handleSidebarLayoutStart);', content)
                self.assertIn('window.addEventListener("mapcreator:sidebar-layout-refresh", () => handleResize("sidebar-layout-refresh"));', content)
                self.assertIn("function getProjectedRenderableContentBounds()", content)
                self.assertIn("function getCenteredFitZoomTransform({ centerX = true, centerY = false } = {})", content)
                self.assertIn("const layoutSizeChangedDuringPhase = interactiveLayoutResize && (", content)
                self.assertIn("centerContent: interactiveLayoutResize", content)
                self.assertIn("fitProjection({ skipSpatialIndex: interactiveLayoutResize });", content)
                self.assertIn("scheduleResizeSpatialRefresh(resizeReason);", content)
                self.assertIn("bindBrowserZoomObservers();", content)


if __name__ == "__main__":
    unittest.main()
