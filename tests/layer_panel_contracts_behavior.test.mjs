import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CONTRACT_GROUPS,
  getLayerPanelStatusAnchorMap,
  getLayerPanelUnsupportedReason,
  getLayerStatusAnchorById,
  listBaseLayerPanelContracts,
  listLayerPanelContracts,
  listTransportLayerPanelContracts,
  WORKBENCH_ONLY_REASON,
} from "../js/ui/toolbar/layer_panel_contracts.js";
import {
  supportsTransportCapabilityOverview,
  getTransportOverviewVisibilityField,
  listTransportOverviewCapabilityFamilyIds,
} from "../js/core/transport_capability_registry.js";
import {
  createDefaultContentState,
} from "../js/core/state/content_state.js";
import {
  createDefaultStyleConfig,
  createDefaultUiState,
} from "../js/core/state/ui_state.js";
import {
  buildLayerStatusDiagnostics,
} from "../js/ui/toolbar/layer_status_diagnostics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CONTRACT_SOURCE = path.join(REPO_ROOT, "js", "ui", "toolbar", "layer_panel_contracts.js");

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

test("layer panel contracts cover the visible foundation layers and status anchors", () => {
  const contracts = listLayerPanelContracts();
  const ids = new Set(contracts.map((contract) => contract.id));
  const expectedLayerIds = [
    "borders",
    "physical",
    "urban",
    "city-points",
    "rivers",
    "ocean",
    "bathymetry",
    "day-night",
    "texture",
    "transport",
  ];

  expectedLayerIds.forEach((id) => assert.equal(ids.has(id), true, `${id} contract missing`));
  const anchorMap = getLayerPanelStatusAnchorMap();
  expectedLayerIds.forEach((id) => {
    assert.equal(typeof anchorMap[id], "string", `${id} anchor missing`);
    assert.equal(getLayerStatusAnchorById(id), anchorMap[id]);
  });
});

test("contract ids and groups stay stable and unique", () => {
  const contracts = listLayerPanelContracts();
  const ids = contracts.map((contract) => contract.id);
  assert.equal(new Set(ids).size, ids.length);

  contracts.forEach((contract) => {
    assert.equal(CONTRACT_GROUPS.includes(contract.group), true, `${contract.id} has invalid group`);
    assert.equal(typeof contract.stateOwner, "string", `${contract.id} missing state owner`);
    assert.equal(typeof contract.statusProviderId, "string", `${contract.id} missing status provider`);
  });
});

test("transport contract support status is derived from the transport capability registry", () => {
  const overviewFamilies = new Set(listTransportOverviewCapabilityFamilyIds());
  const transportContracts = listTransportLayerPanelContracts();
  const contractByFamily = new Map(transportContracts.map((contract) => [contract.familyId, contract]));

  ["airport", "port", "rail", "road"].forEach((familyId) => {
    const contract = contractByFamily.get(familyId);
    assert.ok(contract, `${familyId} contract missing`);
    assert.equal(contract.supportsMainOverview, supportsTransportCapabilityOverview(familyId));
    assert.equal(overviewFamilies.has(familyId), true);
    assert.equal(contract.defaultVisibilityField, getTransportOverviewVisibilityField(familyId));
    assert.equal(contract.group, "transport");
  });

  ["mineral_resources", "energy_facilities", "industrial_zones", "logistics_hubs"].forEach((familyId) => {
    const contract = contractByFamily.get(familyId);
    assert.ok(contract, `${familyId} contract missing`);
    assert.equal(contract.supportsMainOverview, false);
    assert.equal(contract.group, "workbench");
    assert.equal(getLayerPanelUnsupportedReason(contract, { translate: (key) => key }), WORKBENCH_ONLY_REASON);
  });
});

test("layer panel contract module stays read-only and renderer-free", () => {
  const source = fs.readFileSync(CONTRACT_SOURCE, "utf8");

  assert.equal(/\bstate\.[A-Za-z0-9_$]+\s*=/.test(source), false);
  assert.equal(/\bruntimeState\b/.test(source), false);
  assert.equal(/\bmarkDirty\b/.test(source), false);
  assert.equal(/\brequestRender\b/.test(source), false);
  assert.equal(/\bdocument\b|\bwindow\b/.test(source), false);
  assert.equal(source.includes("../core/map_renderer"), false);
});

test("diagnostics continue to expose clean summaries through contract-backed definitions", () => {
  const diagnostics = buildLayerStatusDiagnostics(createState({
    showTransport: true,
    showAirports: false,
    showPorts: false,
    showRail: false,
    showRoad: false,
  }), { translate: (key) => key });
  const diagnosticsById = new Map(diagnostics.map((diagnostic) => [diagnostic.id, diagnostic]));

  listBaseLayerPanelContracts().forEach((contract) => {
    assert.equal(diagnosticsById.has(contract.id), true, `${contract.id} diagnostic missing`);
  });
  assert.equal(diagnosticsById.get("bathymetry").summary, "Experimental Bathymetry disabled");
  assert.equal(diagnosticsById.get("transport").summary, "Enabled · no overview family selected");
  assert.equal(diagnosticsById.get("transport-mineral_resources").summary, WORKBENCH_ONLY_REASON);

  diagnostics.forEach((diagnostic) => {
    assert.equal(/\b(?:undefined|null|NaN)\b/.test(String(diagnostic.summary)), false, diagnostic.id);
  });
});
