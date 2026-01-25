/*
  Dual-canvas rendering pipeline:
  - colorCanvas: background + fills
  - lineCanvas: outlines, borders, rivers, physical/urban overlays

  Data is WGS84 (EPSG:4326), projected with d3.geoMercator().
  Uses debounced vector rendering (no bitmap scaling) + viewport culling.
*/

const mapContainer = document.getElementById("mapContainer");
const colorCanvas = document.getElementById("colorCanvas");
const lineCanvas = document.getElementById("lineCanvas");
const colorCtx = colorCanvas.getContext("2d");
const lineCtx = lineCanvas.getContext("2d");
const textureOverlay = document.getElementById("textureOverlay");

const hitCanvas = document.createElement("canvas");
const hitCtx = hitCanvas.getContext("2d", { willReadFrequently: true });

let landData = null;
let riversData = null;
let bordersData = null;
let oceanData = null;
let landBgData = null;
let urbanData = null;
let physicalData = null;

let width = 0;
let height = 0;
let dpr = window.devicePixelRatio || 1;

const colors = {};
let selectedColor = "#1f3a5f";
let currentTool = "fill";
let hoveredId = null;
let zoomTransform = d3.zoomIdentity;
let showUrban = true;
let showPhysical = true;
let showRivers = true;
let recentColors = [];
let updateRecentUI = null;
let updateSwatchUIFn = null;

const countryPalette = {
  DE: "#5d7cba",
  FR: "#4a90e2",
  IT: "#50e3c2",
  PL: "#f5a623",
  NL: "#7ed321",
  BE: "#bd10e0",
  LU: "#8b572a",
  AT: "#417505",
  CH: "#d0021b",
  UA: "#6b8fd6",
  BY: "#9b5de5",
  MD: "#f28482",
  RU: "#4a4e69",
};

const projection = d3.geoMercator();
const boundsPath = d3.geoPath(projection);
const colorPath = d3.geoPath(projection, colorCtx);
const linePath = d3.geoPath(projection, lineCtx);
const hitPath = d3.geoPath(projection, hitCtx);

const landIndex = new Map();
const idToKey = new Map();
const keyToId = new Map();

const TINY_AREA = 6;
let zoomRaf = null;
let isInteracting = false;

function setCanvasSize() {
  dpr = window.devicePixelRatio || 1;
  width = colorCanvas.clientWidth || window.innerWidth;
  height = colorCanvas.clientHeight || window.innerHeight;

  const scaledW = Math.floor(width * dpr);
  const scaledH = Math.floor(height * dpr);

  colorCanvas.width = scaledW;
  colorCanvas.height = scaledH;
  lineCanvas.width = scaledW;
  lineCanvas.height = scaledH;
  hitCanvas.width = scaledW;
  hitCanvas.height = scaledH;
}

function fitProjection() {
  if (!landData) return;
  projection.fitSize([width, height], landData);
}

function setDprTransform(ctx) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function applyTransform(ctx) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(zoomTransform.x, zoomTransform.y);
  ctx.scale(zoomTransform.k, zoomTransform.k);
}

function isFeatureVisible(feature, k) {
  const bounds = boundsPath.bounds(feature);
  const minX = bounds[0][0] * k + zoomTransform.x;
  const minY = bounds[0][1] * k + zoomTransform.y;
  const maxX = bounds[1][0] * k + zoomTransform.x;
  const maxY = bounds[1][1] * k + zoomTransform.y;
  return !(maxX < 0 || maxY < 0 || minX > width || minY > height);
}

function renderQuick() {
  return;
}

