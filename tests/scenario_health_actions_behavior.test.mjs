import test from "node:test";
import assert from "node:assert/strict";

import {
  captureScenarioHealthState,
  restoreScenarioDataHealthState,
  restoreScenarioHydrationHealthGateState,
  setScenarioDataHealthState,
  setScenarioHydrationHealthGateState,
} from "../js/core/state/actions/scenario_health_actions.js";
import {
  captureActiveScenarioPerformanceHintsState,
  setActiveScenarioPerformanceHintsState,
} from "../js/core/state/actions/scenario_presentation_actions.js";
import {
  normalizeScenarioDataHealthState,
  normalizeScenarioHydrationHealthGateState,
} from "../js/core/state/scenario_runtime_state.js";
import {
  createScenarioDisplayRestoreRuntime,
} from "../js/core/scenario/presentation_display_restore.js";
import {
  STATE_BUS_EVENTS,
  off,
  subscribeStateBusEvent,
} from "../js/core/state/index.js";

test("scenario health actions normalize writes through the runtime-state read contract", () => {
  const target = {};
  const generatedColorTags = ["AA"];

  const gate = setScenarioHydrationHealthGateState(target, normalizeScenarioHydrationHealthGateState({
    status: "",
    checkedAt: 42,
    attemptedRetry: 1,
    ownerFeatureOverlapRatio: "0.5",
    ownerFeatureOverlapCount: "4",
    ownerFeatureRenderedCount: "8",
    degradedWaterOverlay: 1,
  }));
  const health = setScenarioDataHealthState(target, normalizeScenarioDataHealthState({
    expectedFeatureCount: "10",
    runtimeFeatureCount: "8",
    ratio: "0.8",
    minRatio: "0.75",
    generatedColorTags,
    warning: 42,
    severity: "warning",
  }, 0.7));

  assert.equal(gate, target.scenarioHydrationHealthGate);
  assert.equal(gate.status, "idle");
  assert.equal(gate.checkedAt, 42);
  assert.equal(gate.attemptedRetry, true);
  assert.equal(gate.ownerFeatureOverlapRatio, 0.5);
  assert.equal(gate.ownerFeatureOverlapCount, 4);
  assert.equal(gate.ownerFeatureRenderedCount, 8);
  assert.equal(gate.degradedWaterOverlay, true);
  assert.equal(health, target.scenarioDataHealth);
  assert.deepEqual(health, {
    expectedFeatureCount: 10,
    runtimeFeatureCount: 8,
    ratio: 0.8,
    minRatio: 0.75,
    generatedColorTags: ["AA"],
    warning: "42",
    severity: "warning",
  });
  assert.notEqual(health.generatedColorTags, generatedColorTags);
});

test("scenario health rollback actions restore exact captured values", () => {
  const target = {};
  const gate = Object.freeze({ status: "captured", checkedAt: 17 });
  const health = Object.freeze({ expectedFeatureCount: 12, custom: true });

  assert.equal(restoreScenarioHydrationHealthGateState(target, gate), gate);
  assert.equal(restoreScenarioDataHealthState(target, health), health);
  assert.equal(target.scenarioHydrationHealthGate, gate);
  assert.equal(target.scenarioDataHealth, health);
});

test("scenario health and performance read models capture exact rollback values", () => {
  const gate = Object.freeze({ status: "captured" });
  const health = Object.freeze({ severity: "warning" });
  const hints = Object.freeze({ renderProfileDefault: "performance" });
  const target = {
    scenarioHydrationHealthGate: gate,
    scenarioDataHealth: health,
    activeScenarioPerformanceHints: hints,
  };

  const healthSnapshot = captureScenarioHealthState(target);
  const hintSnapshot = captureActiveScenarioPerformanceHintsState(target);
  assert.equal(Object.isFrozen(healthSnapshot), true);
  assert.equal(Object.isFrozen(hintSnapshot), true);
  assert.equal(Object.isFrozen(healthSnapshot.values), true);
  assert.equal(Object.isFrozen(hintSnapshot.values), true);
  assert.equal(healthSnapshot.values.scenarioHydrationHealthGate, gate);
  assert.equal(healthSnapshot.values.scenarioDataHealth, health);
  assert.equal(hintSnapshot.values.activeScenarioPerformanceHints, hints);
});

