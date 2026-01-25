/*
  Canvas rendering pipeline with hidden-canvas hit detection.
  Data is already in EPSG:3035, so we use geoIdentity + fitSize to map
  metric coordinates directly into the canvas. We apply zoom/pan via
  d3.zoom transforms on the canvas contexts (both visible and hidden).
*/

const canvas = document.getElementById("mapCanvas");
const context = canvas.getContext("2d");

const hitCanvas = document.createElement("canvas");
const hitContext = hitCanvas.getContext("2d", { willReadFrequently: true });
const staticCanvas = document.createElement("canvas");
const staticContext = staticCanvas.getContext("2d");

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
};

const projection = d3.geoIdentity().reflectY(true);
const path = d3.geoPath(projection, context);
const hitPath = d3.geoPath(projection, hitContext);
const staticPath = d3.geoPath(projection, staticContext);

const landIndex = new Map();
const idToKey = new Map();
const keyToId = new Map();

function setCanvasSize() {
  dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth || window.innerWidth;
  height = canvas.clientHeight || window.innerHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  hitCanvas.width = Math.floor(width * dpr);
  hitCanvas.height = Math.floor(height * dpr);
  staticCanvas.width = Math.floor(width * dpr);
  staticCanvas.height = Math.floor(height * dpr);
}

function fitProjection() {
  if (!landData) return;
  projection.fitSize([width, height], landData);
}

function applyTransform(ctx) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(zoomTransform.x, zoomTransform.y);
  ctx.scale(zoomTransform.k, zoomTransform.k);
}

function setDprTransform(ctx) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderStatic() {
  if (!landData) return;
  staticContext.setTransform(1, 0, 0, 1, 0, 0);
  staticContext.clearRect(0, 0, staticCanvas.width, staticCanvas.height);
  setDprTransform(staticContext);

  if (oceanData) {
    staticContext.beginPath();
    staticPath(oceanData);
    staticContext.fillStyle = "#b3d9ff";
    staticContext.fill();
  }

  if (landBgData) {
    staticContext.beginPath();
    staticPath(landBgData);
    staticContext.fillStyle = "#e0e0e0";
    staticContext.fill();
  }

  if (showUrban && urbanData) {
    staticContext.save();
    staticContext.globalAlpha = 0.2;
    staticContext.fillStyle = "#333333";
    staticContext.beginPath();
    staticPath(urbanData);
    staticContext.fill();
    staticContext.restore();
  }
}

function drawLand() {
  context.beginPath();
  path(landData);
  context.fillStyle = "#d9d9d9";
  context.fill();
  for (const feature of landData.features) {
    const id = feature.properties?.NUTS_ID;
    if (id && colors[id]) {
      context.fillStyle = colors[id];
      context.beginPath();
      path(feature);
      context.fill();
    }
  }
  context.beginPath();
  path(landData);
  context.strokeStyle = "#999999";
  context.lineWidth = 0.5;
  context.stroke();
}

function drawHidden() {
  hitContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  hitContext.clearRect(0, 0, width, height);
  hitContext.save();
  hitContext.translate(zoomTransform.x, zoomTransform.y);
  hitContext.scale(zoomTransform.k, zoomTransform.k);

  for (const feature of landData.features) {
    const id = feature.properties?.NUTS_ID;
    const key = idToKey.get(id);
    if (!key) continue;
    const r = (key >> 16) & 255;
    const g = (key >> 8) & 255;
    const b = key & 255;
    hitContext.fillStyle = `rgb(${r},${g},${b})`;
    hitContext.beginPath();
    hitPath(feature);
    hitContext.fill();
  }

  hitContext.restore();
}

