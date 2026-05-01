const SMOKE_FAILURE_SELECTOR_SETS = Object.freeze({
  bootShell: [
    "#bootOverlay",
  ],
  mainShell: [
    "#leftPanelToggle",
    "#rightPanelToggle",
    "#btnToggleLang",
  ],
  scenarioShell: [
    "#scenarioSelect",
    "#scenarioStatus",
    "#scenarioViewModeSelect",
  ],
  hoi4ScenarioAudit: [
    "#scenarioAuditHint",
  ],
  tnoScenarioAudit: [
    "#countrySearch",
  ],
  uiFoundation: [
    "#toastViewport",
  ],
  cityRuntime: [
    "#cityPointsTheme",
    "#cityPointsMarkerScale",
    "#urbanMode",
    "#dayNightCityLightsEnabled",
  ],
});

function getSelectorSet(name) {
  const selectors = SMOKE_FAILURE_SELECTOR_SETS[String(name || "").trim()];
  return Array.isArray(selectors) ? [...selectors] : [];
}

function mergeSmokeFailureSelectors(...names) {
  const merged = new Set();
  for (const name of names) {
    for (const selector of getSelectorSet(name)) {
      merged.add(selector);
    }
  }
  return [...merged];
}

module.exports = {
  SMOKE_FAILURE_SELECTOR_SETS,
  getSelectorSet,
  mergeSmokeFailureSelectors,
};
