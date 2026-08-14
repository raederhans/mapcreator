import test from "node:test";
import assert from "node:assert/strict";

import { strFromU8, unzipSync } from "../vendor/fflate.browser.js";
import { normalizeExportWorkbenchUiState } from "../js/core/state_defaults.js";
import {
  createExportArtifactPipeline,
  EXPORT_MAX_DIMENSION_PX,
} from "../js/ui/toolbar/export_artifact_pipeline.js";

function createCanvas(width = 0, height = 0) {
  const drawCalls = [];
  const context = {
    drawCalls,
    filter: "none",
    drawImage(...args) {
      drawCalls.push(args);
    },
  };
  return {
    width,
    height,
    context,
    getContext(kind) {
      return kind === "2d" ? context : null;
    },
    toDataURL(type, quality) {
      return `data:${type};quality=${quality}`;
    },
    toBlob(callback) {
      callback(new Blob([`canvas:${width}x${height}`], { type: "image/png" }));
    },
  };
}

function createDocumentHarness() {
  const canvases = [];
  const links = [];
  return {
    canvases,
    links,
    documentRef: {
      body: { appendChild() {} },
      getElementById() {
        return null;
      },
      createElement(tagName) {
        if (tagName === "canvas") {
          const canvas = createCanvas();
          canvases.push(canvas);
          return canvas;
        }
        const link = {
          clicked: false,
          removed: false,
          click() { this.clicked = true; },
          remove() { this.removed = true; },
        };
        links.push(link);
        return link;
      },
    },
  };
}

function createPipelineHarness({
  runtimeOverrides = {},
  exportUiOverrides = {},
  pipelineOverrides = {},
  documentHarness = createDocumentHarness(),
} = {}) {
  const sourceCanvas = createCanvas(400, 200);
  let colorRevision = 0;
  let baseWidth = 400;
  let baseHeight = 200;
  const runtimeModel = {
    get width() { return baseWidth; },
    get height() { return baseHeight; },
    get colorRevision() { return colorRevision; },
    dpr: 1,
    colorCanvas: sourceCanvas,
    lineCanvas: sourceCanvas,
    renderPassCache: { signatures: { background: "bg-1" } },
    exportWorkbenchUi: {
      ...normalizeExportWorkbenchUiState({
      layerOrder: ["background"],
      visibility: { background: true, political: false, context: false, effects: false, labels: false },
      textVisibility: { "render-labels": false, "special-zones": false, "svg-annotations": false },
        ...exportUiOverrides,
      }),
      bakeCache: new Map(),
    },
    ...runtimeOverrides,
  };
  const renderedPasses = [];
  const pipeline = createExportArtifactPipeline({
    state: runtimeModel,
    normalizeExportWorkbenchUiState,
    renderPassNames: ["background", "physicalBase", "political", "labels"],
    renderExportPassesToCanvas(passNames) {
      renderedPasses.push([...passNames]);
      return sourceCanvas;
    },
    documentRef: documentHarness.documentRef,
    now: () => 1234,
    ...pipelineOverrides,
  });
  return {
    ...documentHarness,
    pipeline,
    renderedPasses,
    runtimeModel,
    setBaseDimensions(width, height) {
      baseWidth = width;
      baseHeight = height;
    },
    setColorRevision(value) {
      colorRevision = value;
    },
    sourceCanvas,
  };
}

test("artifact pipeline reuses bake cache and invalidates it when dependencies change", async () => {
  const { pipeline, renderedPasses, runtimeModel, setColorRevision } = createPipelineHarness();
  const cache = runtimeModel.exportWorkbenchUi.bakeCache;
  const originalArtifacts = runtimeModel.exportWorkbenchUi.bakeArtifacts;

  const first = await pipeline.bakeLayer("color");
  const firstEntry = cache.get("color");
  assert.equal(firstEntry.version, 1);
  assert.equal(renderedPasses.length, 1);
  assert.notEqual(runtimeModel.exportWorkbenchUi.bakeArtifacts, originalArtifacts);
  assert.deepEqual(runtimeModel.exportWorkbenchUi.bakeArtifacts[0], {
    layerId: "color",
    updatedAt: 1234,
    dependencies: firstEntry.dependencies,
    canvasSize: { width: 400, height: 200 },
    dirtyFlag: true,
  });

  const cached = await pipeline.bakeLayer("color");
  assert.equal(cached, first);
  assert.equal(runtimeModel.exportWorkbenchUi.bakeCache, cache);
  assert.equal(renderedPasses.length, 1);
  assert.equal(runtimeModel.exportWorkbenchUi.bakeArtifacts[0].dirtyFlag, false);

  setColorRevision(1);
  const invalidated = await pipeline.bakeLayer("color");
  assert.notEqual(invalidated, cached);
  assert.equal(cache.get("color").version, 2);
  assert.equal(renderedPasses.length, 2);
  assert.equal(runtimeModel.exportWorkbenchUi.bakeArtifacts[0].dirtyFlag, true);
});

