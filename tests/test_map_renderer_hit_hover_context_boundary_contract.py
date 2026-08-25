from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
CLICK_SELECTION_OWNER_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "click_selection_transaction_owner.js"
RUNTIME_CONTEXT_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "renderer_runtime_context.js"
PUBLIC_FACADE_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "public.js"
STATE_WRITE_ALLOWLIST = REPO_ROOT / "tools" / "eslint-rules" / "state-writer-allowlist.json"


HIT_HOVER_ACCESSORS = [
    "hasHitCanvasRuntime",
    "isHitCanvasDirty",
    "isHitCanvasBuildDeferred",
    "getRenderPhase",
    "getScheduledHitCanvasBuildHandle",
    "getActiveScenarioId",
    "hasHoverData",
    "isSpecialZoneEditorActive",
    "isReducedHoverPhase",
    "getHoverIds",
    "hasTooltip",
    "getHoveredFacilityEntry",
    "getFeatureForHit",
]


def slice_between(source, start_marker, end_marker):
    start = source.find(start_marker)
    if start < 0:
        raise AssertionError(f"Expected start marker: {start_marker}")
    end = source.find(end_marker, start + len(start_marker))
    if end < 0:
        raise AssertionError(f"Expected end marker after {start_marker}: {end_marker}")
    return source[start:end]


class MapRendererHitHoverContextBoundaryContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        cls.context_content = RUNTIME_CONTEXT_JS.read_text(encoding="utf-8")

    def test_hit_hover_context_is_an_exact_readonly_capsule(self):
        hit_hover_model = slice_between(
            self.context_content,
            "function createInteractionHitHoverReadModel(hitHover)",
            "function createInteractionReadModel(interaction)",
        )

        for token in [
            '"renderPhaseIdle"',
            '"hoverSnapPx"',
        ]:
            self.assertIn(token, hit_hover_model)
        for accessor_name in HIT_HOVER_ACCESSORS:
            self.assertIn(f'"{accessor_name}"', self.context_content)
            self.assertIn(
                f"{accessor_name}: hitHoverAccessors.{accessor_name},",
                hit_hover_model,
            )

        for forbidden in [
            "helpers:",
            "effects:",
            "handlers:",
            "nowMs",
            "getLastMouseMoveTime",
            "getMouseThrottleMs",
            "inspectHgoRuntimePreviewFromEvent",
            "getHitFromEvent",
            "getHoveredFacilityEntryFromEvent",
            "isFacilityDetailsSurfaceActive",
            "getHoveredCityTooltipEntry",
            "getTooltipTextForFeature",
            "scheduleDeferredWork",
            "cancelDeferredWork",
            "setScheduledHitCanvasBuildHandle",
            "runScheduledHitCanvasBuild",
            "recordRenderPerfMetric",
            "setHoverIds",
            "queueTooltipUpdate",
            "setMapInteractionCursor",
            "dispatchMapClick",
        ]:
            self.assertNotIn(forbidden, hit_hover_model)

    def test_composition_root_assembles_live_reads_and_receiver_does_not_invoke_them(self):
        runtime_context_factory = slice_between(
            self.renderer_content,
            "function getRendererRuntimeContext()",
            "function getRenderPassReceiverContext()",
        )
        interaction_receiver = slice_between(
            self.renderer_content,
            "function getInteractionReceiverContext()",
            "function getRendererSurfaceLifecycleOwner()",
        )

        for token in [
            "hitHover: {",
            "renderPhaseIdle: RENDER_PHASE_IDLE,",
            "hoverSnapPx: HIT_SNAP_RADIUS_HOVER_PX,",
            "hasHitCanvasRuntime: () => Boolean(rendererSurfaceHost.getHitContext() && rendererSurfaceHost.getPathHitCanvas()),",
            "isHitCanvasDirty: () => Boolean(runtimeState.hitCanvasDirty),",
            "isHitCanvasBuildDeferred: () => Boolean(runtimeState.deferHitCanvasBuild),",
            "getRenderPhase: () => runtimeState.renderPhase,",
            "getScheduledHitCanvasBuildHandle: () => runtimeState.hitCanvasBuildScheduled,",
            "getActiveScenarioId: () => runtimeState.activeScenarioId,",
            "hasHoverData: () => Boolean(runtimeState.landData || runtimeState.waterRegionsData || runtimeState.scenarioSpecialRegionsData),",
            "isSpecialZoneEditorActive: () => Boolean(runtimeState.specialZoneEditor?.active),",
            "getHoverIds: () => ({",
            "hasTooltip: () => Boolean(rendererSurfaceHost.getTooltip()),",
            "getHoveredFacilityEntry: () => hoveredFacilityEntry,",
            "getFeatureForHit: (hit) => {",
        ]:
            self.assertIn(token, runtime_context_factory)

        self.assertIn("const hitHoverContext = interactionContext.hitHover;", interaction_receiver)
        self.assertIn(
            "RendererRuntimeContext.interaction.hitHover receiver is required.",
            interaction_receiver,
        )
        for accessor_name in HIT_HOVER_ACCESSORS:
            self.assertNotIn(f"hitHoverContext.{accessor_name}()", interaction_receiver)

    def test_hit_canvas_owner_reads_capsule_and_retains_root_scheduling(self):
        owner_factory = slice_between(
            self.renderer_content,
            "function getHitCanvasSchedulingOwner()",
            "function getRendererTransactionResetOwner()",
        )

        for token in [
            "const rendererContext = getInteractionReceiverContext();",
            "const hitHoverContext = rendererContext.interaction.hitHover;",
            "renderPhaseIdle: hitHoverContext.constants.renderPhaseIdle,",
            "idleTimeoutMs: STAGED_HIT_CANVAS_TIMEOUT_MS,",
            "hasHitCanvasRuntime: hitHoverContext.hasHitCanvasRuntime,",
            "isHitCanvasDirty: hitHoverContext.isHitCanvasDirty,",
            "isHitCanvasBuildDeferred: hitHoverContext.isHitCanvasBuildDeferred,",
            "getRenderPhase: hitHoverContext.getRenderPhase,",
            "getScheduledHitCanvasBuildHandle: hitHoverContext.getScheduledHitCanvasBuildHandle,",
            "getActiveScenarioId: hitHoverContext.getActiveScenarioId,",
            "scheduleDeferredWork,",
            "cancelDeferredWork,",
            "setScheduledHitCanvasBuildHandle: (handle) => {",
            "runtimeState.hitCanvasBuildScheduled = handle;",
            "runScheduledHitCanvasBuild: (details) => drawScheduledHitCanvasWithMetric(details),",
        ]:
            self.assertIn(token, owner_factory)

        for forbidden in [
            "renderPhaseIdle: RENDER_PHASE_IDLE,",
            "hasHitCanvasRuntime: () =>",
            "isHitCanvasDirty: () =>",
            "isHitCanvasBuildDeferred: () =>",
            "getRenderPhase: () =>",
            "getScheduledHitCanvasBuildHandle: () =>",
            "getActiveScenarioId: () =>",
            "rendererRuntimeContext:",
        ]:
            self.assertNotIn(forbidden, owner_factory)

    def test_hover_owner_reads_capsule_and_retains_event_ui_and_effect_dependencies(self):
        owner_factory = slice_between(
            self.renderer_content,
            "function getMapHoverInteractionOwner()",
            "function getVisibleFrameDiagnosticsOwner()",
        )

        for token in [
            "const rendererContext = getInteractionReceiverContext();",
            "const hitHoverContext = rendererContext.interaction.hitHover;",
            "hoverSnapPx: hitHoverContext.constants.hoverSnapPx,",
            "hasHoverData: hitHoverContext.hasHoverData,",
            "isSpecialZoneEditorActive: hitHoverContext.isSpecialZoneEditorActive,",
            "isReducedHoverPhase: hitHoverContext.isReducedHoverPhase,",
            "getHoverIds: hitHoverContext.getHoverIds,",
            "hasTooltip: hitHoverContext.hasTooltip,",
            "getHoveredFacilityEntry: hitHoverContext.getHoveredFacilityEntry,",
            "getFeatureForHit: hitHoverContext.getFeatureForHit,",
            "nowMs: () => performance.now(),",
            "getLastMouseMoveTime: () => runtimeState.lastMouseMoveTime,",
            "getMouseThrottleMs: () => runtimeState.MOUSE_THROTTLE_MS,",
            "inspectHgoRuntimePreviewFromEvent,",
            "getHitFromEvent,",
            "getHoveredFacilityEntryFromEvent,",
            "isFacilityDetailsSurfaceActive,",
            "getHoveredCityTooltipEntry,",
            "getTooltipTextForFeature: (feature) => getTooltipText(feature),",
            "effects: {",
            "scheduleHoverOverlayRender,",
            "queueTooltipUpdate,",
            "setMapInteractionCursor,",
            "clearUnderlyingHoverForFacilityEntry,",
            "getFacilityKey: buildFacilityEntryKey,",
        ]:
            self.assertIn(token, owner_factory)

        for forbidden in [
            "hoverSnapPx: HIT_SNAP_RADIUS_HOVER_PX,",
            "hasHoverData: () =>",
            "isSpecialZoneEditorActive: () =>",
            "isReducedHoverPhase: () =>",
            "getHoverIds: () =>",
            "hasTooltip: () =>",
            "getHoveredFacilityEntry: () =>",
            "getFeatureForHit: (hit) =>",
            "rendererRuntimeContext:",
        ]:
            self.assertNotIn(forbidden, owner_factory)

    def test_click_transaction_is_owner_owned_with_one_private_root_facade(self):
        click_facade = slice_between(
            self.renderer_content,
            "async function handleClick(event, interactionContext = null)",
            "async function handleDoubleClick(event, _interactionContext = null)",
        )
        owner_content = CLICK_SELECTION_OWNER_JS.read_text(encoding="utf-8")
        click_handler = slice_between(
            owner_content,
            "async function handleClick(event, _interactionContext = null)",
            "return Object.freeze({ handleClick });",
        )
        public_content = PUBLIC_FACADE_JS.read_text(encoding="utf-8")
        allowlist_content = STATE_WRITE_ALLOWLIST.read_text(encoding="utf-8")

        self.assertEqual(
            click_facade.strip(),
            "async function handleClick(event, interactionContext = null) {\n"
            "  return getClickSelectionTransactionOwner().handleClick(event, interactionContext);\n"
            "}",
        )
        self.assertEqual(self.renderer_content.count(".handleClick(event, interactionContext)"), 1)
        for token in [
            "getHitFromEvent(event, {",
            'eventType: "click"',
            "captureHistoryState(",
            "commitHistoryEntry({",
            "markDirty(",
        ]:
            self.assertIn(token, click_handler)
        self.assertNotIn("hitHoverContext", click_handler)
        self.assertNotIn("runtimeState", click_handler)
        self.assertNotIn("RendererRuntimeContext", public_content)
        self.assertNotIn("rendererRuntimeContext", allowlist_content)


if __name__ == "__main__":
    unittest.main()
