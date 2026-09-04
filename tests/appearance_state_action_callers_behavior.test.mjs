import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const APPEARANCE_CALLER_PATHS = Object.freeze([
  "js/ui/toolbar/appearance_border_owner.js",
  "js/ui/toolbar/appearance_city_points_owner.js",
  "js/ui/toolbar/appearance_controls_controller.js",
  "js/ui/toolbar/appearance_parent_border_owner.js",
  "js/ui/toolbar/appearance_physical_owner.js",
  "js/ui/toolbar/appearance_rivers_owner.js",
  "js/ui/toolbar/appearance_texture_owner.js",
]);

async function readSource(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("appearance preset defaults stay pure while the action owns runtime commits", async () => {
  const [defaultsSource, actionsSource, historySource] = await Promise.all([
    readSource("js/core/state/appearance_preset_state.js"),
    readSource("js/core/state/actions/appearance_preset_actions.js"),
    readSource("js/core/history_manager.js"),
  ]);

  assert.doesNotMatch(defaultsSource, /applyAppearancePresetToRuntimeState/);
  assert.doesNotMatch(defaultsSource, /target\.intensityFields\s*=/);
  assert.match(actionsSource, /setAppearanceStyleConfigState\(target, snapshot\.styleConfig\)/);
  assert.match(actionsSource, /patchAppearanceVisibilityState\(target,/);
  assert.match(actionsSource, /setIntensityFieldsState\(\s*target,/);
  assert.match(historySource, /state\/actions\/appearance_preset_actions\.js/);
  assert.match(historySource, /applyAppearanceStylePathPatchState\(runtimeState, stylePatch\)/);
  assert.match(historySource, /setIntensityFieldsState\(runtimeState, current\)/);
  assert.match(historySource, /setAppearancePresetsState\(/);
  assert.doesNotMatch(historySource, /runtimeState\.intensityFields\s*=(?!=)/);
  assert.doesNotMatch(historySource, /runtimeState\.appearancePresets\s*=(?!=)/);
  assert.doesNotMatch(
    historySource,
    /import\s*\{[^}]*applyAppearancePresetState[^}]*\}\s*from\s*["']\.\/state\/appearance_preset_state\.js["']/s,
  );
});

test("appearance style callers commit through canonical style actions", async () => {
  const sources = await Promise.all(
    APPEARANCE_CALLER_PATHS.map(async (relativePath) => [relativePath, await readSource(relativePath)]),
  );
  const directStyleAssignments = [
    /runtimeState\.styleConfig(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])?\s*=(?!=)/,
    /runtimeState\.styleConfig\.[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\s*=(?!=)/,
    /\b(?:cfg|config|cityPointsConfig)\.[A-Za-z_$][\w$]*\s*=(?!=)/,
  ];

  for (const [relativePath, source] of sources) {
    assert.match(
      source,
      /(?:set|patch)AppearanceStyleGroupState\(/,
      `${relativePath} must delegate style commits to appearance actions`,
    );
    for (const pattern of directStyleAssignments) {
      assert.doesNotMatch(source, pattern, `${relativePath} retains a direct style write`);
    }
  }
});

test("appearance controller delegates selected color and visibility writes", async () => {
  const source = await readSource("js/ui/toolbar/appearance_controls_controller.js");
  assert.match(source, /setSelectedColorState\(runtimeState, normalized\)/);
  assert.match(source, /setAppearanceVisibilityState\(runtimeState, "showUrban", event\.target\.checked\)/);
  assert.doesNotMatch(source, /runtimeState\.selectedColor\s*=/);
  assert.doesNotMatch(source, /runtimeState\.showUrban\s*=/);
});

test("parent-border owner delegates country enablement writes", async () => {
  const source = await readSource("js/ui/toolbar/appearance_parent_border_owner.js");
  assert.match(source, /setAppearanceParentBorderEnabledMapState\(runtimeState,/);
  assert.match(source, /patchAppearanceParentBorderEnabledMapState\(runtimeState,/);
  assert.doesNotMatch(source, /runtimeState\.parentBorderEnabledByCountry\s*=(?!=)/);
  assert.doesNotMatch(source, /runtimeState\.parentBorderEnabledByCountry\[[^\]]+\]\s*=(?!=)/);
});
