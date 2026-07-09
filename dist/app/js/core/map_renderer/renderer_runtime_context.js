export const RENDERER_RUNTIME_CONTEXT_SCHEMA_VERSION = 1;

export const RENDERER_RUNTIME_CONTEXT_SECTION_IDS = Object.freeze([
  "state",
  "surface",
  "projection",
  "renderCache",
  "interaction",
  "diagnostics",
  "scheduling",
]);

const SURFACE_HOST_GETTER_NAMES = Object.freeze([
  "getContext",
  "getMapCanvas",
  "getMapSvg",
  "getProjection",
]);

const RENDER_CACHE_HELPER_NAMES = Object.freeze([
  "getTransformSignature",
  "getVisibleFrameIdentity",
]);

function describeValue(value) {
  return Object.freeze({
    present: value !== null && value !== undefined,
    type: value === null ? "null" : typeof value,
  });
}

function sanitizeSnapshotValue(value) {
  if (value && typeof value === "object") {
    const result = {};
    if (typeof value.present === "boolean") result.present = value.present;
    else result.present = true;
    if (typeof value.type === "string") result.type = value.type;
    else result.type = "object";
    if (typeof value.schemaVersion === "number") result.schemaVersion = value.schemaVersion;
    if (typeof value.ownerTag === "string") result.ownerTag = value.ownerTag;
    return Object.freeze(result);
  }
  return describeValue(value);
}

function sanitizeSurfaceSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return Object.freeze({});
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(snapshot).map(([key, value]) => [key, sanitizeSnapshotValue(value)]),
  ));
}

function hasSurfaceGetter(rendererSurfaceHost) {
  return SURFACE_HOST_GETTER_NAMES.some((getterName) => typeof rendererSurfaceHost[getterName] === "function");
}

function assertRendererSurfaceHost(rendererSurfaceHost) {
  if (!rendererSurfaceHost || typeof rendererSurfaceHost !== "object") {
    throw new TypeError("rendererSurfaceHost is required.");
  }
  if (typeof rendererSurfaceHost.snapshot !== "function") {
    throw new TypeError("rendererSurfaceHost.snapshot() is required.");
  }
  if (!hasSurfaceGetter(rendererSurfaceHost)) {
    throw new TypeError("rendererSurfaceHost must expose at least one renderer surface getter.");
  }
}

function freezeArrayConstant(name, value, { nonEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    throw new TypeError(`RendererRuntimeContext.renderCache.constants.${name} must be an array.`);
  }
  if (nonEmpty && value.length === 0) {
    throw new TypeError(`RendererRuntimeContext.renderCache.constants.${name} must be a non-empty array.`);
  }
  return Object.freeze([...value]);
}

function createReadonlyPassNameSet(passNames) {
  const passNameSet = new Set(passNames);
  return Object.freeze({
    get size() {
      return passNameSet.size;
    },
    has(passName) {
      return passNameSet.has(passName);
    },
    values() {
      return passNameSet.values();
    },
    keys() {
      return passNameSet.keys();
    },
    entries() {
      return passNameSet.entries();
    },
    forEach(callback, thisArg = undefined) {
      passNameSet.forEach((value) => callback.call(thisArg, value, value, this));
    },
    [Symbol.iterator]() {
      return passNameSet[Symbol.iterator]();
    },
  });
}

function normalizeTransformedFramePassNames(value) {
  if (value instanceof Set || Array.isArray(value)) {
    return createReadonlyPassNameSet(value);
  }
  throw new TypeError("RendererRuntimeContext.renderCache.constants.transformedFramePassNames must be a Set or array.");
}

function assertRenderCacheHelper(helpers, helperName) {
  if (typeof helpers?.[helperName] !== "function") {
    throw new TypeError(`RendererRuntimeContext.renderCache.helpers.${helperName} must be a function.`);
  }
}

function createSurfaceReadModel(rendererSurfaceHost) {
  return Object.freeze({
    host: rendererSurfaceHost,
    getHost() {
      return rendererSurfaceHost;
    },
    getMainContext() {
      return rendererSurfaceHost.getContext?.() || null;
    },
  });
}

