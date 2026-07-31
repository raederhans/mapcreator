// Canonical renderer diagnostics-state mutations.
// Time sampling, global mirrors, hooks, and metrics orchestration stay in callers.

function assertStateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[renderer_diagnostics_actions] target must be an object");
  }
}

export function ensureRenderPerfMetricsState(target) {
  assertStateTarget(target);
  if (
    !target.renderPerfMetrics
    || typeof target.renderPerfMetrics !== "object"
    || Array.isArray(target.renderPerfMetrics)
  ) {
    target.renderPerfMetrics = {};
  }
  return true;
}

export function replaceRenderPerfMetricsState(target, metrics) {
  assertStateTarget(target);
  if (
    metrics !== undefined
    && (
      !metrics
      || typeof metrics !== "object"
      || Array.isArray(metrics)
    )
  ) {
    throw new TypeError("[renderer_diagnostics_actions] metrics must be an object or undefined");
  }
  target.renderPerfMetrics = metrics;
  return metrics;
}

export function setRenderPerfMetricEntryState(
  target,
  { name, entry } = {},
) {
  assertStateTarget(target);
  const normalizedName = String(name || "").trim();
  if (!normalizedName) {
    throw new TypeError("[renderer_diagnostics_actions] name must be a non-empty string");
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new TypeError("[renderer_diagnostics_actions] entry must be an object");
  }
  ensureRenderPerfMetricsState(target);
  target.renderPerfMetrics[normalizedName] = entry;
  return entry;
}

export function setRenderPerfContextBreakdownState(target, breakdown = {}) {
  assertStateTarget(target);
  if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) {
    throw new TypeError("[renderer_diagnostics_actions] breakdown must be an object");
  }
  ensureRenderPerfMetricsState(target);
  target.renderPerfMetrics.contextBreakdown = breakdown;
  return breakdown;
}

export function commitRenderPerfMetricState(
  target,
  { name, entry, sequence } = {},
) {
  assertStateTarget(target);
  const normalizedName = String(name || "").trim();
  if (!normalizedName) {
    throw new TypeError("[renderer_diagnostics_actions] name must be a non-empty string");
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new TypeError("[renderer_diagnostics_actions] entry must be an object");
  }
  ensureRenderPerfMetricsState(target);
  const nextSequence = Math.max(0, Number(sequence || 0));
  target.renderPerfMetrics[normalizedName] = entry;
  target.renderPerfMetricSequence = nextSequence;
  return nextSequence;
}

export function setFirstVisibleFramePaintedState(target, painted) {
  assertStateTarget(target);
  const nextPainted = Boolean(painted);
  target.firstVisibleFramePainted = nextPainted;
  return nextPainted;
}

export function resetProjectedBoundsDiagnosticsState(
  target,
  diagnostics = {
    total: 0,
    byGeometryType: {},
    byReason: {},
  },
) {
  assertStateTarget(target);
  if (!diagnostics || typeof diagnostics !== "object" || Array.isArray(diagnostics)) {
    throw new TypeError("[renderer_diagnostics_actions] diagnostics must be an object");
  }
  target.projectedBoundsDiagnostics = diagnostics;
  return true;
}

export function setProjectedBoundsDiagnosticsState(
  target,
  diagnostics,
) {
  assertStateTarget(target);
  if (!diagnostics || typeof diagnostics !== "object" || Array.isArray(diagnostics)) {
    throw new TypeError("[renderer_diagnostics_actions] diagnostics must be an object");
  }
  target.projectedBoundsDiagnostics = diagnostics;
  return true;
}

export function setDebugCountryCoverageState(target, coverage = null) {
  assertStateTarget(target);
  target.debugCountryCoverage = coverage;
  return coverage;
}