test("artifact pipeline writes bake metadata into the supplied export UI override", async () => {
  const { pipeline, runtimeModel } = createPipelineHarness();
  const canonicalArtifacts = runtimeModel.exportWorkbenchUi.bakeArtifacts;
  const exportUiOverride = {
    ...normalizeExportWorkbenchUiState({
      visibility: { background: true, political: false, context: false, effects: false, labels: false },
      textVisibility: { "render-labels": false, "special-zones": false, "svg-annotations": false },
    }),
    bakeCache: new Map(),
  };

  await pipeline.bakeLayer("color", exportUiOverride);

  assert.deepEqual(exportUiOverride.bakeArtifacts.map((entry) => entry.layerId), ["color"]);
  assert.equal(runtimeModel.exportWorkbenchUi.bakeArtifacts, canonicalArtifacts);
  assert.deepEqual(canonicalArtifacts, []);
});

test("artifact pipeline applies adjustments at the requested canvas budget", async () => {
  const { canvases, pipeline, runtimeModel, setBaseDimensions } = createPipelineHarness({
    exportUiOverrides: {
      adjustments: { brightness: 120, contrast: 110, saturation: 90, clarity: 100 },
    },
  });

  const output = await pipeline.buildCompositeExportCanvas(runtimeModel.exportWorkbenchUi, 2);
  assert.equal(output.width, 800);
  assert.equal(output.height, 400);
  assert.equal(output.context.drawCalls.at(-1)[3], 800);
  assert.equal(output.context.drawCalls.at(-1)[4], 400);
  assert.equal(output.context.filter, "none");
  assert.ok(canvases.length >= 2);

  setBaseDimensions(EXPORT_MAX_DIMENSION_PX, 100);
  await assert.rejects(
    () => pipeline.buildCompositeExportCanvas(runtimeModel.exportWorkbenchUi, 2),
    /Export size exceeds 8K cap/,
  );
});

test("artifact pipeline download adapters preserve filename and revoke object URLs", () => {
  const revoked = [];
  const scheduled = [];
  const urlApi = {
    createObjectURL() { return "blob:test-export"; },
    revokeObjectURL(value) { revoked.push(value); },
  };
  const { documentRef, links } = createDocumentHarness();
  const state = { exportWorkbenchUi: normalizeExportWorkbenchUiState({}) };
  const pipeline = createExportArtifactPipeline({
    state,
    normalizeExportWorkbenchUiState,
    renderPassNames: [],
    renderExportPassesToCanvas() { return null; },
    documentRef,
    urlApi,
    scheduleRevoke(callback) { scheduled.push(callback); },
  });

  pipeline.triggerBlobDownload(new Blob(["payload"]), "zip", "map_layers");
  assert.equal(links[0].href, "blob:test-export");
  assert.equal(links[0].download, "map_layers.zip");
  assert.equal(links[0].clicked, true);
  assert.equal(links[0].removed, true);
  assert.deepEqual(revoked, []);
  scheduled[0]();
  assert.deepEqual(revoked, ["blob:test-export"]);
});

test("artifact pipeline removes links and schedules URL cleanup when download click throws", () => {
  const revoked = [];
  const scheduled = [];
  const { documentRef, links } = createDocumentHarness();
  documentRef.createElement = () => {
    const link = {
      removed: false,
      click() { throw new Error("blocked click"); },
      remove() { this.removed = true; },
    };
    links.push(link);
    return link;
  };
  const pipeline = createExportArtifactPipeline({
    state: { exportWorkbenchUi: normalizeExportWorkbenchUiState({}) },
    normalizeExportWorkbenchUiState,
    renderPassNames: [],
    renderExportPassesToCanvas() { return null; },
    documentRef,
    urlApi: {
      createObjectURL() { return "blob:click-error"; },
      revokeObjectURL(value) { revoked.push(value); },
    },
    scheduleRevoke(callback) { scheduled.push(callback); },
  });

  assert.throws(() => pipeline.triggerBlobDownload(new Blob(["payload"]), "zip", "map_layers"), /blocked click/);
  assert.equal(links[0].removed, true);
  scheduled[0]();
  assert.deepEqual(revoked, ["blob:click-error"]);
});

