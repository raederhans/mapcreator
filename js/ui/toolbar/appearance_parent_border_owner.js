// Appearance parent-border owner.
// 父国界列表可能随场景反复刷新；这里把列表模型和 DOM 复用从总 controller 中收拢出来。

export function normalizeParentBorderEnabledMap(runtimeState) {
  const supported = Array.isArray(runtimeState.parentBorderSupportedCountries)
    ? runtimeState.parentBorderSupportedCountries
    : [];
  const previous = runtimeState.parentBorderEnabledByCountry && typeof runtimeState.parentBorderEnabledByCountry === "object"
    ? runtimeState.parentBorderEnabledByCountry
    : {};
  const next = {};
  supported.forEach((countryCode) => {
    next[countryCode] = !!previous[countryCode];
  });
  runtimeState.parentBorderEnabledByCountry = next;
  return next;
}

export function buildParentBorderCountryRows({
  supportedCountries = [],
  countryNames = {},
  translateGeo = (value) => value,
} = {}) {
  const supported = Array.isArray(supportedCountries) ? supportedCountries : [];
  return supported
    .map((code) => ({
      code,
      displayName: translateGeo(countryNames?.[code] || code),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function getParentBorderRowsSignature(rows = []) {
  return JSON.stringify(rows.map((row) => [row.code, row.displayName]));
}

export function createAppearanceParentBorderOwner({
  runtimeState,
  nodes = {},
  translateGeo = (value) => value,
  renderDirty = () => {},
  clamp = (value, min, max) => Math.min(max, Math.max(min, value)),
  documentRef = globalThis.document,
} = {}) {
  const {
    visibleToggle = null,
    colorInput = null,
    opacityInput = null,
    opacityValue = null,
    widthInput = null,
    widthValue = null,
    enableAllButton = null,
    disableAllButton = null,
    countryList = null,
    emptyNode = null,
  } = nodes;
  const checkboxByCountryCode = new Map();

  const getParentBorderStyle = () => {
    if (!runtimeState.styleConfig || typeof runtimeState.styleConfig !== "object") {
      runtimeState.styleConfig = {};
    }
    if (!runtimeState.styleConfig.parentBorders || typeof runtimeState.styleConfig.parentBorders !== "object") {
      runtimeState.styleConfig.parentBorders = {};
    }
    return runtimeState.styleConfig.parentBorders;
  };

  const syncStyleControls = () => {
    const style = getParentBorderStyle();
    const color = String(style.color || "#4b5563");
    const opacity = clamp(
      Math.round((Number.isFinite(Number(style.opacity)) ? Number(style.opacity) : 0.85) * 100),
      0,
      100
    );
    const width = clamp(
      Number.isFinite(Number(style.width)) ? Number(style.width) : 1.1,
      0.2,
      4
    );

    if (colorInput) colorInput.value = color;
    if (opacityInput) opacityInput.value = String(opacity);
    if (opacityValue) opacityValue.textContent = `${opacity}%`;
    if (widthInput) widthInput.value = String(width);
    if (widthValue) widthValue.textContent = Number(width).toFixed(2);
  };

  const syncVisibilityUi = () => {
    const enabled = runtimeState.parentBordersVisible !== false;
    if (visibleToggle) visibleToggle.checked = enabled;
    if (colorInput) colorInput.disabled = !enabled;
    if (opacityInput) opacityInput.disabled = !enabled;
    if (widthInput) widthInput.disabled = !enabled;
    if (enableAllButton) enableAllButton.disabled = !enabled;
    if (disableAllButton) disableAllButton.disabled = !enabled;
    if (countryList) {
      countryList.classList.toggle("opacity-60", !enabled);
      countryList.classList.toggle("pointer-events-none", !enabled);
    }
    return enabled;
  };

  const syncCountryCheckboxes = (rows, enabled) => {
    rows.forEach(({ code }) => {
      const checkbox = checkboxByCountryCode.get(code);
      if (!checkbox) return;
      checkbox.checked = !!runtimeState.parentBorderEnabledByCountry?.[code];
      checkbox.disabled = !enabled;
    });
  };

  const createCountryRow = ({ code, displayName }, enabled) => {
    const label = documentRef.createElement("label");
    label.className = "toggle-label parent-border-country-item";

    const checkbox = documentRef.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checkbox-input";
    checkbox.checked = !!runtimeState.parentBorderEnabledByCountry?.[code];
    checkbox.disabled = !enabled;
    checkbox.addEventListener("change", (event) => {
      runtimeState.parentBorderEnabledByCountry[code] = !!event.target.checked;
      renderDirty("parent-border-country");
    });
    checkboxByCountryCode.set(code, checkbox);

    const text = documentRef.createElement("span");
    text.textContent = `${displayName} (${code})`;

    label.appendChild(checkbox);
    label.appendChild(text);
    return label;
  };

  const renderCountryList = () => {
    if (!countryList) return { rebuilt: false, rows: 0 };
    normalizeParentBorderEnabledMap(runtimeState);
    const enabled = syncVisibilityUi();
    const rows = buildParentBorderCountryRows({
      supportedCountries: runtimeState.parentBorderSupportedCountries,
      countryNames: runtimeState.countryNames,
      translateGeo,
    });
    const nextSignature = getParentBorderRowsSignature(rows);

    if (!rows.length) {
      emptyNode?.classList.remove("hidden");
      checkboxByCountryCode.clear();
      if (countryList.dataset.parentBorderRowsSignature !== nextSignature) {
        countryList.replaceChildren();
        countryList.dataset.parentBorderRowsSignature = nextSignature;
        return { rebuilt: true, rows: 0 };
      }
      return { rebuilt: false, rows: 0 };
    }
    emptyNode?.classList.add("hidden");

    if (countryList.dataset.parentBorderRowsSignature === nextSignature) {
      syncCountryCheckboxes(rows, enabled);
      return { rebuilt: false, rows: rows.length };
    }

    checkboxByCountryCode.clear();
    const rowNodes = rows.map((row) => createCountryRow(row, enabled));
    countryList.replaceChildren(...rowNodes);
    countryList.dataset.parentBorderRowsSignature = nextSignature;
    return { rebuilt: true, rows: rows.length };
  };

  const bindEvents = () => {
    syncStyleControls();
    syncVisibilityUi();

    if (colorInput && colorInput.dataset.parentBorderBound !== "true") {
      colorInput.addEventListener("input", (event) => {
        getParentBorderStyle().color = event.target.value;
        renderDirty("parent-border-color");
      });
      colorInput.dataset.parentBorderBound = "true";
    }

    if (opacityInput && opacityInput.dataset.parentBorderBound !== "true") {
      opacityInput.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        const opacity = clamp(Number.isFinite(value) ? value / 100 : 0.85, 0, 1);
        getParentBorderStyle().opacity = opacity;
        if (opacityValue) opacityValue.textContent = `${Math.round(opacity * 100)}%`;
        renderDirty("parent-border-opacity");
      });
      opacityInput.dataset.parentBorderBound = "true";
    }

    if (widthInput && widthInput.dataset.parentBorderBound !== "true") {
      widthInput.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        const width = clamp(Number.isFinite(value) ? value : 1.1, 0.2, 4);
        getParentBorderStyle().width = width;
        if (widthValue) widthValue.textContent = width.toFixed(2);
        renderDirty("parent-border-width");
      });
      widthInput.dataset.parentBorderBound = "true";
    }

    if (visibleToggle && visibleToggle.dataset.parentBorderBound !== "true") {
      visibleToggle.addEventListener("change", (event) => {
        runtimeState.parentBordersVisible = !!event.target.checked;
        syncVisibilityUi();
        renderCountryList();
        renderDirty("parent-border-visibility");
      });
      visibleToggle.dataset.parentBorderBound = "true";
    }

    if (enableAllButton && enableAllButton.dataset.parentBorderBound !== "true") {
      enableAllButton.addEventListener("click", () => {
        const enabledMap = normalizeParentBorderEnabledMap(runtimeState);
        Object.keys(enabledMap).forEach((countryCode) => {
          enabledMap[countryCode] = true;
        });
        renderCountryList();
        renderDirty("parent-border-enable-all");
      });
      enableAllButton.dataset.parentBorderBound = "true";
    }

    if (disableAllButton && disableAllButton.dataset.parentBorderBound !== "true") {
      disableAllButton.addEventListener("click", () => {
        const enabledMap = normalizeParentBorderEnabledMap(runtimeState);
        Object.keys(enabledMap).forEach((countryCode) => {
          enabledMap[countryCode] = false;
        });
        renderCountryList();
        renderDirty("parent-border-disable-all");
      });
      disableAllButton.dataset.parentBorderBound = "true";
    }
  };

  return {
    bindEvents,
    normalizeEnabledMap: () => normalizeParentBorderEnabledMap(runtimeState),
    renderCountryList,
    syncVisibilityUi,
    syncStyleControls,
  };
}
