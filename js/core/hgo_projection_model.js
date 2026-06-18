const HGO_SOURCE_PROJECTION = "equirectangular";
const HGO_DEFAULT_TARGET_PROJECTION = "equalEarth";
const HGO_LON_MIN = -180;
const HGO_LON_MAX = 180;
const HGO_LAT_MIN = -90;
const HGO_LAT_MAX = 90;
const HGO_GEO_EPSILON = 1e-6;
// Tolerance is in projection logical pixels, after canvas DPR and zoom transform are removed.
const HGO_PROJECTION_ROUND_TRIP_TOLERANCE_PX = 0.25;

function normalizePositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new TypeError(`HGO projection ${label} must be a positive integer.`);
  }
  return number;
}

function normalizeFiniteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError(`HGO projection ${label} must be finite.`);
  }
  return number;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeProjection(projection) {
  if (typeof projection !== "function" || typeof projection.invert !== "function") {
    throw new TypeError("HGO projection model requires a projection function with invert().");
  }
  return projection;
}

function normalizeProjectionPixelRatio(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function normalizeSourceProjection(value) {
  const normalized = String(value || HGO_SOURCE_PROJECTION).trim() || HGO_SOURCE_PROJECTION;
  if (normalized !== HGO_SOURCE_PROJECTION) {
    throw new TypeError(`HGO source projection must be ${HGO_SOURCE_PROJECTION}.`);
  }
  return normalized;
}

function invertProjectionTransform(transform, point) {
  if (transform && typeof transform.invert === "function") {
    const inverted = transform.invert(point);
    return Array.isArray(inverted) && inverted.length >= 2 ? inverted : null;
  }
  const k = Number(transform?.k);
  const tx = Number(transform?.x || 0);
  const ty = Number(transform?.y || 0);
  if (Number.isFinite(k) && k > 0) {
    return [
      (point[0] - tx) / k,
      (point[1] - ty) / k,
    ];
  }
  return point;
}

function normalizeLonLat(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lon < HGO_LON_MIN - HGO_GEO_EPSILON || lon > HGO_LON_MAX + HGO_GEO_EPSILON) return null;
  if (lat < HGO_LAT_MIN - HGO_GEO_EPSILON || lat > HGO_LAT_MAX + HGO_GEO_EPSILON) return null;
  return [
    clampNumber(lon, HGO_LON_MIN, HGO_LON_MAX),
    clampNumber(lat, HGO_LAT_MIN, HGO_LAT_MAX),
  ];
}

function isProjectionRoundTripInDomain(projection, lonLat, projectionPoint) {
  if (!Array.isArray(lonLat) || !Array.isArray(projectionPoint)) return false;
  const projected = projection(lonLat);
  if (!Array.isArray(projected) || projected.length < 2) return false;
  const x = Number(projected[0]);
  const y = Number(projected[1]);
  const targetX = Number(projectionPoint[0]);
  const targetY = Number(projectionPoint[1]);
  if (![x, y, targetX, targetY].every(Number.isFinite)) return false;
  return Math.abs(x - targetX) <= HGO_PROJECTION_ROUND_TRIP_TOLERANCE_PX
    && Math.abs(y - targetY) <= HGO_PROJECTION_ROUND_TRIP_TOLERANCE_PX;
}

function mapHgoLonLatToSourcePoint(lonLat, { sourceWidth, sourceHeight } = {}) {
  const width = normalizePositiveInteger(sourceWidth, "source width");
  const height = normalizePositiveInteger(sourceHeight, "source height");
  const normalized = normalizeLonLat(lonLat);
  if (!normalized) return null;
  const [lon, lat] = normalized;
  const sourceX = clampNumber(Math.floor(((lon - HGO_LON_MIN) / (HGO_LON_MAX - HGO_LON_MIN)) * width), 0, width - 1);
  const sourceY = clampNumber(Math.floor(((HGO_LAT_MAX - lat) / (HGO_LAT_MAX - HGO_LAT_MIN)) * height), 0, height - 1);
  return Object.freeze({
    lon,
    lat,
    sourceX,
    sourceY,
    pixelIndex: sourceY * width + sourceX,
  });
}

