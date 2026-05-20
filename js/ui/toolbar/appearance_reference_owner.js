import { normalizeReferenceImageState } from "../../core/state.js";

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function collectReferenceNodes(documentRef) {
  return {
    imageInput: documentRef.getElementById("referenceImageInput"),
    image: documentRef.getElementById("referenceImage"),
    opacity: documentRef.getElementById("referenceOpacity"),
    scale: documentRef.getElementById("referenceScale"),
    offsetX: documentRef.getElementById("referenceOffsetX"),
    offsetY: documentRef.getElementById("referenceOffsetY"),
    opacityValue: documentRef.getElementById("referenceOpacityValue"),
    scaleValue: documentRef.getElementById("referenceScaleValue"),
    offsetXValue: documentRef.getElementById("referenceOffsetXValue"),
    offsetYValue: documentRef.getElementById("referenceOffsetYValue"),
  };
}

export { normalizeReferenceImageState };

export function getReferenceStyleSignature(referenceState = {}) {
  const opacity = Number.isFinite(Number(referenceState.opacity)) ? Number(referenceState.opacity) : 0.6;
  const scale = Number.isFinite(Number(referenceState.scale)) ? Number(referenceState.scale) : 1;
  const offsetX = Number.isFinite(Number(referenceState.offsetX)) ? Number(referenceState.offsetX) : 0;
  const offsetY = Number.isFinite(Number(referenceState.offsetY)) ? Number(referenceState.offsetY) : 0;
  return `${opacity}|${scale}|${offsetX}|${offsetY}`;
}

export function createAppearanceReferenceOwner({
  runtimeState,
  clamp = clampNumber,
  markDirty = () => {},
  documentRef = globalThis.document,
  urlApi = globalThis.URL,
} = {}) {
  const nodes = collectReferenceNodes(documentRef);

  const syncReferenceState = () => {
    runtimeState.referenceImageState = normalizeReferenceImageState(runtimeState.referenceImageState, { clamp });
    return runtimeState.referenceImageState;
  };

  const applyReferenceStyles = ({ force = false } = {}) => {
    if (!nodes.image) return null;
    const referenceState = syncReferenceState();
    const signature = getReferenceStyleSignature(referenceState);
    if (!force && nodes.image.dataset.referenceStyleSignature === signature) {
      return signature;
    }
    nodes.image.style.opacity = String(referenceState.opacity);
    nodes.image.style.transform =
      `translate(${referenceState.offsetX}px, ${referenceState.offsetY}px) `
      + `scale(${referenceState.scale})`;
    nodes.image.dataset.referenceStyleSignature = signature;
    return signature;
  };

  const renderReferenceOverlayUi = () => {
    const referenceState = syncReferenceState();
    const opacityPercent = Math.round(referenceState.opacity * 100);
    if (nodes.opacity) nodes.opacity.value = String(opacityPercent);
    if (nodes.opacityValue) nodes.opacityValue.textContent = `${opacityPercent}%`;
    if (nodes.scale) nodes.scale.value = String(Number(referenceState.scale).toFixed(2));
    if (nodes.scaleValue) nodes.scaleValue.textContent = `${Number(referenceState.scale).toFixed(2)}x`;
    if (nodes.offsetX) nodes.offsetX.value = String(Math.round(referenceState.offsetX));
    if (nodes.offsetXValue) nodes.offsetXValue.textContent = `${Math.round(referenceState.offsetX)}px`;
    if (nodes.offsetY) nodes.offsetY.value = String(Math.round(referenceState.offsetY));
    if (nodes.offsetYValue) nodes.offsetYValue.textContent = `${Math.round(referenceState.offsetY)}px`;
    applyReferenceStyles();
  };

  const revokeReferenceUrl = () => {
    if (runtimeState.referenceImageUrl && typeof urlApi?.revokeObjectURL === "function") {
      urlApi.revokeObjectURL(runtimeState.referenceImageUrl);
    }
    runtimeState.referenceImageUrl = null;
  };

  const clearReferenceImage = ({ markDirty: shouldMarkDirty = true } = {}) => {
    revokeReferenceUrl();
    if (nodes.imageInput) nodes.imageInput.value = "";
    if (nodes.image) {
      nodes.image.src = "";
      nodes.image.style.opacity = "0";
      nodes.image.dataset.referenceStyleSignature = "";
    }
    if (shouldMarkDirty) {
      markDirty("reference-image-clear");
    }
  };

  const readNumber = (element, fallback) => {
    const value = Number(element?.value);
    return Number.isFinite(value) ? value : fallback;
  };

  const bindReferenceInput = (element, mutate, updateLabel, reason) => {
    if (!element || element.dataset.bound === "true") return;
    mutate(element);
    updateLabel(element);
    element.addEventListener("input", (event) => {
      mutate(event.target);
      updateLabel(event.target);
      applyReferenceStyles();
      markDirty(reason);
    });
    element.dataset.bound = "true";
  };

  const bindEvents = () => {
    if (nodes.imageInput && nodes.imageInput.dataset.bound !== "true") {
      nodes.imageInput.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (!nodes.image) return;
        if (!file) {
          clearReferenceImage();
          return;
        }
        revokeReferenceUrl();
        runtimeState.referenceImageUrl = typeof urlApi?.createObjectURL === "function"
          ? urlApi.createObjectURL(file)
          : "";
        nodes.image.src = runtimeState.referenceImageUrl;
        applyReferenceStyles({ force: true });
        markDirty("reference-image-file");
      });
      nodes.imageInput.dataset.bound = "true";
    }

    bindReferenceInput(
      nodes.opacity,
      (element) => {
        syncReferenceState().opacity = clamp(readNumber(element, 60) / 100, 0, 1);
      },
      (element) => {
        if (nodes.opacityValue) nodes.opacityValue.textContent = `${element.value}%`;
      },
      "reference-opacity",
    );
    bindReferenceInput(
      nodes.scale,
      (element) => {
        syncReferenceState().scale = clamp(readNumber(element, 1), 0.2, 3);
      },
      () => {
        if (nodes.scaleValue) nodes.scaleValue.textContent = `${syncReferenceState().scale.toFixed(2)}x`;
      },
      "reference-scale",
    );
    bindReferenceInput(
      nodes.offsetX,
      (element) => {
        syncReferenceState().offsetX = clamp(readNumber(element, 0), -1000, 1000);
      },
      () => {
        if (nodes.offsetXValue) nodes.offsetXValue.textContent = `${syncReferenceState().offsetX}px`;
      },
      "reference-offset-x",
    );
    bindReferenceInput(
      nodes.offsetY,
      (element) => {
        syncReferenceState().offsetY = clamp(readNumber(element, 0), -1000, 1000);
      },
      () => {
        if (nodes.offsetYValue) nodes.offsetYValue.textContent = `${syncReferenceState().offsetY}px`;
      },
      "reference-offset-y",
    );
  };

  return {
    applyReferenceStyles,
    bindEvents,
    clearReferenceImage,
    renderReferenceOverlayUi,
    syncReferenceState,
  };
}
