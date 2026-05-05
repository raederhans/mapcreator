// Layer-based Special Zones workbench controller.
// 这个控制器只管理 special zone layer UI；toolbar.js 继续负责弹层、焦点和跨面板仲裁。

import {
  SPECIAL_ZONE_PATTERN_IDS,
  SPECIAL_ZONE_PRESETS,
  createLayerFromPreset,
  mutateSpecialZoneLayersState,
  normalizeSpecialZoneLayersState,
  serializeSpecialZoneLayersState,
} from "../../core/special_zone_layers.js";

function createButton(label, className = "secondary-btn") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

function createLabel(text, control) {
  const label = document.createElement("label");
  label.className = "special-zone-workbench-field";
  const span = document.createElement("span");
  span.textContent = text;
  label.append(span, control);
  return label;
}

function featureIdFromDevSelectionEntry(entry) {
  return String(entry?.featureId || entry?.id || entry || "").trim();
}

function createSpecialZonesWorkbenchController({
  runtimeState,
  container = null,
  markDirty,
  render,
  updateToolUI,
  captureHistoryState,
  pushHistoryEntry,
  ensureActiveScenarioOptionalLayerLoaded,
  showToast,
  t,
} = {}) {
  let root = null;
  let statusNode = null;
  let layerListNode = null;
  let presetListNode = null;
  let propertyNode = null;
  let actionsNode = null;
  let loadedScenarioLayerAssetId = "";

  const translate = (value) => (typeof t === "function" ? t(value, "ui") : value);

  const normalizeState = () => {
    runtimeState.specialZoneLayers = normalizeSpecialZoneLayersState(runtimeState.specialZoneLayers, {
      defaultSource: runtimeState.activeScenarioId ? "scenario" : "project",
    });
    return runtimeState.specialZoneLayers;
  };

  const activeLayer = () => {
    const state = normalizeState();
    return state.layers.find((layer) => layer.id === state.activeLayerId) || state.layers[0] || null;
  };

  const getDevSelectionFeatureIds = () => {
    const ordered = Array.isArray(runtimeState.devSelectionOrder) ? runtimeState.devSelectionOrder : [];
    const indexed = runtimeState.devSelectionIds instanceof Set ? Array.from(runtimeState.devSelectionIds) : [];
    return Array.from(new Set([...ordered, ...indexed].map(featureIdFromDevSelectionEntry).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  };

  const getCountryFeatureIds = (countryId) => {
    const normalizedCountry = String(countryId || "").trim().toUpperCase();
    if (!normalizedCountry) return [];
    const candidateIds = [
      ...(runtimeState.ownerToFeatureIds instanceof Map ? runtimeState.ownerToFeatureIds.get(normalizedCountry) || [] : []),
      ...(runtimeState.countryToFeatureIds instanceof Map ? runtimeState.countryToFeatureIds.get(normalizedCountry) || [] : []),
    ];
    const validIds = candidateIds.filter((featureId) => runtimeState.landIndex?.has?.(featureId));
    return Array.from(new Set(validIds)).sort((a, b) => a.localeCompare(b));
  };

  const updateState = (mutation, label = "special-zone-layers") => {
    const before = typeof captureHistoryState === "function"
      ? captureHistoryState({ strategicOverlay: true })
      : null;
    runtimeState.specialZoneLayers = mutateSpecialZoneLayersState(normalizeState(), mutation);
    runtimeState.specialZonesOverlayDirty = true;
    markDirty?.(label);
    if (typeof pushHistoryEntry === "function") {
      pushHistoryEntry({
        kind: label,
        before,
        after: typeof captureHistoryState === "function" ? captureHistoryState({ strategicOverlay: true }) : null,
      });
    }
    render?.();
    renderSpecialZonesWorkbenchUi();
  };

  const ensureRoot = () => {
    if (!container) return null;
    root = container.querySelector("[data-special-zone-layers-workbench]");
    if (root) return root;
    root = document.createElement("section");
    root.dataset.specialZoneLayersWorkbench = "true";
    root.className = "special-zone-layers-workbench";
    root.setAttribute("aria-label", translate("Special zone layers workbench"));

    const header = document.createElement("div");
    header.className = "special-zone-workbench-header";
    const title = document.createElement("h3");
    title.textContent = translate("Layer-based special zones");
    statusNode = document.createElement("p");
    statusNode.className = "special-zone-workbench-status";
    statusNode.setAttribute("aria-live", "polite");
    header.append(title, statusNode);

    const layout = document.createElement("div");
    layout.className = "special-zone-workbench-grid";
    layerListNode = document.createElement("div");
    presetListNode = document.createElement("div");
    propertyNode = document.createElement("div");
    actionsNode = document.createElement("div");
    [layerListNode, presetListNode, propertyNode, actionsNode].forEach((node) => {
      node.className = "special-zone-workbench-card";
      layout.appendChild(node);
    });
    root.append(header, layout);
    container.prepend(root);
    return root;
  };

  const renderLayerList = (state) => {
    if (!layerListNode) return;
    layerListNode.replaceChildren();
    const title = document.createElement("h4");
    title.textContent = translate("Layers");
    layerListNode.appendChild(title);
    if (!state.layers.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = translate("Create a preset or custom layer to start editing map membership.");
      layerListNode.appendChild(empty);
      return;
    }
    state.layers.forEach((layer, index) => {
      const row = document.createElement("div");
      row.className = "special-zone-layer-row";
      if (layer.id === state.activeLayerId) row.classList.add("is-active");
      const selectBtn = createButton(`${layer.visible ? "●" : "○"} ${layer.name} (${layer.memberFeatureIds.length})`);
      selectBtn.setAttribute("aria-pressed", String(layer.id === state.activeLayerId));
      selectBtn.addEventListener("click", () => updateState({ action: "setActiveLayer", layerId: layer.id }, "special-zone-active-layer"));
      const visibilityBtn = createButton(layer.visible ? translate("Hide") : translate("Show"));
      visibilityBtn.addEventListener("click", () => updateState({ action: "updateLayer", layerId: layer.id, patch: { visible: !layer.visible } }, "special-zone-layer-visible"));
      const upBtn = createButton("↑");
      upBtn.disabled = index === 0;
      upBtn.addEventListener("click", () => {
        const order = state.layers.map((entry) => entry.id);
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        updateState({ action: "reorderLayers", layerIds: order }, "special-zone-layer-reorder");
      });
      const downBtn = createButton("↓");
      downBtn.disabled = index === state.layers.length - 1;
      downBtn.addEventListener("click", () => {
        const order = state.layers.map((entry) => entry.id);
        [order[index + 1], order[index]] = [order[index], order[index + 1]];
        updateState({ action: "reorderLayers", layerIds: order }, "special-zone-layer-reorder");
      });
      row.append(selectBtn, visibilityBtn, upBtn, downBtn);
      layerListNode.appendChild(row);
    });
  };

  const renderPresetList = () => {
    if (!presetListNode) return;
    presetListNode.replaceChildren();
    const title = document.createElement("h4");
    title.textContent = translate("Preset library");
    presetListNode.appendChild(title);
    const grid = document.createElement("div");
    grid.className = "special-zone-preset-grid";
    SPECIAL_ZONE_PRESETS.forEach((preset) => {
      const button = createButton(preset.name);
      button.title = preset.category;
      button.style.borderColor = preset.style.stroke;
      button.addEventListener("click", () => {
        const source = runtimeState.activeScenarioId ? "scenario" : "project";
        updateState({ action: "addLayer", layer: createLayerFromPreset(preset.id, { source }) }, "special-zone-layer-add");
      });
      grid.appendChild(button);
    });
    presetListNode.appendChild(grid);
  };

  const renderProperties = (layer) => {
    if (!propertyNode) return;
    propertyNode.replaceChildren();
    const title = document.createElement("h4");
    title.textContent = translate("Active layer");
    propertyNode.appendChild(title);
    if (!layer) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = translate("No active special zone layer.");
      propertyNode.appendChild(empty);
      return;
    }
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = layer.name;
    nameInput.addEventListener("change", () => updateState({ action: "updateLayer", layerId: layer.id, patch: { name: nameInput.value } }, "special-zone-layer-name"));

    const fillInput = document.createElement("input");
    fillInput.type = "color";
    fillInput.value = layer.style.fill;
    fillInput.addEventListener("input", () => updateState({ action: "updateLayer", layerId: layer.id, patch: { style: { fill: fillInput.value, revision: layer.style.revision + 1 } } }, "special-zone-layer-style"));

    const strokeInput = document.createElement("input");
    strokeInput.type = "color";
    strokeInput.value = layer.style.stroke;
    strokeInput.addEventListener("input", () => updateState({ action: "updateLayer", layerId: layer.id, patch: { style: { stroke: strokeInput.value, revision: layer.style.revision + 1 } } }, "special-zone-layer-style"));

    const opacityInput = document.createElement("input");
    opacityInput.type = "range";
    opacityInput.min = "0";
    opacityInput.max = "100";
    opacityInput.value = String(Math.round(layer.style.fillOpacity * 100));
    opacityInput.addEventListener("input", () => updateState({ action: "updateLayer", layerId: layer.id, patch: { style: { fillOpacity: Number(opacityInput.value) / 100, revision: layer.style.revision + 1 } } }, "special-zone-layer-style"));

    const patternSelect = document.createElement("select");
    SPECIAL_ZONE_PATTERN_IDS.forEach((patternId) => {
      const option = document.createElement("option");
      option.value = patternId;
      option.textContent = patternId;
      patternSelect.appendChild(option);
    });
    patternSelect.value = layer.style.pattern;
    patternSelect.addEventListener("change", () => updateState({ action: "updateLayer", layerId: layer.id, patch: { style: { pattern: patternSelect.value, revision: layer.style.revision + 1 } } }, "special-zone-layer-style"));

    const strokeWidth = document.createElement("input");
    strokeWidth.type = "number";
    strokeWidth.min = "0.4";
    strokeWidth.max = "8";
    strokeWidth.step = "0.1";
    strokeWidth.value = String(layer.style.strokeWidth);
    strokeWidth.addEventListener("change", () => updateState({ action: "updateLayer", layerId: layer.id, patch: { style: { strokeWidth: Number(strokeWidth.value), revision: layer.style.revision + 1 } } }, "special-zone-layer-style"));

    propertyNode.append(
      createLabel(translate("Name"), nameInput),
      createLabel(translate("Fill"), fillInput),
      createLabel(translate("Stroke"), strokeInput),
      createLabel(translate("Opacity"), opacityInput),
      createLabel(translate("Pattern"), patternSelect),
      createLabel(translate("Stroke width"), strokeWidth)
    );
  };

  const renderActions = (state, layer) => {
    if (!actionsNode) return;
    actionsNode.replaceChildren();
    const title = document.createElement("h4");
    title.textContent = translate("Bulk actions and save");
    actionsNode.appendChild(title);
    const toolBtn = createButton(translate("Edit map membership"));
    toolBtn.disabled = !layer;
    toolBtn.addEventListener("click", () => {
      if (runtimeState.currentTool !== "special-zone-membership") {
        runtimeState.specialZonePreviousTool = runtimeState.currentTool || "fill";
      }
      runtimeState.currentTool = "special-zone-membership";
      runtimeState.brushModeEnabled = false;
      runtimeState.specialZoneEditor = { ...(runtimeState.specialZoneEditor || {}), active: false };
      updateToolUI?.();
      statusNode.textContent = translate("Membership tool active. Click a land tile to toggle it; Alt-click removes it.");
    });
    const exitToolBtn = createButton(translate("Exit membership tool"));
    exitToolBtn.addEventListener("click", () => {
      runtimeState.currentTool = runtimeState.specialZonePreviousTool || "fill";
      runtimeState.specialZonePreviousTool = "";
      updateToolUI?.();
      statusNode.textContent = translate("Membership tool closed.");
    });

    const addSelectionBtn = createButton(translate("Add dev selection"));
    addSelectionBtn.disabled = !layer || !getDevSelectionFeatureIds().length;
    addSelectionBtn.addEventListener("click", () => updateState({ action: "addMembers", layerId: layer.id, featureIds: getDevSelectionFeatureIds() }, "special-zone-members-add-selection"));

    const replaceSelectionBtn = createButton(translate("Replace with dev selection"));
    replaceSelectionBtn.disabled = addSelectionBtn.disabled;
    replaceSelectionBtn.addEventListener("click", () => updateState({ action: "replaceMembers", layerId: layer.id, featureIds: getDevSelectionFeatureIds() }, "special-zone-members-replace-selection"));

    const countryInput = document.createElement("input");
    countryInput.type = "text";
    countryInput.placeholder = translate("Country / owner id");
    const addCountryBtn = createButton(translate("Add country / owner"));
    addCountryBtn.disabled = !layer;
    addCountryBtn.addEventListener("click", () => {
      const ids = getCountryFeatureIds(countryInput.value);
      updateState({ action: "addMembers", layerId: layer.id, featureIds: ids }, "special-zone-members-add-country");
      statusNode.textContent = `${ids.length} ${translate("features added from country / owner filter.")}`;
    });

    const copySelect = document.createElement("select");
    state.layers.filter((entry) => entry.id !== layer?.id).forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.name;
      copySelect.appendChild(option);
    });
    const copyBtn = createButton(translate("Copy members from layer"));
    copyBtn.disabled = !layer || !copySelect.options.length;
    copyBtn.addEventListener("click", () => {
      const source = state.layers.find((entry) => entry.id === copySelect.value);
      updateState({ action: "replaceMembers", layerId: layer.id, featureIds: source?.memberFeatureIds || [] }, "special-zone-members-copy");
    });

    const duplicateBtn = createButton(translate("Duplicate layer"));
    duplicateBtn.disabled = !layer;
    duplicateBtn.addEventListener("click", () => updateState({ action: "duplicateLayer", layerId: layer.id }, "special-zone-layer-duplicate"));

    const clearBtn = createButton(translate("Clear members"));
    clearBtn.disabled = !layer || !layer.memberFeatureIds.length;
    clearBtn.addEventListener("click", () => updateState({ action: "replaceMembers", layerId: layer.id, featureIds: [] }, "special-zone-members-clear"));

    const deleteBtn = createButton(translate("Delete layer"), "danger-btn");
    deleteBtn.disabled = !layer;
    deleteBtn.addEventListener("click", () => updateState({ action: "deleteLayer", layerId: layer.id }, "special-zone-layer-delete"));

    const saveBtn = createButton(translate("Save scenario layer asset"));
    saveBtn.disabled = !runtimeState.activeScenarioId;
    saveBtn.addEventListener("click", async () => {
      const scenarioId = String(runtimeState.activeScenarioId || "").trim();
      if (!scenarioId) return;
      try {
        if (loadedScenarioLayerAssetId !== scenarioId) {
          await loadScenarioSpecialZoneLayers();
          if (loadedScenarioLayerAssetId !== scenarioId) {
            throw new Error("Scenario special zone layer asset load unavailable.");
          }
          showToast?.(translate("Scenario special zone layers loaded. Review changes before saving."), {
            title: translate("Special zones loaded"),
            tone: "warning",
          });
          return;
        }
        const response = await fetch("/__dev/scenario/special-zone-layers/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId, specialZoneLayers: serializeSpecialZoneLayersState(normalizeState()) }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!result?.ok) throw new Error(result?.error || "Scenario special zone save failed.");
        runtimeState.specialZoneLayers = normalizeSpecialZoneLayersState(result.specialZoneLayers || normalizeState(), { defaultSource: "scenario" });
        showToast?.(translate("Scenario special zone layers saved."), { title: translate("Special zones saved"), tone: "success" });
      } catch (error) {
        console.warn("[special-zone-layers] Scenario save unavailable.", error);
        showToast?.(translate("Scenario layer asset save is available only in the local dev server."), { title: translate("Read-only scenario asset"), tone: "warning" });
      }
    });

    actionsNode.append(toolBtn, exitToolBtn, addSelectionBtn, replaceSelectionBtn, countryInput, addCountryBtn, copySelect, copyBtn, duplicateBtn, clearBtn, deleteBtn, saveBtn);
  };

  const renderSpecialZonesWorkbenchUi = () => {
    if (!ensureRoot()) return;
    const state = normalizeState();
    const layer = activeLayer();
    if (statusNode) {
      statusNode.textContent = layer
        ? `${state.layers.length} ${translate("layers")}, ${layer.memberFeatureIds.length} ${translate("active members")}.`
        : translate("No special zone layers yet.");
    }
    renderLayerList(state);
    renderPresetList();
    renderProperties(layer);
    renderActions(state, layer);
  };

  const bindSpecialZonesWorkbenchEvents = () => {
    ensureRoot();
  };

  const loadScenarioSpecialZoneLayers = async () => {
    const scenarioId = String(runtimeState.activeScenarioId || "").trim();
    if (!scenarioId) {
      loadedScenarioLayerAssetId = "";
      return null;
    }
    if (loadedScenarioLayerAssetId === scenarioId) return runtimeState.specialZoneLayers;
    if (typeof ensureActiveScenarioOptionalLayerLoaded !== "function") return null;
    const result = await ensureActiveScenarioOptionalLayerLoaded("specialZoneLayers", { renderNow: false });
    loadedScenarioLayerAssetId = scenarioId;
    runtimeState.specialZoneLayers = normalizeSpecialZoneLayersState(runtimeState.specialZoneLayers, {
      defaultSource: "scenario",
    });
    renderSpecialZonesWorkbenchUi();
    return result;
  };

  return {
    bindSpecialZonesWorkbenchEvents,
    loadScenarioSpecialZoneLayers,
    renderSpecialZonesWorkbenchUi,
  };
}

export { createSpecialZonesWorkbenchController };
