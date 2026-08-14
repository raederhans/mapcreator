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
  Object.freeze({
    id: "polar-water-d3-sanitizer-warning",
    scope: "spec",
    specPaths: Object.freeze([
      "tests/e2e/hoi4_1939_ui_smoke.spec.js",
      "tests/e2e/tno_1962_ui_smoke.spec.js",
    ]),
    pattern: /^\[map_renderer\] Removed 2 D3-unsafe water geometry part\(s\): marine_arctic_ocean, marine_southern_ocean$/,
    addedAt: "2026-08-14",
    expiresAt: "2026-08-31",
    ownerHint: "startup-topology",
    justification: "Gate 4 owns regeneration of the two polar water geometries currently rejected by the runtime D3 sanitizer.",
  }),
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
