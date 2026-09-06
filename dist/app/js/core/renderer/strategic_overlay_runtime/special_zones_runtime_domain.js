// Special zone editor runtime mutations.
import {
  patchSpecialZoneEditorState,
  setSpecialZonesOverlayDirtyState,
} from "../../state/actions/special_zone_actions.js";

export function createSpecialZonesRuntimeDomain({
  state,
  defaultSpecialZoneType,
  ensureManualSpecialZoneCounter,
  ensureSpecialZoneEditorState,
  getMapLonLatFromEvent,
  getManualSpecialZoneFeatures,
  renderNow,
  renderSpecialZoneEditorOverlay,
  updateSpecialZoneEditorUI,
}) {
  function appendSpecialZoneVertexFromEvent(event) {
    ensureSpecialZoneEditorState();
    // Legacy freehand special zones have exited the main editing path.
    // Layer membership editing is now handled by the special zones workbench.
    if (event?.preventDefault) event.preventDefault();
    patchSpecialZoneEditorState(state, { active: false, vertices: [] }, {
      defaultZoneType: defaultSpecialZoneType,
    });
    setSpecialZonesOverlayDirtyState(state, true);
    updateSpecialZoneEditorUI();
    renderNow();
    return false;
  }

  function retireLegacyDrawState() {
    ensureSpecialZoneEditorState();
    patchSpecialZoneEditorState(state, { active: false, vertices: [] }, {
      defaultZoneType: defaultSpecialZoneType,
    });
    setSpecialZonesOverlayDirtyState(state, true);
    updateSpecialZoneEditorUI();
    renderNow();
    return true;
  }

  function startSpecialZoneDraw({ zoneType = defaultSpecialZoneType, label = "" } = {}) {
    ensureSpecialZoneEditorState();
    patchSpecialZoneEditorState(state, {
      active: false,
      vertices: [],
      zoneType: String(zoneType || defaultSpecialZoneType),
      label: String(label || ""),
    }, {
      defaultZoneType: defaultSpecialZoneType,
    });
    setSpecialZonesOverlayDirtyState(state, true);
    updateSpecialZoneEditorUI();
    renderNow();
    return false;
  }

  function undoSpecialZoneVertex() {
    retireLegacyDrawState();
  }

  function cancelSpecialZoneDraw() {
    retireLegacyDrawState();
  }

  function finishSpecialZoneDraw() {
    retireLegacyDrawState();
    return false;
  }

  function selectSpecialZoneById(id) {
    ensureSpecialZoneEditorState();
    patchSpecialZoneEditorState(state, { selectedId: String(id || "").trim() || null }, {
      defaultZoneType: defaultSpecialZoneType,
    });
    setSpecialZonesOverlayDirtyState(state, true);
    updateSpecialZoneEditorUI();
    renderNow();
  }

  function deleteSelectedManualSpecialZone() {
    ensureSpecialZoneEditorState();
    patchSpecialZoneEditorState(state, { selectedId: null }, {
      defaultZoneType: defaultSpecialZoneType,
    });
    return false;
  }

  return {
    appendSpecialZoneVertexFromEvent,
    cancelSpecialZoneDraw,
    deleteSelectedManualSpecialZone,
    finishSpecialZoneDraw,
    selectSpecialZoneById,
    startSpecialZoneDraw,
    undoSpecialZoneVertex,
  };
}
