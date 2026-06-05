import assert from "node:assert/strict";
import test from "node:test";

import { createHgoRasterRenderer } from "../js/core/hgo_raster_renderer.js";

const seed = {
  schema_version: 1,
  runtime_id: "hgo_raster_runtime_seed",
  summary: {
    province_count: 3,
    state_count: 2,
    country_count: 2,
    mapped_province_count: 2,
  },
  provinces: {
    1: { id: 1, rgb: [10, 20, 30], rgb_key: 660510, rgb_hex: "#0A141E", type: "land" },
    2: { id: 2, rgb: [11, 21, 31], rgb_key: 726303, rgb_hex: "#0B151F", type: "land" },
    3: { id: 3, rgb: [12, 22, 32], rgb_key: 792096, rgb_hex: "#0C1620", type: "sea" },
  },
  states: [
    {
      id: 1,
      name_key: "STATE_ALPHA",
      owner: "AAA",
      controller: "BBB",
      core_tags: ["AAA"],
      province_ids: [1],
      province_count: 1,
    },
    {
      id: 2,
      name_key: "STATE_BRAVO",
      owner: "BBB",
      controller: "BBB",
      core_tags: ["BBB"],
      province_ids: [2],
      province_count: 1,
    },
  ],
  countries: {
    AAA: { tag: "AAA", color_rgb: [1, 2, 3], color_hex: "#010203" },
    BBB: { tag: "BBB", color_rgb: [4, 5, 6], color_hex: "#040506" },
  },
  province_to_state: {
    1: 1,
    2: 2,
  },
};

function createRenderer() {
  return createHgoRasterRenderer({
    seed,
    width: 2,
    height: 2,
    pixelFormat: "rgb",
    pixels: [
      10, 20, 30,
      11, 21, 31,
      255, 255, 255,
      12, 22, 32,
    ],
  });
}

test("renders owner colors from HGO province RGB pixels", () => {
  const rendered = createRenderer().renderToBuffer();

  assert.equal(rendered.width, 2);
  assert.equal(rendered.height, 2);
  assert.equal(rendered.resolvedPixelCount, 2);
  assert.equal(rendered.unresolvedPixelCount, 2);
  assert.deepEqual(Array.from(rendered.data.slice(0, 4)), [1, 2, 3, 255]);
  assert.deepEqual(Array.from(rendered.data.slice(4, 8)), [4, 5, 6, 255]);
  assert.deepEqual(Array.from(rendered.data.slice(8, 12)), [0, 0, 0, 0]);
});

test("renders controller colors when requested", () => {
  const rendered = createRenderer().renderToBuffer({ ownershipMode: "controller" });

  assert.deepEqual(Array.from(rendered.data.slice(0, 4)), [4, 5, 6, 255]);
  assert.deepEqual(Array.from(rendered.data.slice(4, 8)), [4, 5, 6, 255]);
});

test("inspects pixel coordinates through the HGO runtime index", () => {
  const renderer = createRenderer();
  const hit = renderer.inspectPoint(0, 0);

  assert.equal(hit.pixelIndex, 0);
  assert.deepEqual(hit.sourceRgb, [10, 20, 30]);
  assert.equal(hit.resolved.provinceId, 1);
  assert.equal(hit.resolved.state.nameKey, "STATE_ALPHA");
  assert.equal(renderer.inspectPoint(4, 0), null);
});

test("rejects malformed raster sources", () => {
  assert.throws(() => {
    createHgoRasterRenderer({ seed, width: 2, height: 2, pixelFormat: "rgb", pixels: [1, 2, 3] });
  }, /pixels length/);
  assert.throws(() => {
    createHgoRasterRenderer({ seed, width: 0, height: 2, pixelFormat: "rgb", pixels: [] });
  }, /width/);
});

test("hard-fails render calls after dispose", () => {
  const renderer = createRenderer();

  renderer.dispose();

  assert.throws(() => renderer.renderToBuffer(), /disposed/);
  assert.throws(() => renderer.inspectPoint(0, 0), /disposed/);
});
