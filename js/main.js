// App entry point (Phase 13)
import { state } from "./core/state.js";
import { loadMapData } from "./core/data_loader.js";
import { initMap, setMapData, render } from "./core/map_renderer.js";
import { initSidebar, initPresetState } from "./ui/sidebar.js";
import { initToolbar } from "./ui/toolbar.js";
import { initTranslations } from "./ui/i18n.js";

function processHierarchyData(data) {
  state.hierarchyData = data || null;
  state.hierarchyGroupsByCode = new Map();
  if (!state.hierarchyData || !state.hierarchyData.groups) return;
  const labels = state.hierarchyData.labels || {};
  Object.entries(state.hierarchyData.groups).forEach(([groupId, children]) => {
    const code = groupId.split("_")[0];
    if (!code) return;
    const list = state.hierarchyGroupsByCode.get(code) || [];
    list.push({
      id: groupId,
      label: labels[groupId] || groupId,
      children: Array.isArray(children) ? children : [],
    });
    state.hierarchyGroupsByCode.set(code, list);
  });
  state.hierarchyGroupsByCode.forEach((groups) => {
    groups.sort((a, b) => a.label.localeCompare(b.label));
  });
}

function hydrateLanguage() {
  try {
    const storedLang = localStorage.getItem("map_lang");
    if (storedLang) {
      state.currentLanguage = storedLang;
    }
  } catch (error) {
    console.warn("Language preference not available:", error);
  }
}

async function bootstrap() {
  if (!globalThis.d3 || !globalThis.topojson) {
    console.error("D3/topojson not loaded. Ensure scripts are included before main.js.");
    return;
  }

  hydrateLanguage();

  try {
    const { topology, locales, hierarchy } = await loadMapData();
    state.topology = topology;
    state.locales = locales || { ui: {}, geo: {} };
    processHierarchyData(hierarchy);

    if (!state.topology) {
      console.error("CRITICAL: TopoJSON file loaded but is null/undefined");
      return;
    }

    const objects = state.topology.objects || {};
    if (!objects.political) {
      console.error("CRITICAL: 'political' object missing from TopoJSON");
      return;
    }

    state.landData = globalThis.topojson.feature(state.topology, objects.political);

    if (objects.special_zones) {
      state.specialZonesData = globalThis.topojson.feature(state.topology, objects.special_zones);
    }
    if (objects.rivers) {
      state.riversData = globalThis.topojson.feature(state.topology, objects.rivers);
    }
    if (objects.ocean) {
      state.oceanData = globalThis.topojson.feature(state.topology, objects.ocean);
    }
    if (objects.land) {
      state.landBgData = globalThis.topojson.feature(state.topology, objects.land);
    }
    if (objects.urban) {
      state.urbanData = globalThis.topojson.feature(state.topology, objects.urban);
    }
    if (objects.physical) {
      state.physicalData = globalThis.topojson.feature(state.topology, objects.physical);
    }

    initPresetState();
    initMap();
    setMapData();

    const renderApp = () => {
      render();
    };
    globalThis.renderApp = renderApp;

    initToolbar({ render: renderApp });
    initTranslations();
    initSidebar({ render: renderApp });

    renderApp();
    console.log("Initial render complete.");
  } catch (error) {
    console.error("Failed to load TopoJSON:", error);
    console.error("Stack trace:", error.stack);
  }
}

bootstrap();
