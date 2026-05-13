// Layer-based special zone model and mutations.
// The layer store is the canonical special-zone runtime shape; legacy freehand data is reported as diagnostics on import.

const SPECIAL_ZONE_LAYER_VERSION = 1;
const SPECIAL_ZONE_SOURCES = new Set(["project", "scenario"]);
const SPECIAL_ZONE_MEMBERSHIP_BRUSH_MODES = new Set(["add", "remove"]);
const SPECIAL_ZONE_STORY_MAX_STEPS = 24;
const SPECIAL_ZONE_LAYER_DIAGNOSTIC_CODES = Object.freeze({
  LOAD_FAILED: "special_zone_layers_load_failed",
});
const SPECIAL_ZONE_PATTERN_IDS = Object.freeze([
  "solid",
  "diagonalHatch",
  "crossHatch",
  "horizontalLines",
  "wavyLines",
  "dots",
  "denseDots",
  "concentric",
  "chevrons",
  "outlineOnly",
]);

const SPECIAL_ZONE_PRESETS = Object.freeze([
  ["demilitarized", "Demilitarized Zone", "security", "#f59e0b", "#b45309", "diagonalHatch"],
  ["disputed", "Disputed Area", "political", "#f97316", "#ea580c", "crossHatch"],
  ["wasteland", "Wasteland", "terrain", "#dc2626", "#991b1b", "solid"],
  ["buffer", "Buffer Zone", "security", "#facc15", "#a16207", "horizontalLines"],
  ["occupied", "Occupied Territory", "political", "#ef4444", "#991b1b", "chevrons"],
  ["protectorate", "Protectorate", "political", "#38bdf8", "#0369a1", "dots"],
  ["autonomous", "Autonomous Region", "political", "#22c55e", "#15803d", "concentric"],
  ["military", "Military District", "security", "#64748b", "#334155", "denseDots"],
  ["frontier", "Frontier Belt", "security", "#a78bfa", "#6d28d9", "wavyLines"],
  ["special_economic", "Special Economic Zone", "economic", "#14b8a6", "#0f766e", "dots"],
  ["industrial", "Industrial Zone", "economic", "#fb7185", "#be123c", "horizontalLines"],
  ["resource", "Resource Concession", "economic", "#84cc16", "#4d7c0f", "diagonalHatch"],
  ["exclusion", "Exclusion Zone", "security", "#f43f5e", "#9f1239", "outlineOnly"],
  ["neutral", "Neutral Zone", "political", "#94a3b8", "#475569", "outlineOnly"],
  ["administrative", "Administrative Zone", "political", "#60a5fa", "#1d4ed8", "solid"],
  ["cultural", "Cultural Region", "social", "#e879f9", "#a21caf", "wavyLines"],
  ["maritime", "Maritime Zone", "terrain", "#22d3ee", "#0891b2", "horizontalLines"],
  ["custom", "Custom Zone", "custom", "#8b5cf6", "#6d28d9", "solid"],
].map(([id, name, category, fill, stroke, pattern]) => Object.freeze({
  id,
  name,
  category,
  style: Object.freeze(createSpecialZoneLayerStyle({ fill, stroke, pattern })),
})));

const SPECIAL_ZONE_PRESET_BY_ID = new Map(SPECIAL_ZONE_PRESETS.map((preset) => [preset.id, preset]));

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  const finite = Number.isFinite(numeric) ? numeric : fallback;
  return Math.min(max, Math.max(min, finite));
}

