const DEFAULT_RENDER_REASON = "toolbar-render";
const HIGH_FREQUENCY_REASON_SUFFIX_PATTERN = /(?:^|-)(?:color|opacity|width|strength|intensity|halo|size|reach|radius|area|bias|retention|shadow|twilight|scale|interval|cutoff)$/;
const HIGH_FREQUENCY_TRANSPORT_REASON_PATTERN = /^transport-(?:airport|port|rail|road)-(?:visual-strength|opacity|primary-color|label-size|label-halo|coverage-reach)$/;

function normalizeRenderReason(reason) {
  const normalized = String(reason || "").trim();
  return normalized || DEFAULT_RENDER_REASON;
}

function shouldBatchToolbarRenderReason(reason) {
  const normalizedReason = normalizeRenderReason(reason);
  if (normalizedReason === "texture-style-input") return true;
  if (HIGH_FREQUENCY_TRANSPORT_REASON_PATTERN.test(normalizedReason)) return true;
  return HIGH_FREQUENCY_REASON_SUFFIX_PATTERN.test(normalizedReason);
}

function buildBatchedRenderReason(reasons) {
  const uniqueReasons = [...new Set((Array.isArray(reasons) ? reasons : [])
    .map(normalizeRenderReason))];
  if (uniqueReasons.length <= 1) return uniqueReasons[0] || DEFAULT_RENDER_REASON;
  return `toolbar-batch:${uniqueReasons.join(",")}`;
}

function resolveFrameScheduler(requestAnimationFrameRef, setTimeoutRef) {
  if (typeof requestAnimationFrameRef === "function") return requestAnimationFrameRef;
  if (typeof setTimeoutRef === "function") {
    return (callback) => setTimeoutRef(callback, 0);
  }
  return (callback) => {
    callback();
    return 1;
  };
}

export function createToolbarRenderScheduler({
  requestRender,
  renderDirty,
  requestAnimationFrameRef = globalThis.requestAnimationFrame,
  setTimeoutRef = globalThis.setTimeout,
} = {}) {
  const renderRequest = typeof requestRender === "function"
    ? requestRender
    : typeof renderDirty === "function"
      ? renderDirty
      : () => {};
  const pendingReasons = new Set();
  const scheduleFrame = resolveFrameScheduler(requestAnimationFrameRef, setTimeoutRef);
  let pendingFrame = 0;

  const flush = () => {
    if (!pendingFrame && pendingReasons.size === 0) return "";
    pendingFrame = 0;
    const reason = buildBatchedRenderReason([...pendingReasons]);
    pendingReasons.clear();
    renderRequest(reason);
    return reason;
  };

  const schedule = (reason) => {
    pendingReasons.add(normalizeRenderReason(reason));
    if (pendingFrame) return pendingFrame;
    let flushedSynchronously = false;
    const frameId = scheduleFrame(() => {
      flushedSynchronously = true;
      return flush();
    }) || 1;
    pendingFrame = flushedSynchronously && pendingReasons.size === 0 ? 0 : frameId;
    return pendingFrame;
  };

  return {
    flush,
    schedule,
    getPendingReasons: () => [...pendingReasons],
    hasPendingFrame: () => !!pendingFrame,
  };
}

export function createToolbarDirtyRenderScheduler({
  markDirty = () => {},
  requestRender,
  renderDirty,
  requestAnimationFrameRef = globalThis.requestAnimationFrame,
  setTimeoutRef = globalThis.setTimeout,
} = {}) {
  const renderScheduler = createToolbarRenderScheduler({
    requestRender,
    renderDirty,
    requestAnimationFrameRef,
    setTimeoutRef,
  });
  return {
    ...renderScheduler,
    schedule: (reason) => {
      const normalizedReason = normalizeRenderReason(reason);
      if (typeof markDirty === "function") markDirty(normalizedReason);
      return renderScheduler.schedule(normalizedReason);
    },
  };
}

export {
  buildBatchedRenderReason,
  normalizeRenderReason,
  shouldBatchToolbarRenderReason,
};
