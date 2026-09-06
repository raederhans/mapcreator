import test from "node:test";
import assert from "node:assert/strict";
import { createRegionalPresetController } from "../js/ui/sidebar/regional_preset_controller.js";

function harness({ ids = ["a"], visible = ["a", "b", "c"], meta = {}, runtime = {} } = {}) {
  const state = {
    presetsState: { AA: [{ name: "Core", ids, preset_kind: "releasable_core" }] },
    selectedBoundaryVariantId: "old", ...runtime,
  };
  const calls = [];
  const controller = createRegionalPresetController(state, {
    t: (text) => text,
    normalizeCountryCode: (code) => String(code).trim().toUpperCase(),
    getScenarioCountryMeta: () => meta,
    resolveFeatureIdsFromPresetSource: (source, lookup) => {
      calls.push({ ...lookup });
      return source?.ids || [];
    },
    filterToVisibleFeatureIds: (ids) => {
      const requestedIds = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
      return {
        requestedIds, matchedIds: requestedIds.filter((id) => visible.includes(id)),
        missingIds: requestedIds.filter((id) => !visible.includes(id)),
      };
    },
  });
  const country = { code: "AA", selectedBoundaryVariantId: "old" };
  return { state, country, calls, controller, plan: (options) => controller.prepareScenarioCoreApplication(country, options) };
}

test("normal core plan uses the stored primary reference and assigns owner and controller", () => {
  const { plan } = harness();
  assert.deepEqual(plan(), {
    applied: true, reason: "", requestedCount: 1, matchedCount: 1, missingCount: 0,
    presetRef: { presetLookupCode: "AA", presetIndex: 0, preset: { name: "Core", ids: ["a"] } },
    assignments: { a: { ownerCode: "AA", controllerCode: "AA" } },
  });
});

test("partial visibility counts missing ids without assigning them", () => {
  const result = harness({ ids: ["a", "missing", "a"] }).plan();
  assert.deepEqual([result.requestedCount, result.matchedCount, result.missingCount], [2, 1, 1]);
  assert.deepEqual(Object.keys(result.assignments), ["a"]);
});

for (const [ids, reason] of [[[], "empty-preset"], [["missing"], "no-visible-features"]]) {
  test(`${reason} returns no assignments and leaves runtime unchanged`, () => {
    const { plan, state } = harness({ ids });
    const before = structuredClone(state);
    const result = plan();
    assert.equal(result.applied, false);
    assert.equal(result.reason, reason);
    assert.deepEqual(result.assignments, {});
    assert.deepEqual(state, before);
  });
}

test("unknown variant does not silently select the default or stored preset", () => {
  const { plan } = harness({ meta: { boundary_variants: [{ id: "known", preset_source: { ids: ["a"] } }] } });
  for (const variantId of ["unknown", "other"]) {
    assert.equal(plan({ variantId }).reason, "missing-variant");
  }
  assert.equal(plan({ variantId: " KNOWN " }).applied, true);
});

test("union restores baseline then canonical owners and leaves controller fallback to transaction", () => {
  const { plan } = harness({
    meta: { boundary_variants: [{ id: "wide", preset_source: { ids: ["a", "b", "c", "d", "hidden"] } }] },
    visible: ["a", "b", "c", "d"],
    runtime: { scenarioBaselineOwnersByFeatureId: { b: " bb " }, runtimeCanonicalCountryByFeatureId: { b: "CC", c: "cc", hidden: "DD" } },
  });
  assert.deepEqual(plan().assignments, {
    a: { ownerCode: "AA", controllerCode: "AA" }, b: { ownerCode: "BB" }, c: { ownerCode: "CC" },
  });
});

test("preview resolves exact variant without changing selection or presets; returned data is detached", () => {
  const meta = { selected_boundary_variant_id: "old", boundary_variants: [{ id: "new", preset_source: { ids: ["b"] } }] };
  const { plan, state, country } = harness({ meta });
  const before = structuredClone({ meta, state, country });
  const result = plan({ variantId: "new" });
  assert.deepEqual(result.presetRef.preset.ids, ["b"]);
  assert.deepEqual(result.assignments, { b: { ownerCode: "AA", controllerCode: "AA" } });
  result.presetRef.preset.ids.push("mutation");
  result.presetRef.preset.name = "mutation";
  result.assignments.b.ownerCode = "mutation";
  const normal = plan();
  normal.presetRef.preset.ids.push("mutation");
  normal.presetRef.preset.name = "mutation";
  assert.deepEqual({ meta, state, country }, before);
});

test("primary and union source lookups retain their distinct tag and base rules", () => {
  const { plan, calls } = harness({ meta: {
    tag: "PRIMARY", code: "UNION", lookup_iso2: "LOOKUP",
    boundary_variants: [{ id: "new", preset_source: { ids: ["a"] } }],
  } });
  plan({ variantId: "new" });
  assert.deepEqual(calls, [
    { tag: "PRIMARY", release_lookup_iso2: "LOOKUP", lookup_iso2: "LOOKUP", base_iso2: "" },
    { tag: "UNION", release_lookup_iso2: "LOOKUP", lookup_iso2: "LOOKUP", base_iso2: "LOOKUP" },
  ]);
});

test("country boundary variants support preview without scenario metadata", () => {
  const { controller } = harness({ meta: null });
  const result = controller.prepareScenarioCoreApplication({
    code: "AA", boundaryVariants: [{ id: "new", preset_source: { ids: ["b"] } }],
  }, { variantId: "new" });
  assert.equal(result.applied, true);
  assert.deepEqual(result.presetRef.preset.ids, ["b"]);
});
