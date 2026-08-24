function requireFunction(candidate, label) {
  if (typeof candidate !== "function") {
    throw new TypeError(`${label} must be a function.`);
  }
  return candidate;
}

export function createVisualEffectsPassOwner({ getters = {}, helpers = {}, effects = {} } = {}) {
  const getTextureStyleConfig = requireFunction(
    getters.getTextureStyleConfig,
    "getters.getTextureStyleConfig",
  );
  const isBootInteractionReady = requireFunction(
    getters.isBootInteractionReady,
    "getters.isBootInteractionReady",
  );
  const isHgoRuntimePreviewReady = requireFunction(
    getters.isHgoRuntimePreviewReady,
    "getters.isHgoRuntimePreviewReady",
  );
  const normalizeTextureMode = requireFunction(
    helpers.normalizeTextureMode,
    "helpers.normalizeTextureMode",
  );
  const drawOldPaperTexture = requireFunction(
    effects.drawOldPaperTexture,
    "effects.drawOldPaperTexture",
  );
  const drawGraticuleTextureLines = requireFunction(
    effects.drawGraticuleTextureLines,
    "effects.drawGraticuleTextureLines",
  );
  const drawDraftGridTexture = requireFunction(
    effects.drawDraftGridTexture,
    "effects.drawDraftGridTexture",
  );
  const drawGraticuleTextureLabels = requireFunction(
    effects.drawGraticuleTextureLabels,
    "effects.drawGraticuleTextureLabels",
  );
  const drawDayNightRuntimePass = requireFunction(
    effects.drawDayNightRuntimePass,
    "effects.drawDayNightRuntimePass",
  );
  const recordRenderPerfMetric = requireFunction(
    effects.recordRenderPerfMetric,
    "effects.recordRenderPerfMetric",
  );

  function drawEffectsPass(k, { interactive = false } = {}) {
    const texture = getTextureStyleConfig();
    if (normalizeTextureMode(texture.mode) !== "paper") return;
    if (!isBootInteractionReady()) return;
    drawOldPaperTexture(k, { interactive });
  }

  function drawLineEffectsPass(k, { interactive = false } = {}) {
    const texture = getTextureStyleConfig();
    const mode = String(texture.mode || "none").trim().toLowerCase();
    if (!isBootInteractionReady()) return;
    if (mode === "graticule") {
      drawGraticuleTextureLines(k, { interactive });
      return;
    }
    if (mode === "draft_grid") {
      drawDraftGridTexture(k, { interactive });
    }
  }

  function drawTextureLabelEffectsPass(k) {
    if (isHgoRuntimePreviewReady()) {
      recordRenderPerfMetric("drawTextureLabelEffectsPass", 0, {
        skipped: true,
        reason: "hgo-runtime-preview",
      });
      return;
    }
    const texture = getTextureStyleConfig();
    const mode = String(texture.mode || "none").trim().toLowerCase();
    if (!isBootInteractionReady()) return;
    if (mode === "graticule") {
      drawGraticuleTextureLabels(k);
    }
  }

  function drawDayNightPass(k, { interactive = false } = {}) {
    drawDayNightRuntimePass(k, { interactive });
  }

  return Object.freeze({
    drawEffectsPass,
    drawLineEffectsPass,
    drawTextureLabelEffectsPass,
    drawDayNightPass,
  });
}
