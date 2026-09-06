import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parse } from "acorn";
import { createBorderMeshOwner } from "../js/core/renderer/border_mesh_owner.js";

// Execute the real private renderer leaf without initializing the browser app.
const source = fs.readFileSync(new URL("../js/core/map_renderer.js", import.meta.url), "utf8");
const node = parse(source, { ecmaVersion: "latest", sourceType: "module" }).body.find(
  (entry) => entry.type === "FunctionDeclaration" && entry.id.name === "renderFrontlineOverlay",
);
assert.ok(node, "renderer retains the scheduler's frontline cleanup leaf");
const bindCleanup = new Function("runtimeState", "rendererSurfaceHost", "getBorderMeshOwner",
  `${source.slice(node.start, node.end)}; return renderFrontlineOverlay;`);

function harness(enabled, missing = "") {
  const calls = [];
  const labels = [{ key: "old-label" }];
  const state = {
    annotationView: { frontlineEnabled: enabled, showFrontlineLabels: true },
    cachedFrontlineMesh: { coordinates: [[[0, 0], [1, 1]]] },
    cachedFrontlineMeshHash: "old-mesh",
    cachedFrontlineLabelAnchors: labels,
    cachedFrontlineLabelAnchorsHash: "old-label-hash",
  };
  const group = (name) => ({
    selectAll: (selector) => ({ remove: () => calls.push([name, "remove", selector]) }),
    attr: (key, value) => calls.push([name, key, value]),
  });
  const overlay = group("overlay");
  const labelGroup = group("labels");
  const owner = createBorderMeshOwner({ state });
  let ownerCalls = 0;
  const run = bindCleanup(state, {
    getFrontlineOverlayGroup: () => missing === "overlay" ? null : overlay,
    getFrontlineLabelsGroup: () => missing === "labels" ? null : labelGroup,
    getPathSvg: () => missing === "path" ? null : () => assert.fail("retired geometry must not be drawn"),
  }, () => {
    ownerCalls += 1;
    return owner;
  });
  return { run, state, labels, calls, owner, ownerCalls: () => ownerCalls };
}

const hiddenGroups = [
  ["overlay", "remove", "*"], ["labels", "remove", "*"],
  ["overlay", "aria-hidden", "true"], ["labels", "aria-hidden", "true"],
];

test("legacy enabled frontline saves stay hidden under the real retired mesh contract", () => {
  const h = harness(true);
  h.run();
  assert.equal(h.ownerCalls(), 1);
  assert.equal(h.owner.getFrontlineMesh(), null);
  assert.equal(h.state.cachedFrontlineMesh, null);
  assert.equal(h.state.cachedFrontlineMeshHash, "");
  assert.deepEqual(h.state.cachedFrontlineLabelAnchors, []);
  assert.equal(h.state.cachedFrontlineLabelAnchorsHash, "");
  assert.deepEqual(h.calls, hiddenGroups);
});

test("disabled frontline cleanup resets legacy labels and meshes without creating an owner", () => {
  const h = harness(false);
  h.run();
  assert.equal(h.ownerCalls(), 0);
  assert.equal(h.state.cachedFrontlineMesh, null);
  assert.equal(h.state.cachedFrontlineMeshHash, "");
  assert.deepEqual(h.state.cachedFrontlineLabelAnchors, []);
  assert.equal(h.state.cachedFrontlineLabelAnchorsHash, "");
  assert.deepEqual(h.calls, hiddenGroups);
});

test("incomplete renderer surfaces leave saved state untouched", () => {
  for (const missing of ["overlay", "labels", "path"]) {
    for (const enabled of [true, false]) {
      const h = harness(enabled, missing);
      const before = structuredClone(h.state);
      h.run();
      assert.deepEqual(h.state, before);
      assert.deepEqual(h.calls, []);
      assert.equal(h.ownerCalls(), 0);
    }
  }
});