function createRenderCacheReadModel(renderCache, runtimeState, rendererSurfaceHost) {
  if (renderCache === null || renderCache === undefined) {
    return null;
  }
  if (!renderCache || typeof renderCache !== "object") {
    throw new TypeError("RendererRuntimeContext.renderCache must be an object when provided.");
  }
  const constants = renderCache.constants || {};
  const helpers = renderCache.helpers || {};
  const renderPassOverscanRatioPerSide = Number(constants.renderPassOverscanRatioPerSide);
  if (!Number.isFinite(renderPassOverscanRatioPerSide)) {
    throw new TypeError("RendererRuntimeContext.renderCache.constants.renderPassOverscanRatioPerSide must be a finite number.");
  }
  for (const helperName of RENDER_CACHE_HELPER_NAMES) {
    assertRenderCacheHelper(helpers, helperName);
  }

  return Object.freeze({
    constants: Object.freeze({
      interactionCompositePassNames: freezeArrayConstant(
        "interactionCompositePassNames",
        constants.interactionCompositePassNames,
      ),
      renderPassNames: freezeArrayConstant("renderPassNames", constants.renderPassNames, { nonEmpty: true }),
      renderPassOverscanRatioPerSide,
      transformedFramePassNames: normalizeTransformedFramePassNames(constants.transformedFramePassNames),
    }),
    helpers: Object.freeze({
      getTransformSignature: helpers.getTransformSignature,
      getVisibleFrameIdentity: helpers.getVisibleFrameIdentity,
    }),
    getRuntimeState() {
      return runtimeState;
    },
    getSurfaceHost() {
      return rendererSurfaceHost;
    },
    getMainContext() {
      return rendererSurfaceHost.getContext?.() || null;
    },
  });
}

function getCollectionCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value.size === "number") return value.size;
  return 0;
}

function describeRenderCacheContext(renderCache) {
  if (renderCache === null || renderCache === undefined) {
    return Object.freeze({ present: false });
  }
  return Object.freeze({
    present: true,
    constants: Object.freeze({
      passCount: getCollectionCount(renderCache.constants?.renderPassNames),
      interactionCompositePassCount: getCollectionCount(renderCache.constants?.interactionCompositePassNames),
      transformedFramePassCount: getCollectionCount(renderCache.constants?.transformedFramePassNames),
      renderPassOverscanRatioPerSide: renderCache.constants?.renderPassOverscanRatioPerSide,
    }),
    helpers: Object.freeze({
      getTransformSignature: describeValue(renderCache.helpers?.getTransformSignature),
      getVisibleFrameIdentity: describeValue(renderCache.helpers?.getVisibleFrameIdentity),
    }),
    accessors: Object.freeze({
      getRuntimeState: describeValue(renderCache.getRuntimeState),
      getSurfaceHost: describeValue(renderCache.getSurfaceHost),
      getMainContext: describeValue(renderCache.getMainContext),
    }),
  });
}

function assertRenderCacheContext(renderCache) {
  if (renderCache === null || renderCache === undefined) {
    return;
  }
  if (!renderCache || typeof renderCache !== "object") {
    throw new TypeError("RendererRuntimeContext.renderCache must be an object.");
  }
  const constants = renderCache.constants;
  if (!constants || typeof constants !== "object") {
    throw new TypeError("RendererRuntimeContext.renderCache.constants is required.");
  }
  if (!Array.isArray(constants.renderPassNames) || constants.renderPassNames.length === 0) {
    throw new TypeError("RendererRuntimeContext.renderCache.constants.renderPassNames must be a non-empty array.");
  }
  if (!Array.isArray(constants.interactionCompositePassNames)) {
    throw new TypeError("RendererRuntimeContext.renderCache.constants.interactionCompositePassNames must be an array.");
  }
  if (
    !(constants.transformedFramePassNames instanceof Set)
    && !Array.isArray(constants.transformedFramePassNames)
    && typeof constants.transformedFramePassNames?.has !== "function"
  ) {
    throw new TypeError("RendererRuntimeContext.renderCache.constants.transformedFramePassNames must be a Set, array, or read-only membership set.");
  }
  if (!Number.isFinite(Number(constants.renderPassOverscanRatioPerSide))) {
    throw new TypeError("RendererRuntimeContext.renderCache.constants.renderPassOverscanRatioPerSide must be a finite number.");
  }
  for (const helperName of RENDER_CACHE_HELPER_NAMES) {
    assertRenderCacheHelper(renderCache.helpers, helperName);
  }
  if (typeof renderCache.getRuntimeState !== "function") {
    throw new TypeError("RendererRuntimeContext.renderCache.getRuntimeState() is required.");
  }
  if (typeof renderCache.getSurfaceHost !== "function") {
    throw new TypeError("RendererRuntimeContext.renderCache.getSurfaceHost() is required.");
  }
  if (typeof renderCache.getMainContext !== "function") {
    throw new TypeError("RendererRuntimeContext.renderCache.getMainContext() is required.");
  }
}

