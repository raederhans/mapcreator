import {
  STATE_BUS_EVENTS,
  ensureScenarioAuditUiState as ensureScenarioAuditUiStateCatalog,
  emitStateBusEvent,
} from "./state/index.js";
import { state as runtimeState } from "./state.js";
import { flushRenderBoundary } from "./render_boundary.js";

export function ensureScenarioAuditUiState() {
  return ensureScenarioAuditUiStateCatalog(runtimeState);
}

export function setScenarioAuditUiState(partial = {}) {
  const current = ensureScenarioAuditUiState();
  Object.assign(current, partial);
  return current;
}

export function syncScenarioUi() {
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_SCENARIO_UI);
  emitStateBusEvent(STATE_BUS_EVENTS.RENDER_SCENARIO_AUDIT_PANEL);
}

export function syncCountryUi({ renderNow = false } = {}) {
  emitStateBusEvent(STATE_BUS_EVENTS.RENDER_COUNTRY_LIST);
  emitStateBusEvent(STATE_BUS_EVENTS.RENDER_PRESET_TREE);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_ACTIVE_SOVEREIGN_UI);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_DYNAMIC_BORDER_STATUS);
  emitStateBusEvent(STATE_BUS_EVENTS.UPDATE_SCENARIO_CONTEXT_BAR);
  syncScenarioUi();
  if (renderNow) {
    flushRenderBoundary("scenario-country-ui");
  }
}
