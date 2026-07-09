export const RENDERER_RUNTIME_CONTEXT_SCHEMA_VERSION = 1;

export const RENDERER_RUNTIME_CONTEXT_SECTION_IDS = Object.freeze([
  "state",
  "surface",
  "projection",
  "viewport",
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

const PROJECTION_HELPER_NAMES = Object.freeze([
  "getD3",
]);

const PROJECTION_ACCESSOR_NAMES = Object.freeze([
  "getProjection",
  "getPathSvg",
  "getPathCanvas",
  "getPathHitCanvas",
  "getContext",
  "getHitContext",
]);

const VIEWPORT_HELPER_NAMES = Object.freeze([
  "getLogicalCanvasDimensions",
  "getRenderableLandFeatures",
  "getProjectedFeatureBounds",
  "shouldSkipFeature",
  "getFeatureId",
  "getHgoRuntimePreviewBounds",
  "isHgoRuntimePreviewReady",
  "getZoomIdentity",
  "getD3",
]);

const VIEWPORT_ACCESSOR_NAMES = Object.freeze([
  "getRuntimeState",
  "getSurfaceHost",
  "getProjection",
  "getPathSvg",
  "getZoomBehavior",
  "getInteractionRect",
  "getMapContainer",
  "getViewportGroup",
  "getGlobal",
  "getDevicePixelRatio",
  "hasLandFeatures",
]);

const INTERACTION_HELPER_NAMES = Object.freeze([
  "cloneZoomTransform",
  "shouldAllowZoomEvent",
]);

const INTERACTION_ACCESSOR_NAMES = Object.freeze([
  "getRuntimeState",
  "getSurfaceHost",
  "getD3",
  "getWidth",
  "getHeight",
  "getInteractionRect",
  "getInteractionRectNode",
  "getWindow",
  "getZoomBehavior",
  "getZoomIdentity",
  "getZoomTransform",
  "getPendingZoomTransform",
  "getZoomGestureStartTransform",
  "isZoomRenderScheduled",
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

function assertSectionFunction(sectionName, groupName, group, functionName) {
  if (typeof group?.[functionName] !== "function") {
    throw new TypeError(`RendererRuntimeContext.${sectionName}.${groupName}.${functionName} must be a function.`);
  }
}

function readFiniteNumber(sectionName, name, value, { optional = false } = {}) {
  if (optional && (value === null || value === undefined)) {
    return undefined;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new TypeError(`RendererRuntimeContext.${sectionName}.constants.${name} must be a finite number.`);
  }
  return numberValue;
}

function readNonEmptyString(sectionName, name, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`RendererRuntimeContext.${sectionName}.constants.${name} must be a non-empty string.`);
  }
  return value;
}

function createFunctionGroup(sectionName, groupName, source, functionNames) {
  const group = {};
  for (const functionName of functionNames) {
    assertSectionFunction(sectionName, groupName, source, functionName);
    group[functionName] = source[functionName];
  }
  return Object.freeze(group);
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

function createProjectionReadModel(projection) {
  if (projection === null || projection === undefined) {
    return null;
  }
  if (!projection || typeof projection !== "object") {
    throw new TypeError("RendererRuntimeContext.projection must be an object when provided.");
  }
  const constants = projection.constants || {};
  const helpers = projection.helpers || {};
  const accessors = projection.accessors || {};
  const projectionFitPaddingRatio = readFiniteNumber(
    "projection",
    "projectionFitPaddingRatio",
    constants.projectionFitPaddingRatio,
    { optional: true },
  );
  const projectionConstants = {
    projectionPrecision: readFiniteNumber("projection", "projectionPrecision", constants.projectionPrecision),
    pathPointRadius: readFiniteNumber("projection", "pathPointRadius", constants.pathPointRadius),
  };
  if (projectionFitPaddingRatio !== undefined) {
    projectionConstants.projectionFitPaddingRatio = projectionFitPaddingRatio;
  }
  const projectionHelpers = createFunctionGroup("projection", "helpers", helpers, PROJECTION_HELPER_NAMES);
  const projectionAccessors = createFunctionGroup("projection", "accessors", accessors, PROJECTION_ACCESSOR_NAMES);

  return Object.freeze({
    constants: Object.freeze(projectionConstants),
    helpers: projectionHelpers,
    getProjection: projectionAccessors.getProjection,
    getPathSvg: projectionAccessors.getPathSvg,
    getPathCanvas: projectionAccessors.getPathCanvas,
    getPathHitCanvas: projectionAccessors.getPathHitCanvas,
    getContext: projectionAccessors.getContext,
    getHitContext: projectionAccessors.getHitContext,
  });
}

function createViewportReadModel(viewport, runtimeState, rendererSurfaceHost) {
  if (viewport === null || viewport === undefined) {
    return null;
  }
  if (!viewport || typeof viewport !== "object") {
    throw new TypeError("RendererRuntimeContext.viewport must be an object when provided.");
  }
  const constants = viewport.constants || {};
  const helpers = viewport.helpers || {};
  const accessors = viewport.accessors || {};
  const mapPanPaddingPx = readFiniteNumber("viewport", "mapPanPaddingPx", constants.mapPanPaddingPx);
  const minZoomScale = readFiniteNumber("viewport", "minZoomScale", constants.minZoomScale);
  const maxZoomScale = readFiniteNumber("viewport", "maxZoomScale", constants.maxZoomScale);
  const projectionFitPaddingRatio = readFiniteNumber(
    "viewport",
    "projectionFitPaddingRatio",
    constants.projectionFitPaddingRatio,
  );
  if (minZoomScale >= maxZoomScale) {
    throw new TypeError("RendererRuntimeContext.viewport.constants.minZoomScale must be less than maxZoomScale.");
  }
  const viewportHelpers = createFunctionGroup("viewport", "helpers", helpers, VIEWPORT_HELPER_NAMES);
  const viewportAccessors = createFunctionGroup("viewport", "accessors", accessors, VIEWPORT_ACCESSOR_NAMES);

  return Object.freeze({
    constants: Object.freeze({
      mapPanPaddingPx,
      minZoomScale,
      maxZoomScale,
      projectionFitPaddingRatio,
    }),
    helpers: viewportHelpers,
    getRuntimeState: viewportAccessors.getRuntimeState,
    getSurfaceHost: viewportAccessors.getSurfaceHost,
    getProjection: viewportAccessors.getProjection,
    getPathSvg: viewportAccessors.getPathSvg,
    getZoomBehavior: viewportAccessors.getZoomBehavior,
    getInteractionRect: viewportAccessors.getInteractionRect,
    getMapContainer: viewportAccessors.getMapContainer,
    getViewportGroup: viewportAccessors.getViewportGroup,
    getGlobal: viewportAccessors.getGlobal,
    getDevicePixelRatio: viewportAccessors.getDevicePixelRatio,
    hasLandFeatures: viewportAccessors.hasLandFeatures,
  });
}

function createInteractionReadModel(interaction) {
  if (interaction === null || interaction === undefined) {
    return null;
  }
  if (!interaction || typeof interaction !== "object") {
    throw new TypeError("RendererRuntimeContext.interaction must be an object when provided.");
  }
  const constants = interaction.constants || {};
  const helpers = interaction.helpers || {};
  const accessors = interaction.accessors || {};
  const minZoomScale = readFiniteNumber("interaction", "minZoomScale", constants.minZoomScale);
  const maxZoomScale = readFiniteNumber("interaction", "maxZoomScale", constants.maxZoomScale);
  if (minZoomScale >= maxZoomScale) {
    throw new TypeError("RendererRuntimeContext.interaction.constants.minZoomScale must be less than maxZoomScale.");
  }
  const interactionHelpers = createFunctionGroup(
    "interaction",
    "helpers",
    helpers,
    INTERACTION_HELPER_NAMES,
  );
  const interactionAccessors = createFunctionGroup(
    "interaction",
    "accessors",
    accessors,
    INTERACTION_ACCESSOR_NAMES,
  );

  return Object.freeze({
    constants: Object.freeze({
      minZoomScale,
      maxZoomScale,
      renderPhaseInteracting: readNonEmptyString(
        "interaction",
        "renderPhaseInteracting",
        constants.renderPhaseInteracting,
      ),
      renderPhaseSettling: readNonEmptyString(
        "interaction",
        "renderPhaseSettling",
        constants.renderPhaseSettling,
      ),
    }),
    helpers: interactionHelpers,
    getRuntimeState: interactionAccessors.getRuntimeState,
    getSurfaceHost: interactionAccessors.getSurfaceHost,
    getD3: interactionAccessors.getD3,
    getWidth: interactionAccessors.getWidth,
    getHeight: interactionAccessors.getHeight,
    getInteractionRect: interactionAccessors.getInteractionRect,
    getInteractionRectNode: interactionAccessors.getInteractionRectNode,
    getWindow: interactionAccessors.getWindow,
    getZoomBehavior: interactionAccessors.getZoomBehavior,
    getZoomIdentity: interactionAccessors.getZoomIdentity,
    getZoomTransform: interactionAccessors.getZoomTransform,
    getPendingZoomTransform: interactionAccessors.getPendingZoomTransform,
    getZoomGestureStartTransform: interactionAccessors.getZoomGestureStartTransform,
    isZoomRenderScheduled: interactionAccessors.isZoomRenderScheduled,
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

function describeFunctionGroup(source, functionNames) {
  return Object.freeze(Object.fromEntries(
    functionNames.map((functionName) => [functionName, describeValue(source?.[functionName])]),
  ));
}

function describeProjectionContext(projection) {
  if (projection === null || projection === undefined) {
    return Object.freeze({ present: false });
  }
  return Object.freeze({
    present: true,
    constants: Object.freeze({
      projectionPrecision: projection.constants?.projectionPrecision,
      pathPointRadius: projection.constants?.pathPointRadius,
      projectionFitPaddingRatio: projection.constants?.projectionFitPaddingRatio,
    }),
    helpers: describeFunctionGroup(projection.helpers, PROJECTION_HELPER_NAMES),
    accessors: describeFunctionGroup(projection, PROJECTION_ACCESSOR_NAMES),
  });
}

function describeViewportContext(viewport) {
  if (viewport === null || viewport === undefined) {
    return Object.freeze({ present: false });
  }
  return Object.freeze({
    present: true,
    constants: Object.freeze({
      mapPanPaddingPx: viewport.constants?.mapPanPaddingPx,
      minZoomScale: viewport.constants?.minZoomScale,
      maxZoomScale: viewport.constants?.maxZoomScale,
      projectionFitPaddingRatio: viewport.constants?.projectionFitPaddingRatio,
    }),
    helpers: describeFunctionGroup(viewport.helpers, VIEWPORT_HELPER_NAMES),
    accessors: describeFunctionGroup(viewport, VIEWPORT_ACCESSOR_NAMES),
  });
}

function describeInteractionContext(interaction) {
  if (interaction === null || interaction === undefined) {
    return Object.freeze({ present: false });
  }
  return Object.freeze({
    present: true,
    constants: Object.freeze({
      minZoomScale: interaction.constants?.minZoomScale,
      maxZoomScale: interaction.constants?.maxZoomScale,
      renderPhaseInteracting: interaction.constants?.renderPhaseInteracting,
      renderPhaseSettling: interaction.constants?.renderPhaseSettling,
    }),
    helpers: describeFunctionGroup(interaction.helpers, INTERACTION_HELPER_NAMES),
    accessors: describeFunctionGroup(interaction, INTERACTION_ACCESSOR_NAMES),
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

function assertProjectionContext(projection) {
  if (projection === null || projection === undefined) {
    return;
  }
  if (!projection || typeof projection !== "object") {
    throw new TypeError("RendererRuntimeContext.projection must be an object.");
  }
  if (!projection.constants || typeof projection.constants !== "object") {
    throw new TypeError("RendererRuntimeContext.projection.constants is required.");
  }
  readFiniteNumber("projection", "projectionPrecision", projection.constants.projectionPrecision);
  readFiniteNumber("projection", "pathPointRadius", projection.constants.pathPointRadius);
  readFiniteNumber(
    "projection",
    "projectionFitPaddingRatio",
    projection.constants.projectionFitPaddingRatio,
    { optional: true },
  );
  for (const helperName of PROJECTION_HELPER_NAMES) {
    assertSectionFunction("projection", "helpers", projection.helpers, helperName);
  }
  for (const accessorName of PROJECTION_ACCESSOR_NAMES) {
    assertSectionFunction("projection", "accessors", projection, accessorName);
  }
}

function assertViewportContext(viewport) {
  if (viewport === null || viewport === undefined) {
    return;
  }
  if (!viewport || typeof viewport !== "object") {
    throw new TypeError("RendererRuntimeContext.viewport must be an object.");
  }
  if (!viewport.constants || typeof viewport.constants !== "object") {
    throw new TypeError("RendererRuntimeContext.viewport.constants is required.");
  }
  const minZoomScale = readFiniteNumber("viewport", "minZoomScale", viewport.constants.minZoomScale);
  const maxZoomScale = readFiniteNumber("viewport", "maxZoomScale", viewport.constants.maxZoomScale);
  readFiniteNumber("viewport", "mapPanPaddingPx", viewport.constants.mapPanPaddingPx);
  readFiniteNumber("viewport", "projectionFitPaddingRatio", viewport.constants.projectionFitPaddingRatio);
  if (minZoomScale >= maxZoomScale) {
    throw new TypeError("RendererRuntimeContext.viewport.constants.minZoomScale must be less than maxZoomScale.");
  }
  for (const helperName of VIEWPORT_HELPER_NAMES) {
    assertSectionFunction("viewport", "helpers", viewport.helpers, helperName);
  }
  for (const accessorName of VIEWPORT_ACCESSOR_NAMES) {
    assertSectionFunction("viewport", "accessors", viewport, accessorName);
  }
}

function assertInteractionContext(interaction) {
  if (interaction === null || interaction === undefined) {
    return;
  }
  if (!interaction || typeof interaction !== "object") {
    throw new TypeError("RendererRuntimeContext.interaction must be an object.");
  }
  if (!interaction.constants || typeof interaction.constants !== "object") {
    throw new TypeError("RendererRuntimeContext.interaction.constants is required.");
  }
  const minZoomScale = readFiniteNumber("interaction", "minZoomScale", interaction.constants.minZoomScale);
  const maxZoomScale = readFiniteNumber("interaction", "maxZoomScale", interaction.constants.maxZoomScale);
  if (minZoomScale >= maxZoomScale) {
    throw new TypeError("RendererRuntimeContext.interaction.constants.minZoomScale must be less than maxZoomScale.");
  }
  readNonEmptyString(
    "interaction",
    "renderPhaseInteracting",
    interaction.constants.renderPhaseInteracting,
  );
  readNonEmptyString(
    "interaction",
    "renderPhaseSettling",
    interaction.constants.renderPhaseSettling,
  );
  for (const helperName of INTERACTION_HELPER_NAMES) {
    assertSectionFunction("interaction", "helpers", interaction.helpers, helperName);
  }
  for (const accessorName of INTERACTION_ACCESSOR_NAMES) {
    assertSectionFunction("interaction", "accessors", interaction, accessorName);
  }
}

export function createRendererRuntimeContext(options = {}) {
  const {
    runtimeState,
    rendererSurfaceHost,
    projection = null,
    viewport = null,
    renderCache = null,
    interaction = null,
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
    projection: createProjectionReadModel(projection),
    viewport: createViewportReadModel(viewport, runtimeState, rendererSurfaceHost),
    renderCache: createRenderCacheReadModel(renderCache, runtimeState, rendererSurfaceHost),
    interaction: createInteractionReadModel(interaction),
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
  assertProjectionContext(context.projection);
  assertViewportContext(context.viewport);
  assertRenderCacheContext(context.renderCache);
  assertInteractionContext(context.interaction);
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
      projection: describeProjectionContext(context.projection),
      viewport: describeViewportContext(context.viewport),
      renderCache: describeRenderCacheContext(context.renderCache),
      interaction: describeInteractionContext(context.interaction),
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
