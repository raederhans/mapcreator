import assert from "node:assert/strict";
import test from "node:test";

import {
  STARTUP_RESOURCE_CLASSES,
  buildStartupResourceGraph,
  validateStartupResourceGraph,
} from "../tools/startup_resource_graph.mjs";

test("startup resource graph is deterministic and reconciles the source entrypoint to Pages ownership", () => {
  const first = buildStartupResourceGraph();
  const second = buildStartupResourceGraph();

  assert.deepEqual(second, first);
  assert.deepEqual(first.entrypoint, {
    html_path: "index.html",
    module_path: "js/main.js",
    pages_html_path: "app/index.html",
    pages_module_path: "app/js/main.js",
  });
  assert.equal(first.manifest.admission_status, "complete");
  assert.equal(first.manifest.graph_scan_status, "complete");
  assert.equal(first.manifest.product_inventory_status, "complete");
  assert.equal(first.manifest.publication_ownership_status, "complete");
  assert.equal(first.validation.status, "complete");
  assert.deepEqual(Object.keys(first.categories), STARTUP_RESOURCE_CLASSES);
  assert.ok(first.categories.critical.includes("js/main.js"));
  assert.ok(first.categories.deferred.includes("js/bootstrap/startup_sample_project_deeplink.js"));
  assert.ok(first.categories.deferred.includes("js/core/appearance_transport_change_set.js"));
  assert.ok(first.categories["scenario-specific"].includes("js/bootstrap/startup_scenario_boot.js"));
  assert.equal(first.stage_a_lazy_loader.path, "js/bootstrap/startup_lazy_module_loader.js");
  assert.equal(first.stage_a_lazy_loader.entrypoint_imported, true);
  assert.deepEqual(first.stage_a_lazy_loader.bindings, [
    { name: "startupSampleProjectDeeplinkModuleLoader", target: "js/bootstrap/startup_sample_project_deeplink.js" },
    { name: "startupScenarioBootOwnerLoader", target: "js/bootstrap/startup_scenario_boot.js" },
  ]);
  assert.ok(first.modules.every((record) => record.product_owner));
  assert.ok(first.resources.every((record) => record.product_owner));
});

test("startup resource graph rejects optional base-startup re-entry and missing ownership", () => {
  const result = validateStartupResourceGraph({
    issues: [],
    manifest: {
      admission_status: "complete",
      graph_scan_status: "complete",
      product_inventory_status: "complete",
      publication_ownership_status: "complete",
    },
    modules: [{
      base_startup: true,
      classification: "deferred",
      manifest_load_phase: "deferred-runtime",
      product_owner: "",
      source_path: "js/optional_feature.js",
    }],
    resources: [],
  });

  assert.equal(result.status, "rejected");
  assert.deepEqual(result.issues.map((issue) => issue.code), [
    "missing-product-owner",
    "optional-resource-in-base-startup-graph",
  ]);
});
