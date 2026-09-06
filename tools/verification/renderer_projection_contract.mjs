import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { parse } = require("acorn");
const walk = require("acorn-walk");

const REPO_ROOT = process.cwd();

export const PROJECTION_CONTRACT_PATHS = Object.freeze({
  renderer: "js/core/map_renderer.js",
  publicFacade: "js/core/map_renderer/public.js",
  projectionOwner: "js/core/renderer/renderer_projection_path_owner.js",
  surfaceLifecycle: "js/core/renderer/renderer_surface_lifecycle_owner.js",
  surfaceHost: "js/core/renderer/renderer_surface_host.js",
  projectedBounds: "js/core/renderer/projected_geometry_bounds_owner.js",
  viewportReadModel: "js/core/renderer/viewport_read_model_owner.js",
  preflight: "docs/active/renderer-projection-path-lifecycle-preflight-20260627.md",
  packageJson: "package.json",
});

export const PROJECTION_STATIC_NORMALIZED_NAMES = Object.freeze([
  "projection/path owner remains scoped to handle initialization",
  "map_renderer remains the projection/path composition root",
  "surface lifecycle remains mechanical-only for projection/path concerns",
  "surface host remains the projection/path handle registry",
  "projection consumers receive handles without importing map_renderer",
  "renderer owner imports remain inward-facing",
  "projection lifecycle preflight remains explicit",
  "package exposes the canonical projection contract",
  "owner construction receives projection and viewport dependencies",
  "renderer owners stay behind the public facade boundary",
]);

function memberPath(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "ThisExpression") return "this";
  if (node.type === "ChainExpression") return memberPath(node.expression);
  if (node.type === "CallExpression") return memberPath(node.callee);
  if (node.type !== "MemberExpression") return null;
  const object = memberPath(node.object);
  const property = node.computed
    ? (node.property.type === "Literal" ? String(node.property.value) : memberPath(node.property))
    : node.property.name;
  return object && property ? `${object}.${property}` : null;
}

function propertyName(node) {
  if (!node) return null;
  if (!node.computed && node.key?.type === "Identifier") return node.key.name;
  if (node.key?.type === "Literal") return String(node.key.value);
  return null;
}

function functionName(node, ancestors) {
  if (node.id?.name) return node.id.name;
  const parent = ancestors.at(-2);
  if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") return parent.id.name;
  if (parent?.type === "Property" || parent?.type === "MethodDefinition") return propertyName(parent);
  return null;
}

function factsForFunction(node) {
  const calls = [];
  const assignments = [];
  const identifiers = new Set();
  const properties = new Set();
  const collectPattern = (pattern) => {
    if (!pattern) return;
    if (pattern.type === "Identifier") {
      identifiers.add(pattern.name);
      return;
    }
    if (pattern.type === "Property") {
      const name = propertyName(pattern);
      if (name) properties.add(name);
      collectPattern(pattern.value);
      return;
    }
    if (pattern.type === "RestElement") {
      collectPattern(pattern.argument);
      return;
    }
    if (pattern.type === "AssignmentPattern") {
      collectPattern(pattern.left);
      return;
    }
    for (const entry of pattern.elements || pattern.properties || []) collectPattern(entry);
  };
  const visitors = {
    FunctionDeclaration() {},
    FunctionExpression() {},
    ArrowFunctionExpression() {},
    ClassDeclaration() {},
    ClassExpression() {},
    Identifier(child) {
      identifiers.add(child.name);
    },
    VariableDeclarator(child, state, recurse) {
      collectPattern(child.id);
      if (child.init) recurse(child.init, state);
    },
    Property(child, state, recurse) {
      const name = propertyName(child);
      if (name) properties.add(name);
      walk.base.Property(child, state, recurse);
    },
    CallExpression(child, state, recurse) {
      calls.push({ callee: memberPath(child.callee), start: child.start });
      walk.base.CallExpression(child, state, recurse);
    },
    AssignmentExpression(child, state, recurse) {
      assignments.push({ target: memberPath(child.left), start: child.start });
      walk.base.AssignmentExpression(child, state, recurse);
    },
    UpdateExpression(child, state, recurse) {
      assignments.push({ target: memberPath(child.argument), start: child.start });
      walk.base.UpdateExpression(child, state, recurse);
    },
  };
  walk.recursive(node.body, null, visitors, walk.base);
  return Object.freeze({
    start: node.start,
    end: node.end,
    calls: Object.freeze(calls.sort((left, right) => left.start - right.start)),
    assignments: Object.freeze(assignments.sort((left, right) => left.start - right.start)),
    identifiers: Object.freeze([...identifiers].sort()),
    properties: Object.freeze([...properties].sort()),
  });
}

