const SAMPLE_EXPORT_TARGET_LABELS = Object.freeze({
  composite: "Composite image",
  "per-layer": "Per-layer PNG",
  "bake-pack": "Bake pack (v1.1)",
});

const SAMPLE_EXPORT_ALLOWED_VALUES = Object.freeze({
  targets: Object.freeze(Object.keys(SAMPLE_EXPORT_TARGET_LABELS)),
  formats: Object.freeze(["png", "jpg"]),
  scales: Object.freeze(["1", "1.5", "2", "4"]),
  previewModes: Object.freeze(["main", "layer"]),
  layerIds: Object.freeze(["background", "political", "context", "effects", "labels"]),
  textLayerIds: Object.freeze(["render-labels", "special-zones", "svg-annotations"]),
});

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeToken(value) {
  return normalizeText(value).toLowerCase();
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeUniqueList(values, allowedValues) {
  const allowed = new Set(allowedValues);
  const normalized = (Array.isArray(values) ? values : [])
    .map((value) => normalizeToken(value))
    .filter((value) => allowed.has(value));
  return Array.from(new Set(normalized));
}

function collectListIssues(source, fieldName, allowedValues) {
  if (!Array.isArray(source)) {
    return [`${fieldName} must be an array`];
  }
  const allowed = new Set(allowedValues);
  const issues = [];
  const seen = new Set();
  for (const value of source) {
    const normalized = normalizeToken(value);
    if (!allowed.has(normalized)) {
      issues.push(`${fieldName} has invalid value: ${normalizeText(value)}`);
      continue;
    }
    if (seen.has(normalized)) {
      issues.push(`${fieldName} has duplicate value: ${normalized}`);
    }
    seen.add(normalized);
  }
  return issues;
}

export function collectSampleExportRecommendationIssues(value) {
  if (!isPlainObject(value)) {
    return ["recommended_export must be an object"];
  }

  const issues = [];
  const label = normalizeText(value.label);
  const target = normalizeToken(value.target);
  const format = normalizeToken(value.format);
  const scale = normalizeText(value.scale);
  const previewMode = normalizeToken(value.previewMode);

  if (!label) issues.push("label is required");
  if (!SAMPLE_EXPORT_ALLOWED_VALUES.targets.includes(target)) {
    issues.push(`target has invalid value: ${normalizeText(value.target)}`);
  }
  if (!SAMPLE_EXPORT_ALLOWED_VALUES.formats.includes(format)) {
    issues.push(`format has invalid value: ${normalizeText(value.format)}`);
  }
  if (!SAMPLE_EXPORT_ALLOWED_VALUES.scales.includes(scale)) {
    issues.push(`scale has invalid value: ${normalizeText(value.scale)}`);
  }
  if (!SAMPLE_EXPORT_ALLOWED_VALUES.previewModes.includes(previewMode)) {
    issues.push(`previewMode has invalid value: ${normalizeText(value.previewMode)}`);
  }
  issues.push(...collectListIssues(value.layerOrder, "layerOrder", SAMPLE_EXPORT_ALLOWED_VALUES.layerIds));
  issues.push(...collectListIssues(value.visibleLayers, "visibleLayers", SAMPLE_EXPORT_ALLOWED_VALUES.layerIds));
  issues.push(...collectListIssues(value.textLayers, "textLayers", SAMPLE_EXPORT_ALLOWED_VALUES.textLayerIds));

  return issues;
}

export function normalizeSampleExportRecommendation(value) {
  if (collectSampleExportRecommendationIssues(value).length) return null;
  return {
    label: normalizeText(value.label),
    target: normalizeToken(value.target),
    format: normalizeToken(value.format),
    scale: normalizeText(value.scale),
    previewMode: normalizeToken(value.previewMode),
    layerOrder: normalizeUniqueList(value.layerOrder, SAMPLE_EXPORT_ALLOWED_VALUES.layerIds),
    visibleLayers: normalizeUniqueList(value.visibleLayers, SAMPLE_EXPORT_ALLOWED_VALUES.layerIds),
    textLayers: normalizeUniqueList(value.textLayers, SAMPLE_EXPORT_ALLOWED_VALUES.textLayerIds),
  };
}

function getScaleLabel(scale) {
  return `${normalizeText(scale)}x`;
}

export function getSampleExportTargetLabel(target) {
  return SAMPLE_EXPORT_TARGET_LABELS[normalizeToken(target)] || SAMPLE_EXPORT_TARGET_LABELS.composite;
}

export function getSampleExportRecommendationSummary(recommendation) {
  const normalized = normalizeSampleExportRecommendation(recommendation);
  if (!normalized) return "";
  return [
    normalized.format.toUpperCase(),
    getScaleLabel(normalized.scale),
    getSampleExportTargetLabel(normalized.target),
  ].join(" · ");
}

function getCommittedSampleProjectId(sampleState) {
  const status = normalizeToken(sampleState?.status);
  if (status === "success") return normalizeText(sampleState?.sampleId);
  return normalizeText(sampleState?.previousSampleId);
}

function getCommittedSampleProjectTitle(sampleState, sampleProject, sampleId) {
  const status = normalizeToken(sampleState?.status);
  if (status === "success") {
    return normalizeText(sampleState?.title) || normalizeText(sampleProject?.title) || sampleId;
  }
  return normalizeText(sampleState?.previousTitle) || normalizeText(sampleProject?.title) || sampleId;
}

function normalizeSampleProjectEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = normalizeText(entry.id);
  if (!id) return null;
  return {
    id,
    title: normalizeText(entry.title),
    recommendedExport: normalizeSampleExportRecommendation(entry.recommendedExport || entry.recommended_export),
  };
}

function resolveSampleStateRecommendation(sampleState, sampleId) {
  const status = normalizeToken(sampleState?.status);
  if (status === "success" && normalizeText(sampleState?.sampleId) === sampleId) {
    return sampleState?.recommendedExport || sampleState?.recommended_export;
  }
  if (normalizeText(sampleState?.previousSampleId) === sampleId) {
    return sampleState?.previousRecommendedExport || sampleState?.previous_recommended_export;
  }
  return null;
}

export function resolveSampleExportRecommendationContext(runtimeState, { sampleProjects = [] } = {}) {
  const sampleState = runtimeState?.sampleProjectDeeplink;
  const sampleId = getCommittedSampleProjectId(sampleState);
  if (!sampleId) return null;

  const sampleProject = (Array.isArray(sampleProjects) ? sampleProjects : [])
    .map((entry) => normalizeSampleProjectEntry(entry))
    .find((entry) => entry?.id === sampleId) || null;
  const recommendedExport = normalizeSampleExportRecommendation(
    sampleProject?.recommendedExport
      || resolveSampleStateRecommendation(sampleState, sampleId),
  );
  if (!recommendedExport) return null;

  return {
    sampleId,
    sampleTitle: getCommittedSampleProjectTitle(sampleState, sampleProject, sampleId),
    recommendedExport,
    recommendationLabel: recommendedExport.label,
    recommendationSummary: getSampleExportRecommendationSummary(recommendedExport),
  };
}

export { SAMPLE_EXPORT_ALLOWED_VALUES };
