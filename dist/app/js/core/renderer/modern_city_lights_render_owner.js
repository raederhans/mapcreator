const defaultColorManager = {
  normalizeHexColor: () => null,
  hexToRgb: () => null,
};

export function createModernCityLightsRenderOwner({ state = {}, constants = {}, getters = {}, helpers = {} } = {}) {
  const runtimeState = state;
  const {
    MODERN_CITY_LIGHTS_BASE_THRESHOLD = 0,
    MODERN_CITY_LIGHTS_CORRIDOR_THRESHOLD = Number.POSITIVE_INFINITY,
    MODERN_CITY_LIGHTS_GRID = [],
    MODERN_CITY_LIGHTS_GRID_HEIGHT = 0,
    MODERN_CITY_LIGHTS_GRID_WIDTH = 0,
    MODERN_CITY_LIGHTS_STATS = null,
    MODERN_CITY_LIGHTS_STEP_LAT_DEG = 1,
    MODERN_CITY_LIGHTS_STEP_LON_DEG = 1,
  } = constants;
  const {
    getContext = () => null,
    getPathCanvas = () => null,
    getProjection = () => null,
  } = getters;
  const {
    buildNightHemisphereFeature = () => null,
    clamp = (value, min, max) => Math.max(min, Math.min(max, value)),
    ColorManager = defaultColorManager,
    createCanvas = () => null,
    estimateProjectedAreaPx = () => 0,
    getCityAnchor = () => null,
    getCityCanonicalId = () => '',
    getCityCapitalScore = () => 0,
    getCityGeoCoordinates = () => null,
    getCityScreenPoint = () => null,
    getDefaultZoomTransform = () => ({ x: 0, y: 0, k: 1 }),
    getEffectiveCityCollection = () => ({ type: 'FeatureCollection', features: [] }),
    getFeatureGeoCentroid = () => null,
    getModernCityLightsProjectionKey = () => '',
    getNightLightPalette = () => ({}),
    getRenderPassLayout = () => null,
    getSafeBlendMode = (preferred, fallback) => preferred || fallback,
    getTransformSignature = () => '',
    getUrbanCityPolicyOwner = () => null,
    getUrbanGlowMultiplierAt = () => 1,
    getUrbanLightWeight = () => 0,
    normalizeDayNightStyleConfig = (config) => config || {},
    normalizeIntensityFieldsState = (fields) => fields || {},
    normalizeLongitude = (value) => value,
    pathBoundsInScreen = () => false,
    prepareTargetContext = () => null,
    recordRenderPerfMetric = () => {},
    sampleIntensityField = () => null,
    stableJson = (value) => JSON.stringify(value),
    stringHash = (value) => {
      let hash = 0;
      const text = String(value || '');
      for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
      }
      return Math.abs(hash);
    },
    withRenderTarget = (targetContext, callback) => callback?.(),
  } = helpers;

  const modernCityLightsGeometryCache = {
    projectionKey: '',
    baseEntries: [],
    corridorEntries: [],
  };
  const modernCityLightsPopulationBoostCache = {
    cityCollection: null,
    urbanCollection: null,
    cityLayerRevision: -1,
    scenarioId: '',
    urbanEntries: [],
    cityEntries: [],
  };
  const modernCityLightsStaticLayerCache = {
    key: '',
    canvas: null,
    width: 0,
    height: 0,
  };

  function getZoomTransform() {
    return runtimeState.zoomTransform || getDefaultZoomTransform();
  }

  function getModernCityLightsGridValue(x, y) {
    const wrappedX = ((Math.round(x) % MODERN_CITY_LIGHTS_GRID_WIDTH) + MODERN_CITY_LIGHTS_GRID_WIDTH)
      % MODERN_CITY_LIGHTS_GRID_WIDTH;
    const clampedY = clamp(Math.round(y), 0, MODERN_CITY_LIGHTS_GRID_HEIGHT - 1);
    return MODERN_CITY_LIGHTS_GRID[(clampedY * MODERN_CITY_LIGHTS_GRID_WIDTH) + wrappedX] || 0;
  }
  
  function getModernCityLightsNormalizationDenominator() {
    const p90 = Number(MODERN_CITY_LIGHTS_STATS?.p90 ?? MODERN_CITY_LIGHTS_STATS?.p90_nonzero ?? 0);
    if (Number.isFinite(p90) && p90 > 0) {
      return Math.max(20, p90 * 0.82);
    }
    const maxValue = Number(MODERN_CITY_LIGHTS_STATS?.max ?? 255);
    if (Number.isFinite(maxValue) && maxValue > 0) {
      return Math.max(20, maxValue * 0.72);
    }
    return 255;
  }
  
  function normalizeModernCityLightsValue(value) {
    return clamp(Number(value || 0) / Math.max(getModernCityLightsNormalizationDenominator(), 0.0001), 0, 1);
  }
  
  function sampleModernCityLightsGridNormalized(lon, lat) {
    if (!MODERN_CITY_LIGHTS_GRID?.length) return 0;
    const normalizedLon = (
      (normalizeLongitude(lon) + 180) / Math.max(MODERN_CITY_LIGHTS_STEP_LON_DEG, 0.0001)
    ) - 0.5;
    const normalizedLat = clamp(
      ((90 - clamp(lat, -89.999, 89.999)) / Math.max(MODERN_CITY_LIGHTS_STEP_LAT_DEG, 0.0001)) - 0.5,
      0,
      MODERN_CITY_LIGHTS_GRID_HEIGHT - 1
    );
    const x0 = Math.floor(normalizedLon);
    const y0 = Math.floor(normalizedLat);
    const tx = normalizedLon - x0;
    const ty = normalizedLat - y0;
    const y1 = Math.min(MODERN_CITY_LIGHTS_GRID_HEIGHT - 1, y0 + 1);
    const v00 = getModernCityLightsGridValue(x0, y0);
    const v10 = getModernCityLightsGridValue(x0 + 1, y0);
    const v01 = getModernCityLightsGridValue(x0, y1);
    const v11 = getModernCityLightsGridValue(x0 + 1, y1);
    const top = v00 + ((v10 - v00) * tx);
    const bottom = v01 + ((v11 - v01) * tx);
    return normalizeModernCityLightsValue(top + ((bottom - top) * ty));
  }
  
  function getModernCityLightsGeometry() {
    const projection = getProjection();
    const projectionKey = getModernCityLightsProjectionKey();
    if (
      modernCityLightsGeometryCache.projectionKey === projectionKey &&
      Array.isArray(modernCityLightsGeometryCache.baseEntries) &&
      modernCityLightsGeometryCache.baseEntries.length
    ) {
      return modernCityLightsGeometryCache;
    }
  
    const baseEntries = [];
    const corridorEntries = [];
    const halfLon = MODERN_CITY_LIGHTS_STEP_LON_DEG * 0.5;
    const halfLat = MODERN_CITY_LIGHTS_STEP_LAT_DEG * 0.5;
  
    for (let y = 0; y < MODERN_CITY_LIGHTS_GRID_HEIGHT; y += 1) {
      const lat = 90 - ((y + 0.5) * MODERN_CITY_LIGHTS_STEP_LAT_DEG);
      for (let x = 0; x < MODERN_CITY_LIGHTS_GRID_WIDTH; x += 1) {
        const value = MODERN_CITY_LIGHTS_GRID[(y * MODERN_CITY_LIGHTS_GRID_WIDTH) + x] || 0;
        if (value < MODERN_CITY_LIGHTS_BASE_THRESHOLD) continue;
  
        const lon = -180 + ((x + 0.5) * MODERN_CITY_LIGHTS_STEP_LON_DEG);
        const center = projection ? projection([lon, lat]) : null;
        const east = projection ? projection([normalizeLongitude(lon + halfLon), lat]) : null;
        const west = projection ? projection([normalizeLongitude(lon - halfLon), lat]) : null;
        const north = projection ? projection([lon, clamp(lat + halfLat, -89.999, 89.999)]) : null;
        const south = projection ? projection([lon, clamp(lat - halfLat, -89.999, 89.999)]) : null;
        if (
          !Array.isArray(center) ||
          !Array.isArray(east) ||
          !Array.isArray(west) ||
          !Array.isArray(north) ||
          !Array.isArray(south)
        ) {
          continue;
        }
        const values = [...center, ...east, ...west, ...north, ...south];
        if (!values.every((entry) => Number.isFinite(Number(entry)))) continue;
  
        const ewDx = east[0] - west[0];
        const ewDy = east[1] - west[1];
        const nsDx = north[0] - south[0];
        const nsDy = north[1] - south[1];
        const rx = Math.hypot(ewDx, ewDy) * 0.5;
        const ry = Math.hypot(nsDx, nsDy) * 0.5;
        if (!Number.isFinite(rx) || !Number.isFinite(ry) || rx <= 0.02 || ry <= 0.02 || rx > 12 || ry > 12) {
          continue;
        }
        const aspectRatio = Math.max(rx, ry) / Math.max(Math.min(rx, ry), 0.01);
        if (aspectRatio > 3.5) continue;
        const maxRadius = Math.min(rx, ry) * 2.2;
        const clampedRx = Math.min(rx, maxRadius);
        const clampedRy = Math.min(ry, maxRadius);
  
        let neighborCount = 0;
        const visitedNeighborIndices = new Set();
        const currentIndex = (y * MODERN_CITY_LIGHTS_GRID_WIDTH) + x;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = ((x + dx) % MODERN_CITY_LIGHTS_GRID_WIDTH + MODERN_CITY_LIGHTS_GRID_WIDTH) % MODERN_CITY_LIGHTS_GRID_WIDTH;
            const ny = clamp(y + dy, 0, MODERN_CITY_LIGHTS_GRID_HEIGHT - 1);
            const neighborIndex = (ny * MODERN_CITY_LIGHTS_GRID_WIDTH) + nx;
            if (neighborIndex === currentIndex) continue;
            if (visitedNeighborIndices.has(neighborIndex)) continue;
            visitedNeighborIndices.add(neighborIndex);
            if (MODERN_CITY_LIGHTS_GRID[neighborIndex] >= MODERN_CITY_LIGHTS_BASE_THRESHOLD) {
              neighborCount += 1;
            }
          }
        }
  
        const entry = {
          lon,
          lat,
          x: center[0],
          y: center[1],
          rx: clampedRx,
          ry: clampedRy,
          rotation: Math.atan2(ewDy, ewDx),
          gridX: x,
          gridY: y,
          value,
          neighborCount,
        };
        baseEntries.push(entry);
        if (value >= MODERN_CITY_LIGHTS_CORRIDOR_THRESHOLD) {
          corridorEntries.push(entry);
        }
      }
    }
  
    modernCityLightsGeometryCache.projectionKey = projectionKey;
    modernCityLightsGeometryCache.baseEntries = baseEntries;
    modernCityLightsGeometryCache.corridorEntries = corridorEntries;
    return modernCityLightsGeometryCache;
  }
  
  function shouldCullModernLightEntry(entry, overscan = 48) {
    const transform = getZoomTransform();
    const screenX = (entry.x * transform.k) + transform.x;
    const screenY = (entry.y * transform.k) + transform.y;
    return (
      screenX < -overscan ||
      screenX > runtimeState.width + overscan ||
      screenY < -overscan ||
      screenY > runtimeState.height + overscan
    );
  }
  
  function drawLightEllipse(x, y, rx, ry, rotation = 0) {
    const context = getContext();
    if (!context) return;
    if (typeof context.ellipse === "function") {
      context.beginPath();
      context.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
      context.fill();
      return;
    }
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.scale(Math.max(rx, 0.0001), Math.max(ry, 0.0001));
    context.beginPath();
    context.arc(0, 0, 1, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  
  function getLightBlobRgb(color) {
    const normalized = ColorManager.normalizeHexColor(color);
    const rgb = normalized ? ColorManager.hexToRgb(normalized) : null;
    if (rgb) return rgb;
    return { r: 255, g: 255, b: 255 };
  }
  
  function toRgbaString(rgb, alpha = 1) {
    const resolvedAlpha = clamp(Number(alpha) || 0, 0, 1);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${resolvedAlpha})`;
  }
  
  function drawSoftLightBlob(
    x,
    y,
    rx,
    ry,
    {
      rotation = 0,
      rgb = { r: 255, g: 255, b: 255 },
      alpha = 1,
      innerStop = 0.1,
      midStop = 0.5,
      innerAlphaScale = 0.88,
      midAlphaScale = 0.28,
    } = {},
  ) {
    const context = getContext();
    if (!context) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const resolvedRx = Math.max(Number(rx) || 0, 0.0001);
    const resolvedRy = Math.max(Number(ry) || 0, 0.0001);
    const resolvedAlpha = clamp(Number(alpha) || 0, 0, 1);
    if (resolvedAlpha <= 0.0001) return;
  
    context.save();
    context.translate(x, y);
    context.rotate(Number(rotation) || 0);
    context.scale(resolvedRx, resolvedRy);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, toRgbaString(rgb, resolvedAlpha * innerAlphaScale));
    gradient.addColorStop(
      clamp(Number(innerStop) || 0.1, 0.01, 0.92),
      toRgbaString(rgb, resolvedAlpha * Math.max(innerAlphaScale, midAlphaScale)),
    );
    gradient.addColorStop(
      clamp(Number(midStop) || 0.5, 0.08, 0.97),
      toRgbaString(rgb, resolvedAlpha * midAlphaScale),
    );
    gradient.addColorStop(1, toRgbaString(rgb, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, 1, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  
  function getModernCityLightsZoomProfile() {
    const zoomScale = Math.max(0.0001, Number(runtimeState.zoomTransform?.k || 1));
    const fadeT = clamp((zoomScale - 1) / 2.5, 0, 1);
    const detailT = clamp((zoomScale - 0.9) / 1.6, 0, 1);
    return {
      zoomScale,
      fadeT,
      detailT,
      textureAlphaScale: 1.05 + (fadeT * 0.44),
      corridorAlphaScale: 1.08 + (fadeT * 0.46),
      textureRadiusScale: 0.98 + (detailT * 0.22),
      corridorRadiusScale: 0.96 + (detailT * 0.18),
      textureJitterStrength: 0.2 + (detailT * 0.06),
      corridorJitterStrength: 0.12 + (detailT * 0.04),
      coreAlphaScale: 1.02 + (fadeT * 0.62),
      coreRadiusScale: 0.96 + (detailT * 0.3),
    };
  }
  
  const DEFAULT_MODERN_DAY_NIGHT_CONFIG = normalizeDayNightStyleConfig({});
  
  function getModernDayNightNumber(config, key) {
    const parsed = Number(config?.[key]);
    return Number.isFinite(parsed) ? parsed : DEFAULT_MODERN_DAY_NIGHT_CONFIG[key];
  }
  
  function isModernPopulationBoostEnabled(config) {
    return config?.cityLightsPopulationBoostEnabled === undefined
      ? DEFAULT_MODERN_DAY_NIGHT_CONFIG.cityLightsPopulationBoostEnabled
      : !!config.cityLightsPopulationBoostEnabled;
  }
  
  function getModernPopulationBoostStrength(config) {
    if (!isModernPopulationBoostEnabled(config)) return 0;
    return clamp(getModernDayNightNumber(config, "cityLightsPopulationBoostStrength"), 0, 1.5);
  }
  
  function getModernCityLightsPopulationBoostData() {
    const cityCollection = getEffectiveCityCollection();
    const urbanCollection = runtimeState.urbanData;
    const cityLayerRevision = Number(runtimeState.cityLayerRevision || 0);
    const scenarioId = String(runtimeState.activeScenarioId || "");
    if (
      modernCityLightsPopulationBoostCache.cityCollection === cityCollection
      && modernCityLightsPopulationBoostCache.urbanCollection === urbanCollection
      && modernCityLightsPopulationBoostCache.cityLayerRevision === cityLayerRevision
      && modernCityLightsPopulationBoostCache.scenarioId === scenarioId
    ) {
      return modernCityLightsPopulationBoostCache;
    }
  
    const urbanIndex = getUrbanCityPolicyOwner().getUrbanFeatureIndex();
    const urbanEntriesById = new Map();
    const unmatchedCityEntries = [];
    if (Array.isArray(cityCollection?.features)) {
      cityCollection.features.forEach((feature) => {
        const props = feature?.properties || {};
        const population = Math.max(0, Number(props.__city_population || 0));
        const capitalScore = getCityCapitalScore(feature);
        const urbanInfo = getUrbanCityPolicyOwner().getCityUrbanRuntimeInfo(feature, urbanIndex);
        if (urbanInfo.hasUrbanMatch) {
          const current = urbanEntriesById.get(urbanInfo.urbanMatchId) || {
            urbanId: urbanInfo.urbanMatchId,
            urbanFeature: urbanInfo.urbanFeature,
            populationSum: 0,
            cityCount: 0,
            capitalScore: 0,
          };
          current.populationSum += population;
          current.cityCount += 1;
          current.capitalScore = Math.max(current.capitalScore, capitalScore);
          urbanEntriesById.set(urbanInfo.urbanMatchId, current);
          return;
        }
        if (capitalScore > 0 || population >= 150000) {
          unmatchedCityEntries.push({
            feature,
            population,
            capitalScore,
          });
        }
      });
    }
  
    const urbanEntries = Array.from(urbanEntriesById.values())
      .map((entry) => {
        const areaSqKm = Math.max(
          0.01,
          Number(entry.urbanFeature?.properties?.area_sqkm ?? entry.urbanFeature?.properties?.AREA_SQKM ?? 0.01)
        );
        return {
          ...entry,
          areaSqKm,
          density: entry.populationSum / areaSqKm,
        };
      })
      .filter((entry) => entry.populationSum >= 100000 || entry.capitalScore > 0)
      .sort((left, right) => (
        (right.populationSum + (right.density * 1200))
        - (left.populationSum + (left.density * 1200))
      ));
  
    unmatchedCityEntries.sort((left, right) => (
      (right.population + (right.capitalScore * 1_000_000))
      - (left.population + (left.capitalScore * 1_000_000))
    ));
  
    modernCityLightsPopulationBoostCache.cityCollection = cityCollection;
    modernCityLightsPopulationBoostCache.urbanCollection = urbanCollection;
    modernCityLightsPopulationBoostCache.cityLayerRevision = cityLayerRevision;
    modernCityLightsPopulationBoostCache.scenarioId = scenarioId;
    modernCityLightsPopulationBoostCache.urbanEntries = urbanEntries;
    modernCityLightsPopulationBoostCache.cityEntries = unmatchedCityEntries;
    return modernCityLightsPopulationBoostCache;
  }
  
  function getSignedHashUnit(seed) {
    return (((stringHash(seed) >>> 0) % 2001) / 1000) - 1;
  }
  
  function getModernGridEntryJitter(entry, strength = 0.18) {
    const resolvedStrength = clamp(Number(strength) || 0, 0, 0.4);
    const dx = getSignedHashUnit(`${entry?.gridX ?? 0}:${entry?.gridY ?? 0}:x`)
      * Math.max(Number(entry?.rx) || 0, 0.0001)
      * resolvedStrength;
    const dy = getSignedHashUnit(`${entry?.gridX ?? 0}:${entry?.gridY ?? 0}:y`)
      * Math.max(Number(entry?.ry) || 0, 0.0001)
      * resolvedStrength;
    return { dx, dy };
  }
  
  function getModernCityLightLatitudeFade(gridY) {
    const cellLat = 90 - ((gridY + 0.5) * MODERN_CITY_LIGHTS_STEP_LAT_DEG);
    const absLat = Math.abs(cellLat);
    if (absLat <= 72) return 1;
    return clamp(1 - ((absLat - 72) / 16), 0.15, 1);
  }
  
  function drawModernCityLightsTexture(config, intensity) {
    const textureOpacity = clamp(getModernDayNightNumber(config, "cityLightsTextureOpacity"), 0, 1);
    if (textureOpacity <= 0) return;
    const palette = getNightLightPalette("modern");
    const geometry = getModernCityLightsGeometry();
    const zoomProfile = getModernCityLightsZoomProfile();
    const textureRgb = getLightBlobRgb(palette.texture);
    const coreSharpness = clamp(getModernDayNightNumber(config, "cityLightsCoreSharpness"), 0, 1);
    const corridorStrength = clamp(getModernDayNightNumber(config, "cityLightsCorridorStrength"), 0, 1);
    const populationBoostStrength = getModernPopulationBoostStrength(config);
    const overscan = Math.max(32, Math.min(runtimeState.width, runtimeState.height) * 0.06);
  
    geometry.baseEntries.forEach((entry) => {
      if (shouldCullModernLightEntry(entry, overscan)) return;
      const glowMultiplier = getUrbanGlowMultiplierAt(entry.lon, entry.lat);
      const normalized = normalizeModernCityLightsValue(entry.value);
      const lumaWeight = Math.pow(normalized, 0.78);
      const populationBoostAlpha = 1 + (populationBoostStrength * Math.pow(normalized, 0.68) * 0.28);
      const textureOpacityScale = 0.18 + (textureOpacity * 0.82);
      const corridorBandAlpha = 1 + (corridorStrength * clamp(entry.neighborCount / 8, 0, 1) * 0.3);
      const densityDampen = entry.neighborCount >= 7 ? 0.94
        : entry.neighborCount >= 5 ? 0.98
          : entry.neighborCount >= 3 ? 1.02
        : 1.0;
      const isolationAlphaBoost = entry.neighborCount <= 1 ? 0.06 : 0;
      const latFade = getModernCityLightLatitudeFade(entry.gridY);
      const baseAlpha = clamp(
        intensity
        * textureOpacityScale
        * (0.12 + (lumaWeight * 0.5))
        * zoomProfile.textureAlphaScale
        * densityDampen
        * populationBoostAlpha
        * corridorBandAlpha
        * latFade,
        0,
        0.38
      );
      const alpha = clamp(baseAlpha * glowMultiplier, 0, 0.34);
      if (alpha <= 0.002) return;
      const jitter = getModernGridEntryJitter(entry, zoomProfile.textureJitterStrength);
      const isolationSpread = entry.neighborCount <= 1 ? 1.38
        : entry.neighborCount <= 3 ? 1.08
        : 1.0;
      const sharpnessSpread = 1.08 - (coreSharpness * 0.22);
      const radiusScale = (zoomProfile.textureRadiusScale + (lumaWeight * (0.1 + (corridorStrength * 0.08))))
        * isolationSpread
        * sharpnessSpread;
      const blobRx = entry.rx * radiusScale;
      const blobRy = entry.ry * radiusScale;
      drawSoftLightBlob(
        entry.x + jitter.dx,
        entry.y + jitter.dy,
        blobRx,
        blobRy,
        {
          rotation: entry.rotation,
          rgb: textureRgb,
          alpha,
          innerStop: 0.06,
          midStop: 0.7,
          innerAlphaScale: clamp(0.9 + (coreSharpness * 0.18) + isolationAlphaBoost, 0, 1.12),
          midAlphaScale: 0.18 + ((1 - coreSharpness) * 0.14),
        }
      );
    });
  }
  
  function drawModernCityLightsCorridors(config, intensity) {
    const corridorStrength = clamp(getModernDayNightNumber(config, "cityLightsCorridorStrength"), 0, 1);
    if (corridorStrength <= 0) return;
    const palette = getNightLightPalette("modern");
    const geometry = getModernCityLightsGeometry();
    const zoomProfile = getModernCityLightsZoomProfile();
    const corridorRgb = getLightBlobRgb(palette.corridor);
    const coreSharpness = clamp(getModernDayNightNumber(config, "cityLightsCoreSharpness"), 0, 1);
    const populationBoostStrength = getModernPopulationBoostStrength(config);
    const overscan = Math.max(40, Math.min(runtimeState.width, runtimeState.height) * 0.08);
  
    geometry.corridorEntries.forEach((entry) => {
      if (shouldCullModernLightEntry(entry, overscan)) return;
      const glowMultiplier = getUrbanGlowMultiplierAt(entry.lon, entry.lat);
      const normalized = normalizeModernCityLightsValue(entry.value);
      const corridorWeight = Math.pow(normalized, 0.82);
      const populationBoostAlpha = 1 + (populationBoostStrength * Math.pow(normalized, 0.72) * 0.18);
      const corridorStrengthScale = 0.18 + (corridorStrength * 0.82);
      const latFade = getModernCityLightLatitudeFade(entry.gridY);
      const baseAlpha = clamp(
        intensity
        * corridorStrengthScale
        * (0.1 + (corridorWeight * 0.52))
        * zoomProfile.corridorAlphaScale
        * populationBoostAlpha
        * latFade,
        0,
        0.34
      );
      const alpha = clamp(baseAlpha * glowMultiplier, 0, 0.32);
      if (alpha <= 0.003) return;
      const jitter = getModernGridEntryJitter(entry, zoomProfile.corridorJitterStrength);
      const baseRadius = Math.max((entry.rx + entry.ry) * 0.5, 0.0001);
      const sharpnessSpread = 1.05 - (coreSharpness * 0.14);
      const majorRadius = baseRadius
        * (zoomProfile.corridorRadiusScale + 0.04 + (corridorStrength * 0.24) + (corridorWeight * 0.16))
        * sharpnessSpread;
      drawSoftLightBlob(
        entry.x + jitter.dx,
        entry.y + jitter.dy,
        majorRadius,
        majorRadius * 1.02,
        {
          rotation: entry.rotation * 0.18,
          rgb: corridorRgb,
          alpha,
          innerStop: 0.05,
          midStop: 0.56,
          innerAlphaScale: 0.94,
          midAlphaScale: 0.16 + ((1 - coreSharpness) * 0.1),
        }
      );
    });
  }
  
  function collectModernUrbanCoreEntries(k, config, intensity) {
    const pathCanvas = getPathCanvas();
    if (!pathCanvas) return [];
    if (!Array.isArray(runtimeState.urbanData?.features) || !runtimeState.urbanData.features.length) return [];
    const textureOpacity = clamp(getModernDayNightNumber(config, "cityLightsTextureOpacity"), 0, 1);
    const coreSharpness = clamp(getModernDayNightNumber(config, "cityLightsCoreSharpness"), 0, 1);
    const textureOpacityScale = 0.32 + (textureOpacity * 0.68);
    const transform = getZoomTransform();
    const zoomProfile = getModernCityLightsZoomProfile();
    const zoomScale = Math.max(0.0001, Number(transform?.k || 1));
    const minProjectedAreaPx = zoomScale <= 1.15 ? 4.6 : zoomScale <= 1.7 ? 3.2 : 2.2;
    const overscan = Math.max(32, Math.min(runtimeState.width, runtimeState.height) * 0.06);
    const entries = [];
  
    runtimeState.urbanData.features.forEach((feature) => {
      if (!pathBoundsInScreen(feature)) return;
      if (estimateProjectedAreaPx(feature, k) < minProjectedAreaPx) return;
  
      const heuristicWeight = getUrbanLightWeight(feature, "modern");
      if (heuristicWeight <= 0) return;
      if (zoomScale <= 1.15 && heuristicWeight < 0.72) return;
  
      const geographicCentroid = getFeatureGeoCentroid(feature);
      const sample = geographicCentroid
        ? sampleModernCityLightsGridNormalized(geographicCentroid[0], geographicCentroid[1])
        : 0;
      const glowMultiplier = geographicCentroid
        ? getUrbanGlowMultiplierAt(geographicCentroid[0], geographicCentroid[1])
        : 1;
      const sampledBoost = clamp(0.56 + (Math.pow(sample, 0.52) * 1.4), 0.8, 1.8);
      const weight = clamp(heuristicWeight * sampledBoost * glowMultiplier, 0.06, 1.4);
      if (sample <= 0.01 && heuristicWeight < 0.34) return;
      if (weight < 0.16) return;
      if (zoomScale <= 1.35 && weight < 0.44) return;
  
      const centroid = pathCanvas.centroid(feature);
      const cx = Number(centroid?.[0]);
      const cy = Number(centroid?.[1]);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
  
      const screenX = (cx * transform.k) + transform.x;
      const screenY = (cy * transform.k) + transform.y;
      if (
        screenX < -overscan ||
        screenX > runtimeState.width + overscan ||
        screenY < -overscan ||
        screenY > runtimeState.height + overscan
      ) {
        return;
      }
  
      const identitySeed = String(
        feature?.properties?.nameascii ||
        feature?.properties?.name ||
        feature?.properties?.NAME ||
        feature?.id ||
        `${cx}:${cy}`
      );
      const orientation = getSignedHashUnit(`${identitySeed}:rotation`) * (Math.PI / 60);
      const baseRadiusPx = 0.88 + (weight * (1.1 + (coreSharpness * 0.82)));
      const aspectRatio = clamp(1.04 + (coreSharpness * 0.06) + (sample * 0.06), 1.04, 1.18);
      const haloAlpha = clamp(
        intensity * weight * (0.14 + (textureOpacity * 0.18) + (sample * 0.22) + ((1 - coreSharpness) * 0.06)) * zoomProfile.coreAlphaScale,
        0,
        0.32
      );
      const coreAlpha = clamp(
        intensity * weight * textureOpacityScale * (0.34 + (coreSharpness * 0.48) + (sample * 0.34)) * zoomProfile.coreAlphaScale,
        0,
        0.48
      );
      entries.push({
        feature,
        cx,
        cy,
        screenX,
        screenY,
        weight,
        sample,
        orientation,
        baseRadiusPx,
        aspectRatio,
        haloAlpha,
        coreAlpha,
      });
    });
    return entries;
  }
  
  function drawModernCityLightsCores(k, config, _intensity, coreEntries = null) {
    const palette = getNightLightPalette("modern");
    const zoomProfile = getModernCityLightsZoomProfile();
    const haloRgb = getLightBlobRgb(palette.halo);
    const coreRgb = getLightBlobRgb(palette.core);
    const coreSharpness = clamp(getModernDayNightNumber(config, "cityLightsCoreSharpness"), 0, 1);
    const haloSpread = 1.35 - (coreSharpness * 0.2);
    const coreSpread = 1.25 - (coreSharpness * 0.22);
    const haloAlphaScale = 1 + ((1 - coreSharpness) * 0.2);
    const coreAlphaScale = 0.9 + (coreSharpness * 0.5);
    const coreInnerStop = 0.04 + ((1 - coreSharpness) * 0.06);
    const coreMidStop = 0.36 + ((1 - coreSharpness) * 0.18);
    const entries = Array.isArray(coreEntries) ? coreEntries : [];
    entries.forEach((entry) => {
      drawSoftLightBlob(
        entry.cx,
        entry.cy,
        (entry.baseRadiusPx * entry.aspectRatio * 1.12 * haloSpread * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        (entry.baseRadiusPx * 1.06 * haloSpread * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        {
          rotation: entry.orientation,
          rgb: haloRgb,
          alpha: entry.haloAlpha * haloAlphaScale,
          innerStop: 0.06 + ((1 - coreSharpness) * 0.04),
          midStop: 0.5 + ((1 - coreSharpness) * 0.16),
          innerAlphaScale: 0.94,
          midAlphaScale: 0.22 + ((1 - coreSharpness) * 0.12),
        }
      );
  
      drawSoftLightBlob(
        entry.cx,
        entry.cy,
        (entry.baseRadiusPx * entry.aspectRatio * 0.94 * coreSpread * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        (entry.baseRadiusPx * 0.88 * coreSpread * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        {
          rotation: entry.orientation,
          rgb: coreRgb,
          alpha: entry.coreAlpha * coreAlphaScale,
          innerStop: coreInnerStop,
          midStop: coreMidStop,
          innerAlphaScale: 1,
          midAlphaScale: 0.34 + (coreSharpness * 0.18),
        }
      );
    });
  }
  
  function drawModernCityFallbackLights(k, config, intensity, urbanCoreEntries = []) {
    const cityCollection = getEffectiveCityCollection();
    if (!Array.isArray(cityCollection?.features) || !cityCollection.features.length) return;
    const palette = getNightLightPalette("modern");
    const coreSharpness = clamp(getModernDayNightNumber(config, "cityLightsCoreSharpness"), 0, 1);
    const textureOpacity = clamp(getModernDayNightNumber(config, "cityLightsTextureOpacity"), 0, 1);
    const textureOpacityScale = 0.32 + (textureOpacity * 0.68);
    const zoomProfile = getModernCityLightsZoomProfile();
    const haloRgb = getLightBlobRgb(palette.halo);
    const coreRgb = getLightBlobRgb(palette.core);
    const zoomScale = Math.max(0.0001, Number(runtimeState.zoomTransform?.k || 1));
    const overscan = Math.max(28, Math.min(runtimeState.width, runtimeState.height) * 0.05);
    const urbanIndex = getUrbanCityPolicyOwner().getUrbanFeatureIndex();
    const minPopulation = zoomScale <= 1.1 ? 60000 : zoomScale <= 1.8 ? 30000 : 15000;
  
    cityCollection.features.forEach((feature) => {
      const props = feature?.properties || {};
      const population = Math.max(0, Number(props.__city_population || 0));
      const isCapital = !!props.__city_is_country_capital;
      if (!isCapital && population < minPopulation) return;
      if (getUrbanCityPolicyOwner().getCityUrbanRuntimeInfo(feature, urbanIndex).hasUrbanMatch) return;
      const anchor = getCityAnchor(feature);
      const screenPoint = getCityScreenPoint(anchor);
      if (!anchor || !screenPoint) return;
      if (
        screenPoint[0] < -overscan ||
        screenPoint[0] > runtimeState.width + overscan ||
        screenPoint[1] < -overscan ||
        screenPoint[1] > runtimeState.height + overscan
      ) {
        return;
      }
      const overlapsUrbanCore = urbanCoreEntries.some((entry) => (
        Math.hypot(entry.screenX - screenPoint[0], entry.screenY - screenPoint[1]) <= Math.max(18, entry.baseRadiusPx * 10)
      ));
      if (overlapsUrbanCore) return;
  
      const populationScore = clamp(Math.log10(population + 1) / 6.5, 0.18, 1);
      const geographicCoords = getCityGeoCoordinates(feature);
      const sample = geographicCoords
        ? sampleModernCityLightsGridNormalized(geographicCoords[0], geographicCoords[1])
        : 0;
      const glowMultiplier = geographicCoords
        ? getUrbanGlowMultiplierAt(geographicCoords[0], geographicCoords[1])
        : 1;
      const weight = clamp(
        ((isCapital ? 0.46 : 0.28) + (populationScore * 0.52) + (sample * 0.44)) * glowMultiplier,
        0.2,
        1.12
      );
      if (zoomScale <= 1.1 && weight < 0.45) return;
  
      const identitySeed = String(
        getCityCanonicalId(feature) ||
        props.name_en ||
        props.name ||
        feature?.id ||
        `${anchor[0]}:${anchor[1]}`
      );
      const orientation = getSignedHashUnit(`${identitySeed}:rotation`) * (Math.PI / 80);
      const baseRadiusPx = 0.58 + (weight * (0.82 + (coreSharpness * 0.46)));
      const aspectRatio = clamp(1.04 + (coreSharpness * 0.05) + (sample * 0.04), 1.04, 1.14);
      const haloSpread = 1.28 - (coreSharpness * 0.18);
      const coreSpread = 1.2 - (coreSharpness * 0.2);
      const haloAlphaScale = 1 + ((1 - coreSharpness) * 0.18);
      const coreAlphaScale = 0.9 + (coreSharpness * 0.48);
      const coreInnerStop = 0.04 + ((1 - coreSharpness) * 0.05);
      const coreMidStop = 0.36 + ((1 - coreSharpness) * 0.16);
      const haloAlpha = clamp(
        intensity * weight * (0.08 + (sample * 0.14) + ((1 - coreSharpness) * 0.04)) * zoomProfile.coreAlphaScale,
        0,
        0.30
      );
      const coreAlpha = clamp(
        intensity * weight * textureOpacityScale * (0.18 + (coreSharpness * 0.3) + (sample * 0.24)) * zoomProfile.coreAlphaScale,
        0,
        0.48
      );
  
      drawSoftLightBlob(
        anchor[0],
        anchor[1],
        (baseRadiusPx * aspectRatio * 1.14 * haloSpread * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        (baseRadiusPx * 1.04 * haloSpread * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        {
          rotation: orientation,
          rgb: haloRgb,
          alpha: haloAlpha * haloAlphaScale,
          innerStop: 0.05 + ((1 - coreSharpness) * 0.04),
          midStop: 0.48 + ((1 - coreSharpness) * 0.16),
          innerAlphaScale: 0.92,
          midAlphaScale: 0.22 + ((1 - coreSharpness) * 0.12),
        }
      );
  
      drawSoftLightBlob(
        anchor[0],
        anchor[1],
        (baseRadiusPx * aspectRatio * 0.98 * coreSpread * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        (baseRadiusPx * 0.94 * coreSpread * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        {
          rotation: orientation,
          rgb: coreRgb,
          alpha: coreAlpha * coreAlphaScale,
          innerStop: coreInnerStop,
          midStop: coreMidStop,
          innerAlphaScale: 1,
          midAlphaScale: 0.34 + (coreSharpness * 0.18),
        }
      );
    });
  }
  
  function drawModernCityLightsPopulationBoostLayer(k, config, intensity) {
    const pathCanvas = getPathCanvas();
    if (!pathCanvas) return;
    const boostStrength = getModernPopulationBoostStrength(config);
    if (boostStrength <= 0) return;
    const palette = getNightLightPalette("modern");
    const zoomProfile = getModernCityLightsZoomProfile();
    const textureOpacity = clamp(getModernDayNightNumber(config, "cityLightsTextureOpacity"), 0, 1);
    const corridorStrength = clamp(getModernDayNightNumber(config, "cityLightsCorridorStrength"), 0, 1);
    const textureOpacityScale = 0.32 + (textureOpacity * 0.68);
    const corridorHaloScale = 0.72 + (corridorStrength * 0.28);
    const haloRgb = getLightBlobRgb(palette.corridor);
    const coreRgb = getLightBlobRgb(palette.glint);
    const data = getModernCityLightsPopulationBoostData();
    const transform = getZoomTransform();
    const overscan = Math.max(32, Math.min(runtimeState.width, runtimeState.height) * 0.06);
  
    data.urbanEntries.forEach((entry) => {
      const feature = entry.urbanFeature;
      if (!feature || !pathBoundsInScreen(feature)) return;
      const centroid = pathCanvas.centroid(feature);
      const cx = Number(centroid?.[0]);
      const cy = Number(centroid?.[1]);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const screenX = (cx * transform.k) + transform.x;
      const screenY = (cy * transform.k) + transform.y;
      if (
        screenX < -overscan
        || screenX > runtimeState.width + overscan
        || screenY < -overscan
        || screenY > runtimeState.height + overscan
      ) {
        return;
      }
  
      const geographicCentroid = getFeatureGeoCentroid(feature);
      const sampled = geographicCentroid
        ? sampleModernCityLightsGridNormalized(geographicCentroid[0], geographicCentroid[1])
        : 0;
      const glowMultiplier = geographicCentroid
        ? getUrbanGlowMultiplierAt(geographicCentroid[0], geographicCentroid[1])
        : 1;
      const populationScore = clamp(Math.log10(entry.populationSum + 1) / 7.35, 0.12, 1.28);
      const densityScore = clamp(Math.log10(entry.density + 1) / 4.4, 0.08, 1.24);
      const capitalBoost = entry.capitalScore >= 3 ? 0.18 : entry.capitalScore >= 2 ? 0.1 : 0;
      const boostWeight = clamp(
        ((populationScore * 0.78) + (densityScore * 0.78) + (sampled * 0.16) + capitalBoost) * glowMultiplier,
        0.16,
        1.55
      );
      const areaRadiusBoost = clamp(Math.log10(entry.areaSqKm + 1) * 0.14, 0.06, 0.5);
      const baseRadiusPx = 0.7 + (boostWeight * 0.78) + areaRadiusBoost;
      const haloAlpha = clamp(
        intensity * boostStrength * textureOpacityScale * corridorHaloScale * (0.13 + (boostWeight * 0.24)) * zoomProfile.coreAlphaScale,
        0,
        0.36
      );
      const coreAlpha = clamp(
        intensity * boostStrength * textureOpacityScale * (0.25 + (boostWeight * 0.38)) * zoomProfile.coreAlphaScale,
        0,
        0.60
      );
      const aspectRatio = clamp(1.05 + (sampled * 0.08), 1.05, 1.16);
      drawSoftLightBlob(
        cx,
        cy,
        (baseRadiusPx * aspectRatio * 1.14 * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        (baseRadiusPx * 1.02 * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        {
          rotation: 0,
          rgb: haloRgb,
          alpha: haloAlpha,
          innerStop: 0.05,
          midStop: 0.56,
          innerAlphaScale: 0.82,
          midAlphaScale: 0.2,
        }
      );
      drawSoftLightBlob(
        cx,
        cy,
        (baseRadiusPx * aspectRatio * 0.88 * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        (baseRadiusPx * 0.82 * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        {
          rotation: 0,
          rgb: coreRgb,
          alpha: coreAlpha,
          innerStop: 0.04,
          midStop: 0.46,
          innerAlphaScale: 0.94,
          midAlphaScale: 0.36,
        }
      );
    });
  
    data.cityEntries.forEach((entry) => {
      const anchor = getCityAnchor(entry.feature);
      const screenPoint = getCityScreenPoint(anchor);
      if (!anchor || !screenPoint) return;
      if (
        screenPoint[0] < -overscan
        || screenPoint[0] > runtimeState.width + overscan
        || screenPoint[1] < -overscan
        || screenPoint[1] > runtimeState.height + overscan
      ) {
        return;
      }
      const geographicCoords = getCityGeoCoordinates(entry.feature);
      const sampled = geographicCoords
        ? sampleModernCityLightsGridNormalized(geographicCoords[0], geographicCoords[1])
        : 0;
      const glowMultiplier = geographicCoords
        ? getUrbanGlowMultiplierAt(geographicCoords[0], geographicCoords[1])
        : 1;
      const populationScore = clamp(Math.log10(entry.population + 1) / 6.8, 0.12, 1.08);
      const capitalBoost = entry.capitalScore >= 3 ? 0.24 : entry.capitalScore >= 2 ? 0.14 : 0;
      const boostWeight = clamp(((populationScore * 0.92) + (sampled * 0.16) + capitalBoost) * glowMultiplier, 0.18, 1.24);
      const baseRadiusPx = 0.48 + (boostWeight * 0.58);
      const haloAlpha = clamp(
        intensity * boostStrength * textureOpacityScale * corridorHaloScale * (0.12 + (boostWeight * 0.18)) * zoomProfile.coreAlphaScale,
        0,
        0.28
      );
      const coreAlpha = clamp(
        intensity * boostStrength * textureOpacityScale * (0.22 + (boostWeight * 0.28)) * zoomProfile.coreAlphaScale,
        0,
        0.46
      );
      drawSoftLightBlob(
        anchor[0],
        anchor[1],
        (baseRadiusPx * 1.22 * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        (baseRadiusPx * 1.08 * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        {
          rotation: 0,
          rgb: haloRgb,
          alpha: haloAlpha,
          innerStop: 0.05,
          midStop: 0.5,
          innerAlphaScale: 0.82,
          midAlphaScale: 0.2,
        }
      );
      drawSoftLightBlob(
        anchor[0],
        anchor[1],
        (baseRadiusPx * 0.98 * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        (baseRadiusPx * 0.94 * zoomProfile.coreRadiusScale) / Math.max(0.0001, k),
        {
          rotation: 0,
          rgb: coreRgb,
          alpha: coreAlpha,
          innerStop: 0.04,
          midStop: 0.4,
          innerAlphaScale: 0.94,
          midAlphaScale: 0.36,
        }
      );
    });
  }
  
  function getModernCityLightsStaticConfigSignature(config) {
    return stableJson({
      intensity: getModernDayNightNumber(config, "cityLightsIntensity").toFixed(3),
      textureOpacity: getModernDayNightNumber(config, "cityLightsTextureOpacity").toFixed(3),
      corridorStrength: getModernDayNightNumber(config, "cityLightsCorridorStrength").toFixed(3),
      coreSharpness: getModernDayNightNumber(config, "cityLightsCoreSharpness").toFixed(3),
      populationBoostEnabled: isModernPopulationBoostEnabled(config),
      populationBoostStrength: getModernDayNightNumber(config, "cityLightsPopulationBoostStrength").toFixed(3),
    });
  }
  
  function getModernCityLightsStaticLayerKey(config) {
    const context = getContext();
    const canvasWidth = Number(context?.canvas?.width || 0);
    const canvasHeight = Number(context?.canvas?.height || 0);
    const intensityFields = normalizeIntensityFieldsState(runtimeState.intensityFields);
    const urbanGlowRevision = Number(intensityFields?.channels?.urbanGlow?.revision || 0);
    return [
      canvasWidth,
      canvasHeight,
      Number(runtimeState.dpr || 1).toFixed(3),
      getTransformSignature(getZoomTransform()),
      getModernCityLightsProjectionKey(),
      runtimeState.activeScenarioId || "",
      runtimeState.topologyRevision || 0,
      runtimeState.contextLayerRevision || 0,
      runtimeState.cityLayerRevision || 0,
      `field:urbanGlow:${urbanGlowRevision}`,
      getModernCityLightsStaticConfigSignature(config),
    ].join("::");
  }
  
  function createModernCityLightsStaticLayerCanvas(width, height) {
    const context = getContext();
    const canvas = createCanvas(width, height, context);
    if (!canvas) return null;
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  
  function drawModernCityLightsStaticLayer(k, config, intensity) {
    const context = getContext();
    if (!context) return;
    context.save();
    context.globalCompositeOperation = getSafeBlendMode("screen", "lighter");
    drawModernCityLightsTexture(config, intensity);
    drawModernCityLightsCorridors(config, intensity);
    const urbanCoreEntries = collectModernUrbanCoreEntries(k, config, intensity);
    drawModernCityLightsCores(k, config, intensity, urbanCoreEntries);
    drawModernCityFallbackLights(k, config, intensity, urbanCoreEntries);
    drawModernCityLightsPopulationBoostLayer(k, config, intensity);
    context.restore();
  }
  
  function getModernCityLightsStaticLayerCanvas(k, config, intensity) {
    const context = getContext();
    const width = Number(context?.canvas?.width || 0);
    const height = Number(context?.canvas?.height || 0);
    if (width <= 0 || height <= 0) return null;
    const key = getModernCityLightsStaticLayerKey(config);
    if (
      modernCityLightsStaticLayerCache.key === key
      && modernCityLightsStaticLayerCache.canvas
      && modernCityLightsStaticLayerCache.width === width
      && modernCityLightsStaticLayerCache.height === height
    ) {
      recordRenderPerfMetric("modernCityLightsStaticLayerCache", 0, { hit: true });
      return modernCityLightsStaticLayerCache.canvas;
    }
  
    const canvas = modernCityLightsStaticLayerCache.canvas || createModernCityLightsStaticLayerCanvas(width, height);
    if (!canvas) return null;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const layerContext = canvas.getContext?.("2d");
    if (!layerContext) return null;
  
    const layout = getRenderPassLayout("dayNight");
    withRenderTarget(layerContext, () => {
      const layerK = prepareTargetContext(layerContext, runtimeState.zoomTransform, layout);
      drawModernCityLightsStaticLayer(layerK || k, config, intensity);
    });
    modernCityLightsStaticLayerCache.key = key;
    modernCityLightsStaticLayerCache.canvas = canvas;
    modernCityLightsStaticLayerCache.width = width;
    modernCityLightsStaticLayerCache.height = height;
    recordRenderPerfMetric("modernCityLightsStaticLayerCache", 0, { hit: false });
    return canvas;
  }
  
  function drawModernNightLightsLayer(k, config, solarState) {
    const context = getContext();
    const pathCanvas = getPathCanvas();
    if (!context || !pathCanvas) return;
    const nightHemisphere = buildNightHemisphereFeature(solarState, 90);
    if (!nightHemisphere) return;
    const intensity = clamp(getModernDayNightNumber(config, "cityLightsIntensity"), 0, 1.8);
    if (intensity <= 0) return;
  
    context.save();
    context.beginPath();
    pathCanvas(nightHemisphere);
    context.clip();
    const staticLayerCanvas = getModernCityLightsStaticLayerCanvas(k, config, intensity);
    if (staticLayerCanvas) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = getSafeBlendMode("screen", "lighter");
      context.drawImage(staticLayerCanvas, 0, 0);
    } else {
      drawModernCityLightsStaticLayer(k, config, intensity);
    }
    context.restore();
  }

  return {
    collectModernUrbanCoreEntries,
    drawLightEllipse,
    drawModernNightLightsLayer,
    getLightBlobRgb,
    getModernCityLightsGeometry,
    getModernCityLightsPopulationBoostData,
    getModernCityLightsStaticLayerKey,
    getModernCityLightsZoomProfile,
    getModernDayNightNumber,
    getSignedHashUnit,
    normalizeModernCityLightsValue,
    shouldCullModernLightEntry,
    toRgbaString,
  };
}
