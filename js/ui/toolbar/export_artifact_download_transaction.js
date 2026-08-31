// Export artifact download transaction.
// Owns the export-only lifecycle from prepared UI inputs through artifact creation and browser download.

import { classifyExportFailure } from "./export_failure_handler.js";

export const EXPORT_ARTIFACT_DOWNLOAD_PHASES = Object.freeze({
  IDLE: "idle",
  PREPARING: "preparing",
  ARTIFACT_READY: "artifact-ready",
  DOWNLOADING: "downloading",
  READY: "ready",
  FAILED: "failed",
});

function assertRequiredCallableDependency(value, name) {
  if (typeof value !== "function") {
    throw new TypeError(`createExportArtifactDownloadTransaction requires ${name} to be a function.`);
  }
}

function normalizeMaxConcurrentJobs(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function resolveExportTarget(value) {
  const target = String(value || "").trim().toLowerCase();
  return ["per-layer", "bake-pack"].includes(target) ? target : "composite";
}

function resolveExportScale(value) {
  const scale = Number(value);
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new TypeError("Export scale must be a positive finite number.");
  }
  return scale;
}

function getSuccessToastContent(target, t) {
  if (target === "per-layer") {
    return {
      message: t("Layer package downloaded.", "ui"),
      title: t("Layer package exported", "ui"),
    };
  }
  if (target === "bake-pack") {
    return {
      message: t("Bake package downloaded.", "ui"),
      title: t("Bake pack exported", "ui"),
    };
  }
  return {
    message: t("Map snapshot downloaded.", "ui"),
    title: t("Snapshot exported", "ui"),
  };
}

function assertDownloadableArtifact(target, artifact) {
  if (target === "composite") {
    if (!artifact) throw new TypeError("Composite export canvas is unavailable.");
    return;
  }
  if (!artifact || typeof artifact !== "object" || !artifact.blob) {
    throw new TypeError("Export package artifact is unavailable.");
  }
  if (!String(artifact.extension || "").trim() || !String(artifact.fileStem || "").trim()) {
    throw new TypeError("Export package download metadata is unavailable.");
  }
}

function markExportFailureStage(error, stage) {
  if (error && typeof error === "object" && !error.exportStage) {
    try {
      error.exportStage = stage;
      if (error.exportStage === stage) return error;
    } catch {
      // Native and frozen errors are wrapped below so failure presentation still remains deterministic.
    }
  }
  const wrapped = new Error(String(error?.message || error || "Export transaction failed."));
  wrapped.exportStage = stage;
  const exportKind = String(error?.exportKind || "").trim();
  if (exportKind) wrapped.exportKind = exportKind;
  if (error !== undefined) wrapped.cause = error;
  return wrapped;
}

