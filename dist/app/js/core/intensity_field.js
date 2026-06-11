export const INTENSITY_FIELD_GRID = Object.freeze({
  bounds: Object.freeze([-180, -90, 180, 90]),
  columns: 720,
  rows: 360,
  neutral: 1,
  min: 0,
  max: 2,
});

// 强度场是可保存的全局乘数网格：1 表示不改动原图层，0-2 只表达相对增强/削弱。
export const INTENSITY_FIELD_CHANNELS = Object.freeze({
  physicalAtlas: Object.freeze({
    id: "physicalAtlas",
    targetPass: "physicalBase",
    applyMode: "featureMultiplier",
  }),
  physicalContour: Object.freeze({
    id: "physicalContour",
    targetPass: "contextBase",
    applyMode: "featureMultiplier",
  }),
});

export const INTENSITY_FIELD_CHANNEL_IDS = Object.freeze(Object.keys(INTENSITY_FIELD_CHANNELS));

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function createNeutralGridValues() {
  return new Float32Array(INTENSITY_FIELD_GRID.columns * INTENSITY_FIELD_GRID.rows).fill(INTENSITY_FIELD_GRID.neutral);
}

function normalizeGridValues(values) {
  const expectedLength = INTENSITY_FIELD_GRID.columns * INTENSITY_FIELD_GRID.rows;
  const next = createNeutralGridValues();
  if (!values) return next;
  const source = ArrayBuffer.isView(values) || Array.isArray(values) ? values : [];
  const limit = Math.min(source.length, expectedLength);
  for (let index = 0; index < limit; index += 1) {
    next[index] = clampNumber(toFiniteNumber(source[index], INTENSITY_FIELD_GRID.neutral), INTENSITY_FIELD_GRID.min, INTENSITY_FIELD_GRID.max);
  }
  return next;
}

export function normalizeIntensityPoint(rawPoint, index = 0) {
  if (!rawPoint || typeof rawPoint !== "object") return null;
  const lon = toFiniteNumber(rawPoint.lon, NaN);
  const lat = toFiniteNumber(rawPoint.lat, NaN);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const strength = rawPoint.strength === undefined && rawPoint.weight !== undefined
    ? 1 + (toFiniteNumber(rawPoint.weight, 0) * 0.35)
    : toFiniteNumber(rawPoint.strength, 1);
  return {
    id: String(rawPoint.id || `point-${index + 1}`).trim() || `point-${index + 1}`,
    lon: clampNumber(lon, -180, 180),
    lat: clampNumber(lat, -90, 90),
    strength: clampNumber(strength, INTENSITY_FIELD_GRID.min, INTENSITY_FIELD_GRID.max),
    radiusDeg: clampNumber(toFiniteNumber(rawPoint.radiusDeg, toFiniteNumber(rawPoint.radiusKm, 500) / 111), 0.25, 30),
    falloff: String(rawPoint.falloff || "smooth").trim().toLowerCase() === "linear" ? "linear" : "smooth",
  };
}

export function createIntensityFieldChannel(channelId, rawChannel = {}) {
  const normalizedChannelId = INTENSITY_FIELD_CHANNELS[channelId] ? channelId : "physicalAtlas";
  const raw = rawChannel && typeof rawChannel === "object" ? rawChannel : {};
  const channel = {
    schemaVersion: 1,
    channelId: normalizedChannelId,
    enabled: raw.enabled === undefined ? false : !!raw.enabled,
    revision: Math.max(0, Math.round(toFiniteNumber(raw.revision, 0))),
    grid: {
      bounds: [...INTENSITY_FIELD_GRID.bounds],
      columns: INTENSITY_FIELD_GRID.columns,
      rows: INTENSITY_FIELD_GRID.rows,
      base: normalizeGridValues(raw.grid?.base || raw.base),
      composite: normalizeGridValues(raw.grid?.composite || raw.composite),
    },
    points: (Array.isArray(raw.points) ? raw.points : [])
      .map(normalizeIntensityPoint)
      .filter(Boolean),
  };
  bakeIntensityComposite(channel);
  return channel;
}

export function createIntensityFieldsState(rawState = {}) {
  const raw = rawState && typeof rawState === "object" ? rawState : {};
  const rawChannels = raw.channels && typeof raw.channels === "object" ? raw.channels : raw;
  const channels = {};
  INTENSITY_FIELD_CHANNEL_IDS.forEach((channelId) => {
    channels[channelId] = createIntensityFieldChannel(channelId, rawChannels[channelId]);
  });
  return {
    schemaVersion: 1,
    channels,
  };
}