export function analyzeRendererProjectionModule(relativePath, source) {
  const ast = parse(source, { ecmaVersion: "latest", sourceType: "module", allowHashBang: true });
  const imports = [];
  const exports = [];
  const functionDefinitions = [];
  const recordFunction = (node, ancestors) => {
    const name = functionName(node, ancestors);
    if (!name) return;
    const ownerPath = [];
    let nearestLexicalOwnerIndex = -1;
    for (let index = 0; index < ancestors.length - 1; index += 1) {
      const ancestor = ancestors[index];
      if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(ancestor.type)) {
        const ancestorName = functionName(ancestor, ancestors.slice(0, index + 1));
        ownerPath.push(ancestorName || "<anonymous-function>");
        nearestLexicalOwnerIndex = index;
      } else if (ancestor.type === "ClassDeclaration" || ancestor.type === "ClassExpression") {
        ownerPath.push(ancestor.id?.name || "<anonymous-class>");
        nearestLexicalOwnerIndex = index;
      }
    }
    const placementNodes = ancestors.slice(nearestLexicalOwnerIndex + 1, -1);
    const directPlacement = nearestLexicalOwnerIndex < 0
      ? placementNodes.every((entry) => entry.type === "Program" || entry.type === "ExportNamedDeclaration")
      : placementNodes.length === 1 && placementNodes[0].type === "BlockStatement";
    functionDefinitions.push(Object.freeze({
      name,
      ownerPath: Object.freeze(ownerPath),
      placement: directPlacement ? "direct" : "nested-control",
      facts: factsForFunction(node),
    }));
  };
  walk.ancestor(ast, {
    ImportDeclaration(node) {
      imports.push({
        source: node.source.value,
        specifiers: node.specifiers.map((entry) => entry.local.name).sort(),
      });
    },
    ExportNamedDeclaration(node) {
      if (node.declaration?.id?.name) exports.push(node.declaration.id.name);
      for (const declaration of node.declaration?.declarations || []) {
        if (declaration.id?.type === "Identifier") exports.push(declaration.id.name);
      }
      for (const specifier of node.specifiers || []) exports.push(specifier.exported.name);
    },
    FunctionDeclaration(node, ancestors) {
      recordFunction(node, ancestors);
    },
    FunctionExpression(node, ancestors) {
      recordFunction(node, ancestors);
    },
    ArrowFunctionExpression(node, ancestors) {
      recordFunction(node, ancestors);
    },
  });
  const ambiguousFunctions = [];
  const identityCounts = new Map();
  for (const definition of functionDefinitions) {
    if (definition.placement !== "direct") continue;
    const identity = `${definition.ownerPath.join("/")}::${definition.name}`;
    identityCounts.set(identity, (identityCounts.get(identity) || 0) + 1);
  }
  for (const [identity, count] of identityCounts) {
    if (count > 1) ambiguousFunctions.push(Object.freeze({ identity, count }));
  }
  return Object.freeze({
    path: relativePath,
    imports: Object.freeze(imports),
    exports: Object.freeze([...new Set(exports)].sort()),
    functionDefinitions: Object.freeze(functionDefinitions),
    ambiguousFunctions: Object.freeze(ambiguousFunctions),
  });
}

export function resolveRendererProjectionFunction(module, ownerPath, name) {
  const expectedOwnerPath = Array.isArray(ownerPath) ? ownerPath : [];
  const matches = module.functionDefinitions.filter((definition) => (
    definition.name === name
    && definition.placement === "direct"
    && definition.ownerPath.length === expectedOwnerPath.length
    && definition.ownerPath.every((part, index) => part === expectedOwnerPath[index])
  ));
  return Object.freeze({
    status: matches.length === 1 ? "resolved" : matches.length === 0 ? "missing" : "ambiguous",
    identity: `${expectedOwnerPath.join("/")}::${name}`,
    count: matches.length,
    facts: matches.length === 1 ? matches[0].facts : null,
  });
}

function functionFacts(module, ownerPath, name) {
  return resolveRendererProjectionFunction(module, ownerPath, name).facts;
}

function functionStatus(module, ownerPath, name) {
  return resolveRendererProjectionFunction(module, ownerPath, name).status;
}

function hasCall(facts, expected) {
  return facts?.calls.some(({ callee }) => callee === expected) === true;
}

