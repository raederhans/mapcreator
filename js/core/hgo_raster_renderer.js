import {
  createHgoRuntimeIndex,
  normalizeHgoRuntimeRgb,
} from "./hgo_runtime_index.js";

const PIXEL_FORMATS = Object.freeze({
  RGB: "rgb",
  RGBA: "rgba",
});

function normalizePositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new TypeError(`HGO raster ${label} must be a positive integer.`);
  }
  return number;
}

function normalizePixelFormat(value) {
  const format = String(value || PIXEL_FORMATS.RGBA).trim().toLowerCase();
  if (format !== PIXEL_FORMATS.RGB && format !== PIXEL_FORMATS.RGBA) {
    throw new TypeError(`Unsupported HGO raster pixel format: ${value}`);
  }
  return format;
}

function normalizePixelBuffer(value, expectedLength) {
  if (!value || typeof value.length !== "number") {
    throw new TypeError("HGO raster pixels must be an array-like RGB or RGBA buffer.");
  }
  if (value.length < expectedLength) {
    throw new RangeError(`HGO raster pixels length ${value.length} is smaller than required ${expectedLength}.`);
  }
  return Uint8ClampedArray.from(Array.prototype.slice.call(value, 0, expectedLength));
}

function normalizeColor(value, label = "color") {
  const rgb = normalizeHgoRuntimeRgb(value);
  if (!rgb) {
    throw new TypeError(`HGO raster ${label} must be an RGB triplet or #RRGGBB value.`);
  }
  return rgb;
}

function normalizeUnknownColor(value) {
  if (value === null || value === undefined) return [0, 0, 0, 0];
  const rgb = normalizeColor(value, "unknown color");
  const alpha = Array.isArray(value) && value.length > 3 ? Number(value[3]) : 255;
  return [rgb[0], rgb[1], rgb[2], Number.isInteger(alpha) ? Math.max(0, Math.min(255, alpha)) : 255];
}

function readSourceRgb(source, pixelIndex) {
  const offset = pixelIndex * source.stride;
  return [
    source.pixels[offset],
    source.pixels[offset + 1],
    source.pixels[offset + 2],
  ];
}

function writeOutputColor(output, pixelIndex, color) {
  const offset = pixelIndex * 4;
  output[offset] = color[0];
  output[offset + 1] = color[1];
  output[offset + 2] = color[2];
  output[offset + 3] = color.length > 3 ? color[3] : 255;
}

function resolveCountryColor(runtime, resolvedProvince, ownershipMode) {
  if (!resolvedProvince) return null;
  if (ownershipMode === "province") {
    return resolvedProvince.province.rgb;
  }
  const tag = ownershipMode === "controller" ? resolvedProvince.controllerTag : resolvedProvince.ownerTag;
  const country = runtime.resolveCountry(tag);
  if (!country?.colorHex) return null;
  return normalizeColor(country.colorHex, `${ownershipMode} color`);
}

function normalizeRenderOptions(options = {}) {
  const ownershipMode = String(options.ownershipMode || "owner").trim().toLowerCase();
  if (!["owner", "controller", "province"].includes(ownershipMode)) {
    throw new TypeError(`Unsupported HGO raster ownership mode: ${options.ownershipMode}`);
  }
  return {
    ownershipMode,
    unknownColor: normalizeUnknownColor(options.unknownColor),
  };
}

function createRasterSource({ width, height, pixels, pixelFormat = PIXEL_FORMATS.RGBA }) {
  const normalizedWidth = normalizePositiveInteger(width, "width");
  const normalizedHeight = normalizePositiveInteger(height, "height");
  const normalizedFormat = normalizePixelFormat(pixelFormat);
  const stride = normalizedFormat === PIXEL_FORMATS.RGB ? 3 : 4;
  const pixelCount = normalizedWidth * normalizedHeight;
  return Object.freeze({
    width: normalizedWidth,
    height: normalizedHeight,
    pixelCount,
    pixelFormat: normalizedFormat,
    stride,
    pixels: normalizePixelBuffer(pixels, pixelCount * stride),
  });
}

