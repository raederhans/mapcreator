import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildVerificationMetadataRoutes,
} from "./verification/verification_metadata_helpers.mjs";
import {
  VERIFICATION_CI_PROFILES,
  VERIFICATION_COSTS,
  VERIFICATION_EXECUTION_OWNERS,
  VERIFICATION_LAYERS,
  VERIFICATION_RESOURCE_LOCKS,
} from "./verification/verification_domains.mjs";

export const REPO_ROOT = process.cwd();
export const E2E_MANIFEST_PATH = path.join(REPO_ROOT, "tests", "e2e", "test-layer-manifest.json");
export const PYTHON_HEAVY_GROUPS_PATH = path.join(REPO_ROOT, "tests", "heavy_dependency_groups.json");
export const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");
const REPO_JS_EXTENSIONS = [".js", ".mjs"];

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
export const ROUTE_GUIDANCE_FIELDS = Object.freeze([
  "taskEntry",
  "ownerFiles",
  "commonChecks",
  "riskSignals",
  "diagnostics",
  "status",
]);
const ROUTE_GUIDANCE_ARRAY_FIELDS = new Set(["taskEntry", "ownerFiles", "commonChecks", "riskSignals", "diagnostics"]);

export const RESOURCE_LOCKS = VERIFICATION_RESOURCE_LOCKS;
export const EXECUTION_OWNERS = VERIFICATION_EXECUTION_OWNERS;
export const COSTS = VERIFICATION_COSTS;
export const LAYERS = VERIFICATION_LAYERS;
export const CI_PROFILES = VERIFICATION_CI_PROFILES;

