import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const assetUrl = new URL("../js/core/city_lights_historical_1930_asset.js", import.meta.url);
const entriesUrl = new URL("../data/city_lights/historical_1930_entries.json", import.meta.url);
const modernAssetUrl = new URL("../js/core/city_lights_modern_asset.js", import.meta.url);
const modernDescriptorUrl = new URL("../data/city_lights/modern_source_descriptor.json", import.meta.url);
const fixtureDescriptorUrl = new URL("./fixtures/city_lights/modern_source_fixture_descriptor.json", import.meta.url);
const fixtureSourceUrl = new URL("./fixtures/city_lights/modern_source_fixture.pgm", import.meta.url);
const manifestUrl = new URL("../data/manifest.json", import.meta.url);
const catalogUrl = new URL("../data/CATALOG.json", import.meta.url);
const generatorUrl = new URL("../tools/build_city_lights_modern_asset.py", import.meta.url);
const assetSource = await readFile(assetUrl, "utf8");
const entriesPayload = JSON.parse(await readFile(entriesUrl, "utf8"));
const modernDescriptor = JSON.parse(await readFile(modernDescriptorUrl, "utf8"));
const fixtureDescriptor = JSON.parse(await readFile(fixtureDescriptorUrl, "utf8"));
const dataManifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const dataCatalog = JSON.parse(await readFile(catalogUrl, "utf8"));
const assetModule = await import(assetUrl.href);
const {
  HISTORICAL_1930_CITY_LIGHTS_ENTRIES,
  HISTORICAL_1930_CITY_LIGHTS_SOURCE,
  HISTORICAL_1930_CITY_LIGHTS_STATS,
  loadHistorical1930CityLightsEntries,
} = assetModule;

function findCity(nameAscii, countryCode) {
  return HISTORICAL_1930_CITY_LIGHTS_ENTRIES.find((entry) => (
    entry.nameAscii === nameAscii && entry.countryCode === countryCode
  ));
}

function runModernGenerator(args) {
  const command = process.platform === "win32" ? "py" : "python3";
  const prefixArgs = process.platform === "win32" ? ["-3"] : [];
  return spawnSync(command, [...prefixArgs, fileURLToPath(generatorUrl), ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
}

test("city lights ownership separates source descriptor, generated data, runtime module, and fixtures", async () => {
  assert.equal(modernDescriptor.ownership_class, "production_source_descriptor");
  assert.equal(modernDescriptor.product.version, "2016");
  assert.match(modernDescriptor.product.known_url, /BlackMarble_2016_3km_gray\.jpg$/);
  assert.equal(modernDescriptor.provenance.license_status, "requires_source_authority_confirmation");
  assert.deepEqual(modernDescriptor.grid, {
    width: 720,
    height: 360,
    base_threshold: 2,
    corridor_threshold: 14,
  });
  assert.equal(modernDescriptor.input_identity.status, "unavailable");
  assert.equal(modernDescriptor.input_identity.attestation, "not_attested");
  assert.equal(modernDescriptor.input_identity.sha256, null);
  assert.equal(modernDescriptor.authority.status, "source_authority_required");

  const descriptorOutput = dataManifest.outputs["city_lights/modern_source_descriptor.json"];
  const runtimeOutput = dataManifest.outputs["js/core/city_lights_modern_asset.js"];
  assert.equal(descriptorOutput.artifact_class, "source_descriptor");
  assert.equal(descriptorOutput.owner, "source_authority.city_lights_modern_descriptor");
  assert.equal(runtimeOutput.artifact_class, "publish");
  assert.equal(runtimeOutput.owner, "init_map_data.city_lights_assets");
  const generatedEntries = dataCatalog.entries.find((entry) => (
    entry.url === "data/city_lights/historical_1930_entries.json"
  ));
  const runtimeModule = dataCatalog.entries.find((entry) => (
    entry.url === "js/core/city_lights_modern_asset.js"
  ));
  assert.equal(generatedEntries.role, "city_lights_entries");
  assert.equal(
    generatedEntries.owner,
    "runtime_asset_registry.assets.city_lights:historical_1930:entries",
  );
  assert.equal(runtimeModule.role, "modern_city_lights_asset");
  assert.equal(runtimeModule.owner, "init_map_data.city_lights_assets");
  assert.equal(fixtureDescriptor.ownership_class, "test_fixture_descriptor");
  assert.equal(JSON.stringify(dataManifest).includes("tests/fixtures/city_lights"), false);
  assert.equal(JSON.stringify(dataCatalog).includes("tests/fixtures/city_lights"), false);

  const runtimeBytes = await readFile(modernAssetUrl);
  assert.equal(
    createHash("sha256").update(runtimeBytes).digest("hex"),
    "e310035f7fbd8e327ea9b5558a8fab6edb92aa2a312b7532a65319d2d5d6ec1d",
  );
});

test("modern city lights fixture rebuild is offline, attested, and byte-identical", async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), "city-lights-generator-"));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  const firstOutput = join(tempRoot, "first.js");
  const secondOutput = join(tempRoot, "second.js");
  const sharedArgs = [
    "--source-descriptor", fileURLToPath(fixtureDescriptorUrl),
    "--source-file", fileURLToPath(fixtureSourceUrl),
    "--require-attested-input",
  ];
  const first = runModernGenerator([...sharedArgs, "--output", firstOutput]);
  const second = runModernGenerator([...sharedArgs, "--output", secondOutput]);
  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(second.status, 0, second.stderr || second.stdout);
  const firstBytes = await readFile(firstOutput);
  const secondBytes = await readFile(secondOutput);
  assert.deepEqual(firstBytes, secondBytes);
  const generatedSource = firstBytes.toString("utf8");
  assert.match(generatedSource, /descriptorId: 'repository_city_lights_fixture_v1'/);
  assert.match(generatedSource, /inputIdentityStatus: 'available'/);
  assert.match(generatedSource, /authenticatedRebuild: true/);
  assert.equal(generatedSource.includes(fileURLToPath(fixtureSourceUrl)), false);
});

