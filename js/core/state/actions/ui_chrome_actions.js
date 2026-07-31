// Canonical UI chrome mutations. DOM, URL, focus, and persistence effects remain with callers.

const BOOLEAN_UI_CHROME_FIELDS = Object.freeze([
  "dockCollapsed",
  "scenarioBarCollapsed",
  "scenarioGuideDismissed",
  "tutorialEntryVisible",
  "tutorialDismissed",
  "politicalEditingExpanded",
  "scenarioVisualAdjustmentsOpen",
  "developerMode",
  "devWorkspaceExpanded",
  "overlayResizeBound",
]);

const STRING_UI_CHROME_FIELDS = Object.freeze([
  "devWorkspaceCategory",
  "rightSidebarTab",
  "responsiveChromeTier",
]);

const DEFAULT_UI_CHROME_STATE = Object.freeze({
  dockCollapsed: false,
  scenarioBarCollapsed: false,
  scenarioGuideDismissed: false,
  tutorialEntryVisible: true,
  tutorialDismissed: false,
  politicalEditingExpanded: false,
  scenarioVisualAdjustmentsOpen: false,
  developerMode: false,
  devWorkspaceExpanded: false,
  overlayResizeBound: false,
  devWorkspaceCategory: "selection",
  rightSidebarTab: "inspector",
  responsiveChromeTier: "",
  paletteLibrarySections: Object.freeze({}),
});

function isStateTarget(target) {
  return !!target && typeof target === "object" && !Array.isArray(target);
}

function cloneRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

export function ensureUiChromeState(target) {
  if (!isStateTarget(target)) return {};
  if (!isStateTarget(target.ui)) target.ui = {};
  const ui = target.ui;
  BOOLEAN_UI_CHROME_FIELDS.forEach((field) => {
    ui[field] = Object.hasOwn(ui, field) ? !!ui[field] : DEFAULT_UI_CHROME_STATE[field];
  });
  STRING_UI_CHROME_FIELDS.forEach((field) => {
    ui[field] = Object.hasOwn(ui, field)
      ? String(ui[field] || "").trim()
      : DEFAULT_UI_CHROME_STATE[field];
  });
  if (!isStateTarget(ui.paletteLibrarySections)) ui.paletteLibrarySections = {};
  if (Object.hasOwn(ui, "restoredSupportSurfaceViewFromUrl")) {
    ui.restoredSupportSurfaceViewFromUrl = String(
      ui.restoredSupportSurfaceViewFromUrl || "",
    ).trim().toLowerCase();
  }
  return ui;
}

export function patchUiChromeState(target, patch = {}) {
  const ui = ensureUiChromeState(target);
  if (!isStateTarget(target) || !isStateTarget(patch)) return ui;
  BOOLEAN_UI_CHROME_FIELDS.forEach((field) => {
    if (Object.hasOwn(patch, field)) ui[field] = !!patch[field];
  });
  STRING_UI_CHROME_FIELDS.forEach((field) => {
    if (Object.hasOwn(patch, field)) ui[field] = String(patch[field] || "").trim();
  });
  if (Object.hasOwn(patch, "paletteLibrarySections")) {
    ui.paletteLibrarySections = cloneRecord(patch.paletteLibrarySections);
  }
  if (Object.hasOwn(patch, "restoredSupportSurfaceViewFromUrl")) {
    setRestoredSupportSurfaceViewState(target, patch.restoredSupportSurfaceViewFromUrl);
  }
  return ui;
}

export function setActiveDockPopoverState(target, nextKind = "") {
  if (!isStateTarget(target)) return "";
  target.activeDockPopover = String(nextKind || "").trim();
  return target.activeDockPopover;
}

export function setRestoredSupportSurfaceViewState(target, nextView = "") {
  if (!isStateTarget(target)) return "";
  const ui = ensureUiChromeState(target);
  ui.restoredSupportSurfaceViewFromUrl = String(nextView || "").trim();
  return ui.restoredSupportSurfaceViewFromUrl;
}
