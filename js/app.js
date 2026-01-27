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
const referenceImage = document.getElementById("referenceImage");

const hitCanvas = document.createElement("canvas");
const hitCtx = hitCanvas.getContext("2d", { willReadFrequently: true });

let locales = { ui: {}, geo: {} };
window.currentLanguage = window.currentLanguage || "en";
try {
  const storedLang = localStorage.getItem("map_lang");
  if (storedLang) {
    window.currentLanguage = storedLang;
  }
} catch (error) {
  console.warn("Language preference not available:", error);
}

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
const PALETTE_THEMES = {
  "HOI4 Vanilla": [
    "#871818", "#d62828", "#f77f00", "#fcbf49",
    "#3e5c76", "#1d3557", "#457b9d", "#a8dadc",
    "#333333", "#5c5c5c", "#8a8a8a", "#4f772d",
    "#8c2f39", "#9e2a2b", "#b23a48", "#6d597a",
  ],
  "TNO (The New Order)": [
    "#420420", "#5e0d0d", "#2a2a2a", "#0f0f0f",
    "#00f7ff", "#00d9ff", "#00ff9d", "#ccff00",
    "#ff0055", "#ffcc00", "#8a2be2", "#2e8b57",
    "#adb5bd", "#6c757d", "#495057", "#343a40",
  ],
  "Kaiserreich": [
    "#7b1113", "#a31621", "#bf1a2f", "#e01e37",
    "#2d6a4f", "#40916c", "#52b788", "#74c69d",
    "#14213d", "#fca311", "#e5e5e5", "#ffffff",
    "#ffb703", "#fb8500", "#8e9aaf", "#cbc0d3",
  ],
  "Red Flood (Avant-Garde)": [
    "#ff0000", "#ffaa00", "#ffff00", "#00ff00",
    "#00ffff", "#0000ff", "#ff00ff", "#9d4edd",
    "#240046", "#3c096c", "#5a189a", "#7b2cbf",
    "#10002b", "#000000", "#ffffff", "#ff5400",
  ],
};
let currentPaletteTheme = "HOI4 Vanilla";
let selectedColor = PALETTE_THEMES[currentPaletteTheme][0];
let currentTool = "fill";
let hoveredId = null;
let zoomTransform = d3.zoomIdentity;
let showUrban = true;
let showPhysical = true;
let showRivers = true;
let cachedBorders = null;
let cachedColorsHash = null;
let cachedCoastlines = null;
let referenceImageUrl = null;
const referenceImageState = {
  opacity: 0.6,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};
const styleConfig = {
  internalBorders: {
    color: "#cccccc",
    opacity: 1,
    width: 0.5,
  },
  empireBorders: {
    color: "#000000",
    width: 1.0,
  },
  coastlines: {
    color: "#333333",
    width: 1.2,
  },
};
let recentColors = [];
let updateRecentUI = null;
let updateSwatchUIFn = null;
let updateToolUIFn = null;
let renderCountryListFn = null;
let renderPresetTreeFn = null;
let isEditingPreset = false;
let editingPresetRef = null;
let editingPresetIds = new Set();
const PRESET_STORAGE_KEY = "custom_presets";
let customPresets = {};
let presetsState = {};
const expandedPresetCountries = new Set();

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
  GE: "#a23e48",
  AM: "#2a9d8f",
  AZ: "#f4a261",
  MN: "#577590",
  CN: "#c1121f",
  JP: "#38b000",
  KR: "#2563eb",
  KP: "#7f1d1d",
  TW: "#f59e0b",
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
  GE: "Georgia",
  AM: "Armenia",
  AZ: "Azerbaijan",
  MN: "Mongolia",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  KP: "North Korea",
  TW: "Taiwan",
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