function getGridIndex(column, row) {
  const wrappedColumn = ((column % INTENSITY_FIELD_GRID.columns) + INTENSITY_FIELD_GRID.columns) % INTENSITY_FIELD_GRID.columns;
  const clampedRow = clampNumber(row, 0, INTENSITY_FIELD_GRID.rows - 1);
  return clampedRow * INTENSITY_FIELD_GRID.columns + wrappedColumn;
}

function getCellLonLat(column, row) {
  const lonStep = 360 / INTENSITY_FIELD_GRID.columns;
  const latStep = 180 / INTENSITY_FIELD_GRID.rows;
  return {
    lon: -180 + ((column + 0.5) * lonStep),
    lat: 90 - ((row + 0.5) * latStep),
  };
}

function getWrappedLonDelta(left, right) {
  const raw = Math.abs(left - right);
  return Math.min(raw, 360 - raw);
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = clampNumber((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - (2 * t));
}

function getPointInfluence(point, lon, lat) {
  const dx = getWrappedLonDelta(point.lon, lon);
  const dy = Math.abs(point.lat - lat);
  const distance = Math.hypot(dx, dy);
  if (distance > point.radiusDeg) return 0;
  const linear = 1 - (distance / Math.max(0.0001, point.radiusDeg));
  return point.falloff === "linear" ? linear : smoothstep(0, 1, linear);
}

export function bakeIntensityComposite(channel) {
  const target = channel && typeof channel === "object" ? channel : createIntensityFieldChannel("physicalAtlas");
  const base = normalizeGridValues(target.grid?.base || target.base);
  const composite = new Float32Array(base);
  // points 是可解释的编辑意图，composite 是渲染热路径读取的烘焙结果；每次写入后都重建一次。
  const points = (Array.isArray(target.points) ? target.points : [])
    .map(normalizeIntensityPoint)
    .filter(Boolean);
  if (points.length) {
    for (let row = 0; row < INTENSITY_FIELD_GRID.rows; row += 1) {
      for (let column = 0; column < INTENSITY_FIELD_GRID.columns; column += 1) {
        const { lon, lat } = getCellLonLat(column, row);
        let influenceTotal = 0;
        let weightedTotal = 0;
        points.forEach((point) => {
          const influence = getPointInfluence(point, lon, lat);
          if (influence <= 0) return;
          influenceTotal += influence;
          weightedTotal += influence * point.strength;
        });
        if (influenceTotal > 0) {
          const baked = weightedTotal / influenceTotal;
          const blend = clampNumber(influenceTotal, 0, 1);
          const index = getGridIndex(column, row);
          composite[index] = clampNumber(base[index] + ((baked - base[index]) * blend), INTENSITY_FIELD_GRID.min, INTENSITY_FIELD_GRID.max);
        }
      }
    }
  }
  target.grid = {
    bounds: [...INTENSITY_FIELD_GRID.bounds],
    columns: INTENSITY_FIELD_GRID.columns,
    rows: INTENSITY_FIELD_GRID.rows,
    base,
    composite,
  };
  target.points = points;
  return target;
}

export function stampIntensityBrush(channel, { lon, lat, radiusDeg = 3, strength = 1, mode = "paint" } = {}) {
  const target = bakeIntensityComposite(channel);
  const centerLon = clampNumber(toFiniteNumber(lon, 0), -180, 180);
  const centerLat = clampNumber(toFiniteNumber(lat, 0), -90, 90);
  const radius = clampNumber(toFiniteNumber(radiusDeg, 3), 0.25, 30);
  const nextStrength = mode === "erase"
    ? INTENSITY_FIELD_GRID.neutral
    : clampNumber(toFiniteNumber(strength, INTENSITY_FIELD_GRID.neutral), INTENSITY_FIELD_GRID.min, INTENSITY_FIELD_GRID.max);
  let minColumn = INTENSITY_FIELD_GRID.columns;
  let minRow = INTENSITY_FIELD_GRID.rows;
  let maxColumn = 0;
  let maxRow = 0;
  let touched = false;
  // brush 直接写 base grid，并返回受影响矩形，方便 history 或后续局部同步只保存变更窗口。
  for (let row = 0; row < INTENSITY_FIELD_GRID.rows; row += 1) {
    for (let column = 0; column < INTENSITY_FIELD_GRID.columns; column += 1) {
      const { lon: cellLon, lat: cellLat } = getCellLonLat(column, row);
      const influence = getPointInfluence({ lon: centerLon, lat: centerLat, radiusDeg: radius, falloff: "smooth" }, cellLon, cellLat);
      if (influence <= 0) continue;
      const index = getGridIndex(column, row);
      target.grid.base[index] = clampNumber(
        target.grid.base[index] + ((nextStrength - target.grid.base[index]) * influence),
        INTENSITY_FIELD_GRID.min,
        INTENSITY_FIELD_GRID.max,
      );
      minColumn = Math.min(minColumn, column);
      minRow = Math.min(minRow, row);
      maxColumn = Math.max(maxColumn, column);
      maxRow = Math.max(maxRow, row);
      touched = true;
    }
  }
  bakeIntensityComposite(target);
  return touched ? { x: minColumn, y: minRow, width: maxColumn - minColumn + 1, height: maxRow - minRow + 1 } : null;
}

export function sampleIntensityField(fieldsState, channelId, lon, lat) {
  const fields = fieldsState?.channels?.[channelId]?.grid?.composite
    ? fieldsState
    : createIntensityFieldsState(fieldsState);
  const channel = fields.channels[channelId];
  if (!channel?.enabled) return INTENSITY_FIELD_GRID.neutral;
  const values = channel.grid?.composite;
  if (!values || !values.length) return INTENSITY_FIELD_GRID.neutral;
  const normalizedLon = ((clampNumber(toFiniteNumber(lon, 0), -180, 180) + 180) / 360) * INTENSITY_FIELD_GRID.columns;
  const normalizedLat = ((90 - clampNumber(toFiniteNumber(lat, 0), -90, 90)) / 180) * INTENSITY_FIELD_GRID.rows;
  const x0 = Math.floor(normalizedLon);
  const y0 = clampNumber(Math.floor(normalizedLat), 0, INTENSITY_FIELD_GRID.rows - 1);
  const tx = normalizedLon - x0;
  const ty = normalizedLat - y0;
  const y1 = clampNumber(y0 + 1, 0, INTENSITY_FIELD_GRID.rows - 1);
  const v00 = values[getGridIndex(x0, y0)];
  const v10 = values[getGridIndex(x0 + 1, y0)];
  const v01 = values[getGridIndex(x0, y1)];
  const v11 = values[getGridIndex(x0 + 1, y1)];
  const top = v00 + ((v10 - v00) * tx);
  const bottom = v01 + ((v11 - v01) * tx);
  return clampNumber(top + ((bottom - top) * ty), INTENSITY_FIELD_GRID.min, INTENSITY_FIELD_GRID.max);
}

export function extractFieldRectPatch(channel, rect) {
  const source = bakeIntensityComposite(channel);
  const x = clampNumber(Math.round(rect?.x || 0), 0, INTENSITY_FIELD_GRID.columns - 1);
  const y = clampNumber(Math.round(rect?.y || 0), 0, INTENSITY_FIELD_GRID.rows - 1);
  const width = clampNumber(Math.round(rect?.width || 0), 0, INTENSITY_FIELD_GRID.columns - x);
  const height = clampNumber(Math.round(rect?.height || 0), 0, INTENSITY_FIELD_GRID.rows - y);
  const values = [];
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      values.push(source.grid.base[getGridIndex(column, row)]);
    }
  }
  return { x, y, width, height, values };
}

export function applyFieldRectPatch(channel, patch) {
  const target = bakeIntensityComposite(channel);
  const x = clampNumber(Math.round(patch?.x || 0), 0, INTENSITY_FIELD_GRID.columns - 1);
  const y = clampNumber(Math.round(patch?.y || 0), 0, INTENSITY_FIELD_GRID.rows - 1);
  const width = clampNumber(Math.round(patch?.width || 0), 0, INTENSITY_FIELD_GRID.columns - x);
  const height = clampNumber(Math.round(patch?.height || 0), 0, INTENSITY_FIELD_GRID.rows - y);
  const values = Array.isArray(patch?.values) ? patch.values : [];
  let cursor = 0;
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      target.grid.base[getGridIndex(column, row)] = clampNumber(
        toFiniteNumber(values[cursor], INTENSITY_FIELD_GRID.neutral),
        INTENSITY_FIELD_GRID.min,
        INTENSITY_FIELD_GRID.max,
      );
      cursor += 1;
    }
  }
  bakeIntensityComposite(target);
  return target;
}
