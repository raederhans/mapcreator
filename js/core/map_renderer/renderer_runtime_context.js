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

export function createRendererRuntimeContext(options = {}) {
  const {
    runtimeState,
    rendererSurfaceHost,
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
    surface: Object.freeze({
      host: rendererSurfaceHost,
    }),
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
        snapshot: sanitizeSurfaceSnapshot(context.diagnostics.getSnapshot()),
      }),
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
