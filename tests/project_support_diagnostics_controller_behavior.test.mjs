import test from "node:test";
import assert from "node:assert/strict";

import { state } from "../js/core/state.js";
import { registerRuntimeHook } from "../js/core/state/index.js";
import { markDirty, clearDirty } from "../js/core/dirty_state.js";
import { createProjectSupportDiagnosticsController } from "../js/ui/sidebar/project_support_diagnostics_controller.js";

function createStatusNode() {
  return {
    textContent: "",
  };
}

function createDirtyIndicator() {
  return {
    classList: {
      toggle() {},
    },
    setAttribute() {},
  };
}

function createController(projectSaveStatus) {
  return createProjectSupportDiagnosticsController({
    state,
    elements: {
      projectSaveStatus,
    },
    helpers: {
      t: (value) => value,
      createEmptyNote: () => null,
      resolveAuditNumber: (value) => Number(value || 0),
      incrementSidebarCounter: () => {},
      loadScenarioAuditPayload: async () => null,
      releaseScenarioAuditPayload: () => {},
      legendManager: {
        getSpecialZoneLayers: () => [],
        getSpecialZoneSignature: () => "",
        getSignature: () => "",
        getLabels: () => ({}),
      },
      mapRenderer: {},
      fileManager: {},
      showAppDialog: async () => true,
      showToast: () => {},
      importProjectThroughFunnel: () => false,
      invalidateFrontlineOverlayState: () => {},
    },
  });
}

test("project save status refreshes when dirty state changes", () => {
  const previousDocument = globalThis.document;
  const previousDirty = state.isDirty;
  const previousLastDirtyReason = state.lastDirtyReason;
  const projectSaveStatus = createStatusNode();
  const controller = createController(projectSaveStatus);

  globalThis.document = {
    getElementById: (id) => (id === "appDirtyIndicator" ? createDirtyIndicator() : null),
  };

  try {
    state.isDirty = false;
    state.lastDirtyReason = "";
    registerRuntimeHook(state, "updateProjectSaveStatusFn", controller.refreshProjectSaveStatus);
    controller.bindEvents();

    assert.equal(projectSaveStatus.textContent, "Project export includes appearance and transport settings.");

    markDirty("transport-workbench-config");
    assert.match(projectSaveStatus.textContent, /Unsaved project changes/);

    clearDirty("project-export");
    assert.equal(projectSaveStatus.textContent, "Project exported. Appearance and transport settings are saved in the JSON file.");
  } finally {
    registerRuntimeHook(state, "updateProjectSaveStatusFn", null);
    state.isDirty = previousDirty;
    state.lastDirtyReason = previousLastDirtyReason;
    globalThis.document = previousDocument;
  }
});
