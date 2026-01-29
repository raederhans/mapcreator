// Data loading helpers (Phase 13 scaffold)

export async function loadMapData({
  topologyUrl = "data/europe_topology.json",
  localesUrl = "data/locales.json",
  hierarchyUrl = "data/hierarchy.json",
  d3Client = globalThis.d3,
} = {}) {
  if (!d3Client || typeof d3Client.json !== "function") {
    throw new Error("d3.json is not available. Ensure D3 is loaded before calling loadMapData().");
  }

  const [topo, localeData, hierarchy] = await Promise.all([
    d3Client.json(topologyUrl),
    d3Client.json(localesUrl).catch((err) => {
      console.warn("Locales file missing or invalid, using defaults.", err);
      return { ui: {}, geo: {} };
    }),
    d3Client.json(hierarchyUrl).catch((err) => {
      console.warn("Hierarchy file missing or invalid, using defaults.", err);
      return null;
    }),
  ]);

  return {
    topology: topo,
    locales: localeData || { ui: {}, geo: {} },
    hierarchy,
  };
}
