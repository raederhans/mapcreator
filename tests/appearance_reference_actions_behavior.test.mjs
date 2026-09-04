import test from "node:test";
import assert from "node:assert/strict";
import { patchReferenceImageState, setReferenceImageState, setReferenceImageUrlState } from "../js/core/state/actions/appearance_reference_actions.js";

test("reference actions only mutate normalized state and URL value", () => {
  const target = { referenceImageState: { opacity: 0.2 }, referenceImageUrl: null };
  const state = patchReferenceImageState(target, { opacity: 0.7, offsetX: 12 });
  assert.equal(state.opacity, 0.7);
  assert.equal(state.offsetX, 12);
  assert.equal(setReferenceImageUrlState(target, "blob:test"), "blob:test");
  assert.equal(target.referenceImageUrl, "blob:test");
});

test("reference state rejects an invalid target before reading caller input", () => {
  let reads = 0;
  const input = Object.defineProperty({}, "opacity", {
    enumerable: true,
    get() {
      reads += 1;
      return 0.7;
    },
  });

  assert.throws(() => setReferenceImageState(null, input), /target must be an object/);
  assert.equal(reads, 0);
});
