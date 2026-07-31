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
  const patchEditor = (patch) => patchSpecialZoneEditorState(state, patch, {
    defaultZoneType: defaultSpecialZoneType,
  });
  const markOverlayDirty = () => setSpecialZonesOverlayDirtyState(state, true);

  function appendSpecialZoneVertexFromEvent(event) {
    ensureSpecialZoneEditorState();
    // Legacy freehand special zones have exited the main editing path.
    // Layer membership editing is now handled by the special zones workbench.
    if (event?.preventDefault) event.preventDefault();
    patchEditor({ active: false, vertices: [] });
    markOverlayDirty();
    updateSpecialZoneEditorUI();
    renderNow();
    return false;
  }

  function retireLegacyDrawState() {
    ensureSpecialZoneEditorState();
    patchEditor({ active: false, vertices: [] });
    markOverlayDirty();
    updateSpecialZoneEditorUI();
    renderNow();
    return true;
  }

  function startSpecialZoneDraw({ zoneType = defaultSpecialZoneType, label = "" } = {}) {
    ensureSpecialZoneEditorState();
    patchEditor({
      active: false,
      vertices: [],
      zoneType: String(zoneType || defaultSpecialZoneType),
      label: String(label || ""),
    });
    markOverlayDirty();
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
    patchEditor({ selectedId: String(id || "").trim() || null });
    markOverlayDirty();
    updateSpecialZoneEditorUI();
    renderNow();
  }

  function deleteSelectedManualSpecialZone() {
    ensureSpecialZoneEditorState();
    patchEditor({ selectedId: null });
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
