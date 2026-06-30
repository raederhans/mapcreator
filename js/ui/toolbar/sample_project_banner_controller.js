const SAMPLE_PROJECT_BANNER_VISIBLE_STATUSES = new Set(["success", "error"]);

const ERROR_MESSAGE_BY_CODE = Object.freeze({
  "invalid-sample-id": "This sample link is not valid.",
  "unknown-sample-id": "This sample project is not in the public sample list.",
  "private-sample-scenario": "This sample project is not available in the public demo.",
  "unsafe-project-url": "This sample link points outside the public sample project list.",
  "unsafe-project-file": "This sample project file is not available.",
  "fetch-unavailable": "Sample projects cannot be opened in this browser session.",
  "manifest-fetch-failed": "The sample project list could not be loaded.",
  "invalid-manifest": "The sample project list is not valid.",
  "project-fetch-failed": "The selected sample project could not be loaded.",
  "sample-project-import-failed": "The sample project file could not be imported.",
  "sample-project-load-failed": "The selected sample project could not be opened.",
});

function identityT(key) {
  return String(key || "");
}

function localize(t, key) {
  return (typeof t === "function" ? t : identityT)(key, "ui");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function resolveOriginalDownloadUrl(sampleState) {
  const appProjectUrl = normalizeText(sampleState?.appProjectUrl);
  if (appProjectUrl) return appProjectUrl;
  const projectUrl = normalizeText(sampleState?.projectUrl);
  if (projectUrl.startsWith("./assets/")) {
    return `../${projectUrl.slice(2)}`;
  }
  return projectUrl;
}

function createDismissKey(sampleState) {
  return [
    normalizeText(sampleState?.status),
    normalizeText(sampleState?.sampleId),
    normalizeText(sampleState?.errorCode),
    normalizeText(sampleState?.errorMessage),
  ].join("|");
}

function resolveErrorMessage(sampleState, t) {
  const errorCode = normalizeText(sampleState?.errorCode);
  const catalogMessage = ERROR_MESSAGE_BY_CODE[errorCode];
  if (catalogMessage) return localize(t, catalogMessage);
  return normalizeText(sampleState?.errorMessage)
    || localize(t, "The selected sample project could not be opened.");
}

export function resolveSampleProjectBannerView(sampleState, { t = identityT } = {}) {
  const status = normalizeText(sampleState?.status);
  if (!SAMPLE_PROJECT_BANNER_VISIBLE_STATUSES.has(status)) {
    return null;
  }

  const sampleId = normalizeText(sampleState?.sampleId);
  const sampleTitle = normalizeText(sampleState?.title) || sampleId || localize(t, "selected sample");
  const downloadHref = resolveOriginalDownloadUrl(sampleState);
  if (status === "success") {
    return {
      status,
      tone: "success",
      sampleId,
      dismissKey: createDismissKey(sampleState),
      title: `${localize(t, "Sample loaded")}: ${sampleTitle}`,
      body: localize(
        t,
        "Edit this starter map, then export your own image or download the original sample JSON.",
      ),
      openExportLabel: localize(t, "Open export workbench"),
      downloadOriginalLabel: localize(t, "Download original JSON"),
      dismissLabel: localize(t, "Dismiss sample message"),
      canOpenExport: true,
      canDownloadOriginal: !!downloadHref,
      downloadHref,
      downloadName: normalizeText(sampleState?.fileName),
    };
  }

  return {
    status,
    tone: "error",
    sampleId,
    dismissKey: createDismissKey(sampleState),
    title: localize(t, "Sample unavailable"),
    body: resolveErrorMessage(sampleState, t),
    openExportLabel: localize(t, "Open export workbench"),
    downloadOriginalLabel: localize(t, "Download original JSON"),
    dismissLabel: localize(t, "Dismiss sample message"),
    canOpenExport: false,
    canDownloadOriginal: false,
    downloadHref: "",
    downloadName: "",
  };
}

function setElementHidden(element, hidden) {
  if (!element) return;
  element.hidden = !!hidden;
  element.classList.toggle("hidden", !!hidden);
  element.setAttribute("aria-hidden", hidden ? "true" : "false");
}

function setActionHidden(element, hidden) {
  if (!element) return;
  element.hidden = !!hidden;
  element.classList.toggle("hidden", !!hidden);
}

export function createSampleProjectBannerController({
  runtimeState,
  root,
  titleNode,
  bodyNode,
  openExportButton,
  downloadOriginalLink,
  dismissButton,
  t = identityT,
  openExportWorkbench = null,
} = {}) {
  let dismissedKey = "";
  let bound = false;

  const controller = {
    render() {
      const view = resolveSampleProjectBannerView(runtimeState?.sampleProjectDeeplink, { t });
      if (!root || !view || dismissedKey === view.dismissKey) {
        setElementHidden(root, true);
        return null;
      }

      root.dataset.sampleProjectBannerTone = view.tone;
      root.dataset.sampleProjectStatus = view.status;
      root.setAttribute("role", view.tone === "error" ? "alert" : "status");
      root.setAttribute("aria-live", view.tone === "error" ? "assertive" : "polite");
      if (titleNode) titleNode.textContent = view.title;
      if (bodyNode) bodyNode.textContent = view.body;

      if (openExportButton) {
        openExportButton.textContent = view.openExportLabel;
      }
      setActionHidden(openExportButton, !view.canOpenExport);

      if (downloadOriginalLink) {
        downloadOriginalLink.textContent = view.downloadOriginalLabel;
        if (view.canDownloadOriginal) {
          downloadOriginalLink.setAttribute("href", view.downloadHref);
          if (view.downloadName) {
            downloadOriginalLink.setAttribute("download", view.downloadName);
          } else {
            downloadOriginalLink.setAttribute("download", "");
          }
        } else {
          downloadOriginalLink.removeAttribute("href");
        }
      }
      setActionHidden(downloadOriginalLink, !view.canDownloadOriginal);

      if (dismissButton) {
        dismissButton.setAttribute("aria-label", view.dismissLabel);
        dismissButton.setAttribute("title", view.dismissLabel);
      }
      setElementHidden(root, false);
      return view;
    },

    bindEvents() {
      if (bound) return;
      bound = true;
      openExportButton?.addEventListener("click", () => {
        if (typeof openExportWorkbench === "function") {
          openExportWorkbench(openExportButton);
        }
      });
      dismissButton?.addEventListener("click", () => {
        const view = resolveSampleProjectBannerView(runtimeState?.sampleProjectDeeplink, { t });
        dismissedKey = view?.dismissKey || "";
        setElementHidden(root, true);
      });
    },
  };

  return controller;
}
