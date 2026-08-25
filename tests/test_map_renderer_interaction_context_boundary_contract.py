from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
RUNTIME_CONTEXT_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "renderer_runtime_context.js"
CLICK_SELECTION_OWNER_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "click_selection_transaction_owner.js"
PUBLIC_FACADE_JS = REPO_ROOT / "js" / "core" / "map_renderer" / "public.js"
STATE_WRITE_ALLOWLIST = REPO_ROOT / "tools" / "eslint-rules" / "state-writer-allowlist.json"


def slice_between(source, start_marker, end_marker):
    start = source.find(start_marker)
    if start < 0:
        raise AssertionError(f"Expected start marker: {start_marker}")
    end = source.find(end_marker, start + len(start_marker))
    if end < 0:
        raise AssertionError(f"Expected end marker after {start_marker}: {end_marker}")
    return source[start:end]


class MapRendererInteractionContextBoundaryContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        cls.context_content = RUNTIME_CONTEXT_JS.read_text(encoding="utf-8")

    def test_interaction_context_is_a_narrow_read_model(self):
        interaction_model = slice_between(
            self.context_content,
            "function createInteractionReadModel(interaction)",
            "function getCollectionCount(value)",
        )

        for token in [
            '"cloneZoomTransform"',
            '"shouldAllowZoomEvent"',
            '"getRuntimeState"',
            '"getSurfaceHost"',
            '"getD3"',
            '"getInteractionRect"',
            '"getInteractionRectNode"',
            '"getWindow"',
            '"getZoomBehavior"',
            '"getZoomTransform"',
            '"getPendingZoomTransform"',
            '"getZoomGestureStartTransform"',
            '"isZoomRenderScheduled"',
        ]:
            self.assertIn(token, self.context_content)

        for forbidden in [
            "requestAnimationFrame",
            "nowMs",
            "setPendingZoomTransform",
            "scheduleRenderPhaseIdle",
            "dispatchMapClick",
            "handleClick",
            "handlers",
            "effects",
        ]:
            self.assertNotIn(forbidden, interaction_model)

    def test_zoom_owner_reads_through_interaction_receiver_and_keeps_effects_local(self):
        zoom_owner = slice_between(
            self.renderer_content,
            "function getZoomInteractionLifecycleOwner()",
            "function getMapInteractionEventBindingOwner()",
        )

        for token in [
            "const rendererContext = getInteractionReceiverContext();",
            "const interactionContext = rendererContext.interaction;",
            "state: runtime,",
            "minZoomScale: interactionConstants.minZoomScale,",
            "getD3: interactionContext.getD3,",
            "getInteractionRect: interactionContext.getInteractionRect,",
            "getZoomTransform: interactionContext.getZoomTransform,",
            "cloneZoomTransform: interactionHelpers.cloneZoomTransform,",
            "shouldAllowZoomEvent: interactionHelpers.shouldAllowZoomEvent,",
        ]:
            self.assertIn(token, zoom_owner)

        for local_capability in [
            "nowMs,",
            "requestAnimationFrame: (callback) => globalThis.requestAnimationFrame(callback),",
            "effects: {",
            "setPendingZoomTransform:",
            "setZoomRenderScheduled:",
            "scheduleRenderPhaseIdle,",
        ]:
            self.assertIn(local_capability, zoom_owner)

        self.assertNotIn("rendererRuntimeContext:", zoom_owner)

    def test_event_binding_reads_targets_through_context_and_keeps_handlers_local(self):
        binding_owner = slice_between(
            self.renderer_content,
            "function getMapInteractionEventBindingOwner()",
            "function getIntensityFieldMaskOwner()",
        )

        for token in [
            "const rendererContext = getInteractionReceiverContext();",
            "getInteractionRect: interactionContext.getInteractionRect,",
            "getWindow: interactionContext.getWindow,",
            "getInteractionRectNode: interactionContext.getInteractionRectNode,",
            "handlers: {",
            "mapClick: handleClick,",
            "mapDoubleClick: handleDoubleClick,",
            "dispatchMapClick,",
            "dispatchMapDoubleClick,",
            "effects: {",
            "bindMapContainerResizeObserver,",
            "bindBrowserZoomObservers,",
        ]:
            self.assertIn(token, binding_owner)

        self.assertNotIn("rendererRuntimeContext:", binding_owner)

    def test_click_selection_and_public_boundaries_remain_outside_p1_5(self):
        owner_content = CLICK_SELECTION_OWNER_JS.read_text(encoding="utf-8")
        click_handler = slice_between(
            owner_content,
            "async function handleClick(event, _interactionContext = null)",
            "return Object.freeze({ handleClick });",
        )
        public_content = PUBLIC_FACADE_JS.read_text(encoding="utf-8")
        allowlist_content = STATE_WRITE_ALLOWLIST.read_text(encoding="utf-8")

        for token in [
            "getHitFromEvent(event, {",
            'eventType: "click"',
            "captureHistoryState(",
            "commitHistoryEntry({",
            "markDirty(",
        ]:
            self.assertIn(token, click_handler)

        for forbidden in [
            "getInteractionReceiverContext",
            "RendererRuntimeContext",
            "interactionContext.get",
            "runtimeState",
        ]:
            self.assertNotIn(forbidden, click_handler)

        self.assertIn(
            "return getClickSelectionTransactionOwner().handleClick(event, interactionContext);",
            self.renderer_content,
        )

        self.assertNotIn("RendererRuntimeContext", public_content)
        self.assertNotIn("rendererRuntimeContext", allowlist_content)


if __name__ == "__main__":
    unittest.main()