test("artifact pipeline resolves SVG platform constructors from the document window and cleans URLs", async () => {
  const revoked = [];
  const drawCalls = [];
  const svgClone = {
    children: [],
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const mapSvg = { cloneNode() { return svgClone; } };
  class FakeSerializer {
    serializeToString(value) {
      assert.equal(value, svgClone);
      return "<svg></svg>";
    }
  }
  class SuccessfulImage {
    set src(value) {
      assert.equal(value, "blob:svg-success");
      queueMicrotask(() => this.onload());
    }
  }
  const documentHarness = createDocumentHarness();
  documentHarness.documentRef.getElementById = (id) => id === "map-svg" ? mapSvg : null;
  documentHarness.documentRef.defaultView = {
    XMLSerializer: FakeSerializer,
    Image: SuccessfulImage,
    Blob,
  };
  const { pipeline } = createPipelineHarness({
    documentHarness,
    pipelineOverrides: {
      urlApi: {
        createObjectURL() { return "blob:svg-success"; },
        revokeObjectURL(value) { revoked.push(value); },
      },
    },
  });
  const result = await pipeline.buildSingleExportSourceCanvas(
    { ...normalizeExportWorkbenchUiState({}), bakeCache: new Map() },
    "svg-annotations",
  );
  assert.equal(result.width, 400);
  assert.equal(result.context.drawCalls.length, 1);
  assert.deepEqual(revoked, ["blob:svg-success"]);
});

test("artifact pipeline rejects SVG image errors and still cleans the object URL", async () => {
  const revoked = [];
  class FailingImage {
    set src(_value) { queueMicrotask(() => this.onerror()); }
  }
  const documentHarness = createDocumentHarness();
  documentHarness.documentRef.getElementById = () => ({
    cloneNode() {
      return { children: [], querySelector() { return null; }, querySelectorAll() { return []; } };
    },
  });
  const { pipeline, runtimeModel } = createPipelineHarness({
    documentHarness,
    pipelineOverrides: {
      xmlSerializerCtor: class { serializeToString() { return "<svg></svg>"; } },
      imageCtor: FailingImage,
      blobCtor: Blob,
      urlApi: {
        createObjectURL() { return "blob:svg-error"; },
        revokeObjectURL(value) { revoked.push(value); },
      },
    },
  });

  await assert.rejects(
    () => pipeline.buildSingleExportSourceCanvas(runtimeModel.exportWorkbenchUi, "svg-annotations"),
    /SVG overlay export failed/,
  );
  assert.deepEqual(revoked, ["blob:svg-error"]);
});

test("artifact pipeline packages visible per-layer exports with scenario and project context", async () => {
  const { pipeline, renderedPasses, runtimeModel } = createPipelineHarness({
    runtimeOverrides: {
      activeScenarioId: "tno_1962",
      activeScenarioManifest: { version: 7 },
      scenarioBaselineHash: "baseline-1",
      dirtyRevision: 4,
      colorRevision: 5,
      topologyRevision: 6,
    },
    exportUiOverrides: {
      layerOrder: ["context", "background"],
      visibility: { background: true, political: false, context: true, effects: false, labels: false },
      textVisibility: { "render-labels": false, "special-zones": false, "svg-annotations": false },
    },
  });
  const artifact = await pipeline.buildPerLayerExportPackage(runtimeModel.exportWorkbenchUi, 1);
  const entries = unzipSync(new Uint8Array(await artifact.blob.arrayBuffer()));
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));

  assert.deepEqual(Object.keys(entries).sort(), ["layers/map_layer_background.png", "layers/map_layer_context.png", "manifest.json"]);
  assert.equal(manifest.artifactKind, "per-layer");
  assert.deepEqual(manifest.scenario, { id: "tno_1962", version: 7, baselineHash: "baseline-1" });
  assert.deepEqual(manifest.project, { dirtyRevision: 4, colorRevision: 5, topologyRevision: 6 });
  assert.equal(manifest.exportUi.visibility.context, true);
  assert.ok(renderedPasses.some((passes) => passes.join(",") === "contextBase,contextScenario"));
});

test("artifact pipeline packages the visible bake set and records the same export UI metadata", async () => {
  const { pipeline, runtimeModel } = createPipelineHarness({
    exportUiOverrides: {
      layerOrder: ["background"],
      target: "bake-pack",
      visibility: { background: true, political: false, context: false, effects: false, labels: false },
      textVisibility: { "render-labels": false, "special-zones": false, "svg-annotations": false },
    },
  });
  assert.deepEqual(pipeline.getBakePackLayerIds(runtimeModel.exportWorkbenchUi), ["color", "composite"]);
  const artifact = await pipeline.buildBakePackPackage(runtimeModel.exportWorkbenchUi, 1);
  const entries = unzipSync(new Uint8Array(await artifact.blob.arrayBuffer()));
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  const legacyMetadata = JSON.parse(strFromU8(entries["map_bake_manifest.json"]));

  assert.deepEqual(Object.keys(entries).sort(), [
    "layers/map_bake_color.png",
    "layers/map_bake_composite.png",
    "manifest.json",
    "map_bake_manifest.json",
  ]);
  assert.equal(manifest.artifactKind, "bake-pack");
  assert.deepEqual(manifest.files.map((file) => file.role), ["bake-layer", "bake-layer", "legacy-metadata"]);
  assert.deepEqual(legacyMetadata.files, ["map_bake_color.png", "map_bake_composite.png"]);
  assert.equal(legacyMetadata.exportUi.visibility.background, true);
  assert.deepEqual(legacyMetadata.bakeArtifacts.map((entry) => entry.layerId), ["color", "composite"]);
});