export function createRendererRuntimeContext(options = {}) {
  const {
    runtimeState,
    rendererSurfaceHost,
    renderCache = null,
    ownerTag = "map-renderer",
    createdAt = new Date().toISOString(),
  } = options;

  if (!runtimeState || typeof runtimeState !== "object") {
    throw new TypeError("runtimeState is required.");
  }
  assertRendererSurfaceHost(rendererSurfaceHost);

  const context = {
    schemaVersion: RENDERER_RUNTIME_CONTEXT_SCHEMA_VERSION,
    state: Object.freeze({
      runtimeState,
    }),
    surface: createSurfaceReadModel(rendererSurfaceHost),
    renderCache: createRenderCacheReadModel(renderCache, runtimeState, rendererSurfaceHost),
    diagnostics: Object.freeze({
      getSnapshot() {
        return sanitizeSurfaceSnapshot(rendererSurfaceHost.snapshot());
      },
    }),
    lifecycle: Object.freeze({
      createdAt,
      ownerTag,
    }),
  };

  return Object.freeze(context);
}

export function assertRendererRuntimeContext(context) {
  if (!context || typeof context !== "object") {
    throw new TypeError("RendererRuntimeContext is required.");
  }
  if (context.schemaVersion !== RENDERER_RUNTIME_CONTEXT_SCHEMA_VERSION) {
    throw new TypeError("RendererRuntimeContext schemaVersion is invalid.");
  }
  if (!context.state || !context.state.runtimeState || typeof context.state.runtimeState !== "object") {
    throw new TypeError("RendererRuntimeContext.state.runtimeState is required.");
  }
  if (!context.surface || !context.surface.host) {
    throw new TypeError("RendererRuntimeContext.surface.host is required.");
  }
  assertRendererSurfaceHost(context.surface.host);
  if (typeof context.surface.getMainContext !== "function") {
    throw new TypeError("RendererRuntimeContext.surface.getMainContext() is required.");
  }
  assertRenderCacheContext(context.renderCache);
  if (!context.diagnostics || typeof context.diagnostics.getSnapshot !== "function") {
    throw new TypeError("RendererRuntimeContext.diagnostics.getSnapshot() is required.");
  }
  if (!context.lifecycle || typeof context.lifecycle.ownerTag !== "string") {
    throw new TypeError("RendererRuntimeContext.lifecycle.ownerTag is required.");
  }
  return context;
}

export function describeRendererRuntimeContext(context) {
  assertRendererRuntimeContext(context);
  return Object.freeze({
    schemaVersion: context.schemaVersion,
    sections: Object.freeze({
      state: Object.freeze({
        runtimeState: describeValue(context.state.runtimeState),
      }),
      surface: Object.freeze({
        host: describeValue(context.surface.host),
        getMainContext: describeValue(context.surface.getMainContext),
        snapshot: sanitizeSurfaceSnapshot(context.diagnostics.getSnapshot()),
      }),
      renderCache: describeRenderCacheContext(context.renderCache),
      diagnostics: Object.freeze({
        getSnapshot: describeValue(context.diagnostics.getSnapshot),
      }),
      lifecycle: Object.freeze({
        createdAt: context.lifecycle.createdAt,
        ownerTag: context.lifecycle.ownerTag,
      }),
    }),
    sectionIds: RENDERER_RUNTIME_CONTEXT_SECTION_IDS,
  });
}
