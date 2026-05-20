import assert from "node:assert/strict";
import test from "node:test";

import {
  TEXTURE_STYLE_PATHS,
  createAppearanceTextureOwner,
  formatUtcMinutes,
} from "../js/ui/toolbar/appearance_texture_owner.js";

class TestClassList {
  constructor(node) {
    this.node = node;
  }

  add(...tokens) {
    const values = new Set(String(this.node.className || "").split(/\s+/).filter(Boolean));
    tokens.forEach((token) => values.add(token));
    this.node.className = Array.from(values).join(" ");
  }

  remove(...tokens) {
    const removals = new Set(tokens);
    const values = String(this.node.className || "").split(/\s+/).filter((token) => token && !removals.has(token));
    this.node.className = values.join(" ");
  }

  contains(token) {
    return String(this.node.className || "").split(/\s+/).includes(token);
  }

  toggle(token, force) {
    const shouldEnable = force === undefined ? !this.contains(token) : !!force;
    if (shouldEnable) {
      this.add(token);
    } else {
      this.remove(token);
    }
    return shouldEnable;
  }
}

class TestElement {
  constructor() {
    this.attributes = new Map();
    this.checked = false;
    this.className = "";
    this.classList = new TestClassList(this);
    this.dataset = {};
    this.disabled = false;
    this.listeners = new Map();
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

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
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

function createHarness(ids, runtimeOverrides = {}) {
  const nodes = buildNodes(ids);
  const dirtyReasons = [];
  const historyEntries = [];
  let captureIndex = 0;
  const runtimeState = {
    styleConfig: {
      texture: {
        mode: "paper",
        opacity: 0.56,
        paper: { scale: 1.25 },
      },
      dayNight: {
        enabled: true,
        mode: "manual",
        manualUtcMinutes: 8 * 60 + 15,
        cityLightsEnabled: true,
        cityLightsStyle: "modern",
      },
    },
    syncDayNightClockTimerCount: 0,
    syncDayNightClockTimerFn() {
      this.syncDayNightClockTimerCount += 1;
    },
    ...runtimeOverrides,
  };
  const owner = createAppearanceTextureOwner({
    runtimeState,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    normalizeOceanFillColor: (value) => String(value || "").toLowerCase(),
    renderDirty: (reason) => dirtyReasons.push(reason),
    documentRef: createTestDocument(nodes),
    captureHistoryStateFn: ({ stylePaths }) => ({
      id: ++captureIndex,
      stylePaths,
    }),
    pushHistoryEntryFn: (entry) => historyEntries.push(entry),
  });
  return { dirtyReasons, historyEntries, nodes, owner, runtimeState };
}

test("formatUtcMinutes clamps and renders UTC labels", () => {
  assert.equal(formatUtcMinutes(-20), "00:00 UTC");
  assert.equal(formatUtcMinutes(24 * 60 + 20), "23:59 UTC");
  assert.equal(formatUtcMinutes(8 * 60 + 7), "08:07 UTC");
});

test("texture owner renders active mode panels and value labels", () => {
  const harness = createHarness([
    "textureSelect",
    "textureOpacity",
    "texturePaperControls",
    "texturePaperScale",
    "texturePaperScaleValue",
    "textureGraticuleControls",
    "textureDraftGridControls",
    "textureOpacityValue",
  ]);

  harness.owner.renderTextureUI();

  assert.equal(harness.nodes.textureSelect.value, "paper");
  assert.equal(harness.nodes.textureOpacity.value, "56");
  assert.equal(harness.nodes.textureOpacity.getAttribute("aria-disabled"), "false");
  assert.equal(harness.nodes.textureOpacityValue.textContent, "56%");
  assert.equal(harness.nodes.texturePaperScale.value, "125");
  assert.equal(harness.nodes.texturePaperScaleValue.textContent, "1.25x");
  assert.equal(harness.nodes.texturePaperControls.classList.contains("hidden"), false);
  assert.equal(harness.nodes.textureGraticuleControls.classList.contains("hidden"), true);
  assert.equal(harness.nodes.textureDraftGridControls.classList.contains("hidden"), true);
});

test("texture owner binds range inputs once and commits texture history on change", () => {
  const harness = createHarness([
    "texturePaperScale",
    "texturePaperScaleValue",
  ]);

  harness.owner.bindEvents();
  harness.owner.bindEvents();
  harness.nodes.texturePaperScale.value = "150";
  harness.nodes.texturePaperScale.dispatch("input");
  harness.nodes.texturePaperScale.dispatch("change");

  assert.equal(harness.nodes.texturePaperScale.listeners.get("input").length, 1);
  assert.equal(harness.nodes.texturePaperScale.listeners.get("change").length, 1);
  assert.equal(harness.runtimeState.styleConfig.texture.paper.scale, 1.5);
  assert.deepEqual(harness.dirtyReasons, ["texture-style", "texture-style"]);
  assert.equal(harness.historyEntries.length, 1);
  assert.equal(harness.historyEntries[0].kind, "texture-paper-scale");
  assert.deepEqual(harness.historyEntries[0].before.stylePaths, TEXTURE_STYLE_PATHS);
  assert.deepEqual(harness.historyEntries[0].after.stylePaths, TEXTURE_STYLE_PATHS);
});

test("day-night owner syncs mode controls and writes state from UI events", () => {
  const harness = createHarness([
    "dayNightEnabled",
    "dayNightModeManualBtn",
    "dayNightModeUtcBtn",
    "dayNightManualControls",
    "dayNightManualTime",
    "dayNightManualTimeValue",
    "dayNightUtcStatus",
    "dayNightCurrentTime",
  ]);

  harness.owner.renderDayNightUI();
  harness.owner.bindEvents();
  harness.nodes.dayNightModeUtcBtn.dispatch("click");
  harness.nodes.dayNightManualTime.value = "930";
  harness.nodes.dayNightManualTime.dispatch("input");

  assert.equal(harness.runtimeState.styleConfig.dayNight.mode, "utc");
  assert.equal(harness.runtimeState.styleConfig.dayNight.manualUtcMinutes, 930);
  assert.equal(harness.nodes.dayNightModeUtcBtn.getAttribute("aria-pressed"), "true");
  assert.equal(harness.nodes.dayNightModeManualBtn.getAttribute("aria-pressed"), "false");
  assert.equal(harness.nodes.dayNightManualControls.classList.contains("hidden"), true);
  assert.equal(harness.nodes.dayNightUtcStatus.classList.contains("hidden"), false);
  assert.equal(harness.nodes.dayNightManualTimeValue.textContent, "15:30 UTC");
  assert.equal(harness.runtimeState.syncDayNightClockTimerCount, 3);
  assert.deepEqual(harness.dirtyReasons, ["day-night-mode", "day-night-time"]);
});
