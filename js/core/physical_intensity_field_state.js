function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function cloneStructuredValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function createDefaultPhysicalIntensityFieldState() {
  return {
    schemaVersion: 1,
    enabled: false,
    revision: 0,
    points: [],
    grid: {
      bounds: [-180, -90, 180, 90],
      columns: 0,
      rows: 0,
      values: [],
    },
  };
}

function normalizePoint(rawPoint, index) {
  if (!rawPoint || typeof rawPoint !== "object") return null;
  const lon = toFiniteNumber(rawPoint.lon, NaN);
  const lat = toFiniteNumber(rawPoint.lat, NaN);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return {
    id: String(rawPoint.id || `point-${index + 1}`).trim() || `point-${index + 1}`,
    lon: clampNumber(lon, -180, 180),
    lat: clampNumber(lat, -90, 90),
    weight: clampNumber(toFiniteNumber(rawPoint.weight, 1), -2, 2),
    radiusKm: clampNumber(toFiniteNumber(rawPoint.radiusKm, 500), 25, 5000),
    falloff: String(rawPoint.falloff || "smooth").trim().toLowerCase() === "linear" ? "linear" : "smooth",
  };
}

function normalizeGrid(rawGrid) {
  const defaults = createDefaultPhysicalIntensityFieldState().grid;
  const raw = rawGrid && typeof rawGrid === "object" ? rawGrid : {};
  const rawBounds = Array.isArray(raw.bounds) ? raw.bounds : defaults.bounds;
  const bounds = [
    clampNumber(toFiniteNumber(rawBounds[0], defaults.bounds[0]), -180, 180),
    clampNumber(toFiniteNumber(rawBounds[1], defaults.bounds[1]), -90, 90),
    clampNumber(toFiniteNumber(rawBounds[2], defaults.bounds[2]), -180, 180),
    clampNumber(toFiniteNumber(rawBounds[3], defaults.bounds[3]), -90, 90),
  ];
  const columns = clampNumber(Math.round(toFiniteNumber(raw.columns, defaults.columns)), 0, 360);
  const rows = clampNumber(Math.round(toFiniteNumber(raw.rows, defaults.rows)), 0, 180);
  const expectedLength = columns * rows;
  const values = Array.isArray(raw.values)
    ? raw.values.slice(0, expectedLength).map((value) => clampNumber(toFiniteNumber(value, 0), -2, 2))
    : [];
  while (values.length < expectedLength) values.push(0);
  return {
    bounds,
    columns,
    rows,
    values,
  };
}

export function normalizePhysicalIntensityFieldState(rawState) {
  const defaults = createDefaultPhysicalIntensityFieldState();
  const raw = rawState && typeof rawState === "object" ? rawState : {};
  const points = (Array.isArray(raw.points) ? raw.points : [])
    .map(normalizePoint)
    .filter(Boolean);
  return {
    schemaVersion: 1,
    enabled: raw.enabled === undefined ? defaults.enabled : !!raw.enabled,
    revision: Math.max(0, Math.round(toFiniteNumber(raw.revision, defaults.revision))),
    points,
    grid: normalizeGrid(raw.grid),
  };
}

export function serializePhysicalIntensityFieldState(rawState) {
  return cloneStructuredValue(normalizePhysicalIntensityFieldState(rawState));
}

export function bumpPhysicalIntensityFieldRevision(rawState) {
  const normalized = normalizePhysicalIntensityFieldState(rawState);
  normalized.revision = (normalized.revision || 0) + 1;
  return normalized;
}
