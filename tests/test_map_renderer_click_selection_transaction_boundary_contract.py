from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
JS_CORE = REPO_ROOT / "js" / "core"
MAP_RENDERER_JS = JS_CORE / "map_renderer.js"
EVENT_BINDING_OWNER_JS = JS_CORE / "renderer" / "map_interaction_event_binding_owner.js"
INTERACTION_FUNNEL_JS = JS_CORE / "interaction_funnel.js"
INTERACTION_HIT_CANDIDATES_JS = JS_CORE / "map_renderer" / "interaction_hit_candidates.js"
HISTORY_MANAGER_JS = JS_CORE / "history_manager.js"
DIRTY_STATE_JS = JS_CORE / "dirty_state.js"
PUBLIC_FACADE_JS = JS_CORE / "map_renderer" / "public.js"
STATE_WRITE_ALLOWLIST = REPO_ROOT / "tools" / "eslint-rules" / "state-writer-allowlist.json"


def slice_between(source, start_marker, end_marker):
    start = source.find(start_marker)
    if start < 0:
        raise AssertionError(f"Expected start marker: {start_marker}")
    end = source.find(end_marker, start + len(start_marker))
    if end < 0:
        raise AssertionError(f"Expected end marker after {start_marker}: {end_marker}")
    return source[start:end]


def direct_state_write(root_name, key_name, suffix):
    return root_name + "." + key_name + suffix


