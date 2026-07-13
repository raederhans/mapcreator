import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  RENDER_PASS_FAMILY_IDS,
  RENDER_PASS_FAMILY_INVENTORY,
  RENDER_PASS_IMPLEMENTATION_STATUS_IDS,
  RENDER_PASS_PERF_SENSITIVITY_IDS,
  RENDER_PASS_PLANNED_PHASE_IDS,
  RENDER_PASS_RISK_TIER_IDS,
  RENDER_PASS_STATE_READ_CLASS_IDS,
  RENDER_PASS_STATE_WRITE_CLASS_IDS,
  RENDER_PASS_SURFACE_IDS,
} from "../tools/renderer_pass_family_inventory.mjs";

const REPO_ROOT = process.cwd();
const INVENTORY_PATH = "tools/renderer_pass_family_inventory.mjs";
const RECORD_KEYS = [
  "passName", "familyId", "entryFunction", "implementationStatus", "currentOwnerPath",
  "plannedPhase", "riskTier", "stateReadClass", "stateWriteClass", "canvasOrSvg",
  "existingDependencyOwners", "browserLanes", "perfSensitivity", "notes",
];
const ARRAY_FIELDS = ["stateReadClass", "stateWriteClass", "existingDependencyOwners", "browserLanes"];
const ENUMS = [
  RENDER_PASS_FAMILY_IDS,
  RENDER_PASS_IMPLEMENTATION_STATUS_IDS,
  RENDER_PASS_PLANNED_PHASE_IDS,
  RENDER_PASS_RISK_TIER_IDS,
  RENDER_PASS_STATE_READ_CLASS_IDS,
  RENDER_PASS_STATE_WRITE_CLASS_IDS,
  RENDER_PASS_SURFACE_IDS,
  RENDER_PASS_PERF_SENSITIVITY_IDS,
];
const EXPECTED_INVENTORY = [
  {"passName":"background","familyId":"foundation","entryFunction":"drawBackgroundPass","implementationStatus":"inline","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"hold","riskTier":"high","stateReadClass":["viewport","appearance","map-data","render-cache"],"stateWriteClass":["pass-surface","owner-cache"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/renderer/ocean_render_owner.js","js/core/renderer/intensity_field_mask_owner.js"],"browserLanes":["test:e2e:water-rendering"],"perfSensitivity":"high","notes":"foundational background ownership held for later review"},
  {"passName":"physicalBase","familyId":"foundation","entryFunction":"drawPhysicalBasePass","implementationStatus":"delegated-existing","currentOwnerPath":"js/core/renderer/physical_layer_render_owner.js","plannedPhase":"existing-delegated","riskTier":"medium","stateReadClass":["viewport","appearance","scenario","map-data","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","runtime-state","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":[],"browserLanes":["test:e2e:physical-layer-runtime-contract"],"perfSensitivity":"high","notes":"existing physical owner remains authoritative"},
  {"passName":"political","familyId":"political","entryFunction":"drawPoliticalPass","implementationStatus":"inline","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"P3.3a","riskTier":"high","stateReadClass":["viewport","appearance","scenario","map-data","interaction","render-cache","diagnostics"],"stateWriteClass":["pass-surface","owner-cache","runtime-state","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/renderer/color_resolution_strategy.js","js/core/renderer/political_collection_owner.js","js/core/renderer/spatial_index_runtime_owner.js","js/core/renderer/visible_frame_diagnostics_owner.js"],"browserLanes":["test:e2e:scenario-resilience","test:e2e:tno-contracts"],"perfSensitivity":"high","notes":"P3.3a preflight scope only"},
  {"passName":"hgoPreview","familyId":"hgo-preview","entryFunction":"drawHgoPreviewPass","implementationStatus":"delegated-existing","currentOwnerPath":"js/core/map_renderer/hgo_runtime_preview_render_owner.js","plannedPhase":"existing-delegated","riskTier":"medium","stateReadClass":["viewport","scenario","map-data","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/map_renderer/hgo_runtime_preview_frame_commit.js"],"browserLanes":[],"perfSensitivity":"high","notes":"dedicated browser lane gap; static and contract evidence only"},
  {"passName":"contextBase","familyId":"context","entryFunction":"drawContextBasePass","implementationStatus":"inline","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"P3.2","riskTier":"high","stateReadClass":["viewport","appearance","scenario","map-data","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/renderer/physical_layer_render_owner.js","js/core/renderer/river_layer_render_owner.js"],"browserLanes":["test:e2e:physical-layer-runtime-contract","test:e2e:water-rendering"],"perfSensitivity":"high","notes":"P3.2 context-base extraction candidate"},
  {"passName":"contextScenario","familyId":"context","entryFunction":"drawContextScenarioPass","implementationStatus":"inline","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"P3.2","riskTier":"high","stateReadClass":["viewport","appearance","scenario","map-data","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","runtime-state","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/renderer/scenario_water_cache_policy_owner.js","js/core/renderer/scenario_relief_overlay_render_owner.js"],"browserLanes":["test:e2e:scenario-resilience","test:e2e:water-rendering","test:e2e:tno-contracts"],"perfSensitivity":"high","notes":"P3.2 scenario overlay extraction candidate"},
  {"passName":"effects","familyId":"visual-effects","entryFunction":"drawEffectsPass","implementationStatus":"inline","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"P3.1","riskTier":"medium","stateReadClass":["viewport","appearance","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","runtime-state"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/map_renderer/render_request_boundary_owner.js"],"browserLanes":["test:e2e:layer:regression"],"perfSensitivity":"high","notes":"P3.1 full-sphere paper effect with async texture rerender boundary"},
  {"passName":"lineEffects","familyId":"visual-effects","entryFunction":"drawLineEffectsPass","implementationStatus":"inline","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"P3.1","riskTier":"medium","stateReadClass":["viewport","appearance","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","runtime-state"],"canvasOrSvg":"canvas","existingDependencyOwners":[],"browserLanes":["test:e2e:layer:regression"],"perfSensitivity":"medium","notes":"P3.1 graticule and draft-grid lines with shared texture config normalization"},
  {"passName":"dayNight","familyId":"visual-effects","entryFunction":"drawDayNightPass","implementationStatus":"inline","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"P3.1","riskTier":"medium","stateReadClass":["viewport","appearance","map-data","interaction","render-cache","clock"],"stateWriteClass":["pass-surface","owner-cache","runtime-state","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/renderer/city_lights_render_owner.js"],"browserLanes":["test:e2e:city-rendering"],"perfSensitivity":"high","notes":"P3.1 clock-coupled shadow and lights with shared texture config normalization"},
  {"passName":"borders","familyId":"borders","entryFunction":"drawBordersPass","implementationStatus":"thin-wrapper","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"hold","riskTier":"high","stateReadClass":["viewport","appearance","scenario","map-data","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/renderer/border_draw_owner.js"],"browserLanes":["test:e2e:layer:regression","test:e2e:tno-contracts"],"perfSensitivity":"high","notes":"HGO and data guards remain in the wrapper; main border draw delegates to the existing owner"},
  {"passName":"contextMarkers","familyId":"context","entryFunction":"drawContextMarkersPass","implementationStatus":"inline","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"P3.2","riskTier":"high","stateReadClass":["viewport","appearance","scenario","map-data","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/renderer/transport_overview_render_owner.js","js/core/renderer/city_points_render_owner.js","js/core/renderer/urban_city_policy.js"],"browserLanes":["test:e2e:city-rendering","test:e2e:scenario-resilience","test:e2e:tno-contracts"],"perfSensitivity":"high","notes":"P3.2 transport, strategic and city marker orchestration"},
  {"passName":"textureLabels","familyId":"visual-effects","entryFunction":"drawTextureLabelEffectsPass","implementationStatus":"inline","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"P3.1","riskTier":"medium","stateReadClass":["viewport","appearance","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","runtime-state","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":[],"browserLanes":["test:e2e:layer:regression"],"perfSensitivity":"low","notes":"P3.1 graticule label effect with shared texture config normalization"},
  {"passName":"labels","familyId":"labels","entryFunction":"drawLabelsPass","implementationStatus":"thin-wrapper","currentOwnerPath":"js/core/map_renderer.js","plannedPhase":"future-review","riskTier":"medium","stateReadClass":["viewport","appearance","scenario","map-data","interaction","render-cache"],"stateWriteClass":["pass-surface","owner-cache","diagnostics"],"canvasOrSvg":"canvas","existingDependencyOwners":["js/core/renderer/city_points_render_owner.js","js/core/renderer/urban_city_policy.js"],"browserLanes":["test:e2e:city-rendering"],"perfSensitivity":"medium","notes":"blank labels stay inline; city labels delegate; future review"}
];

function readText(...parts) {
  return fs.readFileSync(path.join(REPO_ROOT, ...parts), "utf8");
}

function extractIdleDefinitions(source) {
  return [...source.matchAll(/\{\s*passName:\s*"([^"]+)",\s*drawKey:\s*"([^"]+)"\s*\}/g)]
    .map((match) => ({ passName: match[1], drawKey: match[2] }));
}

function extractSecondaryPassNames(source) {
  const block = source.match(/export const RENDER_PASS_NAMES = \[([\s\S]*?)\];/);
  assert.ok(block, "RENDER_PASS_NAMES literal should exist");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function assertCanonicalTokens(values, canonical, label) {
  assert.equal(new Set(values).size, values.length, `${label} should be duplicate-free`);
  const positions = values.map((value) => canonical.indexOf(value));
  assert.equal(positions.every((position) => position >= 0), true, `${label} should use known tokens`);
  assert.deepEqual([...positions].sort((left, right) => left - right), positions, `${label} should use canonical order`);
}

test("inventory shape, enums, records, and nested arrays are frozen", () => {
  assert.equal(RENDER_PASS_FAMILY_INVENTORY.length, 13);
  assert.equal(Object.isFrozen(RENDER_PASS_FAMILY_INVENTORY), true);
  for (const values of ENUMS) assert.equal(Object.isFrozen(values), true);

  for (const record of RENDER_PASS_FAMILY_INVENTORY) {
    assert.equal(Object.isFrozen(record), true, `${record.passName} record should be frozen`);
    assert.deepEqual(Object.keys(record), RECORD_KEYS, `${record.passName} should use the exact record shape`);
    for (const key of RECORD_KEYS.filter((candidate) => !ARRAY_FIELDS.includes(candidate))) {
      assert.equal(typeof record[key], "string", `${record.passName}.${key} should be a string`);
    }
    for (const key of ARRAY_FIELDS) {
      assert.equal(Array.isArray(record[key]), true, `${record.passName}.${key} should be an array`);
      assert.equal(Object.isFrozen(record[key]), true, `${record.passName}.${key} should be frozen`);
      assert.equal(record[key].every((value) => typeof value === "string"), true);
    }
    assertCanonicalTokens(record.stateReadClass, RENDER_PASS_STATE_READ_CLASS_IDS, `${record.passName}.stateReadClass`);
    assertCanonicalTokens(record.stateWriteClass, RENDER_PASS_STATE_WRITE_CLASS_IDS, `${record.passName}.stateWriteClass`);
  }
});

test("inventory exactly matches the canonical runtime pass universe and order", () => {
  const idleDefinitions = extractIdleDefinitions(readText("js", "core", "renderer", "render_pipeline_catalog.js"));
  const secondaryNames = extractSecondaryPassNames(readText("js", "core", "map_renderer", "render_pass_catalog.js"));
  const inventoryNames = RENDER_PASS_FAMILY_INVENTORY.map((record) => record.passName);
  const idleNames = idleDefinitions.map((definition) => definition.passName);

  assert.equal(new Set(inventoryNames).size, 13);
  assert.equal(new Set(idleNames).size, 13);
  assert.equal(new Set(secondaryNames).size, 13);
  assert.deepEqual(inventoryNames, idleNames);
  assert.deepEqual([...inventoryNames].sort(), [...secondaryNames].sort());
  assert.notDeepEqual(secondaryNames, idleNames, "the secondary catalog keeps its known local order difference");
  for (const [index, record] of RENDER_PASS_FAMILY_INVENTORY.entries()) {
    assert.equal(record.entryFunction, idleDefinitions[index].drawKey, `${record.passName} entry should match its draw key`);
  }
});

test("family and planned-phase membership stays binding", () => {
  const namesFor = (key, value) => RENDER_PASS_FAMILY_INVENTORY.filter((record) => record[key] === value).map((record) => record.passName);
  assert.deepEqual(namesFor("familyId", "visual-effects"), ["effects", "lineEffects", "dayNight", "textureLabels"]);
  assert.deepEqual(namesFor("plannedPhase", "P3.1"), ["effects", "lineEffects", "dayNight", "textureLabels"]);
  assert.deepEqual(namesFor("familyId", "context"), ["contextBase", "contextScenario", "contextMarkers"]);
  assert.deepEqual(namesFor("plannedPhase", "P3.2"), ["contextBase", "contextScenario", "contextMarkers"]);
  assert.deepEqual(namesFor("plannedPhase", "P3.3a"), ["political"]);
  assert.deepEqual(namesFor("plannedPhase", "hold"), ["background", "borders"]);
  assert.deepEqual(namesFor("plannedPhase", "existing-delegated"), ["physicalBase", "hgoPreview"]);
  assert.deepEqual(namesFor("plannedPhase", "future-review"), ["labels"]);
  assert.deepEqual(namesFor("implementationStatus", "thin-wrapper"), ["borders", "labels"]);
  assert.deepEqual(namesFor("implementationStatus", "owned-p3"), []);
  assert.deepEqual(namesFor("implementationStatus", "hold"), []);
});

test("all 13 records match the source-grounded P3.0 ontology", () => {
  assert.deepEqual(RENDER_PASS_FAMILY_INVENTORY, EXPECTED_INVENTORY);
  const mapRendererSource = readText("js", "core", "map_renderer.js");
  for (const record of RENDER_PASS_FAMILY_INVENTORY) {
    assert.match(mapRendererSource, new RegExp(`function\\s+${record.entryFunction}\\s*\\(`), `${record.passName} entry should exist`);
    assert.equal(fs.existsSync(path.join(REPO_ROOT, record.currentOwnerPath)), true, `${record.passName} owner should exist`);
    assert.equal(record.stateWriteClass.includes("pass-surface"), true);
    assert.equal(record.canvasOrSvg, "canvas");
    for (const dependencyPath of record.existingDependencyOwners) {
      assert.equal(dependencyPath.includes("\\"), false, `${record.passName} dependencies should use POSIX paths`);
      assert.equal(fs.existsSync(path.join(REPO_ROOT, dependencyPath)), true, `${dependencyPath} should exist`);
    }
  }
});

test("browser lanes resolve to package scripts and preserve the known HGO gap", () => {
  const packageScripts = JSON.parse(readText("package.json")).scripts;
  for (const record of RENDER_PASS_FAMILY_INVENTORY) {
    assert.equal(new Set(record.browserLanes).size, record.browserLanes.length);
    for (const lane of record.browserLanes) assert.equal(typeof packageScripts[lane], "string", `${lane} should be a package script`);
  }
  const hgo = RENDER_PASS_FAMILY_INVENTORY.find((record) => record.passName === "hgoPreview");
  assert.deepEqual(hgo.browserLanes, []);
  assert.match(hgo.notes, /dedicated browser lane gap/);
  assert.deepEqual(
    RENDER_PASS_FAMILY_INVENTORY.find((record) => record.passName === "textureLabels").browserLanes,
    ["test:e2e:layer:regression"],
  );
});

test("inventory remains data-only and isolated from the product source graph", () => {
  const inventorySource = readText(...INVENTORY_PATH.split("/"));
  const testSource = readText("tests", "renderer_pass_family_inventory_behavior.test.mjs");
  assert.doesNotMatch(inventorySource, /^\s*import\s/m);
  assert.doesNotMatch(inventorySource, /\bimport\s*\(/);

  const imports = [...testSource.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(imports.every((specifier) => specifier.startsWith("node:") || specifier === "../tools/renderer_pass_family_inventory.mjs"), true);

  let productReferences = "";
  try {
    productReferences = execFileSync("git", ["grep", "-n", "renderer_pass_family_inventory", "--", "js", "dist"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    assert.equal(error.status, 1, error.stderr?.toString() || "git grep should only exit 1 for zero matches");
  }
  assert.equal(productReferences, "");
});