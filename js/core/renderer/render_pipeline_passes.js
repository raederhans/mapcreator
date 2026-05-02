export function createRenderPipelinePassesOwner({
  state = {},
  constants = {},
  drawPasses = {},
  helpers = {},
} = {}) {
  const {
    exactAfterSettleDeferredPassNames = new Set(),
  } = constants;

  const {
    drawBackgroundPass = () => {},
    drawPhysicalBasePass = () => {},
    drawPoliticalPass = () => {},
    drawContextBasePass = () => {},
    drawContextScenarioPass = () => {},
    drawEffectsPass = () => {},
    drawLineEffectsPass = () => {},
    drawDayNightPass = () => {},
    drawBordersPass = () => {},
    drawContextMarkersPass = () => {},
    drawTextureLabelEffectsPass = () => {},
    drawLabelsPass = () => {},
  } = drawPasses;

  const {
    detectContextScenarioReasonMismatch = () => {},
    getContextBaseReuseDecision = () => ({ enabled: false }),
    getContextScenarioReuseDecision = () => ({ enabled: false }),
    getExactAfterSettleControllerState = () => null,
    getPassReferenceTransform = () => null,
    getRenderPassCacheState = () => ({ signatures: {}, dirty: {}, reasons: {}, canvases: {}, counters: {} }),
    getRenderPassSignature = () => "",
    incrementPerfCounter = () => {},
    rebuildResolvedColors = () => {},
    recordRenderPerfMetric = () => {},
    renderPassToCache = () => {},
    shouldEnableContextBaseTransformReuse = () => false,
    shouldEnableContextScenarioTransformReuse = () => false,
    shouldStartExactAfterSettleFastPath = () => false,
    tryPartialPoliticalPassRepaint = () => false,
  } = helpers;

  function getIdleRenderPassDefinitions() {
    return [
      ["background", (k) => drawBackgroundPass(k)],
      ["physicalBase", (k) => drawPhysicalBasePass(k)],
      ["political", (k) => drawPoliticalPass(k)],
      ["contextBase", (k) => drawContextBasePass(k)],
      ["contextScenario", (k) => drawContextScenarioPass(k)],
      ["effects", (k) => drawEffectsPass(k)],
      ["lineEffects", (k) => drawLineEffectsPass(k)],
      ["dayNight", (k) => drawDayNightPass(k)],
      ["borders", (k) => drawBordersPass(k)],
      ["contextMarkers", (k) => drawContextMarkersPass(k)],
      ["textureLabels", (k) => drawTextureLabelEffectsPass(k)],
      ["labels", (k) => drawLabelsPass(k)],
    ];
  }

  function shouldDeferExactAfterSettlePassForCriticalPaint(passName, cache = getRenderPassCacheState()) {
    if (!exactAfterSettleDeferredPassNames.has(passName)) return false;
    const controller = getExactAfterSettleControllerState();
    if (!controller || String(controller.phase || "") !== "awaiting-paint") return false;
    if (!cache.canvases?.[passName]) return false;
    if (!getPassReferenceTransform(passName)) return false;
    return true;
  }

  // idle pass 准备阶段只决定“要不要重画”和“记录原因”，真正绘制仍走 renderPassToCache。
  function prepareIdleRenderPassDefinition(passName, drawFn, transform, timings, cache = getRenderPassCacheState()) {
    const nextSignature = getRenderPassSignature(passName, transform);
    if (cache.signatures[passName] !== nextSignature) {
      cache.dirty[passName] = true;
      if (!cache.reasons[passName] || cache.reasons[passName] === "init") {
        cache.reasons[passName] = "signature";
      }
      if (passName === "contextScenario") {
        recordRenderPerfMetric("contextScenarioSignatureChanged", 0, {
          activeScenarioId: String(state.activeScenarioId || ""),
          previousSignature: String(cache.signatures[passName] || ""),
          nextSignature,
        });
      }
    }
    if (
      passName === "contextBase"
      && shouldEnableContextBaseTransformReuse()
      && !state.deferExactAfterSettle
      && shouldStartExactAfterSettleFastPath()
    ) {
      const reuseDecision = getContextBaseReuseDecision(transform);
      if (reuseDecision.enabled && reuseDecision.shouldExactRefresh) {
        cache.dirty[passName] = true;
        cache.reasons[passName] = reuseDecision.reason || "context-base-threshold";
      }
    }
    if (
      passName === "contextScenario"
      && shouldEnableContextScenarioTransformReuse()
      && cache.dirty[passName]
      && String(cache.reasons[passName] || "") === "signature"
    ) {
      const reuseDecision = getContextScenarioReuseDecision(transform);
      if (reuseDecision.enabled && reuseDecision.shouldExactRefresh) {
        cache.dirty[passName] = true;
        cache.reasons.contextScenario = "signature";
        incrementPerfCounter("contextScenarioExactRefreshCount");
        recordRenderPerfMetric("contextScenarioExactRefresh", 0, {
          activeScenarioId: String(state.activeScenarioId || ""),
          reason: reuseDecision.reason,
          scaleRatio: reuseDecision.scaleRatio,
          distancePx: reuseDecision.distancePx,
          maxDistancePx: reuseDecision.maxDistancePx,
          zoomBucket: reuseDecision.zoomBucket,
          referenceZoomBucket: reuseDecision.referenceZoomBucket,
          crossesZoomBucket: !!reuseDecision.crossesZoomBucket,
          reuseFrameCount: reuseDecision.reuseFrameCount,
          reuseFrameLimit: reuseDecision.reuseFrameLimit,
        });
      } else {
        cache.dirty[passName] = false;
        cache.counters.contextScenarioReuseCount = Math.max(
          0,
          Number(cache.counters.contextScenarioReuseCount || 0) + 1,
        );
        recordRenderPerfMetric("contextScenarioReuseSkipped", 0, {
          activeScenarioId: String(state.activeScenarioId || ""),
          reason: reuseDecision.reason || "transform-reuse",
          transformK: Number(transform?.k || state.zoomTransform?.k || 1),
          scaleRatio: reuseDecision.scaleRatio,
          distancePx: reuseDecision.distancePx,
          maxDistancePx: reuseDecision.maxDistancePx,
          zoomBucket: reuseDecision.zoomBucket,
          referenceZoomBucket: reuseDecision.referenceZoomBucket,
          reuseFrameCount: reuseDecision.reuseFrameCount,
          reuseFrameLimit: reuseDecision.reuseFrameLimit,
        });
      }
    }
    if (!cache.dirty[passName]) return;
    if (shouldDeferExactAfterSettlePassForCriticalPaint(passName, cache)) {
      recordRenderPerfMetric("settleExactRefreshDeferredPass", 0, {
        activeScenarioId: String(state.activeScenarioId || ""),
        passName,
        reason: String(cache.reasons?.[passName] || "dirty"),
        controllerPhase: String(getExactAfterSettleControllerState()?.phase || ""),
      });
      return;
    }
    if (
      passName === "political"
      && tryPartialPoliticalPassRepaint(transform, nextSignature, timings)
    ) {
      return;
    }
    renderPassToCache(passName, drawFn, transform, timings);
  }

  function ensureIdleRenderPasses(timings) {
    const transform = state.zoomTransform || globalThis.d3.zoomIdentity;
    const cache = getRenderPassCacheState();
    if (state.legacyColorStateDirty) {
      rebuildResolvedColors();
    }
    getIdleRenderPassDefinitions().forEach(([passName, drawFn]) => {
      prepareIdleRenderPassDefinition(passName, drawFn, transform, timings, cache);
    });
    if (Number.isFinite(timings.contextBase) || Number.isFinite(timings.contextScenario)) {
      timings.context =
        Math.max(0, Number(timings.contextBase || 0))
        + Math.max(0, Number(timings.contextScenario || 0));
    }
    detectContextScenarioReasonMismatch({ cache, renderPerf: state.renderPerfMetrics || {} });
  }

  return {
    getIdleRenderPassDefinitions,
    prepareIdleRenderPassDefinition,
    ensureIdleRenderPasses,
  };
}