const countryPresets = {
  // GERMANY - Historical & HOI4
  DE: [
    {
      name: "Bavaria",
      ids: [
        "DE211", "DE212", "DE213", "DE214", "DE215", "DE216", "DE217", "DE218", "DE219",
        "DE21A", "DE21B", "DE21C", "DE21D", "DE21E", "DE21F", "DE21G", "DE21H", "DE21I",
        "DE21J", "DE21K", "DE21L", "DE21M", "DE21N", "DE221", "DE222", "DE223", "DE224",
        "DE225", "DE226", "DE227", "DE228", "DE229", "DE22A", "DE22B", "DE22C", "DE231",
        "DE232", "DE233", "DE234", "DE235", "DE236", "DE237", "DE238", "DE239", "DE23A",
        "DE241", "DE242", "DE243", "DE244", "DE245", "DE246", "DE247", "DE248", "DE249",
        "DE24A", "DE24B", "DE24C", "DE24D", "DE251", "DE252", "DE253", "DE254", "DE255",
        "DE256", "DE257", "DE258", "DE259", "DE25A", "DE25B", "DE25C", "DE261", "DE262",
        "DE263", "DE264", "DE265", "DE266", "DE267", "DE268", "DE269", "DE26A", "DE26B",
        "DE26C", "DE271", "DE272", "DE273", "DE274", "DE275", "DE276", "DE277", "DE278",
        "DE279", "DE27A", "DE27B", "DE27C", "DE27D", "DE27E",
      ],
    },
    {
      name: "Saxony",
      ids: [
        "DED21", "DED2C", "DED2D", "DED2E", "DED2F", "DED41", "DED42", "DED43", "DED44",
        "DED45", "DED51", "DED52", "DED53",
      ],
    },
    {
      name: "Prussia (Eastern Core)",
      ids: [
        // Berlin
        "DE300",
        // Brandenburg
        "DE401", "DE402", "DE403", "DE404", "DE405", "DE406", "DE407", "DE408", "DE409",
        "DE40A", "DE40B", "DE40C", "DE40D", "DE40E", "DE40F", "DE40G", "DE40H", "DE40I",
        // Mecklenburg-Vorpommern
        "DE803", "DE804", "DE80J", "DE80K", "DE80L", "DE80M", "DE80N", "DE80O",
        // Saxony-Anhalt
        "DEE01", "DEE02", "DEE03", "DEE04", "DEE05", "DEE06", "DEE07", "DEE08", "DEE09",
        "DEE0A", "DEE0B", "DEE0C", "DEE0D", "DEE0E",
      ],
    },
    {
      name: "Schleswig-Holstein",
      ids: [
        "DEF01", "DEF02", "DEF03", "DEF04", "DEF05", "DEF06", "DEF07", "DEF08", "DEF09",
        "DEF0A", "DEF0B", "DEF0C", "DEF0D", "DEF0E", "DEF0F",
      ],
    },
  ],

  // FRANCE - Historical & HOI4
  FR: [
    {
      name: "Alsace-Lorraine (1871)",
      ids: [
        // Moselle (57)
        "FR_ARR_57003", "FR_ARR_57005", "FR_ARR_57006", "FR_ARR_57007", "FR_ARR_57009",
        // Bas-Rhin (67)
        "FR_ARR_67002", "FR_ARR_67003", "FR_ARR_67004", "FR_ARR_67005", "FR_ARR_67008",
        // Haut-Rhin (68)
        "FR_ARR_68001", "FR_ARR_68002", "FR_ARR_68004", "FR_ARR_68006",
      ],
    },
    {
      name: "Brittany",
      ids: [
        // Côtes-d'Armor (22)
        "FR_ARR_22001", "FR_ARR_22002", "FR_ARR_22003", "FR_ARR_22004",
        // Finistère (29)
        "FR_ARR_29001", "FR_ARR_29002", "FR_ARR_29003", "FR_ARR_29004",
        // Ille-et-Vilaine (35)
        "FR_ARR_35001", "FR_ARR_35002", "FR_ARR_35003", "FR_ARR_35004",
        // Morbihan (56)
        "FR_ARR_56001", "FR_ARR_56002", "FR_ARR_56003",
      ],
    },
    {
      name: "Savoy & Nice (pre-1860)",
      ids: [
        // Alpes-Maritimes (06)
        "FR_ARR_06001", "FR_ARR_06002",
        // Savoie (73)
        "FR_ARR_73001", "FR_ARR_73002", "FR_ARR_73003",
        // Haute-Savoie (74)
        "FR_ARR_74001", "FR_ARR_74002", "FR_ARR_74003", "FR_ARR_74004",
      ],
    },
    {
      name: "TNO Burgundy (SS State)",
      ids: [
        // Alsace-Lorraine regions
        "FR_ARR_57003", "FR_ARR_57005", "FR_ARR_57006", "FR_ARR_57007", "FR_ARR_57009",
        "FR_ARR_67002", "FR_ARR_67003", "FR_ARR_67004", "FR_ARR_67005", "FR_ARR_67008",
        "FR_ARR_68001", "FR_ARR_68002", "FR_ARR_68004", "FR_ARR_68006",
        // Franche-Comté (25, 39, 70, 90)
        "FR_ARR_25001", "FR_ARR_25002", "FR_ARR_25003",
        "FR_ARR_39001", "FR_ARR_39002", "FR_ARR_39003",
        "FR_ARR_70001", "FR_ARR_70002",
        "FR_ARR_90001",
        // Bourgogne (21, 58, 71, 89)
        "FR_ARR_21001", "FR_ARR_21002", "FR_ARR_21003",
        "FR_ARR_58001", "FR_ARR_58002", "FR_ARR_58003", "FR_ARR_58004",
        "FR_ARR_71001", "FR_ARR_71002", "FR_ARR_71003", "FR_ARR_71004", "FR_ARR_71005",
        "FR_ARR_89001", "FR_ARR_89002", "FR_ARR_89003",
      ],
    },
  ],

  // ITALY - Historical
  IT: [
    {
      name: "Kingdom of Two Sicilies",
      ids: [
        // Abruzzo
        "ITF11", "ITF12", "ITF13", "ITF14",
        // Molise
        "ITF21", "ITF22",
        // Campania
        "ITF31", "ITF32", "ITF33", "ITF34", "ITF35",
        // Puglia
        "ITF43", "ITF44", "ITF45", "ITF46", "ITF47", "ITF48",
        // Basilicata
        "ITF51", "ITF52",
        // Calabria
        "ITF61", "ITF62", "ITF63", "ITF64", "ITF65",
        // Sicily
        "ITG11", "ITG12", "ITG13", "ITG14", "ITG15", "ITG16", "ITG17", "ITG18", "ITG19",
      ],
    },
    {
      name: "Papal States (Lazio)",
      ids: ["ITI41", "ITI42", "ITI43", "ITI44", "ITI45"],
    },
    {
      name: "Sardinia-Piedmont",
      ids: [
        // Piemonte
        "ITC11", "ITC12", "ITC13", "ITC14", "ITC15", "ITC16", "ITC17", "ITC18",
        // Valle d'Aosta
        "ITC20",
        // Liguria
        "ITC31", "ITC32", "ITC33", "ITC34",
        // Sardinia
        "ITG2D", "ITG2E", "ITG2F", "ITG2G", "ITG2H",
      ],
    },
    {
      name: "Lombardy-Venetia",
      ids: [
        // Lombardia
        "ITC41", "ITC42", "ITC43", "ITC44", "ITC46", "ITC47", "ITC48", "ITC49",
        "ITC4A", "ITC4B", "ITC4C", "ITC4D",
        // Veneto
        "ITH31", "ITH32", "ITH33", "ITH34", "ITH35", "ITH36", "ITH37",
        // Friuli-Venezia Giulia
        "ITH41", "ITH42", "ITH43", "ITH44",
      ],
    },
    {
      name: "Grand Duchy of Tuscany",
      ids: [
        "ITI11", "ITI12", "ITI13", "ITI14", "ITI15", "ITI16", "ITI17", "ITI18", "ITI19", "ITI1A",
      ],
    },
  ],

  // UNITED KINGDOM - Historical
  UK: [
    {
      name: "Scotland",
      ids: [
        "UKM50", "UKM61", "UKM62", "UKM63", "UKM64", "UKM65", "UKM66", "UKM71", "UKM72",
        "UKM73", "UKM75", "UKM76", "UKM77", "UKM78", "UKM81", "UKM82", "UKM83", "UKM84",
        "UKM91", "UKM92", "UKM93", "UKM94", "UKM95",
      ],
    },
    {
      name: "Wales",
      ids: [
        "UKL11", "UKL12", "UKL13", "UKL14", "UKL15", "UKL16", "UKL17", "UKL18",
        "UKL21", "UKL22", "UKL23", "UKL24",
      ],
    },
    {
      name: "Northern Ireland",
      ids: [
        "UKN06", "UKN07", "UKN08", "UKN09", "UKN0A", "UKN0B", "UKN0C", "UKN0D", "UKN0E",
        "UKN0F", "UKN0G",
      ],
    },
  ],

  // RUSSIA - Historical & HOI4 (Approximate due to Oblast-level granularity)
  RU: [
    {
      name: "Moscow Region",
      ids: ["RUS-2364", "RUS-2365"],
    },
    {
      name: "St. Petersburg Region",
      ids: ["RUS-2336", "RUS-2337"],
    },
    {
      name: "TNO WRRF (Approximate)",
      ids: [
        "RUS-2333", "RUS-2334", "RUS-2335", "RUS-2336", "RUS-2337", "RUS-2342", "RUS-2343",
        "RUS-2353", "RUS-2354", "RUS-2355", "RUS-2356", "RUS-2358", "RUS-2359", "RUS-2360",
      ],
    },
    {
      name: "TNO Komi (Approximate)",
      ids: ["RUS-2383"],
    },
    {
      name: "Caucasus",
      ids: [
        "RUS-2279", "RUS-2280", "RUS-2303", "RUS-2304", "RUS-2305", "RUS-2306",
        "RUS-2371", "RUS-2416", "RUS-2417",
      ],
    },
  ],
};

