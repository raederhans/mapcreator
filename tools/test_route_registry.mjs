import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export const REPO_ROOT = process.cwd();
export const E2E_MANIFEST_PATH = path.join(REPO_ROOT, "tests", "e2e", "test-layer-manifest.json");
export const PYTHON_HEAVY_GROUPS_PATH = path.join(REPO_ROOT, "tests", "heavy_dependency_groups.json");
export const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");

export const ROUTE_SCHEMA_FIELDS = [
  "id",
  "commandRef",
  "sourceRef",
  "domain",
  "ownerHint",
  "layer",
  "cost",
  "resourceLocks",
  "executionOwner",
  "ciProfile",
];

export const RESOURCE_LOCKS = Object.freeze([
  "browser-dev-server",
  "perf-dev-server",
  "playwright-browser",
  "dist",
  ".runtime-output",
  "scenario-data",
  "heavy-geo",
  "checkpoint-builder",
]);

export const EXECUTION_OWNERS = Object.freeze(["child-safe", "main-thread", "ci-only"]);
export const COSTS = Object.freeze(["fast", "contract", "heavy"]);
export const LAYERS = Object.freeze(["smoke", "contract", "regression", "feature", "heavy"]);
export const CI_PROFILES = Object.freeze(["pr-fast", "pr-smoke", "full", "deploy-minimal", "perf-pr-gate", "scenario-contract-matrix"]);

const NODE_CONTRACT_SCRIPT_NAMES = [
  "test:node:renderer-splits",
  "test:node:scenario-chunk-contracts",
  "test:node:physical-layer-contracts",
  "test:node:palette-runtime-bridge",
  "test:node:perf-probe-snapshot-behavior",
];

