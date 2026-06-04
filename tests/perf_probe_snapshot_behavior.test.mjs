import test from "node:test";
import assert from "node:assert/strict";

import {
  clearRenderSamples,
  perfEnable,
  recordRenderSample,
  snapshot,
} from "../js/core/perf_probe.js";

test("snapshot metrics stay isolated from external nested mutations", () => {
  const originalBootMetrics = globalThis.__bootMetrics;
  const originalRenderPerfMetrics = globalThis.__renderPerfMetrics;
  const originalScenarioPerfMetrics = globalThis.__scenarioPerfMetrics;

  globalThis.__bootMetrics = {
    startup: {
      durationMs: 42,
      phases: {
        hydrate: 12,
      },
    },
  };
  globalThis.__renderPerfMetrics = {
    passA: {
      durationMs: 8,
      breakdown: {
        labels: 3,
      },
    },
  };
  globalThis.__scenarioPerfMetrics = {
    apply: {
      durationMs: 21,
      counters: {
        chunks: 4,
      },
    },
  };

  try {
    const firstSnapshot = snapshot();
    firstSnapshot.bootMetrics.startup.phases.hydrate = 999;
    firstSnapshot.renderPerfMetrics.passA.breakdown.labels = 777;
    firstSnapshot.scenarioPerfMetrics.apply.counters.chunks = 555;

    const secondSnapshot = snapshot();

    assert.equal(secondSnapshot.bootMetrics.startup.phases.hydrate, 12);
    assert.equal(secondSnapshot.renderPerfMetrics.passA.breakdown.labels, 3);
    assert.equal(secondSnapshot.scenarioPerfMetrics.apply.counters.chunks, 4);
  } finally {
    globalThis.__bootMetrics = originalBootMetrics;
    globalThis.__renderPerfMetrics = originalRenderPerfMetrics;
    globalThis.__scenarioPerfMetrics = originalScenarioPerfMetrics;
  }
});

test("snapshot returns safe empty metric objects when structuredClone is unavailable and globals are unset", () => {
  const originalStructuredClone = globalThis.structuredClone;
  const originalBootMetrics = globalThis.__bootMetrics;
  const originalRenderPerfMetrics = globalThis.__renderPerfMetrics;
  const originalScenarioPerfMetrics = globalThis.__scenarioPerfMetrics;

  globalThis.structuredClone = undefined;
  globalThis.__bootMetrics = undefined;
  globalThis.__renderPerfMetrics = undefined;
  globalThis.__scenarioPerfMetrics = undefined;

  try {
    const result = snapshot();
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.source, "mc_perf_probe");
    assert.deepEqual(result.bootMetrics, {});
    assert.deepEqual(result.renderPerfMetrics, {});
    assert.deepEqual(result.scenarioPerfMetrics, {});
  } finally {
    globalThis.structuredClone = originalStructuredClone;
    globalThis.__bootMetrics = originalBootMetrics;
    globalThis.__renderPerfMetrics = originalRenderPerfMetrics;
    globalThis.__scenarioPerfMetrics = originalScenarioPerfMetrics;
  }
});

test("snapshot preserves render-chain hot-path metric details as isolated copies", () => {
  const originalRenderPerfMetrics = globalThis.__renderPerfMetrics;

  globalThis.__renderPerfMetrics = {
    buildHitCanvas: {
      durationMs: 23,
      visibleItemCount: 15,
    },
    scenarioPoliticalBackgroundDeferredFullCacheBuild: {
      durationMs: 501,
      recoveryQuality: "progressive",
      phase: "idle",
      entryCount: 1200,
      builtPathCount: 1200,
    },
    settleExactRefreshPhaseBreakdown: {
      durationMs: 101,
      applyMs: 5,
      passesMs: 70,
      waitForPaintMs: 15,
      finalizeMs: 3,
      hitCanvasMs: 23,
      targetPasses: ["political", "borders"],
    },
  };

  try {
    const firstSnapshot = snapshot();
    firstSnapshot.renderPerfMetrics.settleExactRefreshPhaseBreakdown.targetPasses.push("labels");
    firstSnapshot.renderPerfMetrics.buildHitCanvas.visibleItemCount = 999;
    firstSnapshot.renderPerfMetrics.scenarioPoliticalBackgroundDeferredFullCacheBuild.builtPathCount = 1;

    const secondSnapshot = snapshot();

    assert.equal(secondSnapshot.renderPerfMetrics.buildHitCanvas.visibleItemCount, 15);
    assert.equal(
      secondSnapshot.renderPerfMetrics.scenarioPoliticalBackgroundDeferredFullCacheBuild.builtPathCount,
      1200,
    );
    assert.equal(
      secondSnapshot.renderPerfMetrics.scenarioPoliticalBackgroundDeferredFullCacheBuild.recoveryQuality,
      "progressive",
    );
    assert.deepEqual(
      secondSnapshot.renderPerfMetrics.settleExactRefreshPhaseBreakdown.targetPasses,
      ["political", "borders"],
    );
  } finally {
    globalThis.__renderPerfMetrics = originalRenderPerfMetrics;
  }
});