function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("Unable to load custom presets:", error);
    return {};
  }
}

function mergePresets(base, custom) {
  const merged = {};
  Object.keys(base || {}).forEach((code) => {
    merged[code] = (base[code] || []).map((preset) => ({
      name: preset.name,
      ids: Array.isArray(preset.ids) ? [...preset.ids] : [],
    }));
  });
  Object.keys(custom || {}).forEach((code) => {
    if (!merged[code]) merged[code] = [];
    const customEntries = Array.isArray(custom[code]) ? custom[code] : [];
    customEntries.forEach((entry) => {
      if (!entry || !entry.name) return;
      const idx = merged[code].findIndex((preset) => preset.name === entry.name);
      const ids = Array.isArray(entry.ids) ? [...entry.ids] : [];
      if (idx >= 0) {
        merged[code][idx] = { name: entry.name, ids };
      } else {
        merged[code].push({ name: entry.name, ids });
      }
    });
  });
  return merged;
}

function saveCustomPresets() {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(customPresets));
  } catch (error) {
    console.warn("Unable to save custom presets:", error);
  }
}

function upsertCustomPreset(code, name, ids) {
  if (!customPresets[code]) customPresets[code] = [];
  const idx = customPresets[code].findIndex((preset) => preset.name === name);
  const entry = { name, ids: [...ids] };
  if (idx >= 0) {
    customPresets[code][idx] = entry;
  } else {
    customPresets[code].push(entry);
  }
  saveCustomPresets();
  presetsState = mergePresets(countryPresets, customPresets);
}

