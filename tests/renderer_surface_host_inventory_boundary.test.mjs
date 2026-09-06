import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

function readRepoFile(...parts) {
  const absolutePath = path.join(REPO_ROOT, ...parts);
  assert.ok(fs.existsSync(absolutePath), `Expected repository file to exist: ${parts.join("/")}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function listProjectSourceFiles(rootRelativePath) {
  const root = path.join(REPO_ROOT, rootRelativePath);
  const results = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile() && /\.m?js$/.test(entry.name)) {
        results.push(path.relative(REPO_ROOT, absolutePath).replaceAll(path.sep, "/"));
      }
    }
  }
  return results.sort();
}

function assertIncludes(source, token, message) {
  assert.ok(source.includes(token), `${message}: missing token ${JSON.stringify(token)}`);
}

function assertExcludes(source, token, message) {
  assert.equal(source.includes(token), false, `${message}: unexpected token ${JSON.stringify(token)}`);
}

// Public registry behavior and live owner getters are exercised in the behavior suite.
// Keep the dependency and composition boundaries here, without duplicating internals.
test("surface host stays independent of renderer semantics", () => {
  const hostSource = readRepoFile("js", "core", "renderer", "renderer_surface_host.js");

  for (const token of [
    "map_renderer.js",
    "runtimeState",
    "from \"../state.js\"",
    "from \"./state.js\"",
    "drawCanvas",
    "updateMap",
    "renderPassToCache",
    "buildHitCanvas",
    "applyDevSelectionFill",
    "renderExportPassesToCanvas",
    "renderLegend",
    "projectGeoToScreen",
    "invalidateRenderPasses",
    "requestInteractionRender",
    "requestRendererRender",
    "setMapData",
    "buildInteractionInfrastructureAfterStartup",
    "handleResize",
    "fitProjection",
    "initZoom",
    "bindEvents",
  ]) {
    assertExcludes(hostSource, token, "surface host must stay a handle registry without renderer semantics");
  }
});

test("map_renderer delegates surface handle storage to the host", () => {
  const rendererSource = readRepoFile("js", "core", "map_renderer.js");

  assertIncludes(
    rendererSource,
    'import { createRendererSurfaceHost } from "./renderer/renderer_surface_host.js";',
    "map_renderer must import the surface host",
  );
  assertIncludes(
    rendererSource,
    'import { createRendererSurfaceLifecycleOwner } from "./renderer/renderer_surface_lifecycle_owner.js";',
    "map_renderer must import the surface lifecycle owner",
  );
  assertIncludes(
    rendererSource,
    'import { createRendererProjectionPathOwner } from "./renderer/renderer_projection_path_owner.js";',
    "map_renderer must import the projection/path owner",
  );
  assertIncludes(rendererSource, "const rendererSurfaceHost = createRendererSurfaceHost();", "map_renderer must instantiate one surface host");

  for (const sourcePath of listProjectSourceFiles("js")) {
    if (sourcePath === "js/core/map_renderer.js") continue;
    const source = readRepoFile(sourcePath);
    assertExcludes(source, "renderer_surface_host.js", "only map_renderer may import the production surface host");
  }

  for (const token of [
    "getRendererSurfaceLifecycleOwner().resolveDomHandles({ containerId });",
    "getRendererSurfaceLifecycleOwner().ensureCanvasLayerHandles({",
    "getRendererSurfaceLifecycleOwner().ensureHitCanvasHandle();",
    "getRendererSurfaceLifecycleOwner().acquireCanvasContexts();",
    "getRendererProjectionPathOwner().initializeProjectionPaths();",
    "rendererSurfaceHost.setZoomBehavior(nextZoomBehavior)",
  ]) {
    assertIncludes(rendererSource, token, "map_renderer must compose surface handle writes through the host and lifecycle owner");
  }
});
