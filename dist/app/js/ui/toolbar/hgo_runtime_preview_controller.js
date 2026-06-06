import {
  HGO_RUNTIME_PREVIEW_STATUS,
  createHgoRuntimePreviewController,
  ensureHgoRuntimePreviewState,
} from "../../core/hgo_runtime_preview.js";

function setButtonHidden(button, hidden) {
  if (!button) return;
  button.classList?.toggle?.("hidden", !!hidden);
  button.setAttribute?.("aria-hidden", hidden ? "true" : "false");
  if (hidden) {
    button.setAttribute?.("tabindex", "-1");
  } else {
    button.removeAttribute?.("tabindex");
  }
}

function createPreviewButton(documentRef, anchorButton) {
  if (!documentRef || !anchorButton?.parentNode) return null;
  const existing = documentRef.getElementById?.("hgoRuntimePreviewBtn");
  if (existing) return existing;
  const button = documentRef.createElement("button");
  button.id = "hgoRuntimePreviewBtn";
  button.type = "button";
  button.className = "zoom-btn zoom-pill-btn shell-utility-status-btn hgo-runtime-preview-btn hidden";
  button.textContent = "HGO";
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-hidden", "true");
  button.setAttribute("tabindex", "-1");
  anchorButton.parentNode.insertBefore(button, anchorButton.nextSibling);
  return button;
}

function getButtonLabel(previewState) {
  if (previewState.status === HGO_RUNTIME_PREVIEW_STATUS.READY) return "HGO preview ready";
  if (previewState.status === HGO_RUNTIME_PREVIEW_STATUS.LOADING) return "HGO preview loading";
  if (previewState.status === HGO_RUNTIME_PREVIEW_STATUS.ERROR) return `HGO preview error: ${previewState.errorMessage}`;
  if (previewState.status === HGO_RUNTIME_PREVIEW_STATUS.UNAVAILABLE) return "HGO preview unavailable";
  return "HGO preview";
}

function syncButton(button, runtimeState, { loadersConfigured = true } = {}) {
  const previewState = ensureHgoRuntimePreviewState(runtimeState);
  const developerMode = !!runtimeState?.ui?.developerMode;
  // HGO preview 是开发者模式的临时画布覆盖层；隐藏按钮前先同步状态，
  // 让关闭开发者模式、缺少 loader、按钮重建三条路径共享同一个可访问性合同。
  setButtonHidden(button, !developerMode || !loadersConfigured);
  if (!button) return previewState;
  const label = getButtonLabel(previewState);
  button.classList?.toggle?.("is-active", !!previewState.enabled && previewState.status === HGO_RUNTIME_PREVIEW_STATUS.READY);
  button.classList?.toggle?.("is-loading", previewState.status === HGO_RUNTIME_PREVIEW_STATUS.LOADING);
  button.classList?.toggle?.("is-error", previewState.status === HGO_RUNTIME_PREVIEW_STATUS.ERROR);
  button.setAttribute("aria-pressed", previewState.enabled ? "true" : "false");
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  return previewState;
}

function createHgoRuntimePreviewToolbarController({
  runtimeState,
  anchorButton = null,
  button = null,
  canvas = null,
  loadSeed = null,
  loadRaster = null,
  renderOptions = {},
  restorePreviewTarget = null,
  storage = globalThis.localStorage,
  documentRef = globalThis.document,
} = {}) {
  const previewButton = button || createPreviewButton(documentRef, anchorButton);
  const loadersConfigured = typeof loadSeed === "function" && typeof loadRaster === "function";
  const previewController = createHgoRuntimePreviewController(runtimeState, {
    canvas,
    loadSeed,
    loadRaster,
    renderOptions,
    restorePreviewTarget,
    storage,
  });

  const disablePreviewWhenDeveloperModeIsOff = () => {
    if (runtimeState?.ui?.developerMode) return;
    const previewState = previewController.getState();
    if (!previewState.enabled && !previewState.renderSummary) return;
    // 主动关闭 preview 会释放旧 raster 的主 canvas 补画入口，
    // 保证后续普通渲染重新接管画布。
    void previewController.setEnabled(false);
  };
  const sync = () => {
    disablePreviewWhenDeveloperModeIsOff();
    return syncButton(previewButton, runtimeState, { loadersConfigured });
  };
  const setEnabled = async (nextEnabled) => {
    const state = await previewController.setEnabled(nextEnabled);
    sync();
    return state;
  };
  const toggle = async () => setEnabled(!previewController.getState().enabled);

  if (previewButton && previewButton.dataset.bound !== "true") {
    // 按钮可能由 toolbar bootstrap 或测试注入，dataset 标记保证重复 sync
    // 只刷新状态，不重复绑定 click handler。
    previewButton.addEventListener("click", () => {
      void toggle();
    });
    previewButton.dataset.bound = "true";
  }
  sync();

  return Object.freeze({
    dispose: previewController.dispose,
    getButton: () => previewButton,
    getState: previewController.getState,
    inspectPoint: previewController.inspectPoint,
    renderPreview: previewController.renderPreview,
    setEnabled,
    sync,
    toggle,
  });
}

export {
  createHgoRuntimePreviewToolbarController,
  syncButton as syncHgoRuntimePreviewButton,
};
