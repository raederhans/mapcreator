// Transport workbench preview lifecycle owner.
// Owns render generation, carrier view sync, and preview/carrier disposal.

import {
  destroyTransportWorkbenchCarrier,
  ensureTransportWorkbenchCarrier,
  getTransportWorkbenchCarrierViewState,
  resizeTransportWorkbenchCarrier,
} from "../transport_workbench_carrier.js";
import {
  clearAllTransportWorkbenchFamilyPreviews,
  destroyAllTransportWorkbenchFamilyPreviews,
  isTransportWorkbenchFamilyLivePreviewCapable,
  renderTransportWorkbenchFamilyPreview,
} from "../transport_workbench_family_preview.js";
import { normalizeTransportWorkbenchFamily } from "./transport_workbench_config_owner.js";

function createTransportWorkbenchPreviewViewKey(viewState = {}) {
  return [
    Number(viewState.scale || 1).toFixed(4),
    Number(viewState.translateX || 0).toFixed(2),
    Number(viewState.translateY || 0).toFixed(2),
    String(viewState.quarterTurns || 0),
  ].join(":");
}

export function createTransportWorkbenchPreviewLifecycleOwner(runtimeState, {
  getCarrierMount = () => null,
  getRenderContext = () => null,
  ensureUiState = () => {},
  renderInspector = () => {},
  renderLayerOrderPanel = () => {},
  syncPreviewControls = () => {},
} = {}) {
  let renderGeneration = 0;
  let previewViewSyncRaf = 0;
  let previewLastViewKey = "";

  const isRenderGenerationCurrent = (candidateGeneration, familyId) => (
    candidateGeneration === renderGeneration
    && !!runtimeState.transportWorkbenchUi?.open
    && normalizeTransportWorkbenchFamily(runtimeState.transportWorkbenchUi?.activeFamily) === familyId
  );

  const refreshPreview = (context, { allowCarrierPrep = true } = {}) => {
    const candidateGeneration = ++renderGeneration;
    if (!context.isOpen) {
      clearAllTransportWorkbenchFamilyPreviews();
      return Promise.resolve(null);
    }
    if (context.family.id === "layers") {
      clearAllTransportWorkbenchFamilyPreviews();
      renderLayerOrderPanel();
      return Promise.resolve(null);
    }
    const carrierMount = getCarrierMount();
    if (!carrierMount) {
      return Promise.resolve(null);
    }
    const prepareCarrier = allowCarrierPrep
      ? ensureTransportWorkbenchCarrier(carrierMount)
      : Promise.resolve();
    return prepareCarrier
      .then(() => {
        if (!isRenderGenerationCurrent(candidateGeneration, context.family.id)) {
          return null;
        }
        resizeTransportWorkbenchCarrier();
        syncPreviewControls();
        // Preview family modules consume the resolved config; this owner only keeps lifecycle ordering stable.
        if (isTransportWorkbenchFamilyLivePreviewCapable(context.family.id)) {
          return renderTransportWorkbenchFamilyPreview(context.family.id, context.config, {
            isCurrent: () => isRenderGenerationCurrent(candidateGeneration, context.family.id),
          }).then(() => {
            if (!isRenderGenerationCurrent(candidateGeneration, context.family.id)) {
              return null;
            }
            previewLastViewKey = createTransportWorkbenchPreviewViewKey(getTransportWorkbenchCarrierViewState());
            renderInspector(context.family, context.config, context.compareHeld);
            return null;
          });
        }
        clearAllTransportWorkbenchFamilyPreviews();
        if (isRenderGenerationCurrent(candidateGeneration, context.family.id)) {
          renderInspector(context.family, context.config, context.compareHeld);
        }
        return null;
      })
      .catch((error) => {
        if (!isRenderGenerationCurrent(candidateGeneration, context.family.id)) {
          return null;
        }
        console.error("[transport-workbench] Failed to prepare Japan carrier preview.", error);
        if (!isTransportWorkbenchFamilyLivePreviewCapable(context.family.id)) {
          clearAllTransportWorkbenchFamilyPreviews();
        }
        if (isRenderGenerationCurrent(candidateGeneration, context.family.id)) {
          renderInspector(context.family, context.config, context.compareHeld);
        }
        return null;
      });
  };

  const scheduleViewSync = () => {
    ensureUiState();
    const activeFamily = normalizeTransportWorkbenchFamily(runtimeState.transportWorkbenchUi.activeFamily);
    if (!runtimeState.transportWorkbenchUi?.open || !isTransportWorkbenchFamilyLivePreviewCapable(activeFamily)) {
      return;
    }
    const nextViewKey = createTransportWorkbenchPreviewViewKey(getTransportWorkbenchCarrierViewState());
    if (previewLastViewKey === nextViewKey) {
      return;
    }
    previewLastViewKey = nextViewKey;
    if (previewViewSyncRaf) {
      cancelAnimationFrame(previewViewSyncRaf);
    }
    previewViewSyncRaf = requestAnimationFrame(() => {
      previewViewSyncRaf = 0;
      const context = getRenderContext();
      if (!context.isOpen || context.family.id !== activeFamily) return;
      refreshPreview(context, { allowCarrierPrep: false });
    });
  };

  const dispose = () => {
    if (previewViewSyncRaf) {
      cancelAnimationFrame(previewViewSyncRaf);
      previewViewSyncRaf = 0;
    }
    renderGeneration += 1;
    previewLastViewKey = "";
    destroyAllTransportWorkbenchFamilyPreviews();
    destroyTransportWorkbenchCarrier();
  };

  return {
    dispose,
    isRenderGenerationCurrent,
    refreshPreview,
    scheduleViewSync,
  };
}
