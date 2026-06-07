import {
  createHgoRuntimeIndex,
  normalizeHgoRuntimeRgb,
} from "./hgo_runtime_index.js";
import {
  HGO_DEFAULT_TARGET_PROJECTION,
  HGO_SOURCE_PROJECTION,
  createHgoProjectionModel,
} from "./hgo_projection_model.js";

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
    projection: options.projection || null,
    projectionName: String(options.projectionName || HGO_DEFAULT_TARGET_PROJECTION).trim() || HGO_DEFAULT_TARGET_PROJECTION,
    sourceProjection: String(options.sourceProjection || HGO_SOURCE_PROJECTION).trim() || HGO_SOURCE_PROJECTION,
    projectionPixelRatio: Number.isFinite(Number(options.projectionPixelRatio)) && Number(options.projectionPixelRatio) > 0
      ? Number(options.projectionPixelRatio)
      : 1,
    projectionTransform: options.projectionTransform || null,
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

function createHgoRasterViewport(sourceWidth, sourceHeight, canvasWidth, canvasHeight) {
  const normalizedSourceWidth = normalizePositiveInteger(sourceWidth, "viewport source width");
  const normalizedSourceHeight = normalizePositiveInteger(sourceHeight, "viewport source height");
  const normalizedCanvasWidth = normalizeCanvasDimension(canvasWidth, normalizedSourceWidth);
  const normalizedCanvasHeight = normalizeCanvasDimension(canvasHeight, normalizedSourceHeight);
  const sourceAspect = normalizedSourceWidth / normalizedSourceHeight;
  const canvasAspect = normalizedCanvasWidth / normalizedCanvasHeight;
  let viewportWidth = normalizedCanvasWidth;
  let viewportHeight = normalizedCanvasHeight;

  if (canvasAspect > sourceAspect) {
    viewportHeight = normalizedCanvasHeight;
    viewportWidth = Math.max(1, Math.min(normalizedCanvasWidth, Math.round(viewportHeight * sourceAspect)));
  } else if (canvasAspect < sourceAspect) {
    viewportWidth = normalizedCanvasWidth;
    viewportHeight = Math.max(1, Math.min(normalizedCanvasHeight, Math.round(viewportWidth / sourceAspect)));
  }

  const x = Math.max(0, Math.floor((normalizedCanvasWidth - viewportWidth) / 2));
  const y = Math.max(0, Math.floor((normalizedCanvasHeight - viewportHeight) / 2));
  return Object.freeze({
    x,
    y,
    width: viewportWidth,
    height: viewportHeight,
    canvasWidth: normalizedCanvasWidth,
    canvasHeight: normalizedCanvasHeight,
    sourceWidth: normalizedSourceWidth,
    sourceHeight: normalizedSourceHeight,
    fitMode: "contain",
  });
}

function createProjectedHgoRasterViewport(sourceWidth, sourceHeight, canvasWidth, canvasHeight, renderOptions) {
  return Object.freeze({
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight,
    canvasWidth,
    canvasHeight,
    sourceWidth,
    sourceHeight,
    fitMode: "projection",
    projectionName: renderOptions.projectionName,
    sourceProjection: renderOptions.sourceProjection,
    projectionPixelRatio: renderOptions.projectionPixelRatio,
  });
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

function formatSignatureNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : "";
}

function formatSignatureArray(value) {
  return Array.isArray(value) ? value.map(formatSignatureNumber).join(",") : "";
}

function getProjectionTransformSignature(transform, transformId = "none") {
  if (!transform) return "none";
  return [
    transformId,
    formatSignatureNumber(transform.k),
    formatSignatureNumber(transform.x),
    formatSignatureNumber(transform.y),
  ].join(",");
}

function createProjectionRenderCacheKey({
  projectionId,
  projectionTransformId,
  renderOptions,
  targetWidth,
  targetHeight,
}) {
  const projection = renderOptions.projection;
  return [
    targetWidth,
    targetHeight,
    renderOptions.ownershipMode,
    renderOptions.unknownColor.join(","),
    renderOptions.projectionName,
    renderOptions.sourceProjection,
    formatSignatureNumber(renderOptions.projectionPixelRatio),
    projectionId,
    formatSignatureNumber(projection?.scale?.()),
    formatSignatureArray(projection?.translate?.()),
    formatSignatureArray(projection?.center?.()),
    formatSignatureArray(projection?.rotate?.()),
    getProjectionTransformSignature(renderOptions.projectionTransform, projectionTransformId),
  ].join("|");
}

