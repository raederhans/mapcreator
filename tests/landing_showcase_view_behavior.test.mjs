import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

class TestClassList {
  toggle() {}
  add() {}
}

class TestNode {
  constructor() {
    this.attributes = {};
    this.dataset = {};
    this.eventListeners = new Map();
    this.classList = new TestClassList();
    this.style = {};
    this.textContent = "";
  }

  addEventListener(name, callback) {
    const callbacks = this.eventListeners.get(name) || [];
    callbacks.push(callback);
    this.eventListeners.set(name, callbacks);
  }

  dispatchEvent(name, event = {}) {
    const callbacks = this.eventListeners.get(name) || [];
    event.currentTarget = this;
    callbacks.forEach((callback) => callback(event));
  }

  getAttribute(name) {
    return this.attributes[name] || "";
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

class ShowcaseRoot extends TestNode {
  constructor(objectNode) {
    super();
    this.objectNode = objectNode;
  }

  querySelector(selector) {
    if (selector === "[data-showcase-object]") return this.objectNode;
    return null;
  }

  querySelectorAll(selector) {
    if (selector === "[data-showcase-view-action]") return [];
    return [];
  }
}

function createEvent(overrides = {}) {
  return {
    defaultPrevented: false,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...overrides,
  };
}

function createShowcaseHarness() {
  const viewport = new TestNode();
  const svg = new TestNode();
  const objectNode = new TestNode();
  const root = new ShowcaseRoot(objectNode);
  const domContentLoaded = [];

  objectNode.contentDocument = {
    querySelector(selector) {
      if (selector === "svg") return svg;
      if (selector === "[data-showcase-viewport]") return viewport;
      return null;
    },
  };
  objectNode.setPointerCapture = () => {};
  objectNode.releasePointerCapture = () => {};
  svg.setPointerCapture = () => {};
  svg.releasePointerCapture = () => {};

  const document = {
    documentElement: { lang: "en", dataset: {} },
    title: "",
    addEventListener(name, callback) {
      if (name === "DOMContentLoaded") domContentLoaded.push(callback);
    },
    querySelector(selector) {
      if (selector === "[data-showcase-root]") return root;
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  return {
    context: {
      console,
      document,
      Intl,
      localStorage: {
        getItem: () => "en",
        setItem: () => {},
      },
      matchMedia: () => ({ matches: true }),
    },
    domContentLoaded,
    objectNode,
    root,
    svg,
    viewport,
  };
}

test("landing showcase view uses modified wheel zoom, keyboard zoom, and drag without bottom controls", () => {
  const source = readFileSync(new URL("../landing/app.js", import.meta.url), "utf8");
  const harness = createShowcaseHarness();
  vm.createContext(harness.context);
  vm.runInContext(source, harness.context);

  assert.equal(harness.root.querySelectorAll("[data-showcase-view-action]").length, 0);
  assert.equal(harness.domContentLoaded.length, 1);
  harness.domContentLoaded[0]();

  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "0");
  assert.equal(harness.viewport.attributes.transform, "matrix(1 0 0 1 0.0 0.0)");

  const plainWheelEvent = createEvent({ deltaY: -120 });
  harness.svg.dispatchEvent("wheel", plainWheelEvent);
  assert.equal(plainWheelEvent.defaultPrevented, false);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "0");

  const wheelEvent = createEvent({ ctrlKey: true, deltaY: -120 });
  harness.svg.dispatchEvent("wheel", wheelEvent);
  assert.equal(wheelEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "1");
  assert.equal(harness.root.dataset.showcaseViewZoomed, "true");
  assert.match(harness.viewport.attributes.transform, /^matrix\(1\.25 0 0 1\.25 /);

  const zoomedWheelEvent = createEvent({ ctrlKey: true, deltaY: 120 });
  harness.svg.dispatchEvent("wheel", zoomedWheelEvent);
  assert.equal(zoomedWheelEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "0");

  harness.svg.dispatchEvent("dblclick", createEvent());
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "1");

  const xBeforeDrag = harness.root.dataset.showcaseViewX;
  const yBeforeDrag = harness.root.dataset.showcaseViewY;
  harness.svg.dispatchEvent("pointerdown", createEvent({ clientX: 100, clientY: 100, pointerId: 7 }));
  harness.svg.dispatchEvent("pointermove", createEvent({ clientX: 70, clientY: 85, pointerId: 7 }));
  harness.svg.dispatchEvent("pointerup", createEvent({ pointerId: 7 }));
  assert.notEqual(harness.root.dataset.showcaseViewX, xBeforeDrag);
  assert.notEqual(harness.root.dataset.showcaseViewY, yBeforeDrag);

  const resetEvent = createEvent();
  harness.svg.dispatchEvent("dblclick", resetEvent);
  assert.equal(resetEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "0");
  assert.equal(harness.root.dataset.showcaseViewZoomed, "false");
  assert.equal(harness.viewport.attributes.transform, "matrix(1 0 0 1 0.0 0.0)");

  const keyboardZoomEvent = createEvent({ key: "+" });
  harness.objectNode.dispatchEvent("keydown", keyboardZoomEvent);
  assert.equal(keyboardZoomEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "1");

  const keyboardResetEvent = createEvent({ key: "Escape" });
  harness.objectNode.dispatchEvent("keydown", keyboardResetEvent);
  assert.equal(keyboardResetEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "0");
});