function normalizeHexColor(value, fallback) {
  const candidate = String(value || "").trim();
  if (/^#(?:[0-9a-f]{6})$/i.test(candidate)) return candidate.toLowerCase();
  if (/^#(?:[0-9a-f]{3})$/i.test(candidate)) {
    return `#${candidate[1]}${candidate[1]}${candidate[2]}${candidate[2]}${candidate[3]}${candidate[3]}`.toLowerCase();
  }
  return fallback;
}

function normalizePatternId(value, fallback = "solid") {
  const candidate = String(value || "").trim();
  return SPECIAL_ZONE_PATTERN_IDS.includes(candidate) ? candidate : fallback;
}

function createSpecialZoneLayerStyle(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    fill: normalizeHexColor(source.fill || source.fillColor, "#8b5cf6"),
    stroke: normalizeHexColor(source.stroke || source.strokeColor, "#6d28d9"),
    fillOpacity: clampNumber(source.fillOpacity ?? source.opacity, 0.32, 0, 1),
    strokeOpacity: clampNumber(source.strokeOpacity, 0.92, 0, 1),
    strokeWidth: clampNumber(source.strokeWidth, 1.3, 0.4, 8),
    pattern: normalizePatternId(source.pattern, "solid"),
    patternOpacity: clampNumber(source.patternOpacity, 0.42, 0, 1),
    revision: Math.max(1, Math.round(Number(source.revision) || 1)),
  };
}

function createEmptySpecialZoneLayersState({ topologyFingerprint = "" } = {}) {
  return {
    version: SPECIAL_ZONE_LAYER_VERSION,
    layers: [],
    activeLayerId: "",
    storySteps: [],
    activeStoryStepId: "",
    topologyFingerprint: String(topologyFingerprint || "").trim(),
    diagnostics: [],
  };
}

function resolveSpecialZoneTopologyFingerprint(runtimeState = {}) {
  const baselineHash = String(runtimeState?.scenarioBaselineHash || "").trim();
  if (baselineHash) return baselineHash;
  return String(runtimeState?.activeScenarioManifest?.source?.runtime_topology_sha256 || "").trim();
}

