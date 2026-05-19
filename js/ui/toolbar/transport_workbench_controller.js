// Transport workbench controller.
// 这个模块负责 transport workbench 当前的状态归一、面板渲染、预览联动和内部事件绑定，尚不声明完整应用链所有权。
// toolbar.js 继续保留全局 overlay 协调、URL restore、顶层 chrome 和其他 support surface 的仲裁。

import {
  state as runtimeState,
} from "../../core/state.js";
import { markDirty } from "../../core/dirty_state.js";
import { t } from "../i18n.js";
import {
  focusSurface as focusOverlaySurface,
  rememberSurfaceTrigger as rememberOverlayTrigger,
  restoreSurfaceTriggerFocus as restoreOverlayTriggerFocus,
} from "../ui_contract.js";
import {
  getTransportWorkbenchCarrierViewState,
  resetTransportWorkbenchCarrierView,
  setTransportWorkbenchCarrierFamily,
  stepTransportWorkbenchCarrierZoom,
  toggleTransportWorkbenchCarrierQuarterTurn,
} from "../transport_workbench_carrier.js";
import {
  getTransportWorkbenchFamilyPreviewSnapshot,
} from "../transport_workbench_family_preview.js";
import {
  isTransportWorkbenchLivePreviewFamily,
  isTransportWorkbenchManifestOnlyRuntimeFamily,
} from "../transport_workbench_family_registry.js";
import {
  getTargetMainMapPackMeta,
  listTargetMainMapPacks,
} from "../../core/transport_pack_resolver.js";
import {
  createTransportWorkbenchApplyBridgeOwner,
} from "./transport_workbench_apply_bridge_owner.js";
import {
  createTransportWorkbenchPreviewLifecycleOwner,
} from "./transport_workbench_preview_lifecycle_owner.js";
import {
  createTransportWorkbenchStateOwner,
} from "./transport_workbench_state_owner.js";
import {
  createTransportWorkbenchInspectorOwner,
} from "./transport_workbench_inspector_owner.js";
import {
  TRANSPORT_WORKBENCH_FAMILIES,
  TRANSPORT_WORKBENCH_INSPECTOR_TABS,
  TRANSPORT_WORKBENCH_INLINE_HELP_SECTIONS,
  TRANSPORT_WORKBENCH_INLINE_HELP_COPY,
  TRANSPORT_WORKBENCH_DATA_CONTRACTS,
  TRANSPORT_WORKBENCH_TAB_SECTION_MAP,
  TRANSPORT_WORKBENCH_CONTROL_SCHEMAS,
  TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS,
} from "./transport_workbench_descriptor.js";
import {
  mapTransportWorkbenchLabelLevelToMaxLevel,
  mapTransportWorkbenchMaxLevelToLabelLevel,
} from "./transport_workbench_config_owner.js";

export { TRANSPORT_WORKBENCH_INSPECTOR_TABS };
export { TRANSPORT_WORKBENCH_INSPECTOR_TAB_IDS } from "./transport_workbench_config_owner.js";

