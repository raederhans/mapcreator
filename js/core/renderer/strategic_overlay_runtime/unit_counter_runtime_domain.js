// Unit counter runtime mutations.
import {
  commitStrategicOverlayCollectionsState,
  patchStrategicOverlayEntityGroupState,
  patchStrategicOverlayEntityState,
  patchStrategicOverlayEditorState,
  setStrategicOverlayDirtyState,
} from "../../state/actions/strategic_overlay_actions.js";

export function createUnitCounterRuntimeDomain({
  state,
  defaults = {},
  helpers = {},
} = {}) {
  const {
    defaultCounterAttachmentKind = "operational-line",
    defaultHitSnapRadiusClickPx = 14,
    defaultUnitCounterEquipmentPct = 74,
    defaultUnitCounterMilstdSidc = "130310001412110000000000000000",
    defaultUnitCounterOrganizationPct = 78,
    defaultUnitCounterPresetId = "inf",
    defaultUnitCounterRenderer = "game",
  } = defaults;

  const {
    assignUnitCounterEditorFromCounter = () => {},
    canonicalCountryCode = (value = "") => String(value || "").trim().toUpperCase(),
    captureHistoryState = () => ({}),
    commitHistoryEntry = () => {},
    ensureUnitCounterCounter = () => {},
    ensureUnitCounterEditorState = () => {},
    getHitFromEvent = () => null,
    getMapLonLatFromEvent = () => null,
    getNormalizedUnitCounterCombatState = () => ({
      baseFillColor: "",
      equipmentPct: defaultUnitCounterEquipmentPct,
      organizationPct: defaultUnitCounterOrganizationPct,
      statsPresetId: "regular",
      statsSource: "preset",
    }),
    getUnitCounterPresetById = () => ({
      defaultRenderer: defaultUnitCounterRenderer,
      id: defaultUnitCounterPresetId,
    }),
    markDirty = () => {},
    normalizeUnitCounterBaseFillColor = (value) => String(value || "").trim(),
    normalizeUnitCounterNationSource = (value, fallback = "display") => String(value || fallback).trim().toLowerCase(),
    normalizeUnitCounterSizeToken = (value) => String(value || "medium").trim().toLowerCase(),
    normalizeUnitCounterStatPercent = (value, fallback = defaultUnitCounterOrganizationPct) => Number(value) || fallback,
    normalizeUnitCounterStatsPresetId = (value, fallback = "regular") => String(value || fallback).trim().toLowerCase(),
    renderNow = () => {},
    resetUnitCounterEditorState = () => {},
    resolveUnitCounterNationForPlacement = () => ({ tag: "", source: "display" }),
    updateStrategicOverlayUi = () => {},
  } = helpers;

  const unitCounterDragSession = {
    before: null,
    counterId: "",
    moved: false,
  };

  function resetUnitCounterDragSession() {
    unitCounterDragSession.before = null;
    unitCounterDragSession.counterId = "";
    unitCounterDragSession.moved = false;
  }

  const patchEditor = (patch) => patchStrategicOverlayEditorState(state, "unitCounterEditor", patch);
  const markUnitCountersDirty = () => setStrategicOverlayDirtyState(state, "unitCountersDirty", true);
  const markOperationalLinesDirty = () => setStrategicOverlayDirtyState(state, "operationalLinesDirty", true);

  function syncOperationalLineAttachedCounterIds() {
    const attachedByLineId = new Map();
    (state.unitCounters || []).forEach((counter) => {
      const lineId = String(counter?.attachment?.lineId || "").trim();
      if (!lineId) return;
      if (!attachedByLineId.has(lineId)) {
        attachedByLineId.set(lineId, []);
      }
      attachedByLineId.get(lineId).push(String(counter.id || "").trim());
    });
    const entityPatches = (state.operationalLines || []).flatMap((line) => {
      const entityId = String(line?.id || "").trim();
      if (!entityId) return [];
      const nextIds = attachedByLineId.get(entityId) || [];
      const currentIds = Array.isArray(line?.attachedCounterIds) ? line.attachedCounterIds : [];
      if (
        currentIds.length === nextIds.length
        && currentIds.every((value, index) => String(value || "").trim() === nextIds[index])
      ) {
        return [];
      }
      return [{ entityId, patch: { attachedCounterIds: nextIds } }];
    });
    patchStrategicOverlayEntityGroupState(
      state,
      "operationalLines",
      entityPatches,
      { markDirty: false },
    );
  }

  function placeUnitCounterFromEvent(event) {
    ensureUnitCounterEditorState();
    if (!state.unitCounterEditor.active) return false;
    const coord = getMapLonLatFromEvent(event);
    if (!coord) return false;
    ensureUnitCounterCounter();
    const hit = getHitFromEvent(event, {
      enableSnap: true,
      snapPx: defaultHitSnapRadiusClickPx,
      eventType: "unit-counter-place",
    });
    const featureId = hit?.targetType === "land" ? String(hit.id || "") : "";
    const requestedNationSource = normalizeUnitCounterNationSource(state.unitCounterEditor.nationSource, "display");
    const nationResolution = requestedNationSource === "manual"
      ? resolveUnitCounterNationForPlacement("", state.unitCounterEditor.nationTag, "manual")
      : resolveUnitCounterNationForPlacement(featureId, "", requestedNationSource);
    const preset = getUnitCounterPresetById(state.unitCounterEditor.presetId || defaultUnitCounterPresetId);
    const attachment = state.unitCounterEditor.attachment?.lineId
      ? {
        kind: String(state.unitCounterEditor.attachment.kind || defaultCounterAttachmentKind).trim().toLowerCase() || defaultCounterAttachmentKind,
        lineId: String(state.unitCounterEditor.attachment.lineId || "").trim(),
      }
      : null;
    const before = captureHistoryState({ strategicOverlay: true });
    const id = `unit_${state.unitCounterEditor.counter}`;
    const nextToken = String(
      state.unitCounterEditor.sidc
      || state.unitCounterEditor.symbolCode
      || preset.baseSidc
      || (String(state.unitCounterEditor.renderer || "").toLowerCase() === "milstd" ? defaultUnitCounterMilstdSidc : "")
    ).trim().toUpperCase();
    const normalizedCombatState = getNormalizedUnitCounterCombatState(state.unitCounterEditor);
    const nextCounters = [...state.unitCounters, {
      id,
      renderer: String(state.unitCounterEditor.renderer || preset.defaultRenderer || state.annotationView?.unitRendererDefault || defaultUnitCounterRenderer),
      sidc: nextToken,
      symbolCode: nextToken,
      label: String(state.unitCounterEditor.label || "").trim(),
      nationTag: nationResolution.tag,
      nationSource: requestedNationSource,
      presetId: preset.id,
      iconId: String(state.unitCounterEditor.iconId || preset.iconId || "").trim().toLowerCase(),
      unitType: String(state.unitCounterEditor.unitType || preset.unitType || "").trim().toUpperCase(),
      echelon: String(state.unitCounterEditor.echelon || preset.defaultEchelon || "").trim().toLowerCase(),
      subLabel: String(state.unitCounterEditor.subLabel || "").trim(),
      strengthText: String(state.unitCounterEditor.strengthText || "").trim(),
      baseFillColor: normalizedCombatState.baseFillColor,
      organizationPct: normalizedCombatState.organizationPct,
      equipmentPct: normalizedCombatState.equipmentPct,
      statsPresetId: normalizedCombatState.statsPresetId,
      statsSource: normalizedCombatState.statsSource,
      size: normalizeUnitCounterSizeToken(state.unitCounterEditor.size || "medium"),
      facing: 0,
      zIndex: state.unitCounters.length,
      anchor: {
        lon: coord[0],
        lat: coord[1],
        featureId,
      },
      layoutAnchor: {
        kind: attachment ? "attachment" : "feature",
        key: attachment?.lineId || featureId,
        slotIndex: null,
      },
      attachment,
    }];
    commitStrategicOverlayCollectionsState(state, { unitCounters: nextCounters });
    patchEditor({
      counter: state.unitCounterEditor.counter + 1,
      selectedId: id,
      returnSelectionId: null,
      active: false,
    });
    syncOperationalLineAttachedCounterIds();
    markUnitCountersDirty();
    markOperationalLinesDirty();
    commitHistoryEntry({
      kind: "place-unit-counter",
      before,
      after: captureHistoryState({ strategicOverlay: true }),
    });
    markDirty("place-unit-counter");
    updateStrategicOverlayUi();
    renderNow();
    return true;
  }

  function startUnitCounterPlacement({
    renderer = defaultUnitCounterRenderer,
    label = "",
    sidc = "",
    symbolCode = "",
    nationTag = "",
    nationSource = "display",
    presetId = defaultUnitCounterPresetId,
    unitType = "",
    echelon = "",
    subLabel = "",
    strengthText = "",
    iconId = "",
    attachment = null,
    baseFillColor = "",
    organizationPct = defaultUnitCounterOrganizationPct,
    equipmentPct = defaultUnitCounterEquipmentPct,
    statsPresetId = "regular",
    statsSource = "preset",
    size = "medium",
  } = {}) {
    ensureUnitCounterEditorState();
    const returnSelectionId = String(state.unitCounterEditor.selectedId || "").trim() || null;
    resetUnitCounterEditorState({ preserveSelection: false, preserveCounter: true });
    const preset = getUnitCounterPresetById(presetId || defaultUnitCounterPresetId);
    const normalizedCombatState = getNormalizedUnitCounterCombatState({
      baseFillColor,
      organizationPct,
      equipmentPct,
      statsPresetId,
      statsSource,
    });
    patchEditor({
      active: true,
      renderer: String(renderer || preset.defaultRenderer || defaultUnitCounterRenderer),
      label: String(label || ""),
      sidc: String(sidc || symbolCode || preset.baseSidc || "").trim().toUpperCase(),
      symbolCode: String(symbolCode || sidc || preset.baseSidc || "").trim().toUpperCase(),
      nationTag: canonicalCountryCode(nationTag || ""),
      nationSource: normalizeUnitCounterNationSource(nationSource, "display"),
      presetId: preset.id,
      iconId: String(iconId || preset.iconId || "").trim().toLowerCase(),
      unitType: String(unitType || preset.unitType || "").trim().toUpperCase(),
      echelon: String(echelon || preset.defaultEchelon || "").trim().toLowerCase(),
      subLabel: String(subLabel || ""),
      strengthText: String(strengthText || ""),
      layoutAnchor: {
        kind: attachment?.lineId ? "attachment" : "feature",
        key: String(attachment?.lineId || ""),
        slotIndex: null,
      },
      attachment: attachment?.lineId
        ? {
          kind: String(attachment.kind || defaultCounterAttachmentKind).trim().toLowerCase() || defaultCounterAttachmentKind,
          lineId: String(attachment.lineId || "").trim(),
        }
        : null,
      baseFillColor: normalizedCombatState.baseFillColor,
      organizationPct: normalizedCombatState.organizationPct,
      equipmentPct: normalizedCombatState.equipmentPct,
      statsPresetId: normalizedCombatState.statsPresetId,
      statsSource: normalizedCombatState.statsSource,
      size: normalizeUnitCounterSizeToken(size || "medium"),
      selectedId: null,
      returnSelectionId,
    });
    markUnitCountersDirty();
    updateStrategicOverlayUi();
    renderNow();
  }

  function cancelUnitCounterPlacement() {
    ensureUnitCounterEditorState();
    const returnSelectionId = String(state.unitCounterEditor.returnSelectionId || "").trim();
    if (returnSelectionId && (state.unitCounters || []).some((entry) => String(entry?.id || "") === returnSelectionId)) {
      patchEditor({ returnSelectionId: null });
      selectUnitCounterById(returnSelectionId);
      return;
    }
    resetUnitCounterEditorState({ preserveSelection: false, preserveCounter: true });
    markUnitCountersDirty();
    updateStrategicOverlayUi();
    renderNow();
  }

  function selectUnitCounterById(id) {
    ensureUnitCounterEditorState();
    const selectedId = String(id || "").trim();
    const counter = (state.unitCounters || []).find((entry) => String(entry?.id || "") === selectedId) || null;
    if (counter) {
      patchEditor({ active: false, selectedId: selectedId || null, returnSelectionId: null });
      assignUnitCounterEditorFromCounter(counter);
    } else {
      resetUnitCounterEditorState({ preserveSelection: false, preserveCounter: true });
    }
    markUnitCountersDirty();
    updateStrategicOverlayUi();
    renderNow();
  }

  function updateSelectedUnitCounter(partial = {}) {
    ensureUnitCounterEditorState();
    const selectedId = String(state.unitCounterEditor.selectedId || "").trim();
    if (!selectedId) return false;
    const counter = (state.unitCounters || []).find((entry) => String(entry?.id || "") === selectedId);
    if (!counter) return false;
    const before = captureHistoryState({ strategicOverlay: true });
    const entityPatch = {};
    if (partial.renderer) entityPatch.renderer = String(partial.renderer || defaultUnitCounterRenderer);
    if (partial.label !== undefined) entityPatch.label = String(partial.label || "");
    if (partial.sidc !== undefined || partial.symbolCode !== undefined) {
      const nextToken = String(partial.sidc || partial.symbolCode || "").trim().toUpperCase();
      entityPatch.sidc = nextToken;
      entityPatch.symbolCode = nextToken;
    }
    if (partial.nationTag !== undefined) entityPatch.nationTag = canonicalCountryCode(partial.nationTag || "");
    if (partial.nationSource !== undefined) {
      entityPatch.nationSource = normalizeUnitCounterNationSource(partial.nationSource, "display");
    }
    if (partial.presetId !== undefined) entityPatch.presetId = String(partial.presetId || defaultUnitCounterPresetId).trim().toLowerCase() || defaultUnitCounterPresetId;
    if (partial.iconId !== undefined) entityPatch.iconId = String(partial.iconId || "").trim().toLowerCase();
    if (partial.unitType !== undefined) entityPatch.unitType = String(partial.unitType || "").trim().toUpperCase();
    if (partial.echelon !== undefined) entityPatch.echelon = String(partial.echelon || "").trim().toLowerCase();
    if (partial.subLabel !== undefined) entityPatch.subLabel = String(partial.subLabel || "");
    if (partial.strengthText !== undefined) entityPatch.strengthText = String(partial.strengthText || "");
    if (partial.baseFillColor !== undefined) entityPatch.baseFillColor = normalizeUnitCounterBaseFillColor(partial.baseFillColor);
    if (partial.organizationPct !== undefined) entityPatch.organizationPct = normalizeUnitCounterStatPercent(partial.organizationPct, defaultUnitCounterOrganizationPct);
    if (partial.equipmentPct !== undefined) entityPatch.equipmentPct = normalizeUnitCounterStatPercent(partial.equipmentPct, defaultUnitCounterEquipmentPct);
    if (partial.statsPresetId !== undefined) entityPatch.statsPresetId = normalizeUnitCounterStatsPresetId(partial.statsPresetId || "regular");
    if (partial.statsSource !== undefined) {
      entityPatch.statsSource = ["preset", "random", "manual"].includes(String(partial.statsSource || "").trim().toLowerCase())
        ? String(partial.statsSource || "").trim().toLowerCase()
        : "preset";
    }
    if (partial.size) entityPatch.size = normalizeUnitCounterSizeToken(partial.size || "medium");
    if (partial.attachment !== undefined) {
      const nextAttachment = partial.attachment?.lineId
        ? {
          kind: String(partial.attachment.kind || defaultCounterAttachmentKind).trim().toLowerCase() || defaultCounterAttachmentKind,
          lineId: String(partial.attachment.lineId || "").trim(),
        }
        : null;
      entityPatch.attachment = nextAttachment;
      entityPatch.layoutAnchor = {
        ...(counter.layoutAnchor || {}),
        kind: nextAttachment ? "attachment" : "feature",
        key: nextAttachment?.lineId || String(counter.anchor?.featureId || ""),
        slotIndex: null,
      };
    }
    patchStrategicOverlayEntityState(state, "unitCounters", selectedId, entityPatch);
    syncOperationalLineAttachedCounterIds();
    selectUnitCounterById(selectedId);
    markUnitCountersDirty();
    markOperationalLinesDirty();
    commitHistoryEntry({
      kind: "update-unit-counter",
      before,
      after: captureHistoryState({ strategicOverlay: true }),
    });
    markDirty("update-unit-counter");
    updateStrategicOverlayUi();
    renderNow();
    return true;
  }

  function deleteSelectedUnitCounter() {
    ensureUnitCounterEditorState();
    const selectedId = String(state.unitCounterEditor.selectedId || "").trim();
    if (!selectedId) return false;
    const before = captureHistoryState({ strategicOverlay: true });
    const nextCounters = (state.unitCounters || []).filter((entry) => String(entry?.id || "") !== selectedId);
    if (nextCounters.length === (state.unitCounters || []).length) return false;
    commitStrategicOverlayCollectionsState(state, { unitCounters: nextCounters });
    resetUnitCounterEditorState({ preserveSelection: false, preserveCounter: true });
    syncOperationalLineAttachedCounterIds();
    markUnitCountersDirty();
    markOperationalLinesDirty();
    commitHistoryEntry({
      kind: "delete-unit-counter",
      before,
      after: captureHistoryState({ strategicOverlay: true }),
    });
    markDirty("delete-unit-counter");
    updateStrategicOverlayUi();
    renderNow();
    return true;
  }

  function beginUnitCounterDrag(counter = null) {
    if (!counter || typeof counter !== "object") return false;
    ensureUnitCounterEditorState();
    const counterId = String(counter.id || "");
    unitCounterDragSession.before = captureHistoryState({ strategicOverlay: true });
    unitCounterDragSession.counterId = counterId;
    unitCounterDragSession.moved = false;
    patchEditor({ selectedId: counterId });
    updateStrategicOverlayUi();
    return true;
  }

  function moveUnitCounterDrag(counter = null, coord = null) {
    if (!counter || typeof counter !== "object" || !Array.isArray(coord) || coord.length < 2) return false;
    const lon = Number(coord[0]);
    const lat = Number(coord[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
    const counterId = String(counter.id || "");
    if (unitCounterDragSession.counterId !== counterId) {
      unitCounterDragSession.before = captureHistoryState({ strategicOverlay: true });
      unitCounterDragSession.counterId = counterId;
      unitCounterDragSession.moved = false;
    }
    if (!unitCounterDragSession.moved) {
      unitCounterDragSession.moved = true;
      counter.attachment = null;
      counter.layoutAnchor = {
        ...(counter.layoutAnchor || {}),
        kind: "feature",
        key: String(counter.anchor?.featureId || ""),
        slotIndex: null,
      };
    }
    counter.anchor = {
      ...(counter.anchor || {}),
      lon,
      lat,
    };
    markUnitCountersDirty();
    return true;
  }

  function finishUnitCounterDrag(counter = null, { featureId = "" } = {}) {
    if (!counter || typeof counter !== "object") return false;
    const counterId = String(counter.id || "");
    const moved = unitCounterDragSession.counterId === counterId && unitCounterDragSession.moved;
    if (moved) {
      const before = unitCounterDragSession.before;
      counter.anchor = {
        ...(counter.anchor || {}),
        featureId: String(featureId || ""),
      };
      counter.layoutAnchor = {
        ...(counter.layoutAnchor || {}),
        kind: "feature",
        key: String(counter.anchor?.featureId || ""),
        slotIndex: null,
      };
      syncOperationalLineAttachedCounterIds();
      markOperationalLinesDirty();
      markUnitCountersDirty();
      commitHistoryEntry({
        kind: "move-unit-counter",
        before,
        after: captureHistoryState({ strategicOverlay: true }),
      });
      markDirty("move-unit-counter");
    }
    resetUnitCounterDragSession();
    updateStrategicOverlayUi();
    renderNow();
    return moved;
  }

  function selectUnitCounterFromRender(counter = null) {
    if (!counter || typeof counter !== "object") return false;
    ensureUnitCounterEditorState();
    patchEditor({ selectedId: String(counter.id || "") });
    assignUnitCounterEditorFromCounter(counter);
    markUnitCountersDirty();
    updateStrategicOverlayUi();
    renderNow();
    return true;
  }

  return {
    beginUnitCounterDrag,
    cancelUnitCounterPlacement,
    deleteSelectedUnitCounter,
    finishUnitCounterDrag,
    moveUnitCounterDrag,
    placeUnitCounterFromEvent,
    selectUnitCounterFromRender,
    selectUnitCounterById,
    startUnitCounterPlacement,
    syncOperationalLineAttachedCounterIds,
    updateSelectedUnitCounter,
  };
}
