// Internal catalog definitions. Consumers use verification_catalog_source.mjs.
// This preserves the historical appended sequence: 24 local feedback records and
// three Python coverage records, which retain their heavy/main-thread policy.
export function createLocalFeedbackRecords(baseRecords) {
  // Local action feedback reuses the existing behavior suites. Historical policy
  // and phase receipts remain explicit deeper-tier checks, not edit prerequisites.
  const localActionTests = [
    "appearance_actions", "appearance_preset_actions", "appearance_reference_actions",
    "appearance_selection_actions", "appearance_visibility_actions", "export_workbench_actions",
    "intensity_field_actions", "special_zone_actions", "strategic_overlay_actions",
    "transport_actions", "ui_chrome_actions", "ui_dirty_actions", "ui_visibility_actions",
  ];

  const localActionOrder = Math.max(...baseRecords.map((record) => record.selectorOrder || 0)) + 1;

  const actionRecords = localActionTests.map((name, index) => ({
    id: "local:p4-action:" + name,
    commandRef: "node --test tests/" + name + "_behavior.test.mjs",
    sourceRefs: [
      "js/core/state/actions/" + name + ".js", "tests/" + name + "_behavior.test.mjs",
      ...(name === "special_zone_actions" ? ["js/core/special_zone_layers.js"] : []),
    ],
    ownerHints: ["state-ownership"], domains: ["state-ownership"], tiers: ["contract"],
    cost: "fast", resourceLocks: [], executionOwners: ["child-safe"], profiles: ["pr-fast"],
    platforms: ["all"], entrypointPolicyIndex: 5,
    verificationOrder: null, selectorOrder: localActionOrder + index,
    verification: null, selector: {},
  }));

  const borderRecords = ["border_mesh_owner", "border_draw_owner"].map((name, index) => ({
    id: "local:renderer:" + name,
    commandRef: "node --test tests/" + name + "_behavior.test.mjs",
    sourceRefs: ["js/core/renderer/" + name + ".js", "tests/" + name + "_behavior.test.mjs"],
    ownerHints: ["renderer"], domains: ["renderer"], tiers: ["contract"],
    cost: "fast", resourceLocks: [], executionOwners: ["child-safe"], profiles: ["pr-fast"],
    platforms: ["all"], entrypointPolicyIndex: 5,
    verificationOrder: null, selectorOrder: localActionOrder + localActionTests.length + index,
    verification: null, selector: {},
  }));

  // Sidebar model and controller changes execute their existing behavior coverage.
  const countryInspectorRecord = {
    id: "local:sidebar:country-inspector",
    commandRef: "node --test tests/country_inspector_model_behavior.test.mjs tests/country_inspector_controller_behavior.test.mjs",
    sourceRefs: ["js/ui/sidebar/country_inspector_model.js", "js/ui/sidebar/country_inspector_controller.js",
      "tests/country_inspector_model_behavior.test.mjs", "tests/country_inspector_controller_behavior.test.mjs"],
    ownerHints: ["sidebar"], domains: ["sidebar"], tiers: ["contract"],
    cost: "fast", resourceLocks: [], executionOwners: ["child-safe"], profiles: ["pr-fast"],
    platforms: ["all"], entrypointPolicyIndex: 5,
    verificationOrder: null, selectorOrder: localActionOrder + localActionTests.length + 2,
    verification: null, selector: {},
  };

  // Previously unregistered Python package entrypoints discovered independently.
  const pythonCoverageRoutes = [
    ["test:py:tno-water-repair-contracts", ["tests/test_tno_water_owners_consistency.py", "tests/test_tno_bundle_builder.py"]],
    ["test:py:hgo-runtime-seed", ["tests/test_hgo_runtime_seed_builder.py"]],
    ["test:py:hgo-runtime-assets-contract", ["tests/test_data_manifest_contract.py", "tests/test_data_catalog_contract.py"]],
  ];

  const pythonCoverageOrder = localActionOrder + actionRecords.length + borderRecords.length + 1;

  const pythonRecords = pythonCoverageRoutes.map(([commandRef, sourceRefs], index) => ({
    id: "python-package:" + commandRef, commandRef, sourceRefs,
    ownerHints: ["geo-contract"], domains: ["geo-contract"], tiers: ["heavy"],
    cost: "heavy", resourceLocks: ["heavy-geo", ".runtime-output"], executionOwners: ["main-thread"], profiles: ["full"],
    platforms: ["all"], entrypointPolicyIndex: 0,
    verificationOrder: null, selectorOrder: pythonCoverageOrder + index,
    verification: null, selector: {},
  }));

  // Each local leaf covers this owner only; broader roots and data retain their
  // existing PR/nightly/release requirements.
  const localOwnerCoverage = [
    ["ocean-render", "renderer", "js/core/renderer/ocean_render_owner.js", "tests/ocean_render_owner_behavior.test.mjs"],
    ["viewport-update", "renderer", "js/core/renderer/renderer_viewport_update_owner.js", "tests/renderer_viewport_update_owner_behavior.test.mjs"],
    ["map-hover", "renderer", "js/core/map_renderer/map_hover_interaction_owner.js", "tests/map_hover_interaction_owner_behavior.test.mjs"],
    ["city-lights-render", "renderer", "js/core/renderer/city_lights_render_owner.js", "tests/city_lights_render_owner_behavior.test.mjs"],
    ["project-support-diagnostics", "sidebar", "js/ui/sidebar/project_support_diagnostics_controller.js", "tests/project_support_diagnostics_controller_behavior.test.mjs"],
    ["commit-runner", "test-routing", "tools/run_commit_verification.mjs", "tests/verify_commit_runner_behavior.test.mjs"],
    ["unit-counter-catalog", "sidebar", "js/ui/sidebar/strategic_overlay/unit_counter_catalog_helper.js", "tests/unit_counter_catalog_behavior.test.mjs"],
  ];

  const localOwnerOrder = pythonCoverageOrder + pythonRecords.length;

  const ownerRecords = localOwnerCoverage.map(([id, domain, source, testFile], index) => ({
    id: "local:owner:" + id, commandRef: "node --test " + testFile,
    sourceRefs: [source, testFile], ownerHints: [domain], domains: [domain], tiers: ["contract"],
    cost: "fast", resourceLocks: [], executionOwners: ["child-safe"], profiles: ["pr-fast"],
    platforms: ["all"], entrypointPolicyIndex: 5,
    verificationOrder: null, selectorOrder: localOwnerOrder + index,
    verification: null, selector: {},
  }));

  const retiredFrontlineRecord = {
    id: "local:test:retired-frontline", commandRef: "node --test tests/retired_frontline_behavior.test.mjs",
    sourceRefs: ["tests/retired_frontline_behavior.test.mjs"],
    ownerHints: ["renderer"], domains: ["renderer"], tiers: ["contract"],
    cost: "fast", resourceLocks: [], executionOwners: ["child-safe"], profiles: ["pr-fast"],
    platforms: ["all"], entrypointPolicyIndex: 5,
    verificationOrder: null, selectorOrder: localOwnerOrder + localOwnerCoverage.length,
    verification: null, selector: {},
  };

  return [...actionRecords, ...borderRecords, countryInspectorRecord,
    ...pythonRecords, ...ownerRecords, retiredFrontlineRecord];
}
