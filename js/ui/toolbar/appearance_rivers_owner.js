function collectRiversNodes(documentRef = document) {
  return {
    toggle: documentRef.getElementById("toggleRivers"),
    color: documentRef.getElementById("riversColor"),
    opacity: documentRef.getElementById("riversOpacity"),
    width: documentRef.getElementById("riversWidth"),
    outlineColor: documentRef.getElementById("riversOutlineColor"),
    outlineWidth: documentRef.getElementById("riversOutlineWidth"),
    dashStyle: documentRef.getElementById("riversDashStyle"),
    opacityValue: documentRef.getElementById("riversOpacityValue"),
    widthValue: documentRef.getElementById("riversWidthValue"),
    outlineWidthValue: documentRef.getElementById("riversOutlineWidthValue"),
  };
}

export function normalizeRiversStyleConfig(rawConfig = {}, {
  clamp = (value, min, max) => Math.min(max, Math.max(min, value)),
  normalizeOceanFillColor = (value) => value,
} = {}) {
  const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
  const numberOr = (value, defaultValue) => (
    Number.isFinite(Number(value)) ? Number(value) : defaultValue
  );

  return {
    ...source,
    color: normalizeOceanFillColor(source.color || "#3b82f6"),
    opacity: clamp(numberOr(source.opacity, 0.88), 0, 1),
    width: clamp(numberOr(source.width, 0.5), 0.2, 4),
    outlineColor: normalizeOceanFillColor(source.outlineColor || "#e2efff"),
    outlineWidth: clamp(numberOr(source.outlineWidth, 0.25), 0, 3),
    dashStyle: String(source.dashStyle || "solid"),
  };
}

export function createAppearanceRiversOwner({
  runtimeState,
  clamp,
  renderDirty,
  normalizeOceanFillColor,
  documentRef = document,
}) {
  const nodes = collectRiversNodes(documentRef);

  const syncRiversConfig = () => {
    runtimeState.styleConfig.rivers = normalizeRiversStyleConfig(runtimeState.styleConfig.rivers, {
      clamp,
      normalizeOceanFillColor,
    });
    return runtimeState.styleConfig.rivers;
  };

  const renderRiversUi = () => {
    const riversConfig = syncRiversConfig();
    if (nodes.toggle) nodes.toggle.checked = !!runtimeState.showRivers;
    if (nodes.color) nodes.color.value = riversConfig.color;
    if (nodes.opacity) nodes.opacity.value = String(Math.round(riversConfig.opacity * 100));
    if (nodes.opacityValue) nodes.opacityValue.textContent = `${Math.round(riversConfig.opacity * 100)}%`;
    if (nodes.width) nodes.width.value = String(Number(riversConfig.width).toFixed(2));
    if (nodes.widthValue) nodes.widthValue.textContent = Number(riversConfig.width).toFixed(2);
    if (nodes.outlineColor) nodes.outlineColor.value = riversConfig.outlineColor;
    if (nodes.outlineWidth) nodes.outlineWidth.value = String(Number(riversConfig.outlineWidth).toFixed(2));
    if (nodes.outlineWidthValue) nodes.outlineWidthValue.textContent = Number(riversConfig.outlineWidth).toFixed(2);
    if (nodes.dashStyle) nodes.dashStyle.value = riversConfig.dashStyle;
  };

  const bindEvents = () => {
    if (nodes.toggle && nodes.toggle.dataset.bound !== "true") {
      nodes.toggle.checked = !!runtimeState.showRivers;
      nodes.toggle.addEventListener("change", (event) => {
        runtimeState.showRivers = !!event.target.checked;
        if (runtimeState.showRivers && typeof runtimeState.ensureContextLayerDataFn === "function") {
          void runtimeState.ensureContextLayerDataFn("rivers", { reason: "toolbar-toggle", renderNow: true });
        }
        renderDirty("toggle-rivers");
      });
      nodes.toggle.dataset.bound = "true";
    }

    if (nodes.color && nodes.color.dataset.bound !== "true") {
      nodes.color.addEventListener("input", (event) => {
        syncRiversConfig().color = normalizeOceanFillColor(event.target.value);
        renderDirty("rivers-color");
      });
      nodes.color.dataset.bound = "true";
    }

    if (nodes.opacity && nodes.opacity.dataset.bound !== "true") {
      nodes.opacity.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        const nextOpacity = clamp(Number.isFinite(value) ? value / 100 : 0.88, 0, 1);
        syncRiversConfig().opacity = nextOpacity;
        if (nodes.opacityValue) nodes.opacityValue.textContent = `${Math.round(nextOpacity * 100)}%`;
        renderDirty("rivers-opacity");
      });
      nodes.opacity.dataset.bound = "true";
    }

    if (nodes.width && nodes.width.dataset.bound !== "true") {
      nodes.width.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        const nextWidth = clamp(Number.isFinite(value) ? value : 0.5, 0.2, 4);
        syncRiversConfig().width = nextWidth;
        if (nodes.widthValue) nodes.widthValue.textContent = Number(nextWidth).toFixed(2);
        renderDirty("rivers-width");
      });
      nodes.width.dataset.bound = "true";
    }

    if (nodes.outlineColor && nodes.outlineColor.dataset.bound !== "true") {
      nodes.outlineColor.addEventListener("input", (event) => {
        syncRiversConfig().outlineColor = normalizeOceanFillColor(event.target.value);
        renderDirty("rivers-outline-color");
      });
      nodes.outlineColor.dataset.bound = "true";
    }

    if (nodes.outlineWidth && nodes.outlineWidth.dataset.bound !== "true") {
      nodes.outlineWidth.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        const nextOutlineWidth = clamp(Number.isFinite(value) ? value : 0.25, 0, 3);
        syncRiversConfig().outlineWidth = nextOutlineWidth;
        if (nodes.outlineWidthValue) nodes.outlineWidthValue.textContent = Number(nextOutlineWidth).toFixed(2);
        renderDirty("rivers-outline-width");
      });
      nodes.outlineWidth.dataset.bound = "true";
    }

    if (nodes.dashStyle && nodes.dashStyle.dataset.bound !== "true") {
      nodes.dashStyle.addEventListener("change", (event) => {
        syncRiversConfig().dashStyle = String(event.target.value || "solid");
        renderDirty("rivers-dash");
      });
      nodes.dashStyle.dataset.bound = "true";
    }
  };

  return {
    bindEvents,
    renderRiversUi,
    syncRiversConfig,
  };
}