function createHgoRasterRenderer({ seed, width, height, pixels, pixelFormat } = {}) {
  const runtime = createHgoRuntimeIndex(seed || {});
  const source = createRasterSource({ width, height, pixels, pixelFormat });
  let disposed = false;
  let projectedRenderCache = null;
  let nextProjectionId = 1;
  let nextProjectionTransformId = 1;
  const projectionIds = new WeakMap();
  const projectionTransformIds = new WeakMap();

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
    const viewport = createHgoRasterViewport(source.width, source.height, canvasWidth, canvasHeight);
    const canvasX = Number(x);
    const canvasY = Number(y);
    if (!Number.isFinite(canvasX) || !Number.isFinite(canvasY) || canvasX < 0 || canvasY < 0 || canvasX >= canvasWidth || canvasY >= canvasHeight) {
      return null;
    }
    if (
      canvasX < viewport.x
      || canvasY < viewport.y
      || canvasX >= viewport.x + viewport.width
      || canvasY >= viewport.y + viewport.height
    ) {
      return null;
    }
    const sourceX = Math.min(source.width - 1, Math.floor(((canvasX - viewport.x) / viewport.width) * source.width));
    const sourceY = Math.min(source.height - 1, Math.floor(((canvasY - viewport.y) / viewport.height) * source.height));
    const hit = inspectPoint(sourceX, sourceY);
    return hit ? Object.freeze({
      ...hit,
      canvasX,
      canvasY,
      canvasWidth,
      canvasHeight,
      viewport,
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

  const getProjectionId = (projection) => {
    if ((typeof projection !== "function" && typeof projection !== "object") || projection === null) return "none";
    if (!projectionIds.has(projection)) {
      projectionIds.set(projection, nextProjectionId);
      nextProjectionId += 1;
    }
    return projectionIds.get(projection);
  };

  const getProjectionTransformId = (transform) => {
    if (!transform || typeof transform.invert !== "function") return "none";
    if ((typeof transform !== "function" && typeof transform !== "object") || transform === null) return "none";
    if (!projectionTransformIds.has(transform)) {
      projectionTransformIds.set(transform, nextProjectionTransformId);
      nextProjectionTransformId += 1;
    }
    return projectionTransformIds.get(transform);
  };

  const renderProjectedToBuffer = (options = {}) => {
    assertActive();
    const renderOptions = normalizeRenderOptions(options);
    const targetWidth = normalizeCanvasDimension(options.targetWidth, source.width);
    const targetHeight = normalizeCanvasDimension(options.targetHeight, source.height);
    const projectionModel = createHgoProjectionModel({
      projection: renderOptions.projection,
      sourceWidth: source.width,
      sourceHeight: source.height,
      targetWidth,
      targetHeight,
      projectionName: renderOptions.projectionName,
      sourceProjection: renderOptions.sourceProjection,
      projectionPixelRatio: renderOptions.projectionPixelRatio,
      projectionTransform: renderOptions.projectionTransform,
    });
    const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);
    let projectedPixelCount = 0;
    let unprojectedPixelCount = 0;
    let resolvedPixelCount = 0;
    let unresolvedPixelCount = 0;

    for (let targetY = 0; targetY < targetHeight; targetY += 1) {
      for (let targetX = 0; targetX < targetWidth; targetX += 1) {
        const outputIndex = targetY * targetWidth + targetX;
        const mapped = projectionModel.mapCanvasPointToSource(targetX, targetY);
        if (!mapped) {
          unprojectedPixelCount += 1;
          unresolvedPixelCount += 1;
          writeOutputColor(output, outputIndex, renderOptions.unknownColor);
          continue;
        }
        projectedPixelCount += 1;
        const sourceRgb = readSourceRgb(source, mapped.pixelIndex);
        const resolved = runtime.resolveProvinceByRgb(sourceRgb);
        const color = resolveCountryColor(runtime, resolved, renderOptions.ownershipMode);
        if (color) {
          resolvedPixelCount += 1;
          writeOutputColor(output, outputIndex, color);
        } else {
          unresolvedPixelCount += 1;
          writeOutputColor(output, outputIndex, renderOptions.unknownColor);
        }
      }
    }

    return {
      width: targetWidth,
      height: targetHeight,
      sourceWidth: source.width,
      sourceHeight: source.height,
      data: output,
      ownershipMode: renderOptions.ownershipMode,
      projectionName: projectionModel.projectionName,
      sourceProjection: projectionModel.sourceProjection,
      projectionPixelRatio: projectionModel.projectionPixelRatio,
      projectedPixelCount,
      unprojectedPixelCount,
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
    const viewport = createHgoRasterViewport(rendered.width, rendered.height, targetWidth, targetHeight);
    const shouldScaleToViewport = viewport.width !== rendered.width
      || viewport.height !== rendered.height
      || viewport.x !== 0
      || viewport.y !== 0;
    if (shouldScaleToViewport && typeof context.drawImage === "function") {
      const scratchCanvas = createScratchCanvas(rendered.width, rendered.height);
      const scratchContext = scratchCanvas?.getContext?.("2d");
      if (scratchContext?.createImageData && scratchContext?.putImageData) {
        const scratchImageData = scratchContext.createImageData(rendered.width, rendered.height);
        scratchImageData.data.set(rendered.data);
        scratchContext.putImageData(scratchImageData, 0, 0);
        context.clearRect?.(0, 0, targetWidth, targetHeight);
        context.drawImage(
          scratchCanvas,
          0,
          0,
          rendered.width,
          rendered.height,
          viewport.x,
          viewport.y,
          viewport.width,
          viewport.height,
        );
        return {
          ...rendered,
          canvasWidth: targetWidth,
          canvasHeight: targetHeight,
          viewport,
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
      viewport: createHgoRasterViewport(rendered.width, rendered.height, rendered.width, rendered.height),
      scaledToCanvas: false,
    };
  };

  const renderProjectedToCanvas = (canvas, options = {}) => {
    assertActive();
    const context = canvas?.getContext?.("2d");
    if (!context?.createImageData || !context?.putImageData) {
      throw new TypeError("HGO raster canvas must provide a 2D context with ImageData support.");
    }
    const targetWidth = normalizeCanvasDimension(canvas?.width, source.width);
    const targetHeight = normalizeCanvasDimension(canvas?.height, source.height);
    const renderOptions = normalizeRenderOptions(options);
    const cacheKey = createProjectionRenderCacheKey({
      projectionId: getProjectionId(renderOptions.projection),
      projectionTransformId: getProjectionTransformId(renderOptions.projectionTransform),
      renderOptions,
      targetWidth,
      targetHeight,
    });
    const rendered = projectedRenderCache?.key === cacheKey
      ? projectedRenderCache.rendered
      : renderProjectedToBuffer({
        ...options,
        targetWidth,
        targetHeight,
      });
    if (projectedRenderCache?.key !== cacheKey) {
      projectedRenderCache = { key: cacheKey, rendered };
    }
    const imageData = context.createImageData(rendered.width, rendered.height);
    imageData.data.set(rendered.data);
    context.clearRect?.(0, 0, targetWidth, targetHeight);
    context.putImageData(imageData, 0, 0);
    return {
      ...rendered,
      canvasWidth: targetWidth,
      canvasHeight: targetHeight,
      viewport: createProjectedHgoRasterViewport(source.width, source.height, targetWidth, targetHeight, renderOptions),
      scaledToCanvas: false,
    };
  };

  const inspectProjectedCanvasPoint = (x, y, canvas = null, options = {}) => {
    assertActive();
    const renderOptions = normalizeRenderOptions(options);
    const canvasWidth = normalizeCanvasDimension(canvas?.width, source.width);
    const canvasHeight = normalizeCanvasDimension(canvas?.height, source.height);
    const projectionModel = createHgoProjectionModel({
      projection: renderOptions.projection,
      sourceWidth: source.width,
      sourceHeight: source.height,
      targetWidth: canvasWidth,
      targetHeight: canvasHeight,
      projectionName: renderOptions.projectionName,
      sourceProjection: renderOptions.sourceProjection,
      projectionPixelRatio: renderOptions.projectionPixelRatio,
      projectionTransform: renderOptions.projectionTransform,
    });
    const mapped = projectionModel.mapCanvasPointToSource(x, y);
    if (!mapped) return null;
    const hit = inspectPoint(mapped.sourceX, mapped.sourceY);
    return hit ? Object.freeze({
      ...hit,
      canvasX: mapped.canvasX,
      canvasY: mapped.canvasY,
      canvasWidth,
      canvasHeight,
      lon: mapped.lon,
      lat: mapped.lat,
      projectionX: mapped.projectionX,
      projectionY: mapped.projectionY,
      projectionName: mapped.projectionName,
      sourceProjection: mapped.sourceProjection,
      projectionPixelRatio: mapped.projectionPixelRatio,
      viewport: projectionModel.getViewport(),
    }) : null;
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
    projectedRenderCache = null;
  };

  return Object.freeze({
    dispose,
    getSummary,
    inspectPixelIndex,
    inspectCanvasPoint,
    inspectProjectedCanvasPoint,
    inspectPoint,
    renderProjectedToBuffer,
    renderProjectedToCanvas,
    renderToBuffer,
    renderToCanvas,
  });
}

export {
  createHgoRasterRenderer,
  createRasterSource,
  normalizeColor,
};
