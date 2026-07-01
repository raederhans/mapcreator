import { importProjectTextThroughFunnel } from "./interaction_funnel.js";
import {
  loadSampleProjectText,
  SampleProjectLoadError,
} from "./sample_project_registry.js";
import { callRuntimeHook } from "./state/index.js";

function getNow() {
  return Date.now();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function resolvePreviousSampleState(currentState = {}, patch = {}) {
  if (String(patch.status || "") === "success") {
    return {
      previousSampleId: "",
      previousScenarioId: "",
      previousTitle: "",
    };
  }
  if (String(currentState?.status || "") === "success") {
    return {
      previousSampleId: normalizeText(currentState.sampleId),
      previousScenarioId: normalizeText(currentState.scenarioId),
      previousTitle: normalizeText(currentState.title),
    };
  }
  return {
    previousSampleId: normalizeText(currentState?.previousSampleId),
    previousScenarioId: normalizeText(currentState?.previousScenarioId),
    previousTitle: normalizeText(currentState?.previousTitle),
  };
}

export function writeSampleProjectState(targetState, patch = {}) {
  if (!targetState || typeof targetState !== "object") {
    return null;
  }
  const currentState = targetState?.sampleProjectDeeplink && typeof targetState.sampleProjectDeeplink === "object"
    ? targetState.sampleProjectDeeplink
    : {};
  targetState.sampleProjectDeeplink = {
    ...currentState,
    ...resolvePreviousSampleState(currentState, patch),
    ...patch,
    updatedAt: getNow(),
  };
  callRuntimeHook(targetState, "refreshSampleProjectBannerFn", targetState.sampleProjectDeeplink);
  return targetState.sampleProjectDeeplink;
}

export function resolveSampleProjectError(error) {
  if (error instanceof SampleProjectLoadError) {
    return error;
  }
  return new SampleProjectLoadError(
    "sample-project-load-failed",
    String(error?.message || error || "Sample project could not be opened."),
    { userMessage: "The selected sample project could not be opened." },
  );
}

function translateSampleUiText(value, helpers = {}) {
  const translate = typeof helpers.t === "function"
    ? helpers.t
    : (typeof helpers.ui?.t === "function" ? helpers.ui.t : null);
  return typeof translate === "function"
    ? translate(String(value || ""), "ui")
    : String(value || "");
}

export function showSampleProjectError(error, helpers = {}) {
  const resolvedError = resolveSampleProjectError(error);
  if (typeof helpers.showToast === "function") {
    helpers.showToast(
      translateSampleUiText(resolvedError.userMessage, helpers),
      {
        title: translateSampleUiText(resolvedError.toastTitle, helpers),
        tone: resolvedError.toastTone,
        duration: 4200,
      },
    );
  }
  return resolvedError;
}

export async function loadPublicSampleProjectIntoRuntime(sampleId, {
  targetState,
  helpers = {},
} = {}) {
  const requestedSampleId = normalizeText(sampleId).toLowerCase();
  try {
    writeSampleProjectState(targetState, {
      status: "loading",
      sampleId: requestedSampleId,
      errorCode: "",
      errorMessage: "",
    });
    const { sampleProject, text } = await loadSampleProjectText(requestedSampleId, {
      fetchImpl: helpers.fetchImpl,
      manifestUrl: helpers.manifestUrl,
      projectBaseUrl: helpers.projectBaseUrl,
    });
    writeSampleProjectState(targetState, {
      status: "importing",
      sampleId: sampleProject.id,
      scenarioId: sampleProject.scenarioId,
      projectUrl: sampleProject.projectUrl,
      appProjectUrl: sampleProject.appProjectUrl,
      fileName: sampleProject.fileName,
      title: sampleProject.title,
      manifestVersion: sampleProject.manifestVersion,
      recipe: sampleProject.recipe,
    });

    const imported = await importProjectTextThroughFunnel(text, {
      fileName: sampleProject.fileName,
      ui: helpers.ui,
      hooks: helpers.hooks,
      importOptions: {
        successTitle: "Sample opened",
        successMessage: "Sample project loaded in the editor.",
        ...(helpers.importOptions && typeof helpers.importOptions === "object" ? helpers.importOptions : {}),
      },
    });
    if (!imported) {
      writeSampleProjectState(targetState, {
        status: "error",
        sampleId: sampleProject.id,
        scenarioId: sampleProject.scenarioId,
        projectUrl: sampleProject.projectUrl,
        appProjectUrl: sampleProject.appProjectUrl,
        fileName: sampleProject.fileName,
        title: sampleProject.title,
        errorCode: "sample-project-import-failed",
        errorMessage: `Sample project import failed: ${sampleProject.id}`,
      });
      return { ok: false, sampleProject, errorCode: "sample-project-import-failed" };
    }
    writeSampleProjectState(targetState, {
      status: "success",
      sampleId: sampleProject.id,
      scenarioId: sampleProject.scenarioId,
      projectUrl: sampleProject.projectUrl,
      appProjectUrl: sampleProject.appProjectUrl,
      fileName: sampleProject.fileName,
      title: sampleProject.title,
      manifestVersion: sampleProject.manifestVersion,
      recipe: sampleProject.recipe,
      completedAt: getNow(),
    });
    return { ok: true, sampleProject };
  } catch (error) {
    const resolvedError = showSampleProjectError(error, helpers);
    writeSampleProjectState(targetState, {
      status: "error",
      sampleId: requestedSampleId,
      errorCode: resolvedError.code,
      errorMessage: resolvedError.message,
    });
    return { ok: false, error: resolvedError };
  }
}
