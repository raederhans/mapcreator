const REQUIRED_EFFECT_NAMES = Object.freeze([
  "ensureRenderPassCanvas",
  "prepareTargetContext",
  "withRenderTarget",
]);

const REQUIRED_GETTER_NAMES = Object.freeze([
  "getRenderPassLayout",
]);

function requireFunction(source, name, label) {
  const candidate = source?.[name];
  if (typeof candidate !== "function") {
    throw new TypeError(`${label}.${name} must be a function.`);
  }
  return candidate;
}

function createTrace() {
  return {
    effectOrder: [],
    getterOrder: [],
  };
}

function createSummary({
  passName,
  k = null,
  hasPassCanvas = false,
  hasPassContext = false,
  drawInvoked = false,
  drawResult,
  skipped = false,
  skipReason = "",
  trace,
}) {
  return Object.freeze({
    passName,
    k,
    hasPassCanvas: Boolean(hasPassCanvas),
    hasPassContext: Boolean(hasPassContext),
    drawInvoked: Boolean(drawInvoked),
    drawResult,
    skipped: Boolean(skipped),
    skipReason: String(skipReason || ""),
    effectOrder: Object.freeze([...(trace?.effectOrder || [])]),
    getterOrder: Object.freeze([...(trace?.getterOrder || [])]),
  });
}

function normalizeTransformScale(transform) {
  return Math.max(0.0001, Number(transform?.k || 1));
}

export function createRenderPassCacheHostOwner({ effects = {}, getters = {} } = {}) {
  const effectApi = Object.fromEntries(
    REQUIRED_EFFECT_NAMES.map((name) => [name, requireFunction(effects, name, "effects")]),
  );
  const getterApi = Object.fromEntries(
    REQUIRED_GETTER_NAMES.map((name) => [name, requireFunction(getters, name, "getters")]),
  );

  function runEffect(trace, name, ...args) {
    trace.effectOrder.push(name);
    return effectApi[name](...args);
  }

  function runGetter(trace, name, ...args) {
    trace.getterOrder.push(name);
    return getterApi[name](...args);
  }

  function prepareRenderPassHost({
    passName,
    transform,
    drawFn,
    onHostReady = null,
  } = {}) {
    if (typeof drawFn !== "function") {
      throw new TypeError("drawFn must be a function.");
    }

    const trace = createTrace();
    const normalizedPassName = String(passName || "");
    const passCanvas = runEffect(trace, "ensureRenderPassCanvas", normalizedPassName);
    if (!passCanvas) {
      return createSummary({
        passName: normalizedPassName,
        skipped: true,
        skipReason: "missing-pass-canvas",
        trace,
      });
    }

    trace.effectOrder.push("getContext2D");
    const passContext = typeof passCanvas.getContext === "function"
      ? passCanvas.getContext("2d")
      : null;
    if (!passContext) {
      return createSummary({
        passName: normalizedPassName,
        hasPassCanvas: true,
        skipped: true,
        skipReason: "missing-pass-context",
        trace,
      });
    }

    if (typeof onHostReady === "function") {
      trace.effectOrder.push("onHostReady");
      onHostReady({
        passName: normalizedPassName,
        passCanvas,
        passContext,
      });
    }

    const layout = runGetter(trace, "getRenderPassLayout", normalizedPassName);
    let k = null;
    let drawInvoked = false;
    let drawResult;

    runEffect(trace, "withRenderTarget", passContext, () => {
      k = normalizedPassName === "hgoPreview"
        ? normalizeTransformScale(transform)
        : runEffect(trace, "prepareTargetContext", passContext, transform, layout);
      trace.effectOrder.push("drawFn");
      drawInvoked = true;
      drawResult = drawFn(k);
      return drawResult;
    });

    return createSummary({
      passName: normalizedPassName,
      k,
      hasPassCanvas: true,
      hasPassContext: true,
      drawInvoked,
      drawResult,
      trace,
    });
  }

  return Object.freeze({
    prepareRenderPassHost,
  });
}
