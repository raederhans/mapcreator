import assert from "node:assert/strict";
import test from "node:test";

import {
  createAppearanceReferenceOwner,
  getReferenceStyleSignature,
  normalizeReferenceImageState,
} from "../js/ui/toolbar/appearance_reference_owner.js";

class TestElement {
  constructor() {
    this.checked = false;
    this.dataset = {};
    this.files = [];
    this.listeners = new Map();
    this.src = "";
    this.style = {};
    this.textContent = "";
    this.value = "";
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatch(type, event = {}) {
    for (const handler of this.listeners.get(type) || []) {
      handler({
        target: this,
        ...event,
      });
    }
  }
}

function createTestDocument(nodeMap) {
  return {
    getElementById: (id) => nodeMap[id] || null,
  };
}

function buildNodes(ids) {
  return Object.fromEntries(ids.map((id) => [id, new TestElement()]));
}

const REFERENCE_NODE_IDS = [
  "referenceImageInput",
  "referenceImage",
  "referenceOpacity",
  "referenceScale",
  "referenceOffsetX",
  "referenceOffsetY",
  "referenceOpacityValue",
  "referenceScaleValue",
  "referenceOffsetXValue",
  "referenceOffsetYValue",
];

function createHarness(runtimeOverrides = {}) {
  const nodes = buildNodes(REFERENCE_NODE_IDS);
  const dirtyReasons = [];
  const createdUrls = [];
  const revokedUrls = [];
  const runtimeState = {
    referenceImageUrl: null,
    referenceImageState: {
      opacity: 0.33,
      scale: 1.23,
      offsetX: 45,
      offsetY: -18,
    },
    ...runtimeOverrides,
  };
  const owner = createAppearanceReferenceOwner({
    runtimeState,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    markDirty: (reason) => dirtyReasons.push(reason),
    documentRef: createTestDocument(nodes),
    urlApi: {
      createObjectURL(file) {
        const url = `blob:test-${file.name}`;
        createdUrls.push(url);
        return url;
      },
      revokeObjectURL(url) {
        revokedUrls.push(url);
      },
    },
  });
  return { createdUrls, dirtyReasons, nodes, owner, revokedUrls, runtimeState };
}

test("reference owner normalizes imported reference state", () => {
  const normalized = normalizeReferenceImageState({
    opacity: 3,
    scale: 0.01,
    offsetX: 9999,
    offsetY: -9999,
  });

  assert.deepEqual(normalized, {
    opacity: 1,
    scale: 0.2,
    offsetX: 1000,
    offsetY: -1000,
  });
});

test("reference owner renders inputs and applies image style once per signature", () => {
  const harness = createHarness();

  harness.owner.renderReferenceOverlayUi();
  const firstSignature = harness.nodes.referenceImage.dataset.referenceStyleSignature;
  harness.owner.renderReferenceOverlayUi();

  assert.equal(harness.nodes.referenceOpacity.value, "33");
  assert.equal(harness.nodes.referenceOpacityValue.textContent, "33%");
  assert.equal(harness.nodes.referenceScale.value, "1.23");
  assert.equal(harness.nodes.referenceScaleValue.textContent, "1.23x");
  assert.equal(harness.nodes.referenceOffsetX.value, "45");
  assert.equal(harness.nodes.referenceOffsetXValue.textContent, "45px");
  assert.equal(harness.nodes.referenceOffsetY.value, "-18");
  assert.equal(harness.nodes.referenceOffsetYValue.textContent, "-18px");
  assert.equal(harness.nodes.referenceImage.style.opacity, "0.33");
  assert.equal(harness.nodes.referenceImage.style.transform, "translate(45px, -18px) scale(1.23)");
  assert.equal(firstSignature, getReferenceStyleSignature(harness.runtimeState.referenceImageState));
  assert.equal(harness.nodes.referenceImage.dataset.referenceStyleSignature, firstSignature);
});

test("reference owner binds range inputs once and preserves dirty reasons", () => {
  const harness = createHarness();

  harness.nodes.referenceOpacity.value = "60";
  harness.nodes.referenceScale.value = "1.00";
  harness.nodes.referenceOffsetX.value = "0";
  harness.nodes.referenceOffsetY.value = "0";
  harness.owner.bindEvents();
  harness.owner.bindEvents();
  harness.nodes.referenceOpacity.value = "80";
  harness.nodes.referenceOpacity.dispatch("input");
  harness.nodes.referenceScale.value = "2.00";
  harness.nodes.referenceScale.dispatch("input");
  harness.nodes.referenceOffsetX.value = "12";
  harness.nodes.referenceOffsetX.dispatch("input");
  harness.nodes.referenceOffsetY.value = "-30";
  harness.nodes.referenceOffsetY.dispatch("input");

  assert.equal(harness.nodes.referenceOpacity.listeners.get("input").length, 1);
  assert.equal(harness.runtimeState.referenceImageState.opacity, 0.8);
  assert.equal(harness.runtimeState.referenceImageState.scale, 2);
  assert.equal(harness.runtimeState.referenceImageState.offsetX, 12);
  assert.equal(harness.runtimeState.referenceImageState.offsetY, -30);
  assert.equal(harness.nodes.referenceImage.style.transform, "translate(12px, -30px) scale(2)");
  assert.deepEqual(harness.dirtyReasons, [
    "reference-opacity",
    "reference-scale",
    "reference-offset-x",
    "reference-offset-y",
  ]);
});

test("reference owner replaces and clears object URLs", () => {
  const harness = createHarness({
    referenceImageUrl: "blob:old",
  });

  harness.owner.bindEvents();
  harness.nodes.referenceImageInput.files = [{ name: "first.png" }];
  harness.nodes.referenceImageInput.dispatch("change");
  harness.nodes.referenceImageInput.files = [{ name: "second.png" }];
  harness.nodes.referenceImageInput.dispatch("change");
  harness.nodes.referenceImageInput.files = [];
  harness.nodes.referenceImageInput.dispatch("change");

  assert.deepEqual(harness.createdUrls, ["blob:test-first.png", "blob:test-second.png"]);
  assert.deepEqual(harness.revokedUrls, ["blob:old", "blob:test-first.png", "blob:test-second.png"]);
  assert.equal(harness.runtimeState.referenceImageUrl, null);
  assert.equal(harness.nodes.referenceImage.src, "");
  assert.equal(harness.nodes.referenceImage.style.opacity, "0");
  assert.deepEqual(harness.dirtyReasons, [
    "reference-image-file",
    "reference-image-file",
    "reference-image-clear",
  ]);
});
