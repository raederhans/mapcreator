import {
  loadPublicSampleProjectIntoRuntime,
  writeSampleProjectState,
} from "../core/sample_project_import_workflow.js";
import {
  getSampleProjectIdFromUrl,
} from "../core/sample_project_registry.js";

export const STARTUP_SAMPLE_PROJECT_TASK_KEY = "startup-sample-project-import";

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
  // sample deeplink 只排进 post-ready 阶段；这里挡住同一个样例已在 loading/importing/success 阶段时的重复导入。
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
      await loadPublicSampleProjectIntoRuntime(sampleId, { targetState, helpers });
    },
    helpers.scheduleOptions,
  );
  return true;
}
