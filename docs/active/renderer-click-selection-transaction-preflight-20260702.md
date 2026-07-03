# Renderer Click Selection Transaction Preflight 2026-07-02

## Scope and guardrails

P54 is preflight only. No production runtime changes.

This inventory locks the current map click, selection, fill, water, special region, and dev workspace interaction transactions before any owner extraction. The write set is limited to this document, one static inventory test, `package.json`, `tools/check_architecture_boundaries.mjs`, and the worktree registry.

Current baseline:

- P51 render pass cache host owner landed at `725abb4a305a03687e7bca358ff918ba659cfef1`.
- P52 render pass commit/accounting owner landed at `c60fd9239f8352b1916686b6dac8ee16eee8f017`.
- P53 drawCanvas orchestration preflight landed at `24ab1264a9bb89e0c3f4b8b6cb26700592257edd`; registry closeout landed at `7e503bb3b9596b5066f3e845f28c539c810fd735`.

P54 must not add a click selection transaction owner, helper, controller, or adapter. P54 must not modify `js/core/map_renderer.js`, `js/core/map_renderer/public.js`, `tools/eslint-rules/state-writer-allowlist.json`, or `dist/**`.

## Current P48 hover interaction baseline

P48 moved hover orchestration only. `js/core/map_renderer/map_hover_interaction_owner.js` owns `handleMouseMove(event)` orchestration through injected getters/effects/helpers. It updates hover ids, dev hover hit, facility/city/feature tooltip state, cursor state, and hover overlay scheduling.

P48 does not own click, double-click, selection, fill, brush, physical intensity, water selection, special region selection, land fill, sovereignty fill, or dev selection transactions.

The current guardrail remains:

- `map_hover_interaction_owner.js` must keep `function handleMouseMove(event)`.
- `map_hover_interaction_owner.js` must not contain `handleClick`, `dispatchMapClick`, `selectedWaterRegionId`, `selectedSpecialRegionId`, `markDirty`, `commitHistoryEntry`, or `pushHistoryEntry`.

## Click entry and event binding inventory

The click handler function remains in `js/core/map_renderer.js` as `async function handleClick(event, _interactionContext = null)`.

`js/core/renderer/map_interaction_event_binding_owner.js` remains a binding owner only. It receives handlers by injection, passes `mapClick` and `mapDoubleClick` to `bindInteractionFunnel`, and binds DOM events to injected dispatchers:

- `mapClick: handleClick` is injected from `map_renderer.js`.
- `mapDoubleClick: handleDoubleClick` is injected from `map_renderer.js`.
- `interactionRect.on("click", requireFunction(handlers, "dispatchMapClick"));`
- `interactionRect.on("dblclick", requireFunction(handlers, "dispatchMapDoubleClick"));`

`js/core/interaction_funnel.js` keeps the dispatch bridge. It stores the injected `mapClickImpl`, records the click debug context, and calls the injected function from `dispatchMapClick(event)`.

## Land click transaction inventory

Land click transaction logic remains in `map_renderer.js`.

Current anchors:

- `getHitFromEvent(event, { enableSnap: true, snapPx: HIT_SNAP_RADIUS_CLICK_PX, eventType: "click" })` resolves the canonical land/water/special hit.
- Land clicks clear `runtimeState.selectedWaterRegionId` and `runtimeState.selectedSpecialRegionId`.
- `updateDevSelectedHit(hit)` runs before land branch work.
- `event.ctrlKey || event.metaKey` toggles dev selection through `toggleFeatureInDevSelection(landId)` and syncs inspector selection.
- `ensureLeafDetailReady(countryCode, { announce: true })` gates detailed land transactions.
- Land eraser uses `captureHistoryState`, `markDirty`, `commitHistoryEntry`, and `requestInteractionRender("click-erase")`.
- Land fill uses sovereignty, country-color, or subdivision paths and ends with `requestInteractionRender("click-fill")` or `applyVisualSubdivisionFill(...)`.
- Subdivision fill remains in `applyVisualSubdivisionFill(...)`, which owns `captureHistoryState`, `markDirty`, `commitHistoryEntry`, `addRecentColor`, `requestInteractionRender(kind)`, and sidebar refresh for visual feature overrides.

## Water click transaction inventory

Water click transaction logic remains in `map_renderer.js`.

Current anchors:

- `if (hit.targetType === "water")` remains inside `handleClick`.
- Water click clears `runtimeState.selectedSpecialRegionId`.
- Ctrl/meta click toggles `runtimeState.selectedWaterRegionId` with `water-selection-toggle-off` and `water-selection-toggle-on`.
- Macro open ocean selection stays selection-only through `click-select-open-ocean` when open ocean paint is disabled.
- Water eraser uses `captureHistoryState({ waterRegionIds: [id] })`, deletes `runtimeState.waterRegionOverrides[id]`, calls `markDirty("erase-water-region-color")`, commits history, calls `requestInteractionRender("click-erase-water")`, and refreshes sidebar rows.
- Water eyedropper updates `runtimeState.selectedColor` and calls `requestInteractionRender("eyedropper-water")`.
- Water fill remains in `applyWaterRegionFill(...)`, which owns selected water id, `waterRegionOverrides`, history, dirty state, recent color, `requestInteractionRender(kind)`, and sidebar refresh.

