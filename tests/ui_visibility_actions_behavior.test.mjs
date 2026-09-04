import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  discoverStateWriterBindingsForSource,
  validateStateActionNonTargetParameterMutations,
} from "../tools/build_state_writer_policy.mjs";

import {
  captureUiVisibilityState,
  commitUiVisibilityState,
  restoreImportedLayerVisibilityState,
  restoreUiVisibilityState,
} from "../js/core/state/actions/ui_visibility_actions.js";

test("visibility actions patch admitted present properties and preserve absent properties", () => {
  const target = {
    showWaterRegions: false,
    showUrban: true,
    strategicChoroplethMetric: "population",
  };

  commitUiVisibilityState(target, {
    showWaterRegions: 1,
    showPhysical: 0,
    unknownVisibility: true,
  });
  assert.equal(target.showWaterRegions, true);
  assert.equal(target.showPhysical, false);
  assert.equal(target.showUrban, true);
  assert.equal(Object.hasOwn(target, "showRoad"), false);
  assert.equal(Object.hasOwn(target, "unknownVisibility"), false);

  restoreImportedLayerVisibilityState(target, { showRoad: 1 });
  assert.equal(target.showRoad, true);
  assert.equal(target.showUrban, true);
  assert.equal(Object.hasOwn(target, "showRail"), false);
});

test("visibility capture and restore produce a detached finite snapshot", () => {
  const target = {
    showOpenOceanRegions: true,
    allowOpenOceanPaint: false,
    strategicChoroplethMetric: " resources ",
    privateFlag: true,
  };
  const snapshot = captureUiVisibilityState(target);
  target.showOpenOceanRegions = false;
  target.strategicChoroplethMetric = "";

  assert.deepEqual(snapshot, {
    showOpenOceanRegions: true,
    allowOpenOceanPaint: false,
    strategicChoroplethMetric: "resources",
  });
  restoreUiVisibilityState(target, snapshot);
  assert.equal(target.showOpenOceanRegions, true);
  assert.equal(target.strategicChoroplethMetric, "resources");
  assert.equal(target.privateFlag, true);
});

test("visibility actions keep non-target parameters read-only", async () => {
  const modulePath = "js/core/state/actions/ui_visibility_actions.js";
  const source = await readFile(new URL(`../${modulePath}`, import.meta.url), "utf8");
  assert.deepEqual(
    await validateStateActionNonTargetParameterMutations(modulePath, source),
    [],
  );
  const { bindingInventories } = await discoverStateWriterBindingsForSource(
    modulePath,
    source,
    "production",
    {
      scanAllParameters: true,
      enforceCurrentContracts: true,
      includeInventories: true,
      derivedAliasTaintMode: "strict",
    },
  );
  assert.deepEqual(
    bindingInventories.flatMap(({ binding, findings }) => (
      binding.kind === "function-parameter" && binding.parameterIndex === 0
        ? findings.filter(({ dynamic, unsupported }) => dynamic || unsupported)
        : []
    )),
    [],
  );
});