function initPresetState() {
  customPresets = loadCustomPresets();
  presetsState = mergePresets(countryPresets, customPresets);
}

function startPresetEdit(code, presetIndex) {
  const presets = presetsState[code] || [];
  const preset = presets[presetIndex];
  if (!preset) return;
  isEditingPreset = true;
  editingPresetRef = { code, presetIndex };
  editingPresetIds = new Set(preset.ids || []);
  if (typeof updateToolUIFn === "function") {
    updateToolUIFn();
  }
  renderFull();
  if (typeof renderPresetTreeFn === "function") {
    renderPresetTreeFn();
  }
}

function stopPresetEdit() {
  isEditingPreset = false;
  editingPresetRef = null;
  editingPresetIds = new Set();
  if (typeof updateToolUIFn === "function") {
    updateToolUIFn();
  }
  renderFull();
  if (typeof renderPresetTreeFn === "function") {
    renderPresetTreeFn();
  }
}

function togglePresetRegion(id) {
  if (!isEditingPreset || !id) return;
  if (editingPresetIds.has(id)) {
    editingPresetIds.delete(id);
  } else {
    editingPresetIds.add(id);
  }
  renderFull();
}

async function copyPresetIds(ids) {
  const payload = JSON.stringify(ids || [], null, 2);
  try {
    await navigator.clipboard.writeText(payload);
    console.log("Preset IDs copied to clipboard.");
  } catch (error) {
    console.warn("Clipboard unavailable, logging IDs instead.", error);
    console.log(payload);
  }
}

initPresetState();

// Apply a preset to color regions
function applyPreset(countryCode, presetIndex, color) {
  const presets = presetsState[countryCode];
  if (!presets || !presets[presetIndex]) {
    console.warn(`Preset not found: ${countryCode}[${presetIndex}]`);
    return;
  }

  const preset = presets[presetIndex];
  const colorToApply = color || selectedColor;

  preset.ids.forEach((id) => {
    colors[id] = colorToApply;
  });

  invalidateBorderCache();
  renderFull();

  // Update recent colors
  if (!recentColors.includes(colorToApply)) {
    recentColors.unshift(colorToApply);
    if (recentColors.length > 8) recentColors.pop();
    if (typeof updateRecentUI === "function") updateRecentUI();
  }

  console.log(`Applied preset "${preset.name}" with ${preset.ids.length} regions`);
}

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

function t(key, type = "geo") {
  if (!key) return "";
  if (window.currentLanguage === "zh") {
    return locales?.[type]?.[key]?.zh || key;
  }
  return key;
}

function applyUiTranslations() {
  const uiMap = [
    ["lblCurrentTool", "Current Tool"],
    ["toolFillBtn", "Fill"],
    ["toolEraserBtn", "Eraser"],
    ["toolEyedropperBtn", "Eyedropper"],
    ["lblRecent", "Recent"],
    ["lblPalette", "Color Palette"],
    ["lblCustom", "Custom"],
    ["lblExport", "Export Map"],
    ["lblExportFormat", "Format"],
    ["exportBtn", "Download Snapshot"],
    ["lblTexture", "Texture"],
    ["lblOverlay", "Overlay"],
    ["lblMapStyle", "Map Style"],
    ["labelPresetPolitical", "Auto-Fill Countries"],
    ["presetClear", "Clear Map"],
    ["lblCountrySearch", "Search Countries"],
    ["lblCountryColors", "Country Colors"],
    ["resetCountryColors", "Reset Country Colors"],
  ];

  uiMap.forEach(([id, label]) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = t(label, "ui");
    }
  });

  if (typeof updateToolUIFn === "function") {
    updateToolUIFn();
  }

  const searchInput = document.getElementById("countrySearch");
  if (searchInput) {
    searchInput.setAttribute("placeholder", t("Search...", "ui"));
  }
}

