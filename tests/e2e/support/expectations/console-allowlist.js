const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const CITY_RUNTIME_CONSOLE_SPECS = Object.freeze([
  "tests/e2e/city_label_i18n_redraw.spec.js",
  "tests/e2e/city_lights_layer_regression.spec.js",
  "tests/e2e/city_marker_visibility_regression.spec.js",
  "tests/e2e/city_points_urban_runtime.spec.js",
  "tests/e2e/city_reveal_plan_regression.spec.js",
  "tests/e2e/city_urban_rendering_regression.spec.js",
  "tests/e2e/river_layer_regression.spec.js",
]);

const CONSOLE_ALLOWLIST = Object.freeze([
  {
    id: "city-runtime:scenario-political-background-merge-fallback",
    scope: "spec",
    specPaths: CITY_RUNTIME_CONSOLE_SPECS,
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "Known scenario background merge fallback remains tolerated in current city-runtime and river regression lanes.",
    pattern: /\[map_renderer\] Scenario political background merge fallback engaged:/i,
  },
  {
    id: "city-lights:optional-city-aliases-missing",
    scope: "spec",
    specPaths: ["tests/e2e/city_lights_layer_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-lights regression still tolerates optional city alias hydration gaps during startup.",
    pattern: /\[data_loader\] Optional city_aliases missing or invalid/i,
  },
  {
    id: "city-lights:locales-missing",
    scope: "spec",
    specPaths: ["tests/e2e/city_lights_layer_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-lights regression still tolerates missing locale side payloads during startup.",
    pattern: /Locales file missing or invalid, using defaults/i,
  },
  {
    id: "city-lights:geo-aliases-missing",
    scope: "spec",
    specPaths: ["tests/e2e/city_lights_layer_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-lights regression still tolerates missing geo alias side payloads during startup.",
    pattern: /Geo alias file missing or invalid, using defaults/i,
  },
  {
    id: "city-lights:bundle-post-ready-hydration",
    scope: "spec",
    specPaths: ["tests/e2e/city_lights_layer_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-lights regression still tolerates post-ready bundle hydration warning during startup.",
    pattern: /\[boot\] Failed to hydrate active scenario bundle\. reason=post-ready/i,
  },
  {
    id: "city-lights:runtime-topology-optional-resource",
    scope: "spec",
    specPaths: ["tests/e2e/city_lights_layer_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-lights regression still tolerates optional runtime topology warning during startup.",
    pattern: /\[scenario\] Failed to load optional resource "runtime_topology"/i,
  },
  {
    id: "city-lights:preload-unused-warning",
    scope: "spec",
    specPaths: ["tests/e2e/city_lights_layer_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-lights regression still tolerates preload-not-used browser warning.",
    pattern: /was preloaded using link preload but not used within a few seconds/i,
  },
  {
    id: "city-lights:connection-refused",
    scope: "spec",
    specPaths: ["tests/e2e/city_lights_layer_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-lights regression still tolerates transient connection refused warning in dev startup.",
    pattern: /ERR_CONNECTION_REFUSED/i,
  },
  {
    id: "city-lights:canvas-readback-warning",
    scope: "spec",
    specPaths: ["tests/e2e/city_lights_layer_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-lights regression still tolerates canvas readback performance warning during sampling.",
    pattern: /Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true/i,
  },
  {
    id: "city-reveal:physical-semantics-deferred",
    scope: "spec",
    specPaths: ["tests/e2e/city_reveal_plan_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-reveal regression still tolerates deferred physical semantics payload warning.",
    pattern: /\[physical\] global_physical_semantics\.topo\.json unavailable or deferred/i,
  },
  {
    id: "city-reveal:major-contours-deferred",
    scope: "spec",
    specPaths: ["tests/e2e/city_reveal_plan_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-reveal regression still tolerates deferred major contour payload warning.",
    pattern: /\[physical\] global_contours\.major\.topo\.json unavailable or deferred/i,
  },
  {
    id: "city-reveal:minor-contours-deferred",
    scope: "spec",
    specPaths: ["tests/e2e/city_reveal_plan_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-reveal regression still tolerates deferred minor contour payload warning.",
    pattern: /\[physical\] global_contours\.minor\.topo\.json unavailable or deferred/i,
  },
  {
    id: "city-reveal:detail-promotion-bundle-warning",
    scope: "spec",
    specPaths: ["tests/e2e/city_reveal_plan_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-reveal regression still tolerates bundle apply before confirmed detail promotion.",
    pattern: /\[scenario\] Applying bundle without confirmed detail promotion/i,
  },
  {
    id: "city-reveal:detail-visibility-gate",
    scope: "spec",
    specPaths: ["tests/e2e/city_reveal_plan_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-reveal regression still tolerates detail visibility gate warning.",
    pattern: /\[scenario\] Detail visibility gate triggered for tno_1962/i,
  },
  {
    id: "city-reveal:owner-only-borders-missing",
    scope: "spec",
    specPaths: ["tests/e2e/city_reveal_plan_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-reveal regression still tolerates missing scenario owner-only borders warning.",
    pattern: /\[map_renderer\] scenario_owner_only borders unavailable for scenario=tno_1962/i,
  },
  {
    id: "city-reveal:d3-unsafe-water-geometry",
    scope: "spec",
    specPaths: ["tests/e2e/city_reveal_plan_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-reveal regression still tolerates current D3 unsafe water geometry cleanup warning.",
    pattern: /^\[map_renderer\] Removed 2 D3-unsafe water geometry part\(s\): marine_arctic_ocean, marine_southern_ocean$/,
  },
  {
    id: "city-reveal:startup-bundle-preload-unused",
    scope: "spec",
    specPaths: ["tests/e2e/city_reveal_plan_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-reveal regression still tolerates startup bundle preload-not-used warning.",
    pattern: /startup\.bundle\.en\.json\.gz was preloaded using link preload but not used/i,
  },
  {
    id: "city-reveal:europe-topology-preload-unused",
    scope: "spec",
    specPaths: ["tests/e2e/city_reveal_plan_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-reveal regression still tolerates europe topology preload-not-used warning.",
    pattern: /europe_topology\.json was preloaded using link preload but not used/i,
  },
  {
    id: "city-urban:preload-unused-warning",
    scope: "spec",
    specPaths: ["tests/e2e/city_urban_rendering_regression.spec.js"],
    addedAt: "2026-05-01",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "City-urban regression still tolerates preload-not-used browser warning.",
    pattern: /was preloaded using link preload but not used within a few seconds from the window's load event/i,
  },
  {
    id: "river-layer:startup-bundle-preload-unused",
    scope: "spec",
    specPaths: ["tests/e2e/river_layer_regression.spec.js"],
    addedAt: "2026-05-02",
    expiresAt: "2026-08-01",
    ownerHint: "map-city",
    justification: "River layer regression still tolerates the startup bundle preload-not-used browser warning while boot remains intentionally deferred.",
    pattern: /startup\.bundle\.en\.json\.gz was preloaded using link preload but not used/i,
  },
]);

function normalizeSpecPath(specPath) {
  if (!specPath) return "";
  const candidate = path.isAbsolute(specPath)
    ? path.relative(PROJECT_ROOT, specPath)
    : specPath;
  return String(candidate).replace(/\\/g, "/").replace(/^\.\//, "");
}

function entryMatchesSpec(entry, specPath) {
  const normalizedSpecPath = normalizeSpecPath(specPath);
  if (entry.scope === "global") return true;
  return Array.isArray(entry.specPaths) && entry.specPaths.includes(normalizedSpecPath);
}

function getConsoleAllowlistEntries(specPath) {
  return CONSOLE_ALLOWLIST.filter((entry) => entryMatchesSpec(entry, specPath));
}

function getConsoleIgnorePatterns(specPath) {
  return getConsoleAllowlistEntries(specPath).map((entry) => entry.pattern);
}

module.exports = {
  CONSOLE_ALLOWLIST,
  CITY_RUNTIME_CONSOLE_SPECS,
  normalizeSpecPath,
  getConsoleAllowlistEntries,
  getConsoleIgnorePatterns,
};
