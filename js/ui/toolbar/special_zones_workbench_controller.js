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

const SVG_NS = "http://www.w3.org/2000/svg";
const MEMBER_TOOL_IDS = new Set(["single", "multi", "brush"]);
const MEMBER_BRUSH_MODES = new Set(["add", "remove"]);

const MEMBER_TOOL_ICONS = Object.freeze({
  single: {
    viewBox: "0 0 20 20",
    paths: ["M5 4h10v10H5z", "M13 12l4 4"],
  },
  multi: {
    viewBox: "0 0 20 20",
    paths: ["M3 5h7v7H3z", "M10 8h7v7h-7z"],
  },
  brush: {
    viewBox: "0 0 20 20",
    paths: ["M13 3l4 4-8 8H5v-4z", "M4 16h5"],
  },
});

function createIcon(iconId) {
  const icon = MEMBER_TOOL_ICONS[iconId] || MEMBER_TOOL_ICONS.single;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", icon.viewBox);
  svg.setAttribute("aria-hidden", "true");
  icon.paths.forEach((pathData) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
  });
  return svg;
}

function createIconButton({ icon, label, active = false, disabled = false } = {}) {
  const button = createButton("", "secondary-btn special-zone-member-tool-btn");
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(active));
  button.disabled = disabled;
  button.appendChild(createIcon(icon));
  return button;
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
    const indexed = runtimeState.devSelectionFeatureIds instanceof Set ? Array.from(runtimeState.devSelectionFeatureIds) : [];
    return Array.from(new Set([...ordered, ...indexed].map(featureIdFromDevSelectionEntry).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  };

  const getActiveLandFeatureId = () => {
    const selectedId = runtimeState.devSelectedHit?.targetType === "land"
      ? String(runtimeState.devSelectedHit.id || "").trim()
      : "";
    const hoverHitId = runtimeState.devHoverHit?.targetType === "land"
      ? String(runtimeState.devHoverHit.id || "").trim()
      : "";
    const hoveredId = String(runtimeState.hoveredId || "").trim();
    return [selectedId, hoverHitId, hoveredId].find((featureId) => featureId && runtimeState.landIndex?.has?.(featureId)) || "";
  };

  const getParentGroupFeatureIds = () => {
    const featureId = getActiveLandFeatureId();
    if (!featureId || typeof runtimeState.resolveSpecialZoneParentGroupTargetIdsFn !== "function") return [];
    return runtimeState.resolveSpecialZoneParentGroupTargetIdsFn(featureId);
  };

  const getMemberTool = () => {
    const tool = String(runtimeState.specialZoneMembershipTool || "multi").trim();
    return MEMBER_TOOL_IDS.has(tool) ? tool : "multi";
  };

  const getMemberBrushMode = () => {
    const mode = String(runtimeState.specialZoneMembershipBrushMode || "add").trim();
    return MEMBER_BRUSH_MODES.has(mode) ? mode : "add";
  };

  const activateMembershipTool = (tool = getMemberTool()) => {
    const normalizedTool = MEMBER_TOOL_IDS.has(tool) ? tool : "multi";
    runtimeState.specialZoneMembershipTool = normalizedTool;
    if (runtimeState.currentTool !== "special-zone-membership") {
      runtimeState.specialZonePreviousTool = runtimeState.currentTool || "fill";
    }
    runtimeState.currentTool = "special-zone-membership";
    runtimeState.brushModeEnabled = false;
    runtimeState.specialZoneEditor = { ...(runtimeState.specialZoneEditor || {}), active: false };
    updateToolUI?.();
    renderSpecialZonesWorkbenchUi();
  };

  const applyLayerStylePatch = (layer, patch, label = "special-zone-layer-style") => {
    if (!layer) return;
    updateState({
      action: "updateLayer",
      layerId: layer.id,
      patch: {
        style: {
          ...patch,
          revision: Number(layer.style?.revision || 1) + 1,
        },
      },
    }, label);
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
    const header = document.createElement("div");
    header.className = "special-zone-workbench-section-title";
    const title = document.createElement("h4");
    title.textContent = translate("Layers");
    const addLayerBtn = createButton(translate("New layer"));
    addLayerBtn.addEventListener("click", () => {
      const source = runtimeState.activeScenarioId ? "scenario" : "project";
      updateState({ action: "addLayer", layer: createLayerFromPreset("custom", { source }) }, "special-zone-layer-add");
    });
    header.append(title, addLayerBtn);
    layerListNode.appendChild(header);
    if (!state.layers.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = translate("Create a layer before editing members or styles.");
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

  const renderPresetList = (layer) => {
    if (!presetListNode) return;
    presetListNode.replaceChildren();
    const header = document.createElement("div");
    header.className = "special-zone-workbench-section-title";
    const title = document.createElement("h4");
    title.textContent = translate("Style presets");
    header.appendChild(title);
    presetListNode.appendChild(header);
    if (!layer) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = translate("Select or create a layer to apply style presets.");
      presetListNode.appendChild(empty);
      return;
    }
    const categories = ["all", ...Array.from(new Set(SPECIAL_ZONE_PRESETS.map((preset) => preset.category))).sort((a, b) => a.localeCompare(b))];
    const selectedCategory = categories.includes(runtimeState.specialZonePresetCategory)
      ? runtimeState.specialZonePresetCategory
      : "all";
    runtimeState.specialZonePresetCategory = selectedCategory;
    const tabs = document.createElement("div");
    tabs.className = "special-zone-preset-tabs";
    categories.forEach((category) => {
      const tab = createButton(category === "all" ? translate("All") : category, "secondary-btn special-zone-preset-tab");
      tab.setAttribute("aria-pressed", String(category === selectedCategory));
      tab.addEventListener("click", () => {
        runtimeState.specialZonePresetCategory = category;
        renderSpecialZonesWorkbenchUi();
      });
      tabs.appendChild(tab);
    });
    presetListNode.appendChild(tabs);
    const grid = document.createElement("div");
    grid.className = "special-zone-preset-grid";
    SPECIAL_ZONE_PRESETS
      .filter((preset) => selectedCategory === "all" || preset.category === selectedCategory)
      .forEach((preset) => {
      const button = createButton("", "secondary-btn special-zone-preset-card");
      button.title = `${preset.name} - ${preset.category}`;
      button.setAttribute("aria-pressed", String(layer.presetId === preset.id));
      const preview = document.createElement("span");
      preview.className = "special-zone-preset-preview";
      preview.style.background = preset.style.fill;
      preview.style.borderColor = preset.style.stroke;
      preview.style.opacity = String(Math.max(0.24, Number(preset.style.fillOpacity || 0.32)));
      const name = document.createElement("span");
      name.className = "special-zone-preset-name";
      name.textContent = preset.name;
      button.append(preview, name);
      button.addEventListener("click", () => {
        updateState({
          action: "updateLayer",
          layerId: layer.id,
          patch: {
            presetId: preset.id,
            category: preset.category,
            style: {
              ...preset.style,
              revision: Number(layer.style?.revision || 1) + 1,
            },
          },
        }, "special-zone-layer-preset-style");
      });
      grid.appendChild(button);
    });
    presetListNode.appendChild(grid);
  };

  const renderProperties = (layer) => {
    if (!propertyNode) return;
    propertyNode.replaceChildren();
    const title = document.createElement("h4");
    title.textContent = translate("Current layer style");
    propertyNode.appendChild(title);
    if (!layer) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = translate("Select a layer to edit its style.");
      propertyNode.appendChild(empty);
      return;
    }
    const stylePreview = document.createElement("div");
    stylePreview.className = "special-zone-current-style-preview";
    stylePreview.style.background = layer.style.fill;
    stylePreview.style.borderColor = layer.style.stroke;
    stylePreview.style.opacity = String(Math.max(0.24, Number(layer.style.fillOpacity || 0.32)));

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = layer.name;
    nameInput.addEventListener("change", () => updateState({ action: "updateLayer", layerId: layer.id, patch: { name: nameInput.value } }, "special-zone-layer-name"));

    const fillInput = document.createElement("input");
    fillInput.type = "color";
    fillInput.value = layer.style.fill;
    fillInput.addEventListener("input", () => applyLayerStylePatch(layer, { fill: fillInput.value }));

    const strokeInput = document.createElement("input");
    strokeInput.type = "color";
    strokeInput.value = layer.style.stroke;
    strokeInput.addEventListener("input", () => applyLayerStylePatch(layer, { stroke: strokeInput.value }));

    const opacityInput = document.createElement("input");
    opacityInput.type = "range";
    opacityInput.min = "0";
    opacityInput.max = "100";
    opacityInput.value = String(Math.round(layer.style.fillOpacity * 100));
    opacityInput.addEventListener("input", () => applyLayerStylePatch(layer, { fillOpacity: Number(opacityInput.value) / 100 }));

    const patternSelect = document.createElement("select");
    SPECIAL_ZONE_PATTERN_IDS.forEach((patternId) => {
      const option = document.createElement("option");
      option.value = patternId;
      option.textContent = patternId;
      patternSelect.appendChild(option);
    });
    patternSelect.value = layer.style.pattern;
    patternSelect.addEventListener("change", () => applyLayerStylePatch(layer, { pattern: patternSelect.value }));

    const strokeWidth = document.createElement("input");
    strokeWidth.type = "number";
    strokeWidth.min = "0.4";
    strokeWidth.max = "8";
    strokeWidth.step = "0.1";
    strokeWidth.value = String(layer.style.strokeWidth);
    strokeWidth.addEventListener("change", () => applyLayerStylePatch(layer, { strokeWidth: Number(strokeWidth.value) }));

    propertyNode.append(
      stylePreview,
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
    actionsNode.dataset.role = "members";
    const header = document.createElement("div");
    header.className = "special-zone-members-header";
    const title = document.createElement("h4");
    title.textContent = translate("Members");
    const toolGroup = document.createElement("div");
    toolGroup.className = "special-zone-member-tool-group";
    const activeTool = getMemberTool();
    [
      ["single", translate("Single select")],
      ["multi", translate("Multi select")],
      ["brush", translate("Brush select")],
    ].forEach(([toolId, label]) => {
      const button = createIconButton({
        icon: toolId,
        label,
        active: activeTool === toolId && runtimeState.currentTool === "special-zone-membership",
        disabled: !layer,
      });
      button.addEventListener("click", () => activateMembershipTool(toolId));
      toolGroup.appendChild(button);
    });
    header.append(title, toolGroup);
    actionsNode.appendChild(header);

    if (!layer) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = translate("Select or create a layer before editing members.");
      actionsNode.appendChild(empty);
      return;
    }

    const summary = document.createElement("p");
    summary.className = "special-zone-member-summary";
    summary.textContent = `${layer.memberFeatureIds.length} ${translate("members in current layer")}.`;
    actionsNode.appendChild(summary);

    if (activeTool === "brush") {
      const brushModeRow = document.createElement("div");
      brushModeRow.className = "special-zone-member-brush-row";
      [
        ["add", translate("Add brush")],
        ["remove", translate("Remove brush")],
      ].forEach(([mode, label]) => {
        const modeBtn = createButton(label, "secondary-btn special-zone-preset-tab");
        modeBtn.setAttribute("aria-pressed", String(getMemberBrushMode() === mode));
        modeBtn.addEventListener("click", () => {
          runtimeState.specialZoneMembershipBrushMode = mode;
          activateMembershipTool("brush");
        });
        brushModeRow.appendChild(modeBtn);
      });
      actionsNode.appendChild(brushModeRow);
    }

    const exitToolBtn = createButton(translate("Exit membership tool"));
    exitToolBtn.addEventListener("click", () => {
      runtimeState.currentTool = runtimeState.specialZonePreviousTool || "fill";
      runtimeState.specialZonePreviousTool = "";
      updateToolUI?.();
      statusNode.textContent = translate("Membership tool closed.");
      renderSpecialZonesWorkbenchUi();
    });

    const addCurrentBtn = createButton(translate("Add current tile"));
    addCurrentBtn.disabled = !getActiveLandFeatureId();
    addCurrentBtn.addEventListener("click", () => {
      const featureId = getActiveLandFeatureId();
      if (!featureId) return;
      updateState({ action: "addMembers", layerId: layer.id, featureIds: [featureId] }, "special-zone-members-add-current");
    });

    const toggleCurrentBtn = createButton(translate("Toggle current tile"));
    toggleCurrentBtn.disabled = !getActiveLandFeatureId();
    toggleCurrentBtn.addEventListener("click", () => {
      const featureId = getActiveLandFeatureId();
      if (!featureId) return;
      updateState({ action: "toggleMembers", layerId: layer.id, featureIds: [featureId] }, "special-zone-members-toggle-current");
    });

    const parentGroupIds = getParentGroupFeatureIds();
    const addParentGroupBtn = createButton(translate("Add parent group"));
    addParentGroupBtn.disabled = !parentGroupIds.length;
    addParentGroupBtn.title = parentGroupIds.length
      ? `${parentGroupIds.length} ${translate("features in current parent group")}`
      : translate("Select or hover a land tile with a parent group.");
    addParentGroupBtn.addEventListener("click", () => {
      const ids = getParentGroupFeatureIds();
      if (!ids.length) return;
      updateState({ action: "addMembers", layerId: layer.id, featureIds: ids }, "special-zone-members-add-parent-group");
    });

    const addSelectionBtn = createButton(translate("Add dev selection"));
    addSelectionBtn.disabled = !layer || !getDevSelectionFeatureIds().length;
    addSelectionBtn.addEventListener("click", () => updateState({ action: "addMembers", layerId: layer.id, featureIds: getDevSelectionFeatureIds() }, "special-zone-members-add-selection"));

    const replaceSelectionBtn = createButton(translate("Replace with dev selection"));
    replaceSelectionBtn.disabled = addSelectionBtn.disabled;
    replaceSelectionBtn.addEventListener("click", () => updateState({ action: "replaceMembers", layerId: layer.id, featureIds: getDevSelectionFeatureIds() }, "special-zone-members-replace-selection"));

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

    const clearBtn = createButton(translate("Clear members"));
    clearBtn.disabled = !layer || !layer.memberFeatureIds.length;
    clearBtn.addEventListener("click", () => updateState({ action: "replaceMembers", layerId: layer.id, featureIds: [] }, "special-zone-members-clear"));

    const memberList = document.createElement("details");
    memberList.className = "special-zone-member-list";
    const memberSummary = document.createElement("summary");
    memberSummary.textContent = translate("Member ids");
    const ids = document.createElement("div");
    ids.className = "special-zone-member-id-list";
    if (layer.memberFeatureIds.length) {
      layer.memberFeatureIds.forEach((featureId) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "special-zone-member-chip";
        chip.textContent = featureId;
        chip.title = translate("Remove member");
        chip.addEventListener("click", () => updateState({ action: "removeMembers", layerId: layer.id, featureIds: [featureId] }, "special-zone-members-remove"));
        ids.appendChild(chip);
      });
    } else {
      const emptyMembers = document.createElement("span");
      emptyMembers.className = "muted";
      emptyMembers.textContent = translate("No members yet.");
      ids.appendChild(emptyMembers);
    }
    memberList.append(memberSummary, ids);

    const layerActions = document.createElement("div");
    layerActions.className = "special-zone-layer-actions-row";
    const duplicateBtn = createButton(translate("Duplicate layer"));
    duplicateBtn.disabled = !layer;
    duplicateBtn.addEventListener("click", () => updateState({ action: "duplicateLayer", layerId: layer.id }, "special-zone-layer-duplicate"));

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

    const memberActions = document.createElement("div");
    memberActions.className = "special-zone-member-actions-row";
    memberActions.append(exitToolBtn, addCurrentBtn, toggleCurrentBtn, addParentGroupBtn, addSelectionBtn, replaceSelectionBtn, copySelect, copyBtn, clearBtn);
    layerActions.append(duplicateBtn, deleteBtn, saveBtn);
    actionsNode.append(memberActions, memberList, layerActions);
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
    runtimeState.updateSpecialZonesWorkbenchUIFn = renderSpecialZonesWorkbenchUi;
    renderPresetList(layer);
    renderProperties(layer);
    renderActions(state, layer);
  };

  const bindSpecialZonesWorkbenchEvents = () => {
    ensureRoot();
    runtimeState.updateSpecialZonesWorkbenchUIFn = renderSpecialZonesWorkbenchUi;
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
