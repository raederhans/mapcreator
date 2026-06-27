function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new TypeError(`renderer surface lifecycle owner requires ${name}`);
  }
  return value;
}

function requireFunction(owner, name, ownerName) {
  if (typeof owner?.[name] !== "function") {
    throw new TypeError(`renderer surface lifecycle owner requires ${ownerName}.${name}`);
  }
  return owner[name].bind(owner);
}

function requireCanvasLayerNames(names) {
  const requiredNames = ["composite", "politicalPatch", "interactionOverlay"];
  for (const name of requiredNames) {
    if (!names?.[name]) {
      throw new TypeError(`renderer surface lifecycle owner requires canvasLayerManager.CANVAS_LAYER_NAMES.${name}`);
    }
  }
  return names;
}

export function createRendererSurfaceLifecycleOwner({
  surfaceHost,
  getters = {},
  helpers = {},
  canvasLayerManager = {},
} = {}) {
  const host = requireObject(surfaceHost, "surfaceHost");
  const getDocument = requireFunction(getters, "getDocument", "getters");
  const createHitCanvasElement = requireFunction(helpers, "createHitCanvasElement", "helpers");
  const ensureCanvasLayers = requireFunction(canvasLayerManager, "ensureCanvasLayers", "canvasLayerManager");
  const getCanvasLayer = requireFunction(canvasLayerManager, "getCanvasLayer", "canvasLayerManager");
  const CANVAS_LAYER_NAMES = requireCanvasLayerNames(canvasLayerManager.CANVAS_LAYER_NAMES);

  const hostApi = Object.freeze({
    getHitCanvas: requireFunction(host, "getHitCanvas", "surfaceHost"),
    getMapCanvas: requireFunction(host, "getMapCanvas", "surfaceHost"),
    getMapContainer: requireFunction(host, "getMapContainer", "surfaceHost"),
    getPoliticalPatchCanvas: requireFunction(host, "getPoliticalPatchCanvas", "surfaceHost"),
    getInteractionOverlayCanvas: requireFunction(host, "getInteractionOverlayCanvas", "surfaceHost"),
    setCanvasLayers: requireFunction(host, "setCanvasLayers", "surfaceHost"),
    setContext: requireFunction(host, "setContext", "surfaceHost"),
    setHitCanvas: requireFunction(host, "setHitCanvas", "surfaceHost"),
    setHitContext: requireFunction(host, "setHitContext", "surfaceHost"),
    setInteractionOverlayCanvas: requireFunction(host, "setInteractionOverlayCanvas", "surfaceHost"),
    setInteractionOverlayContext: requireFunction(host, "setInteractionOverlayContext", "surfaceHost"),
    setMapCanvas: requireFunction(host, "setMapCanvas", "surfaceHost"),
    setMapContainer: requireFunction(host, "setMapContainer", "surfaceHost"),
    setPoliticalPatchCanvas: requireFunction(host, "setPoliticalPatchCanvas", "surfaceHost"),
    setPoliticalPatchContext: requireFunction(host, "setPoliticalPatchContext", "surfaceHost"),
    setTooltip: requireFunction(host, "setTooltip", "surfaceHost"),
  });

  function getRequiredDocument() {
    const documentRef = getDocument();
    if (!documentRef || typeof documentRef.getElementById !== "function") {
      throw new TypeError("renderer surface lifecycle owner requires a document with getElementById");
    }
    return documentRef;
  }

  function getRequiredHandle(name, value) {
    if (!value) {
      throw new TypeError(`renderer surface lifecycle owner requires surfaceHost.${name}`);
    }
    return value;
  }

  function resolveDomHandles({ containerId = "mapContainer" } = {}) {
    const documentRef = getRequiredDocument();
    const mapContainer = hostApi.setMapContainer(documentRef.getElementById(containerId));
    const tooltip = hostApi.setTooltip(documentRef.getElementById("tooltip"));
    return { mapContainer, tooltip };
  }

  function ensureCanvasLayerHandles({ before = null } = {}) {
    const mapContainer = getRequiredHandle("mapContainer", hostApi.getMapContainer());
    const nextCanvasLayers = hostApi.setCanvasLayers(ensureCanvasLayers(mapContainer, { before }));
    const mapLayer = getCanvasLayer(nextCanvasLayers, CANVAS_LAYER_NAMES.composite);
    const patchLayer = getCanvasLayer(nextCanvasLayers, CANVAS_LAYER_NAMES.politicalPatch);
    const interactionLayer = getCanvasLayer(nextCanvasLayers, CANVAS_LAYER_NAMES.interactionOverlay);
    const mapCanvas = hostApi.setMapCanvas(mapLayer?.canvas || null);
    const politicalPatchCanvas = hostApi.setPoliticalPatchCanvas(patchLayer?.canvas || null);
    const interactionOverlayCanvas = hostApi.setInteractionOverlayCanvas(interactionLayer?.canvas || null);
    return {
      canvasLayers: nextCanvasLayers,
      mapCanvas,
      politicalPatchCanvas,
      interactionOverlayCanvas,
    };
  }

  function ensureHitCanvasHandle() {
    const currentHitCanvas = hostApi.getHitCanvas();
    if (currentHitCanvas) return currentHitCanvas;
    return hostApi.setHitCanvas(createHitCanvasElement());
  }

  function acquireCanvasContexts() {
    const mapCanvas = getRequiredHandle("mapCanvas", hostApi.getMapCanvas());
    const hitCanvas = getRequiredHandle("hitCanvas", hostApi.getHitCanvas());
    const context = hostApi.setContext(mapCanvas.getContext("2d"));
    const politicalPatchContext = hostApi.setPoliticalPatchContext(
      hostApi.getPoliticalPatchCanvas()?.getContext?.("2d") || null,
    );
    const interactionOverlayContext = hostApi.setInteractionOverlayContext(
      hostApi.getInteractionOverlayCanvas()?.getContext?.("2d") || null,
    );
    const hitContext = hostApi.setHitContext(hitCanvas.getContext("2d", { willReadFrequently: true }));
    return {
      context,
      politicalPatchContext,
      interactionOverlayContext,
      hitContext,
    };
  }

  return Object.freeze({
    acquireCanvasContexts,
    ensureCanvasLayerHandles,
    ensureHitCanvasHandle,
    resolveDomHandles,
  });
}