test("presentation hint action publishes the exact value", () => {
  const target = {};
  const hints = Object.freeze({ renderProfileDefault: "performance" });

  assert.equal(setActiveScenarioPerformanceHintsState(target, hints), hints);
  assert.equal(target.activeScenarioPerformanceHints, hints);
  assert.equal(setActiveScenarioPerformanceHintsState(target, null), null);
  assert.equal(target.activeScenarioPerformanceHints, null);
});

test("scenario health and presentation actions reject invalid targets before mutation", () => {
  for (const target of [null, [], "state"]) {
    assert.throws(
      () => captureScenarioHealthState(target),
      /target must be an object/,
    );
    assert.throws(
      () => setScenarioHydrationHealthGateState(target, {}),
      /target must be an object/,
    );
    assert.throws(
      () => restoreScenarioHydrationHealthGateState(target, {}),
      /target must be an object/,
    );
    assert.throws(
      () => setScenarioDataHealthState(target, {}),
      /target must be an object/,
    );
    assert.throws(
      () => restoreScenarioDataHealthState(target, {}),
      /target must be an object/,
    );
    assert.throws(
      () => captureActiveScenarioPerformanceHintsState(target),
      /target must be an object/,
    );
    assert.throws(
      () => setActiveScenarioPerformanceHintsState(target, null),
      /target must be an object/,
    );
  }
});

test("performance hints are committed before the five presentation UI events", () => {
  const targetState = {
    activeScenarioId: "",
    scenarioDisplaySettingsBeforeActivate: null,
    activeScenarioPerformanceHints: null,
    renderProfile: "auto",
    dynamicBordersEnabled: true,
    parentBordersVisible: true,
    showWaterRegions: true,
    showScenarioSpecialRegions: true,
    showScenarioAtlantropa: true,
    showScenarioReliefOverlays: true,
    showStrategicResourceMarkers: false,
    strategicChoroplethMetric: "",
  };
  const events = [
    STATE_BUS_EVENTS.UPDATE_WATER_INTERACTION,
    STATE_BUS_EVENTS.UPDATE_SCENARIO_SPECIAL_REGION,
    STATE_BUS_EVENTS.UPDATE_SCENARIO_RELIEF_OVERLAY,
    STATE_BUS_EVENTS.UPDATE_DYNAMIC_BORDER_STATUS,
    STATE_BUS_EVENTS.UPDATE_TOOLBAR_INPUTS,
  ];
  const observed = [];
  const listeners = events.map((eventName) => {
    const listener = subscribeStateBusEvent(eventName, () => {
      observed.push([eventName, targetState.activeScenarioPerformanceHints]);
    });
    return [eventName, listener];
  });
  try {
    const runtime = createScenarioDisplayRestoreRuntime({ state: targetState });
    runtime.applyScenarioPerformanceHints({
      performance_hints: { render_profile_default: "performance" },
    });
    assert.deepEqual(observed.map(([eventName]) => eventName), events);
    assert.equal(
      observed.every(([, hints]) => hints === targetState.activeScenarioPerformanceHints),
      true,
    );
    assert.notEqual(targetState.activeScenarioPerformanceHints, null);

    observed.length = 0;
    runtime.restoreScenarioDisplaySettingsAfterExit();
    assert.deepEqual(observed.map(([eventName]) => eventName), events);
    assert.equal(observed.every(([, hints]) => hints === null), true);
  } finally {
    listeners.forEach(([eventName, listener]) => off(eventName, listener));
  }
});