function toggleLanguage() {
  const nextLang = window.currentLanguage === "zh" ? "en" : "zh";
  window.currentLanguage = nextLang;
  try {
    localStorage.setItem("map_lang", nextLang);
  } catch (error) {
    console.warn("Unable to persist language preference:", error);
  }
  applyUiTranslations();
  setupRightSidebar();
}

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

function absoluteClear(ctx, canvas) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
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

  absoluteClear(colorCtx, colorCanvas);
  applyTransform(colorCtx);

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

  absoluteClear(lineCtx, lineCanvas);
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
      lineCtx.globalAlpha = 1;
      lineCtx.beginPath();
      linePath(coastlines);
      lineCtx.strokeStyle = styleConfig.coastlines.color;
      lineCtx.lineWidth = styleConfig.coastlines.width / k;
      lineCtx.stroke();
    }

    const gridLines = topojson.mesh(topology, political, (a, b) => a !== b);
    if (gridLines) {
      lineCtx.globalAlpha = styleConfig.internalBorders.opacity;
      lineCtx.beginPath();
      linePath(gridLines);
      lineCtx.strokeStyle = styleConfig.internalBorders.color;
      lineCtx.lineWidth = styleConfig.internalBorders.width / k;
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
      lineCtx.globalAlpha = 1;
      lineCtx.beginPath();
      linePath(dynamicBorders);
      lineCtx.strokeStyle = styleConfig.empireBorders.color;
      lineCtx.lineWidth = styleConfig.empireBorders.width / k;
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

  if (isEditingPreset && editingPresetIds.size > 0) {
    lineCtx.save();
    lineCtx.globalAlpha = 0.9;
    lineCtx.strokeStyle = "#f97316";
    lineCtx.lineWidth = 2 / k;
    for (const id of editingPresetIds) {
      const feature = landIndex.get(id);
      if (!feature) continue;
      if (!pathBoundsInScreen(feature, zoomTransform)) continue;
      lineCtx.beginPath();
      linePath(feature);
      lineCtx.stroke();
    }
    lineCtx.restore();
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
  absoluteClear(hitCtx, hitCanvas);
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
    const rawName = feature?.properties?.name || "Unknown Region";
    const name = t(rawName, "geo");
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

  if (isEditingPreset) {
    togglePresetRegion(id);
    return;
  }

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

function renderPalette(themeName) {
  console.log("Rendering palette:", themeName);
  const palette = PALETTE_THEMES[themeName];
  const paletteGrid = document.getElementById("paletteGrid");
  if (!paletteGrid || !palette) return;
  currentPaletteTheme = themeName;
  paletteGrid.replaceChildren();

  palette.forEach((color) => {
    const btn = document.createElement("button");
    btn.className = "color-swatch";
    btn.dataset.color = color;
    btn.style.backgroundColor = color;
    btn.addEventListener("click", () => {
      selectedColor = color;
      if (typeof updateSwatchUIFn === "function") {
        updateSwatchUIFn();
      }
    });
    paletteGrid.appendChild(btn);
  });

  if (!palette.includes(selectedColor) && palette.length > 0) {
    selectedColor = palette[0];
  }
  if (typeof updateSwatchUIFn === "function") {
    updateSwatchUIFn();
  }
}

function setupRightSidebar() {
  const list = document.getElementById("countryList");
  if (!list) return;
  const presetTree = document.getElementById("presetTree");
  const searchInput = document.getElementById("countrySearch");
  const resetBtn = document.getElementById("resetCountryColors");

  const entries = Object.keys(countryNames)
    .map((code) => {
      const name = countryNames[code];
      return { code, name, displayName: t(name, "geo") };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const expanded = new Set();
  const getSearchTerm = () => (searchInput?.value || "").trim().toLowerCase();

  const renderList = () => {
    const term = getSearchTerm();
    list.innerHTML = "";

    entries.forEach(({ code, name, displayName }) => {
      const presets = presetsState[code] || [];
      const countryMatch =
        !term ||
        name.toLowerCase().includes(term) ||
        displayName.toLowerCase().includes(term) ||
        code.toLowerCase().includes(term);
      const presetMatch = term
        ? presets.some((preset) =>
            preset.name.toLowerCase().includes(term)
          )
        : false;

      if (!countryMatch && !presetMatch) return;
      if (presetMatch) {
        expanded.add(code);
      }

      const row = document.createElement("div");
      row.className =
        "flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2";

      const label = document.createElement("div");
      label.className = "text-sm font-medium text-slate-700";
      label.textContent = `${displayName} (${code})`;

      const controls = document.createElement("div");
      controls.className = "flex items-center gap-2";

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

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className =
        "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-100";
      toggle.textContent = expanded.has(code) ? "▾" : "▸";
      toggle.addEventListener("click", () => {
        if (expanded.has(code)) {
          expanded.delete(code);
        } else {
          expanded.add(code);
        }
        renderList();
      });

      controls.appendChild(input);
      controls.appendChild(toggle);

      row.appendChild(label);
      row.appendChild(controls);
      list.appendChild(row);

      if (presets.length > 0 && expanded.has(code)) {
        const child = document.createElement("div");
        child.className = "ml-2 space-y-2 pb-2";
        presets.forEach((preset, presetIndex) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className =
            "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-100";
          btn.textContent = `Apply ${preset.name}`;
          btn.addEventListener("click", () => {
            applyPreset(code, presetIndex);
          });
          child.appendChild(btn);
        });
        list.appendChild(child);
      }
    });
  };

  renderCountryListFn = renderList;

  const renderPresetTree = () => {
    if (!presetTree) return;
    const term = getSearchTerm();
    presetTree.innerHTML = "";

    entries.forEach(({ code, name, displayName }) => {
      const presets = presetsState[code] || [];
      if (!presets.length) return;

      const countryMatch =
        !term ||
        name.toLowerCase().includes(term) ||
        displayName.toLowerCase().includes(term) ||
        code.toLowerCase().includes(term);
      const presetMatch = term
        ? presets.some((preset) => preset.name.toLowerCase().includes(term))
        : false;

      if (!countryMatch && !presetMatch) return;
      if (presetMatch) {
        expandedPresetCountries.add(code);
      }

      const details = document.createElement("details");
      details.className = "group";
      details.open = expandedPresetCountries.has(code) || presetMatch;
      details.addEventListener("toggle", () => {
        if (details.open) {
          expandedPresetCountries.add(code);
        } else {
          expandedPresetCountries.delete(code);
        }
      });

      const summary = document.createElement("summary");
      summary.className =
        "cursor-pointer list-none flex items-center gap-2 rounded px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100";
      summary.innerHTML =
        '<svg class="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
      const label = document.createElement("span");
      label.textContent = `${displayName} (${code})`;
      summary.appendChild(label);
      details.appendChild(summary);

      const child = document.createElement("div");
      child.className = "ml-6 mt-1 space-y-1";
      presets.forEach((preset, index) => {
        const row = document.createElement("div");
        row.className =
          "flex items-center justify-between gap-2 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100";

        const nameBtn = document.createElement("button");
        nameBtn.type = "button";
        nameBtn.className = "flex-1 text-left";
        nameBtn.textContent = preset.name;
        nameBtn.addEventListener("click", () => {
          applyPreset(code, index);
        });

        const actions = document.createElement("div");
        actions.className = "flex items-center gap-2";

        const isEditingThis =
          isEditingPreset &&
          editingPresetRef &&
          editingPresetRef.code === code &&
          editingPresetRef.presetIndex === index;

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "text-[11px] text-slate-500 hover:text-slate-700";
        editBtn.textContent = isEditingThis ? "Cancel" : "✏️ Edit";
        editBtn.addEventListener("click", () => {
          if (isEditingThis) {
            stopPresetEdit();
          } else {
            startPresetEdit(code, index);
          }
        });

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className =
          "text-[11px] text-slate-500 hover:text-slate-700";
        saveBtn.textContent = "💾 Save";
        if (!isEditingThis) {
          saveBtn.classList.add("hidden");
        }
        saveBtn.addEventListener("click", () => {
          if (!isEditingThis) return;
          const ids = Array.from(editingPresetIds);
          const activePreset = presetsState[code]?.[index];
          if (activePreset) {
            activePreset.ids = ids;
            upsertCustomPreset(code, activePreset.name, ids);
          }
          stopPresetEdit();
        });

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "text-[11px] text-slate-500 hover:text-slate-700";
        copyBtn.textContent = "📋 Copy";
        copyBtn.addEventListener("click", () => {
          const ids = isEditingThis ? Array.from(editingPresetIds) : preset.ids;
          copyPresetIds(ids || []);
        });

        actions.appendChild(editBtn);
        actions.appendChild(saveBtn);
        actions.appendChild(copyBtn);

        row.appendChild(nameBtn);
        row.appendChild(actions);
        child.appendChild(row);
      });

      details.appendChild(child);
      presetTree.appendChild(details);
    });
  };

  renderPresetTreeFn = renderPresetTree;

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.addEventListener("input", () => {
      if (typeof renderCountryListFn === "function") {
        renderCountryListFn();
      }
      if (typeof renderPresetTreeFn === "function") {
        renderPresetTreeFn();
      }
    });
    searchInput.dataset.bound = "true";
  }

  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.addEventListener("click", () => {
      Object.keys(defaultCountryPalette).forEach((code) => {
        countryPalette[code] = defaultCountryPalette[code];
      });
      applyPaletteToMap();
      if (typeof renderCountryListFn === "function") {
        renderCountryListFn();
      }
    });
    resetBtn.dataset.bound = "true";
  }

  renderList();
  renderPresetTree();
}

function setupUI() {
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
  const internalBorderColor = document.getElementById("internalBorderColor");
  const internalBorderOpacity = document.getElementById("internalBorderOpacity");
  const internalBorderWidth = document.getElementById("internalBorderWidth");
  const empireBorderColor = document.getElementById("empireBorderColor");
  const empireBorderWidth = document.getElementById("empireBorderWidth");
  const coastlineColor = document.getElementById("coastlineColor");
  const coastlineWidth = document.getElementById("coastlineWidth");
  const toggleLang = document.getElementById("btnToggleLang");
  const themeSelect = document.getElementById("themeSelect");
  const referenceImageInput = document.getElementById("referenceImageInput");
  const referenceOpacity = document.getElementById("referenceOpacity");
  const referenceScale = document.getElementById("referenceScale");
  const referenceOffsetX = document.getElementById("referenceOffsetX");
  const referenceOffsetY = document.getElementById("referenceOffsetY");

  // Value display elements
  const internalBorderOpacityValue = document.getElementById("internalBorderOpacityValue");
  const internalBorderWidthValue = document.getElementById("internalBorderWidthValue");
  const empireBorderWidthValue = document.getElementById("empireBorderWidthValue");
  const coastlineWidthValue = document.getElementById("coastlineWidthValue");
  const referenceOpacityValue = document.getElementById("referenceOpacityValue");
  const referenceScaleValue = document.getElementById("referenceScaleValue");
  const referenceOffsetXValue = document.getElementById("referenceOffsetXValue");
  const referenceOffsetYValue = document.getElementById("referenceOffsetYValue");

  function renderRecentColors() {
    if (!recentContainer) return;
    recentContainer.replaceChildren();
    recentColors.forEach((color) => {
      const btn = document.createElement("button");
      btn.className = "color-swatch";
      btn.dataset.color = color;
      btn.style.backgroundColor = color;
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
    const swatches = document.querySelectorAll(".color-swatch");
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
    if (isEditingPreset) {
      currentToolLabel.textContent = "Editing Preset";
    } else if (currentTool === "eraser") {
      currentToolLabel.textContent = t("Eraser", "ui");
    } else if (currentTool === "eyedropper") {
      currentToolLabel.textContent = t("Eyedropper", "ui");
    } else {
      currentToolLabel.textContent = t("Fill", "ui");
    }
    toolButtons.forEach((button) => {
      const isActive = button.dataset.tool === currentTool;
      button.disabled = isEditingPreset;
      button.classList.toggle("opacity-50", isEditingPreset);
      button.classList.toggle("cursor-not-allowed", isEditingPreset);
      button.classList.toggle("bg-slate-900", isActive);
      button.classList.toggle("text-white", isActive);
      button.classList.toggle("bg-white", !isActive);
      button.classList.toggle("text-slate-700", !isActive);
    });
  }
  updateToolUIFn = updateToolUI;

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

  if (toggleLang && !toggleLang.dataset.bound) {
    toggleLang.addEventListener("click", toggleLanguage);
    toggleLang.dataset.bound = "true";
  }

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

  if (themeSelect) {
    themeSelect.value = currentPaletteTheme;
    themeSelect.addEventListener("change", (event) => {
      renderPalette(event.target.value);
    });
  }

  // Internal Borders controls
  if (internalBorderColor) {
    internalBorderColor.addEventListener("input", (event) => {
      styleConfig.internalBorders.color = event.target.value;
      renderFull();
    });
  }
  if (internalBorderOpacity) {
    internalBorderOpacity.addEventListener("input", (event) => {
      const value = Number(event.target.value) / 100;
      styleConfig.internalBorders.opacity = Number.isFinite(value) ? value : 1;
      if (internalBorderOpacityValue) {
        internalBorderOpacityValue.textContent = `${event.target.value}%`;
      }
      renderFull();
    });
  }
  if (internalBorderWidth) {
    internalBorderWidth.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      styleConfig.internalBorders.width = Number.isFinite(value) ? value : 0.5;
      if (internalBorderWidthValue) {
        internalBorderWidthValue.textContent = value.toFixed(1);
      }
      renderFull();
    });
  }

  // Empire Borders controls
  if (empireBorderColor) {
    empireBorderColor.addEventListener("input", (event) => {
      styleConfig.empireBorders.color = event.target.value;
      renderFull();
    });
  }
  if (empireBorderWidth) {
    empireBorderWidth.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      styleConfig.empireBorders.width = Number.isFinite(value) ? value : 1.0;
      if (empireBorderWidthValue) {
        empireBorderWidthValue.textContent = value.toFixed(1);
      }
      renderFull();
    });
  }

  // Coastline controls
  if (coastlineColor) {
    coastlineColor.addEventListener("input", (event) => {
      styleConfig.coastlines.color = event.target.value;
      renderFull();
    });
  }
  if (coastlineWidth) {
    coastlineWidth.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      styleConfig.coastlines.width = Number.isFinite(value) ? value : 1.2;
      if (coastlineWidthValue) {
        coastlineWidthValue.textContent = value.toFixed(1);
      }
      renderFull();
    });
  }

  const applyReferenceStyles = () => {
    if (!referenceImage) return;
    referenceImage.style.opacity = String(referenceImageState.opacity);
    referenceImage.style.transform = `translate(${referenceImageState.offsetX}px, ${referenceImageState.offsetY}px) scale(${referenceImageState.scale})`;
  };

  if (referenceImageInput) {
    referenceImageInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!referenceImage) return;
      if (!file) {
        if (referenceImageUrl) {
          URL.revokeObjectURL(referenceImageUrl);
          referenceImageUrl = null;
        }
        referenceImage.src = "";
        referenceImage.style.opacity = "0";
        return;
      }
      if (referenceImageUrl) {
        URL.revokeObjectURL(referenceImageUrl);
      }
      referenceImageUrl = URL.createObjectURL(file);
      referenceImage.src = referenceImageUrl;
      applyReferenceStyles();
    });
  }

  if (referenceOpacity) {
    referenceImageState.opacity = Number(referenceOpacity.value) / 100;
    if (referenceOpacityValue) {
      referenceOpacityValue.textContent = `${referenceOpacity.value}%`;
    }
    referenceOpacity.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      referenceImageState.opacity = Number.isFinite(value) ? value / 100 : 0.6;
      if (referenceOpacityValue) {
        referenceOpacityValue.textContent = `${event.target.value}%`;
      }
      applyReferenceStyles();
    });
  }

  if (referenceScale) {
    referenceImageState.scale = Number(referenceScale.value);
    if (referenceScaleValue) {
      referenceScaleValue.textContent = `${Number(referenceScale.value).toFixed(2)}×`;
    }
    referenceScale.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      referenceImageState.scale = Number.isFinite(value) ? value : 1;
      if (referenceScaleValue) {
        referenceScaleValue.textContent = `${referenceImageState.scale.toFixed(2)}×`;
      }
      applyReferenceStyles();
    });
  }

  if (referenceOffsetX) {
    referenceImageState.offsetX = Number(referenceOffsetX.value);
    if (referenceOffsetXValue) {
      referenceOffsetXValue.textContent = `${referenceOffsetX.value}px`;
    }
    referenceOffsetX.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      referenceImageState.offsetX = Number.isFinite(value) ? value : 0;
      if (referenceOffsetXValue) {
        referenceOffsetXValue.textContent = `${referenceImageState.offsetX}px`;
      }
      applyReferenceStyles();
    });
  }

  if (referenceOffsetY) {
    referenceImageState.offsetY = Number(referenceOffsetY.value);
    if (referenceOffsetYValue) {
      referenceOffsetYValue.textContent = `${referenceOffsetY.value}px`;
    }
    referenceOffsetY.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      referenceImageState.offsetY = Number.isFinite(value) ? value : 0;
      if (referenceOffsetYValue) {
        referenceOffsetYValue.textContent = `${referenceImageState.offsetY}px`;
      }
      applyReferenceStyles();
    });
  }

  renderPalette("HOI4 Vanilla");
  renderRecentColors();
  updateSwatchUI();
  updateToolUI();
  applyUiTranslations();
}

function handleResize() {
  setCanvasSize();
  fitProjection();
  renderFull();
}

async function loadData() {
  try {
    console.log("Loading TopoJSON + locales...");
    const [topo, localeData] = await Promise.all([
      d3.json("data/europe_topology.json"),
      d3.json("data/locales.json").catch((err) => {
        console.warn("Locales file missing or invalid, using defaults.", err);
        return { ui: {}, geo: {} };
      }),
    ]);
    topology = topo;
    locales = localeData || { ui: {}, geo: {} };
    console.log("Test Translation:", t("Germany", "geo"));
    applyUiTranslations();
    setupRightSidebar();

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
  .scaleExtent([0.5, 8])
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
