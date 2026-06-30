import { importProjectTextThroughFunnel } from "../core/interaction_funnel.js";
import {
  getSampleProjectIdFromUrl,
  loadSampleProjectText,
  SampleProjectLoadError,
} from "../core/sample_project_registry.js";

export const STARTUP_SAMPLE_PROJECT_TASK_KEY = "startup-sample-project-import";

function getNow() {
  return Date.now();
}

function writeSampleProjectState(targetState, patch = {}) {
  targetState.sampleProjectDeeplink = {
    ...(targetState.sampleProjectDeeplink && typeof targetState.sampleProjectDeeplink === "object"
      ? targetState.sampleProjectDeeplink
      : {}),
    ...patch,
    updatedAt: getNow(),
  };
  return targetState.sampleProjectDeeplink;
}

function resolveSampleError(error) {
  if (error instanceof SampleProjectLoadError) {
    return error;
  }
  return new SampleProjectLoadError(
    "sample-project-load-failed",
    String(error?.message || error || "Sample project could not be opened."),
    { userMessage: "The selected sample project could not be opened." },
  );
}

function showSampleProjectError(error, helpers = {}) {
  const resolvedError = resolveSampleError(error);
  if (typeof helpers.showToast === "function") {
    helpers.showToast(
      resolvedError.userMessage,
      {
        title: resolvedError.toastTitle,
        tone: resolvedError.toastTone,
        duration: 4200,
      },
    );
  }
  return resolvedError;
}

async function importStartupSampleProject(sampleId, { targetState, helpers }) {
  writeSampleProjectState(targetState, {
    status: "loading",
    sampleId,
    errorCode: "",
    errorMessage: "",
  });
  const { sampleProject, text } = await loadSampleProjectText(sampleId, {
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
    return false;
  }
  writeSampleProjectState(targetState, {
    status: "success",
    sampleId: sampleProject.id,
    scenarioId: sampleProject.scenarioId,
    projectUrl: sampleProject.projectUrl,
    appProjectUrl: sampleProject.appProjectUrl,
    fileName: sampleProject.fileName,
    title: sampleProject.title,
    completedAt: getNow(),
  });
  return true;
}

export function scheduleStartupSampleProjectDeeplink({
  targetState,
  postReadyScheduler,
  helpers = {},
} = {}) {
  if (!targetState || typeof targetState !== "object" || !postReadyScheduler) {
    return false;
  }
  const sampleId = getSampleProjectIdFromUrl({
    search: helpers.search,
    searchParamsCtor: helpers.searchParamsCtor,
  });
  if (!sampleId) return false;

  const existingState = targetState.sampleProjectDeeplink;
  if (
    existingState?.sampleId === sampleId
    && ["loading", "importing", "success"].includes(String(existingState.status || ""))
  ) {
    return false;
  }

  writeSampleProjectState(targetState, {
    status: "pending",
    sampleId,
    scenarioId: "",
    projectUrl: "",
    appProjectUrl: "",
    fileName: "",
    title: "",
    errorCode: "",
    errorMessage: "",
  });

  postReadyScheduler.scheduleTask(
    STARTUP_SAMPLE_PROJECT_TASK_KEY,
    async () => {
      try {
        await importStartupSampleProject(sampleId, { targetState, helpers });
      } catch (error) {
        const resolvedError = showSampleProjectError(error, helpers);
        writeSampleProjectState(targetState, {
          status: "error",
          sampleId,
          errorCode: resolvedError.code,
          errorMessage: resolvedError.message,
        });
      }
    },
    helpers.scheduleOptions,
  );
  return true;
}
