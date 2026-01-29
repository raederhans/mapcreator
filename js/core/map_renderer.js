// Rendering engine (Phase 13)
import { state } from "./state.js";
import { getTooltipText } from "../ui/i18n.js";

let mapContainer = null;
let colorCanvas = null;
let lineCanvas = null;
let textureOverlay = null;
let tooltip = null;
let colorCtx = null;
let lineCtx = null;
let hitCanvas = null;
let hitCtx = null;

let projection = null;
let boundsPath = null;
let colorPath = null;
let linePath = null;
let hitPath = null;

function pathBoundsInScreen(feature) {
  if (!boundsPath) return false;
  const bounds = boundsPath.bounds(feature);
  const minX = bounds[0][0] * state.zoomTransform.k + state.zoomTransform.x;
  const minY = bounds[0][1] * state.zoomTransform.k + state.zoomTransform.y;
  const maxX = bounds[1][0] * state.zoomTransform.k + state.zoomTransform.x;
  const maxY = bounds[1][1] * state.zoomTransform.k + state.zoomTransform.y;
  return !(maxX < 0 || maxY < 0 || minX > state.width || minY > state.height);
}

function getFeatureId(feature) {
  return (
    feature?.properties?.id ||
    feature?.properties?.NUTS_ID ||
    feature?.id ||
    null
  );
}

function getColorsHash() {
  const entries = Object.entries(state.colors).sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify(entries);
}

function rebuildDynamicBorders() {
  if (!state.topology || !state.topology.objects?.political || !globalThis.topojson) {
    state.cachedBorders = null;
    state.cachedColorsHash = null;
    return;
  }
  const currentHash = getColorsHash();
  if (state.cachedBorders && state.cachedColorsHash === currentHash) return;
  state.cachedBorders = globalThis.topojson.mesh(
    state.topology,
    state.topology.objects.political,
    (a, b) => {
      if (!b) return false;
      const idA = getFeatureId(a);
      const idB = getFeatureId(b);
      const colorA = idA ? state.colors[idA] : null;
      const colorB = idB ? state.colors[idB] : null;
      return !colorA || !colorB || colorA !== colorB;
    }
  );
  state.cachedColorsHash = currentHash;
}

function rebuildStaticMeshes() {
  if (!state.topology || !state.topology.objects?.political || !globalThis.topojson) {
    state.cachedCoastlines = null;
    state.cachedGridLines = null;
    return;
  }
  state.cachedCoastlines = globalThis.topojson.mesh(
    state.topology,
    state.topology.objects.political,
    (a, b) => !b
  );
  state.cachedGridLines = globalThis.topojson.mesh(
    state.topology,
    state.topology.objects.political,
    (a, b) => a !== b
  );
}

function invalidateBorderCache() {
  state.cachedBorders = null;
  state.cachedColorsHash = null;
  rebuildDynamicBorders();
}

function absoluteClear(ctx, canvas) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function applyTransform(ctx) {
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.translate(state.zoomTransform.x, state.zoomTransform.y);
  ctx.scale(state.zoomTransform.k, state.zoomTransform.k);
}

function renderColorLayer() {
  if (!state.landData || !colorCtx) return;
  const k = state.zoomTransform.k;

  absoluteClear(colorCtx, colorCanvas);
  applyTransform(colorCtx);

  if (state.landBgData) {
    colorCtx.beginPath();
    colorPath(state.landBgData);
    colorCtx.fillStyle = "#e0e0e0";
    colorCtx.fill();
  }

  colorCtx.fillStyle = "#d9d9d9";
  for (const feature of state.landData.features) {
    if ((k < 2 && boundsPath.area(feature) * k * k < state.TINY_AREA) || !pathBoundsInScreen(feature)) {
      continue;
    }
    colorCtx.beginPath();
    colorPath(feature);
    colorCtx.fill();
  }

  for (const feature of state.landData.features) {
    const id = getFeatureId(feature);
    if (!id || !state.colors[id]) continue;
    if ((k < 2 && boundsPath.area(feature) * k * k < state.TINY_AREA) || !pathBoundsInScreen(feature)) {
      continue;
    }
    colorCtx.fillStyle = state.colors[id];
    colorCtx.beginPath();
    colorPath(feature);
    colorCtx.fill();
  }
}

