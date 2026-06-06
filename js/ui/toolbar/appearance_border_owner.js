function normalizeBorderColor(value, fallbackColor) {
  const candidate = String(value || "").trim();
  if (/^#(?:[0-9a-f]{6})$/i.test(candidate)) return candidate;
  if (/^#(?:[0-9a-f]{3})$/i.test(candidate)) {
    return `#${candidate[1]}${candidate[1]}${candidate[2]}${candidate[2]}${candidate[3]}${candidate[3]}`;
  }
  return fallbackColor;
}

function ensureBorderStyleConfig(runtimeState, key, defaults, { clamp }) {
  if (!runtimeState.styleConfig || typeof runtimeState.styleConfig !== "object") {
    runtimeState.styleConfig = {};
  }
  // styleConfig 是项目保存和 renderer 读取的同一份真源；defaults 里的范围和
  // precision 只服务 UI clamp/display，可保存配置只保留真实绘制字段。
  const source = runtimeState.styleConfig[key] && typeof runtimeState.styleConfig[key] === "object"
    ? runtimeState.styleConfig[key]
    : {};
  const {
    minWidth,
    maxWidth,
    widthPrecision: _widthPrecision,
    ...persistedDefaults
  } = defaults;
  const next = {
    ...persistedDefaults,
    ...source,
  };
  next.color = normalizeBorderColor(next.color || persistedDefaults.color, persistedDefaults.color);
  next.opacity = clamp(
    Number.isFinite(Number(next.opacity)) ? Number(next.opacity) : persistedDefaults.opacity,
    0,
    1
  );
  next.width = clamp(
    Number.isFinite(Number(next.width)) ? Number(next.width) : persistedDefaults.width,
    minWidth,
    maxWidth
  );
  if (key === "internalBorders") {
    next.colorMode = String(next.colorMode || persistedDefaults.colorMode || "auto").trim().toLowerCase() === "manual"
      ? "manual"
      : "auto";
  }
  runtimeState.styleConfig[key] = next;
  return next;
}

function setRangePercent(nodes, value) {
  const percent = Math.round(value * 100);
  if (nodes.opacityInput) nodes.opacityInput.value = String(percent);
  if (nodes.opacityValue) nodes.opacityValue.textContent = `${percent}%`;
}

function setRangeNumber(nodes, value, precision) {
  const formatted = Number(value).toFixed(precision);
  if (nodes.widthInput) nodes.widthInput.value = formatted;
  if (nodes.widthValue) nodes.widthValue.textContent = formatted;
}

function collectBorderNodes(documentRef = document) {
  return {
    internal: {
      autoColorInput: documentRef.getElementById("internalBorderAutoColor"),
      colorInput: documentRef.getElementById("internalBorderColor"),
      opacityInput: documentRef.getElementById("internalBorderOpacity"),
      opacityValue: documentRef.getElementById("internalBorderOpacityValue"),
      widthInput: documentRef.getElementById("internalBorderWidth"),
      widthValue: documentRef.getElementById("internalBorderWidthValue"),
    },
    country: {
      colorInput: documentRef.getElementById("empireBorderColor"),
      opacityInput: documentRef.getElementById("empireBorderOpacity"),
      opacityValue: documentRef.getElementById("empireBorderOpacityValue"),
      widthInput: documentRef.getElementById("empireBorderWidth"),
      widthValue: documentRef.getElementById("empireBorderWidthValue"),
    },
    coastline: {
      colorInput: documentRef.getElementById("coastlineColor"),
      opacityInput: documentRef.getElementById("coastlineOpacity"),
      opacityValue: documentRef.getElementById("coastlineOpacityValue"),
      widthInput: documentRef.getElementById("coastlineWidth"),
      widthValue: documentRef.getElementById("coastlineWidthValue"),
    },
  };
}

export function createAppearanceBorderOwner({
  runtimeState,
  clamp,
  renderDirty,
  documentRef = document,
}) {
  const nodes = collectBorderNodes(documentRef);
  const borderConfigs = {
    internalBorders: {
      color: "#cccccc",
      colorMode: "auto",
      opacity: 1,
      width: 0.5,
      minWidth: 0.01,
      maxWidth: 2,
      widthPrecision: 2,
    },
    empireBorders: {
      color: "#666666",
      opacity: 0.9,
      width: 1,
      minWidth: 0.01,
      maxWidth: 5,
      widthPrecision: 2,
    },
    coastlines: {
      color: "#333333",
      opacity: 0.8,
      width: 1.2,
      minWidth: 0.5,
      maxWidth: 3,
      widthPrecision: 1,
    },
  };

  const syncBorderConfig = (key) => ensureBorderStyleConfig(runtimeState, key, borderConfigs[key], {
    clamp,
  });

  const renderInternalUi = () => {
    const config = syncBorderConfig("internalBorders");
    const autoColorEnabled = String(config.colorMode || "auto") !== "manual";
    if (nodes.internal.autoColorInput) nodes.internal.autoColorInput.checked = autoColorEnabled;
    if (nodes.internal.colorInput) {
      nodes.internal.colorInput.value = config.color;
      nodes.internal.colorInput.disabled = autoColorEnabled;
    }
    setRangePercent(nodes.internal, config.opacity);
    setRangeNumber(nodes.internal, config.width, borderConfigs.internalBorders.widthPrecision);
  };

  const renderCountryUi = () => {
    const config = syncBorderConfig("empireBorders");
    if (nodes.country.colorInput) nodes.country.colorInput.value = config.color;
    setRangePercent(nodes.country, config.opacity);
    setRangeNumber(nodes.country, config.width, borderConfigs.empireBorders.widthPrecision);
  };

  const renderCoastlineUi = () => {
    const config = syncBorderConfig("coastlines");
    if (nodes.coastline.colorInput) nodes.coastline.colorInput.value = config.color;
    setRangePercent(nodes.coastline, config.opacity);
    setRangeNumber(nodes.coastline, config.width, borderConfigs.coastlines.widthPrecision);
  };

  const renderBorderUi = () => {
    renderInternalUi();
    renderCountryUi();
    renderCoastlineUi();
  };

  const bindColorInput = (node, key, reason, afterChange = null) => {
    if (!node || node.dataset.borderBound === "true") return;
    node.addEventListener("input", (event) => {
      syncBorderConfig(key).color = normalizeBorderColor(event.target.value, borderConfigs[key].color);
      if (typeof afterChange === "function") afterChange();
      renderDirty(reason);
    });
    node.dataset.borderBound = "true";
  };

  const bindOpacityInput = (groupNodes, key, reason) => {
    if (!groupNodes.opacityInput || groupNodes.opacityInput.dataset.borderBound === "true") return;
    groupNodes.opacityInput.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      const nextOpacity = clamp(Number.isFinite(value) ? value / 100 : borderConfigs[key].opacity, 0, 1);
      syncBorderConfig(key).opacity = nextOpacity;
      setRangePercent(groupNodes, nextOpacity);
      renderDirty(reason);
    });
    groupNodes.opacityInput.dataset.borderBound = "true";
  };

  const bindWidthInput = (groupNodes, key, reason) => {
    if (!groupNodes.widthInput || groupNodes.widthInput.dataset.borderBound === "true") return;
    groupNodes.widthInput.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      const defaults = borderConfigs[key];
      const nextWidth = clamp(
        Number.isFinite(value) ? value : defaults.width,
        defaults.minWidth,
        defaults.maxWidth
      );
      syncBorderConfig(key).width = nextWidth;
      setRangeNumber(groupNodes, nextWidth, defaults.widthPrecision);
      renderDirty(reason);
    });
    groupNodes.widthInput.dataset.borderBound = "true";
  };

  const bindEvents = () => {
    if (nodes.internal.autoColorInput && nodes.internal.autoColorInput.dataset.borderBound !== "true") {
      nodes.internal.autoColorInput.addEventListener("change", (event) => {
        const config = syncBorderConfig("internalBorders");
        config.colorMode = event.target.checked ? "auto" : "manual";
        if (nodes.internal.colorInput) nodes.internal.colorInput.disabled = event.target.checked;
        renderDirty("internal-border-color-mode");
      });
      nodes.internal.autoColorInput.dataset.borderBound = "true";
    }
    // 内部边界颜色有 auto/manual 两层语义：用户手动改色时立刻转为 manual，
    // 让 renderer 后续按保存值绘制，并停止国家色动态推导。
    bindColorInput(nodes.internal.colorInput, "internalBorders", "internal-border-color", () => {
      syncBorderConfig("internalBorders").colorMode = "manual";
      if (nodes.internal.autoColorInput) nodes.internal.autoColorInput.checked = false;
      if (nodes.internal.colorInput) nodes.internal.colorInput.disabled = false;
    });
    bindOpacityInput(nodes.internal, "internalBorders", "internal-border-opacity");
    bindWidthInput(nodes.internal, "internalBorders", "internal-border-width");

    bindColorInput(nodes.country.colorInput, "empireBorders", "empire-border-color");
    bindOpacityInput(nodes.country, "empireBorders", "empire-border-opacity");
    bindWidthInput(nodes.country, "empireBorders", "empire-border-width");

    bindColorInput(nodes.coastline.colorInput, "coastlines", "coastline-color");
    bindOpacityInput(nodes.coastline, "coastlines", "coastline-opacity");
    bindWidthInput(nodes.coastline, "coastlines", "coastline-width");
  };

  return {
    bindEvents,
    renderBorderUi,
    syncBorderConfig,
  };
}