export function createTransportWorkbenchController({
  scenarioTransportWorkbenchBtn = null,
  transportAppearanceWorkbenchBtn = null,
  transportWorkbenchOverlay = null,
  transportWorkbenchPanel = null,
  transportWorkbenchInfoBtn = null,
  transportWorkbenchInfoPopover = null,
  transportWorkbenchInfoBody = null,
  transportWorkbenchSectionHelpPopover = null,
  transportWorkbenchSectionHelpTitle = null,
  transportWorkbenchSectionHelpBody = null,
  transportWorkbenchCloseBtn = null,
  transportWorkbenchResetBtn = null,
  transportWorkbenchApplyBtn = null,
  transportWorkbenchTitle = null,
  transportWorkbenchLensTitle = null,
  transportWorkbenchLensSections = null,
  transportWorkbenchFamilyStatus = null,
  transportWorkbenchCountryStatus = null,
  transportWorkbenchPackSelect = null,
  transportWorkbenchPreviewMode = null,
  transportWorkbenchPreviewTitle = null,
  transportWorkbenchPreviewCanvas = null,
  transportWorkbenchPreviewActions = null,
  transportWorkbenchPreviewControls = null,
  transportWorkbenchCarrierMount = null,
  transportWorkbenchLayerOrderPanel = null,
  transportWorkbenchLayerOrderList = null,
  transportWorkbenchCompareBtn = null,
  transportWorkbenchCompareStatus = null,
  transportWorkbenchZoomOutBtn = null,
  transportWorkbenchZoomInBtn = null,
  transportWorkbenchRotateBtn = null,
  transportWorkbenchInspectorTitle = null,
  transportWorkbenchInspectorTabButtons = [],
  transportWorkbenchInspectorPanels = {},
  transportWorkbenchInspectorDetails = null,
  transportWorkbenchInspectorEmptyTitle = null,
  transportWorkbenchInspectorEmptyBody = null,
  transportWorkbenchDisplaySections = null,
  transportWorkbenchAggregationSections = null,
  transportWorkbenchLabelSections = null,
  transportWorkbenchCoverageSections = null,
  transportWorkbenchDataSections = null,
  transportWorkbenchFamilyTabs = [],
} = {}) {
  // controller 只拥有 workbench 自己的 overlay/panel/preview 交互闭环。
  // 更高层的 toolbar surface 仲裁、别的工作台切换、URL restore 仍由 toolbar.js 处理。
  const closeTransportWorkbenchInfoPopover = ({ restoreFocus = false } = {}) => {
    if (!transportWorkbenchInfoPopover) return;
    transportWorkbenchInfoPopover.classList.add("hidden");
    transportWorkbenchInfoPopover.setAttribute("aria-hidden", "true");
    transportWorkbenchInfoBtn?.setAttribute("aria-expanded", "false");
    if (restoreFocus && transportWorkbenchInfoBtn && typeof transportWorkbenchInfoBtn.focus === "function") {
      transportWorkbenchInfoBtn.focus({ preventScroll: true });
    }
  };

  let transportWorkbenchSectionHelpState = null;
  let transportWorkbenchDraggedLayerId = "";

  const transportWorkbenchStateOwner = createTransportWorkbenchStateOwner(runtimeState);
  const ensureTransportWorkbenchUiState = () => transportWorkbenchStateOwner.ensureUiState();
  const resetTransportWorkbenchSectionState = () => transportWorkbenchStateOwner.resetSectionState();

  const transportWorkbenchApplyBridgeOwner = createTransportWorkbenchApplyBridgeOwner(runtimeState, {
    shouldRerender: (normalizedPackId) => isCurrentTransportWorkbenchPackGate(normalizedPackId),
    renderTransportWorkbenchUi: () => renderTransportWorkbenchUi(),
  });

  const transportWorkbenchPreviewLifecycleOwner = createTransportWorkbenchPreviewLifecycleOwner(runtimeState, {
    ensureUiState: () => ensureTransportWorkbenchUiState(),
    getCarrierMount: () => transportWorkbenchCarrierMount,
    getRenderContext: () => getTransportWorkbenchRenderContext(),
    renderInspector: (family, config, compareHeld) => renderTransportWorkbenchInspector(family, config, compareHeld),
    renderLayerOrderPanel: () => renderTransportWorkbenchLayerOrderPanel(),
    renderLensSections: (family, config, compareHeld) => renderTransportWorkbenchLensSections(family, config, compareHeld),
    syncPreviewControls: () => syncTransportWorkbenchPreviewControls(),
  });

  const transportWorkbenchInspectorOwner = createTransportWorkbenchInspectorOwner({
    getLayerOrder: () => runtimeState.transportWorkbenchUi?.layerOrder || [],
    getLayerFamilyMeta: (familyId) => getTransportWorkbenchLayerFamilyMeta(familyId),
    isLivePreviewFamily: (familyId) => isTransportWorkbenchLivePreviewFamily(familyId),
    isManifestOnlyRuntimeFamily: (familyId) => isTransportWorkbenchManifestOnlyRuntimeFamily(familyId),
  });

  const closeTransportWorkbenchSectionHelpPopover = ({ restoreFocus = false } = {}) => {
    if (!transportWorkbenchSectionHelpPopover) return;
    transportWorkbenchSectionHelpPopover.classList.add("hidden");
    transportWorkbenchSectionHelpPopover.setAttribute("aria-hidden", "true");
    if (transportWorkbenchSectionHelpState?.trigger instanceof HTMLElement) {
      transportWorkbenchSectionHelpState.trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus && typeof transportWorkbenchSectionHelpState.trigger.focus === "function") {
        transportWorkbenchSectionHelpState.trigger.focus({ preventScroll: true });
      }
    }
    transportWorkbenchSectionHelpState = null;
  };

  const positionTransportWorkbenchSectionHelpPopover = (trigger) => {
    if (!(trigger instanceof HTMLElement) || !(transportWorkbenchSectionHelpPopover instanceof HTMLElement) || !(transportWorkbenchPanel instanceof HTMLElement)) {
      return;
    }
    const panelRect = transportWorkbenchPanel.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const popoverWidth = transportWorkbenchSectionHelpPopover.offsetWidth || 280;
    const popoverHeight = transportWorkbenchSectionHelpPopover.offsetHeight || 140;
    let left = triggerRect.right + 10;
    let top = triggerRect.top - 4;
    const minInset = 18;
    if (left + popoverWidth > panelRect.right - minInset) {
      left = triggerRect.left - popoverWidth - 10;
    }
    left = Math.min(Math.max(left, panelRect.left + minInset), Math.max(panelRect.left + minInset, panelRect.right - popoverWidth - minInset));
    top = Math.min(Math.max(top, panelRect.top + minInset), Math.max(panelRect.top + minInset, panelRect.bottom - popoverHeight - minInset));
    transportWorkbenchSectionHelpPopover.style.left = `${left}px`;
    transportWorkbenchSectionHelpPopover.style.top = `${top}px`;
  };

  const renderTransportWorkbenchSectionHelpPopover = (familyId, sectionKey) => {
    if (!transportWorkbenchSectionHelpTitle || !transportWorkbenchSectionHelpBody) return;
    const helpCopy = TRANSPORT_WORKBENCH_INLINE_HELP_COPY[familyId]?.[sectionKey];
    if (!helpCopy) return;
    transportWorkbenchSectionHelpTitle.textContent = t(helpCopy.title, "ui");
    transportWorkbenchSectionHelpBody.replaceChildren();
    const body = document.createElement("p");
    body.className = "transport-workbench-info-text";
    body.textContent = t(helpCopy.body, "ui");
    transportWorkbenchSectionHelpBody.appendChild(body);
  };

  const toggleTransportWorkbenchSectionHelpPopover = (trigger, familyId, sectionKey) => {
    if (!transportWorkbenchSectionHelpPopover) return;
    const isSameTarget = transportWorkbenchSectionHelpState
      && transportWorkbenchSectionHelpState.familyId === familyId
      && transportWorkbenchSectionHelpState.sectionKey === sectionKey
      && transportWorkbenchSectionHelpState.trigger === trigger
      && !transportWorkbenchSectionHelpPopover.classList.contains("hidden");
    if (isSameTarget) {
      closeTransportWorkbenchSectionHelpPopover({ restoreFocus: true });
      return;
    }
    closeTransportWorkbenchInfoPopover({ restoreFocus: false });
    closeTransportWorkbenchSectionHelpPopover({ restoreFocus: false });
    renderTransportWorkbenchSectionHelpPopover(familyId, sectionKey);
    transportWorkbenchSectionHelpState = { familyId, sectionKey, trigger };
    transportWorkbenchSectionHelpPopover.classList.remove("hidden");
    transportWorkbenchSectionHelpPopover.setAttribute("aria-hidden", "false");
    if (trigger instanceof HTMLElement) {
      trigger.setAttribute("aria-expanded", "true");
    }
    positionTransportWorkbenchSectionHelpPopover(trigger);
  };

  const getTransportWorkbenchDataContract = (familyId) => TRANSPORT_WORKBENCH_DATA_CONTRACTS[familyId] || null;
  const pickUiCopy = (zh, en) => (runtimeState.currentLanguage === "zh" ? zh : en);

  const renderTransportWorkbenchInfoContent = (family) => {
    if (!transportWorkbenchInfoBody) return;
    transportWorkbenchInfoBody.replaceChildren();
    const dataContract = getTransportWorkbenchDataContract(family.id);
    const defaultBlocks = [
      {
        title: "Current lens",
        body: family.lensBody,
      },
      {
        title: "Baseline",
        body: family.lensNext,
      },
      family.supportsDetailedControls
        ? {
          title: "Compare action",
          body: `Compare baseline temporarily swaps the preview to the locked ${family.label.toLowerCase()} baseline while the control is held. It never overwrites the working values in the left column.`,
        }
        : {
          title: "Availability",
          body: `${family.label} is still a reserved shell. Detailed controls stay closed until the live Japan schema and packs are wired.`,
        },
      {
        title: "Preview controls",
        body: "Use mouse wheel or the + / - controls to zoom. The 90° button swaps between the default north-up view and the quarter-turn inspection view. Reset View restores the framed default preview.",
      },
      dataContract
        ? {
          title: "Data path",
          body: `${dataContract.adapterId} stays on ${dataContract.packs.join(" + ")} using ${dataContract.geometrySource} with ${dataContract.hardeningSource}. Keep the pack build reproducible and diagnostics-friendly so rule changes can be traced later.`,
        }
        : null,
    ];
    const blocks = family.id === "layers"
      ? [
        {
          title: pickUiCopy("当前用途", "Current use"),
          body: pickUiCopy(
            "Layers 用来调整 transport families 的当前本地绘制顺序。中间排序板负责拖拽重排，Inspect 会同步回显当前顺序。",
            "Layers controls the current local draw order for transport families. Use the center board to drag and reorder families, and use Inspect to review the active order."
          ),
        },
        {
          title: pickUiCopy("排序板行为", "Board behavior"),
          body: pickUiCopy(
            "Layers 使用排序板模式。这里没有缩放、旋转或基线对比，重点是确认绘制顺序和 family 状态。",
            "Layers uses board mode. Zoom, rotate, and baseline compare are hidden here, and the main task is confirming draw order and family status."
          ),
        },
        {
          title: pickUiCopy("Inspector 分工", "Inspector role"),
          body: pickUiCopy(
            "左侧只保留上下文说明，真正的顺序确认在中间排序板和右侧 Inspect。其余页签继续保留统一结构，方便以后接入更多帮助内容。",
            "The left column keeps context only, while the center board and right-side Inspect confirm the active order. The remaining tabs stay in place so later help and controls can land without changing the shell."
          ),
        },
      ]
      : defaultBlocks;

    blocks.filter(Boolean).forEach((block) => {
      const node = document.createElement("section");
      node.className = "transport-workbench-info-block";
      const title = document.createElement("div");
      title.className = "transport-workbench-info-subtitle";
      title.textContent = t(block.title, "ui");
      const body = document.createElement("p");
      body.className = "transport-workbench-info-text";
      body.textContent = t(block.body, "ui");
      node.append(title, body);
      transportWorkbenchInfoBody.appendChild(node);
    });
  };

  const toggleTransportWorkbenchInfoPopover = () => {
    if (!transportWorkbenchInfoPopover) return;
    const willOpen = transportWorkbenchInfoPopover.classList.contains("hidden");
    if (!willOpen) {
      closeTransportWorkbenchInfoPopover({ restoreFocus: true });
      return;
    }
    closeTransportWorkbenchSectionHelpPopover({ restoreFocus: false });
    renderTransportWorkbenchInfoContent(getTransportWorkbenchFamilyMeta());
    rememberOverlayTrigger(transportWorkbenchInfoPopover, transportWorkbenchInfoBtn);
    transportWorkbenchInfoPopover.classList.remove("hidden");
    transportWorkbenchInfoPopover.setAttribute("aria-hidden", "false");
    transportWorkbenchInfoBtn?.setAttribute("aria-expanded", "true");
    focusOverlaySurface(transportWorkbenchInfoPopover);
  };

  const getTransportWorkbenchFamilyMeta = () => transportWorkbenchStateOwner.getFamilyMeta();

  const getTransportWorkbenchWorkingConfig = (familyId, { baseline = false } = {}) => {
    // baseline 只给按住 Compare 时的临时预览使用，不能回写 familyConfigs。
    return transportWorkbenchStateOwner.getWorkingConfig(familyId, { baseline });
  };

  const getTransportWorkbenchDisplayConfig = (familyId, { baseline = false } = {}) => {
    return transportWorkbenchStateOwner.getDisplayConfig(familyId, { baseline });
  };

  const buildTransportWorkbenchResolvedConfig = (familyId, familyConfig, displayConfig) => {
    const activePackId = getTransportWorkbenchActivePackId(familyId);
    // live preview 只认一份扁平 config；state owner 负责把 displayConfig 映射回旧 preview 合约。
    return transportWorkbenchStateOwner.buildResolvedConfig(familyId, familyConfig, displayConfig, activePackId);
  };

  const getTransportWorkbenchConfigSignature = (config) => JSON.stringify(config || {});

  const getTransportWorkbenchActivePackId = (familyId) => (
    transportWorkbenchApplyBridgeOwner.getActivePackId(familyId)
  );

  const isCurrentTransportWorkbenchPackGate = (normalizedPackId) => (
    runtimeState.transportWorkbenchUi?.open
    && getTransportWorkbenchActivePackId(runtimeState.transportWorkbenchUi.activeFamily) === normalizedPackId
  );

  const refreshTransportWorkbenchPackGateReport = (packId, { rerender = false } = {}) => (
    transportWorkbenchApplyBridgeOwner.refreshPackGateReport(packId, {
      rerender,
    })
  );

  const setTransportWorkbenchActivePackId = (packId, { rerender = true } = {}) => {
    const meta = transportWorkbenchStateOwner.setActivePackId(packId);
    if (!meta) return false;
    refreshTransportWorkbenchPackGateReport(meta.packId, { rerender: true });
    if (rerender) renderTransportWorkbenchUi();
    return true;
  };

  const getTransportWorkbenchApplyButtonState = (familyId) => (
    transportWorkbenchApplyBridgeOwner.getApplyButtonState(familyId)
  );

  const applyTransportWorkbenchFamilyToMainMap = (context) => (
    transportWorkbenchApplyBridgeOwner.applyFamilyToMainMap(context)
  );

  const setTransportWorkbenchCompareHeld = (nextHeld) => {
    if (transportWorkbenchStateOwner.setCompareHeld(nextHeld)) {
      renderTransportWorkbenchUi();
    }
  };

  const updateTransportWorkbenchFamilyConfig = (familyId, key, nextValue, { appendValue = null } = {}) => {
    if (!transportWorkbenchStateOwner.updateFamilyConfig(familyId, key, nextValue, { appendValue })) return;
    // 控件改动先落到工作台 state，再即时刷新预览；这里不直接改 renderer 的正式图层状态。
    markDirty("transport-workbench-config");
    const nextContext = getTransportWorkbenchRenderContext();
    renderTransportWorkbenchLensSections(nextContext.family, nextContext.config, nextContext.compareHeld);
    renderTransportWorkbenchInspectorTabs(nextContext.family, nextContext.config, nextContext.compareHeld);
    renderTransportWorkbenchInspector(nextContext.family, nextContext.config, nextContext.compareHeld);
    refreshTransportWorkbenchPreview(nextContext, { allowCarrierPrep: false });
  };

  const updateTransportWorkbenchDisplayConfig = (familyId, updateFn) => {
    if (!transportWorkbenchStateOwner.updateDisplayConfig(familyId, updateFn)) return;
    markDirty("transport-workbench-display-config");
    const nextContext = getTransportWorkbenchRenderContext();
    renderTransportWorkbenchLensSections(nextContext.family, nextContext.config, nextContext.compareHeld);
    renderTransportWorkbenchInspectorTabs(nextContext.family, nextContext.config, nextContext.compareHeld);
    renderTransportWorkbenchInspector(nextContext.family, nextContext.config, nextContext.compareHeld);
    refreshTransportWorkbenchPreview(nextContext, { allowCarrierPrep: false });
  };

  const toggleTransportWorkbenchSection = (familyId, sectionKey, nextOpen) => {
    transportWorkbenchStateOwner.toggleSection(familyId, sectionKey, nextOpen);
  };

  const createTransportWorkbenchSectionHelpButton = (familyId, section) => {
    if (!TRANSPORT_WORKBENCH_INLINE_HELP_SECTIONS[familyId]?.has(section.key)) {
      return null;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "transport-workbench-section-help-btn";
    button.textContent = "?";
    const helpLabel = t("Open section help", "ui");
    button.setAttribute("aria-label", helpLabel);
    button.setAttribute("title", helpLabel);
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleTransportWorkbenchSectionHelpPopover(button, familyId, section.key);
    });
    return button;
  };

  const getTransportWorkbenchLayerFamilyMeta = (familyId) => (
    TRANSPORT_WORKBENCH_FAMILIES.find((family) => family.id === familyId)
    || TRANSPORT_WORKBENCH_FAMILIES[0]
  );

  const renderTransportWorkbenchLayerOrderPanel = () => {
    if (!transportWorkbenchLayerOrderPanel || !transportWorkbenchLayerOrderList) return;
    ensureTransportWorkbenchUiState();
    transportWorkbenchLayerOrderList.replaceChildren();
    runtimeState.transportWorkbenchUi.layerOrder.forEach((familyId) => {
      const family = getTransportWorkbenchLayerFamilyMeta(familyId);
      const item = document.createElement("div");
      item.className = "transport-workbench-layer-order-item";
      item.draggable = true;
      item.dataset.layerFamily = family.id;

      item.addEventListener("dragstart", () => {
        transportWorkbenchDraggedLayerId = family.id;
        item.classList.add("is-dragging");
      });
      item.addEventListener("dragend", () => {
        transportWorkbenchDraggedLayerId = "";
        item.classList.remove("is-dragging");
      });
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        if (!transportWorkbenchStateOwner.moveLayerOrder(transportWorkbenchDraggedLayerId, family.id)) return;
        markDirty("transport-workbench-layer-order");
        const context = getTransportWorkbenchRenderContext();
        renderTransportWorkbenchLayerOrderPanel();
        renderTransportWorkbenchInspector(context.family, context.config, context.compareHeld);
      });

      const handle = document.createElement("span");
      handle.className = "transport-workbench-layer-order-handle";
      handle.textContent = ":::";

      const meta = document.createElement("div");
      meta.className = "transport-workbench-layer-order-meta";
      const name = document.createElement("div");
      name.className = "transport-workbench-layer-order-name";
      name.textContent = t(family.label, "ui");
      const caption = document.createElement("div");
      caption.className = "transport-workbench-layer-order-caption";
      caption.textContent = t(
        isTransportWorkbenchLivePreviewFamily(family.id)
          ? "Live preview is already wired into the Japan carrier."
          : isTransportWorkbenchManifestOnlyRuntimeFamily(family.id)
            ? "Inspector now reads the live manifest and build audit."
            : "Reserved family shell. Real renderer attaches later.",
        "ui"
      );
      meta.append(name, caption);

      const status = document.createElement("span");
      status.className = "transport-workbench-layer-order-state";
      status.textContent = t(
        isTransportWorkbenchLivePreviewFamily(family.id)
          ? "Live now"
          : isTransportWorkbenchManifestOnlyRuntimeFamily(family.id)
            ? "Metadata live"
            : "Reserved",
        "ui"
      );
      if (isTransportWorkbenchLivePreviewFamily(family.id)) {
        status.classList.add("is-live");
      }

      item.append(handle, meta, status);
      transportWorkbenchLayerOrderList.appendChild(item);
    });
  };

  const renderTransportWorkbenchControl = (familyId, control, config, compareHeld) => {
    const previewSnapshot = getTransportWorkbenchFamilyPreviewSnapshot(familyId, config);
    const resolvedOptions = typeof control.options === "function"
      ? (control.options({ familyId, config, previewSnapshot }) || [])
      : (control.options || []);
    const field = document.createElement("div");
    field.className = "transport-workbench-field";
    const title = document.createElement("div");
    title.className = "transport-workbench-field-title";
    title.textContent = t(control.label, "ui");
    field.appendChild(title);

    if (control.type === "toggle") {
      const label = document.createElement("label");
      label.className = "transport-workbench-toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!config[control.key];
      input.disabled = compareHeld;
      input.addEventListener("change", () => updateTransportWorkbenchFamilyConfig(familyId, control.key, input.checked));
      const text = document.createElement("span");
      text.textContent = t(input.checked ? "Enabled" : "Disabled", "ui");
      input.addEventListener("change", () => {
        text.textContent = t(input.checked ? "Enabled" : "Disabled", "ui");
      });
      label.appendChild(input);
      label.appendChild(text);
      field.appendChild(label);
      return field;
    }

    if (control.type === "select") {
      const select = document.createElement("select");
      select.className = "select-input transport-workbench-select";
      select.disabled = compareHeld;
      resolvedOptions.forEach((option) => {
        const optionNode = document.createElement("option");
        optionNode.value = option.value;
        optionNode.textContent = t(option.label, "ui");
        optionNode.selected = option.value === config[control.key];
        select.appendChild(optionNode);
      });
      select.addEventListener("change", () => updateTransportWorkbenchFamilyConfig(familyId, control.key, select.value));
      field.appendChild(select);
      return field;
    }

    if (control.type === "range") {
      const rangeRow = document.createElement("div");
      rangeRow.className = "transport-workbench-range-row";
      const range = document.createElement("input");
      range.type = "range";
      range.className = "transport-workbench-range";
      range.min = String(control.min);
      range.max = String(control.max);
      range.step = String(control.step || 1);
      range.value = String(config[control.key]);
      range.disabled = compareHeld;
      const value = document.createElement("span");
      value.className = "transport-workbench-range-value";
      const formatRangeValue = (rawValue) => {
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) return `${rawValue}${control.unit || ""}`;
        if (String(control.step || "").includes(".")) {
          return `${numericValue.toFixed(2).replace(/\.?0+$/, "")}${control.unit || ""}`;
        }
        return `${numericValue}${control.unit || ""}`;
      };
      value.textContent = formatRangeValue(config[control.key]);
      range.addEventListener("input", () => {
        value.textContent = formatRangeValue(range.value);
      });
      range.addEventListener("change", () => {
        updateTransportWorkbenchFamilyConfig(familyId, control.key, Number(range.value));
      });
      rangeRow.appendChild(range);
      rangeRow.appendChild(value);
      field.appendChild(rangeRow);
      return field;
    }

    if (control.type === "multi") {
      const optionGrid = document.createElement("div");
      optionGrid.className = "transport-workbench-option-grid";
      const defaultValuesWhenEmpty = control.defaultAllWhenEmpty
        ? resolvedOptions.filter((option) => !option.disabled).map((option) => option.value)
        : [];
      resolvedOptions.forEach((option) => {
        const label = document.createElement("label");
        label.className = "transport-workbench-option-pill";
        if (option.disabled) {
          label.classList.add("is-disabled");
        }
        const input = document.createElement("input");
        input.type = "checkbox";
        const configuredValues = Array.isArray(config[control.key]) ? config[control.key] : [];
        const effectiveValues = configuredValues.length === 0 && control.defaultAllWhenEmpty
          ? defaultValuesWhenEmpty
          : configuredValues;
        input.checked = effectiveValues.includes(option.value);
        input.disabled = compareHeld || !!option.disabled;
        input.addEventListener("change", () => {
          if (control.defaultAllWhenEmpty) {
            const nextValues = [...effectiveValues];
            const valueIndex = nextValues.indexOf(option.value);
            if (input.checked) {
              if (valueIndex === -1) nextValues.push(option.value);
            } else if (valueIndex !== -1) {
              nextValues.splice(valueIndex, 1);
            }
            updateTransportWorkbenchFamilyConfig(familyId, control.key, nextValues);
            return;
          }
          updateTransportWorkbenchFamilyConfig(familyId, control.key, input.checked, { appendValue: option.value });
        });
        const text = document.createElement("span");
        text.textContent = t(option.label, "ui");
        label.appendChild(input);
        label.appendChild(text);
        optionGrid.appendChild(label);
      });
      field.appendChild(optionGrid);
      return field;
    }

    return field;
  };

  const createTransportWorkbenchSectionNode = (family, section, config, compareHeld) => {
    const visibleControls = (section.controls || []).filter((control) => (
      typeof control.showWhen !== "function" || control.showWhen(config)
    ));
    if (section.kind !== "diagnostics" && visibleControls.length === 0) {
      return null;
    }
    const details = document.createElement("details");
    details.className = "transport-workbench-section";
    details.open = !!runtimeState.transportWorkbenchUi.sectionOpen?.[family.id]?.[section.key];
    details.addEventListener("toggle", () => {
      toggleTransportWorkbenchSection(family.id, section.key, details.open);
    });
    const summary = document.createElement("summary");
    summary.className = "transport-workbench-section-summary";
    const heading = document.createElement("div");
    heading.className = "transport-workbench-section-heading";
    const title = document.createElement("div");
    title.className = "transport-workbench-section-title";
    title.textContent = t(section.title, "ui");
    const actions = document.createElement("div");
    actions.className = "transport-workbench-section-actions";
    const helpButton = createTransportWorkbenchSectionHelpButton(family.id, section);
    if (helpButton) {
      actions.appendChild(helpButton);
    }
    const chevron = document.createElement("span");
    chevron.className = "transport-workbench-section-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "▾";
    actions.appendChild(chevron);
    heading.appendChild(title);
    summary.appendChild(heading);
    summary.appendChild(actions);
    details.appendChild(summary);
    const body = section.kind === "diagnostics"
      ? transportWorkbenchInspectorOwner.renderDiagnosticsBody(family.id, config)
      : document.createElement("div");
    if (section.kind !== "diagnostics") {
      body.className = "transport-workbench-section-body";
      if (section.description) {
        const description = document.createElement("p");
        description.className = "transport-workbench-section-description";
        description.textContent = t(section.description, "ui");
        body.appendChild(description);
      }
      visibleControls.forEach((control) => {
        body.appendChild(renderTransportWorkbenchControl(family.id, control, config, compareHeld));
      });
    } else if (section.description) {
      const description = document.createElement("p");
      description.className = "transport-workbench-section-description transport-workbench-section-description-diagnostics";
      description.textContent = t(section.description, "ui");
      body.prepend(description);
    }
    details.appendChild(body);
    return details;
  };

  const createTransportWorkbenchShellCard = (family, tabId, config) => {
    if (!TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS.has(family.id)) {
      return null;
    }
    const displayConfig = getTransportWorkbenchDisplayConfig(family.id);
    const card = document.createElement("div");
    card.className = "transport-workbench-note-card transport-workbench-note-card-soft transport-workbench-shell-card";
    const heading = document.createElement("div");
    heading.className = "transport-workbench-shell-heading";
    const title = document.createElement("div");
    title.className = "transport-workbench-note-title";
    title.textContent = t(
      tabId === "display"
        ? "Display settings"
        : tabId === "aggregation"
          ? "Aggregation settings"
          : tabId === "labels"
            ? "Label settings"
            : "Coverage settings",
      "ui"
    );
    const kicker = document.createElement("span");
    kicker.className = "transport-workbench-shell-kicker";
    kicker.textContent = t("Current settings", "ui");
    heading.append(title, kicker);
    card.appendChild(heading);
    const grid = document.createElement("div");
    grid.className = "transport-workbench-shell-grid";
    const addShellSelect = (labelText, value, options, onChange, mountTarget = grid) => {
      const control = document.createElement("div");
      control.className = "transport-workbench-shell-control";
      const label = document.createElement("div");
      label.className = "transport-workbench-shell-label";
      label.textContent = t(labelText, "ui");
      const select = document.createElement("select");
      select.className = "select-input transport-workbench-select";
      options.forEach((option) => {
        const optionNode = document.createElement("option");
        optionNode.value = option.value;
        optionNode.textContent = t(option.label, "ui");
        optionNode.selected = option.value === value;
        select.appendChild(optionNode);
      });
      select.addEventListener("change", () => onChange(select.value));
      control.append(label, select);
      mountTarget.appendChild(control);
    };
    const addShellRange = (labelText, value, min, max, step, unit, onChange, mountTarget = grid) => {
      const control = document.createElement("div");
      control.className = "transport-workbench-shell-control";
      const label = document.createElement("div");
      label.className = "transport-workbench-shell-label";
      label.textContent = t(labelText, "ui");
      const row = document.createElement("div");
      row.className = "transport-workbench-range-row";
      const input = document.createElement("input");
      input.type = "range";
      input.className = "transport-workbench-range";
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      const valueNode = document.createElement("span");
      valueNode.className = "transport-workbench-range-value";
      valueNode.textContent = `${value}${unit}`;
      input.addEventListener("input", () => {
        valueNode.textContent = `${input.value}${unit}`;
      });
      input.addEventListener("change", () => onChange(Number(input.value)));
      row.append(input, valueNode);
      control.append(label, row);
      mountTarget.appendChild(control);
    };
    const addShellToggle = (labelText, checked, onChange, mountTarget = grid) => {
      const control = document.createElement("div");
      control.className = "transport-workbench-shell-control";
      const label = document.createElement("div");
      label.className = "transport-workbench-shell-label";
      label.textContent = t(labelText, "ui");
      const toggle = document.createElement("label");
      toggle.className = "transport-workbench-toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!checked;
      const text = document.createElement("span");
      text.textContent = input.checked ? t("Enabled", "ui") : t("Disabled", "ui");
      input.addEventListener("change", () => {
        text.textContent = input.checked ? t("Enabled", "ui") : t("Disabled", "ui");
        onChange(input.checked);
      });
      toggle.append(input, text);
      control.append(label, toggle);
      mountTarget.appendChild(control);
    };
    if (tabId === "display") {
      addShellSelect("Mode", displayConfig.mode, [
        { value: "inspect", label: "Inspect" },
        { value: "aggregate", label: "Aggregate" },
        { value: "density", label: "Density" },
      ], (nextValue) => updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
        draft.mode = nextValue;
      }));
      addShellSelect("Preset", displayConfig.preset, [
        { value: "review_first", label: "Review first" },
        { value: "balanced", label: "Balanced" },
        { value: "pattern_first", label: "Pattern first" },
        { value: "extreme_density", label: "Extreme density" },
      ], (nextValue) => updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
        draft.preset = nextValue;
      }));
    } else if (tabId === "aggregation") {
      const algorithmOptions = family.id === "mineral_resources"
        ? [
          { value: "hex", label: "Hex grid" },
          { value: "square", label: "Square grid" },
          { value: "density_surface", label: "Density surface" },
        ]
        : family.id === "industrial_zones"
          ? [
            { value: "square", label: "Square grid" },
            { value: "density_surface", label: "Density surface" },
          ]
          : [
            { value: "cluster", label: "Cluster" },
            { value: "square", label: "Grid" },
            { value: "density_surface", label: "Density surface" },
          ];
      addShellSelect("Algorithm", displayConfig.aggregation.algorithm, algorithmOptions, (nextValue) => {
        updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
          draft.aggregation.algorithm = nextValue;
        });
      });
      addShellRange(
        "Cell size",
        Number(displayConfig.aggregation.thresholds?.cellSizePx || config?.aggregationCellSizePx || 44),
        24,
        96,
        2,
        "px",
        (nextValue) => updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
          draft.aggregation.thresholds.cellSizePx = nextValue;
        })
      );
    } else if (tabId === "labels") {
      addShellSelect("Geographic level", mapTransportWorkbenchMaxLevelToLabelLevel(displayConfig.labels.maxLevel), [
        { value: "region", label: "Level 1 region" },
        { value: "anchor", label: "Level 2 anchor" },
        { value: "category", label: "Level 3 category" },
      ], (nextValue) => updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
        draft.labels.maxLevel = mapTransportWorkbenchLabelLevelToMaxLevel(nextValue);
      }));
      addShellRange(
        "Label budget",
        Number(displayConfig.labels.budget || config?.labelBudget || 8),
        3,
        18,
        1,
        "",
        (nextValue) => updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
          draft.labels.budget = nextValue;
        })
      );
      addShellToggle("Allow label aggregation", !!displayConfig.labels.allowAggregation, (nextValue) => {
        updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
          draft.labels.allowAggregation = nextValue;
        });
      });
    } else if (tabId === "coverage") {
      if (family.id === "port") {
        addShellSelect("Coverage tier", displayConfig.coverage || "core", [
          { value: "core", label: "Core" },
          { value: "expanded", label: "Expanded" },
          { value: "full_official", label: "Full official" },
        ], (nextValue) => updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
          draft.coverage = nextValue;
        }));
      }
    }
    const note = document.createElement("p");
    note.className = "transport-workbench-shell-note";
    note.textContent = tabId === "data"
      ? t("Manifest and audit stay read-only here so control tuning and source truth do not get mixed.", "ui")
      : t("Use this panel to adjust the current family without changing the lens column context.", "ui");
    card.append(grid, note);
    return card;
  };

  const getTransportWorkbenchSectionsForTab = (familyId, tabId) => {
    const sectionMap = TRANSPORT_WORKBENCH_TAB_SECTION_MAP[familyId] || {};
    const allowedSectionKeys = new Set(sectionMap[tabId] || []);
    return (TRANSPORT_WORKBENCH_CONTROL_SCHEMAS[familyId] || []).filter((section) => allowedSectionKeys.has(section.key));
  };

  const renderTransportWorkbenchTabSections = (family, config, compareHeld, tabId, mountNode) => {
    if (!(mountNode instanceof HTMLElement)) return;
    const displayConfig = getTransportWorkbenchDisplayConfig(family.id);
    const appendShellRange = (labelText, value, min, max, step, unit, onChange, mountTarget) => {
      const control = document.createElement("div");
      control.className = "transport-workbench-shell-control";
      const label = document.createElement("div");
      label.className = "transport-workbench-shell-label";
      label.textContent = t(labelText, "ui");
      const row = document.createElement("div");
      row.className = "transport-workbench-range-row";
      const input = document.createElement("input");
      input.type = "range";
      input.className = "transport-workbench-range";
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      const valueText = document.createElement("span");
      valueText.className = "transport-workbench-range-value";
      const formatValue = (nextValue) => `${nextValue}${unit || ""}`;
      valueText.textContent = formatValue(value);
      input.addEventListener("input", () => {
        const nextValue = Number(input.value);
        valueText.textContent = formatValue(nextValue);
        onChange(nextValue);
      });
      row.append(input, valueText);
      control.append(label, row);
      mountTarget.appendChild(control);
    };
    mountNode.replaceChildren();
    const shellCard = createTransportWorkbenchShellCard(family, tabId, config);
    if (shellCard) {
      mountNode.appendChild(shellCard);
    }
    const skipDefaultSections = TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS.has(family.id)
      && (tabId === "aggregation" || tabId === "labels");
    if (!skipDefaultSections) {
      getTransportWorkbenchSectionsForTab(family.id, tabId).forEach((section) => {
        const node = createTransportWorkbenchSectionNode(family, section, config, compareHeld);
        if (node) {
          mountNode.appendChild(node);
        }
      });
    }
    if (tabId === "aggregation" || tabId === "labels") {
      const advanced = document.createElement("details");
      advanced.className = "transport-workbench-advanced";
      const summary = document.createElement("summary");
      summary.textContent = t("Advanced", "ui");
      advanced.appendChild(summary);
      const body = document.createElement("div");
      body.className = "transport-workbench-section-body transport-workbench-section-body-advanced";
      const copy = document.createElement("p");
      copy.className = "transport-workbench-section-description";
      copy.textContent = tabId === "aggregation"
        ? pickUiCopy(
          "这里放当前聚合精调项，例如 cluster radius、cell size 和密度触发阈值。默认折叠，便于先完成主设置，再做细调。",
          "This section contains active aggregation fine-tuning controls such as cluster radius, cell size, and density thresholds. It stays collapsed by default so the main setup remains easy to scan."
        )
        : pickUiCopy(
          "这里放当前标签精调项，例如 label separation 和聚合阈值。默认折叠，便于先完成主设置，再做细调。",
          "This section contains active label fine-tuning controls such as label separation and aggregation thresholds. It stays collapsed by default so the main setup remains easy to scan."
        );
      if (tabId === "aggregation") {
        appendShellRange(
          "Cluster radius",
          Number(displayConfig.aggregation.thresholds?.clusterRadiusPx || config?.aggregationClusterRadiusPx || 48),
          24,
          120,
          2,
          "px",
          (nextValue) => updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
            draft.aggregation.thresholds.clusterRadiusPx = nextValue;
          }),
          body
        );
      } else {
        appendShellRange(
          "Label separation",
          Number(displayConfig.labels.separationStrength || config?.labelSeparation || 1),
          0.7,
          1.8,
          0.05,
          "",
          (nextValue) => updateTransportWorkbenchDisplayConfig(family.id, (draft) => {
            draft.labels.separationStrength = nextValue;
          }),
          body
        );
      }
      body.appendChild(copy);
      advanced.appendChild(body);
      mountNode.appendChild(advanced);
    }
    if (mountNode.childElementCount === 0) {
      const empty = document.createElement("div");
      empty.className = "transport-workbench-empty-card";
      const title = document.createElement("div");
      title.className = "transport-workbench-empty-title";
      title.textContent = tabId === "data" ? t("No audit payload yet", "ui") : t("No controls in this tab", "ui");
      const body = document.createElement("p");
      body.className = "transport-workbench-empty-text";
      body.textContent = tabId === "data"
        ? t("This family has not exposed extra manifest or audit cards in the current shell.", "ui")
        : family.id === "layers"
          ? pickUiCopy(
            "Layers 的主要操作在中间排序板完成。Inspect 用来确认当前顺序，其余页签保留统一结构。",
            "Layers is operated from the center reorder board. Inspect confirms the active order, and the remaining tabs keep the shared workbench structure."
          )
          : pickUiCopy(
            "这个 family 当前没有单独的页签控件。请在有内容的页签中调整真实规则，Inspect 会继续显示当前状态。",
            "This family does not expose separate controls in this tab yet. Use the populated tabs for active tuning, and use Inspect to confirm the current runtimeState."
          );
      empty.append(title, body);
      mountNode.appendChild(empty);
    }
  };

  const renderTransportWorkbenchInspectorTabs = (family, config, compareHeld) => {
    const activeTab = transportWorkbenchStateOwner.setInspectorTab(runtimeState.transportWorkbenchUi.activeInspectorTab);
    transportWorkbenchInspectorTabButtons.forEach((button) => {
      const isActive = String(button.dataset.transportInspectorTab || "") === activeTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    Object.entries(transportWorkbenchInspectorPanels).forEach(([tabId, panel]) => {
      if (!(panel instanceof HTMLElement)) return;
      panel.classList.toggle("hidden", tabId !== activeTab);
      panel.classList.toggle("is-active", tabId === activeTab);
    });
    renderTransportWorkbenchTabSections(family, config, compareHeld, "display", transportWorkbenchDisplaySections);
    renderTransportWorkbenchTabSections(family, config, compareHeld, "aggregation", transportWorkbenchAggregationSections);
    renderTransportWorkbenchTabSections(family, config, compareHeld, "labels", transportWorkbenchLabelSections);
    renderTransportWorkbenchTabSections(family, config, compareHeld, "coverage", transportWorkbenchCoverageSections);
    renderTransportWorkbenchTabSections(family, config, compareHeld, "data", transportWorkbenchDataSections);
  };

  const renderTransportWorkbenchLensSections = (family, config, compareHeld) => {
    if (!transportWorkbenchLensSections) return;
    closeTransportWorkbenchSectionHelpPopover({ restoreFocus: false });
    transportWorkbenchLensSections.replaceChildren();
    if (family.id === "layers") {
      const card = document.createElement("div");
      card.className = "transport-workbench-empty-card";
      const title = document.createElement("div");
      title.className = "transport-workbench-empty-title";
      title.textContent = t("Future draw stack", "ui");
      const body = document.createElement("p");
      body.className = "transport-workbench-empty-text";
      body.textContent = pickUiCopy(
        "使用中间排序板调整 8 个 transport families 的绘制顺序。左侧负责上下文，右侧负责状态查看。",
        "Use the center board to reorder the 8 transport families. The left column provides context, and the right column mirrors the current runtimeState."
      );
      card.append(title, body);
      transportWorkbenchLensSections.appendChild(card);
      return;
    }
    const previewSnapshot = getTransportWorkbenchFamilyPreviewSnapshot(family.id, config);
    const dataContract = getTransportWorkbenchDataContract(family.id);
    const overview = document.createElement("div");
    overview.className = "transport-workbench-note-card transport-workbench-note-card-emphasis";
    const overviewTitle = document.createElement("div");
    overviewTitle.className = "transport-workbench-note-title";
    overviewTitle.textContent = t("Review focus", "ui");
    const overviewBody = document.createElement("p");
    overviewBody.className = "transport-workbench-note-text";
    overviewBody.textContent = `${family.lensBody} ${family.lensNext}`;
    overview.append(overviewTitle, overviewBody);
    transportWorkbenchLensSections.appendChild(overview);
    const summaryCard = document.createElement("div");
    summaryCard.className = "transport-workbench-note-card transport-workbench-note-card-soft transport-workbench-lens-summary";
    const summaryTitle = document.createElement("div");
    summaryTitle.className = "transport-workbench-note-title";
    summaryTitle.textContent = t("Current context", "ui");
    summaryCard.appendChild(summaryTitle);
    transportWorkbenchInspectorOwner.buildLensSummaryRows({
      family,
      previewSnapshot,
      dataContract,
      compareHeld,
      rightDeckLabel: t("Display / Aggregation / Labels / Coverage / Data", "ui"),
    }).forEach(([label, value]) => {
      summaryCard.appendChild(transportWorkbenchInspectorOwner.createRow(label, value));
    });
    transportWorkbenchLensSections.appendChild(summaryCard);
  };

  const renderTransportWorkbenchInspector = (family, config, compareHeld) => {
    if (transportWorkbenchInspectorDetails) {
      transportWorkbenchInspectorDetails.replaceChildren();
      const inspectorEmptyCard = transportWorkbenchInspectorEmptyTitle?.parentElement || null;
      const dataContract = getTransportWorkbenchDataContract(family.id);
      const previewSnapshot = getTransportWorkbenchFamilyPreviewSnapshot(family.id, config);
      const inspectorModel = transportWorkbenchInspectorOwner.buildInspectorModel({
        family,
        config,
        compareHeld,
        previewSnapshot,
        dataContract,
      });
      inspectorModel.stateCards.forEach((card) => {
        transportWorkbenchInspectorDetails.appendChild(
          transportWorkbenchInspectorOwner.createStateCardNode(card.title, card.body, card.tone),
        );
      });
      inspectorModel.rows.forEach((entry, index) => {
        if (Array.isArray(entry)) {
          const row = transportWorkbenchInspectorOwner.createRow(entry[0], entry[1], {
            familyId: family.id,
            index,
          });
          transportWorkbenchInspectorDetails.appendChild(row);
          return;
        }
        transportWorkbenchInspectorDetails.appendChild(entry);
      });
      if (inspectorEmptyCard) {
        inspectorEmptyCard.classList.toggle("hidden", transportWorkbenchInspectorDetails.childElementCount > 0);
      }
    }
    renderTransportWorkbenchInspectorTabs(family, config, compareHeld);
  };

  const syncTransportWorkbenchPreviewControls = () => {
    const carrierViewState = getTransportWorkbenchCarrierViewState();
    const isAlternateTurn = carrierViewState.quarterTurns !== 0;
    if (transportWorkbenchZoomOutBtn) transportWorkbenchZoomOutBtn.textContent = "-";
    if (transportWorkbenchZoomInBtn) transportWorkbenchZoomInBtn.textContent = "+";
    if (transportWorkbenchRotateBtn) transportWorkbenchRotateBtn.textContent = "90°";
    transportWorkbenchRotateBtn?.classList.toggle("is-active", isAlternateTurn);
    transportWorkbenchRotateBtn?.setAttribute("aria-pressed", isAlternateTurn ? "true" : "false");
  };

  const getTransportWorkbenchRenderContext = () => {
    ensureTransportWorkbenchUiState();
    const uiState = runtimeState.transportWorkbenchUi;
    const family = getTransportWorkbenchFamilyMeta();
    const isOpen = !!uiState.open;
    const compareHeld = !!uiState.compareHeld && !!family.supportsDetailedControls;
    const familyConfig = getTransportWorkbenchWorkingConfig(family.id, { baseline: compareHeld });
    const displayConfig = getTransportWorkbenchDisplayConfig(family.id, { baseline: compareHeld });
    // context 是 shell、lens、inspect 和 preview 的共同输入，避免四处重复读取 runtimeState。
    const config = buildTransportWorkbenchResolvedConfig(family.id, familyConfig, displayConfig);
    const activePackId = getTransportWorkbenchActivePackId(family.id);
    refreshTransportWorkbenchPackGateReport(activePackId, { rerender: true });
    const activePackMeta = getTargetMainMapPackMeta(activePackId);
    return {
      uiState,
      family,
      activePackId,
      activePackMeta,
      isOpen,
      compareHeld,
      displayConfig,
      config,
    };
  };

  const isTransportWorkbenchRenderGenerationCurrent = (renderGeneration, familyId) => (
    transportWorkbenchPreviewLifecycleOwner.isRenderGenerationCurrent(renderGeneration, familyId)
  );

  const refreshTransportWorkbenchPreview = (context, { allowCarrierPrep = true } = {}) => (
    transportWorkbenchPreviewLifecycleOwner.refreshPreview(context, { allowCarrierPrep })
  );

  const renderTransportWorkbenchShell = (context) => {
    const { uiState, family, isOpen, compareHeld } = context;
    document.body.classList.toggle("transport-workbench-open", isOpen);
    transportWorkbenchOverlay?.classList.toggle("hidden", !isOpen);
    transportWorkbenchOverlay?.setAttribute("aria-hidden", isOpen ? "false" : "true");
    scenarioTransportWorkbenchBtn?.setAttribute("aria-expanded", isOpen ? "true" : "false");
    scenarioTransportWorkbenchBtn?.setAttribute("title", isOpen ? t("Close transport workbench", "ui") : t("Open transport workbench", "ui"));
    transportWorkbenchTitle.textContent = t(family.title, "ui");
    transportWorkbenchLensTitle.textContent = t(family.lensTitle, "ui");
    transportWorkbenchFamilyStatus.textContent = t(family.label, "ui");
    transportWorkbenchCountryStatus.textContent = context.activePackMeta?.country || uiState.sampleCountry;
    if (transportWorkbenchPackSelect) {
      const packOptions = listTargetMainMapPacks({ familyId: family.id });
      transportWorkbenchPackSelect.replaceChildren(...packOptions.map((pack) => {
        const option = document.createElement("option");
        option.value = pack.packId;
        option.textContent = pack.label;
        return option;
      }));
      transportWorkbenchPackSelect.disabled = packOptions.length === 0;
      transportWorkbenchPackSelect.value = context.activePackId || "";
    }
    transportWorkbenchPreviewMode.textContent = family.id === "layers"
      ? t("Layer order", "ui")
      : TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS.has(family.id)
        ? `${String(context.config?.displayMode || "inspect").replace(/_/g, " ")} · ${String(context.config?.displayPreset || "balanced").replace(/_/g, " ")}`
        : uiState.previewMode === "bounded_zoom_pan"
          ? t("Zoom / pan / quarter-turn", "ui")
          : uiState.previewMode;
    transportWorkbenchPreviewTitle.textContent = family.id === "layers"
      ? t(family.previewTitle, "ui")
      : (uiState.sampleCountry === "Japan" ? t("Japan preview", "ui") : `${uiState.sampleCountry} preview`);
    const applyButtonState = getTransportWorkbenchApplyButtonState(family.id);
    if (transportWorkbenchCompareBtn) {
      transportWorkbenchCompareBtn.disabled = !family.supportsDetailedControls;
      transportWorkbenchCompareBtn.setAttribute("aria-disabled", family.supportsDetailedControls ? "false" : "true");
      transportWorkbenchCompareBtn.classList.toggle("is-held", compareHeld);
      transportWorkbenchCompareBtn.textContent = family.supportsDetailedControls
        ? t("Compare baseline", "ui")
        : t("Baseline unavailable", "ui");
    }
    if (transportWorkbenchCompareStatus) {
      transportWorkbenchCompareStatus.textContent = !family.supportsDetailedControls
        ? (family.id === "layers" ? t("Local layer board", "ui") : t("Workbench runtime state", "ui"))
        : compareHeld
          ? t("Baseline preview", "ui")
          : t("Live working state", "ui");
    }
    if (transportWorkbenchInfoPopover && !transportWorkbenchInfoPopover.classList.contains("hidden")) {
      renderTransportWorkbenchInfoContent(family);
    }
    transportWorkbenchInspectorTitle.textContent = `${t(family.label, "ui")} ${t("inspector", "ui")}`;
    transportWorkbenchInspectorEmptyTitle.textContent = t(family.inspectorEmptyTitle, "ui");
    transportWorkbenchInspectorEmptyBody.textContent = t(family.inspectorEmptyBody, "ui");
    transportWorkbenchPreviewCanvas?.classList.toggle("is-layer-order-mode", family.id === "layers");
    transportWorkbenchPreviewActions?.classList.toggle("hidden", family.id === "layers");
    transportWorkbenchPreviewControls?.classList.toggle("hidden", family.id === "layers");
    transportWorkbenchCarrierMount?.classList.toggle("hidden", family.id === "layers");
    transportWorkbenchLayerOrderPanel?.classList.toggle("hidden", family.id !== "layers");
    setTransportWorkbenchCarrierFamily(family.id);
    syncTransportWorkbenchPreviewControls();
    transportWorkbenchFamilyTabs.forEach((button) => {
      const isActive = String(button.dataset.transportFamily || "") === family.id;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    renderTransportWorkbenchInspectorTabs(family, context.config || uiState.familyConfigs?.[family.id] || {}, compareHeld);
    if (transportWorkbenchApplyBtn) {
      transportWorkbenchApplyBtn.disabled = !applyButtonState.enabled;
      transportWorkbenchApplyBtn.setAttribute("aria-disabled", applyButtonState.enabled ? "false" : "true");
      transportWorkbenchApplyBtn.textContent = applyButtonState.label;
      transportWorkbenchApplyBtn.title = applyButtonState.reason || applyButtonState.label;
    }
  };

  const renderTransportWorkbenchUi = () => {
    if (
      !transportWorkbenchOverlay
      || !transportWorkbenchPanel
      || !transportWorkbenchTitle
      || !transportWorkbenchLensTitle
      || !transportWorkbenchPreviewTitle
      || !transportWorkbenchInspectorTitle
    ) {
      return;
    }
    const context = getTransportWorkbenchRenderContext();
    renderTransportWorkbenchShell(context);
    renderTransportWorkbenchLensSections(context.family, context.config, context.compareHeld);
    renderTransportWorkbenchInspector(context.family, context.config, context.compareHeld);
    refreshTransportWorkbenchPackGateReport(context.activePackId, { rerender: true });
    refreshTransportWorkbenchPreview(context);
  };

  const setTransportWorkbenchState = (nextOpen, { trigger = null, restoreFocus = true } = {}) => {
    if (!transportWorkbenchOverlay || !transportWorkbenchPanel) {
      return;
    }
    ensureTransportWorkbenchUiState();
    let uiState = runtimeState.transportWorkbenchUi;
    const wasOpen = !!uiState.open;
    const willOpen = !!nextOpen;
    if (willOpen === wasOpen && !willOpen) {
      renderTransportWorkbenchUi();
      if (typeof runtimeState.syncFacilityInfoCardVisibilityFn === "function") {
        runtimeState.syncFacilityInfoCardVisibilityFn();
      }
      return;
    }
    if (willOpen) {
      transportWorkbenchStateOwner.prepareOpenState({
        restoreLeftDrawer: document.body.classList.contains("left-drawer-open"),
        restoreRightDrawer: document.body.classList.contains("right-drawer-open"),
      });
      resetTransportWorkbenchSectionState();
      runtimeState.toggleLeftPanelFn?.(false);
      runtimeState.toggleRightPanelFn?.(false);
      runtimeState.closeDockPopoverFn?.({ restoreFocus: false });
      runtimeState.closeExportWorkbenchFn?.({ restoreFocus: false });
      closeTransportWorkbenchInfoPopover({ restoreFocus: false });
      closeTransportWorkbenchSectionHelpPopover({ restoreFocus: false });
      if (trigger instanceof HTMLElement && transportWorkbenchOverlay instanceof HTMLElement) {
        rememberOverlayTrigger(transportWorkbenchOverlay, trigger);
      }
    }
    // section reset 可能补齐最新 uiState 结构，这里统一回读当前对象后再落 open 状态。
    uiState = transportWorkbenchStateOwner.setOpenState(willOpen);
    renderTransportWorkbenchUi();
    if (typeof runtimeState.syncFacilityInfoCardVisibilityFn === "function") {
      runtimeState.syncFacilityInfoCardVisibilityFn();
    }
    if (willOpen) {
      focusOverlaySurface(transportWorkbenchPanel);
      return;
    }
    const restoreState = transportWorkbenchStateOwner.prepareCloseState();
    transportWorkbenchPreviewLifecycleOwner.dispose();
    closeTransportWorkbenchInfoPopover({ restoreFocus: false });
    closeTransportWorkbenchSectionHelpPopover({ restoreFocus: false });
    runtimeState.toggleLeftPanelFn?.(restoreState.restoreLeftDrawer);
    runtimeState.toggleRightPanelFn?.(!restoreState.restoreLeftDrawer && restoreState.restoreRightDrawer);
    if (restoreFocus) {
      restoreOverlayTriggerFocus(transportWorkbenchOverlay);
    }
  };

  const resetTransportWorkbenchView = () => {
    ensureTransportWorkbenchUiState();
    resetTransportWorkbenchCarrierView();
    syncTransportWorkbenchPreviewControls();
  };

  const openTransportWorkbench = (trigger = null) => {
    setTransportWorkbenchState(true, { trigger });
    return true;
  };

  const closeTransportWorkbench = ({ restoreFocus = true } = {}) => {
    setTransportWorkbenchState(false, { restoreFocus });
    return false;
  };

  const initializeTransportWorkbenchRuntime = () => {
    transportWorkbenchPreviewLifecycleOwner.initializeRuntimeHooks();
  };

  const bindTransportWorkbenchEvents = () => {
      if (scenarioTransportWorkbenchBtn && !scenarioTransportWorkbenchBtn.dataset.bound) {
        scenarioTransportWorkbenchBtn.addEventListener("click", () => {
          if (runtimeState.transportWorkbenchUi?.open) {
            setTransportWorkbenchState(false);
            return;
          }
          setTransportWorkbenchState(true, { trigger: scenarioTransportWorkbenchBtn });
        });
        scenarioTransportWorkbenchBtn.dataset.bound = "true";
      }

      if (transportAppearanceWorkbenchBtn && !transportAppearanceWorkbenchBtn.dataset.bound) {
        transportAppearanceWorkbenchBtn.addEventListener("click", () => {
          setTransportWorkbenchState(true, { trigger: transportAppearanceWorkbenchBtn });
        });
        transportAppearanceWorkbenchBtn.dataset.bound = "true";
      }

      if (transportWorkbenchInfoBtn && !transportWorkbenchInfoBtn.dataset.bound) {
        transportWorkbenchInfoBtn.addEventListener("click", () => {
          toggleTransportWorkbenchInfoPopover();
        });
        transportWorkbenchInfoBtn.dataset.bound = "true";
      }

      if (transportWorkbenchCloseBtn && !transportWorkbenchCloseBtn.dataset.bound) {
        transportWorkbenchCloseBtn.addEventListener("click", () => {
          setTransportWorkbenchState(false);
        });
        transportWorkbenchCloseBtn.dataset.bound = "true";
      }

      if (transportWorkbenchResetBtn && !transportWorkbenchResetBtn.dataset.bound) {
        transportWorkbenchResetBtn.addEventListener("click", () => {
          resetTransportWorkbenchView();
        });
        transportWorkbenchResetBtn.dataset.bound = "true";
      }

      if (transportWorkbenchCompareBtn && !transportWorkbenchCompareBtn.dataset.bound) {
        transportWorkbenchCompareBtn.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          setTransportWorkbenchCompareHeld(true);
        });
        ["pointerup", "pointercancel", "pointerleave", "blur"].forEach((eventName) => {
          transportWorkbenchCompareBtn.addEventListener(eventName, () => {
            setTransportWorkbenchCompareHeld(false);
          });
        });
        transportWorkbenchCompareBtn.addEventListener("keydown", (event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          setTransportWorkbenchCompareHeld(true);
        });
        transportWorkbenchCompareBtn.addEventListener("keyup", (event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          setTransportWorkbenchCompareHeld(false);
        });
        transportWorkbenchCompareBtn.dataset.bound = "true";
      }

      if (transportWorkbenchZoomOutBtn && !transportWorkbenchZoomOutBtn.dataset.bound) {
        transportWorkbenchZoomOutBtn.addEventListener("click", () => {
          stepTransportWorkbenchCarrierZoom(-1);
          syncTransportWorkbenchPreviewControls();
        });
        transportWorkbenchZoomOutBtn.dataset.bound = "true";
      }

      if (transportWorkbenchZoomInBtn && !transportWorkbenchZoomInBtn.dataset.bound) {
        transportWorkbenchZoomInBtn.addEventListener("click", () => {
          stepTransportWorkbenchCarrierZoom(1);
          syncTransportWorkbenchPreviewControls();
        });
        transportWorkbenchZoomInBtn.dataset.bound = "true";
      }

      if (transportWorkbenchRotateBtn && !transportWorkbenchRotateBtn.dataset.bound) {
        transportWorkbenchRotateBtn.addEventListener("click", () => {
          toggleTransportWorkbenchCarrierQuarterTurn();
          syncTransportWorkbenchPreviewControls();
        });
        transportWorkbenchRotateBtn.dataset.bound = "true";
      }

      if (transportWorkbenchApplyBtn && !transportWorkbenchApplyBtn.dataset.bound) {
        transportWorkbenchApplyBtn.addEventListener("click", async () => {
          const context = getTransportWorkbenchRenderContext();
          const applyState = getTransportWorkbenchApplyButtonState(context.family.id);
          if (!applyState.enabled) return;
          try {
            await applyTransportWorkbenchFamilyToMainMap(context);
          } catch (error) {
            console.error(`[transport-workbench] Failed to apply ${context.family.id} to the main map.`, error);
          }
          renderTransportWorkbenchShell(getTransportWorkbenchRenderContext());
        });
        transportWorkbenchApplyBtn.dataset.bound = "true";
      }

      if (transportWorkbenchPackSelect && !transportWorkbenchPackSelect.dataset.bound) {
        transportWorkbenchPackSelect.addEventListener("change", () => {
          setTransportWorkbenchActivePackId(transportWorkbenchPackSelect.value);
        });
        transportWorkbenchPackSelect.dataset.bound = "true";
      }

      transportWorkbenchFamilyTabs.forEach((button) => {
        if (!button || button.dataset.bound === "true") return;
        button.addEventListener("click", () => {
          transportWorkbenchStateOwner.setActiveFamily(button.dataset.transportFamily || "road");
          renderTransportWorkbenchUi();
        });
        button.dataset.bound = "true";
      });

      transportWorkbenchInspectorTabButtons.forEach((button) => {
        if (!button || button.dataset.bound === "true") return;
        button.addEventListener("click", () => {
          transportWorkbenchStateOwner.setInspectorTab(button.dataset.transportInspectorTab || "inspect");
          const context = getTransportWorkbenchRenderContext();
          renderTransportWorkbenchShell(context);
          renderTransportWorkbenchInspector(context.family, context.config, context.compareHeld);
        });
        button.dataset.bound = "true";
      });

      if (!document.body.dataset.transportWorkbenchEscapeBound) {
        document.addEventListener("keydown", (event) => {
          if (event.key !== "Escape" || !runtimeState.transportWorkbenchUi?.open) return;
          if (transportWorkbenchSectionHelpPopover && !transportWorkbenchSectionHelpPopover.classList.contains("hidden")) {
            event.preventDefault();
            closeTransportWorkbenchSectionHelpPopover({ restoreFocus: true });
            return;
          }
          if (transportWorkbenchInfoPopover && !transportWorkbenchInfoPopover.classList.contains("hidden")) {
            event.preventDefault();
            closeTransportWorkbenchInfoPopover({ restoreFocus: true });
            return;
          }
          event.preventDefault();
          setTransportWorkbenchState(false);
        });
        document.body.dataset.transportWorkbenchEscapeBound = "true";
      }
  };

  return {
    bindTransportWorkbenchEvents,
    closeTransportWorkbenchInfoPopover,
    closeTransportWorkbenchSectionHelpPopover,
    closeTransportWorkbench,
    ensureTransportWorkbenchUiState,
    initializeTransportWorkbenchRuntime,
    openTransportWorkbench,
    renderTransportWorkbenchUi,
  };
}
