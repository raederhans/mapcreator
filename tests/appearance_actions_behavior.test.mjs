import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAppearanceStylePathPatchState,
  ensureAppearanceStyleConfigState,
  patchAppearanceParentBorderEnabledMapState,
  patchAppearanceStyleGroupState,
  setAppearanceParentBorderEnabledMapState,
  setAppearanceStyleGroupState,
} from "../js/core/state/actions/appearance_actions.js";

test("appearance actions restrict groups and preserve unrelated style groups", () => {
  const target = { styleConfig: { ocean: { opacity: 0.5 }, lakes: { enabled: true } } };
  assert.equal(ensureAppearanceStyleConfigState(target), target.styleConfig);
  assert.deepEqual(patchAppearanceStyleGroupState(target, "ocean", { opacity: 0.8 }), { opacity: 0.8 });
  setAppearanceStyleGroupState(target, "physical", { opacity: 1 });
  assert.equal(target.styleConfig.lakes.enabled, true);
  assert.throws(() => setAppearanceStyleGroupState(target, "unknown", {}), /unknown style group/);
});

test("appearance actions own parent-border country enablement without mutating caller patches", () => {
  const target = { parentBorderEnabledByCountry: { FRA: true, OLD: true } };
  const replacement = { FRA: 0, DEU: 1 };
  const patch = { FRA: true, DEU: false };

  assert.deepEqual(setAppearanceParentBorderEnabledMapState(target, replacement), {
    FRA: false,
    DEU: true,
  });
  assert.deepEqual(replacement, { FRA: 0, DEU: 1 });

  assert.deepEqual(patchAppearanceParentBorderEnabledMapState(target, patch), {
    FRA: true,
    DEU: false,
  });
  assert.deepEqual(patch, { FRA: true, DEU: false });
  assert.throws(
    () => setAppearanceParentBorderEnabledMapState(target, []),
    /enabled map must be an object/,
  );
});

test("appearance actions apply history style paths while preserving style-config identity", () => {
  const styleConfig = {
    ocean: { opacity: 0.5, color: "#123456" },
    cityPoints: { radius: 2 },
  };
  const target = { styleConfig };

  assert.equal(
    applyAppearanceStylePathPatchState(target, {
      "ocean.opacity": 0.8,
      "ocean.color": null,
      "rivers.width": 1.5,
    }),
    styleConfig,
  );
  assert.deepEqual(target.styleConfig, {
    ocean: { opacity: 0.8 },
    cityPoints: { radius: 2 },
    rivers: { width: 1.5 },
  });
});