function normalizeCanvasDimension(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function createScratchCanvas(width, height) {
  if (typeof globalThis.OffscreenCanvas === "function") {
    return new globalThis.OffscreenCanvas(width, height);
  }
  const canvas = globalThis.document?.createElement?.("canvas");
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function createHgoRasterRenderer({ seed, width, height, pixels, pixelFormat } = {}) {
  const runtime = createHgoRuntimeIndex(seed || {});
  const source = createRasterSource({ width, height, pixels, pixelFormat });
  let disposed = false;

  const assertActive = () => {
    if (disposed) {
      throw new Error("HGO raster renderer has been disposed.");
    }
  };

  const inspectPixelIndex = (pixelIndex) => {
    assertActive();
    if (!Number.isInteger(pixelIndex) || pixelIndex < 0 || pixelIndex >= source.pixelCount) return null;
    const sourceRgb = readSourceRgb(source, pixelIndex);
    const resolved = runtime.resolveProvinceByRgb(sourceRgb);
    return Object.freeze({
      pixelIndex,
      x: pixelIndex % source.width,
      y: Math.floor(pixelIndex / source.width),
      sourceRgb: Object.freeze(sourceRgb),
      resolved,
    });
  };

  const inspectPoint = (x, y) => {
    assertActive();
    const px = Number(x);
    const py = Number(y);
    if (!Number.isInteger(px) || !Number.isInteger(py) || px < 0 || py < 0 || px >= source.width || py >= source.height) {
      return null;
    }
    return inspectPixelIndex(py * source.width + px);
  };

  const inspectCanvasPoint = (x, y, canvas = null) => {
    assertActive();
    const canvasWidth = normalizeCanvasDimension(canvas?.width, source.width);
    const canvasHeight = normalizeCanvasDimension(canvas?.height, source.height);
    const canvasX = Number(x);
    const canvasY = Number(y);
    if (!Number.isFinite(canvasX) || !Number.isFinite(canvasY) || canvasX < 0 || canvasY < 0 || canvasX >= canvasWidth || canvasY >= canvasHeight) {
      return null;
    }
    const sourceX = Math.min(source.width - 1, Math.floor((canvasX / canvasWidth) * source.width));
    const sourceY = Math.min(source.height - 1, Math.floor((canvasY / canvasHeight) * source.height));
    const hit = inspectPoint(sourceX, sourceY);
    return hit ? Object.freeze({
      ...hit,
      canvasX,
      canvasY,
      canvasWidth,
      canvasHeight,
    }) : null;
  };

  const renderToBuffer = (options = {}) => {
    assertActive();
    const renderOptions = normalizeRenderOptions(options);
    const output = new Uint8ClampedArray(source.pixelCount * 4);
    let resolvedPixelCount = 0;
    let unresolvedPixelCount = 0;

    for (let pixelIndex = 0; pixelIndex < source.pixelCount; pixelIndex += 1) {
      const sourceRgb = readSourceRgb(source, pixelIndex);
      const resolved = runtime.resolveProvinceByRgb(sourceRgb);
      const color = resolveCountryColor(runtime, resolved, renderOptions.ownershipMode);
      if (color) {
        resolvedPixelCount += 1;
        writeOutputColor(output, pixelIndex, color);
      } else {
        unresolvedPixelCount += 1;
        writeOutputColor(output, pixelIndex, renderOptions.unknownColor);
      }
    }

    return {
      width: source.width,
      height: source.height,
      data: output,
      ownershipMode: renderOptions.ownershipMode,
      resolvedPixelCount,
      unresolvedPixelCount,
    };
  };

  const renderToCanvas = (canvas, options = {}) => {
    assertActive();
    const context = canvas?.getContext?.("2d");
    if (!context?.createImageData || !context?.putImageData) {
      throw new TypeError("HGO raster canvas must provide a 2D context with ImageData support.");
    }
    const rendered = renderToBuffer(options);
    const targetWidth = normalizeCanvasDimension(canvas?.width, rendered.width);
    const targetHeight = normalizeCanvasDimension(canvas?.height, rendered.height);
    const shouldScaleToCanvas = targetWidth !== rendered.width || targetHeight !== rendered.height;
    if (shouldScaleToCanvas && typeof context.drawImage === "function") {
      const scratchCanvas = createScratchCanvas(rendered.width, rendered.height);
      const scratchContext = scratchCanvas?.getContext?.("2d");
      if (scratchContext?.createImageData && scratchContext?.putImageData) {
        const scratchImageData = scratchContext.createImageData(rendered.width, rendered.height);
        scratchImageData.data.set(rendered.data);
        scratchContext.putImageData(scratchImageData, 0, 0);
        context.clearRect?.(0, 0, targetWidth, targetHeight);
        context.drawImage(scratchCanvas, 0, 0, rendered.width, rendered.height, 0, 0, targetWidth, targetHeight);
        return {
          ...rendered,
          canvasWidth: targetWidth,
          canvasHeight: targetHeight,
          scaledToCanvas: true,
        };
      }
    }
    const imageData = context.createImageData(rendered.width, rendered.height);
    imageData.data.set(rendered.data);
    context.putImageData(imageData, 0, 0);
    return {
      ...rendered,
      canvasWidth: targetWidth,
      canvasHeight: targetHeight,
      scaledToCanvas: false,
    };
  };

  const getSummary = () => Object.freeze({
    width: source.width,
    height: source.height,
    pixelCount: source.pixelCount,
    pixelFormat: source.pixelFormat,
    runtime: runtime.getSummary(),
  });

  const dispose = () => {
    disposed = true;
  };

  return Object.freeze({
    dispose,
    getSummary,
    inspectPixelIndex,
    inspectCanvasPoint,
    inspectPoint,
    renderToBuffer,
    renderToCanvas,
  });
}

export {
  createHgoRasterRenderer,
  createRasterSource,
  normalizeColor,
};