function hasOrderedCalls(facts, expected) {
  let cursor = -1;
  return expected.every((callee) => {
    const found = facts?.calls.find((entry) => entry.start > cursor && entry.callee === callee);
    if (!found) return false;
    cursor = found.start;
    return true;
  });
}

function hasNames(actual, expected) {
  const values = new Set(actual || []);
  return expected.every((value) => values.has(value));
}

function makeResult(name, checks, findings = {}) {
  const failures = checks.filter(({ ok }) => !ok).map(({ message }) => message);
  return Object.freeze({ name, status: failures.length === 0 ? "pass" : "fail", failures, findings });
}

function check(ok, message) {
  return { ok: Boolean(ok), message };
}

function imports(module, source) {
  return module.imports.some((entry) => entry.source === source);
}

function readSources(root, readFile) {
  return new Map(Object.values(PROJECTION_CONTRACT_PATHS).map((relativePath) => [
    relativePath,
    readFile(path.join(root, relativePath), "utf8"),
  ]));
}

export function evaluateRendererProjectionContract(options = {}) {
  const root = options.root || REPO_ROOT;
  const sources = options.sources || readSources(root, options.readFile || fs.readFileSync);
  const modules = {};
  for (const [key, relativePath] of Object.entries(PROJECTION_CONTRACT_PATHS)) {
    if (relativePath.endsWith(".js")) {
      modules[key] = analyzeRendererProjectionModule(relativePath, sources.get(relativePath));
    }
  }
  const renderer = modules.renderer;
  const projectionOwner = modules.projectionOwner;
  const projectionInit = functionFacts(
    projectionOwner,
    ["createRendererProjectionPathOwner"],
    "initializeProjectionPaths",
  );
  const projectionFactory = functionFacts(renderer, [], "getRendererProjectionPathOwner");
  const viewportReadOwner = functionFacts(renderer, [], "getViewportReadModelOwner");
  const viewportCommandOwner = functionFacts(renderer, [], "getViewportCommandOwner");
  const surfaceOwnerPath = ["createRendererSurfaceLifecycleOwner"];
  const surfaceFunction = (name) => functionFacts(modules.surfaceLifecycle, surfaceOwnerPath, name);
  const forbiddenProjectionNames = [
    "fitProjection", "fitExtent", "setCanvasSize", "buildSpatialIndex", "updateMap", "drawCanvas",
  ];
  const rendererOwnerPaths = options.rendererOwnerPaths || fs.readdirSync(path.join(root, "js/core/renderer"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && (entry.name.endsWith("_owner.js") || entry.name === "renderer_surface_lifecycle_owner.js"))
    .map((entry) => `js/core/renderer/${entry.name}`)
    .sort();
  const rendererOwners = rendererOwnerPaths.map((relativePath) => analyzeRendererProjectionModule(
    relativePath,
    sources.get(relativePath) || fs.readFileSync(path.join(root, relativePath), "utf8"),
  ));
  const ownerImportViolations = rendererOwners
    .filter((module) => module.imports.some((entry) => entry.source.includes("map_renderer")))
    .map((module) => module.path);
  const publicExports = modules.publicFacade.exports;
  const results = [
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[0], [
      check(projectionOwner.exports.includes("createRendererProjectionPathOwner"), "projection owner export drift"),
      check(Boolean(projectionInit), "initializeProjectionPaths missing"),
      check(hasOrderedCalls(projectionInit, ["getRequiredD3", "getRequiredContext", "getRequiredContext", "d3.geoEqualEarth", "hostApi.setProjection", "hostApi.setPathSvg", "hostApi.setPathCanvas", "hostApi.setPathHitCanvas", "Object.freeze"]), "projection initialization sequence drift"),
      check(!forbiddenProjectionNames.some((name) => projectionInit?.identifiers.includes(name)), "projection owner semantic scope drift"),
    ], { callSequence: projectionInit?.calls.map(({ callee }) => callee) || [] }),
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[1], [
      check(imports(renderer, "./renderer/renderer_projection_path_owner.js"), "projection owner import missing"),
      check(hasCall(projectionFactory, "createRendererProjectionPathOwner"), "projection owner construction missing"),
      check(hasCall(functionFacts(renderer, [], "initMap"), "getRendererProjectionPathOwner.initializeProjectionPaths"), "initMap projection initialization missing"),
    ]),
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[2], [
      check(modules.surfaceLifecycle.exports.includes("createRendererSurfaceLifecycleOwner"), "surface lifecycle export drift"),
      check(["resolveDomHandles", "ensureCanvasLayerHandles", "ensureHitCanvasHandle", "acquireCanvasContexts"].every((name) => Boolean(surfaceFunction(name))), "surface lifecycle mechanical functions drift"),
      check(["fitProjection", "initializeProjectionPaths", "setProjection"].every((name) => (
        functionStatus(modules.surfaceLifecycle, surfaceOwnerPath, name) === "missing"
      )), "surface lifecycle gained projection semantics"),
    ]),
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[3], [
      check(modules.surfaceHost.exports.includes("createRendererSurfaceHost"), "surface host export drift"),
      check([
        '["projection", "getProjection", "setProjection"]',
        '["pathSVG", "getPathSvg", "setPathSvg"]',
        '["pathCanvas", "getPathCanvas", "setPathCanvas"]',
        '["pathHitCanvas", "getPathHitCanvas", "setPathHitCanvas"]',
      ].every((tuple) => sources.get(PROJECTION_CONTRACT_PATHS.surfaceHost).includes(tuple)), "surface host projection registry drift"),
    ]),
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[4], [
      check(["getProjection", "getPathCanvas", "getPathSvg"].every((name) => sources.get(PROJECTION_CONTRACT_PATHS.projectedBounds).includes(name)), "projected bounds getter injection drift"),
      check([
        "getters.getViewportDimensions", "getters.getViewportDpr",
        "capabilities.getProjectionSnapshot", "capabilities.invertProjectionPoint",
        "capabilities.getZoomTransformSnapshot",
      ].every((name) => sources.get(PROJECTION_CONTRACT_PATHS.viewportReadModel).includes(name))
        && !/\b(?:state|runtimeState)\b|\bgetters\.(?:getProjection|getPathSvg)\b/.test(
          sources.get(PROJECTION_CONTRACT_PATHS.viewportReadModel),
        ), "viewport snapshot capability injection drift"),
      check(!imports(modules.projectedBounds, "../map_renderer.js") && !imports(modules.viewportReadModel, "../map_renderer.js"), "projection consumer import direction drift"),
    ]),
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[5], [
      check(ownerImportViolations.length === 0, `renderer owners import map_renderer: ${ownerImportViolations.join(",")}`),
    ], { scannedPaths: rendererOwnerPaths, violations: ownerImportViolations }),
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[6], [
      check((sources.get(PROJECTION_CONTRACT_PATHS.preflight).match(/^## /gm) || []).length >= 8, "projection preflight headings drift"),
    ]),
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[7], [
      check(JSON.parse(sources.get(PROJECTION_CONTRACT_PATHS.packageJson)).scripts?.["test:node:renderer-projection-contract"], "projection contract package command missing"),
    ]),
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[8], [
      check(hasNames(projectionFactory?.properties, ["surfaceHost", "getD3", "projectionPrecision", "pathPointRadius"]), "projection factory shape drift"),
      check(hasNames(viewportReadOwner?.properties, [
        "getters", "capabilities", "getViewportDimensions", "getViewportDpr",
        "getProjectionSnapshot", "invertProjectionPoint", "getZoomTransformSnapshot",
        "createZoomTransform", "getPanContentBoundsSnapshots", "getProjectedRenderableContentBoundsSnapshots",
      ]) && !viewportReadOwner?.properties.some((name) => ["state", "getProjection", "getPathSvg"].includes(name)),
      "viewport read owner shape drift"),
      check(hasNames(viewportCommandOwner?.properties, ["state", "minZoomScale", "maxZoomScale", "setZoomTransform"]), "viewport command owner shape drift"),
    ]),
    makeResult(PROJECTION_STATIC_NORMALIZED_NAMES[9], [
      check(!publicExports.some((name) => /(?:create|get).*Owner$/.test(name)), "public facade exports a renderer owner"),
      check(!publicExports.some((name) => name.includes("RendererRuntimeContext")), "public facade exports renderer runtime context"),
      check(!modules.publicFacade.imports.some((entry) => entry.source.includes("renderer_runtime_context")), "public facade imports renderer runtime context"),
    ], { publicFacadeExportShape: publicExports }),
  ];
  return Object.freeze({
    schemaVersion: 1,
    kind: "renderer-projection-runtime-context-contract",
    equal: results.every(({ status }) => status === "pass"),
    results: Object.freeze(results),
    findings: Object.freeze({ sourceInputs: Object.freeze([...sources.keys(), ...rendererOwnerPaths].filter((value, index, all) => all.indexOf(value) === index).sort()) }),
  });
}

export function projectionContractFailures(report = evaluateRendererProjectionContract()) {
  return report.results.flatMap((entry) => entry.failures.map((failure) => `[${entry.name}] ${failure}`));
}