function renderLineLayer() {
  if (!state.landData || !lineCtx) return;
  const k = state.zoomTransform.k;

  absoluteClear(lineCtx, lineCanvas);
  applyTransform(lineCtx);
  lineCtx.lineJoin = "round";
  lineCtx.lineCap = "round";

  if (state.showPhysical && state.physicalData) {
    for (const feature of state.physicalData.features) {
      if ((k < 2 && boundsPath.area(feature) * k * k < state.TINY_AREA) || !pathBoundsInScreen(feature)) {
        continue;
      }
      const featureType = feature.properties?.featurecla;
      if (featureType === "Range/Mountain") {
        lineCtx.globalAlpha = 0.6;
        lineCtx.strokeStyle = "#5c4033";
        lineCtx.lineWidth = 1.2 / k;
        lineCtx.setLineDash([4 / k, 4 / k]);
        lineCtx.beginPath();
        linePath(feature);
        lineCtx.stroke();
        lineCtx.setLineDash([]);

        if (k >= 1.4) {
          const name = feature.properties?.name || feature.properties?.name_en;
          if (name) {
            const [x, y] = linePath.centroid(feature);
            if (Number.isFinite(x) && Number.isFinite(y)) {
              lineCtx.globalAlpha = 0.7;
              lineCtx.fillStyle = "#5c4033";
              lineCtx.font = "10px Georgia, serif";
              lineCtx.fillText(name, x, y);
            }
          }
        }
      } else if (featureType === "Forest") {
        lineCtx.globalAlpha = 0.1;
        lineCtx.fillStyle = "#2e6b4f";
        lineCtx.beginPath();
        linePath(feature);
        lineCtx.fill();
      } else if (featureType === "Plain" || featureType === "Delta") {
        lineCtx.globalAlpha = 0.08;
        lineCtx.fillStyle = "#d8caa3";
        lineCtx.beginPath();
        linePath(feature);
        lineCtx.fill();
      }
    }
  }

  if (state.showUrban && state.urbanData) {
    lineCtx.save();
    lineCtx.globalAlpha = 0.2;
    lineCtx.fillStyle = "#333333";
    for (const feature of state.urbanData.features) {
      if ((k < 2 && boundsPath.area(feature) * k * k < state.TINY_AREA) || !pathBoundsInScreen(feature)) {
        continue;
      }
      lineCtx.beginPath();
      linePath(feature);
      lineCtx.fill();
    }
    lineCtx.restore();
  }

  lineCtx.globalAlpha = 1;

  if (state.topology && state.topology.objects?.political) {
    const coastlines = state.cachedCoastlines;
    if (coastlines) {
      lineCtx.globalAlpha = 1;
      lineCtx.beginPath();
      linePath(coastlines);
      lineCtx.strokeStyle = state.styleConfig.coastlines.color;
      lineCtx.lineWidth = state.styleConfig.coastlines.width / k;
      lineCtx.stroke();
    }

    const gridLines = state.cachedGridLines;
    if (gridLines) {
      lineCtx.globalAlpha = state.styleConfig.internalBorders.opacity;
      lineCtx.beginPath();
      linePath(gridLines);
      lineCtx.strokeStyle = state.styleConfig.internalBorders.color;
      lineCtx.lineWidth = state.styleConfig.internalBorders.width / k;
      lineCtx.stroke();
    }

    rebuildDynamicBorders();
    const dynamicBorders = state.cachedBorders;
    if (dynamicBorders) {
      lineCtx.globalAlpha = 1;
      lineCtx.beginPath();
      linePath(dynamicBorders);
      lineCtx.strokeStyle = state.styleConfig.empireBorders.color;
      lineCtx.lineWidth = state.styleConfig.empireBorders.width / k;
      lineCtx.stroke();
    }
  }

  if (state.showRivers && state.riversData) {
    lineCtx.beginPath();
    linePath(state.riversData);
    lineCtx.strokeStyle = "#3498db";
    lineCtx.lineWidth = 1 / k;
    lineCtx.stroke();
  }

  if (state.isEditingPreset && state.editingPresetIds.size > 0) {
    lineCtx.save();
    lineCtx.globalAlpha = 0.9;
    lineCtx.strokeStyle = "#f97316";
    lineCtx.lineWidth = 2 / k;
    for (const id of state.editingPresetIds) {
      const feature = state.landIndex.get(id);
      if (!feature) continue;
      if (!pathBoundsInScreen(feature)) continue;
      lineCtx.beginPath();
      linePath(feature);
      lineCtx.stroke();
    }
    lineCtx.restore();
  }

  drawHover();
  markHitDirty();
}

function render() {
  renderColorLayer();
  renderLineLayer();
}

function drawHover() {
  const k = state.zoomTransform.k;
  if (state.hoveredId && state.landIndex.has(state.hoveredId)) {
    const feature = state.landIndex.get(state.hoveredId);
    if (!((k < 2 && boundsPath.area(feature) * k * k < state.TINY_AREA) || !pathBoundsInScreen(feature))) {
      lineCtx.beginPath();
      linePath(feature);
      lineCtx.strokeStyle = "#f1c40f";
      lineCtx.lineWidth = 2 / k;
      lineCtx.stroke();
    }
  }
}

