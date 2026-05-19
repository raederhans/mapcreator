// Transport workbench right-deck owner.
// Owns the control tabs, section DOM, and control event wiring for the workbench right deck.

import {
  getTransportWorkbenchFamilyPreviewSnapshot,
} from "../transport_workbench_family_preview.js";
import {
  TRANSPORT_WORKBENCH_CONTROL_SCHEMAS,
  TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS,
  TRANSPORT_WORKBENCH_TAB_SECTION_MAP,
} from "./transport_workbench_descriptor.js";
import {
  mapTransportWorkbenchLabelLevelToMaxLevel,
  mapTransportWorkbenchMaxLevelToLabelLevel,
} from "./transport_workbench_config_owner.js";

const TAB_MOUNTS = {
  display: "display",
  aggregation: "aggregation",
  labels: "labels",
  coverage: "coverage",
  data: "data",
};

const isElementLike = (node) => (
  !!node
  && typeof node.replaceChildren === "function"
  && typeof node.appendChild === "function"
);

const formatRangeValue = (rawValue, control) => {
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) return `${rawValue}${control.unit || ""}`;
  if (String(control.step || "").includes(".")) {
    return `${numericValue.toFixed(2).replace(/\.?0+$/, "")}${control.unit || ""}`;
  }
  return `${numericValue}${control.unit || ""}`;
};

