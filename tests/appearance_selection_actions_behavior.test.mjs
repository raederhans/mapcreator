import test from "node:test";
import assert from "node:assert/strict";
import { setSelectedColorState } from "../js/core/state/actions/appearance_selection_actions.js";

test("selected color action writes only explicit target", () => {
  const target = { selectedColor: "#000000", unrelated: 1 };
  assert.equal(setSelectedColorState(target, "#abcdef"), "#abcdef");
  assert.equal(target.selectedColor, "#abcdef");
  assert.equal(target.unrelated, 1);
});
