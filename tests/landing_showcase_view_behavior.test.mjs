import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
    this.style = {
      setProperty: (name, value) => {
        this.style[name] = String(value);
      },
    };
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

  focus() {
    this.focused = true;
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

class ShowcaseRoot extends TestNode {
  constructor(objectNode, tabs, panel) {
    super();
    this.objectNode = objectNode;
    this.tabs = tabs;
    this.panel = panel;
  }

  querySelector(selector) {
    if (selector === "[data-showcase-object]") return this.objectNode;
    if (selector === "[role=\"tabpanel\"]") return this.panel;
    return null;
  }

  querySelectorAll(selector) {
    if (selector === "[data-showcase-view-action]") return [];
    if (selector === "[data-showcase-layer-tab]") return this.tabs;
    return [];
  }
}

class PreviewRoot extends TestNode {
  constructor(surface, viewport, zoomButtons = []) {
    super();
    this.surface = surface;
    this.viewport = viewport;
    this.zoomButtons = zoomButtons;
  }

  querySelector(selector) {
    if (selector === "[data-preview-surface]") return this.surface;
    if (selector === "[data-preview-viewport]") return this.viewport;
    return null;
  }

  querySelectorAll(selector) {
    if (selector === "[data-preview-zoom]") return this.zoomButtons;
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

function createPreviewHarness() {
  const surface = new TestNode();
  const viewport = new TestNode();
  const root = new PreviewRoot(surface, viewport);
  const domContentLoaded = [];
  surface.setPointerCapture = () => {};
  surface.releasePointerCapture = () => {};

  const document = {
    documentElement: { lang: "en", dataset: {} },
    title: "",
    addEventListener(name, callback) {
      if (name === "DOMContentLoaded") domContentLoaded.push(callback);
    },
    querySelector(selector) {
      if (selector === "[data-preview-root]") return root;
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
    root,
    surface,
    viewport,
  };
}

function createShowcaseHarness({ reducedMotion = true } = {}) {
  const viewport = new TestNode();
  const svg = new TestNode();
  const objectNode = new TestNode();
  const panel = new TestNode();
  const tabs = ["political", "rail", "cities", "day-night"].map((layer, index) => {
    const tab = new TestNode();
    tab.id = `showcase-layer-${layer}`;
    tab.setAttribute("data-showcase-layer-tab", layer);
    tab.setAttribute("aria-selected", index === 0 ? "true" : "false");
    return tab;
  });
  const root = new ShowcaseRoot(objectNode, tabs, panel);
  const domContentLoaded = [];
  svg.animationCalls = [];
  svg.pauseAnimations = () => svg.animationCalls.push("pause");
  svg.unpauseAnimations = () => svg.animationCalls.push("unpause");

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
      matchMedia: () => ({ matches: reducedMotion }),
    },
    domContentLoaded,
    objectNode,
    panel,
    root,
    svg,
    tabs,
    viewport,
  };
}

test("landing local asset references exist", () => {
  const html = readFileSync(new URL("../landing/index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("../landing/app.js", import.meta.url), "utf8");
  const referencedAssets = new Set();
  const assetPattern = /\.\/assets\/[^"')\s]+/g;

  for (const source of [html, app]) {
    for (const match of source.matchAll(assetPattern)) {
      referencedAssets.add(match[0]);
    }
  }

  assert.ok(referencedAssets.size > 0, "expected landing page to reference local assets");
  for (const assetPath of referencedAssets) {
    const assetUrl = new URL(`../landing/${assetPath.slice(2)}`, import.meta.url);
    assert.ok(existsSync(assetUrl), `missing landing asset referenced by HTML/JS: ${assetPath}`);
  }
});

test("landing showcase SVG keeps interactive layer groups after optimization", () => {
  const svg = readFileSync(new URL("../landing/assets/europe-1936-showcase.svg", import.meta.url), "utf8");
  const decodedSvg = svg
    .replaceAll("&quot;", "\"")
    .replaceAll("&gt;", ">");
  for (const required of [
    'class="layer layer-rail"',
    'class="layer layer-cities"',
    'class="layer layer-day-night"',
    'svg[data-active-layer="rail"] .layer-rail',
    'svg[data-active-layer="cities"] .layer-cities',
    'svg[data-active-layer="day-night"] .layer-day-night',
    'class="day-night-shade"',
    '.map-edge-fog > * { filter: url(#softEdgeBlur); pointer-events: none; }',
  ]) {
    assert.ok(decodedSvg.includes(required), `missing showcase SVG contract: ${required}`);
  }
  assert.equal((decodedSvg.match(/<animateTransform\b/g) || []).length, 2);
  assert.equal((decodedSvg.match(/dur="24s"/g) || []).length, 2);
  assert.equal((decodedSvg.match(/repeatCount="indefinite"/g) || []).length, 2);
});

test("landing showcase layer tabs pause and resume embedded SVG animation", () => {
  const source = readFileSync(new URL("../landing/app.js", import.meta.url), "utf8");
  const harness = createShowcaseHarness({ reducedMotion: false });
  vm.createContext(harness.context);
  vm.runInContext(source, harness.context);
  harness.domContentLoaded[0]();

  assert.equal(harness.svg.attributes["data-active-layer"], "political");
  assert.equal(harness.svg.attributes["data-showcase-animation"], "paused");
  assert.equal(harness.svg.animationCalls.at(-1), "pause");

  harness.tabs.find((tab) => tab.getAttribute("data-showcase-layer-tab") === "day-night").dispatchEvent("click");
  assert.equal(harness.root.dataset.showcaseLayer, "day-night");
  assert.equal(harness.svg.attributes["data-active-layer"], "day-night");
  assert.equal(harness.svg.attributes["data-showcase-animation"], "running");
  assert.equal(harness.svg.animationCalls.at(-1), "unpause");

  harness.tabs.find((tab) => tab.getAttribute("data-showcase-layer-tab") === "rail").dispatchEvent("click");
  assert.equal(harness.root.dataset.showcaseLayer, "rail");
  assert.equal(harness.svg.attributes["data-showcase-animation"], "paused");
  assert.equal(harness.svg.animationCalls.at(-1), "pause");
});

test("landing showcase day-night layer respects reduced motion", () => {
  const source = readFileSync(new URL("../landing/app.js", import.meta.url), "utf8");
  const harness = createShowcaseHarness({ reducedMotion: true });
  vm.createContext(harness.context);
  vm.runInContext(source, harness.context);
  harness.domContentLoaded[0]();

  harness.tabs.find((tab) => tab.getAttribute("data-showcase-layer-tab") === "day-night").dispatchEvent("click");
  assert.equal(harness.root.dataset.showcaseLayer, "day-night");
  assert.equal(harness.svg.attributes["data-active-layer"], "day-night");
  assert.equal(harness.svg.attributes["data-showcase-animation"], "paused");
  assert.equal(harness.svg.animationCalls.at(-1), "pause");
});

test("landing showcase view uses modified wheel zoom, keyboard zoom, and drag without bottom controls", () => {
  const source = readFileSync(new URL("../landing/app.js", import.meta.url), "utf8");
  const harness = createShowcaseHarness();
  vm.createContext(harness.context);
  vm.runInContext(source, harness.context);

  assert.equal(harness.root.querySelectorAll("[data-showcase-view-action]").length, 0);
  assert.equal(harness.domContentLoaded.length, 1);
  harness.domContentLoaded[0]();

  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "1");
  assert.equal(harness.root.dataset.showcaseViewZoomed, "false");
  assert.equal(harness.root.dataset.showcaseCityDetail, "base");
  assert.equal(harness.svg.attributes["data-showcase-city-detail"], "base");
  assert.equal(harness.viewport.attributes.transform, "matrix(1.16 0 0 1.16 -78.4 -49.6)");

  const plainWheelEvent = createEvent({ deltaY: -120 });
  harness.svg.dispatchEvent("wheel", plainWheelEvent);
  assert.equal(plainWheelEvent.defaultPrevented, false);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "1");

  const wheelEvent = createEvent({ ctrlKey: true, deltaY: -120 });
  harness.svg.dispatchEvent("wheel", wheelEvent);
  assert.equal(wheelEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "2");
  assert.equal(harness.root.dataset.showcaseViewZoomed, "true");
  assert.equal(harness.root.dataset.showcaseCityDetail, "expanded");
  assert.equal(harness.svg.attributes["data-showcase-city-detail"], "expanded");
  assert.match(harness.viewport.attributes.transform, /^matrix\(1\.34 0 0 1\.34 /);

  const zoomedWheelEvent = createEvent({ ctrlKey: true, deltaY: 120 });
  harness.svg.dispatchEvent("wheel", zoomedWheelEvent);
  assert.equal(zoomedWheelEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "1");

  harness.svg.dispatchEvent("dblclick", createEvent());
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "2");

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
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "1");
  assert.equal(harness.root.dataset.showcaseViewZoomed, "false");
  assert.equal(harness.viewport.attributes.transform, "matrix(1.16 0 0 1.16 -78.4 -49.6)");

  const keyboardZoomEvent = createEvent({ key: "+" });
  harness.objectNode.dispatchEvent("keydown", keyboardZoomEvent);
  assert.equal(keyboardZoomEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "2");

  for (let index = 0; index < 6; index += 1) {
    harness.objectNode.dispatchEvent("keydown", createEvent({ key: "+" }));
  }
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "4");
  assert.equal(harness.root.dataset.showcaseViewScale, "1.80");
  assert.equal(harness.root.dataset.showcaseCityDetail, "dense");
  assert.equal(harness.svg.attributes["data-showcase-city-detail"], "dense");

  const keyboardResetEvent = createEvent({ key: "Escape" });
  harness.objectNode.dispatchEvent("keydown", keyboardResetEvent);
  assert.equal(keyboardResetEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.showcaseViewScaleIndex, "1");
  assert.equal(harness.root.dataset.showcaseCityDetail, "base");
});

test("landing preview view keeps normal wheel scrolling and uses modified wheel zoom", () => {
  const source = readFileSync(new URL("../landing/app.js", import.meta.url), "utf8");
  const harness = createPreviewHarness();
  vm.createContext(harness.context);
  vm.runInContext(source, harness.context);

  assert.equal(harness.domContentLoaded.length, 1);
  harness.domContentLoaded[0]();

  assert.equal(harness.root.dataset.previewScaleIndex, "0");
  const plainWheelEvent = createEvent({ deltaY: -120 });
  harness.surface.dispatchEvent("wheel", plainWheelEvent);
  assert.equal(plainWheelEvent.defaultPrevented, false);
  assert.equal(harness.root.dataset.previewScaleIndex, "0");

  const modifiedWheelEvent = createEvent({ ctrlKey: true, deltaY: -120 });
  harness.surface.dispatchEvent("wheel", modifiedWheelEvent);
  assert.equal(modifiedWheelEvent.defaultPrevented, true);
  assert.equal(harness.root.dataset.previewScaleIndex, "1");
  assert.equal(harness.root.dataset.previewZoomed, "true");
});
