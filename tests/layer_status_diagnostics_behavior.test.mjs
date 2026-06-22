import assert from "node:assert/strict";
import test from "node:test";

import {
  THEMATIC_REAL_SOURCE_DERIVED_METADATA_REASON,
  THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON,
} from "../js/core/thematic_layer_catalog.js";
import {
  createDefaultContentState,
} from "../js/core/state/content_state.js";
import {
  createDefaultStyleConfig,
  createDefaultUiState,
} from "../js/core/state/ui_state.js";
import {
  buildBathymetryDiagnostic,
  buildLayerStatusDiagnostics,
  buildThematicCatalogDiagnostic,
  buildTransportFamilyDiagnostics,
  buildTransportMasterDiagnostic,
  sanitizeLayerStatusText,
} from "../js/ui/toolbar/layer_status_diagnostics.js";

function createState(overrides = {}) {
  return {
    ...createDefaultContentState(),
    ...createDefaultUiState(),
    styleConfig: createDefaultStyleConfig(),
    renderPerfMetrics: {},
    zoomTransform: { k: 4 },
    ...overrides,
  };
}

test("layer diagnostics report loaded and visible counts from existing metrics", () => {
  const state = createState({
    urbanData: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {} },
        { type: "Feature", properties: {} },
        { type: "Feature", properties: {} },
      ],
    },
    renderPerfMetrics: {
      contextBreakdown: {
        drawUrbanLayer: {
          featureCount: 3,
          visibleFeatureCount: 2,
        },
      },
    },
  });

  const diagnostics = buildLayerStatusDiagnostics(state, { translate: (key) => key });
  const urban = diagnostics.find((entry) => entry.id === "urban");

  assert.equal(urban.summary, "Visible · 2 visible · 3 loaded");
  assert.equal(urban.severity, "active");
});

test("transport master diagnostic exposes enabled state with zero selected families", () => {
  const state = createState({
    showTransport: true,
    showAirports: false,
    showPorts: false,
    showRail: false,
    showRoad: false,
  });

  const diagnostic = buildTransportMasterDiagnostic(state, { translate: (key) => key });

  assert.equal(diagnostic.summary, "Enabled · no overview family selected");
  assert.equal(diagnostic.severity, "warning");
  assert.deepEqual(diagnostic.selectedFamilies, []);
});

test("transport family diagnostics expose workbench-only disabled reasons", () => {
  const diagnostics = buildTransportFamilyDiagnostics(createState(), { translate: (key) => key });
  const mineral = diagnostics.find((entry) => entry.familyId === "mineral_resources");
  const energy = diagnostics.find((entry) => entry.familyId === "energy_facilities");
  const industrial = diagnostics.find((entry) => entry.familyId === "industrial_zones");
  const logistics = diagnostics.find((entry) => entry.familyId === "logistics_hubs");

  assert.equal(mineral.supported, false);
  assert.equal(mineral.disabledReason, "Available in Transport Workbench only");
  assert.equal(energy.summary, "Available in Transport Workbench only");
  assert.equal(industrial.summary, "Available in Transport Workbench only");
  assert.equal(logistics.severity, "muted");
});

test("bathymetry diagnostic explains disabled and pending data states", () => {
  const disabled = buildBathymetryDiagnostic(createState(), { translate: (key) => key });
  assert.equal(disabled.summary, "Experimental Bathymetry disabled");
  assert.equal(disabled.severity, "muted");

  const pending = buildBathymetryDiagnostic(createState({
    styleConfig: {
      ...createDefaultStyleConfig(),
      ocean: {
        ...createDefaultStyleConfig().ocean,
        experimentalAdvancedStyles: true,
        preset: "bathymetry_soft",
      },
    },
  }), { translate: (key) => key });
  assert.equal(pending.summary, "Bathymetry data pending for selected style");
  assert.equal(pending.severity, "warning");
});

test("thematic catalog diagnostic reports read-only fixture preview state", () => {
  const layers = [
    { fixtureOnly: true, hiddenByDefault: true, manifestLoaded: true, realSourceStatus: THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON },
    { fixtureOnly: true, hiddenByDefault: true, manifestLoaded: true, realSourceStatus: THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON },
    { fixtureOnly: true, hiddenByDefault: true, manifestLoaded: true, realSourceStatus: THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON },
    { fixtureOnly: false, hiddenByDefault: true, manifestLoaded: true, realSourceStatus: THEMATIC_REAL_SOURCE_DERIVED_METADATA_REASON },
  ];
  const preview = {
    status: "ready",
    layerCount: layers.length,
    loadedManifestCount: layers.length,
    layers,
  };
  const diagnostic = buildThematicCatalogDiagnostic({ thematicCatalogPreview: preview }, { translate: (key) => key });

  assert.equal(diagnostic.id, "thematic");
  assert.equal(diagnostic.enabled, false);
  assert.equal(diagnostic.loadedCount, layers.length);
  assert.equal(diagnostic.visibleCount, 0);
  assert.equal(diagnostic.severity, "muted");
  assert.equal(diagnostic.summary.includes("Preview metadata available"), true);
  assert.equal(diagnostic.summary.includes("Runtime rendering disabled"), true);
  assert.equal(diagnostic.summary.includes(THEMATIC_REAL_SOURCE_NOT_INGESTED_REASON), true);
  assert.equal(diagnostic.summary.includes(THEMATIC_REAL_SOURCE_DERIVED_METADATA_REASON), true);

  const diagnostics = buildLayerStatusDiagnostics(createState(), {
    translate: (key) => key,
    thematicCatalogPreview: preview,
  });
  assert.ok(diagnostics.find((entry) => entry.id === "thematic"));
});

test("layer diagnostics keep text clean and do not mutate default state", () => {
  const state = createState();
  const before = JSON.stringify(state.styleConfig);
  const diagnostics = buildLayerStatusDiagnostics(state, { translate: (key) => key });

  assert.equal(JSON.stringify(state.styleConfig), before);
  diagnostics.forEach((entry) => {
    assert.equal(String(entry.summary).includes("undefined"), false);
    assert.equal(String(entry.summary).includes("null"), false);
    assert.equal(String(entry.summary).includes("NaN"), false);
  });
  assert.equal(sanitizeLayerStatusText("Visible · undefined · NaN"), "Visible");
});