function markHitDirty() {
  state.hitCanvasDirty = true;
}

function drawHidden() {
  if (!state.landData || !state.hitCanvasDirty) return;
  state.hitCanvasDirty = false;

  absoluteClear(hitCtx, hitCanvas);
  applyTransform(hitCtx);

  for (const feature of state.landData.features) {
    const id = feature.properties?.id || feature.properties?.NUTS_ID;
    const key = state.idToKey.get(id);
    if (!key) continue;
    if (!pathBoundsInScreen(feature)) continue;
    const r = (key >> 16) & 255;
    const g = (key >> 8) & 255;
    const b = key & 255;
    hitCtx.fillStyle = `rgb(${r},${g},${b})`;
    hitCtx.beginPath();
    hitPath(feature);
    hitCtx.fill();
  }
}

function buildIndex() {
  state.landIndex.clear();
  state.idToKey.clear();
  state.keyToId.clear();

  if (!state.landData || !state.landData.features) return;
  state.landData.features.forEach((feature, index) => {
    const id = getFeatureId(feature) || `feature-${index}`;
    state.landIndex.set(id, feature);
    const key = index + 1;
    state.idToKey.set(id, key);
    state.keyToId.set(key, id);
  });
}

function buildSpatialIndex() {
  state.spatialItems = [];
  state.spatialIndex = null;
  if (!state.landData || !state.landData.features) return;

  for (const feature of state.landData.features) {
    const id = getFeatureId(feature);
    if (!id) continue;
    const bounds = boundsPath.bounds(feature);
    const minX = bounds[0][0];
    const minY = bounds[0][1];
    const maxX = bounds[1][0];
    const maxY = bounds[1][1];
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) continue;
    state.spatialItems.push({
      id,
      feature,
      minX,
      minY,
      maxX,
      maxY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    });
  }

  state.spatialIndex = globalThis.d3
    .quadtree()
    .x((d) => d.cx)
    .y((d) => d.cy)
    .addAll(state.spatialItems);
}

function getFeatureIdFromEvent(event) {
  if (!state.landData) return null;
  const [sx, sy] = globalThis.d3.pointer(event, colorCanvas);
  const px = (sx - state.zoomTransform.x) / state.zoomTransform.k;
  const py = (sy - state.zoomTransform.y) / state.zoomTransform.k;
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  const lonLat = projection.invert([px, py]);
  if (!lonLat) return null;

  const candidates = [];
  if (state.spatialIndex) {
    state.spatialIndex.visit((node, x0, y0, x1, y1) => {
      if (px < x0 || px > x1 || py < y0 || py > y1) return true;
      if (!node.length) {
        let current = node;
        do {
          const d = current.data;
          if (d && px >= d.minX && px <= d.maxX && py >= d.minY && py <= d.maxY) {
            candidates.push(d);
          }
          current = current.next;
        } while (current);
      }
      return false;
    });
  }

  for (const candidate of candidates) {
    if (globalThis.d3.geoContains(candidate.feature, lonLat)) {
      return candidate.id;
    }
  }

  return null;
}

function handleMouseMove(event) {
  const now = performance.now();
  if (now - state.lastMouseMoveTime < state.MOUSE_THROTTLE_MS) return;
  state.lastMouseMoveTime = now;
  if (!state.landData) return;
  if (state.isInteracting) return;
  const id = getFeatureIdFromEvent(event);
  if (id !== state.hoveredId) {
    state.hoveredId = id;
    drawHover();
  }

  if (!tooltip) return;
  if (id && state.landIndex.has(id)) {
    const feature = state.landIndex.get(id);
    const text = getTooltipText(feature);
    tooltip.textContent = text;
    tooltip.style.left = `${event.clientX + 12}px`;
    tooltip.style.top = `${event.clientY + 12}px`;
    tooltip.style.opacity = "1";
  } else {
    tooltip.style.opacity = "0";
  }
}

function paintSingleRegion(feature, color) {
  colorCtx.save();
  applyTransform(colorCtx);
  colorCtx.fillStyle = color;
  colorCtx.beginPath();
  colorPath(feature);
  colorCtx.fill();
  colorCtx.restore();
}

function addRecentColor(color) {
  if (!color) return;
  state.recentColors = state.recentColors.filter((value) => value !== color);
  state.recentColors.unshift(color);
  if (state.recentColors.length > 5) {
    state.recentColors = state.recentColors.slice(0, 5);
  }
  if (typeof state.updateRecentUI === "function") {
    state.updateRecentUI();
  }
}

