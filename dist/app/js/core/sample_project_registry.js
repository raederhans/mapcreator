export const SAMPLE_PROJECT_QUERY_PARAM = "sample";
export const LEGACY_SAMPLE_PROJECT_QUERY_PARAM = "sample_project";
export const SAMPLE_PROJECT_MANIFEST_URL = "../assets/sample-runs.json";
export const SAMPLE_PROJECT_ASSET_BASE_URL = "../assets/sample-projects/";
export const LANDING_SAMPLE_PROJECT_PREFIX = "./assets/sample-projects/";

const SAMPLE_PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAMPLE_PROJECT_FILE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.project\.json$/;

export class SampleProjectLoadError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "SampleProjectLoadError";
    this.code = String(code || "sample-project-error");
    this.toastTitle = String(options.toastTitle || "Sample unavailable");
    this.toastTone = String(options.toastTone || "warning");
    this.userMessage = String(options.userMessage || message || "Sample project could not be opened.");
  }
}

function createSampleProjectError(code, message, options = {}) {
  return new SampleProjectLoadError(code, message, options);
}

function normalizeSampleProjectId(sampleId) {
  return String(sampleId || "").trim().toLowerCase();
}

function assertSampleProjectId(sampleId) {
  const normalizedId = normalizeSampleProjectId(sampleId);
  if (!normalizedId || !SAMPLE_PROJECT_ID_PATTERN.test(normalizedId)) {
    throw createSampleProjectError(
      "invalid-sample-id",
      "Sample project id is not valid.",
      { userMessage: "This sample link is not valid." },
    );
  }
  return normalizedId;
}

function normalizeStringSet(values) {
  return new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
}

function assertFetch(fetchImpl) {
  if (typeof fetchImpl !== "function") {
    throw createSampleProjectError(
      "fetch-unavailable",
      "Fetch is not available for sample project loading.",
      { userMessage: "Sample projects cannot be opened in this browser session." },
    );
  }
  return fetchImpl;
}

async function fetchJsonResource(url, { fetchImpl }) {
  const response = await assertFetch(fetchImpl)(url);
  if (!response?.ok) {
    throw createSampleProjectError(
      "manifest-fetch-failed",
      `Unable to fetch sample manifest: ${url}`,
      { userMessage: "The sample project list could not be loaded." },
    );
  }
  return response.json();
}

async function fetchTextResource(url, { fetchImpl }) {
  const response = await assertFetch(fetchImpl)(url);
  if (!response?.ok) {
    throw createSampleProjectError(
      "project-fetch-failed",
      `Unable to fetch sample project: ${url}`,
      { userMessage: "The selected sample project could not be loaded." },
    );
  }
  return response.text();
}

export function getSampleProjectIdFromUrl({
  search = globalThis.location?.search || "",
  searchParamsCtor = globalThis.URLSearchParams,
} = {}) {
  if (typeof searchParamsCtor !== "function") return null;
  const params = new searchParamsCtor(search);
  const rawSampleId = params.get(SAMPLE_PROJECT_QUERY_PARAM) || params.get(LEGACY_SAMPLE_PROJECT_QUERY_PARAM);
  const normalizedId = normalizeSampleProjectId(rawSampleId);
  return normalizedId || null;
}

export function resolveSampleProjectFileName(projectUrl) {
  const normalizedUrl = String(projectUrl || "").trim();
  if (!normalizedUrl.startsWith(LANDING_SAMPLE_PROJECT_PREFIX)) {
    throw createSampleProjectError(
      "unsafe-project-url",
      "Sample project URL must point at the checked-in public sample directory.",
      { userMessage: "This sample link points outside the public sample project list." },
    );
  }
  const fileName = normalizedUrl.slice(LANDING_SAMPLE_PROJECT_PREFIX.length);
  if (!SAMPLE_PROJECT_FILE_PATTERN.test(fileName)) {
    throw createSampleProjectError(
      "unsafe-project-file",
      "Sample project file name is not safe.",
      { userMessage: "This sample project file is not available." },
    );
  }
  return fileName;
}

export function resolveSampleProjectFromManifest(
  manifest,
  sampleId,
  { projectBaseUrl = SAMPLE_PROJECT_ASSET_BASE_URL } = {},
) {
  const normalizedId = assertSampleProjectId(sampleId);
  if (!manifest || typeof manifest !== "object") {
    throw createSampleProjectError(
      "invalid-manifest",
      "Sample manifest is not valid.",
      { userMessage: "The sample project list is not valid." },
    );
  }

  const publicScenarioIds = normalizeStringSet(manifest.public_scenario_ids);
  const excludedScenarioIds = normalizeStringSet(manifest.developer_preview_exclusions);
  const sampleProjects = Array.isArray(manifest.sample_projects) ? manifest.sample_projects : [];
  const entry = sampleProjects.find((project) => normalizeSampleProjectId(project?.id) === normalizedId);
  if (!entry) {
    throw createSampleProjectError(
      "unknown-sample-id",
      `Unknown sample project id: ${normalizedId}`,
      { userMessage: "This sample project is not in the public sample list." },
    );
  }

  const scenarioId = String(entry.scenario_id || "").trim();
  if (!scenarioId || excludedScenarioIds.has(scenarioId) || !publicScenarioIds.has(scenarioId)) {
    throw createSampleProjectError(
      "private-sample-scenario",
      `Sample project scenario is not public: ${scenarioId || "(empty)"}`,
      { userMessage: "This sample project is not available in the public demo." },
    );
  }

  const fileName = resolveSampleProjectFileName(entry.project_url);
  return {
    id: normalizedId,
    title: String(entry.title || normalizedId).trim(),
    scenarioId,
    projectUrl: String(entry.project_url || "").trim(),
    appProjectUrl: `${projectBaseUrl}${fileName}`,
    fileName,
    manifestVersion: Number(manifest.version || 0) || 0,
  };
}

export async function fetchSampleProjectManifest({
  fetchImpl = globalThis.fetch,
  manifestUrl = SAMPLE_PROJECT_MANIFEST_URL,
} = {}) {
  return fetchJsonResource(manifestUrl, { fetchImpl });
}

export async function loadSampleProjectText(sampleId, {
  fetchImpl = globalThis.fetch,
  manifestUrl = SAMPLE_PROJECT_MANIFEST_URL,
  projectBaseUrl = SAMPLE_PROJECT_ASSET_BASE_URL,
} = {}) {
  const normalizedId = assertSampleProjectId(sampleId);
  const manifest = await fetchSampleProjectManifest({ fetchImpl, manifestUrl });
  const sampleProject = resolveSampleProjectFromManifest(manifest, normalizedId, { projectBaseUrl });
  const text = await fetchTextResource(sampleProject.appProjectUrl, { fetchImpl });
  return {
    sampleProject,
    text,
  };
}