function renderFull() {
  if (!landData) return;
  const k = zoomTransform.k;
  if (mapContainer) {
    mapContainer.style.transform = "none";
  }

  colorCtx.setTransform(1, 0, 0, 1, 0, 0);
  colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);
  applyTransform(colorCtx);

  if (oceanData) {
    colorCtx.beginPath();
    colorPath(oceanData);
    colorCtx.fillStyle = "#b3d9ff";
    colorCtx.fill();
  }

  if (landBgData) {
    colorCtx.beginPath();
    colorPath(landBgData);
    colorCtx.fillStyle = "#e0e0e0";
    colorCtx.fill();
  }

  colorCtx.fillStyle = "#d9d9d9";
  for (const feature of landData.features) {
    if ((k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) || !isFeatureVisible(feature, k)) {
      continue;
    }
    colorCtx.beginPath();
    colorPath(feature);
    colorCtx.fill();
  }

  for (const feature of landData.features) {
    const id = feature.properties?.id || feature.properties?.NUTS_ID;
    if (!id || !colors[id]) continue;
    if ((k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) || !isFeatureVisible(feature, k)) {
      continue;
    }
    colorCtx.fillStyle = colors[id];
    colorCtx.beginPath();
    colorPath(feature);
    colorCtx.fill();
  }

  lineCtx.setTransform(1, 0, 0, 1, 0, 0);
  lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
  applyTransform(lineCtx);
  lineCtx.lineJoin = "round";
  lineCtx.lineCap = "round";

  if (showPhysical && physicalData) {
    for (const feature of physicalData.features) {
      if ((k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) || !isFeatureVisible(feature, k)) {
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

  if (showUrban && urbanData) {
    lineCtx.save();
    lineCtx.globalAlpha = 0.2;
    lineCtx.fillStyle = "#333333";
    for (const feature of urbanData.features) {
      if ((k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) || !isFeatureVisible(feature, k)) {
        continue;
      }
      lineCtx.beginPath();
      linePath(feature);
      lineCtx.fill();
    }
    lineCtx.restore();
  }

  if (bordersData) {
    lineCtx.beginPath();
    linePath(bordersData);
    lineCtx.strokeStyle = "#111111";
    lineCtx.lineWidth = 1.6 / k;
    lineCtx.stroke();
  }

  if (showRivers && riversData) {
    lineCtx.beginPath();
    linePath(riversData);
    lineCtx.strokeStyle = "#3498db";
    lineCtx.lineWidth = 1 / k;
    lineCtx.stroke();
  }

  lineCtx.beginPath();
  linePath(landData);
  lineCtx.strokeStyle = "#999999";
  lineCtx.lineWidth = 0.5 / k;
  lineCtx.stroke();

  drawHover();
  drawHidden();
}

function drawHover() {
  const k = zoomTransform.k;
  if (hoveredId && landIndex.has(hoveredId)) {
    const feature = landIndex.get(hoveredId);
    if (!((k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) || !isFeatureVisible(feature, k))) {
      lineCtx.beginPath();
      linePath(feature);
      lineCtx.strokeStyle = "#f1c40f";
      lineCtx.lineWidth = 2 / k;
      lineCtx.stroke();
    }
  }
}

function drawHidden() {
  if (!landData) return;
  hitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hitCtx.clearRect(0, 0, width, height);
  hitCtx.save();
  hitCtx.translate(zoomTransform.x, zoomTransform.y);
  hitCtx.scale(zoomTransform.k, zoomTransform.k);
  const k = zoomTransform.k;

  for (const feature of landData.features) {
    const id = feature.properties?.id || feature.properties?.NUTS_ID;
    const key = idToKey.get(id);
    if (!key) continue;
    if (!isFeatureVisible(feature, k)) continue;
    const r = (key >> 16) & 255;
    const g = (key >> 8) & 255;
    const b = key & 255;
    hitCtx.fillStyle = `rgb(${r},${g},${b})`;
    hitCtx.beginPath();
    hitPath(feature);
    hitCtx.fill();
  }

  hitCtx.restore();
}

function scheduleQuickRender() {
  return;
}

function buildIndex() {
  landIndex.clear();
  idToKey.clear();
  keyToId.clear();

  landData.features.forEach((feature, index) => {
    const id = feature.properties?.id || feature.properties?.NUTS_ID || `feature-${index}`;
    landIndex.set(id, feature);
    const key = index + 1;
    idToKey.set(id, key);
    keyToId.set(key, id);
  });
}

function getFeatureIdFromEvent(event) {
  const rect = colorCanvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * dpr;
  const y = (event.clientY - rect.top) * dpr;
  const pixel = hitCtx.getImageData(x, y, 1, 1).data;
  const key = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
  if (!key) return null;
  return keyToId.get(key) || null;
}

function handleMouseMove(event) {
  if (!landData) return;
  if (isInteracting) return;
  const id = getFeatureIdFromEvent(event);
  if (id !== hoveredId) {
    hoveredId = id;
    drawHover();
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

function handleClick(event) {
  if (!landData) return;
  const id = getFeatureIdFromEvent(event);
  if (!id) return;
  const feature = landIndex.get(id);
  if (!feature) return;

  if (currentTool === "eraser") {
    delete colors[id];
    renderFull();
  } else if (currentTool === "eyedropper") {
    const picked = colors[id];
    if (picked) {
      selectedColor = picked;
      if (typeof updateSwatchUIFn === "function") {
        updateSwatchUIFn();
      }
    }
  } else {
    colors[id] = selectedColor;
    addRecentColor(selectedColor);
    paintSingleRegion(feature, selectedColor);
  }
}

function addRecentColor(color) {
  if (!color) return;
  recentColors = recentColors.filter((value) => value !== color);
  recentColors.unshift(color);
  if (recentColors.length > 5) {
    recentColors = recentColors.slice(0, 5);
  }
  if (typeof updateRecentUI === "function") {
    updateRecentUI();
  }
}

function setupUI() {
  const swatches = document.querySelectorAll(".color-swatch");
  const toolButtons = document.querySelectorAll(".tool-button");
  const currentToolLabel = document.getElementById("currentTool");
  const customColor = document.getElementById("customColor");
  const exportBtn = document.getElementById("exportBtn");
  const exportFormat = document.getElementById("exportFormat");
  const textureSelect = document.getElementById("textureSelect");
  const toggleUrban = document.getElementById("toggleUrban");
  const togglePhysical = document.getElementById("togglePhysical");
  const toggleRivers = document.getElementById("toggleRivers");
  const recentContainer = document.getElementById("recentColors");
  const presetPolitical = document.getElementById("presetPolitical");
  const presetClear = document.getElementById("presetClear");

  function renderRecentColors() {
    if (!recentContainer) return;
    recentContainer.innerHTML = "";
    recentColors.forEach((color) => {
      const btn = document.createElement("button");
      btn.className = "color-swatch h-8 w-8 rounded-md border border-slate-200";
      btn.dataset.color = color;
      btn.style.background = color;
      btn.addEventListener("click", () => {
        selectedColor = color;
        updateSwatchUI();
      });
      recentContainer.appendChild(btn);
    });
  }
  updateRecentUI = renderRecentColors;

  function updateSwatchUI() {
    let matched = false;
    swatches.forEach((swatch) => {
      if (swatch.dataset.color === selectedColor) {
        swatch.classList.add("ring-2", "ring-slate-900");
        matched = true;
      } else {
        swatch.classList.remove("ring-2", "ring-slate-900");
      }
    });
    if (document.getElementById("customColor")) {
      customColor.value = selectedColor;
      customColor.classList.toggle("ring-2", !matched);
      customColor.classList.toggle("ring-slate-900", !matched);
    }
  }
  updateSwatchUIFn = updateSwatchUI;

  function updateToolUI() {
    if (currentTool === "eraser") {
      currentToolLabel.textContent = "Eraser";
    } else if (currentTool === "eyedropper") {
      currentToolLabel.textContent = "Eyedropper";
    } else {
      currentToolLabel.textContent = "Fill";
    }
    toolButtons.forEach((button) => {
      const isActive = button.dataset.tool === currentTool;
      button.classList.toggle("bg-slate-900", isActive);
      button.classList.toggle("text-white", isActive);
      button.classList.toggle("bg-white", !isActive);
      button.classList.toggle("text-slate-700", !isActive);
    });
  }

  swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      selectedColor = swatch.dataset.color;
      updateSwatchUI();
    });
  });

  if (customColor) {
    customColor.addEventListener("input", (event) => {
      selectedColor = event.target.value;
      updateSwatchUI();
    });
  }

  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentTool = button.dataset.tool || "fill";
      updateToolUI();
    });
  });

  if (exportBtn && exportFormat) {
    exportBtn.addEventListener("click", () => {
      const format = exportFormat.value === "jpg" ? "image/jpeg" : "image/png";
      const extension = exportFormat.value === "jpg" ? "jpg" : "png";
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = colorCanvas.width;
      exportCanvas.height = colorCanvas.height;
      const exportCtx = exportCanvas.getContext("2d");
      exportCtx.drawImage(colorCanvas, 0, 0);
      exportCtx.drawImage(lineCanvas, 0, 0);
      const dataUrl = exportCanvas.toDataURL(format, 0.92);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `map_snapshot.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  if (textureOverlay && textureSelect) {
    const applyTexture = (value) => {
      textureOverlay.className = `texture-overlay decorative-layer absolute inset-0 texture-${value}`;
    };
    applyTexture(textureSelect.value);
    textureSelect.addEventListener("change", (event) => {
      applyTexture(event.target.value);
    });
  }

  if (toggleUrban) {
    toggleUrban.addEventListener("change", (event) => {
      showUrban = event.target.checked;
      renderFull();
    });
  }

  if (togglePhysical) {
    togglePhysical.addEventListener("change", (event) => {
      showPhysical = event.target.checked;
      renderFull();
    });
  }

  if (toggleRivers) {
    toggleRivers.addEventListener("change", (event) => {
      showRivers = event.target.checked;
      renderFull();
    });
  }

  if (presetPolitical) {
    presetPolitical.addEventListener("click", () => {
      if (!landData) return;
      for (const feature of landData.features) {
        const id = feature.properties?.id || feature.properties?.NUTS_ID;
        const cntr = feature.properties?.cntr_code || feature.properties?.CNTR_CODE;
        if (!id || !cntr) continue;
        const color = countryPalette[cntr];
        if (color) {
          colors[id] = color;
        }
      }
      renderFull();
    });
  }

  if (presetClear) {
    presetClear.addEventListener("click", () => {
      Object.keys(colors).forEach((key) => delete colors[key]);
      renderFull();
    });
  }

  renderRecentColors();
  updateSwatchUI();
  updateToolUI();
}

function handleResize() {
  setCanvasSize();
  fitProjection();
  renderFull();
}

async function loadData() {
  try {
    const [land, rivers, borders, ocean, landBg, urban, physical] = await Promise.all([
      d3.json("data/europe_final_optimized.geojson"),
      d3.json("data/europe_rivers.geojson"),
      d3.json("data/europe_countries_combined.geojson"),
      d3.json("data/europe_ocean.geojson"),
      d3.json("data/europe_land_bg.geojson"),
      d3.json("data/europe_urban.geojson"),
      d3.json("data/europe_physical.geojson"),
    ]);

    landData = land;
    riversData = rivers;
    bordersData = borders;
    oceanData = ocean;
    landBgData = landBg;
    urbanData = urban;
    physicalData = physical;

    buildIndex();
    fitProjection();
    renderFull();
  } catch (error) {
    console.error("Failed to load GeoJSON:", error);
  }
}

const zoom = d3
  .zoom()
  .scaleExtent([1, 8])
  .on("start", () => {
    isInteracting = true;
  })
  .on("zoom", (event) => {
    zoomTransform = event.transform;
    if (mapContainer) {
      mapContainer.style.transform = `translate(${zoomTransform.x}px, ${zoomTransform.y}px) scale(${zoomTransform.k})`;
    }
  })
  .on("end", (event) => {
    zoomTransform = event.transform;
    isInteracting = false;
    if (mapContainer) {
      mapContainer.style.transform = "none";
    }
    renderFull();
  });

d3.select(colorCanvas).call(zoom);

colorCanvas.addEventListener("mousemove", handleMouseMove);
colorCanvas.addEventListener("click", handleClick);
window.addEventListener("resize", handleResize);

colorCanvas.style.pointerEvents = "auto";
lineCanvas.style.pointerEvents = "none";
if (textureOverlay) {
  textureOverlay.style.pointerEvents = "none";
}
colorCanvas.style.touchAction = "none";

setupUI();
handleResize();
loadData();