function normalizeMemberFeatureIds(rawIds, diagnostics, validFeatureIds = null) {
  const seen = new Set();
  const ids = Array.isArray(rawIds) ? rawIds : [];
  ids.forEach((value) => {
    const id = String(value || "").trim();
    if (!id) return;
    if (validFeatureIds && !validFeatureIds.has(id)) {
      diagnostics.push({ code: "invalid_feature_id", featureId: id });
      return;
    }
    seen.add(id);
  });
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function dedupeSpecialZoneDiagnostics(entries) {
  const seen = new Set();
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry === "object")
    .filter((entry) => {
      const key = JSON.stringify(entry);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeSpecialZoneLayer(rawLayer, index, diagnostics, options = {}) {
  const raw = rawLayer && typeof rawLayer === "object" ? rawLayer : {};
  const presetId = String(raw.presetId || raw.preset || "custom").trim() || "custom";
  const preset = SPECIAL_ZONE_PRESET_BY_ID.get(presetId) || SPECIAL_ZONE_PRESET_BY_ID.get("custom");
  const id = String(raw.id || `special-zone-layer-${index + 1}`).trim();
  if (!id) return null;
  const source = String(raw.source || options.defaultSource || "project").trim();
  const normalizedSource = SPECIAL_ZONE_SOURCES.has(source) ? source : "project";
  const members = normalizeMemberFeatureIds(raw.memberFeatureIds, diagnostics, options.validFeatureIds || null);
  return {
    id,
    name: String(raw.name || preset.name || id).trim() || id,
    presetId: SPECIAL_ZONE_PRESET_BY_ID.has(presetId) ? presetId : "custom",
    category: String(raw.category || preset.category || "custom").trim() || "custom",
    source: normalizedSource,
    visible: raw.visible === undefined ? true : !!raw.visible,
    legendVisible: raw.legendVisible === undefined ? true : !!raw.legendVisible,
    style: createSpecialZoneLayerStyle({ ...(preset.style || {}), ...(raw.style || {}) }),
    memberFeatureIds: members,
  };
}

function normalizeSpecialZoneStoryStep(rawStep, index, validLayerIds = new Set()) {
  const raw = rawStep && typeof rawStep === "object" ? rawStep : {};
  const id = String(raw.id || `special-zone-story-step-${index + 1}`).trim();
  if (!id) return null;
  const layerIds = Array.from(new Set(
    (Array.isArray(raw.layerIds) ? raw.layerIds : [])
      .map((value) => String(value || "").trim())
      .filter((value) => value && (!validLayerIds.size || validLayerIds.has(value)))
  ));
  return {
    id,
    title: String(raw.title || `Step ${index + 1}`).trim() || `Step ${index + 1}`,
    description: String(raw.description || "").trim(),
    layerIds,
    focusFeatureId: String(raw.focusFeatureId || "").trim(),
    showLegend: raw.showLegend === undefined ? true : !!raw.showLegend,
  };
}

function normalizeSpecialZoneStoryState(rawState, layers = []) {
  const raw = rawState && typeof rawState === "object" ? rawState : {};
  const validLayerIds = new Set(layers.map((layer) => layer.id));
  const seen = new Set();
  const storySteps = (Array.isArray(raw.storySteps) ? raw.storySteps : [])
    .slice(0, SPECIAL_ZONE_STORY_MAX_STEPS)
    .map((step, index) => normalizeSpecialZoneStoryStep(step, index, validLayerIds))
    .filter(Boolean)
    .filter((step) => {
      if (seen.has(step.id)) return false;
      seen.add(step.id);
      return true;
    });
  const activeStoryStepId = storySteps.some((step) => step.id === raw.activeStoryStepId)
    ? String(raw.activeStoryStepId)
    : (storySteps[0]?.id || "");
  return { storySteps, activeStoryStepId };
}

function normalizeSpecialZoneLayersState(rawState, options = {}) {
  const diagnostics = [];
  const raw = rawState && typeof rawState === "object" ? rawState : {};
  const validFeatureIds = options.validFeatureIds instanceof Set ? options.validFeatureIds : null;
  const expectedFingerprint = String(options.topologyFingerprint || "").trim();
  const stateFingerprint = String(raw.topologyFingerprint || "").trim();
  if (expectedFingerprint && stateFingerprint && expectedFingerprint !== stateFingerprint) {
    diagnostics.push({
      code: "topology_fingerprint_mismatch",
      expected: expectedFingerprint,
      actual: stateFingerprint,
    });
  }
  if (raw.manualSpecialZones || raw.specialRegionOverrides || raw.special_regions_url || raw.specialRegionsPayload) {
    diagnostics.push({ code: "legacy_special_zone_fields_dropped" });
  }
  const seenLayerIds = new Set();
  const layers = (Array.isArray(raw.layers) ? raw.layers : [])
    .map((layer, index) => normalizeSpecialZoneLayer(layer, index, diagnostics, {
      defaultSource: options.defaultSource,
      validFeatureIds,
    }))
    .filter(Boolean)
    .filter((layer) => {
      if (seenLayerIds.has(layer.id)) {
        diagnostics.push({ code: "duplicate_layer_id_dropped", layerId: layer.id });
        return false;
      }
      seenLayerIds.add(layer.id);
      return true;
    });
  const activeLayerId = layers.some((layer) => layer.id === raw.activeLayerId)
    ? String(raw.activeLayerId)
    : (layers[0]?.id || "");
  const story = normalizeSpecialZoneStoryState(raw, layers);
  return {
    version: SPECIAL_ZONE_LAYER_VERSION,
    layers,
    activeLayerId,
    storySteps: story.storySteps,
    activeStoryStepId: story.activeStoryStepId,
    topologyFingerprint: expectedFingerprint || stateFingerprint,
    diagnostics: dedupeSpecialZoneDiagnostics([
      ...diagnostics,
      ...(Array.isArray(raw.diagnostics) ? raw.diagnostics : []),
    ]),
  };
}

function serializeSpecialZoneLayersState(rawState, options = {}) {
  const normalized = normalizeSpecialZoneLayersState(rawState, options);
  return {
    version: SPECIAL_ZONE_LAYER_VERSION,
    layers: normalized.layers.map((layer) => ({
      ...layer,
      legendVisible: layer.legendVisible !== false,
      style: { ...layer.style },
      memberFeatureIds: [...layer.memberFeatureIds].sort((a, b) => a.localeCompare(b)),
    })),
    activeLayerId: normalized.activeLayerId,
    storySteps: normalized.storySteps.map((step) => ({
      ...step,
      layerIds: [...step.layerIds],
    })),
    activeStoryStepId: normalized.activeStoryStepId,
    topologyFingerprint: normalized.topologyFingerprint,
    diagnostics: [...normalized.diagnostics],
  };
}

function ensureSpecialZoneLayersState(target) {
  const normalized = normalizeSpecialZoneLayersState(target?.specialZoneLayers || target || null);
  if (target && Object.prototype.hasOwnProperty.call(target, "specialZoneLayers")) {
    target.specialZoneLayers = normalized;
  }
  return normalized;
}

function normalizeRuntimeSpecialZoneLayersState(target, options = {}) {
  const normalized = normalizeSpecialZoneLayersState(target?.specialZoneLayers || null, options);
  if (target && typeof target === "object") {
    target.specialZoneLayers = normalized;
  }
  return normalized;
}

function setRuntimeSpecialZoneLayersState(target, nextState, options = {}) {
  const normalized = normalizeSpecialZoneLayersState(nextState, options);
  if (target && typeof target === "object") {
    target.specialZoneLayers = normalized;
  }
  return normalized;
}

function mutateRuntimeSpecialZoneLayersState(target, mutation, options = {}) {
  const current = normalizeRuntimeSpecialZoneLayersState(target, options);
  const nextState = mutateSpecialZoneLayersState(current, mutation);
  if (target && typeof target === "object") {
    target.specialZoneLayers = nextState;
    target.specialZonesOverlayDirty = true;
  }
  return nextState;
}

function activateSpecialZoneMembershipToolState(target, tool = "multi") {
  if (!target || typeof target !== "object") return null;
  const normalizedTool = String(tool || "multi").trim() || "multi";
  target.specialZoneMembershipTool = normalizedTool;
  if (target.currentTool !== "special-zone-membership") {
    target.specialZonePreviousTool = target.currentTool || "fill";
  }
  target.currentTool = "special-zone-membership";
  target.brushModeEnabled = false;
  target.specialZoneEditor = { ...(target.specialZoneEditor || {}), active: false };
  return normalizedTool;
}

function exitSpecialZoneMembershipToolState(target) {
  if (!target || typeof target !== "object") return "";
  const previousTool = target.specialZonePreviousTool || "fill";
  target.currentTool = previousTool;
  target.specialZonePreviousTool = "";
  return previousTool;
}


function normalizeSpecialZoneMembershipBrushModeState(value) {
  const mode = String(value || "add").trim();
  return SPECIAL_ZONE_MEMBERSHIP_BRUSH_MODES.has(mode) ? mode : "add";
}

function getSpecialZoneLegendLayers(rawState) {
  return normalizeSpecialZoneLayersState(rawState).layers
    .filter((layer) => layer.visible !== false && layer.legendVisible !== false);
}

function getSpecialZoneLegendSignature(rawState) {
  return getSpecialZoneLegendLayers(rawState)
    .map((layer) => [
      layer.id,
      layer.name,
      layer.legendVisible !== false ? "1" : "0",
      layer.style?.fill || "",
      layer.style?.stroke || "",
      layer.style?.pattern || "",
    ].join(":"))
    .join("|");
}

function parseSpecialZoneMemberImportText(text = "") {
  return Array.from(new Set(
    String(text || "")
      .split(/[\s,;]+/)
      .map((value) => value.trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));
}

function getSpecialZoneLayerMemberSetOperationIds(targetIds = [], sourceIds = [], operation = "union") {
  const target = new Set((Array.isArray(targetIds) ? targetIds : []).map((value) => String(value || "").trim()).filter(Boolean));
  const source = new Set((Array.isArray(sourceIds) ? sourceIds : []).map((value) => String(value || "").trim()).filter(Boolean));
  const op = String(operation || "union").trim();
  if (op === "subtract") {
    source.forEach((id) => target.delete(id));
    return Array.from(target).sort((a, b) => a.localeCompare(b));
  }
  if (op === "intersect") {
    return Array.from(target).filter((id) => source.has(id)).sort((a, b) => a.localeCompare(b));
  }
  source.forEach((id) => target.add(id));
  return Array.from(target).sort((a, b) => a.localeCompare(b));
}

function getSpecialZoneStoryPreviewSteps(rawState) {
  const normalized = normalizeSpecialZoneLayersState(rawState);
  if (normalized.storySteps.length) {
    return normalized.storySteps.map((step, index) => ({
      ...step,
      index,
      layers: step.layerIds
        .map((layerId) => normalized.layers.find((layer) => layer.id === layerId))
        .filter(Boolean),
    }));
  }
  return normalized.layers
    .filter((layer) => layer.visible !== false)
    .slice(0, SPECIAL_ZONE_STORY_MAX_STEPS)
    .map((layer, index) => ({
      id: `auto-${layer.id}`,
      title: layer.name || layer.id,
      description: `${layer.memberFeatureIds.length} members`,
      layerIds: [layer.id],
      focusFeatureId: layer.memberFeatureIds[0] || "",
      showLegend: layer.legendVisible !== false,
      index,
      layers: [layer],
    }));
}

function applySpecialZoneStoryStepToPreviewState(rawState, stepId) {
  const normalized = normalizeSpecialZoneLayersState(rawState);
  const steps = getSpecialZoneStoryPreviewSteps(normalized);
  const step = steps.find((entry) => entry.id === stepId) || steps[0] || null;
  const visibleLayerIds = new Set(step?.layerIds || []);
  return {
    ...normalized,
    activeStoryStepId: step?.id || "",
    layers: normalized.layers.map((layer) => ({
      ...layer,
      visible: visibleLayerIds.size ? visibleLayerIds.has(layer.id) : layer.visible,
    })),
  };
}

function createSpecialZonePatternPreviewStyle(style = {}) {
  const fill = normalizeHexColor(style.fill, "#8b5cf6");
  const stroke = normalizeHexColor(style.stroke, "#6d28d9");
  const pattern = normalizePatternId(style.pattern, "solid");
  const opacity = clampNumber(style.fillOpacity, 0.32, 0, 1);
  const stripe = `linear-gradient(135deg, transparent 0 42%, ${stroke} 42% 52%, transparent 52% 100%)`;
  const dot = `radial-gradient(circle at 35% 35%, ${stroke} 0 2px, transparent 2.5px)`;
  const patternLayer = pattern === "dots" || pattern === "denseDots"
    ? dot
    : pattern === "solid"
      ? "none"
      : stripe;
  return {
    backgroundColor: fill,
    backgroundImage: patternLayer,
    borderColor: stroke,
    opacity: String(Math.max(0.24, opacity)),
  };
}

function setSpecialZoneMembershipBrushModeState(target, mode = "add") {
  if (!target || typeof target !== "object") return "";
  target.specialZoneMembershipBrushMode = normalizeSpecialZoneMembershipBrushModeState(mode);
  return target.specialZoneMembershipBrushMode;
}

function setSpecialZonePresetCategoryState(target, category = "all") {
  if (!target || typeof target !== "object") return "";
  target.specialZonePresetCategory = String(category || "all").trim() || "all";
  return target.specialZonePresetCategory;
}

function registerSpecialZonesWorkbenchRuntimeHooks(target, hooks = {}) {
  if (!target || typeof target !== "object") return;
  if (typeof hooks.renderWorkbench === "function") {
    target.updateSpecialZonesWorkbenchUIFn = hooks.renderWorkbench;
  }
  if (typeof hooks.renderCurrentTarget === "function") {
    target.updateSpecialZonesWorkbenchCurrentTargetUIFn = hooks.renderCurrentTarget;
  }
}

function createLayerFromPreset(presetId = "custom", patch = {}) {
  const preset = SPECIAL_ZONE_PRESET_BY_ID.get(String(presetId || "").trim()) || SPECIAL_ZONE_PRESET_BY_ID.get("custom");
  return normalizeSpecialZoneLayer({
    id: patch.id || `special-zone-${preset.id}-${Date.now().toString(36)}`,
    name: patch.name || preset.name,
    presetId: preset.id,
    category: patch.category || preset.category,
    source: patch.source || "project",
    visible: patch.visible,
    legendVisible: patch.legendVisible,
    style: { ...preset.style, ...(patch.style || {}) },
    memberFeatureIds: patch.memberFeatureIds || [],
  }, 0, [], { defaultSource: patch.source || "project" });
}

function updateSpecialZoneLayerMembership(state, layerId, featureIds, mode = "toggle") {
  const normalized = normalizeSpecialZoneLayersState(state);
  const ids = (Array.isArray(featureIds) ? featureIds : [featureIds])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const layer = normalized.layers.find((entry) => entry.id === layerId) || normalized.layers.find((entry) => entry.id === normalized.activeLayerId);
  if (!layer) return normalized;
  if (mode === "replace") {
    layer.memberFeatureIds = ids.sort((a, b) => a.localeCompare(b));
    return normalized;
  }
  if (!ids.length) return normalized;
  const members = new Set(layer.memberFeatureIds);
  ids.forEach((id) => {
    if (mode === "add") members.add(id);
    else if (mode === "remove") members.delete(id);
    else if (members.has(id)) members.delete(id);
    else members.add(id);
  });
  layer.memberFeatureIds = Array.from(members).sort((a, b) => a.localeCompare(b));
  return normalized;
}

function mutateSpecialZoneLayersState(state, mutation) {
  const normalized = normalizeSpecialZoneLayersState(state);
  const action = String(mutation?.action || "").trim();
  if (action === "addLayer") {
    const nextLayer = normalizeSpecialZoneLayer(mutation.layer || createLayerFromPreset(mutation.presetId, mutation), normalized.layers.length, normalized.diagnostics);
    if (nextLayer && !normalized.layers.some((layer) => layer.id === nextLayer.id)) {
      normalized.layers.push(nextLayer);
      normalized.activeLayerId = nextLayer.id;
    }
  } else if (action === "deleteLayer") {
    const id = String(mutation.layerId || normalized.activeLayerId || "").trim();
    normalized.layers = normalized.layers.filter((layer) => layer.id !== id);
    normalized.activeLayerId = normalized.layers.some((layer) => layer.id === normalized.activeLayerId)
      ? normalized.activeLayerId
      : (normalized.layers[0]?.id || "");
  } else if (action === "setActiveLayer") {
    const id = String(mutation.layerId || "").trim();
    if (normalized.layers.some((layer) => layer.id === id)) {
      normalized.activeLayerId = id;
    }
  } else if (action === "updateLayer") {
    const id = String(mutation.layerId || normalized.activeLayerId || "").trim();
    normalized.layers = normalized.layers.map((layer) => layer.id === id
      ? normalizeSpecialZoneLayer({ ...layer, ...(mutation.patch || {}), style: { ...layer.style, ...(mutation.patch?.style || {}) } }, 0, normalized.diagnostics)
      : layer);
  } else if (action === "duplicateLayer") {
    const id = String(mutation.layerId || normalized.activeLayerId || "").trim();
    const source = normalized.layers.find((layer) => layer.id === id);
    if (source) {
      const copy = normalizeSpecialZoneLayer({
        ...source,
        id: mutation.newLayerId || `${source.id}-copy`,
        name: mutation.name || `${source.name} Copy`,
      }, normalized.layers.length, normalized.diagnostics);
      if (copy && !normalized.layers.some((layer) => layer.id === copy.id)) {
        normalized.layers.push(copy);
        normalized.activeLayerId = copy.id;
      }
    }
  } else if (action === "reorderLayers") {
    const order = Array.isArray(mutation.layerIds) ? mutation.layerIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
    const byId = new Map(normalized.layers.map((layer) => [layer.id, layer]));
    normalized.layers = [...order.filter((id) => byId.has(id)).map((id) => byId.get(id)), ...normalized.layers.filter((layer) => !order.includes(layer.id))];
  } else if (["addMembers", "removeMembers", "toggleMembers", "replaceMembers"].includes(action)) {
    const mode = action === "addMembers" ? "add" : action === "removeMembers" ? "remove" : action === "replaceMembers" ? "replace" : "toggle";
    return updateSpecialZoneLayerMembership(normalized, mutation.layerId, mutation.featureIds, mode);
  } else if (action === "applyMemberSetOperation") {
    const id = String(mutation.layerId || normalized.activeLayerId || "").trim();
    const sourceId = String(mutation.sourceLayerId || "").trim();
    const target = normalized.layers.find((layer) => layer.id === id);
    const source = normalized.layers.find((layer) => layer.id === sourceId);
    if (target && source) {
      return updateSpecialZoneLayerMembership(normalized, id, getSpecialZoneLayerMemberSetOperationIds(
        target.memberFeatureIds,
        source.memberFeatureIds,
        mutation.operation
      ), "replace");
    }
  } else if (action === "setStorySteps") {
    const story = normalizeSpecialZoneStoryState({
      storySteps: mutation.storySteps,
      activeStoryStepId: mutation.activeStoryStepId,
    }, normalized.layers);
    normalized.storySteps = story.storySteps;
    normalized.activeStoryStepId = story.activeStoryStepId;
  } else if (action === "setActiveStoryStep") {
    const id = String(mutation.storyStepId || "").trim();
    if (normalized.storySteps.some((step) => step.id === id)) {
      normalized.activeStoryStepId = id;
    }
  }
  return normalizeSpecialZoneLayersState(normalized);
}

function buildSpecialZoneRenderFeatures(layerState, featureById) {
  const normalized = normalizeSpecialZoneLayersState(layerState);
  const resolveFeature = typeof featureById === "function"
    ? featureById
    : (id) => featureById?.get?.(id) || null;
  const features = [];
  normalized.layers.forEach((layer, layerIndex) => {
    if (!layer.visible) return;
    layer.memberFeatureIds.forEach((featureId) => {
      const feature = resolveFeature(featureId);
      if (!feature?.geometry) return;
      features.push({
        ...feature,
        properties: {
          ...(feature.properties || {}),
          id: `${layer.id}:${featureId}`,
          sourceFeatureId: featureId,
          __source: "special_zone_layer",
          __specialZoneLayerId: layer.id,
          __specialZoneLayerIndex: layerIndex,
          __specialZoneLayerStyle: layer.style,
          type: layer.presetId,
        },
      });
    });
  });
  return { type: "FeatureCollection", features };
}

export {
  SPECIAL_ZONE_LAYER_VERSION,
  SPECIAL_ZONE_LAYER_DIAGNOSTIC_CODES,
  SPECIAL_ZONE_PATTERN_IDS,
  SPECIAL_ZONE_PRESETS,
  buildSpecialZoneRenderFeatures,
  createSpecialZonePatternPreviewStyle,
  createEmptySpecialZoneLayersState,
  createLayerFromPreset,
  createSpecialZoneLayerStyle,
  activateSpecialZoneMembershipToolState,
  applySpecialZoneStoryStepToPreviewState,
  ensureSpecialZoneLayersState,
  exitSpecialZoneMembershipToolState,
  getSpecialZoneLayerMemberSetOperationIds,
  getSpecialZoneLegendLayers,
  getSpecialZoneLegendSignature,
  getSpecialZoneStoryPreviewSteps,
  mutateSpecialZoneLayersState,
  mutateRuntimeSpecialZoneLayersState,
  normalizeRuntimeSpecialZoneLayersState,
  normalizeSpecialZoneLayersState,
  normalizeSpecialZoneMembershipBrushModeState,
  normalizeSpecialZoneStoryState,
  parseSpecialZoneMemberImportText,
  registerSpecialZonesWorkbenchRuntimeHooks,
  resolveSpecialZoneTopologyFingerprint,
  serializeSpecialZoneLayersState,
  setRuntimeSpecialZoneLayersState,
  setSpecialZoneMembershipBrushModeState,
  setSpecialZonePresetCategoryState,
  updateSpecialZoneLayerMembership,
};
