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
const tooltip = document.getElementById("tooltip");

const hitCanvas = document.createElement("canvas");
const hitCtx = hitCanvas.getContext("2d", { willReadFrequently: true });

let topology = null;
let landData = null;
let riversData = null;
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
let cachedBorders = null;
let cachedColorsHash = null;
let cachedCoastlines = null;
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
  ES: "#e74c3c",
  PT: "#9b59b6",
  CZ: "#3498db",
  SK: "#1abc9c",
  HU: "#e67e22",
  RO: "#2ecc71",
  BG: "#f39c12",
  HR: "#16a085",
  SI: "#27ae60",
  EE: "#2980b9",
  LV: "#8e44ad",
  LT: "#c0392b",
  FI: "#d35400",
  SE: "#7f8c8d",
  NO: "#34495e",
  DK: "#95a5a6",
  IE: "#1e8449",
  UK: "#5d6d7e",
  GB: "#5d6d7e",
  GR: "#148f77",
  CY: "#d68910",
  MT: "#a93226",
  TR: "#b03a2e",
  RS: "#6c3483",
  BA: "#1a5276",
  ME: "#117a65",
  AL: "#b9770e",
  MK: "#7d3c98",
  XK: "#2e4053",
  IS: "#5499c7",
  LI: "#45b39d",
};
const defaultCountryPalette = { ...countryPalette };

