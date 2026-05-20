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
  documentRef = globalThis.document,
} = {}) {
  const {
    visibleToggle = null,
    colorInput = null,
    opacityInput = null,
    widthInput = null,
    enableAllButton = null,
    disableAllButton = null,
    countryList = null,
    emptyNode = null,
  } = nodes;
  const checkboxByCountryCode = new Map();

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

  return {
    normalizeEnabledMap: () => normalizeParentBorderEnabledMap(runtimeState),
    renderCountryList,
    syncVisibilityUi,
  };
}