const INFRASTRUCTURE_ROUTES = [
  {
    id: "infra:e2e-layer-manifest",
    commandRef: "verify:test:e2e-layers",
    sourceRef: "tools/e2e_layering.mjs,tests/e2e/test-layer-manifest.json,.github/workflows/pr-verify.yml,.github/workflows/verify-shared.yml",
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
    sourceRef: ".gitignore,tools/run_adaptive_tests.mjs,tools/verification/command_supersession.mjs,tools/select_verification_targets.mjs,tools/test_route_registry.mjs,.github/workflows/pr-verify.yml,.github/workflows/verify-shared.yml",
    domain: "test-routing",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:sf-ats-contracts",
    commandRef: "verify:supervisor-contracts",
    sourceRef: "AGENTS.md,docs/testing/sf-ats-overview.md,docs/active/_worktree_registry.md,docs/archive/sf-ats-wp2-supervisor-plan-20260702,tools/ai_test_supervisor,tests/supervisor_domain_registry_behavior.test.mjs,tests/supervisor_schema_contracts.test.mjs",
    domain: "test-routing",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
    guidance: {
      taskEntry: ["SF-ATS contract and schema health gate"],
      ownerFiles: [
        "AGENTS.md",
        "docs/active/_worktree_registry.md",
        "docs/testing/sf-ats-overview.md",
        "tools/ai_test_supervisor",
        "tests/supervisor_domain_registry_behavior.test.mjs",
        "tests/supervisor_schema_contracts.test.mjs",
      ],
      commonChecks: ["npm run verify:supervisor-contracts"],
      riskSignals: [
        "SF-ATS contract drift",
        "supervisor schema drift",
        "domain registry drift",
        "agent verification contract drift",
      ],
      diagnostics: [
        ".runtime/reports/generated/test-adaptive-selection.json",
        ".runtime/reports/generated/test-adaptive-selection.md",
      ],
      status: "active",
    },
  },
  {
    id: "infra:core-verification-runner",
    commandRef: "test:node:verify-core-runner",
    sourceRef: "tools/run_core_verification.mjs,tools/verification/resumable_verification.mjs,tools/verification/command_supersession.mjs,tests/verify_core_runner_behavior.test.mjs,docs/testing/verify-core.md,docs/active/test-verification-reform-20260813,docs/active/mapcreator-recovery-gates-20260814,package.json",
    domain: "test-routing",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:test-import-graph",
    commandRef: "verify:test-import-graph",
    sourceRef: "tools/build_test_import_graph.mjs,tools/check_test_import_graph.mjs,tests/e2e/test-import-graph.json,.github/workflows/pr-verify.yml,.github/workflows/verify-shared.yml",
    domain: "test-routing",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:architecture-boundaries",
    commandRef: "verify:architecture-boundaries",
    sourceRef: "tools/check_architecture_boundaries.mjs,js/core/map_renderer.js,js/core/renderer/render_pipeline_passes.js,js/core/renderer/viewport_resize_lifecycle_owner.js,js/core/map_renderer/scenario_refresh_runtime.js,js/core/map_renderer/exact_after_settle_scheduler.js,js/core/map_renderer/hgo_runtime_preview_render_owner.js,.github/workflows/pr-verify.yml,.github/workflows/verify-shared.yml,package.json",
    domain: "architecture-boundaries",
    ownerHint: "architecture",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:playwright-observability",
    commandRef: "python -m unittest tests.test_e2e_structural_tooling -q",
    sourceRef: ".gitignore,playwright.config.cjs,tests/e2e/support/fixtures.js,tests/e2e/support/playwright-app.js,tests/e2e/support/reporters,tests/e2e/support/playwright-selectors.js,tests/e2e/support/expectations/console-allowlist.js,tests/e2e/test-flake-budget.json,tests/test_e2e_structural_tooling.py,tools/run_adaptive_tests.mjs,tools/select_verification_targets.mjs,tools/test_route_registry.mjs,tools/test_timeout_inventory.mjs,tools/check_console_allowlist_decay.mjs,tools/check_test_timeout_guardrails.mjs,tools/test_timing_summary.mjs,.github/workflows/pr-verify.yml,.github/workflows/verify-shared.yml",
    domain: "playwright-observability",
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
    sourceRef: ".github/workflows/perf-pr-gate.yml,ops/browser-mcp/editor-performance-benchmark.py,tools/perf/run_baseline.mjs",
    domain: "perf",
    ownerHint: "perf-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:browser-smoke-static-contract",
    commandRef: "python -m unittest tests.test_playwright_app_ready_gate_contract -q",
    sourceRef: "ops/browser-mcp/run-smoke-browser-inspection.sh,ops/browser-mcp/inspection-profile.toml,ops/browser-mcp/inspection-profile.schema.md,tests/test_playwright_app_ready_gate_contract.py,tools/browser_smoke_profile_contract.py",
    domain: "browser-smoke",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:test-timeout-inventory",
    commandRef: "verify:test-timeout-inventory",
    sourceRef: "tools/test_timeout_inventory.mjs,tests/e2e/test-layer-manifest.json,tests/e2e/test-import-graph.json,.github/workflows/pr-verify.yml,.github/workflows/verify-shared.yml",
    domain: "playwright-observability",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:test-console-allowlist",
    commandRef: "verify:test-console-allowlist",
    sourceRef: "tools/check_console_allowlist_decay.mjs,tests/e2e/support/expectations/console-allowlist.js,tests/e2e/test-flake-budget.json,.github/workflows/pr-verify.yml,.github/workflows/verify-shared.yml",
    domain: "playwright-observability",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:test-timeout-guardrails",
    commandRef: "verify:test-timeout-guardrails",
    sourceRef: "tools/check_test_timeout_guardrails.mjs,tests/e2e/test-layer-manifest.json,.github/workflows/pr-verify.yml,.github/workflows/verify-shared.yml",
    domain: "playwright-observability",
    ownerHint: "test-infra",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:perf-gate",
    commandRef: "perf:gate",
    sourceRef: "tools/perf/run_baseline.mjs,ops/browser-mcp/editor-performance-benchmark.py,js/core/renderer/cached_pass_compositor_owner.js,js/core/map_renderer/transformed_frame_compositor_owner.js,js/core/renderer/visual_effects_pass_owner.js,js/core/renderer/context_pass_orchestrator_owner.js,js/core/renderer/political_pass_orchestrator_owner.js",
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
    commandRef: "verify:pages-dist-and-drift",
    sourceRef: "tools/build_pages_dist.py,tests/test_pages_dist_startup_shell.py,js/core/map_renderer.js,js/core/map_renderer,js/core/renderer,.github/workflows/verify-shared.yml",
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
    id: "infra:scenario-contracts-strict-pr-fast",
    commandRef: "verify:scenario-contracts:strict",
    sourceRef: "tools/check_scenario_contracts.py,data/scenarios/tno_1962,.github/workflows/verify-shared.yml",
    domain: "scenario-contracts",
    ownerHint: "scenario-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: ["scenario-data", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "pr-fast",
  },
  {
    id: "infra:scenario-contracts-strict-full",
    commandRef: "verify:scenario-contracts:strict",
    sourceRef: "tools/check_scenario_contracts.py,data/scenarios/tno_1962,.github/workflows/verify-shared.yml",
    domain: "scenario-contracts",
    ownerHint: "scenario-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: ["scenario-data", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "full",
  },
  {
    id: "infra:tno-coverage-ledger",
    commandRef: "verify:tno-coverage-ledger",
    sourceRef: "tools/check_scenario_contracts.py,data/scenarios/tno_1962/derived/atlantropa_donor_ledger.json,data/scenarios/tno_1962/derived/geometry_drop_audit.json",
    domain: "tno-coverage-chain",
    ownerHint: "scenario-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: ["scenario-data", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "scenario-contract-matrix",
  },
  {
    id: "infra:tno-atlantropa-coverage",
    commandRef: "verify:tno-atlantropa-coverage",
    sourceRef: "tools/check_scenario_contracts.py,data/scenarios/tno_1962/scenario_atlantropa_metadata.json,data/scenarios/tno_1962/chunks",
    domain: "tno-coverage-chain",
    ownerHint: "scenario-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: ["scenario-data", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "scenario-contract-matrix",
  },
  {
    id: "infra:tno-polar-coverage",
    commandRef: "verify:tno-polar-coverage",
    sourceRef: "tools/validate_tno_water_geometries.py,data/scenarios/tno_1962/runtime_topology.topo.json,data/scenarios/tno_1962/water_regions.geojson",
    domain: "tno-water",
    ownerHint: "tno-water",
    layer: "heavy",
    cost: "heavy",
    resourceLocks: ["heavy-geo", "scenario-data", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "full",
  },
  {
    id: "infra:tno-coverage-chain",
    commandRef: "verify:tno-coverage-chain",
    sourceRef: "tools/check_scenario_contracts.py,tools/validate_tno_water_geometries.py,tests/scenario_chunk_contracts.test.mjs,data/scenarios/tno_1962",
    domain: "tno-coverage-chain",
    ownerHint: "scenario-runtime",
    layer: "heavy",
    cost: "heavy",
    resourceLocks: ["heavy-geo", "scenario-data", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "full",
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
  {
    id: "infra:tno-water-validator",
    commandRef: "python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_report.json",
    sourceRef: "tools/validate_tno_water_geometries.py,data/scenarios/tno_1962/water_regions.geojson,data/scenarios/tno_1962/runtime_topology.topo.json,data/scenarios/tno_1962/runtime_topology.bootstrap.topo.json,data/scenarios/tno_1962/detail_chunks.manifest.json,data/scenarios/tno_1962/chunks/water",
    domain: "tno-water",
    ownerHint: "tno-water",
    layer: "heavy",
    cost: "heavy",
    resourceLocks: ["heavy-geo", "scenario-data", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "full",
    guidance: {
      taskEntry: ["TNO water geometry health gate"],
      ownerFiles: [
        "tools/validate_tno_water_geometries.py",
        "data/scenarios/tno_1962/water_regions.geojson",
        "data/scenarios/tno_1962/detail_chunks.manifest.json",
      ],
      commonChecks: ["python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_report.json"],
      riskSignals: ["water geometry source/runtime drift", "chunk manifest coverage drift", "D3 spherical safety regression"],
      diagnostics: [".runtime/reports/generated/tno_water_geometry_report.json"],
      status: "active",
    },
  },
  {
    id: "infra:data-health",
    commandRef: "python tools/data_health.py --json",
    sourceRef: "tools/data_health.py,tools/build_data_catalog.py,data/CATALOG.json,data/runtime_asset_registry.json,data/scenarios/index.json",
    domain: "data-governance",
    ownerHint: "data-governance",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
    guidance: {
      taskEntry: ["Data catalog governance health gate"],
      ownerFiles: ["tools/data_health.py", "data/CATALOG.json", "data/runtime_asset_registry.json"],
      commonChecks: ["python tools/data_health.py --json"],
      riskSignals: ["catalog/runtime asset drift", "scenario registry coverage drift", "transport manifest path drift"],
      diagnostics: ["stdout JSON health report"],
      status: "active",
    },
  },
  {
    id: "infra:transport-manifest-contracts",
    commandRef: "python tools/check_transport_workbench_manifests.py --root data/transport_layers --report-path .runtime/reports/generated/transport_workbench_manifest_report.json",
    sourceRef: "tools/check_transport_workbench_manifests.py,map_builder/transport_workbench_contracts.py,data/transport_layers",
    domain: "transport-workbench",
    ownerHint: "transport-workbench",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
    guidance: {
      taskEntry: ["Transport workbench manifest health gate"],
      ownerFiles: ["tools/check_transport_workbench_manifests.py", "map_builder/transport_workbench_contracts.py", "data/transport_layers"],
      commonChecks: ["python tools/check_transport_workbench_manifests.py --root data/transport_layers --report-path .runtime/reports/generated/transport_workbench_manifest_report.json"],
      riskSignals: ["transport family manifest drift", "coverage variant path drift", "runtime workbench contract drift"],
      diagnostics: [".runtime/reports/generated/transport_workbench_manifest_report.json"],
      status: "active",
    },
  },
];

const PYTHON_FAST_CONTRACTS = [
  {
    id: "python:polar-water-spherical-safety",
    commandRef: "python -m pytest tests/test_polar_water_spherical_safety.py -q",
    sourceRef: [
      "init_map_data.py",
      "map_builder/geo/topology.py",
      "map_builder/geo/spherical_safety.py",
      "tests/test_polar_water_spherical_safety.py",
    ].join(","),
    domain: "geo-contract",
    ownerHint: "polar-water-spherical-safety",
    layer: "heavy",
    cost: "heavy",
    resourceLocks: ["heavy-geo", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: "full",
  },
  {
    id: "python:backend-cloud-support",
    commandRef: "test:py:backend-cloud-support",
    sourceRef: "map_backend,tools/dev_server.py,tests/test_backend_service.py,tests/test_backend_routes.py,tests/test_dev_server.py",
    domain: "backend-cloud-support",
    ownerHint: "backend-cloud-support",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "python:thematic-layer-contracts",
    commandRef: "test:py:thematic-layer-contracts",
    sourceRef: [
      "tools/build_thematic_layers.py",
      "map_builder/thematic_layer_contracts.py",
      "map_builder/thematic_wgi_ingest.py",
      "map_builder/contracts.py",
      "map_builder/runtime_asset_registry.py",
      "data/thematic_layers",
      "data/manifest.json",
      "data/runtime_asset_registry.json",
      "tests/test_thematic_layer_contracts.py",
      "tests/test_thematic_wgi_source_ingest.py",
      "tests/fixtures/thematic_wgi_2024_minimal.csv",
    ].join(","),
    domain: "data-governance",
    ownerHint: "thematic-layer-contracts",
    layer: "contract",
    cost: "fast",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
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
    id: "python:tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract",
    commandRef: "python -m unittest tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q",
    sourceRef: "tests/test_map_renderer_strategic_overlay_render_owner_boundary_contract.py,js/core/map_renderer.js,js/core/renderer/strategic_overlay_render_owner.js,js/core/renderer/strategic_overlay_runtime/unit_counter_runtime_domain.js",
    domain: "renderer-runtime",
    ownerHint: "strategic-overlay-render-owner",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "python:tests.test_i18n_audit",
    commandRef: "python -m unittest tests.test_i18n_audit -q",
    sourceRef: "tests/test_i18n_audit.py,tools/i18n_audit.py,tools/translate_manager.py,data/locales.json,data/i18n/locales_baseline.json,data/city_aliases.json,data/geo_aliases.json,data/hgo_catalogs/hgo_place_names.json,data/hgo_catalogs/hgo_identity_aliases.json",
    domain: "i18n-data",
    ownerHint: "i18n-runtime",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "python:tests.deferred_detail_promotion_contracts",
    commandRef: "python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_scenario_renderer_bridge_boundary_contract -q",
    sourceRef: "js/bootstrap/deferred_detail_promotion.js,tests/test_main_deferred_detail_promotion_boundary_contract.py,tests/test_scenario_chunk_refresh_contracts.py,tests/test_scenario_renderer_bridge_boundary_contract.py",
    domain: "scenario-runtime",
    ownerHint: "deferred-detail-promotion",
    layer: "contract",
    cost: "contract",
    resourceLocks: [],
    executionOwner: "child-safe",
    ciProfile: "pr-fast",
  },
  {
    id: "python:tests.test_map_renderer_interaction_border_snapshot_orchestration_contract",
    commandRef: "python -m unittest tests.test_map_renderer_interaction_border_snapshot_orchestration_contract -q",
    sourceRef: "js/core/map_renderer.js,js/core/map_renderer/transformed_frame_compositor_owner.js,js/core/renderer/render_cache_owner.js,js/core/renderer/zoom_interaction_lifecycle_owner.js,tests/test_map_renderer_interaction_border_snapshot_orchestration_contract.py",
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

function fileExists(repoPath) {
  return fs.existsSync(path.join(REPO_ROOT, repoPath));
}

function resolveRelativeFile(baseRepoPath, specifier) {
  const resolvedBase = toRepoPath(path.posix.normalize(path.posix.join(path.posix.dirname(baseRepoPath), specifier)));
  const candidates = [];
  if (/\.[A-Za-z0-9]+$/.test(resolvedBase)) {
    candidates.push(resolvedBase);
  } else {
    for (const extension of REPO_JS_EXTENSIONS) {
      candidates.push(`${resolvedBase}${extension}`);
    }
    for (const extension of REPO_JS_EXTENSIONS) {
      candidates.push(path.posix.join(resolvedBase, `index${extension}`));
    }
  }
  return candidates.find((candidate) => fileExists(candidate)) || null;
}

function resolveRepoSpecifier(baseRepoPath, specifier) {
  const value = String(specifier || "").trim();
  if (!value) return null;
  if (value.startsWith(".")) {
    const relativeResolved = resolveRelativeFile(baseRepoPath, value);
    if (relativeResolved) {
      return relativeResolved;
    }
    if (value.startsWith("./js/") || value.startsWith("./tests/")) {
      const repoRootResolved = toRepoPath(value.slice(2));
      return fileExists(repoRootResolved) ? repoRootResolved : null;
    }
    return null;
  }
  if (value.startsWith("/")) {
    const normalized = toRepoPath(value.slice(1));
    return fileExists(normalized) ? normalized : null;
  }
  return null;
}

function extractSpecifiers(content) {
  const specifiers = new Set();
  const expressions = [
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /from\s*["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /new URL\(\s*["']([^"']+)["']/g,
  ];
  for (const expression of expressions) {
    for (const match of content.matchAll(expression)) {
      specifiers.add(String(match[1] || "").trim());
    }
  }
  return [...specifiers];
}

function extractCommandPaths(command, extensionPattern) {
  return [...command.matchAll(new RegExp(`tests\\/[\\w./-]+\\.${extensionPattern}`, "g"))]
    .map((match) => match[0]);
}

function extractNpmScriptRefs(command, prefix) {
  const refs = [];
  const npmRunExpression = /\bnpm\s+(?:run|run-script)\s+([^&|;]+)/g;
  for (const match of String(command || "").matchAll(npmRunExpression)) {
    const args = String(match[1] || "").trim().split(/\s+/).filter(Boolean);
    for (const arg of args) {
      if (arg === "--") break;
      if (arg.startsWith("-")) continue;
      if (arg.startsWith(prefix)) refs.push(arg);
      break;
    }
  }
  return refs;
}

function resolveNodeScriptTestFiles(scripts, scriptName, command, seen = new Set()) {
  if (seen.has(scriptName)) {
    return [];
  }
  seen.add(scriptName);
  const directFiles = extractCommandPaths(command, "mjs");
  const childFiles = extractNpmScriptRefs(command, "test:node:")
    .flatMap((childName) => resolveNodeScriptTestFiles(scripts, childName, scripts[childName] || "", new Set(seen)));
  return uniqueValues([...directFiles, ...childFiles]);
}

function extractNodeEntrypointPaths(command) {
  return [
    ...String(command || "").matchAll(
      /\bnode\s+(?:(?:--[\w-]+(?:=\S+)?)\s+)*((?:tools|tests)\/[\w./-]+\.mjs)\b/g,
    ),
  ].map((match) => match[1]);
}

function collectFileDependencies(baseRepoPath) {
  const absolutePath = path.join(REPO_ROOT, baseRepoPath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }
  const content = fs.readFileSync(absolutePath, "utf8");
  return uniqueValues(
    extractSpecifiers(content)
      .map((specifier) => resolveRepoSpecifier(baseRepoPath, specifier))
      .filter(Boolean),
  ).sort();
}

function resolveNodeRouteDomain(scriptName, sourceRefs) {
  const haystack = `${scriptName},${sourceRefs.join(",")}`;
  if (haystack.includes("release-smoke") || haystack.includes("release_smoke") || haystack.includes("pages_public_release_gate")) return "release-smoke";
  if (scriptName.includes("p4:state-writer-policy")) return "state-ownership";
  if (
    haystack.includes("test:node:verify-core-runner")
    || haystack.includes("verify_core_runner")
    || haystack.includes("run_core_verification")
    || haystack.includes("windows_job")
    || haystack.includes("process_containment")
  ) return "test-routing";
  if (
    haystack.includes("p4:state-writer-policy")
    || haystack.includes("state_writer_policy")
    || haystack.includes("state_writer_inventory")
    || haystack.includes("p4_state_action_routes")
  ) return "state-ownership";
  if (haystack.includes("supervisor") || haystack.includes("ai_test_supervisor") || haystack.includes("sf-ats")) return "test-routing";
  if (haystack.includes("backend")) return "backend-cloud-support";
  if (haystack.includes("appearance_transport") || haystack.includes("appearance-transport")) return "transport-workbench";
  if (haystack.includes("city") || haystack.includes("urban")) return "city-runtime";
  if (haystack.includes("startup")) return "startup";
  if (haystack.includes("scenario") || haystack.includes("lifecycle_runtime")) return "scenario-runtime";
  if (haystack.includes("physical") || haystack.includes("map_layer")) return "map-layer";
  if (haystack.includes("palette")) return "palette-runtime";
  if (haystack.includes("perf")) return "perf";
  if (haystack.includes("border_mesh") || haystack.includes("renderer")) return "renderer-runtime";
  return "renderer-runtime";
}

function resolveDevE2eDomain(specPaths) {
  const haystack = specPaths.join(",");
  if (haystack.includes("tno_ready_state")) return "tno-startup";
  if (haystack.includes("scenario_chunk")) return "scenario-runtime";
  return "dev-workspace";
}

function isDirectE2EScriptRoute(name) {
  return name.startsWith("test:e2e:dev:")
    || name === "test:e2e:pages-public-release-gate";
}

function resolveDirectE2eMetadata(scriptName, specPaths) {
  if (scriptName === "test:e2e:pages-public-release-gate") {
    return {
      domain: "release-smoke",
      ownerHint: "deploy-runtime",
      ciProfile: "deploy-minimal",
    };
  }
  const domain = resolveDevE2eDomain(specPaths);
  return {
    domain,
    ownerHint: domain,
    ciProfile: "full",
  };
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
    commandRef: spec.commandRef ?? `node tools/e2e_layering.mjs run-spec ${spec.specPath}`,
    sourceRef: spec.specPath,
    domain: spec.domain,
    ownerHint: spec.ownerHint,
    layer: spec.primaryLayer,
    cost: e2eCost(spec.primaryLayer),
    resourceLocks: ["browser-dev-server", "playwright-browser", ".runtime-output"],
    executionOwner: "main-thread",
    ciProfile: spec.ciProfile ?? (spec.primaryLayer === "smoke" ? "pr-smoke" : "full"),
  }));
}

export function buildNodeRoutes(packageJson = readJson(PACKAGE_JSON_PATH)) {
  const scripts = packageJson.scripts || {};
  return Object.entries(scripts)
    .filter(([name]) => name.startsWith("test:node:"))
    .map(([name, command]) => {
      const testFiles = resolveNodeScriptTestFiles(scripts, name, command);
      const entryFiles = extractNodeEntrypointPaths(command);
      const sourceRefs = uniqueValues([
        ...entryFiles,
        ...testFiles,
        ...[...entryFiles, ...testFiles]
          .flatMap((sourceFile) => collectFileDependencies(sourceFile)),
      ]);
      const domain = resolveNodeRouteDomain(name, sourceRefs);
      const isFullP4StateWriterPolicy = name === "test:node:p4:state-writer-policy";
      return {
        id: `node:${name}`,
        commandRef: name,
        sourceRef: sourceRefs.join(","),
        domain,
        ownerHint: domain === "test-routing" ? "test-infra" : domain,
        layer: isFullP4StateWriterPolicy ? "heavy" : "contract",
        cost: isFullP4StateWriterPolicy ? "heavy" : "fast",
        resourceLocks: isFullP4StateWriterPolicy ? [".runtime-output"] : [],
        executionOwner: isFullP4StateWriterPolicy ? "main-thread" : "child-safe",
        ciProfile: isFullP4StateWriterPolicy ? "full" : "pr-fast",
      };
    });
}

export function buildDirectE2EScriptRoutes(packageJson = readJson(PACKAGE_JSON_PATH)) {
  const scripts = packageJson.scripts || {};
  return Object.entries(scripts)
    .filter(([name]) => isDirectE2EScriptRoute(name))
    .map(([name, command]) => {
      const specPaths = extractCommandPaths(command, "spec\\.js");
      const metadata = resolveDirectE2eMetadata(name, specPaths);
      return {
        id: `direct-e2e:${name}`,
        commandRef: name,
        sourceRef: specPaths.join(","),
        domain: metadata.domain,
        ownerHint: metadata.ownerHint,
        layer: "heavy",
        cost: "heavy",
        resourceLocks: ["browser-dev-server", "playwright-browser", ".runtime-output"],
        executionOwner: "main-thread",
        ciProfile: metadata.ciProfile,
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
          commandRef: pythonCommandForTestPath(sourceRef),
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
  const metadataRoutes = buildVerificationMetadataRoutes();
  const metadataRouteIds = new Set(metadataRoutes.map((route) => route.id));
  return [
    ...metadataRoutes,
    ...INFRASTRUCTURE_ROUTES.filter((route) => !metadataRouteIds.has(route.id)),
    ...buildE2eRoutes(),
    ...buildDirectE2EScriptRoutes(),
    ...buildNodeRoutes(),
    ...buildPythonRoutes(),
  ];
}

export function pythonCommandForTestPath(sourceRef) {
  const absolutePath = path.join(REPO_ROOT, sourceRef);
  const source = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
  const hasTopLevelPytestTests = /(?:^|\n)def\s+test_[A-Za-z0-9_]*\s*\(/.test(source);
  if (hasTopLevelPytestTests) {
    return `python -m pytest ${sourceRef} -q`;
  }
  const hasUnittestCase = /\bunittest\.TestCase\b/.test(source);
  const hasPytestStyleTests = /(?:^|\n)\s*def\s+test_[A-Za-z0-9_]*\s*\(/.test(source);
  if (hasPytestStyleTests && !hasUnittestCase) {
    return `python -m pytest ${sourceRef} -q`;
  }
  return `python -m unittest ${moduleNameFromPythonPath(sourceRef)} -q`;
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
  validateRouteGuidance(route);
  const scripts = packageJson.scripts || {};
  const knownCommand =
    route.commandRef in scripts ||
    route.commandRef.startsWith("node tools/e2e_layering.mjs ") ||
    route.commandRef.startsWith("node tools/select_verification_targets.mjs ") ||
    route.commandRef.startsWith("node tools/run_adaptive_tests.mjs ") ||
    route.commandRef.startsWith("python -m pytest ") ||
    route.commandRef.startsWith("python -m unittest ") ||
    route.commandRef.startsWith("python tools/");
  if (!knownCommand) {
    throw new Error(`Route ${route.id} commandRef is not a package script or known command: ${route.commandRef}`);
  }
}

function validateRouteGuidance(route) {
  if (route.guidance === undefined) return;
  if (!route.guidance || typeof route.guidance !== "object" || Array.isArray(route.guidance)) {
    throw new Error(`Route ${route.id} guidance must be an object.`);
  }
  for (const field of Object.keys(route.guidance)) {
    if (!ROUTE_GUIDANCE_FIELDS.includes(field)) {
      throw new Error(`Route ${route.id} guidance has unknown field: ${field}`);
    }
    if (ROUTE_GUIDANCE_ARRAY_FIELDS.has(field)) {
      const value = route.guidance[field];
      if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry.trim())) {
        throw new Error(`Route ${route.id} guidance.${field} must be an array of strings.`);
      }
    }
  }
  if ("status" in route.guidance && (typeof route.guidance.status !== "string" || !route.guidance.status.trim())) {
    throw new Error(`Route ${route.id} guidance.status must be a string.`);
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
