// Operation graphic runtime mutations.
export function createOperationGraphicsRuntimeDomain({
  state,
  defaultOperationGraphicKind,
  captureHistoryState,
  commitHistoryEntry,
  ensureOperationGraphicCounter,
  ensureOperationGraphicsEditorState,
  getMapLonLatFromEvent,
  getOperationGraphicById,
  getOperationGraphicMinPoints,
  markDirty,
  normalizeOperationGraphicOpacity,
  normalizeOperationGraphicStroke,
  normalizeOperationGraphicStylePreset,
  normalizeOperationGraphicWidth,
  renderNow,
  renderOperationGraphicsIfNeeded,
  showToast,
  t,
  updateStrategicOverlayUi,
}) {
  const vertexDragSession = {
    before: null,
    selectedId: "",
    vertexIndex: -1,
    moved: false,
  };

  function resetVertexDragSession() {
    vertexDragSession.before = null;
    vertexDragSession.selectedId = "";
    vertexDragSession.vertexIndex = -1;
    vertexDragSession.moved = false;
  }

  function getSelectedOperationGraphicForVertex(vertexIndex = -1) {
    ensureOperationGraphicsEditorState();
    const selectedId = String(state.operationGraphicsEditor.selectedId || "").trim();
    const graphic = getOperationGraphicById(selectedId);
    const normalizedIndex = Number(vertexIndex);
    if (!graphic || !Number.isInteger(normalizedIndex) || normalizedIndex < 0) return null;
    if (!Array.isArray(graphic.points) || !Array.isArray(graphic.points[normalizedIndex])) return null;
    return { graphic, normalizedIndex, selectedId };
  }

  function appendOperationGraphicVertexFromEvent(event) {
    ensureOperationGraphicsEditorState();
    const coord = getMapLonLatFromEvent(event);
    if (!coord) return false;
    state.operationGraphicsEditor.points.push(coord);
    state.operationGraphicsDirty = true;
    updateStrategicOverlayUi();
    renderOperationGraphicsIfNeeded({ force: true });
    return true;
  }

  function startOperationGraphicDraw({
    kind = defaultOperationGraphicKind,
    label = "",
    opacity = 1,
    stroke = "",
    stylePreset = defaultOperationGraphicKind,
    width = 0,
  } = {}) {
    ensureOperationGraphicsEditorState();
    state.operationGraphicsEditor.active = true;
    state.operationGraphicsEditor.mode = "draw";
    state.operationGraphicsEditor.points = [];
    state.operationGraphicsEditor.kind = String(kind || defaultOperationGraphicKind);
    state.operationGraphicsEditor.label = String(label || "");
    state.operationGraphicsEditor.stylePreset = normalizeOperationGraphicStylePreset(stylePreset, kind);
    state.operationGraphicsEditor.stroke = normalizeOperationGraphicStroke(stroke);
    state.operationGraphicsEditor.width = normalizeOperationGraphicWidth(width);
    state.operationGraphicsEditor.opacity = normalizeOperationGraphicOpacity(opacity);
    state.operationGraphicsEditor.selectedId = null;
    state.operationGraphicsEditor.selectedVertexIndex = -1;
    state.operationGraphicsDirty = true;
    updateStrategicOverlayUi();
    renderNow();
  }

  function undoOperationGraphicVertex() {
    ensureOperationGraphicsEditorState();
    if (!state.operationGraphicsEditor.active || !state.operationGraphicsEditor.points.length) return;
    state.operationGraphicsEditor.points.pop();
    state.operationGraphicsDirty = true;
    updateStrategicOverlayUi();
    renderNow();
  }

  function cancelOperationGraphicDraw() {
    ensureOperationGraphicsEditorState();
    state.operationGraphicsEditor.active = false;
    state.operationGraphicsEditor.mode = state.operationGraphicsEditor.selectedId ? "edit" : "idle";
    state.operationGraphicsEditor.points = [];
    state.operationGraphicsEditor.selectedVertexIndex = -1;
    state.operationGraphicsDirty = true;
    updateStrategicOverlayUi();
    renderNow();
  }

  function finishOperationGraphicDraw() {
    ensureOperationGraphicsEditorState();
    const kind = String(state.operationGraphicsEditor.kind || defaultOperationGraphicKind);
    const minPoints = getOperationGraphicMinPoints(kind);
    const points = Array.isArray(state.operationGraphicsEditor.points) ? state.operationGraphicsEditor.points : [];
    if (!state.operationGraphicsEditor.active || points.length < minPoints) {
      cancelOperationGraphicDraw();
      return false;
    }
    ensureOperationGraphicCounter();
    const before = captureHistoryState({ strategicOverlay: true });
    const id = `opg_${state.operationGraphicsEditor.counter}`;
    state.operationGraphics.push({
      id,
      kind,
      label: String(state.operationGraphicsEditor.label || "").trim(),
      points: [...points],
      stylePreset: normalizeOperationGraphicStylePreset(state.operationGraphicsEditor.stylePreset, kind),
      stroke: normalizeOperationGraphicStroke(state.operationGraphicsEditor.stroke) || null,
      width: normalizeOperationGraphicWidth(state.operationGraphicsEditor.width),
      opacity: normalizeOperationGraphicOpacity(state.operationGraphicsEditor.opacity),
    });
    state.operationGraphicsEditor.counter += 1;
    state.operationGraphicsEditor.selectedId = id;
    state.operationGraphicsEditor.active = false;
    state.operationGraphicsEditor.mode = "edit";
    state.operationGraphicsEditor.points = [...points];
    state.operationGraphicsEditor.selectedVertexIndex = -1;
    state.operationGraphicsDirty = true;
    commitHistoryEntry({
      kind: "finish-operation-graphic",
      before,
      after: captureHistoryState({ strategicOverlay: true }),
    });
    markDirty("finish-operation-graphic");
    updateStrategicOverlayUi();
    renderNow();
    return true;
  }

  function selectOperationGraphicById(id) {
    ensureOperationGraphicsEditorState();
    const selectedId = String(id || "").trim();
    const graphic = getOperationGraphicById(selectedId);
    state.operationGraphicsEditor.selectedId = selectedId || null;
    state.operationGraphicsEditor.selectedVertexIndex = -1;
    if (graphic) {
      state.operationGraphicsEditor.kind = String(graphic.kind || defaultOperationGraphicKind);
      state.operationGraphicsEditor.label = String(graphic.label || "");
      state.operationGraphicsEditor.stylePreset = normalizeOperationGraphicStylePreset(graphic.stylePreset, graphic.kind);
      state.operationGraphicsEditor.stroke = normalizeOperationGraphicStroke(graphic.stroke);
      state.operationGraphicsEditor.width = normalizeOperationGraphicWidth(graphic.width);
      state.operationGraphicsEditor.opacity = normalizeOperationGraphicOpacity(graphic.opacity);
      state.operationGraphicsEditor.points = Array.isArray(graphic.points) ? [...graphic.points] : [];
      state.operationGraphicsEditor.mode = "edit";
    } else {
      state.operationGraphicsEditor.points = [];
      state.operationGraphicsEditor.mode = "idle";
    }
    state.operationGraphicsDirty = true;
    updateStrategicOverlayUi();
    renderNow();
  }

  function deleteSelectedOperationGraphic() {
    ensureOperationGraphicsEditorState();
    const selectedId = String(state.operationGraphicsEditor.selectedId || "").trim();
    if (!selectedId) return false;
    const before = captureHistoryState({ strategicOverlay: true });
    const nextGraphics = (state.operationGraphics || []).filter((entry) => String(entry?.id || "") !== selectedId);
    if (nextGraphics.length === (state.operationGraphics || []).length) return false;
    state.operationGraphics = nextGraphics;
    state.operationGraphicsEditor.selectedId = null;
    state.operationGraphicsEditor.points = [];
    state.operationGraphicsEditor.selectedVertexIndex = -1;
    state.operationGraphicsEditor.mode = "idle";
    state.operationGraphicsDirty = true;
    commitHistoryEntry({
      kind: "delete-operation-graphic",
      before,
      after: captureHistoryState({ strategicOverlay: true }),
    });
    markDirty("delete-operation-graphic");
    updateStrategicOverlayUi();
    renderNow();
    return true;
  }

  function updateSelectedOperationGraphic(partial = {}) {
    ensureOperationGraphicsEditorState();
    const selectedId = String(state.operationGraphicsEditor.selectedId || "").trim();
    if (!selectedId) return false;
    const target = (state.operationGraphics || []).find((entry) => String(entry?.id || "") === selectedId);
    if (!target) return false;
    const nextKind = partial.kind ? String(partial.kind || defaultOperationGraphicKind) : String(target.kind || defaultOperationGraphicKind);
    if (partial.kind && Array.isArray(target.points) && target.points.length < getOperationGraphicMinPoints(nextKind)) {
      showToast(t("Add more vertices before switching this graphic to a closed style.", "ui"), {
        title: t("More points required", "ui"),
        tone: "warning",
      });
      return false;
    }
    const before = captureHistoryState({ strategicOverlay: true });
    if (partial.kind) target.kind = nextKind;
    if (partial.label !== undefined) target.label = String(partial.label || "");
    if (partial.stylePreset !== undefined) target.stylePreset = normalizeOperationGraphicStylePreset(partial.stylePreset, target.kind);
    if (partial.stroke !== undefined) target.stroke = normalizeOperationGraphicStroke(partial.stroke) || null;
    if (partial.width !== undefined) target.width = normalizeOperationGraphicWidth(partial.width);
    if (partial.opacity !== undefined) target.opacity = normalizeOperationGraphicOpacity(partial.opacity);
    state.operationGraphicsEditor.points = Array.isArray(target.points) ? [...target.points] : [];
    selectOperationGraphicById(selectedId);
    state.operationGraphicsDirty = true;
    commitHistoryEntry({
      kind: "update-operation-graphic",
      before,
      after: captureHistoryState({ strategicOverlay: true }),
    });
    markDirty("update-operation-graphic");
    updateStrategicOverlayUi();
    renderNow();
    return true;
  }

  function deleteSelectedOperationGraphicVertex() {
    ensureOperationGraphicsEditorState();
    const graphic = getOperationGraphicById(state.operationGraphicsEditor.selectedId);
    const vertexIndex = Number(state.operationGraphicsEditor.selectedVertexIndex);
    if (!graphic || !Number.isInteger(vertexIndex) || vertexIndex < 0) return false;
    const minPoints = getOperationGraphicMinPoints(graphic.kind);
    if (!Array.isArray(graphic.points) || graphic.points.length <= minPoints) return false;
    const before = captureHistoryState({ strategicOverlay: true });
    graphic.points.splice(vertexIndex, 1);
    state.operationGraphicsEditor.points = Array.isArray(graphic.points) ? [...graphic.points] : [];
    state.operationGraphicsEditor.selectedVertexIndex = Math.min(vertexIndex, graphic.points.length - 1);
    state.operationGraphicsDirty = true;
    commitHistoryEntry({
      kind: "delete-operation-graphic-vertex",
      before,
      after: captureHistoryState({ strategicOverlay: true }),
    });
    markDirty("delete-operation-graphic-vertex");
    updateStrategicOverlayUi();
    renderNow();
    return true;
  }

  function insertOperationGraphicVertex(insertIndex = -1, coord = null) {
    ensureOperationGraphicsEditorState();
    const selectedId = String(state.operationGraphicsEditor.selectedId || "").trim();
    const graphic = getOperationGraphicById(selectedId);
    const normalizedIndex = Number(insertIndex);
    if (!graphic || !Number.isInteger(normalizedIndex) || normalizedIndex < 0) return false;
    if (!Array.isArray(graphic.points) || normalizedIndex > graphic.points.length) return false;
    if (!Array.isArray(coord) || coord.length < 2) return false;
    const lon = Number(coord[0]);
    const lat = Number(coord[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
    const before = captureHistoryState({ strategicOverlay: true });
    graphic.points.splice(normalizedIndex, 0, [lon, lat]);
    state.operationGraphicsEditor.points = Array.isArray(graphic.points) ? graphic.points : [];
    state.operationGraphicsEditor.selectedVertexIndex = normalizedIndex;
    state.operationGraphicsDirty = true;
    commitHistoryEntry({
      kind: "insert-operation-graphic-vertex",
      before,
      after: captureHistoryState({ strategicOverlay: true }),
    });
    markDirty("insert-operation-graphic-vertex");
    updateStrategicOverlayUi();
    renderOperationGraphicsIfNeeded({ force: true });
    return true;
  }

  function beginOperationGraphicVertexDrag(vertexIndex = -1) {
    const target = getSelectedOperationGraphicForVertex(vertexIndex);
    if (!target) {
      resetVertexDragSession();
      return false;
    }
    vertexDragSession.before = captureHistoryState({ strategicOverlay: true });
    vertexDragSession.selectedId = target.selectedId;
    vertexDragSession.vertexIndex = target.normalizedIndex;
    vertexDragSession.moved = false;
    state.operationGraphicsEditor.selectedVertexIndex = target.normalizedIndex;
    state.operationGraphicsDirty = true;
    updateStrategicOverlayUi();
    renderOperationGraphicsIfNeeded({ force: true });
    return true;
  }

  function moveOperationGraphicVertexDrag(vertexIndex = -1, coord = null) {
    const target = getSelectedOperationGraphicForVertex(vertexIndex);
    if (!target || !Array.isArray(coord) || coord.length < 2) return false;
    const lon = Number(coord[0]);
    const lat = Number(coord[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
    if (
      vertexDragSession.selectedId !== target.selectedId
      || vertexDragSession.vertexIndex !== target.normalizedIndex
    ) {
      return false;
    }
    target.graphic.points[target.normalizedIndex] = [lon, lat];
    state.operationGraphicsEditor.points = Array.isArray(target.graphic.points) ? target.graphic.points : [];
    state.operationGraphicsEditor.selectedVertexIndex = target.normalizedIndex;
    state.operationGraphicsDirty = true;
    vertexDragSession.moved = true;
    renderOperationGraphicsIfNeeded({ force: true });
    return true;
  }

  function finishOperationGraphicVertexDrag(vertexIndex = -1) {
    const target = getSelectedOperationGraphicForVertex(vertexIndex);
    const isActiveSession = !!target
      && vertexDragSession.selectedId === target.selectedId
      && vertexDragSession.vertexIndex === target.normalizedIndex;
    const moved = isActiveSession && vertexDragSession.moved;
    if (moved) {
      commitHistoryEntry({
        kind: "move-operation-graphic-vertex",
        before: vertexDragSession.before,
        after: captureHistoryState({ strategicOverlay: true }),
      });
      markDirty("move-operation-graphic-vertex");
      state.operationGraphicsDirty = true;
    }
    resetVertexDragSession();
    updateStrategicOverlayUi();
    renderOperationGraphicsIfNeeded({ force: true });
    return moved;
  }

  return {
    appendOperationGraphicVertexFromEvent,
    beginOperationGraphicVertexDrag,
    cancelOperationGraphicDraw,
    deleteSelectedOperationGraphic,
    deleteSelectedOperationGraphicVertex,
    finishOperationGraphicDraw,
    finishOperationGraphicVertexDrag,
    insertOperationGraphicVertex,
    moveOperationGraphicVertexDrag,
    selectOperationGraphicById,
    startOperationGraphicDraw,
    undoOperationGraphicVertex,
    updateSelectedOperationGraphic,
  };
}
