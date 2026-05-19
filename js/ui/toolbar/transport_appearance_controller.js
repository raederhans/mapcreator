import {
  normalizeTransportOverviewStyleConfig,
  resolveLinkedTransportOverviewScopeAndThreshold,
} from "../../core/state.js";
import {
  normalizeTransportOverviewVisualMode,
} from "../../core/transport_capability_registry.js";
import {
  buildTransportFamilySummaryText as buildTransportFamilySummaryTextForState,
  formatTransportPercent,
  formatTransportScopeLabel,
  formatTransportThresholdLabel,
} from "./appearance_transport_summary.js";

/**
 * Owns the Appearance panel transport controls: DOM sync, family toggles,
 * style mutations, and summary refresh batching.
 */
export function createTransportAppearanceController({
  runtimeState,
  t,
  clamp,
  renderDirty,
  normalizeOceanFillColor,
}) {
  const transportAppearanceMasterToggle = document.getElementById("transportAppearanceMasterToggle");
  const transportVisualMode = document.getElementById("transportVisualMode");
  const transportFacilityUnderlyingMapSelection = document.getElementById("transportFacilityUnderlyingMapSelection");
  const transportAirportCard = document.getElementById("transportAirportCard");
  const transportPortCard = document.getElementById("transportPortCard");
  const transportRailCard = document.getElementById("transportRailCard");
  const transportRoadCard = document.getElementById("transportRoadCard");
  const transportAirportControls = document.getElementById("transportAirportControls");
  const transportPortControls = document.getElementById("transportPortControls");
  const transportRailControls = document.getElementById("transportRailControls");
  const transportRoadControls = document.getElementById("transportRoadControls");
  const transportAirportSummaryMeta = document.getElementById("transportAirportSummaryMeta");
  const transportPortSummaryMeta = document.getElementById("transportPortSummaryMeta");
  const transportRailSummaryMeta = document.getElementById("transportRailSummaryMeta");
  const transportRoadSummaryMeta = document.getElementById("transportRoadSummaryMeta");

  const toggleAirports = document.getElementById("toggleAirports");
  const togglePorts = document.getElementById("togglePorts");
  const toggleRail = document.getElementById("toggleRail");
  const toggleRoad = document.getElementById("toggleRoad");

  const airportVisualStrength = document.getElementById("airportVisualStrength");
  const airportVisualStrengthValue = document.getElementById("airportVisualStrengthValue");
  const airportOpacity = document.getElementById("airportOpacity");
  const airportOpacityValue = document.getElementById("airportOpacityValue");
  const airportPrimaryColor = document.getElementById("airportPrimaryColor");
  const airportLabelsEnabled = document.getElementById("airportLabelsEnabled");
  const airportLabelDensity = document.getElementById("airportLabelDensity");
  const airportLabelMode = document.getElementById("airportLabelMode");
  const airportLabelSize = document.getElementById("airportLabelSize");
  const airportLabelSizeValue = document.getElementById("airportLabelSizeValue");
  const airportLabelHalo = document.getElementById("airportLabelHalo");
  const airportLabelHaloValue = document.getElementById("airportLabelHaloValue");
  const airportCoverageReach = document.getElementById("airportCoverageReach");
  const airportCoverageReachValue = document.getElementById("airportCoverageReachValue");
  const airportScopeLinked = document.getElementById("airportScopeLinked");
  const airportScopeResolved = document.getElementById("airportScopeResolved");
  const airportThresholdResolved = document.getElementById("airportThresholdResolved");
  const airportScope = document.getElementById("airportScope");
  const airportImportanceThreshold = document.getElementById("airportImportanceThreshold");

  const portVisualStrength = document.getElementById("portVisualStrength");
  const portVisualStrengthValue = document.getElementById("portVisualStrengthValue");
  const portOpacity = document.getElementById("portOpacity");
  const portOpacityValue = document.getElementById("portOpacityValue");
  const portPrimaryColor = document.getElementById("portPrimaryColor");
  const portLabelsEnabled = document.getElementById("portLabelsEnabled");
  const portLabelDensity = document.getElementById("portLabelDensity");
  const portLabelMode = document.getElementById("portLabelMode");
  const portLabelSize = document.getElementById("portLabelSize");
  const portLabelSizeValue = document.getElementById("portLabelSizeValue");
  const portLabelHalo = document.getElementById("portLabelHalo");
  const portLabelHaloValue = document.getElementById("portLabelHaloValue");
  const portCoverageReach = document.getElementById("portCoverageReach");
  const portCoverageReachValue = document.getElementById("portCoverageReachValue");
  const portScopeLinked = document.getElementById("portScopeLinked");
  const portScopeResolved = document.getElementById("portScopeResolved");
  const portThresholdResolved = document.getElementById("portThresholdResolved");
  const portTier = document.getElementById("portTier");
  const portImportanceThreshold = document.getElementById("portImportanceThreshold");

  const railVisualStrength = document.getElementById("railVisualStrength");
  const railVisualStrengthValue = document.getElementById("railVisualStrengthValue");
  const railOpacity = document.getElementById("railOpacity");
  const railOpacityValue = document.getElementById("railOpacityValue");
  const railPrimaryColor = document.getElementById("railPrimaryColor");
  const railLabelsEnabled = document.getElementById("railLabelsEnabled");
  const railLabelDensity = document.getElementById("railLabelDensity");
  const railCoverageReach = document.getElementById("railCoverageReach");
  const railCoverageReachValue = document.getElementById("railCoverageReachValue");
  const railScopeLinked = document.getElementById("railScopeLinked");
  const railScopeResolved = document.getElementById("railScopeResolved");
  const railThresholdResolved = document.getElementById("railThresholdResolved");
  const railScope = document.getElementById("railScope");
  const railImportanceThreshold = document.getElementById("railImportanceThreshold");

  const roadVisualStrength = document.getElementById("roadVisualStrength");
  const roadVisualStrengthValue = document.getElementById("roadVisualStrengthValue");
  const roadOpacity = document.getElementById("roadOpacity");
  const roadOpacityValue = document.getElementById("roadOpacityValue");
  const roadPrimaryColor = document.getElementById("roadPrimaryColor");
  const roadLabelsEnabled = document.getElementById("roadLabelsEnabled");
  const roadLabelDensity = document.getElementById("roadLabelDensity");
  const roadCoverageReach = document.getElementById("roadCoverageReach");
  const roadCoverageReachValue = document.getElementById("roadCoverageReachValue");
  const roadScopeLinked = document.getElementById("roadScopeLinked");
  const roadScopeResolved = document.getElementById("roadScopeResolved");
  const roadThresholdResolved = document.getElementById("roadThresholdResolved");
  const roadScope = document.getElementById("roadScope");
  const roadImportanceThreshold = document.getElementById("roadImportanceThreshold");

  const getTransportAppearanceConfig = () => {
    runtimeState.styleConfig.transportOverview = normalizeTransportOverviewStyleConfig(
      runtimeState.styleConfig?.transportOverview || {},
    );
    return runtimeState.styleConfig.transportOverview;
  };

  const getTransportAppearanceVisualMode = () => normalizeTransportOverviewVisualMode(
    getTransportAppearanceConfig().visualMode,
    "distribution",
  );

  const scheduleTransportAppearanceFrame = (callback) => {
    const scheduleFrame = typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (frameCallback) => setTimeout(frameCallback, 0);
    return scheduleFrame(callback);
  };
  let transportAppearanceUiFrameId = 0;

  const getEffectiveTransportScopeState = (familyId, familyConfig) => (
    familyConfig.scopeLinkMode === "manual"
      ? {
        scope: String(familyConfig.scope || "").trim().toLowerCase(),
        importanceThreshold: String(familyConfig.importanceThreshold || "").trim().toLowerCase(),
      }
      : resolveLinkedTransportOverviewScopeAndThreshold(familyId, familyConfig.coverageReach)
  );

  const buildTransportFamilySummaryText = (familyId, masterEnabled, familyEnabled, familyConfig, effectiveScope) =>
    buildTransportFamilySummaryTextForState({
      familyId,
      masterEnabled,
      familyEnabled,
      familyConfig,
      effectiveScope,
      collections: {
        airport: runtimeState.airportsData,
        port: runtimeState.portsData,
        rail: runtimeState.railwaysData,
        road: runtimeState.roadsData,
      },
      metrics: runtimeState.renderPerfMetrics,
      zoomScale: runtimeState.zoomTransform?.k,
      visualMode: getTransportAppearanceVisualMode(),
      translate: t,
    });

  const renderTransportAppearanceDirty = (reason) => {
    const normalizedReason = String(reason || "").trim();
    renderDirty(normalizedReason || "transport-appearance");
    if (transportAppearanceUiFrameId) return;
    transportAppearanceUiFrameId = scheduleTransportAppearanceFrame(() => {
      transportAppearanceUiFrameId = 0;
      renderTransportAppearanceUi();
    });
  };

  const refreshTransportAppearanceUiAfterLayerLoad = (layerId) => (error) => {
    console.warn(`[transport-appearance] Failed to refresh ${layerId} layer data.`, error);
    renderTransportAppearanceUi();
  };

  const setTransportAppearanceGroupEnabled = (container, enabled) => {
    if (!(container instanceof HTMLElement)) return;
    container.classList.toggle("opacity-60", !enabled);
  };

  const renderTransportAppearanceUi = () => {
    const transportConfig = getTransportAppearanceConfig();
    const airportConfig = transportConfig.airport || {};
    const portConfig = transportConfig.port || {};
    const railConfig = transportConfig.rail || {};
    const roadConfig = transportConfig.road || {};
    const visualMode = normalizeTransportOverviewVisualMode(transportConfig.visualMode, "distribution");
    const transportEnabled = runtimeState.showTransport !== false;
    const airportScopeState = getEffectiveTransportScopeState("airport", airportConfig);
    const portScopeState = getEffectiveTransportScopeState("port", portConfig);
    const railScopeState = getEffectiveTransportScopeState("rail", railConfig);
    const roadScopeState = getEffectiveTransportScopeState("road", roadConfig);

    if (transportAppearanceMasterToggle) transportAppearanceMasterToggle.checked = transportEnabled;
    if (transportVisualMode) transportVisualMode.value = visualMode;
    if (transportFacilityUnderlyingMapSelection) {
      transportFacilityUnderlyingMapSelection.checked = !!transportConfig.allowFacilityUnderlyingMapSelection;
    }

    if (airportVisualStrength) airportVisualStrength.value = String(Math.round(Number(airportConfig.visualStrength ?? 0.62) * 100));
    if (airportVisualStrengthValue) airportVisualStrengthValue.textContent = formatTransportPercent(airportConfig.visualStrength ?? 0.62);
    if (airportOpacity) airportOpacity.value = String(Math.round(Number(airportConfig.opacity ?? 0.82) * 100));
    if (airportOpacityValue) airportOpacityValue.textContent = formatTransportPercent(airportConfig.opacity ?? 0.82);
    if (airportPrimaryColor) airportPrimaryColor.value = normalizeOceanFillColor(airportConfig.primaryColor || "#1d4ed8");
    if (airportLabelsEnabled) airportLabelsEnabled.checked = !!airportConfig.labelsEnabled;
    if (airportLabelDensity) airportLabelDensity.value = String(airportConfig.labelDensity || "balanced");
    if (airportLabelMode) airportLabelMode.value = String(airportConfig.labelMode || "adaptive");
    if (airportLabelSize) airportLabelSize.value = String(Math.round(Number(airportConfig.labelSize ?? 9)));
    if (airportLabelSizeValue) airportLabelSizeValue.textContent = `${Math.round(Number(airportConfig.labelSize ?? 9))}px`;
    if (airportLabelHalo) airportLabelHalo.value = String(Math.round(Number(airportConfig.labelHalo ?? 0.22) * 100));
    if (airportLabelHaloValue) airportLabelHaloValue.textContent = formatTransportPercent(airportConfig.labelHalo ?? 0.22);
    if (airportCoverageReach) airportCoverageReach.value = String(Math.round(Number(airportConfig.coverageReach ?? 0.5) * 100));
    if (airportCoverageReachValue) airportCoverageReachValue.textContent = formatTransportPercent(airportConfig.coverageReach ?? 0.5);
    if (airportScopeLinked) airportScopeLinked.checked = String(airportConfig.scopeLinkMode || "linked") !== "manual";
    if (airportScopeResolved) airportScopeResolved.textContent = t(formatTransportScopeLabel(airportScopeState.scope), "ui");
    if (airportThresholdResolved) airportThresholdResolved.textContent = t(formatTransportThresholdLabel(airportScopeState.importanceThreshold), "ui");
    if (airportScope) airportScope.value = String(airportConfig.scope || "major_civil");
    if (airportImportanceThreshold) airportImportanceThreshold.value = String(airportConfig.importanceThreshold || "secondary");
    if (toggleAirports) toggleAirports.checked = !!runtimeState.showAirports;
    if (transportAirportSummaryMeta) {
      transportAirportSummaryMeta.textContent = buildTransportFamilySummaryText("airport", transportEnabled, !!runtimeState.showAirports, airportConfig, airportScopeState);
    }

    if (portVisualStrength) portVisualStrength.value = String(Math.round(Number(portConfig.visualStrength ?? 0.58) * 100));
    if (portVisualStrengthValue) portVisualStrengthValue.textContent = formatTransportPercent(portConfig.visualStrength ?? 0.58);
    if (portOpacity) portOpacity.value = String(Math.round(Number(portConfig.opacity ?? 0.78) * 100));
    if (portOpacityValue) portOpacityValue.textContent = formatTransportPercent(portConfig.opacity ?? 0.78);
    if (portPrimaryColor) portPrimaryColor.value = normalizeOceanFillColor(portConfig.primaryColor || "#b45309");
    if (portLabelsEnabled) portLabelsEnabled.checked = !!portConfig.labelsEnabled;
    if (portLabelDensity) portLabelDensity.value = String(portConfig.labelDensity || "balanced");
    if (portLabelMode) portLabelMode.value = String(portConfig.labelMode || "adaptive");
    if (portLabelSize) portLabelSize.value = String(Math.round(Number(portConfig.labelSize ?? 9)));
    if (portLabelSizeValue) portLabelSizeValue.textContent = `${Math.round(Number(portConfig.labelSize ?? 9))}px`;
    if (portLabelHalo) portLabelHalo.value = String(Math.round(Number(portConfig.labelHalo ?? 0.22) * 100));
    if (portLabelHaloValue) portLabelHaloValue.textContent = formatTransportPercent(portConfig.labelHalo ?? 0.22);
    if (portCoverageReach) portCoverageReach.value = String(Math.round(Number(portConfig.coverageReach ?? 0.5) * 100));
    if (portCoverageReachValue) portCoverageReachValue.textContent = formatTransportPercent(portConfig.coverageReach ?? 0.5);
    if (portScopeLinked) portScopeLinked.checked = String(portConfig.scopeLinkMode || "linked") !== "manual";
    if (portScopeResolved) portScopeResolved.textContent = t(formatTransportScopeLabel(portScopeState.scope), "ui");
    if (portThresholdResolved) portThresholdResolved.textContent = t(formatTransportThresholdLabel(portScopeState.importanceThreshold), "ui");
    if (portTier) portTier.value = String(portConfig.scope || "regional");
    if (portImportanceThreshold) portImportanceThreshold.value = String(portConfig.importanceThreshold || "secondary");
    if (togglePorts) togglePorts.checked = !!runtimeState.showPorts;
    if (transportPortSummaryMeta) {
      transportPortSummaryMeta.textContent = buildTransportFamilySummaryText("port", transportEnabled, !!runtimeState.showPorts, portConfig, portScopeState);
    }

    if (railVisualStrength) railVisualStrength.value = String(Math.round(Number(railConfig.visualStrength ?? 0.5) * 100));
    if (railVisualStrengthValue) railVisualStrengthValue.textContent = formatTransportPercent(railConfig.visualStrength ?? 0.5);
    if (railOpacity) railOpacity.value = String(Math.round(Number(railConfig.opacity ?? 0.72) * 100));
    if (railOpacityValue) railOpacityValue.textContent = formatTransportPercent(railConfig.opacity ?? 0.72);
    if (railPrimaryColor) railPrimaryColor.value = normalizeOceanFillColor(railConfig.primaryColor || "#0f172a");
    if (railLabelsEnabled) railLabelsEnabled.checked = !!railConfig.labelsEnabled;
    if (railLabelDensity) railLabelDensity.value = String(railConfig.labelDensity || "sparse");
    if (railCoverageReach) railCoverageReach.value = String(Math.round(Number(railConfig.coverageReach ?? 0.2) * 100));
    if (railCoverageReachValue) railCoverageReachValue.textContent = formatTransportPercent(railConfig.coverageReach ?? 0.2);
    if (railScopeLinked) railScopeLinked.checked = String(railConfig.scopeLinkMode || "linked") !== "manual";
    if (railScopeResolved) railScopeResolved.textContent = t(formatTransportScopeLabel(railScopeState.scope), "ui");
    if (railThresholdResolved) railThresholdResolved.textContent = t(formatTransportThresholdLabel(railScopeState.importanceThreshold), "ui");
    if (railScope) railScope.value = String(railConfig.scope || "mainline_only");
    if (railImportanceThreshold) railImportanceThreshold.value = String(railConfig.importanceThreshold || "primary");
    if (toggleRail) toggleRail.checked = !!runtimeState.showRail;
    if (transportRailSummaryMeta) {
      transportRailSummaryMeta.textContent = buildTransportFamilySummaryText("rail", transportEnabled, !!runtimeState.showRail, railConfig, railScopeState);
    }

    if (roadVisualStrength) roadVisualStrength.value = String(Math.round(Number(roadConfig.visualStrength ?? 0.5) * 100));
    if (roadVisualStrengthValue) roadVisualStrengthValue.textContent = formatTransportPercent(roadConfig.visualStrength ?? 0.5);
    if (roadOpacity) roadOpacity.value = String(Math.round(Number(roadConfig.opacity ?? 0.72) * 100));
    if (roadOpacityValue) roadOpacityValue.textContent = formatTransportPercent(roadConfig.opacity ?? 0.72);
    if (roadPrimaryColor) roadPrimaryColor.value = normalizeOceanFillColor(roadConfig.primaryColor || "#374151");
    if (roadLabelsEnabled) roadLabelsEnabled.checked = !!roadConfig.labelsEnabled;
    if (roadLabelDensity) roadLabelDensity.value = String(roadConfig.labelDensity || "sparse");
    if (roadCoverageReach) roadCoverageReach.value = String(Math.round(Number(roadConfig.coverageReach ?? 0.2) * 100));
    if (roadCoverageReachValue) roadCoverageReachValue.textContent = formatTransportPercent(roadConfig.coverageReach ?? 0.2);
    if (roadScopeLinked) roadScopeLinked.checked = String(roadConfig.scopeLinkMode || "linked") !== "manual";
    if (roadScopeResolved) roadScopeResolved.textContent = t(formatTransportScopeLabel(roadScopeState.scope), "ui");
    if (roadThresholdResolved) roadThresholdResolved.textContent = t(formatTransportThresholdLabel(roadScopeState.importanceThreshold), "ui");
    if (roadScope) roadScope.value = String(roadConfig.scope || "motorway_only");
    if (roadImportanceThreshold) roadImportanceThreshold.value = String(roadConfig.importanceThreshold || "primary");
    if (toggleRoad) toggleRoad.checked = !!runtimeState.showRoad;
    if (transportRoadSummaryMeta) {
      transportRoadSummaryMeta.textContent = buildTransportFamilySummaryText("road", transportEnabled, !!runtimeState.showRoad, roadConfig, roadScopeState);
    }

    [
      airportVisualStrength, airportOpacity, airportPrimaryColor, airportLabelsEnabled, airportLabelDensity,
      airportLabelMode, airportLabelSize, airportLabelHalo, airportScopeLinked, airportScope, airportImportanceThreshold,
    ].forEach((control) => { if (control) control.disabled = !transportEnabled; });
    [
      portVisualStrength, portOpacity, portPrimaryColor, portLabelsEnabled, portLabelDensity,
      portLabelMode, portLabelSize, portLabelHalo, portScopeLinked, portTier, portImportanceThreshold,
    ].forEach((control) => { if (control) control.disabled = !transportEnabled; });
    [
      railVisualStrength, railOpacity, railPrimaryColor, railLabelsEnabled, railLabelDensity,
      railScopeLinked, railScope, railImportanceThreshold,
    ].forEach((control) => { if (control) control.disabled = !transportEnabled; });
    [
      roadVisualStrength, roadOpacity, roadPrimaryColor, roadLabelsEnabled, roadLabelDensity,
      roadScopeLinked, roadScope, roadImportanceThreshold,
    ].forEach((control) => { if (control) control.disabled = !transportEnabled; });
    [toggleAirports, togglePorts, toggleRail, toggleRoad].forEach((control) => {
      if (control) control.disabled = false;
    });
    if (transportVisualMode) transportVisualMode.disabled = !transportEnabled;
    if (transportFacilityUnderlyingMapSelection) transportFacilityUnderlyingMapSelection.disabled = !transportEnabled;

    const airportManual = String(airportConfig.scopeLinkMode || "linked") === "manual";
    const portManual = String(portConfig.scopeLinkMode || "linked") === "manual";
    const railManual = String(railConfig.scopeLinkMode || "linked") === "manual";
    const roadManual = String(roadConfig.scopeLinkMode || "linked") === "manual";
    if (airportCoverageReach) airportCoverageReach.disabled = !transportEnabled || airportManual;
    if (airportScope) airportScope.disabled = !transportEnabled || !airportManual;
    if (airportImportanceThreshold) airportImportanceThreshold.disabled = !transportEnabled || !airportManual;
    if (portCoverageReach) portCoverageReach.disabled = !transportEnabled || portManual;
    if (portTier) portTier.disabled = !transportEnabled || !portManual;
    if (portImportanceThreshold) portImportanceThreshold.disabled = !transportEnabled || !portManual;
    if (railCoverageReach) railCoverageReach.disabled = !transportEnabled || railManual;
    if (railScope) railScope.disabled = !transportEnabled || !railManual;
    if (railImportanceThreshold) railImportanceThreshold.disabled = !transportEnabled || !railManual;
    if (roadCoverageReach) roadCoverageReach.disabled = !transportEnabled || roadManual;
    if (roadScope) roadScope.disabled = !transportEnabled || !roadManual;
    if (roadImportanceThreshold) roadImportanceThreshold.disabled = !transportEnabled || !roadManual;

    setTransportAppearanceGroupEnabled(transportAirportControls, transportEnabled);
    setTransportAppearanceGroupEnabled(transportPortControls, transportEnabled);
    setTransportAppearanceGroupEnabled(transportRailControls, transportEnabled);
    setTransportAppearanceGroupEnabled(transportRoadControls, transportEnabled);

    transportAirportCard?.classList.toggle("opacity-60", !transportEnabled);
    transportPortCard?.classList.toggle("opacity-60", !transportEnabled);
    transportRailCard?.classList.toggle("opacity-60", !transportEnabled);
    transportRoadCard?.classList.toggle("opacity-60", !transportEnabled);
    runtimeState.syncFacilityInfoCardVisibilityFn?.();
  };

  const applyTransportAppearanceMasterToggle = (nextEnabled) => {
    const normalized = !!nextEnabled;
    if ((runtimeState.showTransport !== false) === normalized) {
      renderTransportAppearanceUi();
      return;
    }
    runtimeState.showTransport = normalized;
    if (normalized && hasVisibleTransportFamily()) {
      runtimeState.releaseDeferredContextBasePassFn?.("transport-master-toggle");
    }
    if (normalized && runtimeState.showAirports && typeof runtimeState.ensureContextLayerDataFn === "function") {
      void runtimeState.ensureContextLayerDataFn("airports", { reason: "transport-master-toggle", renderNow: true })
        .then(renderTransportAppearanceUi)
        .catch(refreshTransportAppearanceUiAfterLayerLoad("airports"));
    }
    if (normalized && runtimeState.showPorts && typeof runtimeState.ensureContextLayerDataFn === "function") {
      void runtimeState.ensureContextLayerDataFn("ports", { reason: "transport-master-toggle", renderNow: true })
        .then(renderTransportAppearanceUi)
        .catch(refreshTransportAppearanceUiAfterLayerLoad("ports"));
    }
    if (normalized && runtimeState.showRail && typeof runtimeState.ensureContextLayerDataFn === "function") {
      void runtimeState.ensureContextLayerDataFn(["railways", "rail_stations_major"], { reason: "transport-master-toggle", renderNow: true })
        .then(renderTransportAppearanceUi)
        .catch(refreshTransportAppearanceUiAfterLayerLoad("rail"));
    }
    if (normalized && runtimeState.showRoad && typeof runtimeState.ensureContextLayerDataFn === "function") {
      void runtimeState.ensureContextLayerDataFn("roads", { reason: "transport-master-toggle", renderNow: true })
        .then(renderTransportAppearanceUi)
        .catch(refreshTransportAppearanceUiAfterLayerLoad("roads"));
    }
    renderTransportAppearanceDirty("toggle-transport-overview");
  };

  const releaseDeferredContextForTransportToggle = (reason) => {
    runtimeState.releaseDeferredContextBasePassFn?.(reason);
  };

  const hasVisibleTransportFamily = () => !!(
    runtimeState.showAirports
    || runtimeState.showPorts
    || runtimeState.showRail
    || runtimeState.showRoad
  );

  const bindEvents = () => {
    if (transportAppearanceMasterToggle && !transportAppearanceMasterToggle.dataset.bound) {
      transportAppearanceMasterToggle.addEventListener("change", (event) => {
        applyTransportAppearanceMasterToggle(!!event.target.checked);
      });
      transportAppearanceMasterToggle.dataset.bound = "true";
    }

    if (transportVisualMode && !transportVisualMode.dataset.bound) {
      transportVisualMode.addEventListener("change", (event) => {
        getTransportAppearanceConfig().visualMode = normalizeTransportOverviewVisualMode(
          event.target.value || "distribution",
          "distribution",
        );
        renderTransportAppearanceDirty("transport-visual-mode");
      });
      transportVisualMode.dataset.bound = "true";
    }
    if (transportFacilityUnderlyingMapSelection && !transportFacilityUnderlyingMapSelection.dataset.bound) {
      transportFacilityUnderlyingMapSelection.addEventListener("change", (event) => {
        getTransportAppearanceConfig().allowFacilityUnderlyingMapSelection = !!event.target.checked;
        renderTransportAppearanceDirty("transport-facility-underlying-selection");
      });
      transportFacilityUnderlyingMapSelection.dataset.bound = "true";
    }

    if (toggleAirports && !toggleAirports.dataset.bound) {
      toggleAirports.checked = !!runtimeState.showAirports;
      toggleAirports.addEventListener("change", (event) => {
        runtimeState.showAirports = !!event.target.checked;
        if (runtimeState.showAirports && runtimeState.showTransport === false) runtimeState.showTransport = true;
        if (runtimeState.showAirports) {
          releaseDeferredContextForTransportToggle("toggle-airports");
        }
        if (runtimeState.showAirports && typeof runtimeState.ensureContextLayerDataFn === "function") {
          void runtimeState.ensureContextLayerDataFn("airports", { reason: "toolbar-toggle", renderNow: true })
            .then(renderTransportAppearanceUi)
            .catch(refreshTransportAppearanceUiAfterLayerLoad("airports"));
        }
        renderTransportAppearanceDirty("toggle-airports");
      });
      toggleAirports.dataset.bound = "true";
    }

    if (togglePorts && !togglePorts.dataset.bound) {
      togglePorts.checked = !!runtimeState.showPorts;
      togglePorts.addEventListener("change", (event) => {
        runtimeState.showPorts = !!event.target.checked;
        if (runtimeState.showPorts && runtimeState.showTransport === false) runtimeState.showTransport = true;
        if (runtimeState.showPorts) {
          releaseDeferredContextForTransportToggle("toggle-ports");
        }
        if (runtimeState.showPorts && typeof runtimeState.ensureContextLayerDataFn === "function") {
          void runtimeState.ensureContextLayerDataFn("ports", { reason: "toolbar-toggle", renderNow: true })
            .then(renderTransportAppearanceUi)
            .catch(refreshTransportAppearanceUiAfterLayerLoad("ports"));
        }
        renderTransportAppearanceDirty("toggle-ports");
      });
      togglePorts.dataset.bound = "true";
    }

    if (toggleRail && !toggleRail.dataset.bound) {
      toggleRail.checked = !!runtimeState.showRail;
      toggleRail.addEventListener("change", (event) => {
        runtimeState.showRail = !!event.target.checked;
        if (runtimeState.showRail && runtimeState.showTransport === false) runtimeState.showTransport = true;
        if (runtimeState.showRail) {
          releaseDeferredContextForTransportToggle("toggle-rail");
        }
        if (runtimeState.showRail && typeof runtimeState.ensureContextLayerDataFn === "function") {
          void runtimeState.ensureContextLayerDataFn(["railways", "rail_stations_major"], { reason: "toolbar-toggle", renderNow: true })
            .then(renderTransportAppearanceUi)
            .catch(refreshTransportAppearanceUiAfterLayerLoad("rail"));
        }
        renderTransportAppearanceDirty("toggle-rail");
      });
      toggleRail.dataset.bound = "true";
    }

    if (toggleRoad && !toggleRoad.dataset.bound) {
      toggleRoad.checked = !!runtimeState.showRoad;
      toggleRoad.addEventListener("change", (event) => {
        runtimeState.showRoad = !!event.target.checked;
        if (runtimeState.showRoad && runtimeState.showTransport === false) runtimeState.showTransport = true;
        if (runtimeState.showRoad) {
          releaseDeferredContextForTransportToggle("toggle-road");
        }
        if (runtimeState.showRoad && typeof runtimeState.ensureContextLayerDataFn === "function") {
          void runtimeState.ensureContextLayerDataFn("roads", { reason: "toolbar-toggle", renderNow: true })
            .then(renderTransportAppearanceUi)
            .catch(refreshTransportAppearanceUiAfterLayerLoad("roads"));
        }
        renderTransportAppearanceDirty("toggle-road");
      });
      toggleRoad.dataset.bound = "true";
    }

    const bindInput = (element, mutate, reason) => {
      if (!element || element.dataset.bound === "true") return;
      element.addEventListener("input", (event) => {
        mutate(event);
        renderTransportAppearanceDirty(reason);
      });
      element.dataset.bound = "true";
    };
    const bindChange = (element, mutate, reason) => {
      if (!element || element.dataset.bound === "true") return;
      element.addEventListener("change", (event) => {
        mutate(event);
        renderTransportAppearanceDirty(reason);
      });
      element.dataset.bound = "true";
    };

    bindInput(airportVisualStrength, (event) => {
      const value = Number(event.target.value);
      getTransportAppearanceConfig().airport.visualStrength = clamp(Number.isFinite(value) ? value / 100 : 0.62, 0, 1);
    }, "transport-airport-visual-strength");
    bindInput(airportOpacity, (event) => {
      const value = Number(event.target.value);
      getTransportAppearanceConfig().airport.opacity = clamp(Number.isFinite(value) ? value / 100 : 0.82, 0.2, 1);
    }, "transport-airport-opacity");
    bindInput(airportPrimaryColor, (event) => {
      getTransportAppearanceConfig().airport.primaryColor = normalizeOceanFillColor(event.target.value || "#1d4ed8");
    }, "transport-airport-primary-color");
    bindChange(airportLabelsEnabled, (event) => {
      getTransportAppearanceConfig().airport.labelsEnabled = !!event.target.checked;
    }, "transport-airport-labels-enabled");
    bindChange(airportLabelDensity, (event) => {
      getTransportAppearanceConfig().airport.labelDensity = String(event.target.value || "balanced");
    }, "transport-airport-label-density");
    bindChange(airportLabelMode, (event) => {
      getTransportAppearanceConfig().airport.labelMode = String(event.target.value || "adaptive");
    }, "transport-airport-label-mode");
    bindInput(airportLabelSize, (event) => {
      const value = Number(event.target.value);
      const labelSize = clamp(Math.round(Number.isFinite(value) ? value : 9), 7, 16);
      getTransportAppearanceConfig().airport.labelSize = labelSize;
      if (airportLabelSizeValue) airportLabelSizeValue.textContent = `${labelSize}px`;
    }, "transport-airport-label-size");
    bindInput(airportLabelHalo, (event) => {
      const value = Number(event.target.value);
      const labelHalo = clamp(Number.isFinite(value) ? value / 100 : 0.22, 0, 1);
      getTransportAppearanceConfig().airport.labelHalo = labelHalo;
      if (airportLabelHaloValue) airportLabelHaloValue.textContent = formatTransportPercent(labelHalo);
    }, "transport-airport-label-halo");
    bindInput(airportCoverageReach, (event) => {
      const value = Number(event.target.value);
      const config = getTransportAppearanceConfig().airport;
      config.coverageReach = clamp(Number.isFinite(value) ? value / 100 : 0.5, 0, 1);
      if (String(config.scopeLinkMode || "linked") !== "manual") {
        const linked = resolveLinkedTransportOverviewScopeAndThreshold("airport", config.coverageReach);
        config.scope = linked.scope;
        config.importanceThreshold = linked.importanceThreshold;
      }
    }, "transport-airport-coverage-reach");
    bindChange(airportScopeLinked, (event) => {
      const config = getTransportAppearanceConfig().airport;
      config.scopeLinkMode = event.target.checked ? "linked" : "manual";
      if (config.scopeLinkMode === "linked") {
        const linked = resolveLinkedTransportOverviewScopeAndThreshold("airport", config.coverageReach);
        config.scope = linked.scope;
        config.importanceThreshold = linked.importanceThreshold;
      }
    }, "transport-airport-scope-link");
    bindChange(airportScope, (event) => {
      const config = getTransportAppearanceConfig().airport;
      config.scopeLinkMode = "manual";
      config.scope = String(event.target.value || "major_civil");
    }, "transport-airport-scope");
    bindChange(airportImportanceThreshold, (event) => {
      const config = getTransportAppearanceConfig().airport;
      config.scopeLinkMode = "manual";
      config.importanceThreshold = String(event.target.value || "secondary");
    }, "transport-airport-importance-threshold");

    bindInput(portVisualStrength, (event) => {
      const value = Number(event.target.value);
      getTransportAppearanceConfig().port.visualStrength = clamp(Number.isFinite(value) ? value / 100 : 0.58, 0, 1);
    }, "transport-port-visual-strength");
    bindInput(portOpacity, (event) => {
      const value = Number(event.target.value);
      getTransportAppearanceConfig().port.opacity = clamp(Number.isFinite(value) ? value / 100 : 0.78, 0.2, 1);
    }, "transport-port-opacity");
    bindInput(portPrimaryColor, (event) => {
      getTransportAppearanceConfig().port.primaryColor = normalizeOceanFillColor(event.target.value || "#b45309");
    }, "transport-port-primary-color");
    bindChange(portLabelsEnabled, (event) => {
      getTransportAppearanceConfig().port.labelsEnabled = !!event.target.checked;
    }, "transport-port-labels-enabled");
    bindChange(portLabelDensity, (event) => {
      getTransportAppearanceConfig().port.labelDensity = String(event.target.value || "balanced");
    }, "transport-port-label-density");
    bindChange(portLabelMode, (event) => {
      getTransportAppearanceConfig().port.labelMode = String(event.target.value || "adaptive");
    }, "transport-port-label-mode");
    bindInput(portLabelSize, (event) => {
      const value = Number(event.target.value);
      const labelSize = clamp(Math.round(Number.isFinite(value) ? value : 9), 7, 16);
      getTransportAppearanceConfig().port.labelSize = labelSize;
      if (portLabelSizeValue) portLabelSizeValue.textContent = `${labelSize}px`;
    }, "transport-port-label-size");
    bindInput(portLabelHalo, (event) => {
      const value = Number(event.target.value);
      const labelHalo = clamp(Number.isFinite(value) ? value / 100 : 0.22, 0, 1);
      getTransportAppearanceConfig().port.labelHalo = labelHalo;
      if (portLabelHaloValue) portLabelHaloValue.textContent = formatTransportPercent(labelHalo);
    }, "transport-port-label-halo");
    bindInput(portCoverageReach, (event) => {
      const value = Number(event.target.value);
      const config = getTransportAppearanceConfig().port;
      config.coverageReach = clamp(Number.isFinite(value) ? value / 100 : 0.5, 0, 1);
      if (String(config.scopeLinkMode || "linked") !== "manual") {
        const linked = resolveLinkedTransportOverviewScopeAndThreshold("port", config.coverageReach);
        config.scope = linked.scope;
        config.importanceThreshold = linked.importanceThreshold;
      }
    }, "transport-port-coverage-reach");
    bindChange(portScopeLinked, (event) => {
      const config = getTransportAppearanceConfig().port;
      config.scopeLinkMode = event.target.checked ? "linked" : "manual";
      if (config.scopeLinkMode === "linked") {
        const linked = resolveLinkedTransportOverviewScopeAndThreshold("port", config.coverageReach);
        config.scope = linked.scope;
        config.importanceThreshold = linked.importanceThreshold;
      }
    }, "transport-port-scope-link");
    bindChange(portTier, (event) => {
      const config = getTransportAppearanceConfig().port;
      config.scopeLinkMode = "manual";
      config.scope = String(event.target.value || "regional");
    }, "transport-port-scope");
    bindChange(portImportanceThreshold, (event) => {
      const config = getTransportAppearanceConfig().port;
      config.scopeLinkMode = "manual";
      config.importanceThreshold = String(event.target.value || "secondary");
    }, "transport-port-importance-threshold");

    bindInput(railVisualStrength, (event) => {
      const value = Number(event.target.value);
      getTransportAppearanceConfig().rail.visualStrength = clamp(Number.isFinite(value) ? value / 100 : 0.5, 0, 1);
    }, "transport-rail-visual-strength");
    bindInput(railOpacity, (event) => {
      const value = Number(event.target.value);
      getTransportAppearanceConfig().rail.opacity = clamp(Number.isFinite(value) ? value / 100 : 0.72, 0.2, 1);
    }, "transport-rail-opacity");
    bindInput(railPrimaryColor, (event) => {
      getTransportAppearanceConfig().rail.primaryColor = normalizeOceanFillColor(event.target.value || "#0f172a");
    }, "transport-rail-primary-color");
    bindChange(railLabelsEnabled, (event) => {
      getTransportAppearanceConfig().rail.labelsEnabled = !!event.target.checked;
    }, "transport-rail-labels-enabled");
    bindChange(railLabelDensity, (event) => {
      getTransportAppearanceConfig().rail.labelDensity = String(event.target.value || "sparse");
    }, "transport-rail-label-density");
    bindInput(railCoverageReach, (event) => {
      const value = Number(event.target.value);
      const config = getTransportAppearanceConfig().rail;
      config.coverageReach = clamp(Number.isFinite(value) ? value / 100 : 0.2, 0, 1);
      if (String(config.scopeLinkMode || "linked") !== "manual") {
        const linked = resolveLinkedTransportOverviewScopeAndThreshold("rail", config.coverageReach);
        config.scope = linked.scope;
        config.importanceThreshold = linked.importanceThreshold;
      }
    }, "transport-rail-coverage-reach");
    bindChange(railScopeLinked, (event) => {
      const config = getTransportAppearanceConfig().rail;
      config.scopeLinkMode = event.target.checked ? "linked" : "manual";
      if (config.scopeLinkMode === "linked") {
        const linked = resolveLinkedTransportOverviewScopeAndThreshold("rail", config.coverageReach);
        config.scope = linked.scope;
        config.importanceThreshold = linked.importanceThreshold;
      }
    }, "transport-rail-scope-link");
    bindChange(railScope, (event) => {
      const config = getTransportAppearanceConfig().rail;
      config.scopeLinkMode = "manual";
      config.scope = String(event.target.value || "mainline_only");
    }, "transport-rail-scope");
    bindChange(railImportanceThreshold, (event) => {
      const config = getTransportAppearanceConfig().rail;
      config.scopeLinkMode = "manual";
      config.importanceThreshold = String(event.target.value || "primary");
    }, "transport-rail-importance-threshold");

    bindInput(roadVisualStrength, (event) => {
      const value = Number(event.target.value);
      getTransportAppearanceConfig().road.visualStrength = clamp(Number.isFinite(value) ? value / 100 : 0.5, 0, 1);
    }, "transport-road-visual-strength");
    bindInput(roadOpacity, (event) => {
      const value = Number(event.target.value);
      getTransportAppearanceConfig().road.opacity = clamp(Number.isFinite(value) ? value / 100 : 0.72, 0.2, 1);
    }, "transport-road-opacity");
    bindInput(roadPrimaryColor, (event) => {
      getTransportAppearanceConfig().road.primaryColor = normalizeOceanFillColor(event.target.value || "#374151");
    }, "transport-road-primary-color");
    bindChange(roadLabelsEnabled, (event) => {
      getTransportAppearanceConfig().road.labelsEnabled = !!event.target.checked;
    }, "transport-road-labels-enabled");
    bindChange(roadLabelDensity, (event) => {
      getTransportAppearanceConfig().road.labelDensity = String(event.target.value || "sparse");
    }, "transport-road-label-density");
    bindInput(roadCoverageReach, (event) => {
      const value = Number(event.target.value);
      const config = getTransportAppearanceConfig().road;
      config.coverageReach = clamp(Number.isFinite(value) ? value / 100 : 0.2, 0, 1);
      if (String(config.scopeLinkMode || "linked") !== "manual") {
        const linked = resolveLinkedTransportOverviewScopeAndThreshold("road", config.coverageReach);
        config.scope = linked.scope;
        config.importanceThreshold = linked.importanceThreshold;
      }
    }, "transport-road-coverage-reach");
    bindChange(roadScopeLinked, (event) => {
      const config = getTransportAppearanceConfig().road;
      config.scopeLinkMode = event.target.checked ? "linked" : "manual";
      if (config.scopeLinkMode === "linked") {
        const linked = resolveLinkedTransportOverviewScopeAndThreshold("road", config.coverageReach);
        config.scope = linked.scope;
        config.importanceThreshold = linked.importanceThreshold;
      }
    }, "transport-road-scope-link");
    bindChange(roadScope, (event) => {
      const config = getTransportAppearanceConfig().road;
      config.scopeLinkMode = "manual";
      config.scope = String(event.target.value || "motorway_only");
    }, "transport-road-scope");
    bindChange(roadImportanceThreshold, (event) => {
      const config = getTransportAppearanceConfig().road;
      config.scopeLinkMode = "manual";
      config.importanceThreshold = String(event.target.value || "primary");
    }, "transport-road-importance-threshold");

  };

  return {
    bindEvents,
    renderTransportAppearanceUi,
  };
}