function mapHgoSourcePointToLonLat(x, y, { sourceWidth, sourceHeight } = {}) {
  const width = normalizePositiveInteger(sourceWidth, "source width");
  const height = normalizePositiveInteger(sourceHeight, "source height");
  const sourceX = normalizeFiniteNumber(x, "source x");
  const sourceY = normalizeFiniteNumber(y, "source y");
  if (sourceX < 0 || sourceY < 0 || sourceX >= width || sourceY >= height) return null;
  return Object.freeze([
    HGO_LON_MIN + ((Math.floor(sourceX) + 0.5) / width) * (HGO_LON_MAX - HGO_LON_MIN),
    HGO_LAT_MAX - ((Math.floor(sourceY) + 0.5) / height) * (HGO_LAT_MAX - HGO_LAT_MIN),
  ]);
}

function createHgoProjectionModel({
  projection,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  projectionName = HGO_DEFAULT_TARGET_PROJECTION,
  sourceProjection = HGO_SOURCE_PROJECTION,
  projectionPixelRatio = 1,
  projectionTransform = null,
} = {}) {
  const normalizedProjection = normalizeProjection(projection);
  const normalizedSourceWidth = normalizePositiveInteger(sourceWidth, "source width");
  const normalizedSourceHeight = normalizePositiveInteger(sourceHeight, "source height");
  const normalizedTargetWidth = normalizePositiveInteger(targetWidth, "target width");
  const normalizedTargetHeight = normalizePositiveInteger(targetHeight, "target height");
  const pixelRatio = normalizeProjectionPixelRatio(projectionPixelRatio);
  const normalizedProjectionName = String(projectionName || HGO_DEFAULT_TARGET_PROJECTION).trim() || HGO_DEFAULT_TARGET_PROJECTION;
  const normalizedSourceProjection = normalizeSourceProjection(sourceProjection);

  const mapCanvasPointToSource = (canvasX, canvasY) => {
    const x = Number(canvasX);
    const y = Number(canvasY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < 0 || y < 0 || x >= normalizedTargetWidth || y >= normalizedTargetHeight) return null;
    const logicalPoint = [
      (x + 0.5) / pixelRatio,
      (y + 0.5) / pixelRatio,
    ];
    // canvas -> zoom transform -> map projection -> HGO equirectangular source，render 和 inspect 共用这条链路。
    const projectionPoint = invertProjectionTransform(projectionTransform, logicalPoint);
    if (!projectionPoint) return null;
    const lonLat = normalizeLonLat(normalizedProjection.invert(projectionPoint));
    if (!lonLat || !isProjectionRoundTripInDomain(normalizedProjection, lonLat, projectionPoint)) return null;
    const sourcePoint = mapHgoLonLatToSourcePoint(lonLat, {
      sourceWidth: normalizedSourceWidth,
      sourceHeight: normalizedSourceHeight,
    });
    if (!sourcePoint) return null;
    return Object.freeze({
      canvasX: x,
      canvasY: y,
      targetWidth: normalizedTargetWidth,
      targetHeight: normalizedTargetHeight,
      projectionX: projectionPoint[0],
      projectionY: projectionPoint[1],
      projectionPixelRatio: pixelRatio,
      projectionName: normalizedProjectionName,
      sourceProjection: normalizedSourceProjection,
      ...sourcePoint,
    });
  };

  const getViewport = () => Object.freeze({
    x: 0,
    y: 0,
    width: normalizedTargetWidth,
    height: normalizedTargetHeight,
    canvasWidth: normalizedTargetWidth,
    canvasHeight: normalizedTargetHeight,
    sourceWidth: normalizedSourceWidth,
    sourceHeight: normalizedSourceHeight,
    fitMode: "projection",
    projectionName: normalizedProjectionName,
    sourceProjection: normalizedSourceProjection,
    projectionPixelRatio: pixelRatio,
  });

  return Object.freeze({
    getViewport,
    mapCanvasPointToSource,
    projectionName: normalizedProjectionName,
    sourceProjection: normalizedSourceProjection,
    sourceWidth: normalizedSourceWidth,
    sourceHeight: normalizedSourceHeight,
    targetWidth: normalizedTargetWidth,
    targetHeight: normalizedTargetHeight,
    projectionPixelRatio: pixelRatio,
  });
}

export {
  HGO_DEFAULT_TARGET_PROJECTION,
  HGO_SOURCE_PROJECTION,
  createHgoProjectionModel,
  mapHgoLonLatToSourcePoint,
  mapHgoSourcePointToLonLat,
};