const countryNames = {
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  PL: "Poland",
  NL: "Netherlands",
  BE: "Belgium",
  LU: "Luxembourg",
  AT: "Austria",
  CH: "Switzerland",
  UA: "Ukraine",
  BY: "Belarus",
  MD: "Moldova",
  RU: "Russia",
  ES: "Spain",
  PT: "Portugal",
  CZ: "Czechia",
  SK: "Slovakia",
  HU: "Hungary",
  RO: "Romania",
  BG: "Bulgaria",
  HR: "Croatia",
  SI: "Slovenia",
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
  FI: "Finland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  IE: "Ireland",
  UK: "United Kingdom",
  GB: "United Kingdom",
  GR: "Greece",
  CY: "Cyprus",
  MT: "Malta",
  TR: "Turkey",
  RS: "Serbia",
  BA: "Bosnia and Herzegovina",
  ME: "Montenegro",
  AL: "Albania",
  MK: "North Macedonia",
  XK: "Kosovo",
  IS: "Iceland",
  LI: "Liechtenstein",
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
const MOUSE_THROTTLE_MS = 16;
let lastMouseMoveTime = 0;
let hitCanvasDirty = true;
let zoomRenderScheduled = false;
let isInteracting = false;

function setCanvasSize() {
  dpr = window.devicePixelRatio || 1;

  // Get dimensions from parent container if canvas has no size yet
  const container = mapContainer || colorCanvas.parentElement;
  width = colorCanvas.clientWidth || container?.clientWidth || window.innerWidth;
  height = colorCanvas.clientHeight || container?.clientHeight || window.innerHeight;

  // Ensure minimum dimensions
  if (width < 100) width = window.innerWidth - 580; // Account for sidebars
  if (height < 100) height = window.innerHeight;

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
  if (!landData || !landData.features || landData.features.length === 0) {
    console.warn("fitProjection: No land data available");
    return;
  }
  if (width <= 0 || height <= 0) {
    console.warn("fitProjection: Invalid dimensions", { width, height });
    return;
  }
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

function pathBoundsInScreen(feature, transform) {
  const bounds = boundsPath.bounds(feature);
  const minX = bounds[0][0] * transform.k + transform.x;
  const minY = bounds[0][1] * transform.k + transform.y;
  const maxX = bounds[1][0] * transform.k + transform.x;
  const maxY = bounds[1][1] * transform.k + transform.y;
  return !(maxX < 0 || maxY < 0 || minX > width || minY > height);
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
  const entries = Object.entries(colors).sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify(entries);
}

function invalidateBorderCache() {
  cachedBorders = null;
  cachedColorsHash = null;
}

function getDynamicBorders() {
  if (!topology || !topology.objects?.political) return null;
  const currentHash = getColorsHash();
  if (cachedBorders && cachedColorsHash === currentHash) {
    return cachedBorders;
  }

  cachedBorders = topojson.mesh(
    topology,
    topology.objects.political,
    (a, b) => {
      if (!b) return false;
      const idA = getFeatureId(a);
      const idB = getFeatureId(b);
      const colorA = idA ? colors[idA] : null;
      const colorB = idB ? colors[idB] : null;
      return !colorA || !colorB || colorA !== colorB;
    }
  );
  cachedColorsHash = currentHash;
  return cachedBorders;
}

function getCoastlines() {
  if (cachedCoastlines) return cachedCoastlines;
  if (!topology || !topology.objects?.political) return null;
  cachedCoastlines = topojson.mesh(
    topology,
    topology.objects.political,
    (a, b) => !b
  );
  return cachedCoastlines;
}

function renderQuick() {
  return;
}

function renderColorLayer() {
  if (!landData) return;
  const k = zoomTransform.k;

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
    if (
      (k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) ||
      !pathBoundsInScreen(feature, zoomTransform)
    ) {
      continue;
    }
    colorCtx.beginPath();
    colorPath(feature);
    colorCtx.fill();
  }

  for (const feature of landData.features) {
    const id = getFeatureId(feature);
    if (!id || !colors[id]) continue;
    if (
      (k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) ||
      !pathBoundsInScreen(feature, zoomTransform)
    ) {
      continue;
    }
    colorCtx.fillStyle = colors[id];
    colorCtx.beginPath();
    colorPath(feature);
    colorCtx.fill();
  }
}

function renderLineLayer() {
  if (!landData) return;
  const k = zoomTransform.k;

  lineCtx.setTransform(1, 0, 0, 1, 0, 0);
  lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
  applyTransform(lineCtx);
  lineCtx.lineJoin = "round";
  lineCtx.lineCap = "round";

  if (showPhysical && physicalData) {
    for (const feature of physicalData.features) {
      if (
        (k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) ||
        !pathBoundsInScreen(feature, zoomTransform)
      ) {
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
      if (
        (k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) ||
        !pathBoundsInScreen(feature, zoomTransform)
      ) {
        continue;
      }
      lineCtx.beginPath();
      linePath(feature);
      lineCtx.fill();
    }
    lineCtx.restore();
  }

  lineCtx.globalAlpha = 1;

  if (topology && topology.objects?.political) {
    const political = topology.objects.political;
    const stateColors = colors;

    const coastlines = topojson.mesh(topology, political, (a, b) => a === b);
    if (coastlines) {
      lineCtx.beginPath();
      linePath(coastlines);
      lineCtx.strokeStyle = "#333333";
      lineCtx.lineWidth = 1.2 / k;
      lineCtx.stroke();
    }

    const gridLines = topojson.mesh(topology, political, (a, b) => a !== b);
    if (gridLines) {
      lineCtx.beginPath();
      linePath(gridLines);
      lineCtx.strokeStyle = "#e2e8f0";
      lineCtx.lineWidth = 0.5 / k;
      lineCtx.stroke();
    }

    const dynamicBorders = topojson.mesh(topology, political, (a, b) => {
      if (a === b) return false;
      const idA = getFeatureId(a);
      const idB = getFeatureId(b);
      const colorA = idA ? stateColors[idA] : null;
      const colorB = idB ? stateColors[idB] : null;
      return colorA !== colorB || !colorA || !colorB;
    });
    if (dynamicBorders) {
      lineCtx.beginPath();
      linePath(dynamicBorders);
      lineCtx.strokeStyle = "#475569";
      lineCtx.lineWidth = 1.0 / k;
      lineCtx.stroke();
    }
  }

  if (showRivers && riversData) {
    lineCtx.beginPath();
    linePath(riversData);
    lineCtx.strokeStyle = "#3498db";
    lineCtx.lineWidth = 1 / k;
    lineCtx.stroke();
  }

  drawHover();
  markHitDirty();
}

function renderFull() {
  renderColorLayer();
  renderLineLayer();
}

function drawHover() {
  const k = zoomTransform.k;
  if (hoveredId && landIndex.has(hoveredId)) {
    const feature = landIndex.get(hoveredId);
    if (!((k < 2 && boundsPath.area(feature) * k * k < TINY_AREA) || !pathBoundsInScreen(feature, zoomTransform))) {
      lineCtx.beginPath();
      linePath(feature);
      lineCtx.strokeStyle = "#f1c40f";
      lineCtx.lineWidth = 2 / k;
      lineCtx.stroke();
    }
  }
}

function markHitDirty() {
  hitCanvasDirty = true;
}

function drawHidden() {
  if (!landData || !hitCanvasDirty) return;
  hitCanvasDirty = false;

  // CRITICAL: Apply same transform as visible canvas (DPR + zoom)
  hitCtx.setTransform(1, 0, 0, 1, 0, 0);
  hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
  applyTransform(hitCtx);

  for (const feature of landData.features) {
    const id = feature.properties?.id || feature.properties?.NUTS_ID;
    const key = idToKey.get(id);
    if (!key) continue;
    if (!pathBoundsInScreen(feature, zoomTransform)) continue;
    const r = (key >> 16) & 255;
    const g = (key >> 8) & 255;
    const b = key & 255;
    hitCtx.fillStyle = `rgb(${r},${g},${b})`;
    hitCtx.beginPath();
    hitPath(feature);
    hitCtx.fill();
  }
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
  const [sx, sy] = d3.pointer(event, colorCanvas);
  // Hidden canvas now uses same transform as visible canvas
  // Just scale screen coords by DPR to get pixel coords
  const x = Math.round(sx * dpr);
  const y = Math.round(sy * dpr);
  if (x < 0 || y < 0 || x >= hitCanvas.width || y >= hitCanvas.height) {
    return null;
  }
  drawHidden();
  const pixel = hitCtx.getImageData(x, y, 1, 1).data;
  const key = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
  if (!key) return null;
  return keyToId.get(key) || null;
}

function handleMouseMove(event) {
  const now = performance.now();
  if (now - lastMouseMoveTime < MOUSE_THROTTLE_MS) return;
  lastMouseMoveTime = now;
  if (!landData) return;
  if (isInteracting) return;
  const id = getFeatureIdFromEvent(event);
  if (id !== hoveredId) {
    hoveredId = id;
    drawHover();
  }

  if (!tooltip) return;
  if (id && landIndex.has(id)) {
    const feature = landIndex.get(id);
    const name = feature?.properties?.name || "Unknown Region";
    const code = (feature?.properties?.cntr_code || "").toUpperCase();
    tooltip.textContent = code ? `${name} (${code})` : name;
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

function getCountryCode(feature) {
  const code =
    feature.properties?.cntr_code ||
    feature.properties?.CNTR_CODE ||
    feature.properties?.CNTR ||
    "";
  return code ? String(code).toUpperCase() : "";
}

function applyCountryColor(code, color) {
  if (!landData) return;
  const target = String(code || "").toUpperCase();
  if (!target) return;
  for (const feature of landData.features) {
    const id = feature.properties?.id || feature.properties?.NUTS_ID;
    if (!id) continue;
    if (getCountryCode(feature) !== target) continue;
    colors[id] = color;
  }
  invalidateBorderCache();
  renderFull();
}

function applyPaletteToMap() {
  if (!landData) return;
  for (const feature of landData.features) {
    const id = feature.properties?.id || feature.properties?.NUTS_ID;
    if (!id) continue;
    const code = getCountryCode(feature);
    const color = countryPalette[code];
    if (color) {
      colors[id] = color;
    }
  }
  invalidateBorderCache();
  renderFull();
}

function handleClick(event) {
  if (!landData) return;
  const id = getFeatureIdFromEvent(event);
  if (!id) return;
  const feature = landIndex.get(id);
  if (!feature) return;

  if (currentTool === "eraser") {
    delete colors[id];
    invalidateBorderCache();
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
    invalidateBorderCache();
    renderLineLayer();
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

function setupRightSidebar() {
  const list = document.getElementById("countryList");
  if (!list) return;
  const searchInput = document.getElementById("countrySearch");
  const resetBtn = document.getElementById("resetCountryColors");

  const entries = Object.keys(countryNames)
    .map((code) => ({ code, name: countryNames[code] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderList = () => {
    const term = (searchInput?.value || "").trim().toLowerCase();
    list.innerHTML = "";
    entries.forEach(({ code, name }) => {
      if (term) {
        const match =
          name.toLowerCase().includes(term) || code.toLowerCase().includes(term);
        if (!match) return;
      }
      const row = document.createElement("div");
      row.className =
        "flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2";

      const label = document.createElement("div");
      label.className = "text-sm font-medium text-slate-700";
      label.textContent = `${name} (${code})`;

      const input = document.createElement("input");
      input.type = "color";
      input.value = countryPalette[code] || defaultCountryPalette[code] || "#cccccc";
      input.className =
        "h-8 w-10 cursor-pointer rounded-md border border-slate-300 bg-white";
      input.addEventListener("change", (event) => {
        const value = event.target.value;
        countryPalette[code] = value;
        applyCountryColor(code, value);
      });

      row.appendChild(label);
      row.appendChild(input);
      list.appendChild(row);
    });
  };

  if (searchInput) {
    searchInput.addEventListener("input", renderList);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      Object.keys(defaultCountryPalette).forEach((code) => {
        countryPalette[code] = defaultCountryPalette[code];
      });
      applyPaletteToMap();
      renderList();
    });
  }

  renderList();
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
      applyPaletteToMap();
    });
  }

  if (presetClear) {
    presetClear.addEventListener("click", () => {
      Object.keys(colors).forEach((key) => delete colors[key]);
      invalidateBorderCache();
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
    console.log("Loading TopoJSON data...");
    topology = await d3.json("data/europe_topology.json");

    if (!topology) {
      console.error("CRITICAL: TopoJSON file loaded but is null/undefined");
      return;
    }

    console.log("TopoJSON loaded. Type:", topology.type);
    console.log("Available objects:", Object.keys(topology.objects || {}));
    console.log("Total arcs:", topology.arcs?.length || 0);

    // Defensive extraction with fallback checks
    const objects = topology.objects || {};

    if (!objects.political) {
      console.error("CRITICAL: 'political' object missing from TopoJSON");
      console.log("Available keys:", Object.keys(objects));
      return;
    }

    landData = topojson.feature(topology, objects.political);
    console.log("Political features:", landData?.features?.length || 0);

    if (objects.rivers) {
      riversData = topojson.feature(topology, objects.rivers);
      console.log("Rivers features:", riversData?.features?.length || 0);
    }

    if (objects.ocean) {
      oceanData = topojson.feature(topology, objects.ocean);
      console.log("Ocean features:", oceanData?.features?.length || 0);
    }

    if (objects.land) {
      landBgData = topojson.feature(topology, objects.land);
      console.log("Land background features:", landBgData?.features?.length || 0);
    }

    if (objects.urban) {
      urbanData = topojson.feature(topology, objects.urban);
      console.log("Urban features:", urbanData?.features?.length || 0);
    }

    if (objects.physical) {
      physicalData = topojson.feature(topology, objects.physical);
      console.log("Physical features:", physicalData?.features?.length || 0);
    }

    cachedCoastlines = null;
    invalidateBorderCache();

    // Validate properties
    const sample = landData.features?.[0]?.properties;
    if (sample) {
      console.log("Sample feature properties:", Object.keys(sample));
      if (!sample.id) {
        console.error("CRITICAL: 'id' property missing from TopoJSON features!");
      }
      if (!sample.cntr_code && !sample.CNTR_CODE) {
        console.warn("WARNING: 'cntr_code' property may be missing");
      }
    } else {
      console.error("CRITICAL: No features found in political layer!");
      return;
    }

    buildIndex();
    console.log("Index built. Entries:", landIndex.size);

    fitProjection();
    console.log("Projection fitted. Scale:", projection.scale());

    renderFull();
    console.log("Initial render complete.");
  } catch (error) {
    console.error("Failed to load TopoJSON:", error);
    console.error("Stack trace:", error.stack);
  }
}

const zoom = d3
  .zoom()
  .scaleExtent([1, 50])
  .on("start", () => {
    isInteracting = true;
  })
  .on("zoom", (event) => {
    zoomTransform = event.transform;
    if (!zoomRenderScheduled) {
      zoomRenderScheduled = true;
      requestAnimationFrame(() => {
        renderFull();
        zoomRenderScheduled = false;
      });
    }
  })
  .on("end", (event) => {
    zoomTransform = event.transform;
    isInteracting = false;
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

// Verify topojson-client is loaded
if (typeof topojson === "undefined") {
  console.error("CRITICAL: topojson-client library not loaded! Check script tag in index.html");
} else {
  console.log("topojson-client loaded successfully");
}

setupUI();
setupRightSidebar();
handleResize();
loadData();