test("modern production descriptor fails closed for authenticated rebuild claims", () => {
  const result = runModernGenerator([
    "--source-descriptor", fileURLToPath(modernDescriptorUrl),
    "--source-file", fileURLToPath(fixtureSourceUrl),
    "--require-attested-input",
    "--output", join(tmpdir(), "city-lights-production-unattested.js"),
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /input identity is not attested/);
});

test("historical 1930 city lights asset exposes calibrated exports", () => {
  assert.equal(HISTORICAL_1930_CITY_LIGHTS_SOURCE.entriesKey, "city_lights:historical_1930:entries");
  assert.deepEqual(HISTORICAL_1930_CITY_LIGHTS_SOURCE.entriesRefParts, ["data", "city_lights/historical_1930_entries.json"]);
  assert.equal(typeof HISTORICAL_1930_CITY_LIGHTS_STATS, "object");
  assert.equal(HISTORICAL_1930_CITY_LIGHTS_STATS.calibrationVersion, "balanced-2026-04");
  assert.ok(Array.isArray(HISTORICAL_1930_CITY_LIGHTS_ENTRIES));
  assert.equal(typeof loadHistorical1930CityLightsEntries, "function");
  assert.ok(Array.isArray(entriesPayload.entries));
  assert.ok(HISTORICAL_1930_CITY_LIGHTS_ENTRIES.length >= 1450);
  assert.ok(HISTORICAL_1930_CITY_LIGHTS_ENTRIES.length <= 1800);
  assert.equal(entriesPayload.entries.length, 1580);
  assert.equal(HISTORICAL_1930_CITY_LIGHTS_STATS.entryCount, HISTORICAL_1930_CITY_LIGHTS_ENTRIES.length);
  assert.deepEqual(entriesPayload.stats, HISTORICAL_1930_CITY_LIGHTS_STATS);
  assert.ok(!assetSource.includes("population: 35676000"));
  assert.ok(assetSource.includes("historical_1930_entries.json"));
});

test("historical 1930 city light entries keep legal render fields", () => {
  for (const entry of HISTORICAL_1930_CITY_LIGHTS_ENTRIES) {
    assert.equal(typeof entry.nameAscii, "string");
    assert.equal(typeof entry.countryCode, "string");
    assert.ok(Number.isFinite(entry.lon));
    assert.ok(entry.lon >= -180 && entry.lon <= 180);
    assert.ok(Number.isFinite(entry.lat));
    assert.ok(entry.lat >= -89.999 && entry.lat <= 89.999);
    assert.ok(Number.isFinite(entry.weight));
    assert.ok(entry.weight >= 0.18 && entry.weight <= 1.0);
    assert.equal(typeof entry.capitalKind, "string");
    assert.ok(Number.isFinite(entry.population));
  }
});

test("historical 1930 region calibration keeps target anchor cities visible", () => {
  const anchors = [
    ["London", "GB", 0.95],
    ["Paris", "FR", 0.95],
    ["Berlin", "DE", 0.9],
    ["Milan", "IT", 0.8],
    ["Rome", "IT", 0.95],
    ["Tokyo", "JP", 0.95],
    ["Osaka", "JP", 0.9],
    ["New York", "US", 0.76],
    ["Washington", "US", 0.86],
    ["Beijing", "CN", 0.95],
    ["Delhi", "IN", 0.84],
    ["Shanghai", "CN", 0.84],
  ];
  for (const [nameAscii, countryCode, minimumWeight] of anchors) {
    const entry = findCity(nameAscii, countryCode);
    assert.ok(entry, `${nameAscii} ${countryCode} should be present`);
    assert.ok(
      entry.weight >= minimumWeight,
      `${nameAscii} ${countryCode} weight ${entry.weight} should be >= ${minimumWeight}`
    );
  }
});

test("historical 1930 calibration caps oversized non-capital Asian hubs", () => {
  for (const [nameAscii, countryCode] of [["Shanghai", "CN"], ["Mumbai", "IN"]]) {
    const entry = findCity(nameAscii, countryCode);
    assert.ok(entry, `${nameAscii} ${countryCode} should be present`);
    assert.ok(entry.population >= 18_000_000);
    assert.notEqual(entry.capitalKind, "country_capital");
    assert.ok(entry.weight <= 0.96);
  }
});
