import assert from "node:assert/strict";
import test from "node:test";

import { createViewportCommandOwner } from "../js/core/renderer/viewport_command_owner.js";

function createTransform(label) {
  return { label, x: 0, y: 0, k: 1 };
}

function createHarness({
  state: stateOverrides = {},
  constants = {},
  zoomBehavior = undefined,
  interactionNode = { id: "interaction-rect" },
  d3 = undefined,
  panExtent = [[-50, -50], [850, 650]],
  centeredTransform = createTransform("centered"),
} = {}) {
  const state = {
    width: 800,
    height: 600,
    zoomTransform: null,
    ...stateOverrides,
  };
  const calls = {
    scaleExtent: [],
    extent: [],
    translateExtent: [],
    transform: [],
    scaleBy: [],
    scaleTo: [],
    translateBy: [],
    select: [],
    d3Call: [],
    centered: [],
    order: [],
  };
  const effectLog = {
    zoomTransform: null,
  };
  const behavior = zoomBehavior === undefined ? {
    scaleExtent(value) {
      calls.scaleExtent.push(value);
      return behavior;
    },
    extent(value) {
      calls.extent.push(value);
      return behavior;
    },
    translateExtent(value) {
      calls.translateExtent.push(value);
      return behavior;
    },
    transform(transform) {
      calls.transform.push(transform);
    },
    scaleBy(factor) {
      calls.scaleBy.push(factor);
    },
    scaleTo(scale) {
      calls.scaleTo.push(scale);
    },
    translateBy(x, y) {
      calls.translateBy.push([x, y]);
    },
  } : zoomBehavior;
  const d3Runtime = d3 === undefined ? {
    zoomIdentity: createTransform("identity"),
    select(node) {
      calls.select.push(node);
      return {
        call(method, ...args) {
          calls.order.push("d3.call");
          calls.d3Call.push({ method, args });
          method(...args);
          return this;
        },
      };
    },
  } : d3;
  const owner = createViewportCommandOwner({
    state,
    constants,
    getters: {
      getZoomBehavior: () => behavior,
      getInteractionRect: () => ({
        node: () => interactionNode,
      }),
      getD3: () => d3Runtime,
      calculatePanExtent: () => panExtent,
      getCenteredFitZoomTransform: (options) => {
        calls.centered.push(options);
        return centeredTransform;
      },
    },
    effects: {
      setZoomTransform: (transform) => {
        calls.order.push("setZoomTransform");
        effectLog.zoomTransform = transform;
      },
    },
  });
  return { behavior, calls, d3Runtime, effectLog, owner, state };
}

test("updateZoomTranslateExtent configures scale extent viewport extent and pan extent", () => {
  const { calls, owner } = createHarness({
    constants: { minZoomScale: 0.5, maxZoomScale: 20 },
    panExtent: [[10, 20], [30, 40]],
  });

  owner.updateZoomTranslateExtent();

  assert.deepEqual(calls.scaleExtent, [[0.5, 20]]);
  assert.deepEqual(calls.extent, [[[0, 0], [800, 600]]]);
  assert.deepEqual(calls.translateExtent, [[[10, 20], [30, 40]]]);
});

test("updateZoomTranslateExtent noops without zoom behavior or usable dimensions", () => {
  const missingZoom = createHarness({ zoomBehavior: null });
  missingZoom.owner.updateZoomTranslateExtent();
  assert.deepEqual(missingZoom.calls.scaleExtent, []);

  const zeroWidth = createHarness({ state: { width: 0 } });
  zeroWidth.owner.updateZoomTranslateExtent();
  assert.deepEqual(zeroWidth.calls.scaleExtent, []);

  const zeroHeight = createHarness({ state: { height: 0 } });
  zeroHeight.owner.updateZoomTranslateExtent();
  assert.deepEqual(zeroHeight.calls.scaleExtent, []);
});

test("resetZoomToFit updates extents and records transform before applying d3 zoom transform", () => {
  const centeredTransform = createTransform("centered");
  const { calls, effectLog, owner } = createHarness({ centeredTransform });

  owner.resetZoomToFit({ centerContent: true, centerX: false, centerY: true });

  assert.deepEqual(calls.centered, [{ centerX: false, centerY: true }]);
  assert.deepEqual(calls.scaleExtent, [[0.35, 50]]);
  assert.equal(effectLog.zoomTransform, centeredTransform);
  assert.deepEqual(calls.transform, [centeredTransform]);
  assert.deepEqual(calls.order, ["setZoomTransform", "d3.call"]);
});

test("resetZoomToFit uses zoom identity when content centering is disabled or unavailable", () => {
  const identity = createTransform("identity");
  const { calls, d3Runtime, effectLog, owner } = createHarness({
    d3: {
      zoomIdentity: identity,
      select(node) {
        calls.select.push(node);
        return {
          call(method, ...args) {
            calls.order.push("d3.call");
            method(...args);
            return this;
          },
        };
      },
    },
  });

  owner.resetZoomToFit();

  assert.equal(d3Runtime.zoomIdentity, identity);
  assert.equal(effectLog.zoomTransform, identity);
  assert.deepEqual(calls.transform, [identity]);

  const fallback = createHarness({ centeredTransform: null });
  fallback.owner.resetZoomToFit({ centerContent: true });
  assert.equal(fallback.effectLog.zoomTransform.label, "identity");
});

test("zoomByStep applies fixed positive and negative zoom factors", () => {
  const { calls, owner } = createHarness();

  owner.zoomByStep(1);
  owner.zoomByStep(0);
  owner.zoomByStep(-1);

  assert.deepEqual(calls.scaleBy, [1.2, 1.2, 1 / 1.2]);
});

test("setZoomPercent parses percent strings numbers clamps and ignores non-finite values", () => {
  const { calls, owner } = createHarness();

  owner.setZoomPercent("123%");
  owner.setZoomPercent(250);
  owner.setZoomPercent("-10%");
  owner.setZoomPercent("9000%");
  owner.setZoomPercent("nope");

  assert.deepEqual(calls.scaleTo, [1.23, 2.5, 0.35, 50]);
});

test("enforceZoomConstraints asks d3 to translate by zero", () => {
  const { calls, owner } = createHarness();

  owner.enforceZoomConstraints();

  assert.deepEqual(calls.translateBy, [[0, 0]]);
});

test("command wrappers noop without d3 selection inputs", () => {
  const missingD3 = createHarness({ d3: null });
  missingD3.owner.resetZoomToFit();
  assert.equal(missingD3.effectLog.zoomTransform, null);

  const missingNode = createHarness({ interactionNode: null });
  missingNode.owner.zoomByStep(1);
  missingNode.owner.setZoomPercent("150%");
  missingNode.owner.enforceZoomConstraints();

  assert.deepEqual(missingNode.calls.scaleBy, []);
  assert.deepEqual(missingNode.calls.scaleTo, []);
  assert.deepEqual(missingNode.calls.translateBy, []);
});

test("factory freezes its exact public API", () => {
  const { owner } = createHarness();

  assert.equal(Object.isFrozen(owner), true);
});
