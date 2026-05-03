export function createDefaultScenarioReleasableIndex() {
  return {
    byTag: {},
    childTagsByParent: {},
    consumedPresetNamesByParentLookup: {},
  };
}

export function createDefaultScenarioAuditUiState() {
  return {
    loading: false,
    loadedForScenarioId: "",
    errorMessage: "",
  };
}

export function createDefaultScenarioDiagnosticsUiState() {
  return {
    loading: false,
    loadedForScenarioId: "",
    errorMessage: "",
  };
}

export function createDefaultStateCatalog() {
  return {
    defaultReleasableCatalog: null,
    releasableCatalog: null,
    scenarioReleasableIndex: createDefaultScenarioReleasableIndex(),
    defaultReleasablePresetOverlays: {},
    scenarioReleasablePresetOverlays: {},
    releasableBoundaryVariantByTag: {},
    scenarioAudit: null,
    scenarioAuditUi: createDefaultScenarioAuditUiState(),
    scenarioDiagnostics: null,
    scenarioDiagnosticsPreview: null,
    scenarioDiagnosticsUi: createDefaultScenarioDiagnosticsUiState(),
  };
}

// Startup boot seeds the baseline releasable catalog once; keep that twin write
// in the catalog owner so bootstrap code only describes intent.
export function hydrateStartupReleasableCatalogState(target, releasableCatalog = null) {
  if (!target || typeof target !== "object") {
    return null;
  }
  target.defaultReleasableCatalog = releasableCatalog || null;
  target.releasableCatalog = releasableCatalog || null;
  return target.releasableCatalog;
}

export function hydrateScenarioReleasableCatalogState(
  target,
  {
    releasableCatalog = null,
    scenarioReleasableIndex = null,
  } = {},
) {
  if (!target || typeof target !== "object") {
    return null;
  }
  target.releasableCatalog = releasableCatalog || null;
  target.scenarioReleasableIndex =
    scenarioReleasableIndex && typeof scenarioReleasableIndex === "object"
      ? scenarioReleasableIndex
      : createDefaultScenarioReleasableIndex();
  return target.releasableCatalog;
}

export function setScenarioAuditState(target, scenarioAudit = null) {
  if (!target || typeof target !== "object") {
    return null;
  }
  target.scenarioAudit = scenarioAudit || null;
  return target.scenarioAudit;
}

export function ensureScenarioAuditUiState(target) {
  if (!target || typeof target !== "object") {
    return createDefaultScenarioAuditUiState();
  }
  if (!target.scenarioAuditUi || typeof target.scenarioAuditUi !== "object") {
    target.scenarioAuditUi = createDefaultScenarioAuditUiState();
  }
  if (typeof target.scenarioAuditUi.loading !== "boolean") {
    target.scenarioAuditUi.loading = false;
  }
  if (typeof target.scenarioAuditUi.loadedForScenarioId !== "string") {
    target.scenarioAuditUi.loadedForScenarioId = "";
  }
  if (typeof target.scenarioAuditUi.errorMessage !== "string") {
    target.scenarioAuditUi.errorMessage = "";
  }
  return target.scenarioAuditUi;
}

export function setScenarioDiagnosticsState(
  target,
  {
    report = null,
    preview = null,
    ui = null,
  } = {},
) {
  if (!target || typeof target !== "object") {
    return null;
  }
  target.scenarioDiagnostics = report || null;
  target.scenarioDiagnosticsPreview = preview || null;
  target.scenarioDiagnosticsUi = ui && typeof ui === "object"
    ? {
        loading: !!ui.loading,
        errorMessage: String(ui.errorMessage || ""),
        loadedForScenarioId: String(ui.loadedForScenarioId || ""),
      }
    : createDefaultScenarioDiagnosticsUiState();
  return target.scenarioDiagnostics;
}