test("snapshot render sample median uses the mean of the two middle values for even counts", () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalLocation = globalThis.location;
  const originalBootMetrics = globalThis.__bootMetrics;
  const originalRenderPerfMetrics = globalThis.__renderPerfMetrics;
  const originalScenarioPerfMetrics = globalThis.__scenarioPerfMetrics;

  globalThis.localStorage = {
    getItem(key) {
      return key === "mc_perf_enabled" ? "1" : null;
    },
    setItem() {},
    removeItem() {},
  };
  globalThis.location = { search: "?perf=1" };
  globalThis.__bootMetrics = undefined;
  globalThis.__renderPerfMetrics = undefined;
  globalThis.__scenarioPerfMetrics = undefined;

  try {
    perfEnable();
    clearRenderSamples();
    recordRenderSample(10);
    recordRenderSample(20);
    recordRenderSample(30);
    recordRenderSample(40);

    const result = snapshot();
    assert.equal(result.renderSamples.count, 4);
    assert.equal(result.renderSamples.medianMs, 25);
  } finally {
    clearRenderSamples();
    globalThis.localStorage = originalLocalStorage;
    globalThis.location = originalLocation;
    globalThis.__bootMetrics = originalBootMetrics;
    globalThis.__renderPerfMetrics = originalRenderPerfMetrics;
    globalThis.__scenarioPerfMetrics = originalScenarioPerfMetrics;
  }
});

test("render samples keep diagnostic details without changing duration median", () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalLocation = globalThis.location;
  const originalBootMetrics = globalThis.__bootMetrics;
  const originalRenderPerfMetrics = globalThis.__renderPerfMetrics;
  const originalScenarioPerfMetrics = globalThis.__scenarioPerfMetrics;

  globalThis.localStorage = {
    getItem(key) {
      return key === "mc_perf_enabled" ? "1" : null;
    },
    setItem() {},
    removeItem() {},
  };
  globalThis.location = { search: "?perf=1" };
  globalThis.__bootMetrics = undefined;
  globalThis.__renderPerfMetrics = undefined;
  globalThis.__scenarioPerfMetrics = undefined;

  try {
    perfEnable();
    clearRenderSamples();
    recordRenderSample(40, {
      hitCanvasMs: 7,
      contextScenarioMs: 9,
      politicalBgMs: 11,
      passKey: "frame-a",
    });
    recordRenderSample(20, {
      hitCanvasMs: 3,
      contextScenarioMs: 5,
      politicalBgMs: 13,
      passKey: "frame-b",
    });

    const firstSnapshot = snapshot();
    assert.equal(firstSnapshot.renderSamples.count, 2);
    assert.equal(firstSnapshot.renderSamples.medianMs, 30);
    assert.equal(firstSnapshot.renderSamples.samples[0].hitCanvasMs, 7);
    assert.equal(firstSnapshot.renderSamples.samples[0].contextScenarioMs, 9);
    assert.equal(firstSnapshot.renderSamples.samples[0].politicalBgMs, 11);
    assert.equal(firstSnapshot.renderSamples.samples[0].passKey, "frame-a");

    firstSnapshot.renderSamples.samples[0].hitCanvasMs = 999;
    firstSnapshot.renderSamples.samples[0].passKey = "mutated";
    const secondSnapshot = snapshot();

    assert.equal(secondSnapshot.renderSamples.samples[0].hitCanvasMs, 7);
    assert.equal(secondSnapshot.renderSamples.samples[0].passKey, "frame-a");
  } finally {
    clearRenderSamples();
    globalThis.localStorage = originalLocalStorage;
    globalThis.location = originalLocation;
    globalThis.__bootMetrics = originalBootMetrics;
    globalThis.__renderPerfMetrics = originalRenderPerfMetrics;
    globalThis.__scenarioPerfMetrics = originalScenarioPerfMetrics;
  }
});
