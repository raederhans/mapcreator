import { normalizeScenarioColorInput, normalizeScenarioNameInput, normalizeScenarioTagInput } from "./dev_workspace_normalizers.js";

function isValidColorHex(value) {
  return /^#[0-9A-F]{6}$/.test(normalizeScenarioColorInput(value));
}

export function syncScenarioCountryColorEditorState({ countryModel, previousState }) {
  const priorState = previousState && typeof previousState === "object" ? previousState : {};
  const nextTag = normalizeScenarioTagInput(countryModel?.tag);
  const priorTag = normalizeScenarioTagInput(priorState.tag);
  const defaultColorHex = normalizeScenarioColorInput(countryModel?.entry?.color_hex);
  const currentColorHex = normalizeScenarioColorInput(priorState.colorHex);
  const shouldHydrate = (
    (nextTag && nextTag !== priorTag)
    || (!currentColorHex && defaultColorHex)
  );
  if (!shouldHydrate) {
    return null;
  }
  return {
    ...priorState,
    tag: nextTag || priorTag,
    colorHex: defaultColorHex || currentColorHex,
    lastColorSaveMessage: "",
    lastColorSaveTone: "",
  };
}

export function buildScenarioCountryColorSavePayload({ activeScenarioId, model, editorState, ui }) {
  const scenarioId = String(activeScenarioId || "").trim();
  const colorHex = normalizeScenarioColorInput(editorState?.colorHex);
  const nameEn = normalizeScenarioNameInput(
    model?.defaultNameEn
    || model?.entry?.display_name_en
    || model?.entry?.display_name
    || model?.tag
  );
  const nameZh = normalizeScenarioNameInput(
    model?.defaultNameZh
    || model?.entry?.display_name_zh
  );
  if (!scenarioId) {
    return { ok: false, message: ui("Activate a scenario to edit country names.") };
  }
  if (!model?.tag) {
    return { ok: false, message: ui("Choose a scenario country tag first.") };
  }
  if (!isValidColorHex(colorHex)) {
    return { ok: false, message: ui("Choose a valid color before saving.") };
  }
  if (!nameEn || !nameZh) {
    return { ok: false, message: ui("Both English and Chinese country names are required.") };
  }
  return {
    ok: true,
    payload: {
      scenarioId,
      tag: model.tag,
      nameEn,
      nameZh,
      colorHex,
    },
  };
}

export function renderScenarioCountryColorEditor({
  hasActiveScenario,
  model,
  editorState,
  colorInput,
  saveButton,
  statusNode,
  ui,
}) {
  const colorHex = normalizeScenarioColorInput(
    editorState?.colorHex
    || model?.entry?.color_hex
    || "#000000"
  );
  const canSave = (
    hasActiveScenario
    && !!model?.tag
    && isValidColorHex(colorHex)
    && !editorState?.isSaving
  );
  if (colorInput) {
    if (colorInput.value !== colorHex.toLowerCase()) {
      colorInput.value = colorHex.toLowerCase();
    }
    colorInput.disabled = !hasActiveScenario || !model?.tag || !!editorState?.isSaving;
  }
  if (saveButton) {
    saveButton.textContent = editorState?.isSaving ? ui("Saving...") : ui("Save");
    saveButton.disabled = !canSave;
  }
  if (statusNode) {
    const statusBits = [];
    if (editorState?.lastColorSaveMessage) {
      statusBits.push(editorState.lastColorSaveMessage);
    } else if (editorState?.lastColorSavedAt) {
      statusBits.push(`${ui("Last Saved")}: ${editorState.lastColorSavedAt}`);
    }
    if (isValidColorHex(colorHex)) {
      statusBits.push(colorHex);
    }
    statusNode.textContent = statusBits.join(" | ");
  }
}
