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
  createTransportWorkbenchLayerOrderOwner,
} from "./transport_workbench_layer_order_owner.js";
import {
  createTransportWorkbenchLensOwner,
} from "./transport_workbench_lens_owner.js";
import {
  createTransportWorkbenchPopoverOwner,
} from "./transport_workbench_popover_owner.js";
import {
  createTransportWorkbenchRightDeckOwner,
} from "./transport_workbench_right_deck_owner.js";
import {
  TRANSPORT_WORKBENCH_FAMILIES,
  TRANSPORT_WORKBENCH_INSPECTOR_TABS,
  TRANSPORT_WORKBENCH_DATA_CONTRACTS,
  TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS,
} from "./transport_workbench_descriptor.js";

export { TRANSPORT_WORKBENCH_INSPECTOR_TABS };
export { TRANSPORT_WORKBENCH_INSPECTOR_TAB_IDS } from "./transport_workbench_config_owner.js";

export function getTransportWorkbenchPackOptionsSignature(packOptions) {
  return JSON.stringify((packOptions || []).map((pack) => [pack.packId, pack.label]));
}

export function syncTransportWorkbenchPackSelectOptions({
  selectNode = null,
  packOptions = [],
  activePackId = "",
} = {}) {
  if (!selectNode) return { rebuilt: false, optionCount: 0 };
  const nextSignature = getTransportWorkbenchPackOptionsSignature(packOptions);
  let rebuilt = false;
  if (selectNode.dataset.packOptionsSignature !== nextSignature) {
    selectNode.replaceChildren(...packOptions.map((pack) => {
      const option = document.createElement("option");
      option.value = pack.packId;
      option.textContent = pack.label;
      return option;
    }));
    selectNode.dataset.packOptionsSignature = nextSignature;
    rebuilt = true;
  }
  selectNode.disabled = packOptions.length === 0;
  selectNode.value = activePackId || "";
  return { rebuilt, optionCount: packOptions.length };
}

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

  const transportWorkbenchLayerOrderOwner = createTransportWorkbenchLayerOrderOwner({
    panel: transportWorkbenchLayerOrderPanel,
    list: transportWorkbenchLayerOrderList,
    translate: (label) => t(label, "ui"),
    ensureUiState: () => ensureTransportWorkbenchUiState(),
    getLayerOrder: () => runtimeState.transportWorkbenchUi?.layerOrder || [],
    getLayerFamilyMeta: (familyId) => getTransportWorkbenchLayerFamilyMeta(familyId),
    isLivePreviewFamily: (familyId) => isTransportWorkbenchLivePreviewFamily(familyId),
    isManifestOnlyRuntimeFamily: (familyId) => isTransportWorkbenchManifestOnlyRuntimeFamily(familyId),
    moveLayerOrder: (draggedFamilyId, targetFamilyId) => transportWorkbenchStateOwner.moveLayerOrder(draggedFamilyId, targetFamilyId),
    markDirty: (reason) => markDirty(reason),
    getRenderContext: () => getTransportWorkbenchRenderContext(),
    renderInspector: (family, config, compareHeld) => renderTransportWorkbenchInspector(family, config, compareHeld),
  });

  const getTransportWorkbenchDataContract = (familyId) => TRANSPORT_WORKBENCH_DATA_CONTRACTS[familyId] || null;
  const pickUiCopy = (zh, en) => (runtimeState.currentLanguage === "zh" ? zh : en);
  const transportWorkbenchPopoverOwner = createTransportWorkbenchPopoverOwner({
    panel: transportWorkbenchPanel,
    infoButton: transportWorkbenchInfoBtn,
    infoPopover: transportWorkbenchInfoPopover,
    infoBody: transportWorkbenchInfoBody,
    sectionHelpPopover: transportWorkbenchSectionHelpPopover,
    sectionHelpTitle: transportWorkbenchSectionHelpTitle,
    sectionHelpBody: transportWorkbenchSectionHelpBody,
    translate: (label) => t(label, "ui"),
    pickUiCopy,
    getDataContract: (familyId) => getTransportWorkbenchDataContract(familyId),
    focusSurface: (surface) => focusOverlaySurface(surface),
    rememberTrigger: (surface, trigger) => rememberOverlayTrigger(surface, trigger),
  });
  const closeTransportWorkbenchInfoPopover = (options) => transportWorkbenchPopoverOwner.closeInfoPopover(options);
  const closeTransportWorkbenchSectionHelpPopover = (options) => transportWorkbenchPopoverOwner.closeSectionHelpPopover(options);

  const transportWorkbenchLensOwner = createTransportWorkbenchLensOwner({
    mount: transportWorkbenchLensSections,
    closeSectionHelpPopover: (options) => transportWorkbenchPopoverOwner.closeSectionHelpPopover(options),
    translate: (label) => t(label, "ui"),
    pickUiCopy,
    createRow: (label, value) => transportWorkbenchInspectorOwner.createRow(label, value),
    buildLensSummaryRows: (input) => transportWorkbenchInspectorOwner.buildLensSummaryRows(input),
  });

  const transportWorkbenchRightDeckOwner = createTransportWorkbenchRightDeckOwner({
    tabButtons: transportWorkbenchInspectorTabButtons,
    panels: transportWorkbenchInspectorPanels,
    mounts: {
      display: transportWorkbenchDisplaySections,
      aggregation: transportWorkbenchAggregationSections,
      labels: transportWorkbenchLabelSections,
      coverage: transportWorkbenchCoverageSections,
      data: transportWorkbenchDataSections,
    },
    translate: (label) => t(label, "ui"),
    pickUiCopy,
    setInspectorTab: (tabId) => transportWorkbenchStateOwner.setInspectorTab(tabId),
    getDisplayConfig: (familyId) => getTransportWorkbenchDisplayConfig(familyId),
    isSectionOpen: (familyId, sectionKey) => !!runtimeState.transportWorkbenchUi?.sectionOpen?.[familyId]?.[sectionKey],
    updateFamilyConfig: (familyId, key, nextValue, options) => updateTransportWorkbenchFamilyConfig(familyId, key, nextValue, options),
    updateDisplayConfig: (familyId, updateFn) => updateTransportWorkbenchDisplayConfig(familyId, updateFn),
    toggleSection: (familyId, sectionKey, nextOpen) => toggleTransportWorkbenchSection(familyId, sectionKey, nextOpen),
    createSectionHelpButton: (familyId, section) => transportWorkbenchPopoverOwner.createSectionHelpButton(familyId, section),
    renderDiagnosticsBody: (familyId, config) => transportWorkbenchInspectorOwner.renderDiagnosticsBody(familyId, config),
  });

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
    renderTransportWorkbenchInspector(nextContext.family, nextContext.config, nextContext.compareHeld);
    refreshTransportWorkbenchPreview(nextContext, { allowCarrierPrep: false });
  };

  const updateTransportWorkbenchDisplayConfig = (familyId, updateFn) => {
    if (runtimeState.transportWorkbenchUi?.compareHeld) return;
    if (!transportWorkbenchStateOwner.updateDisplayConfig(familyId, updateFn)) return;
    markDirty("transport-workbench-display-config");
    const nextContext = getTransportWorkbenchRenderContext();
    renderTransportWorkbenchLensSections(nextContext.family, nextContext.config, nextContext.compareHeld);
    renderTransportWorkbenchInspector(nextContext.family, nextContext.config, nextContext.compareHeld);
    refreshTransportWorkbenchPreview(nextContext, { allowCarrierPrep: false });
  };

  const toggleTransportWorkbenchSection = (familyId, sectionKey, nextOpen) => {
    transportWorkbenchStateOwner.toggleSection(familyId, sectionKey, nextOpen);
  };

  const getTransportWorkbenchLayerFamilyMeta = (familyId) => (
    TRANSPORT_WORKBENCH_FAMILIES.find((family) => family.id === familyId)
    || TRANSPORT_WORKBENCH_FAMILIES[0]
  );

  const renderTransportWorkbenchPackSelect = (familyId, activePackId) => {
    if (!transportWorkbenchPackSelect) return;
    syncTransportWorkbenchPackSelectOptions({
      selectNode: transportWorkbenchPackSelect,
      packOptions: listTargetMainMapPacks({ familyId }),
      activePackId,
    });
  };

  const renderTransportWorkbenchLayerOrderPanel = () => transportWorkbenchLayerOrderOwner.render();

  const renderTransportWorkbenchInspectorTabs = (family, config, compareHeld) => {
    transportWorkbenchRightDeckOwner.renderTabs({
      family,
      config,
      compareHeld,
      activeTab: runtimeState.transportWorkbenchUi.activeInspectorTab,
    });
  };

  const renderTransportWorkbenchLensSections = (family, config, compareHeld) => {
    const previewSnapshot = getTransportWorkbenchFamilyPreviewSnapshot(family.id, config);
    const dataContract = getTransportWorkbenchDataContract(family.id);
    transportWorkbenchLensOwner.render({
      family,
      previewSnapshot,
      dataContract,
      compareHeld,
      rightDeckLabel: t("Display / Aggregation / Labels / Coverage / Data", "ui"),
    });
  };

  const renderTransportWorkbenchInspector = (family, config, compareHeld) => {
    if (transportWorkbenchInspectorDetails) {
      const inspectorEmptyCard = transportWorkbenchInspectorEmptyTitle?.parentElement || null;
      const dataContract = getTransportWorkbenchDataContract(family.id);
      const previewSnapshot = getTransportWorkbenchFamilyPreviewSnapshot(family.id, config);
      transportWorkbenchInspectorOwner.renderInspectorDetails({
        detailsNode: transportWorkbenchInspectorDetails,
        emptyCard: inspectorEmptyCard,
        family,
        config,
        compareHeld,
        previewSnapshot,
        dataContract,
      });
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
    renderTransportWorkbenchPackSelect(family.id, context.activePackId);
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
    if (transportWorkbenchPopoverOwner.isInfoPopoverOpen()) {
      transportWorkbenchPopoverOwner.renderInfoContent(family);
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
          transportWorkbenchPopoverOwner.toggleInfoPopover(getTransportWorkbenchFamilyMeta());
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
          if (transportWorkbenchPopoverOwner.handleEscape(event)) return;
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