## Special region click transaction inventory

Special region click transaction logic remains in `map_renderer.js`.

Current anchors:

- `if (hit.targetType === "special")` remains inside `handleClick`.
- Special click clears `runtimeState.selectedWaterRegionId`.
- Special click sets `runtimeState.selectedSpecialRegionId = id`.
- Special click refreshes water and special region sidebar rows.
- Special selection calls `requestInteractionRender("select-special-region")`.
- Special eyedropper updates `runtimeState.selectedColor` through `getSpecialRegionColor(id, specialFeature)` and updates the swatch UI.

Special region click currently selects or eyedrops. It does not own an independent special-region fill transaction in `handleClick`.

## Dev selection and fill inventory

Dev selection and fill remain in `map_renderer.js` and existing UI owners.

Current anchors in `map_renderer.js`:

- `updateDevSelectedHit(hit)`
- `addFeatureToDevSelection(featureId)`
- `toggleFeatureInDevSelection(featureId)`
- `removeLastDevSelection()`
- `clearDevSelection()`
- `applyDevMacroFillCurrentCountry()`
- `applyDevMacroFillCurrentParentGroup()`
- `applyDevMacroFillCurrentOwnerScope()`
- `applyDevSelectionFill()`

The public facade already exposes the dev workspace selection/fill methods from `js/core/map_renderer/public.js`. P54 does not change that facade.

`tests/dev_workspace_selection_ownership_behavior.test.mjs` covers the existing UI owner path where the quickbar remove action reuses the selection clipboard toggle. That UI owner remains separate from the map click transaction.

## History/dirty/render refresh inventory

Click and fill transactions currently call the existing history, dirty-state, and render refresh paths:

- `captureHistoryState(...)` from `js/core/history_manager.js`
- `pushHistoryEntry(...)` through local `commitHistoryEntry(...)` in `map_renderer.js`
- `markDirty(...)` from `js/core/dirty_state.js`
- `requestInteractionRender(...)` through the P41 render request boundary owner
- `requestRendererRender(...)` for brush stroke flush
- `refreshSidebarAfterPaint(...)`, `refreshWaterRegionSidebarRowsNow(...)`, and `refreshSpecialRegionSidebarRowsNow(...)` for UI list refresh

These calls remain in current paths for P54.

## Scenario detail readiness boundary

Detailed land interaction readiness remains inside `map_renderer.js`:

- `shouldRequireLeafDetail(countryCode)`
- `hasLeafDetailReady(countryCode)`
- `requestLeafDetailPromotion(countryCode, { announce })`
- `ensureLeafDetailReady(countryCode, { announce })`

Land click waits for `ensureLeafDetailReady(...)` and may re-run `getHitFromEvent(...)` after detail promotion before applying selection or fill work.

## P55/P56 allowed first move

The first implementation should probably extract water/special selection clearing or the dev-selection click transaction only.

Good first candidates:

- A water/special selection clearing helper that receives current ids and injected effects, then delegates current sidebar/render refresh calls.
- A dev-selection click transaction owner for ctrl/meta land click that only handles `toggleFeatureInDevSelection(...)`, `syncInspectorCountryToLandSelection(...)`, and `noteRenderAction(...)` through injected dependencies.

Do not combine land fill, sovereignty, water fill, special region, and dev selection in one owner.

## Forbidden areas

P54 forbids:

- Adding `js/core/map_renderer/click_selection_transaction_owner.js` or a renamed equivalent.
- Adding click-selection transaction owner/helper/controller/adapter files under `js/core/**`.
- Moving `async function handleClick(event, _interactionContext = null)` out of `map_renderer.js`.
- Moving land, water, or special click branches out of `map_renderer.js`.
- Moving dev selection/fill functions out of `map_renderer.js` during this preflight.
- Changing `js/core/map_renderer/public.js`.
- Changing `tools/eslint-rules/state-writer-allowlist.json`.
- Changing `dist/**`.
- Broadening `map_hover_interaction_owner.js` into click/selection ownership.
- Making `interaction_hit_candidates.js` own dirty state, history, render refresh, runtime state, DOM, or map renderer imports.

## Required validation commands

Run:

```bash
node --check tests/renderer_click_selection_transaction_inventory_boundary.test.mjs
node --check tools/check_architecture_boundaries.mjs
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
npm run test:node:renderer-click-selection-transaction-inventory
npm run test:node:map-hover-interaction
npm run test:node:map-interaction-event-binding-owner
npm run test:node:interaction-hit-candidates
npm run test:node:dev-workspace-selection-ownership
npm run verify:architecture-boundaries
npm run verify:test-import-graph
npm run verify:state-write-allowlist
git diff --check
```