function handleClick(event) {
  if (!state.landData) return;
  const id = getFeatureIdFromEvent(event);
  if (!id) return;
  const feature = state.landIndex.get(id);
  if (!feature) return;

  if (state.isEditingPreset) {
    if (typeof globalThis.togglePresetRegion === "function") {
      globalThis.togglePresetRegion(id);
    }
    return;
  }

  if (state.currentTool === "eraser") {
    delete state.colors[id];
    invalidateBorderCache();
    render();
  } else if (state.currentTool === "eyedropper") {
    const picked = state.colors[id];
    if (picked) {
      state.selectedColor = picked;
      if (typeof state.updateSwatchUIFn === "function") {
        state.updateSwatchUIFn();
      }
    }
  } else {
    state.colors[id] = state.selectedColor;
    addRecentColor(state.selectedColor);
    paintSingleRegion(feature, state.selectedColor);
    invalidateBorderCache();
    renderLineLayer();
  }
}

function setCanvasSize() {
  state.dpr = globalThis.devicePixelRatio || 1;

  const container = mapContainer || colorCanvas.parentElement;
  state.width = colorCanvas.clientWidth || container?.clientWidth || globalThis.innerWidth;
  state.height = colorCanvas.clientHeight || container?.clientHeight || globalThis.innerHeight;

  if (state.width < 100) state.width = globalThis.innerWidth - 580;
  if (state.height < 100) state.height = globalThis.innerHeight;

  const scaledW = Math.floor(state.width * state.dpr);
  const scaledH = Math.floor(state.height * state.dpr);

  colorCanvas.width = scaledW;
  colorCanvas.height = scaledH;
  lineCanvas.width = scaledW;
  lineCanvas.height = scaledH;
  hitCanvas.width = scaledW;
  hitCanvas.height = scaledH;
}

function fitProjection() {
  if (!state.landData || !state.landData.features || state.landData.features.length === 0) {
    console.warn("fitProjection: No land data available");
    return;
  }
  if (state.width <= 0 || state.height <= 0) {
    console.warn("fitProjection: Invalid dimensions", { width: state.width, height: state.height });
    return;
  }
  projection.fitSize([state.width, state.height], state.landData);
}

function handleResize() {
  setCanvasSize();
  fitProjection();
  buildSpatialIndex();
  render();
}

export function initMap({ containerId = "mapContainer" } = {}) {
  if (!globalThis.d3) {
    console.error("D3 is required for map renderer.");
    return;
  }

  mapContainer = document.getElementById(containerId);
  colorCanvas = document.getElementById("colorCanvas");
  lineCanvas = document.getElementById("lineCanvas");
  textureOverlay = document.getElementById("textureOverlay");
  tooltip = document.getElementById("tooltip");

  if (!colorCanvas || !lineCanvas) {
    console.error("Canvas elements not found.");
    return;
  }

  colorCtx = colorCanvas.getContext("2d");
  lineCtx = lineCanvas.getContext("2d");
  hitCanvas = document.createElement("canvas");
  hitCtx = hitCanvas.getContext("2d", { willReadFrequently: true });

  projection = globalThis.d3.geoMercator();
  boundsPath = globalThis.d3.geoPath(projection);
  colorPath = globalThis.d3.geoPath(projection, colorCtx);
  linePath = globalThis.d3.geoPath(projection, lineCtx);
  hitPath = globalThis.d3.geoPath(projection, hitCtx);

  state.colorCanvas = colorCanvas;
  state.lineCanvas = lineCanvas;
  state.colorCtx = colorCtx;
  state.lineCtx = lineCtx;

  setCanvasSize();
  if (state.landData) {
    fitProjection();
  }

  buildIndex();
  buildSpatialIndex();
  rebuildStaticMeshes();
  invalidateBorderCache();

  const zoom = globalThis.d3
    .zoom()
    .scaleExtent([0.5, 8])
    .on("start", () => {
      state.isInteracting = true;
    })
    .on("zoom", (event) => {
      state.zoomTransform = event.transform;
      if (!state.zoomRenderScheduled) {
        state.zoomRenderScheduled = true;
        requestAnimationFrame(() => {
          render();
          state.zoomRenderScheduled = false;
        });
      }
    })
    .on("end", (event) => {
      state.zoomTransform = event.transform;
      state.isInteracting = false;
      render();
    });

  globalThis.d3.select(colorCanvas).call(zoom);

  colorCanvas.addEventListener("mousemove", handleMouseMove);
  colorCanvas.addEventListener("click", handleClick);
  window.addEventListener("resize", handleResize);

  colorCanvas.style.pointerEvents = "auto";
  lineCanvas.style.pointerEvents = "none";
  if (textureOverlay) {
    textureOverlay.style.pointerEvents = "none";
  }

  colorCanvas.style.touchAction = "none";
}

export function setMapData() {
  buildIndex();
  buildSpatialIndex();
  rebuildStaticMeshes();
  invalidateBorderCache();
  fitProjection();
}

export { render, rebuildStaticMeshes, invalidateBorderCache };
