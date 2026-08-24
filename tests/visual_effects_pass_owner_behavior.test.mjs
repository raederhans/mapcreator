import assert from "node:assert/strict";
import test from "node:test";

import { createVisualEffectsPassOwner } from "../js/core/renderer/visual_effects_pass_owner.js";

function createHarness({
  textureMode = "paper",
  bootReady = true,
  hgoReady = false,
} = {}) {
  const events = [];
  const texture = { mode: textureMode };
  const owner = createVisualEffectsPassOwner({
    getters: {
      getTextureStyleConfig: () => {
        events.push("get-texture");
        return texture;
      },
      isBootInteractionReady: () => {
        events.push("boot-ready");
        return bootReady;
      },
      isHgoRuntimePreviewReady: () => {
        events.push("hgo-ready");
        return hgoReady;
      },
    },
    helpers: {
      normalizeTextureMode: (mode) => {
        events.push(`normalize:${String(mode)}`);
        return String(mode || "none").trim().toLowerCase();
      },
    },
    effects: {
      drawOldPaperTexture: (k, options) => events.push(["paper", k, options]),
      drawGraticuleTextureLines: (k, options) => events.push(["graticule-lines", k, options]),
      drawDraftGridTexture: (k, options) => events.push(["draft-grid", k, options]),
      drawGraticuleTextureLabels: (k) => events.push(["graticule-labels", k]),
      drawDayNightRuntimePass: (k, options) => events.push(["day-night-runtime", k, options]),
      recordRenderPerfMetric: (...args) => events.push(["metric", ...args]),
    },
  });
  return { events, owner, texture };
}

test("factory validates every dependency and freezes the public API", () => {
  const dependencyNames = {
    getters: [
      "getTextureStyleConfig",
      "isBootInteractionReady",
      "isHgoRuntimePreviewReady",
    ],
    helpers: ["normalizeTextureMode"],
    effects: [
      "drawOldPaperTexture",
      "drawGraticuleTextureLines",
      "drawDraftGridTexture",
      "drawGraticuleTextureLabels",
      "drawDayNightRuntimePass",
      "recordRenderPerfMetric",
    ],
  };
  for (const [groupName, names] of Object.entries(dependencyNames)) {
    for (const missingName of names) {
      const dependencies = Object.fromEntries(
        Object.entries(dependencyNames).map(([name, groupNames]) => [
          name,
          Object.fromEntries(groupNames.map((dependencyName) => [dependencyName, () => {}])),
        ]),
      );
      delete dependencies[groupName][missingName];
      assert.throws(
        () => createVisualEffectsPassOwner(dependencies),
        new RegExp(`${groupName}\\.${missingName} must be a function`),
      );
    }
  }
  const { owner } = createHarness();
  assert.equal(Object.isFrozen(owner), true);
  assert.deepEqual(Object.keys(owner), [
    "drawEffectsPass",
    "drawLineEffectsPass",
    "drawTextureLabelEffectsPass",
    "drawDayNightPass",
  ]);
});

test("paper effects preserve normalization, readiness, and delegate order", () => {
  const { events, owner } = createHarness();
  assert.equal(owner.drawEffectsPass(3, { interactive: true }), undefined);
  assert.deepEqual(events, [
    "get-texture",
    "normalize:paper",
    "boot-ready",
    ["paper", 3, { interactive: true }],
  ]);

  const skippedByMode = createHarness({ textureMode: "graticule" });
  skippedByMode.owner.drawEffectsPass(2);
  assert.deepEqual(skippedByMode.events, ["get-texture", "normalize:graticule"]);

  const skippedByBoot = createHarness({ bootReady: false });
  skippedByBoot.owner.drawEffectsPass(2);
  assert.deepEqual(skippedByBoot.events, ["get-texture", "normalize:paper", "boot-ready"]);
});

test("line effects preserve raw mode normalization and exact branch delegates", () => {
  const graticule = createHarness({ textureMode: "  GRATicule " });
  graticule.owner.drawLineEffectsPass(4, { interactive: true });
  assert.deepEqual(graticule.events, [
    "get-texture",
    "boot-ready",
    ["graticule-lines", 4, { interactive: true }],
  ]);

  const draftGrid = createHarness({ textureMode: "draft_grid" });
  draftGrid.owner.drawLineEffectsPass(5);
  assert.deepEqual(draftGrid.events, [
    "get-texture",
    "boot-ready",
    ["draft-grid", 5, { interactive: false }],
  ]);

  const unknown = createHarness({ textureMode: "none" });
  unknown.owner.drawLineEffectsPass(6);
  assert.deepEqual(unknown.events, ["get-texture", "boot-ready"]);

  const skippedByBoot = createHarness({ textureMode: "graticule", bootReady: false });
  skippedByBoot.owner.drawLineEffectsPass(7);
  assert.deepEqual(skippedByBoot.events, ["get-texture", "boot-ready"]);
});

test("texture labels keep the HGO metric before style access", () => {
  const { events, owner } = createHarness({ hgoReady: true });
  owner.drawTextureLabelEffectsPass(8);
  assert.deepEqual(events, [
    "hgo-ready",
    ["metric", "drawTextureLabelEffectsPass", 0, {
      skipped: true,
      reason: "hgo-runtime-preview",
    }],
  ]);
});

test("texture labels preserve graticule and readiness branches", () => {
  const graticule = createHarness({ textureMode: "graticule" });
  graticule.owner.drawTextureLabelEffectsPass(9);
  assert.deepEqual(graticule.events, [
    "hgo-ready",
    "get-texture",
    "boot-ready",
    ["graticule-labels", 9],
  ]);

  const skippedByBoot = createHarness({ textureMode: "graticule", bootReady: false });
  skippedByBoot.owner.drawTextureLabelEffectsPass(10);
  assert.deepEqual(skippedByBoot.events, ["hgo-ready", "get-texture", "boot-ready"]);

  const skippedByMode = createHarness({ textureMode: "paper" });
  skippedByMode.owner.drawTextureLabelEffectsPass(11);
  assert.deepEqual(skippedByMode.events, ["hgo-ready", "get-texture", "boot-ready"]);
});

test("day-night pass preserves the visual-effects facade and runtime-owner delegation", () => {
  const { events, owner } = createHarness();
  owner.drawDayNightPass(12, { interactive: true });
  assert.deepEqual(events, [["day-night-runtime", 12, { interactive: true }]]);
});

test("null options throw before any getter or effect while omitted options keep defaults", () => {
  for (const methodName of ["drawEffectsPass", "drawLineEffectsPass", "drawDayNightPass"]) {
    const harness = createHarness();
    assert.throws(() => harness.owner[methodName](1, null), TypeError);
    assert.deepEqual(harness.events, []);
  }

  const effects = createHarness();
  effects.owner.drawEffectsPass(1);
  assert.deepEqual(effects.events.at(-1), ["paper", 1, { interactive: false }]);
});
