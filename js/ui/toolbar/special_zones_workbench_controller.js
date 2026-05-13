// Layer-based Special Zones workbench controller.
// 这个控制器只管理 special zone layer UI；toolbar.js 继续负责弹层、焦点和跨面板仲裁。

import {
  SPECIAL_ZONE_LAYER_DIAGNOSTIC_CODES,
  SPECIAL_ZONE_PATTERN_IDS,
  SPECIAL_ZONE_PRESETS,
  activateSpecialZoneMembershipToolState,
  createLayerFromPreset,
  createSpecialZonePatternPreviewStyle,
  exitSpecialZoneMembershipToolState,
  mutateSpecialZoneLayersState,
  mutateRuntimeSpecialZoneLayersState,
  normalizeRuntimeSpecialZoneLayersState,
  normalizeSpecialZoneLayersState,
  registerSpecialZonesWorkbenchRuntimeHooks,
  resolveSpecialZoneTopologyFingerprint,
  serializeSpecialZoneLayersState,
  setRuntimeSpecialZoneLayersState,
  setSpecialZoneMembershipBrushModeState,
  setSpecialZonePresetCategoryState,
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
const MEMBER_LIST_INLINE_LIMIT = 60;
const MEMBER_LIST_INLINE_RENDER_COUNT = 30;
const MEMBER_DRAWER_RENDER_LIMIT = 80;

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
  let currentTargetActionsNode = null;
  let diagnosticsNode = null;
  let memberDrawerNode = null;
  let overlayToggleNode = null;
  let lastDiagnosticsToastKey = "";
  let loadedScenarioLayerAssetId = "";
  let failedScenarioLayerAssetId = "";

  const translate = (value) => (typeof t === "function" ? t(value, "ui") : value);

  const normalizeState = () => {
    return normalizeRuntimeSpecialZoneLayersState(runtimeState, {
      defaultSource: runtimeState.activeScenarioId ? "scenario" : "project",
      topologyFingerprint: resolveSpecialZoneTopologyFingerprint(runtimeState),
    });
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

  const activeScenarioDeclaresLayerAsset = () => {
    return !!String(runtimeState.activeScenarioManifest?.special_zone_layers_url || "").trim();
  };

  const setLoadFailedSpecialZoneLayersState = (scenarioId) => {
    const topologyFingerprint = resolveSpecialZoneTopologyFingerprint(runtimeState);
    setRuntimeSpecialZoneLayersState(runtimeState, {
      version: 1,
      layers: [],
      activeLayerId: "",
      topologyFingerprint,
      diagnostics: [
        {
          code: SPECIAL_ZONE_LAYER_DIAGNOSTIC_CODES.LOAD_FAILED,
          scenarioId,
        },
      ],
    }, {
      defaultSource: "scenario",
      topologyFingerprint,
    });
    runtimeState.specialZonesOverlayDirty = true;
  };

  const applyPatternPreviewStyle = (node, style = {}) => {
    if (!node) return;
    const preview = createSpecialZonePatternPreviewStyle(style);
    node.style.backgroundColor = preview.backgroundColor;
    node.style.backgroundImage = preview.backgroundImage;
    node.style.borderColor = preview.borderColor;
    node.style.opacity = preview.opacity;
  };

  const activateMembershipTool = (tool = getMemberTool()) => {
    const normalizedTool = MEMBER_TOOL_IDS.has(tool) ? tool : "multi";
    activateSpecialZoneMembershipToolState(runtimeState, normalizedTool);
    updateToolUI?.();
    renderSpecialZonesWorkbenchUi();
  };

  const applyLayerStylePatch = (layer, patch, label = "special-zone-layer-style") => {
    if (!layer) return;
    updateState({
      action: "updateLayer",
      layerId: layer.id,
      patch: {
        presetId: "custom",
        category: "custom",
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
    mutateRuntimeSpecialZoneLayersState(runtimeState, mutation, {
      defaultSource: runtimeState.activeScenarioId ? "scenario" : "project",
      topologyFingerprint: resolveSpecialZoneTopologyFingerprint(runtimeState),
    });
    if (mutation?.action === "addLayer") {
      runtimeState.showSpecialZones = true;
    }
    markDirty?.(label);
    if (typeof pushHistoryEntry === "function") {
      pushHistoryEntry({
        kind: label,
        before,
        after: typeof captureHistoryState === "function" ? captureHistoryState({ strategicOverlay: true }) : null,
      });
    }
    render?.();
    updateToolUI?.();
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
    const overlayToggleLabel = document.createElement("label");
    overlayToggleLabel.className = "special-zone-overlay-toggle";
    overlayToggleNode = document.createElement("input");
    overlayToggleNode.type = "checkbox";
    overlayToggleNode.dataset.specialZoneOverlayToggle = "true";
    overlayToggleNode.checked = !!runtimeState.showSpecialZones;
    const overlayToggleText = document.createElement("span");
    overlayToggleText.textContent = translate("Show special zones overlay");
    overlayToggleLabel.append(overlayToggleNode, overlayToggleText);
    overlayToggleNode.addEventListener("change", async () => {
      runtimeState.showSpecialZones = !!overlayToggleNode.checked;
      markDirty?.("toggle-special-zones");
      if (runtimeState.showSpecialZones) {
        await loadScenarioSpecialZoneLayers();
      }
      render?.();
      renderSpecialZonesWorkbenchUi();
    });
    statusNode = document.createElement("p");
    statusNode.className = "special-zone-workbench-status";
    statusNode.setAttribute("aria-live", "polite");
    header.append(title, overlayToggleLabel, statusNode);
    diagnosticsNode = document.createElement("div");
    diagnosticsNode.className = "special-zone-workbench-diagnostics";

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
    root.append(header, diagnosticsNode, layout);
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
      row.dataset.layerId = layer.id;
      if (layer.id === state.activeLayerId) row.classList.add("is-active");
      const selectBtn = createButton(`${layer.visible ? "●" : "○"} ${layer.name} (${layer.memberFeatureIds.length})`);
      selectBtn.setAttribute("aria-pressed", String(layer.id === state.activeLayerId));
      selectBtn.addEventListener("click", () => updateState({ action: "setActiveLayer", layerId: layer.id }, "special-zone-active-layer"));
      const visibilityBtn = createButton(layer.visible ? translate("Hide") : translate("Show"));
      visibilityBtn.addEventListener("click", () => updateState({ action: "updateLayer", layerId: layer.id, patch: { visible: !layer.visible } }, "special-zone-layer-visible"));
      const legendBtn = createButton(layer.legendVisible === false ? translate("Show in legend") : translate("Hide from legend"));
      legendBtn.addEventListener("click", () => updateState({
        action: "updateLayer",
        layerId: layer.id,
        patch: { legendVisible: layer.legendVisible === false },
      }, "special-zone-layer-legend"));
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
      row.append(selectBtn, visibilityBtn, legendBtn, upBtn, downBtn);
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
    setSpecialZonePresetCategoryState(runtimeState, selectedCategory);
    const tabs = document.createElement("div");
    tabs.className = "special-zone-preset-tabs";
    categories.forEach((category) => {
      const tab = createButton(category === "all" ? translate("All") : category, "secondary-btn special-zone-preset-tab");
      tab.setAttribute("aria-pressed", String(category === selectedCategory));
      tab.addEventListener("click", () => {
        setSpecialZonePresetCategoryState(runtimeState, category);
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
      applyPatternPreviewStyle(preview, preset.style);
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
    applyPatternPreviewStyle(stylePreview, layer.style);

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

  const renderCurrentTargetActions = (layer) => {
    if (!currentTargetActionsNode) return;
    currentTargetActionsNode.replaceChildren();

    const activeFeatureId = layer ? getActiveLandFeatureId() : "";
    const parentGroupIds = layer ? getParentGroupFeatureIds() : [];

    const addCurrentBtn = createButton(translate("Add current tile"));
    addCurrentBtn.disabled = !activeFeatureId;
    addCurrentBtn.addEventListener("click", () => {
      const featureId = getActiveLandFeatureId();
      if (!featureId) return;
      updateState({ action: "addMembers", layerId: layer.id, featureIds: [featureId] }, "special-zone-members-add-current");
    });

    const toggleCurrentBtn = createButton(translate("Toggle current tile"));
    toggleCurrentBtn.disabled = !activeFeatureId;
    toggleCurrentBtn.addEventListener("click", () => {
      const featureId = getActiveLandFeatureId();
      if (!featureId) return;
      updateState({ action: "toggleMembers", layerId: layer.id, featureIds: [featureId] }, "special-zone-members-toggle-current");
    });

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

    currentTargetActionsNode.append(addCurrentBtn, toggleCurrentBtn, addParentGroupBtn);
  };

  const closeMemberDrawer = () => {
    if (!memberDrawerNode) return;
    if (typeof memberDrawerNode.close === "function" && memberDrawerNode.open) {
      memberDrawerNode.close();
    } else {
      memberDrawerNode.hidden = true;
    }
  };

  const renderMemberDrawerRows = (layer, searchTerm = "") => {
    if (!memberDrawerNode || !layer) return;
    const list = memberDrawerNode.querySelector("[data-special-zone-member-drawer-list]");
    if (!list) return;
    list.replaceChildren();
    const query = String(searchTerm || "").trim().toLowerCase();
    const filtered = layer.memberFeatureIds.filter((featureId) => (
      !query || String(featureId).toLowerCase().includes(query)
    ));
    filtered.slice(0, MEMBER_DRAWER_RENDER_LIMIT).forEach((featureId) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "special-zone-member-drawer-row";
      row.textContent = featureId;
      row.addEventListener("click", () => {
        updateState({
          action: "removeMembers",
          layerId: layer.id,
          featureIds: [featureId],
        }, "special-zone-members-remove");
        const search = memberDrawerNode?.querySelector(".special-zone-member-drawer-search");
        renderMemberDrawerRows(activeLayer(), search?.value || "");
      });
      list.appendChild(row);
    });
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = translate("No matching members.");
      list.appendChild(empty);
    } else if (filtered.length > MEMBER_DRAWER_RENDER_LIMIT) {
      const capped = document.createElement("p");
      capped.className = "muted";
      capped.textContent = translate("Showing first 80 matching members.");
      list.appendChild(capped);
    }
  };

  const openMemberDrawer = (layer) => {
    if (!container || !layer) return;
    if (!memberDrawerNode) {
      memberDrawerNode = document.createElement("dialog");
      memberDrawerNode.className = "special-zone-member-drawer";
      const header = document.createElement("div");
      header.className = "special-zone-member-drawer-header";
      const title = document.createElement("h4");
      title.textContent = translate("All member ids");
      const closeBtn = createButton(translate("Close"));
      closeBtn.addEventListener("click", closeMemberDrawer);
      header.append(title, closeBtn);
      const search = document.createElement("input");
      search.type = "search";
      search.className = "input special-zone-member-drawer-search";
      search.placeholder = translate("Search feature id or country code");
      search.addEventListener("input", () => renderMemberDrawerRows(activeLayer(), search.value));
      const list = document.createElement("div");
      list.dataset.specialZoneMemberDrawerList = "true";
      list.className = "special-zone-member-drawer-list";
      memberDrawerNode.append(header, search, list);
      container.appendChild(memberDrawerNode);
    }
    const search = memberDrawerNode.querySelector(".special-zone-member-drawer-search");
    if (search) search.value = "";
    renderMemberDrawerRows(layer);
    if (typeof memberDrawerNode.showModal === "function") {
      memberDrawerNode.showModal();
    } else {
      memberDrawerNode.hidden = false;
    }
    search?.focus?.();
  };

  const renderActions = (state, layer) => {
    if (!actionsNode) return;
    actionsNode.replaceChildren();
    currentTargetActionsNode = null;
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
          setSpecialZoneMembershipBrushModeState(runtimeState, mode);
          activateMembershipTool("brush");
        });
        brushModeRow.appendChild(modeBtn);
      });
      actionsNode.appendChild(brushModeRow);
    }

    const exitToolBtn = createButton(translate("Exit membership tool"));
    exitToolBtn.addEventListener("click", () => {
      exitSpecialZoneMembershipToolState(runtimeState);
      updateToolUI?.();
      statusNode.textContent = translate("Membership tool closed.");
      renderSpecialZonesWorkbenchUi();
    });

    currentTargetActionsNode = document.createElement("div");
    currentTargetActionsNode.className = "special-zone-member-current-target-row";
    renderCurrentTargetActions(layer);

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
      const inlineIds = layer.memberFeatureIds.length > MEMBER_LIST_INLINE_LIMIT
        ? layer.memberFeatureIds.slice(0, MEMBER_LIST_INLINE_RENDER_COUNT)
        : layer.memberFeatureIds;
      inlineIds.forEach((featureId) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "special-zone-member-chip";
        chip.textContent = featureId;
        chip.title = translate("Remove member");
        chip.addEventListener("click", () => updateState({ action: "removeMembers", layerId: layer.id, featureIds: [featureId] }, "special-zone-members-remove"));
        ids.appendChild(chip);
      });
      if (layer.memberFeatureIds.length > MEMBER_LIST_INLINE_LIMIT) {
        const overflow = createButton(
          `${translate("View all")} (${layer.memberFeatureIds.length})`,
          "secondary-btn special-zone-member-overflow-btn"
        );
        overflow.addEventListener("click", () => openMemberDrawer(layer));
        ids.appendChild(overflow);
      }
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
      let stateToSave = null;
      saveBtn.disabled = true;
      saveBtn.classList.add("is-loading");
      saveBtn.setAttribute("aria-busy", "true");
      if (statusNode) statusNode.textContent = translate("Saving scenario special zone layers…");
      try {
        if (loadedScenarioLayerAssetId !== scenarioId) {
          const pendingState = serializeSpecialZoneLayersState(normalizeState(), {
            topologyFingerprint: resolveSpecialZoneTopologyFingerprint(runtimeState),
          });
          await loadScenarioSpecialZoneLayers();
          if (loadedScenarioLayerAssetId !== scenarioId) {
            throw new Error("Scenario special zone layer asset load unavailable.");
          }
          // 首次保存可能发生在 optional asset 载入前；已有本地 layer 时保存本地意图，避免载入结果覆盖用户刚做的编辑。
          stateToSave = pendingState.layers.length
            ? pendingState
            : serializeSpecialZoneLayersState(normalizeState(), {
                topologyFingerprint: resolveSpecialZoneTopologyFingerprint(runtimeState),
              });
        }
        const response = await fetch("/__dev/scenario/special-zone-layers/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId,
            specialZoneLayers: stateToSave || serializeSpecialZoneLayersState(normalizeState(), {
              topologyFingerprint: resolveSpecialZoneTopologyFingerprint(runtimeState),
            }),
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!result?.ok) throw new Error(result?.error || "Scenario special zone save failed.");
        setRuntimeSpecialZoneLayersState(runtimeState, result.specialZoneLayers || normalizeState(), {
          defaultSource: "scenario",
          topologyFingerprint: resolveSpecialZoneTopologyFingerprint(runtimeState),
        });
        render?.();
        if (statusNode) statusNode.textContent = translate("Scenario special zone layers saved.");
        showToast?.(translate("Scenario special zone layers saved."), { title: translate("Special zones saved"), tone: "success" });
      } catch (error) {
        console.warn("[special-zone-layers] Scenario save unavailable.", error);
        if (statusNode) statusNode.textContent = translate("Scenario special zone layer save failed.");
        showToast?.(translate("Scenario layer asset save is available only in the local dev server."), { title: translate("Read-only scenario asset"), tone: "warning" });
      } finally {
        saveBtn.disabled = !runtimeState.activeScenarioId;
        saveBtn.classList.remove("is-loading");
        saveBtn.removeAttribute("aria-busy");
      }
    });

    const memberActions = document.createElement("div");
    memberActions.className = "special-zone-member-actions-row";
    memberActions.append(exitToolBtn, currentTargetActionsNode, addSelectionBtn, replaceSelectionBtn, copySelect, copyBtn, clearBtn);
    layerActions.append(duplicateBtn, deleteBtn, saveBtn);
    actionsNode.append(memberActions, memberList, layerActions);
  };

  const renderSpecialZonesWorkbenchCurrentTargetUi = () => {
    if (!currentTargetActionsNode) return;
    renderCurrentTargetActions(activeLayer());
  };

  const renderDiagnostics = (state) => {
    if (!diagnosticsNode) return;
    diagnosticsNode.replaceChildren();
    const diagnostics = Array.isArray(state?.diagnostics) ? state.diagnostics : [];
    if (!diagnostics.length) {
      diagnosticsNode.hidden = true;
      return;
    }
    diagnosticsNode.hidden = false;
    const title = document.createElement("strong");
    title.textContent = translate("Diagnostics");
    const list = document.createElement("ul");
    diagnostics.slice(0, 6).forEach((entry) => {
      const item = document.createElement("li");
      const code = String(entry?.code || "diagnostic");
      if (code === "topology_fingerprint_mismatch") {
        item.textContent = `${code}: expected ${entry.expected || "current"} / got ${entry.actual || "empty"}`;
      } else if (code === "invalid_feature_id") {
        item.textContent = `${code}: ${entry.featureId || ""}`.trim();
      } else if (code === "duplicate_layer_id_dropped") {
        item.textContent = `${code}: ${entry.layerId || ""}`.trim();
      } else if (code === SPECIAL_ZONE_LAYER_DIAGNOSTIC_CODES.LOAD_FAILED) {
        item.textContent = `${code}: ${entry.scenarioId || runtimeState.activeScenarioId || ""}`.trim();
      } else if (code === "legacy_special_zone_fields_dropped") {
        item.textContent = translate("legacy_special_zone_fields_dropped");
      } else {
        item.textContent = code;
      }
      list.appendChild(item);
    });
    diagnosticsNode.append(title, list);
  };

  const renderSpecialZonesWorkbenchUi = () => {
    if (!ensureRoot()) return;
    const state = normalizeState();
    const layer = activeLayer();
    if (overlayToggleNode) {
      overlayToggleNode.checked = !!runtimeState.showSpecialZones;
    }
    const scenarioId = String(runtimeState.activeScenarioId || "").trim();
    if (
      runtimeState.showSpecialZones
      && scenarioId
      && loadedScenarioLayerAssetId !== scenarioId
      && failedScenarioLayerAssetId !== scenarioId
    ) {
      void loadScenarioSpecialZoneLayers();
    }
    if (statusNode) {
      statusNode.textContent = layer
        ? `${state.layers.length} ${translate("layers")}, ${layer.memberFeatureIds.length} ${translate("active members")}.`
        : translate("No special zone layers yet.");
    }
    renderLayerList(state);
    renderDiagnostics(state);
    registerSpecialZonesWorkbenchRuntimeHooks(runtimeState, {
      renderWorkbench: renderSpecialZonesWorkbenchUi,
      renderCurrentTarget: renderSpecialZonesWorkbenchCurrentTargetUi,
    });
    renderPresetList(layer);
    renderProperties(layer);
    renderActions(state, layer);
  };

  const bindSpecialZonesWorkbenchEvents = () => {
    ensureRoot();
    registerSpecialZonesWorkbenchRuntimeHooks(runtimeState, {
      renderWorkbench: renderSpecialZonesWorkbenchUi,
      renderCurrentTarget: renderSpecialZonesWorkbenchCurrentTargetUi,
    });
  };

  const focusSpecialZonesWorkbench = () => {
    if (!ensureRoot()) return;
    const activeRow = root.querySelector(".special-zone-layer-row.is-active button");
    const newLayerButton = layerListNode?.querySelector(".special-zone-workbench-section-title button");
    (activeRow || newLayerButton || root).focus?.();
  };

  const loadScenarioSpecialZoneLayers = async () => {
    const scenarioId = String(runtimeState.activeScenarioId || "").trim();
    if (!scenarioId) {
      loadedScenarioLayerAssetId = "";
      failedScenarioLayerAssetId = "";
      return null;
    }
    if (loadedScenarioLayerAssetId === scenarioId) return runtimeState.specialZoneLayers;
    if (typeof ensureActiveScenarioOptionalLayerLoaded !== "function") return null;
    const result = await ensureActiveScenarioOptionalLayerLoaded("specialZoneLayers", { renderNow: false });
    if (!result && activeScenarioDeclaresLayerAsset()) {
      failedScenarioLayerAssetId = scenarioId;
      setLoadFailedSpecialZoneLayersState(scenarioId);
      if (statusNode) statusNode.textContent = translate("Scenario special zone layer load failed.");
      showToast?.(translate("Scenario special zone layer asset could not be loaded. Retry from the workbench."), {
        title: translate("Special zone layer load failed"),
        tone: "warning",
      });
      render?.();
      renderSpecialZonesWorkbenchUi();
      return null;
    }
    loadedScenarioLayerAssetId = scenarioId;
    failedScenarioLayerAssetId = "";
    normalizeRuntimeSpecialZoneLayersState(runtimeState, {
      defaultSource: "scenario",
      topologyFingerprint: resolveSpecialZoneTopologyFingerprint(runtimeState),
    });
    const diagnostics = Array.isArray(runtimeState.specialZoneLayers?.diagnostics)
      ? runtimeState.specialZoneLayers.diagnostics
      : [];
    const mismatchDiagnostics = diagnostics.filter((entry) => entry?.code === "topology_fingerprint_mismatch");
    const diagnosticsKey = `${scenarioId}:${mismatchDiagnostics.map((entry) => `${entry.expected || ""}/${entry.actual || ""}`).join("|")}`;
    if (mismatchDiagnostics.length && diagnosticsKey !== lastDiagnosticsToastKey) {
      lastDiagnosticsToastKey = diagnosticsKey;
      showToast?.(translate("Special zone topology fingerprint mismatch is listed in the workbench diagnostics."), {
        title: translate("Special zone topology mismatch"),
        tone: "warning",
      });
    }
    renderSpecialZonesWorkbenchUi();
    return result;
  };

  return {
    bindSpecialZonesWorkbenchEvents,
    focusSpecialZonesWorkbench,
    loadScenarioSpecialZoneLayers,
    renderSpecialZonesWorkbenchUi,
    renderSpecialZonesWorkbenchCurrentTargetUi,
  };
}

export { createSpecialZonesWorkbenchController };