function draw() {
  if (!landData) return;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  applyTransform(context);
  context.drawImage(staticCanvas, 0, 0, width, height);

  drawLand();

  if (showPhysical && physicalData) {
    context.save();
    for (const feature of physicalData.features) {
      const featureType = feature.properties?.featurecla;
      if (featureType === "Range/Mountain") {
        context.globalAlpha = 0.6;
        context.strokeStyle = "#5c4033";
        context.lineWidth = 1.2;
        context.setLineDash([4, 4]);
        context.beginPath();
        path(feature);
        context.stroke();
        context.setLineDash([]);

        if (zoomTransform.k >= 1.4) {
          const name = feature.properties?.name || feature.properties?.name_en;
          if (name) {
            const [x, y] = path.centroid(feature);
            if (Number.isFinite(x) && Number.isFinite(y)) {
              context.fillStyle = "#5c4033";
              context.globalAlpha = 0.7;
              context.font = "10px Georgia, serif";
              context.fillText(name, x, y);
            }
          }
        }
      } else if (featureType === "Forest") {
        context.globalAlpha = 0.1;
        context.fillStyle = "#2e6b4f";
        context.beginPath();
        path(feature);
        context.fill();
      } else if (featureType === "Plain" || featureType === "Delta") {
        context.globalAlpha = 0.08;
        context.fillStyle = "#d8caa3";
        context.beginPath();
        path(feature);
        context.fill();
      }
    }
    context.restore();
  }

  if (bordersData) {
    context.beginPath();
    path(bordersData);
    context.strokeStyle = "#111111";
    context.lineWidth = 1.6;
    context.stroke();
  }

  if (showRivers && riversData) {
    context.beginPath();
    path(riversData);
    context.strokeStyle = "#3498db";
    context.lineWidth = 1;
    context.stroke();
  }

  if (hoveredId && landIndex.has(hoveredId)) {
    context.beginPath();
    path(landIndex.get(hoveredId));
    context.strokeStyle = "#f1c40f";
    context.lineWidth = 2;
    context.stroke();
  }

  drawHidden();
}

function buildIndex() {
  landIndex.clear();
  idToKey.clear();
  keyToId.clear();

  landData.features.forEach((feature, index) => {
    const id = feature.properties?.NUTS_ID || `feature-${index}`;
    landIndex.set(id, feature);
    const key = index + 1;
    idToKey.set(id, key);
    keyToId.set(key, id);
  });
}

function getFeatureIdFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * dpr;
  const y = (event.clientY - rect.top) * dpr;
  const pixel = hitContext.getImageData(x, y, 1, 1).data;
  const key = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
  if (!key) return null;
  return keyToId.get(key) || null;
}

function handleMouseMove(event) {
  if (!landData) return;
  const id = getFeatureIdFromEvent(event);
  if (id !== hoveredId) {
    hoveredId = id;
    draw();
  }
}

function handleClick(event) {
  if (!landData) return;
  const id = getFeatureIdFromEvent(event);
  if (!id) return;

  if (currentTool === "eraser") {
    delete colors[id];
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
  }
  draw();
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
  const textureOverlay = document.getElementById("textureOverlay");
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
    if (customColor) {
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
      const dataUrl = canvas.toDataURL(format, 0.92);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `map_snapshot.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  if (textureSelect && textureOverlay) {
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
      renderStatic();
      draw();
    });
  }

  if (togglePhysical) {
    togglePhysical.addEventListener("change", (event) => {
      showPhysical = event.target.checked;
      draw();
    });
  }

  if (toggleRivers) {
    toggleRivers.addEventListener("change", (event) => {
      showRivers = event.target.checked;
      draw();
    });
  }

  if (presetPolitical) {
    presetPolitical.addEventListener("click", () => {
      if (!landData) return;
      for (const feature of landData.features) {
        const id = feature.properties?.NUTS_ID;
        const cntr = feature.properties?.CNTR_CODE;
        if (!id || !cntr) continue;
        const color = countryPalette[cntr];
        if (color) {
          colors[id] = color;
        }
      }
      draw();
    });
  }

  if (presetClear) {
    presetClear.addEventListener("click", () => {
      Object.keys(colors).forEach((key) => delete colors[key]);
      draw();
    });
  }

  renderRecentColors();
  updateSwatchUI();
  updateToolUI();
}

function handleResize() {
  setCanvasSize();
  fitProjection();
  renderStatic();
  draw();
}

async function loadData() {
  try {
    const [land, rivers, borders, ocean, landBg, urban, physical] = await Promise.all([
      d3.json("data/europe_test_nuts3.geojson"),
      d3.json("data/europe_rivers.geojson"),
      d3.json("data/europe_countries.geojson"),
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
    renderStatic();
    draw();
  } catch (error) {
    console.error("Failed to load GeoJSON:", error);
  }
}

const zoom = d3
  .zoom()
  .scaleExtent([1, 8])
  .on("zoom", (event) => {
    zoomTransform = event.transform;
    draw();
  })
  .on("end", () => {
    renderStatic();
    draw();
  });

d3.select(canvas).call(zoom);

canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("click", handleClick);
window.addEventListener("resize", handleResize);

setupUI();
handleResize();
loadData();
