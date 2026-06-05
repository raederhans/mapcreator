import assert from "node:assert/strict";
import test from "node:test";

import {
  createHgoRuntimePreviewLoaders,
  decodeHgoProvinceBmp,
} from "../js/core/hgo_runtime_asset_loader.js";
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

function createBmp24(rows) {
  const height = rows.length;
  const width = rows[0]?.length || 0;
  const rowStride = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = [];
  for (const row of [...rows].reverse()) {
    const rowBytes = [];
    for (const [red, green, blue] of row) {
      rowBytes.push(blue, green, red);
    }
    while (rowBytes.length < rowStride) rowBytes.push(0);
    pixelBytes.push(...rowBytes);
  }
  const buffer = new ArrayBuffer(54 + pixelBytes.length);
  const view = new DataView(buffer);
  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4D);
  view.setUint32(2, buffer.byteLength, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelBytes.length, true);
  new Uint8Array(buffer, 54).set(pixelBytes);
  return buffer;
}

test("decodes 24-bit BMP province pixels into RGB raster source", () => {
  const raster = decodeHgoProvinceBmp(createBmp24([
    [[10, 20, 30], [11, 21, 31]],
    [[12, 22, 32], [255, 255, 255]],
  ]));

  assert.equal(raster.width, 2);
  assert.equal(raster.height, 2);
  assert.equal(raster.pixelFormat, "rgb");
  assert.equal(raster.source.rowStride, 8);
  assert.equal(raster.source.topDown, false);
  assert.deepEqual(Array.from(raster.pixels), [
    10, 20, 30,
    11, 21, 31,
    12, 22, 32,
    255, 255, 255,
  ]);
});

test("renders decoded BMP pixels through HGO runtime ownership colors", () => {
  const raster = decodeHgoProvinceBmp(createBmp24([
    [[10, 20, 30], [11, 21, 31]],
    [[255, 255, 255], [12, 22, 32]],
  ]));
  const rendered = createHgoRasterRenderer({ seed, ...raster }).renderToBuffer();

  assert.equal(rendered.resolvedPixelCount, 2);
  assert.equal(rendered.unresolvedPixelCount, 2);
  assert.deepEqual(Array.from(rendered.data.slice(0, 4)), [1, 2, 3, 255]);
  assert.deepEqual(Array.from(rendered.data.slice(4, 8)), [4, 5, 6, 255]);
});

test("rejects unsupported BMP source encodings", () => {
  const badMagic = createBmp24([[[10, 20, 30]]]);
  new Uint8Array(badMagic)[0] = 0x00;
  assert.throws(() => decodeHgoProvinceBmp(badMagic), /BMP file/);

  const compressed = createBmp24([[[10, 20, 30]]]);
  new DataView(compressed).setUint32(30, 1, true);
  assert.throws(() => decodeHgoProvinceBmp(compressed), /uncompressed/);

  const wrongBitDepth = createBmp24([[[10, 20, 30]]]);
  new DataView(wrongBitDepth).setUint16(28, 8, true);
  assert.throws(() => decodeHgoProvinceBmp(wrongBitDepth), /24-bit/);
});

test("preview loaders read configured HGO seed and BMP asset URLs", async () => {
  const requestedJsonUrls = [];
  const requestedBinaryUrls = [];
  const loaders = createHgoRuntimePreviewLoaders({
    d3Client: {
      json: async (url) => {
        requestedJsonUrls.push(url);
        return { runtime_id: "hgo_raster_runtime_seed" };
      },
    },
    fetchImpl: async (url) => {
      requestedBinaryUrls.push(url);
      return {
        ok: true,
        arrayBuffer: async () => createBmp24([[[10, 20, 30]]]),
      };
    },
    seedUrl: "data/hgo_runtime/seed.json",
    rasterUrl: "data/hgo_runtime/provinces.bmp",
  });

  const seedPayload = await loaders.loadSeed();
  const raster = await loaders.loadRaster();

  assert.equal(seedPayload.runtime_id, "hgo_raster_runtime_seed");
  assert.deepEqual(requestedJsonUrls, ["data/hgo_runtime/seed.json"]);
  assert.deepEqual(requestedBinaryUrls, ["data/hgo_runtime/provinces.bmp"]);
  assert.deepEqual(Array.from(raster.pixels), [10, 20, 30]);
});

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
