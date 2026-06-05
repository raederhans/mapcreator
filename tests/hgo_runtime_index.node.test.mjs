import assert from "node:assert/strict";
import test from "node:test";

import {
  createHgoRuntimeIndex,
  hgoRuntimeRgbKey,
  normalizeHgoRuntimeRgb,
} from "../js/core/hgo_runtime_index.js";

const seed = {
  schema_version: 1,
  runtime_id: "hgo_raster_runtime_seed",
  summary: {
    province_count: 3,
    state_count: 1,
    country_count: 2,
    mapped_province_count: 2,
  },
  provinces: {
    1: {
      id: 1,
      rgb: [10, 20, 30],
      rgb_key: 660510,
      rgb_hex: "#0A141E",
      type: "land",
      terrain: "plains",
      continent: 1,
    },
    2: {
      id: 2,
      rgb: [11, 21, 31],
      rgb_key: 726303,
      rgb_hex: "#0B151F",
      type: "land",
      terrain: "forest",
      continent: 1,
    },
    3: {
      id: 3,
      rgb: [12, 22, 32],
      rgb_key: 792096,
      rgb_hex: "#0C1620",
      type: "sea",
      terrain: "ocean",
      continent: 1,
    },
  },
  states: [
    {
      id: 1,
      name_key: "STATE_TEST",
      owner: "AAA",
      controller: "BBB",
      core_tags: ["AAA", "BBB"],
      category: "town",
      province_ids: [1, 2],
      province_count: 2,
      source_path: "history/states/1-Test-State.txt",
    },
  ],
  countries: {
    AAA: {
      tag: "AAA",
      definition_path: "countries/AAA - Testland.txt",
      source_path: "common/countries/AAA - Testland.txt",
      color_rgb: [1, 2, 3],
      color_hex: "#010203",
      state_count: 1,
      province_count: 2,
    },
    BBB: {
      tag: "BBB",
      definition_path: "countries/BBB - Controller.txt",
      source_path: "common/countries/BBB - Controller.txt",
      color_rgb: [4, 5, 6],
      color_hex: "#040506",
      state_count: 0,
      province_count: 0,
    },
  },
  province_to_state: {
    1: 1,
    2: 1,
  },
};

// 这个 fixture 同时覆盖 province RGB、state ownership、country color 三层，
// 让 runtime index 的查询合同和 builder 输出结构保持同步。
function createIndex() {
  return createHgoRuntimeIndex(seed);
}

test("normalizes RGB inputs and computes stable keys", () => {
  assert.deepEqual(normalizeHgoRuntimeRgb("#0a141e"), [10, 20, 30]);
  assert.deepEqual(normalizeHgoRuntimeRgb({ r: 10, g: 20, b: 30 }), [10, 20, 30]);
  assert.equal(hgoRuntimeRgbKey([10, 20, 30]), "660510");
});

test("resolves province by id with state and ownership context", () => {
  const resolved = createIndex().resolveProvinceById("1");

  assert.equal(resolved.provinceId, 1);
  assert.equal(resolved.stateId, 1);
  assert.equal(resolved.ownerTag, "AAA");
  assert.equal(resolved.controllerTag, "BBB");
  assert.equal(resolved.province.rgbHex, "#0A141E");
  assert.equal(resolved.state.nameKey, "STATE_TEST");
  assert.equal(resolved.country.tag, "AAA");
  assert.equal(resolved.countryColorHex, "#010203");
});

test("resolves province by RGB triplet and hex color", () => {
  const byObject = createIndex().resolveProvinceByRgb({ r: 10, g: 20, b: 30 });
  const byArray = createIndex().resolveProvinceByRgb([10, 20, 30]);
  const byHex = createIndex().resolveProvinceByHex("#0a141e");

  assert.equal(byObject.provinceId, 1);
  assert.equal(byArray.provinceId, 1);
  assert.equal(byHex.provinceId, 1);
});

test("returns state province ids in deterministic order", () => {
  assert.deepEqual(createIndex().getStateProvinceIds(1), [1, 2]);
});

test("resolves state and country by canonical keys", () => {
  const runtime = createIndex();

  assert.equal(runtime.resolveState("1").ownerTag, "AAA");
  assert.equal(runtime.resolveCountry("aaa").colorHex, "#010203");
});

test("falls back missing controller to owner tag", () => {
  const seedWithoutController = JSON.parse(JSON.stringify(seed));
  delete seedWithoutController.states[0].controller;

  const resolved = createHgoRuntimeIndex(seedWithoutController).resolveProvinceById(1);

  assert.equal(resolved.ownerTag, "AAA");
  assert.equal(resolved.controllerTag, "AAA");
});

test("returns empty results for unknown lookups", () => {
  const runtime = createIndex();

  assert.equal(runtime.resolveProvinceById(999), null);
  assert.equal(runtime.resolveProvinceByRgb([255, 255, 255]), null);
  assert.equal(runtime.resolveState(999), null);
  assert.equal(runtime.resolveCountry("ZZZ"), null);
  assert.deepEqual(runtime.getStateProvinceIds(999), []);
});

test("keeps source seed immutable across queries", () => {
  const before = JSON.stringify(seed);
  const runtime = createIndex();

  runtime.resolveProvince(1);
  runtime.resolveProvince("#0a141e");
  runtime.getStateProvinceIds(1);
  assert.throws(() => {
    runtime.getSummary().seedSummary.extra = true;
  }, TypeError);

  assert.equal(JSON.stringify(seed), before);
});