export function createTransportWorkbenchRightDeckOwner({
  tabButtons = [],
  panels = {},
  mounts = {},
  translate = (value) => value,
  pickUiCopy = (_zh, en) => en,
  setInspectorTab = (tabId) => tabId || "inspect",
  getDisplayConfig = () => ({}),
  getPreviewSnapshot = getTransportWorkbenchFamilyPreviewSnapshot,
  isSectionOpen = () => false,
  updateFamilyConfig = () => {},
  updateDisplayConfig = () => {},
  toggleSection = () => {},
  createSectionHelpButton = () => null,
  renderDiagnosticsBody = () => document.createElement("div"),
} = {}) {
  const getSectionsForTab = (familyId, tabId) => {
    const sectionMap = TRANSPORT_WORKBENCH_TAB_SECTION_MAP[familyId] || {};
    const allowedSectionKeys = new Set(sectionMap[tabId] || []);
    return (TRANSPORT_WORKBENCH_CONTROL_SCHEMAS[familyId] || []).filter((section) => allowedSectionKeys.has(section.key));
  };

  const renderControl = (familyId, control, config, compareHeld) => {
    const previewSnapshot = getPreviewSnapshot(familyId, config);
    const resolvedOptions = typeof control.options === "function"
      ? (control.options({ familyId, config, previewSnapshot }) || [])
      : (control.options || []);
    const field = document.createElement("div");
    field.className = "transport-workbench-field";
    const title = document.createElement("div");
    title.className = "transport-workbench-field-title";
    title.textContent = translate(control.label);
    field.appendChild(title);

    if (control.type === "toggle") {
      const label = document.createElement("label");
      label.className = "transport-workbench-toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!config[control.key];
      input.disabled = compareHeld;
      const text = document.createElement("span");
      text.textContent = translate(input.checked ? "Enabled" : "Disabled");
      input.addEventListener("change", () => {
        if (compareHeld) return;
        updateFamilyConfig(familyId, control.key, input.checked);
        text.textContent = translate(input.checked ? "Enabled" : "Disabled");
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
        optionNode.textContent = translate(option.label);
        optionNode.selected = option.value === config[control.key];
        select.appendChild(optionNode);
      });
      select.addEventListener("change", () => {
        if (compareHeld) return;
        updateFamilyConfig(familyId, control.key, select.value);
      });
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
      value.textContent = formatRangeValue(config[control.key], control);
      range.addEventListener("input", () => {
        value.textContent = formatRangeValue(range.value, control);
      });
      range.addEventListener("change", () => {
        if (compareHeld) return;
        updateFamilyConfig(familyId, control.key, Number(range.value));
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
          if (compareHeld || option.disabled) return;
          if (control.defaultAllWhenEmpty) {
            const nextValues = [...effectiveValues];
            const valueIndex = nextValues.indexOf(option.value);
            if (input.checked) {
              if (valueIndex === -1) nextValues.push(option.value);
            } else if (valueIndex !== -1) {
              nextValues.splice(valueIndex, 1);
            }
            updateFamilyConfig(familyId, control.key, nextValues);
            return;
          }
          updateFamilyConfig(familyId, control.key, input.checked, { appendValue: option.value });
        });
        const text = document.createElement("span");
        text.textContent = translate(option.label);
        label.appendChild(input);
        label.appendChild(text);
        optionGrid.appendChild(label);
      });
      field.appendChild(optionGrid);
      return field;
    }

    return field;
  };

  const createSectionNode = (family, section, config, compareHeld) => {
    const visibleControls = (section.controls || []).filter((control) => (
      typeof control.showWhen !== "function" || control.showWhen(config)
    ));
    if (section.kind !== "diagnostics" && visibleControls.length === 0) {
      return null;
    }
    const details = document.createElement("details");
    details.className = "transport-workbench-section";
    details.open = !!isSectionOpen(family.id, section.key);
    details.addEventListener("toggle", () => {
      toggleSection(family.id, section.key, details.open);
    });
    const summary = document.createElement("summary");
    summary.className = "transport-workbench-section-summary";
    const heading = document.createElement("div");
    heading.className = "transport-workbench-section-heading";
    const title = document.createElement("div");
    title.className = "transport-workbench-section-title";
    title.textContent = translate(section.title);
    const actions = document.createElement("div");
    actions.className = "transport-workbench-section-actions";
    const helpButton = createSectionHelpButton(family.id, section);
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
      ? renderDiagnosticsBody(family.id, config)
      : document.createElement("div");
    if (section.kind !== "diagnostics") {
      body.className = "transport-workbench-section-body";
      if (section.description) {
        const description = document.createElement("p");
        description.className = "transport-workbench-section-description";
        description.textContent = translate(section.description);
        body.appendChild(description);
      }
      visibleControls.forEach((control) => {
        body.appendChild(renderControl(family.id, control, config, compareHeld));
      });
    } else if (section.description) {
      const description = document.createElement("p");
      description.className = "transport-workbench-section-description transport-workbench-section-description-diagnostics";
      description.textContent = translate(section.description);
      body.prepend(description);
    }
    details.appendChild(body);
    return details;
  };

  const createShellCard = (family, tabId, config, compareHeld) => {
    if (!TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS.has(family.id)) {
      return null;
    }
    const displayConfig = getDisplayConfig(family.id);
    const card = document.createElement("div");
    card.className = "transport-workbench-note-card transport-workbench-note-card-soft transport-workbench-shell-card";
    const heading = document.createElement("div");
    heading.className = "transport-workbench-shell-heading";
    const title = document.createElement("div");
    title.className = "transport-workbench-note-title";
    title.textContent = translate(
      tabId === "display"
        ? "Display settings"
        : tabId === "aggregation"
          ? "Aggregation settings"
          : tabId === "labels"
            ? "Label settings"
            : "Coverage settings"
    );
    const kicker = document.createElement("span");
    kicker.className = "transport-workbench-shell-kicker";
    kicker.textContent = translate("Current settings");
    heading.append(title, kicker);
    card.appendChild(heading);
    const grid = document.createElement("div");
    grid.className = "transport-workbench-shell-grid";
    const addShellSelect = (labelText, value, options, onChange, mountTarget = grid) => {
      const control = document.createElement("div");
      control.className = "transport-workbench-shell-control";
      const label = document.createElement("div");
      label.className = "transport-workbench-shell-label";
      label.textContent = translate(labelText);
      const select = document.createElement("select");
      select.className = "select-input transport-workbench-select";
      select.disabled = compareHeld;
      options.forEach((option) => {
        const optionNode = document.createElement("option");
        optionNode.value = option.value;
        optionNode.textContent = translate(option.label);
        optionNode.selected = option.value === value;
        select.appendChild(optionNode);
      });
      select.addEventListener("change", () => {
        if (compareHeld) return;
        onChange(select.value);
      });
      control.append(label, select);
      mountTarget.appendChild(control);
    };
    const addShellRange = (labelText, value, min, max, step, unit, onChange, mountTarget = grid) => {
      const control = document.createElement("div");
      control.className = "transport-workbench-shell-control";
      const label = document.createElement("div");
      label.className = "transport-workbench-shell-label";
      label.textContent = translate(labelText);
      const row = document.createElement("div");
      row.className = "transport-workbench-range-row";
      const input = document.createElement("input");
      input.type = "range";
      input.className = "transport-workbench-range";
      input.disabled = compareHeld;
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
      input.addEventListener("change", () => {
        if (compareHeld) return;
        onChange(Number(input.value));
      });
      row.append(input, valueNode);
      control.append(label, row);
      mountTarget.appendChild(control);
    };
    const addShellToggle = (labelText, checked, onChange, mountTarget = grid) => {
      const control = document.createElement("div");
      control.className = "transport-workbench-shell-control";
      const label = document.createElement("div");
      label.className = "transport-workbench-shell-label";
      label.textContent = translate(labelText);
      const toggle = document.createElement("label");
      toggle.className = "transport-workbench-toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!checked;
      input.disabled = compareHeld;
      const text = document.createElement("span");
      text.textContent = input.checked ? translate("Enabled") : translate("Disabled");
      input.addEventListener("change", () => {
        if (compareHeld) return;
        text.textContent = input.checked ? translate("Enabled") : translate("Disabled");
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
      ], (nextValue) => updateDisplayConfig(family.id, (draft) => {
        draft.mode = nextValue;
      }));
      addShellSelect("Preset", displayConfig.preset, [
        { value: "review_first", label: "Review first" },
        { value: "balanced", label: "Balanced" },
        { value: "pattern_first", label: "Pattern first" },
        { value: "extreme_density", label: "Extreme density" },
      ], (nextValue) => updateDisplayConfig(family.id, (draft) => {
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
        updateDisplayConfig(family.id, (draft) => {
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
        (nextValue) => updateDisplayConfig(family.id, (draft) => {
          draft.aggregation.thresholds.cellSizePx = nextValue;
        })
      );
    } else if (tabId === "labels") {
      addShellSelect("Geographic level", mapTransportWorkbenchMaxLevelToLabelLevel(displayConfig.labels.maxLevel), [
        { value: "region", label: "Level 1 region" },
        { value: "anchor", label: "Level 2 anchor" },
        { value: "category", label: "Level 3 category" },
      ], (nextValue) => updateDisplayConfig(family.id, (draft) => {
        draft.labels.maxLevel = mapTransportWorkbenchLabelLevelToMaxLevel(nextValue);
      }));
      addShellRange(
        "Label budget",
        Number(displayConfig.labels.budget || config?.labelBudget || 8),
        3,
        18,
        1,
        "",
        (nextValue) => updateDisplayConfig(family.id, (draft) => {
          draft.labels.budget = nextValue;
        })
      );
      addShellToggle("Allow label aggregation", !!displayConfig.labels.allowAggregation, (nextValue) => {
        updateDisplayConfig(family.id, (draft) => {
          draft.labels.allowAggregation = nextValue;
        });
      });
    } else if (tabId === "coverage") {
      if (family.id === "port") {
        addShellSelect("Coverage tier", displayConfig.coverage || "core", [
          { value: "core", label: "Core" },
          { value: "expanded", label: "Expanded" },
          { value: "full_official", label: "Full official" },
        ], (nextValue) => updateDisplayConfig(family.id, (draft) => {
          draft.coverage = nextValue;
        }));
      }
    }
    const note = document.createElement("p");
    note.className = "transport-workbench-shell-note";
    note.textContent = tabId === "data"
      ? translate("Manifest and audit stay read-only here so control tuning and source truth do not get mixed.")
      : translate("Use this panel to adjust the current family without changing the lens column context.");
    card.append(grid, note);
    return card;
  };

  const appendAdvancedRange = (tabId, family, config, body, compareHeld) => {
    const displayConfig = getDisplayConfig(family.id);
    const control = document.createElement("div");
    control.className = "transport-workbench-shell-control";
    const label = document.createElement("div");
    label.className = "transport-workbench-shell-label";
    label.textContent = translate(tabId === "aggregation" ? "Cluster radius" : "Label separation");
    const row = document.createElement("div");
    row.className = "transport-workbench-range-row";
    const input = document.createElement("input");
    input.type = "range";
    input.className = "transport-workbench-range";
    input.disabled = compareHeld;
    input.min = tabId === "aggregation" ? "24" : "0.7";
    input.max = tabId === "aggregation" ? "120" : "1.8";
    input.step = tabId === "aggregation" ? "2" : "0.05";
    const value = tabId === "aggregation"
      ? Number(displayConfig.aggregation.thresholds?.clusterRadiusPx || config?.aggregationClusterRadiusPx || 48)
      : Number(displayConfig.labels.separationStrength || config?.labelSeparation || 1);
    const unit = tabId === "aggregation" ? "px" : "";
    input.value = String(value);
    const valueText = document.createElement("span");
    valueText.className = "transport-workbench-range-value";
    const formatValue = (nextValue) => `${nextValue}${unit}`;
    valueText.textContent = formatValue(value);
    input.addEventListener("input", () => {
      const nextValue = Number(input.value);
      valueText.textContent = formatValue(nextValue);
      if (compareHeld) return;
      updateDisplayConfig(family.id, (draft) => {
        if (tabId === "aggregation") {
          draft.aggregation.thresholds.clusterRadiusPx = nextValue;
        } else {
          draft.labels.separationStrength = nextValue;
        }
      });
    });
    row.append(input, valueText);
    control.append(label, row);
    body.appendChild(control);
  };

  const renderTabSections = (family, config, compareHeld, tabId, mountNode) => {
    if (!isElementLike(mountNode)) return;
    mountNode.replaceChildren();
    const shellCard = createShellCard(family, tabId, config, compareHeld);
    if (shellCard) {
      mountNode.appendChild(shellCard);
    }
    const skipDefaultSections = TRANSPORT_WORKBENCH_DENSITY_FAMILY_IDS.has(family.id)
      && (tabId === "aggregation" || tabId === "labels");
    if (!skipDefaultSections) {
      getSectionsForTab(family.id, tabId).forEach((section) => {
        const node = createSectionNode(family, section, config, compareHeld);
        if (node) {
          mountNode.appendChild(node);
        }
      });
    }
    if (tabId === "aggregation" || tabId === "labels") {
      const advanced = document.createElement("details");
      advanced.className = "transport-workbench-advanced";
      const summary = document.createElement("summary");
      summary.textContent = translate("Advanced");
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
      appendAdvancedRange(tabId, family, config, body, compareHeld);
      body.appendChild(copy);
      advanced.appendChild(body);
      mountNode.appendChild(advanced);
    }
    if (mountNode.childElementCount === 0) {
      const empty = document.createElement("div");
      empty.className = "transport-workbench-empty-card";
      const title = document.createElement("div");
      title.className = "transport-workbench-empty-title";
      title.textContent = tabId === "data" ? translate("No audit payload yet") : translate("No controls in this tab");
      const body = document.createElement("p");
      body.className = "transport-workbench-empty-text";
      body.textContent = tabId === "data"
        ? translate("This family has not exposed extra manifest or audit cards in the current shell.")
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

  const renderTabs = ({ family, config, compareHeld, activeTab }) => {
    const resolvedTab = setInspectorTab(activeTab);
    tabButtons.forEach((button) => {
      const isActive = String(button.dataset.transportInspectorTab || "") === resolvedTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    Object.entries(panels).forEach(([tabId, panel]) => {
      if (!panel || !panel.classList) return;
      panel.classList.toggle("hidden", tabId !== resolvedTab);
      panel.classList.toggle("is-active", tabId === resolvedTab);
    });
    if (Object.prototype.hasOwnProperty.call(TAB_MOUNTS, resolvedTab)) {
      renderTabSections(family, config, compareHeld, resolvedTab, mounts[resolvedTab]);
    }
    return resolvedTab;
  };

  return {
    renderControl,
    renderTabSections,
    renderTabs,
  };
}
