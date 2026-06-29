import { hasRuntimeAssetUrl, resolveDataAssetUrl } from "./runtime_asset_registry.js";

const HGO_RUNTIME_ASSET_KEYS = Object.freeze({
  manifest: "hgo_runtime_manifest",
  seed: "hgo_runtime_seed",
  provincesBmp: "hgo_runtime_provinces_bmp",
});

function assertJsonLoader(d3Client, fetchImpl) {
  if (typeof d3Client?.json === "function" || typeof fetchImpl === "function") return;
  throw new TypeError("HGO runtime JSON loading requires d3.json or fetch.");
}

function assertFetchLoader(fetchImpl) {
  if (typeof fetchImpl === "function") return;
  throw new TypeError("HGO runtime raster loading requires fetch.");
}

async function loadJsonAsset(url, { d3Client = globalThis.d3, fetchImpl = globalThis.fetch } = {}) {
  assertJsonLoader(d3Client, fetchImpl);
  if (typeof d3Client?.json === "function") {
    return d3Client.json(url);
  }
  const response = await fetchImpl(url);
  if (!response?.ok) {
    throw new Error(`HGO runtime JSON request failed: ${url}`);
  }
  return response.json();
}

function normalizeArrayBuffer(value) {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  throw new TypeError("HGO runtime BMP decode requires an ArrayBuffer or typed array.");
}

function assertBmpRange(dataView, offset, length, label) {
  if (offset < 0 || length < 0 || offset + length > dataView.byteLength) {
    throw new RangeError(`HGO runtime BMP ${label} exceeds the file bounds.`);
  }
}

function decodeHgoProvinceBmp(arrayBufferLike) {
  const arrayBuffer = normalizeArrayBuffer(arrayBufferLike);
  const dataView = new DataView(arrayBuffer);
  if (dataView.byteLength < 54) {
    throw new RangeError("HGO runtime BMP is too small to contain a valid header.");
  }
  if (dataView.getUint8(0) !== 0x42 || dataView.getUint8(1) !== 0x4D) {
    throw new TypeError("HGO runtime province raster must be a BMP file.");
  }

  const fileSizeHeader = dataView.getUint32(2, true);
  const dataOffset = dataView.getUint32(10, true);
  const dibHeaderSize = dataView.getUint32(14, true);
  const width = dataView.getInt32(18, true);
  const signedHeight = dataView.getInt32(22, true);
  const planes = dataView.getUint16(26, true);
  const bitsPerPixel = dataView.getUint16(28, true);
  const compression = dataView.getUint32(30, true);
  const imageSizeHeader = dataView.getUint32(34, true);

  if (dibHeaderSize < 40) {
    throw new TypeError("HGO runtime BMP must use a BITMAPINFOHEADER-compatible DIB header.");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(signedHeight) || signedHeight === 0) {
    throw new RangeError("HGO runtime BMP width and height must be positive.");
  }
  if (planes !== 1) {
    throw new TypeError(`HGO runtime BMP must use one color plane. Got ${planes}.`);
  }
  if (bitsPerPixel !== 24) {
    throw new TypeError(`HGO runtime BMP must be 24-bit RGB. Got ${bitsPerPixel}-bit.`);
  }
  if (compression !== 0) {
    throw new TypeError(`HGO runtime BMP must be uncompressed. Compression=${compression}.`);
  }

  const height = Math.abs(signedHeight);
  const topDown = signedHeight < 0;
  const rowStride = Math.ceil((width * 3) / 4) * 4;
  assertBmpRange(dataView, dataOffset, rowStride * height, "pixel data");

  const pixels = new Uint8ClampedArray(width * height * 3);
  for (let sourceY = 0; sourceY < height; sourceY += 1) {
    const targetY = topDown ? sourceY : height - 1 - sourceY;
    const sourceRowOffset = dataOffset + sourceY * rowStride;
    const targetRowOffset = targetY * width * 3;
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = sourceRowOffset + x * 3;
      const targetOffset = targetRowOffset + x * 3;
      pixels[targetOffset] = dataView.getUint8(sourceOffset + 2);
      pixels[targetOffset + 1] = dataView.getUint8(sourceOffset + 1);
      pixels[targetOffset + 2] = dataView.getUint8(sourceOffset);
    }
  }

  return Object.freeze({
    width,
    height,
    pixelFormat: "rgb",
    pixels,
    source: Object.freeze({
      bitsPerPixel,
      compression,
      dataOffset,
      fileSizeHeader,
      imageSizeHeader,
      rowStride,
      topDown,
    }),
  });
}

async function loadHgoRuntimeManifest({
  d3Client = globalThis.d3,
  fetchImpl = globalThis.fetch,
  manifestUrl = resolveDataAssetUrl(HGO_RUNTIME_ASSET_KEYS.manifest),
} = {}) {
  return loadJsonAsset(manifestUrl, { d3Client, fetchImpl });
}

async function loadHgoRuntimeSeed({
  d3Client = globalThis.d3,
  fetchImpl = globalThis.fetch,
  seedUrl = resolveDataAssetUrl(HGO_RUNTIME_ASSET_KEYS.seed),
} = {}) {
  return loadJsonAsset(seedUrl, { d3Client, fetchImpl });
}

async function loadHgoRuntimeRaster({
  fetchImpl = globalThis.fetch,
  rasterUrl = resolveDataAssetUrl(HGO_RUNTIME_ASSET_KEYS.provincesBmp),
} = {}) {
  assertFetchLoader(fetchImpl);
  const response = await fetchImpl(rasterUrl);
  if (!response?.ok) {
    throw new Error(`HGO runtime raster request failed: ${rasterUrl}`);
  }
  return decodeHgoProvinceBmp(await response.arrayBuffer());
}

function areHgoRuntimePreviewAssetsAvailable() {
  return Object.values(HGO_RUNTIME_ASSET_KEYS).every((assetKey) => hasRuntimeAssetUrl(assetKey));
}

function createHgoRuntimePreviewLoaders(options = {}) {
  const hasExplicitRuntimeUrls = ["manifestUrl", "seedUrl", "rasterUrl"]
    .every((fieldName) => typeof options[fieldName] === "string" && options[fieldName].trim());
  if (!hasExplicitRuntimeUrls && !areHgoRuntimePreviewAssetsAvailable()) {
    return Object.freeze({
      available: false,
      loadManifest: null,
      loadSeed: null,
      loadRaster: null,
    });
  }
  const {
    d3Client = globalThis.d3,
    fetchImpl = globalThis.fetch,
    manifestUrl = resolveDataAssetUrl(HGO_RUNTIME_ASSET_KEYS.manifest),
    seedUrl = resolveDataAssetUrl(HGO_RUNTIME_ASSET_KEYS.seed),
    rasterUrl = resolveDataAssetUrl(HGO_RUNTIME_ASSET_KEYS.provincesBmp),
  } = options;
  return Object.freeze({
    available: true,
    loadManifest: () => loadHgoRuntimeManifest({ d3Client, fetchImpl, manifestUrl }),
    loadSeed: () => loadHgoRuntimeSeed({ d3Client, fetchImpl, seedUrl }),
    loadRaster: () => loadHgoRuntimeRaster({ fetchImpl, rasterUrl }),
  });
}

export {
  HGO_RUNTIME_ASSET_KEYS,
  areHgoRuntimePreviewAssetsAvailable,
  createHgoRuntimePreviewLoaders,
  decodeHgoProvinceBmp,
  loadHgoRuntimeManifest,
  loadHgoRuntimeRaster,
  loadHgoRuntimeSeed,
};
