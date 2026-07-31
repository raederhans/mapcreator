import assert from "node:assert/strict";
import test from "node:test";

import {
  ensureUiChromeState,
  patchUiChromeState,
  setActiveDockPopoverState,
  setRestoredSupportSurfaceViewState,
} from "../js/core/state/actions/ui_chrome_actions.js";

test("ui chrome actions preserve the ui root and write only admitted fields", () => {
  const ui = {
    dockCollapsed: 1,
    tutorialEntryVisible: 0,
    paletteLibrarySections: { recent: 1 },
    retained: "owner-private",
  };
  const target = { ui };

  assert.equal(ensureUiChromeState(target), ui);
  assert.equal(target.ui.dockCollapsed, true);
  assert.equal(target.ui.tutorialEntryVisible, false);

  const sections = { regional: true };
  assert.equal(patchUiChromeState(target, {
    scenarioBarCollapsed: 1,
    responsiveChromeTier: " compact ",
    paletteLibrarySections: sections,
    unownedField: "drop",
  }), ui);
  assert.equal(target.ui.scenarioBarCollapsed, true);
  assert.equal(target.ui.responsiveChromeTier, "compact");
  assert.deepEqual(target.ui.paletteLibrarySections, { regional: true });
  assert.notEqual(target.ui.paletteLibrarySections, sections);
  assert.equal(Object.hasOwn(target.ui, "unownedField"), false);
  assert.equal(target.ui.retained, "owner-private");
});

test("ui chrome scalar actions normalize support-surface and popover values", () => {
  const target = {};

  assert.equal(setActiveDockPopoverState(target, " reference "), "reference");
  assert.equal(setRestoredSupportSurfaceViewState(target, " export "), "export");
  assert.equal(target.activeDockPopover, "reference");
  assert.equal(target.ui.restoredSupportSurfaceViewFromUrl, "export");
});