class MapRendererClickSelectionTransactionBoundaryContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.renderer_content = MAP_RENDERER_JS.read_text(encoding="utf-8")
        cls.click_handler = slice_between(
            cls.renderer_content,
            "async function handleClick(event, _interactionContext = null)",
            "async function handleDoubleClick(event, _interactionContext = null)",
        )

    def test_handle_click_owns_initial_and_refreshed_hit_resolution(self):
        for token in [
            "const hit = getHitFromEvent(event, {",
            'eventType: "click"',
            "const id = hit.id;",
            "updateDevSelectedHit(hit);",
            'if (hit.targetType === "special") {',
            "const specialFeature = runtimeState.specialRegionsById.get(id);",
            'if (hit.targetType === "water") {',
            "const waterFeature = runtimeState.waterRegionsById.get(id);",
            "let landHit = hit;",
            "let landId = id;",
            "let feature = runtimeState.landIndex.get(landId);",
            "if (event?.ctrlKey || event?.metaKey) {",
            "if (event?.preventDefault) event.preventDefault();",
            "const changedSelection = toggleFeatureInDevSelection(landId);",
            "syncInspectorCountryToLandSelection(feature, landId, landHit);",
            'noteRenderAction(changedSelection ? "dev-selection-toggle" : "dev-selection-sync", actionStart);',
            "let countryCode = landHit.countryCode || getFeatureCountryCodeNormalized(feature);",
            "if (!(await ensureLeafDetailReady(countryCode, { announce: true }))) {",
            "const refreshedHit = getHitFromEvent(event, {",
            "const refreshedFeature = refreshedId ? runtimeState.landIndex.get(refreshedId) : null;",
            'if (refreshedHit.targetType === "land" && refreshedId && refreshedFeature) {',
            "updateDevSelectedHit(landHit);",
            "const targetIds = resolveInteractionTargetIds(feature, landId);",
        ]:
            self.assertIn(token, self.click_handler)

        for forbidden in [
            "click_selection_transaction_owner",
            "resolveClickSelectionDecision",
            "getClickSelectionTransactionOwner",
        ]:
            self.assertNotIn(forbidden, self.renderer_content)

    def test_handle_click_keeps_history_dirty_sidebar_render_and_metrics_root_owned(self):
        for token in [
            "captureHistoryState({",
            "commitHistoryEntry({",
            'markDirty("erase-water-region-color")',
            'markDirty("erase-sovereignty")',
            'markDirty("erase-country-color")',
            'markDirty("erase-feature-color")',
            'markDirty("fill-sovereignty")',
            'markDirty("fill-country-color")',
            'requestInteractionRender("clear-water-selection-empty-click")',
            'requestInteractionRender("clear-special-selection-empty-click")',
            'requestInteractionRender("select-special-region")',
            'requestInteractionRender("click-erase-water")',
            'requestInteractionRender("click-erase")',
            'requestInteractionRender("click-fill")',
            "refreshWaterRegionSidebarRowsNow(",
            "refreshSpecialRegionSidebarRowsNow(",
            "refreshSidebarAfterPaint(",
            "noteRenderAction(",
            direct_state_write("runtimeState", "selectedWaterRegionId", " = \"\";"),
            direct_state_write("runtimeState", "selectedSpecialRegionId", " = id;"),
        ]:
            self.assertIn(token, self.click_handler)

    def test_history_dirty_and_render_wrappers_keep_existing_owners(self):
        history_content = HISTORY_MANAGER_JS.read_text(encoding="utf-8")
        dirty_content = DIRTY_STATE_JS.read_text(encoding="utf-8")

        for token in [
            'import { captureHistoryState, pushHistoryEntry } from "./history_manager.js";',
            'import { markDirty } from "./dirty_state.js";',
            "function commitHistoryEntry({ kind, before, after, affectsSovereignty = false } = {})",
            "pushHistoryEntry({",
            'function requestInteractionRender(reason = "interaction")',
            "getRenderRequestBoundaryOwner().requestInteractionRenderBoundary(reason).completed;",
        ]:
            self.assertIn(token, self.renderer_content)
        for token in [
            "function captureHistoryState({",
            "function pushHistoryEntry(entry)",
            "function hasHistoryDelta(before, after)",
            "function applyHistorySnapshot(snapshot, direction, entry)",
        ]:
            self.assertIn(token, history_content)
        for token in [
            'function markDirty(reason = "")',
            "markDirtyState(runtimeState, reason);",
            "updateDirtyIndicator();",
        ]:
            self.assertIn(token, dirty_content)

    def test_event_binding_and_funnel_keep_injected_click_dispatch(self):
        event_binding_content = EVENT_BINDING_OWNER_JS.read_text(encoding="utf-8")
        funnel_content = INTERACTION_FUNNEL_JS.read_text(encoding="utf-8")

        for token in [
            'requireFunction(helpers, "bindInteractionFunnel")({',
            'mapClick: requireFunction(handlers, "mapClick")',
            'mapDoubleClick: requireFunction(handlers, "mapDoubleClick")',
            'interactionRect.on("click", requireFunction(handlers, "dispatchMapClick"));',
            'interactionRect.on("dblclick", requireFunction(handlers, "dispatchMapDoubleClick"));',
        ]:
            self.assertIn(token, event_binding_content)
        for token in [
            "let mapClickImpl = null;",
            "export function bindInteractionFunnel({",
            'mapClickImpl = typeof mapClick === "function" ? mapClick : null;',
            "export function dispatchMapClick(event)",
            'debugState.lastClickContext = buildMapInteractionContext("click", event);',
            "return mapClickImpl(event, debugState.lastClickContext);",
        ]:
            self.assertIn(token, funnel_content)

    def test_hit_candidates_remain_pure_and_outside_click_transaction_ownership(self):
        hit_candidates_content = INTERACTION_HIT_CANDIDATES_JS.read_text(encoding="utf-8")

        for token in [
            "runtimeState",
            "state.",
            "document",
            "window",
            "map_renderer.js",
            "handleClick",
            "dispatchMapClick",
            "markDirty",
            "captureHistoryState",
            "pushHistoryEntry",
            "commitHistoryEntry",
            "requestInteractionRender",
            "selectedWaterRegionId",
            "selectedSpecialRegionId",
        ]:
            self.assertNotIn(token, hit_candidates_content)

    def test_owner_public_facade_and_state_allowlist_remain_preflight_only(self):
        public_content = PUBLIC_FACADE_JS.read_text(encoding="utf-8")
        allowlist_content = STATE_WRITE_ALLOWLIST.read_text(encoding="utf-8")
        prohibited_owner_paths = sorted(
            path.relative_to(REPO_ROOT).as_posix()
            for path in JS_CORE.rglob("*.js")
            if "click_selection_transaction" in path.stem.lower()
        )

        self.assertEqual(prohibited_owner_paths, [])
        for token in [
            "click_selection_transaction",
            "renderer_click_selection_transaction",
            "clickSelectionTransaction",
            "resolveClickSelectionDecision",
        ]:
            self.assertNotIn(token, public_content)
            self.assertNotIn(token, allowlist_content)


if __name__ == "__main__":
    unittest.main()
