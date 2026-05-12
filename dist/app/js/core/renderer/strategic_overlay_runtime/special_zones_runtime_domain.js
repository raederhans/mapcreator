// Special zone editor runtime mutations.
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
    state.specialZoneEditor.active = false;
    state.specialZoneEditor.vertices = [];
    state.specialZonesOverlayDirty = true;
    updateSpecialZoneEditorUI();
    renderNow();
    return false;
  }

  function retireLegacyDrawState() {
    ensureSpecialZoneEditorState();
    state.specialZoneEditor.active = false;
    state.specialZoneEditor.vertices = [];
    state.specialZonesOverlayDirty = true;
    updateSpecialZoneEditorUI();
    renderNow();
    return true;
  }

  function startSpecialZoneDraw({ zoneType = defaultSpecialZoneType, label = "" } = {}) {
    ensureSpecialZoneEditorState();
    state.specialZoneEditor.active = false;
    state.specialZoneEditor.vertices = [];
    state.specialZoneEditor.zoneType = String(zoneType || defaultSpecialZoneType);
    state.specialZoneEditor.label = String(label || "");
    state.specialZonesOverlayDirty = true;
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
    state.specialZoneEditor.selectedId = String(id || "").trim() || null;
    state.specialZonesOverlayDirty = true;
    updateSpecialZoneEditorUI();
    renderNow();
  }

  function deleteSelectedManualSpecialZone() {
    ensureSpecialZoneEditorState();
    state.specialZoneEditor.selectedId = null;
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