export function createExportArtifactDownloadTransaction({
  getExportUi,
  getSelectedExportScale,
  buildPerLayerExportPackage,
  buildBakePackPackage,
  buildCompositeExportCanvas,
  triggerBlobDownload,
  triggerCanvasDownload,
  showToast,
  showExportFailureToast,
  t,
  onLifecycle = null,
  maxConcurrentJobs = 1,
} = {}) {
  assertRequiredCallableDependency(getExportUi, "getExportUi");
  assertRequiredCallableDependency(getSelectedExportScale, "getSelectedExportScale");
  assertRequiredCallableDependency(buildPerLayerExportPackage, "buildPerLayerExportPackage");
  assertRequiredCallableDependency(buildBakePackPackage, "buildBakePackPackage");
  assertRequiredCallableDependency(buildCompositeExportCanvas, "buildCompositeExportCanvas");
  assertRequiredCallableDependency(triggerBlobDownload, "triggerBlobDownload");
  assertRequiredCallableDependency(triggerCanvasDownload, "triggerCanvasDownload");
  assertRequiredCallableDependency(showToast, "showToast");
  assertRequiredCallableDependency(showExportFailureToast, "showExportFailureToast");
  assertRequiredCallableDependency(t, "t");
  if (onLifecycle !== null) assertRequiredCallableDependency(onLifecycle, "onLifecycle");

  const concurrencyLimit = normalizeMaxConcurrentJobs(maxConcurrentJobs);
  let jobsInFlight = 0;
  let transactionSequence = 0;
  let lifecycle = Object.freeze({
    phase: EXPORT_ARTIFACT_DOWNLOAD_PHASES.IDLE,
    transactionId: 0,
  });

  const emitLifecycle = (transactionId, phase, details = {}) => {
    lifecycle = Object.freeze({
      phase,
      transactionId,
      ...details,
    });
    onLifecycle?.(lifecycle);
    return lifecycle;
  };

  const run = async () => {
    if (jobsInFlight >= concurrencyLimit) {
      showToast(
        t("An export is already in progress. Wait for it to finish before starting another export.", "ui"),
        { title: t("Export queue is full", "ui"), tone: "warning", duration: 4200 },
      );
      return Object.freeze({ status: "rejected", reason: "queue-full" });
    }

    jobsInFlight += 1;
    transactionSequence += 1;
    const transactionId = transactionSequence;
    let target = "composite";
    let stage = "artifact";
    try {
      const exportUi = getExportUi();
      if (!exportUi || typeof exportUi !== "object") {
        throw new TypeError("Export UI state is unavailable.");
      }
      const scale = resolveExportScale(getSelectedExportScale());
      target = resolveExportTarget(exportUi.target);
      exportUi.target = target;
      exportUi.scale = String(scale);
      const extension = target === "composite" && exportUi.format === "jpg" ? "jpg" : "png";
      if (target === "composite") exportUi.format = extension;
      emitLifecycle(transactionId, EXPORT_ARTIFACT_DOWNLOAD_PHASES.PREPARING, { target, scale });

      let artifact;
      if (target === "per-layer") {
        artifact = await buildPerLayerExportPackage(exportUi, scale);
      } else if (target === "bake-pack") {
        artifact = await buildBakePackPackage(exportUi, scale);
      } else {
        artifact = await buildCompositeExportCanvas(exportUi, scale);
      }
      assertDownloadableArtifact(target, artifact);

      emitLifecycle(transactionId, EXPORT_ARTIFACT_DOWNLOAD_PHASES.ARTIFACT_READY, {
        target,
        scale,
        extension: target === "composite" ? extension : artifact?.extension,
        fileStem: target === "composite" ? "map_snapshot" : artifact?.fileStem,
      });
      stage = "download";
      emitLifecycle(transactionId, EXPORT_ARTIFACT_DOWNLOAD_PHASES.DOWNLOADING, { target, scale });
      if (target === "composite") {
        await triggerCanvasDownload(artifact, extension, "map_snapshot");
      } else {
        await triggerBlobDownload(artifact?.blob, artifact?.extension, artifact?.fileStem);
      }
      const content = getSuccessToastContent(target, t);
      showToast(content.message, { title: content.title, tone: "success" });
      const receipt = Object.freeze({
        status: "ready",
        target,
        scale,
        extension: target === "composite" ? extension : artifact?.extension,
        fileStem: target === "composite" ? "map_snapshot" : artifact?.fileStem,
      });
      emitLifecycle(transactionId, EXPORT_ARTIFACT_DOWNLOAD_PHASES.READY, receipt);
      return receipt;
    } catch (error) {
      const failure = markExportFailureStage(error, stage);
      const receipt = Object.freeze({
        status: "failed",
        target,
        failureKind: classifyExportFailure(failure),
      });
      emitLifecycle(transactionId, EXPORT_ARTIFACT_DOWNLOAD_PHASES.FAILED, receipt);
      showExportFailureToast(failure);
      return receipt;
    } finally {
      jobsInFlight = Math.max(0, jobsInFlight - 1);
    }
  };

  return Object.freeze({
    getJobsInFlight: () => jobsInFlight,
    getLifecycle: () => lifecycle,
    run,
  });
}