const INFRASTRUCTURE_ROUTES = [
  {
    id: "infra:e2e-layer-manifest",
    commandRef: "verify:test:e2e-layers",
    sourceRef: "tools/e2e_layering.mjs,tests/e2e/test-layer-manifest.json",
    domain: "test-routing",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:verification-selector",
    commandRef: "node tools/select_verification_targets.mjs --check",
    sourceRef: "tools/select_verification_targets.mjs,tools/test_route_registry.mjs",
    domain: "test-routing",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:perf-gate-contract",
    commandRef: "verify:perf-gate-contract",
    sourceRef: "ops/browser-mcp/editor-performance-benchmark.py,tools/perf/run_baseline.mjs",
    domain: "perf",
    ownerHint: "perf-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:perf-gate",
    commandRef: "perf:gate",
    sourceRef: "tools/perf/run_baseline.mjs,ops/browser-mcp/editor-performance-benchmark.py",
    domain: "perf",
    ownerHint: "perf-runtime",
    layer: "heavy",
    cost: "heavy",
    resourceLocks: ["perf-dev-server", "playwright-browser", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "perf-pr-gate",
  },
  {
    id: "infra:pages-dist",
    commandRef: "verify:pages-dist",
    sourceRef: "tools/build_pages_dist.py,tests/test_pages_dist_startup_shell.py,.github/workflows/verify-shared.yml",
    domain: "pages-dist",
    ownerHint: "deploy-runtime",
    layer: "heavy",
    cost: "heavy",
    resourceLocks: ["dist", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "deploy-minimal",
  },
  {
    id: "infra:scenario-contracts-strict",
    commandRef: "verify:scenario-contracts:strict",
    sourceRef: "tools/check_scenario_contracts.py,data/scenarios/tno_1962,.github/workflows/scenario-contract-matrix.yml",
    domain: "scenario-contracts",
    ownerHint: "scenario-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: ["scenario-data", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "scenario-contract-matrix",
  },
  {
    id: "infra:scenario-builder",
    commandRef: "python tools/build_hoi4_scenario.py",
    sourceRef: "tools/build_hoi4_scenario.py,tools/build_startup_bundle.py,scenario_builder",
    domain: "scenario-build",
    ownerHint: "scenario-builder",
    layer: "heavy",
    cost: "heavy",
    resourceLocks: ["scenario-data", "checkpoint-builder", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "full",
  },
];

const PYTHON_FAST_CONTRACTS = [
  {
    id: "python:tests.test_app_entry_resolver",
    commandRef: "python -m unittest tests.test_app_entry_resolver -q",
    sourceRef: "tests/test_app_entry_resolver.py",
    domain: "startup",
    ownerHint: "startup-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "python:tests.test_map_renderer_interaction_border_snapshot_orchestration_contract",
    commandRef: "python -m unittest tests.test_map_renderer_interaction_border_snapshot_orchestration_contract -q",
    sourceRef: "tests/test_map_renderer_interaction_border_snapshot_orchestration_contract.py",
    domain: "renderer-runtime",
    ownerHint: "renderer-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "python:tests.test_perf_gate_contract",
    commandRef: "python -m unittest tests.test_perf_gate_contract -q",
    sourceRef: "tests/test_perf_gate_contract.py",
    domain: "perf",
    ownerHint: "perf-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "python:tests.test_startup_shell",
    commandRef: "python -m unittest tests.test_startup_shell -q",
    sourceRef: "tests/test_startup_shell.py",
    domain: "startup",
    ownerHint: "startup-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function toRepoPath(value) {
  return value.split(path.sep).join("/");
}

function moduleNameFromPythonPath(sourceRef) {
  return sourceRef.replace(/\.py$/, "").split("/").join(".");
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function e2eCost(primaryLayer) {
  if (primaryLayer === "smoke") return "fast";
  if (primaryLayer === "contract") return "contract";
  return "heavy";
}

export function buildE2eRoutes() {
  const manifest = readJson(E2E_MANIFEST_PATH);
  const specs = Array.isArray(manifest?.specs) ? manifest.specs : [];
  return specs.map((spec) => ({
    id: `e2e:${spec.specPath}`,
    commandRef: `node tools/e2e_layering.mjs run-domain ${spec.domain}`,
    sourceRef: spec.specPath,
    domain: spec.domain,
    ownerHint: spec.ownerHint,
    layer: spec.primaryLayer,
    cost: e2eCost(spec.primaryLayer),
    resourceLocks: ["browser-dev-server", "playwright-browser", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: spec.primaryLayer === "smoke" ? "pr-smoke" : "full",
  }));
}

export function buildNodeRoutes(packageJson = readJson(PACKAGE_JSON_PATH)) {
  const scripts = packageJson.scripts || {};
  return NODE_CONTRACT_SCRIPT_NAMES.filter((name) => scripts[name]).map((name) => {
    const command = scripts[name];
    const sourceRefs = [...command.matchAll(/tests\/[\w./-]+\.mjs/g)].map((match) => match[0]);
    const domain = name.includes("perf")
      ? "perf"
      : name.includes("physical-layer")
        ? "map-layer"
        : name.includes("scenario-chunk")
          ? "scenario-runtime"
          : name.includes("palette")
            ? "palette-runtime"
            : "renderer-runtime";
    return {
      id: `node:${name}`,
      commandRef: name,
      sourceRef: sourceRefs.join(","),
      domain,
      ownerHint: domain,
      layer: "contract",
      cost: "fast",
      resourceLocks: [],
      executionOwner: "child-safe",
      ciProfile: "pr-fast",
    };
  });
}

export function buildPythonRoutes() {
  const routes = [...PYTHON_FAST_CONTRACTS];
  if (fs.existsSync(PYTHON_HEAVY_GROUPS_PATH)) {
    const groups = readJson(PYTHON_HEAVY_GROUPS_PATH);
    for (const [groupName, group] of Object.entries(groups)) {
      const patterns = Array.isArray(group?.patterns) ? group.patterns : [];
      for (const sourceRef of patterns) {
        const domain = sourceRef.includes("transport")
          ? "transport-workbench"
          : sourceRef.includes("water")
            ? "tno-water"
            : sourceRef.includes("city") || sourceRef.includes("urban")
              ? "city-runtime"
              : "geo-contract";
        routes.push({
          id: `python-heavy:${groupName}:${sourceRef}`,
          commandRef: `python -m unittest ${moduleNameFromPythonPath(sourceRef)} -q`,
          sourceRef,
          domain,
          ownerHint: domain,
          layer: "heavy",
          cost: "heavy",
          resourceLocks: ["heavy-geo", ".runtime-output"],
          executionOwner: "main-thread",
          ciProfile: "full",
        });
      }
    }
  }
  return routes;
}

export function buildRouteIndex() {
  return [...INFRASTRUCTURE_ROUTES, ...buildE2eRoutes(), ...buildNodeRoutes(), ...buildPythonRoutes()];
}

export function summarizeRoutes(routes) {
  return {
    count: routes.length,
    domains: uniqueValues(routes.map((route) => route.domain)).sort(),
    owners: uniqueValues(routes.map((route) => route.ownerHint)).sort(),
    resourceLocks: uniqueValues(routes.flatMap((route) => route.resourceLocks)).sort(),
    executionOwners: uniqueValues(routes.map((route) => route.executionOwner)).sort(),
  };
}

export function validateRoute(route, packageJson = readJson(PACKAGE_JSON_PATH)) {
  for (const field of ROUTE_SCHEMA_FIELDS) {
    if (!(field in route)) {
      throw new Error(`Route ${route?.id || "<unknown>"} is missing schema field: ${field}`);
    }
  }
  for (const field of ["id", "commandRef", "sourceRef", "domain", "ownerHint", "layer", "cost", "executionOwner", "ciProfile"]) {
    if (typeof route[field] !== "string" || !route[field].trim()) {
      throw new Error(`Route ${route?.id || "<unknown>"} has invalid string field: ${field}`);
    }
  }
  if (!Array.isArray(route.resourceLocks)) {
    throw new Error(`Route ${route.id} resourceLocks must be an array.`);
  }
  if (!EXECUTION_OWNERS.includes(route.executionOwner)) {
    throw new Error(`Route ${route.id} has invalid executionOwner: ${route.executionOwner}`);
  }
  if (!COSTS.includes(route.cost)) {
    throw new Error(`Route ${route.id} has invalid cost: ${route.cost}`);
  }
  if (!LAYERS.includes(route.layer)) {
    throw new Error(`Route ${route.id} has invalid layer: ${route.layer}`);
  }
  if (!CI_PROFILES.includes(route.ciProfile)) {
    throw new Error(`Route ${route.id} has invalid ciProfile: ${route.ciProfile}`);
  }
  if (route.executionOwner === "child-safe" && route.resourceLocks.length > 0) {
    throw new Error(`Route ${route.id} is child-safe but declares resource locks.`);
  }
  if (route.executionOwner === "child-safe" && route.cost === "heavy") {
    throw new Error(`Route ${route.id} is child-safe but has heavy cost.`);
  }
  for (const lock of route.resourceLocks) {
    if (!RESOURCE_LOCKS.includes(lock)) {
      throw new Error(`Route ${route.id} has invalid resource lock: ${lock}`);
    }
  }
  const scripts = packageJson.scripts || {};
  const knownCommand =
    route.commandRef in scripts ||
    route.commandRef.startsWith("node tools/e2e_layering.mjs ") ||
    route.commandRef.startsWith("node tools/select_verification_targets.mjs ") ||
    route.commandRef.startsWith("python -m unittest ") ||
    route.commandRef.startsWith("python tools/");
  if (!knownCommand) {
    throw new Error(`Route ${route.id} commandRef is not a package script or known command: ${route.commandRef}`);
  }
}

export function validateRouteIndex(routes = buildRouteIndex()) {
  const packageJson = readJson(PACKAGE_JSON_PATH);
  const seen = new Set();
  for (const route of routes) {
    validateRoute(route, packageJson);
    if (seen.has(route.id)) {
      throw new Error(`Duplicate route id: ${route.id}`);
    }
    seen.add(route.id);
  }
  return summarizeRoutes(routes);
}
