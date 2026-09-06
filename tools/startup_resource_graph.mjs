import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const PAGES_MANIFEST_PATH = "dist/pages-dist-manifest.json";
const SOURCE_ENTRY_HTML_PATH = "index.html";
const STAGE_A_LAZY_LOADER_PATH = "js/bootstrap/startup_lazy_module_loader.js";
const SOURCE_MODULE_EXTENSIONS = [".js", ".mjs"];
const PAGES_REACHABILITY_SCHEMA_VERSION = 2;
const PAGES_APP_ROOT_PREFIXES = ["js/", "vendor/", "data/", "css/"];

function requireWorkspaceDependency(specifier) {
  const localRequire = createRequire(import.meta.url);
  try {
    return localRequire(specifier);
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND") throw error;
    const gitMarkerPath = path.join(REPO_ROOT, ".git");
    if (!fs.statSync(gitMarkerPath).isFile()) throw error;
    const gitMarker = fs.readFileSync(gitMarkerPath, "utf8").trim();
    if (!gitMarker.startsWith("gitdir:")) throw error;
    const gitDirectoryValue = gitMarker.slice("gitdir:".length).trim();
    const gitDirectory = path.resolve(REPO_ROOT, gitDirectoryValue);
    const commonDirectory = path.resolve(
      gitDirectory,
      fs.readFileSync(path.join(gitDirectory, "commondir"), "utf8").trim(),
    );
    const checkoutRequire = createRequire(path.join(path.dirname(commonDirectory), "package.json"));
    return checkoutRequire(specifier);
  }
}

const acorn = requireWorkspaceDependency("acorn");
const acornWalk = requireWorkspaceDependency("acorn-walk");
const acornWalkPackage = requireWorkspaceDependency("acorn-walk/package.json");
if (acorn.version !== "8.17.0" || acornWalkPackage.version !== "8.3.5") {
  throw new Error(
    `Startup resource graph requires acorn@8.17.0 and acorn-walk@8.3.5; `
    + `loaded acorn@${acorn.version} and acorn-walk@${acornWalkPackage.version}`,
  );
}

export const STARTUP_RESOURCE_CLASSES = Object.freeze([
  "critical",
  "deferred",
  "scenario-specific",
  "export-only",
  "dev-only",
]);

function stableCompare(left, right) {
  return String(left).localeCompare(String(right));
}

function toPosixPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function normalizedRepoPath(value) {
  const normalized = path.posix.normalize(toPosixPath(value)).replace(/^\.\//u, "");
  if (!normalized || normalized === "." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`Expected a repository-relative path, got ${JSON.stringify(value)}`);
  }
  return normalized;
}

function readRepoText(repoPath, { rootDir = REPO_ROOT } = {}) {
  return fs.readFileSync(path.join(rootDir, normalizedRepoPath(repoPath)), "utf8");
}

function repoFileExists(repoPath, { rootDir = REPO_ROOT } = {}) {
  return fs.existsSync(path.join(rootDir, normalizedRepoPath(repoPath)));
}

function resolveSourceSpecifier(fromPath, specifier, { rootDir = REPO_ROOT } = {}) {
  const reference = String(specifier || "").trim().split("#", 1)[0].split("?", 1)[0];
  let candidateBase;
  if (reference.startsWith("/")) {
    const rootRelative = reference.replace(/^\/+/, "");
    if (!PAGES_APP_ROOT_PREFIXES.some((prefix) => rootRelative.startsWith(prefix))) return null;
    candidateBase = normalizedRepoPath(rootRelative);
  } else if (reference.startsWith(".")) {
    candidateBase = normalizedRepoPath(path.posix.join(path.posix.dirname(fromPath), reference));
  } else {
    return null;
  }
  const candidates = path.posix.extname(candidateBase)
    ? [candidateBase]
    : [
      ...SOURCE_MODULE_EXTENSIONS.map((extension) => `${candidateBase}${extension}`),
      ...SOURCE_MODULE_EXTENSIONS.map((extension) => `${candidateBase}/index${extension}`),
    ];
  return candidates.find((candidate) => repoFileExists(candidate, { rootDir })) || null;
}

function sourcePathForDistPath(distPath) {
  const normalized = normalizedRepoPath(distPath);
  if (normalized === "app/index.html") return SOURCE_ENTRY_HTML_PATH;
  if (normalized.startsWith("app/")) return normalized.slice("app/".length);
  return normalized;
}

function distPathForSourcePath(sourcePath) {
  const normalized = normalizedRepoPath(sourcePath);
  return normalized === SOURCE_ENTRY_HTML_PATH ? "app/index.html" : `app/${normalized}`;
}

function extractEditorModuleEntrypoint(htmlText) {
  const matches = [...htmlText.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/giu)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one editor module script in ${SOURCE_ENTRY_HTML_PATH}; found ${matches.length}`);
  }
  return normalizedRepoPath(matches[0][1]);
}

function literalString(node) {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked ?? node.quasis[0]?.value?.raw ?? "";
  }
  return null;
}

function parseModuleReferences(sourcePath, sourceText, { rootDir = REPO_ROOT } = {}) {
  const staticSpecifiers = [];
  const dynamicImports = [];
  const ast = acorn.parse(sourceText, {
    allowHashBang: true,
    ecmaVersion: "latest",
    locations: true,
    sourceType: "module",
  });
  const locationFor = (node) => ({
    column: node.loc.start.column + 1,
    line: node.loc.start.line,
  });
  const addStatic = (node, kind) => {
    const reference = literalString(node.source);
    if (reference === null) return;
    const resolvedPath = resolveSourceSpecifier(sourcePath, reference, { rootDir });
    staticSpecifiers.push({
      ...locationFor(node),
      kind,
      reference,
      resolved_path: resolvedPath,
    });
  };

  acornWalk.simple(ast, {
    ExportAllDeclaration(node) {
      addStatic(node, "export-all-source");
    },
    ExportNamedDeclaration(node) {
      if (node.source) addStatic(node, "export-named-source");
    },
    ImportDeclaration(node) {
      addStatic(node, "import-declaration");
    },
    ImportExpression(node) {
      const reference = literalString(node.source);
      dynamicImports.push({
        ...locationFor(node),
        expression: sourceText.slice(node.source.start, node.source.end),
        kind: reference === null ? "expression" : "literal",
        reference,
        resolved_path: reference !== null
          ? resolveSourceSpecifier(sourcePath, reference, { rootDir })
          : null,
      });
    },
  });

  return {
    dynamic_imports: dynamicImports.sort((left, right) => left.line - right.line || left.column - right.column),
    static_imports: staticSpecifiers.sort((left, right) => left.line - right.line || left.column - right.column),
  };
}

function getManifestOwnershipResolver(reachabilityInventory) {
  const groups = Array.isArray(reachabilityInventory?.ownership_groups)
    ? reachabilityInventory.ownership_groups
    : [];
  return (distPath) => {
    const normalized = normalizedRepoPath(distPath);
    const matches = groups.filter((group) => {
      const exceptions = Array.isArray(group.path_exceptions) ? group.path_exceptions : [];
      const prefixes = Array.isArray(group.path_prefixes) ? group.path_prefixes : [];
      return exceptions.some((record) => record.path === normalized)
        || prefixes.some((record) => normalized.startsWith(String(record.prefix || "")));
    });
    if (matches.length !== 1) return null;
    const [match] = matches;
    return {
      category: String(match.category || ""),
      owner: String(match.owner || ""),
      basis: String(match.basis || ""),
    };
  };
}

function resourceClassFor({ manifestLoadPhase, productCategory, productOwner }) {
  const category = String(productCategory || "");
  if (category === "developer-only" || productOwner === "development-tools") return "dev-only";
  if (category === "export-only" || productOwner === "export-capability") return "export-only";
  if (category === "scenario-specific" || productOwner === "scenario-runtime" || productOwner === "hgo-scenario-runtime") {
    return "scenario-specific";
  }
  if (manifestLoadPhase === "deferred-runtime" || category === "on-demand-product" || category === "startup-deferred-runtime") {
    return "deferred";
  }
  return "critical";
}

function findManifestDynamicExpression(manifestNode, expression) {
  const candidates = Array.isArray(manifestNode?.dynamic_import_expressions)
    ? manifestNode.dynamic_import_expressions
    : [];
  return candidates.find((candidate) => (
    Number(candidate.line) === expression.line
    && String(candidate.expression || "") === expression.expression
  )) || null;
}

function isSourceModulePath(repoPath) {
  const normalized = toPosixPath(repoPath);
  return normalized.startsWith("js/") && SOURCE_MODULE_EXTENSIONS.includes(path.posix.extname(normalized));
}

function parseStageALazyLoaderBindings(entryText, entryPath, { rootDir = REPO_ROOT } = {}) {
  const bindings = [];
  const expression = /const\s+([A-Za-z_$][\w$]*)\s*=\s*createPageLifetimeModuleLoader\s*\(\s*\{\s*importModule\s*:\s*\(\s*\)\s*=>\s*import\(\s*["']([^"']+)["']\s*\)/gu;
  for (const match of entryText.matchAll(expression)) {
    const target = resolveSourceSpecifier(entryPath, match[2], { rootDir });
    bindings.push({ name: match[1], target });
  }
  return bindings.sort((left, right) => stableCompare(left.name, right.name));
}

function sortUnique(values) {
  return [...new Set(values)].sort(stableCompare);
}

function makeIssue(code, fields = {}) {
  return { code, ...fields };
}

function summarizeIssues(issues) {
  const summariesByCode = new Map();
  for (const issue of issues) {
    const code = String(issue.code || "");
    const summary = summariesByCode.get(code) || {
      classificationCounts: new Map(),
      issueCount: 0,
    };
    summary.issueCount += 1;
    if (String(issue.classification || "").trim()) {
      const classification = String(issue.classification);
      summary.classificationCounts.set(
        classification,
        (summary.classificationCounts.get(classification) || 0) + 1,
      );
    }
    summariesByCode.set(code, summary);
  }
  return [...summariesByCode.entries()]
    .sort(([leftCode], [rightCode]) => stableCompare(leftCode, rightCode))
    .map(([code, summary]) => ({
      classification_counts: [...summary.classificationCounts.entries()]
        .sort(([leftClassification], [rightClassification]) => (
          stableCompare(leftClassification, rightClassification)
        ))
        .map(([classification, issueCount]) => ({
          classification,
          issue_count: issueCount,
        })),
      code,
      issue_count: summary.issueCount,
    }));
}

/**
 * Build a source-first startup graph and correlate every observed editor resource
 * to the checked-in Pages reachability/product-ownership manifest.
 */
export function buildStartupResourceGraph({ rootDir = REPO_ROOT, manifestPath = PAGES_MANIFEST_PATH } = {}) {
  const manifest = JSON.parse(readRepoText(manifestPath, { rootDir }));
  const reachability = manifest?.reachability_inventory;
  if (!reachability || typeof reachability !== "object") {
    throw new Error(`${manifestPath} is missing reachability_inventory`);
  }
  const moduleGraph = reachability.module_graph;
  if (!moduleGraph || typeof moduleGraph !== "object") {
    throw new Error(`${manifestPath} is missing reachability_inventory.module_graph`);
  }

  const editorEntrypoint = (moduleGraph.entrypoints || []).find((entrypoint) => entrypoint.id === "editor");
  if (!editorEntrypoint) throw new Error(`${manifestPath} is missing the editor entrypoint`);
  const htmlText = readRepoText(SOURCE_ENTRY_HTML_PATH, { rootDir });
  const entryModulePath = extractEditorModuleEntrypoint(htmlText);
  const expectedDistEntrypoint = distPathForSourcePath(entryModulePath);
  const manifestNodes = new Map((moduleGraph.nodes || []).map((node) => [String(node.path || ""), node]));
  const ownershipForPath = getManifestOwnershipResolver(reachability);
  const issues = [];

  if (String(editorEntrypoint.path || "") !== "app/index.html") {
    issues.push(makeIssue("editor-entrypoint-mismatch", { actual: editorEntrypoint.path || null, expected: "app/index.html" }));
  }
  if (!(editorEntrypoint.resource_references || []).includes(expectedDistEntrypoint)) {
    issues.push(makeIssue("editor-module-entrypoint-mismatch", {
      actual: sortUnique(editorEntrypoint.resource_references || []),
      expected: expectedDistEntrypoint,
    }));
  }

  const moduleRecords = new Map();
  const dynamicEdges = [];
  const observedResourcePaths = new Set();
  const queued = new Set();
  const queues = {
    base: [{ parentPath: null, sourcePath: entryModulePath }],
    dynamic: [],
  };
  queued.add(`base:${entryModulePath}`);

  function enqueue(sourcePath, loadPath, parentPath = null) {
    if (!sourcePath) {
      issues.push(makeIssue("unresolved-source-reference", { from: parentPath, load_path: loadPath }));
      return;
    }
    const key = `${loadPath}:${sourcePath}`;
    if (queued.has(key)) return;
    queued.add(key);
    queues[loadPath].push({ parentPath, sourcePath });
  }

  function registerModule(sourcePath, loadPath, parentPath) {
    const existing = moduleRecords.get(sourcePath) || {
      base_startup: false,
      deferred_startup: false,
      dynamic_imports: [],
      parents: [],
      resource_imports: [],
      source_path: sourcePath,
      static_imports: [],
    };
    existing.base_startup ||= loadPath === "base";
    existing.deferred_startup ||= loadPath === "dynamic";
    if (parentPath) existing.parents.push(parentPath);
    moduleRecords.set(sourcePath, existing);
    return existing;
  }

  function scanQueue(loadPath) {
    while (queues[loadPath].length) {
      const { parentPath, sourcePath } = queues[loadPath].shift();
      const record = registerModule(sourcePath, loadPath, parentPath);
      if (record.scanned) continue;
      record.scanned = true;

      const distPath = distPathForSourcePath(sourcePath);
      const manifestNode = manifestNodes.get(distPath);
      record.dist_path = distPath;
      record.manifest_load_phase = String(manifestNode?.load_phase || "");
      record.product_category = String(manifestNode?.product_category || "");
      const ownership = ownershipForPath(distPath);
      record.product_owner = ownership?.owner || "";
      record.product_owner_basis = ownership?.basis || "";
      if (!manifestNode) issues.push(makeIssue("missing-pages-module", { source_path: sourcePath, dist_path: distPath }));
      if (!ownership?.owner) issues.push(makeIssue("missing-product-owner", { source_path: sourcePath, dist_path: distPath }));
      for (const resourcePath of manifestNode?.resource_references || []) {
        observedResourcePaths.add(String(resourcePath));
      }

      const sourceText = readRepoText(sourcePath, { rootDir });
      const references = parseModuleReferences(sourcePath, sourceText, { rootDir });
      const sourceStaticDistPaths = sortUnique(references.static_imports
        .map((reference) => reference.resolved_path)
        .filter(Boolean)
        .map(distPathForSourcePath));
      const manifestStaticDistPaths = sortUnique(manifestNode?.static_imports || []);
      const sourceOnlyStaticPaths = sourceStaticDistPaths.filter((entry) => !manifestStaticDistPaths.includes(entry));
      const manifestOnlyStaticPaths = manifestStaticDistPaths.filter((entry) => !sourceStaticDistPaths.includes(entry));
      if (manifestNode && (sourceOnlyStaticPaths.length || manifestOnlyStaticPaths.length)) {
        issues.push(makeIssue("pages-static-edge-mismatch", {
          manifest_only: manifestOnlyStaticPaths,
          source_only: sourceOnlyStaticPaths,
          source_path: sourcePath,
        }));
      }
      const sourceLiteralDynamicDistPaths = sortUnique(references.dynamic_imports
        .filter((expression) => expression.kind === "literal" && expression.resolved_path)
        .map((expression) => distPathForSourcePath(expression.resolved_path)));
      const manifestLiteralDynamicDistPaths = sortUnique(
        (manifestNode?.reference_locations?.dynamic_imports || [])
          .filter((reference) => reference.local && reference.resolved_path)
          .map((reference) => reference.resolved_path),
      );
      const sourceOnlyDynamicPaths = sourceLiteralDynamicDistPaths
        .filter((entry) => !manifestLiteralDynamicDistPaths.includes(entry));
      const manifestOnlyDynamicPaths = manifestLiteralDynamicDistPaths
        .filter((entry) => !sourceLiteralDynamicDistPaths.includes(entry));
      if (manifestNode && (sourceOnlyDynamicPaths.length || manifestOnlyDynamicPaths.length)) {
        issues.push(makeIssue("pages-literal-dynamic-edge-mismatch", {
          manifest_only: manifestOnlyDynamicPaths,
          source_only: sourceOnlyDynamicPaths,
          source_path: sourcePath,
        }));
      }
      record.static_imports = sortUnique(references.static_imports
        .map((reference) => reference.resolved_path)
        .filter(isSourceModulePath));
      for (const reference of references.static_imports) {
        if (!reference.resolved_path) {
          issues.push(makeIssue("unresolved-static-import", { from: sourcePath, reference: reference.reference }));
          continue;
        }
        if (isSourceModulePath(reference.resolved_path)) {
          enqueue(reference.resolved_path, loadPath, sourcePath);
        } else {
          observedResourcePaths.add(distPathForSourcePath(reference.resolved_path));
          record.resource_imports.push(reference.resolved_path);
        }
      }

      for (const expression of references.dynamic_imports) {
        const resolvedTargets = [];
        if (expression.kind === "literal") {
          if (!expression.resolved_path) {
            issues.push(makeIssue("unresolved-dynamic-import", { from: sourcePath, reference: expression.reference }));
          } else {
            resolvedTargets.push(expression.resolved_path);
          }
        } else {
          const manifestExpression = findManifestDynamicExpression(manifestNode, expression);
          const targets = manifestExpression?.runtime_targets;
          if (manifestExpression?.resolution !== "declarative-registry" || !Array.isArray(targets) || !targets.length) {
            issues.push(makeIssue("unresolved-dynamic-expression", {
              column: expression.column,
              from: sourcePath,
              line: expression.line,
            }));
          } else {
            resolvedTargets.push(...targets.map(sourcePathForDistPath));
          }
        }
        for (const target of sortUnique(resolvedTargets)) {
          if (!isSourceModulePath(target)) {
            observedResourcePaths.add(distPathForSourcePath(target));
            record.resource_imports.push(target);
            continue;
          }
          dynamicEdges.push({
            column: expression.column,
            from: sourcePath,
            kind: expression.kind === "literal" ? "literal-dynamic-import" : "registry-dynamic-import",
            line: expression.line,
            to: target,
          });
          enqueue(target, "dynamic", sourcePath);
        }
      }
      record.dynamic_imports = sortUnique(dynamicEdges.filter((edge) => edge.from === sourcePath).map((edge) => edge.to));
      record.resource_imports = sortUnique(record.resource_imports);
    }
  }

  scanQueue("base");
  scanQueue("dynamic");

  const entryRecord = moduleRecords.get(entryModulePath);
  const stageALoaderText = repoFileExists(STAGE_A_LAZY_LOADER_PATH, { rootDir })
    ? readRepoText(STAGE_A_LAZY_LOADER_PATH, { rootDir })
    : null;
  const lazyBindings = parseStageALazyLoaderBindings(readRepoText(entryModulePath, { rootDir }), entryModulePath, { rootDir });
  const lazyTargets = new Set(lazyBindings.map((binding) => binding.target).filter(Boolean));
  const mainDynamicTargets = new Set(entryRecord?.dynamic_imports || []);
  if (!stageALoaderText || !stageALoaderText.includes("createPageLifetimeModuleLoader")) {
    issues.push(makeIssue("missing-stage-a-lazy-loader", { path: STAGE_A_LAZY_LOADER_PATH }));
  }
  if (!entryRecord?.static_imports.includes(STAGE_A_LAZY_LOADER_PATH)) {
    issues.push(makeIssue("stage-a-lazy-loader-not-in-entrypoint", { path: STAGE_A_LAZY_LOADER_PATH }));
  }
  if (!lazyBindings.length || [...lazyTargets].some((target) => !mainDynamicTargets.has(target))) {
    issues.push(makeIssue("stage-a-lazy-loader-target-mismatch", {
      loader_targets: sortUnique(lazyTargets),
      entrypoint_dynamic_targets: sortUnique(mainDynamicTargets),
    }));
  }

  for (const manifestNode of moduleGraph.nodes || []) {
    const distPath = String(manifestNode?.path || "");
    if (!distPath.startsWith("app/js/") || manifestNode.load_phase !== "untraversed") continue;
    const sourcePath = sourcePathForDistPath(distPath);
    if (moduleRecords.has(sourcePath)) continue;
    const ownership = ownershipForPath(distPath);
    if (!repoFileExists(sourcePath, { rootDir })) {
      issues.push(makeIssue("missing-source-module", { source_path: sourcePath, dist_path: distPath }));
    }
    if (!ownership?.owner) {
      issues.push(makeIssue("missing-product-owner", { source_path: sourcePath, dist_path: distPath }));
    }
    moduleRecords.set(sourcePath, {
      base_startup: false,
      deferred_startup: false,
      dist_path: distPath,
      dynamic_imports: [],
      manifest_load_phase: String(manifestNode.load_phase || ""),
      pages_untraversed: true,
      parents: [],
      product_category: String(manifestNode.product_category || ""),
      product_owner: ownership?.owner || "",
      product_owner_basis: ownership?.basis || "",
      resource_imports: [],
      source_path: sourcePath,
      static_imports: [],
    });
  }

  const modules = [...moduleRecords.values()].map((record) => {
    const { scanned, ...serializable } = record;
    const resourceClass = resourceClassFor({
      manifestLoadPhase: serializable.manifest_load_phase,
      productCategory: serializable.product_category,
      productOwner: serializable.product_owner,
    });
    return {
      ...serializable,
      classification: resourceClass,
      dynamic_imports: sortUnique(serializable.dynamic_imports),
      parents: sortUnique(serializable.parents),
      resource_imports: sortUnique(serializable.resource_imports),
      static_imports: sortUnique(serializable.static_imports),
    };
  }).sort((left, right) => stableCompare(left.source_path, right.source_path));

  const modulePaths = new Set(modules.map((record) => record.dist_path));
  const initialResourcePaths = sortUnique([
    ...(editorEntrypoint.resource_references || []),
    ...((moduleGraph.initial_resource_paths || []).filter((entry) => String(entry).startsWith("app/"))),
    ...observedResourcePaths,
  ]);
  const resources = initialResourcePaths
    .filter((distPath) => !modulePaths.has(distPath))
    .map((distPath) => {
      const manifestNode = manifestNodes.get(distPath);
      const ownership = ownershipForPath(distPath);
      const resource = {
        dist_path: distPath,
        manifest_load_phase: String(manifestNode?.load_phase || "initial"),
        product_category: String(manifestNode?.product_category || ownership?.category || ""),
        product_owner: ownership?.owner || "",
        product_owner_basis: ownership?.basis || "",
        source_path: sourcePathForDistPath(distPath),
      };
      resource.classification = resourceClassFor({
        manifestLoadPhase: resource.manifest_load_phase,
        productCategory: resource.product_category,
        productOwner: resource.product_owner,
      });
      if (!resource.product_owner) issues.push(makeIssue("missing-product-owner", { dist_path: distPath, source_path: resource.source_path }));
      return resource;
    })
    .sort((left, right) => stableCompare(left.dist_path, right.dist_path));

  const categories = Object.fromEntries(STARTUP_RESOURCE_CLASSES.map((classification) => [
    classification,
    [...modules, ...resources]
      .filter((record) => record.classification === classification)
      .map((record) => record.source_path)
      .sort(stableCompare),
  ]));
  const graph = {
    categories,
    dynamic_edges: dynamicEdges.sort((left, right) => (
      stableCompare(left.from, right.from)
      || left.line - right.line
      || left.column - right.column
      || stableCompare(left.to, right.to)
    )),
    entrypoint: {
      html_path: SOURCE_ENTRY_HTML_PATH,
      module_path: entryModulePath,
      pages_html_path: "app/index.html",
      pages_module_path: expectedDistEntrypoint,
    },
    generator: "tools/startup_resource_graph.mjs",
    issues: issues.sort((left, right) => stableCompare(JSON.stringify(left), JSON.stringify(right))),
    manifest: {
      admission_status: String(reachability.admission?.status || ""),
      graph_scan_status: String(reachability.graph_scan_status || ""),
      path: normalizedRepoPath(manifestPath),
      product_inventory_status: String(reachability.product_inventory?.status || ""),
      publication_ownership_status: String(reachability.publication_ownership_status || ""),
      schema_version: Number(reachability.schema_version || 0),
    },
    modules,
    resources,
    schema_version: 1,
    stage_a_lazy_loader: {
      bindings: lazyBindings,
      entrypoint_imported: Boolean(entryRecord?.static_imports.includes(STAGE_A_LAZY_LOADER_PATH)),
      path: STAGE_A_LAZY_LOADER_PATH,
    },
  };
  graph.validation = validateStartupResourceGraph(graph);
  return graph;
}

export function validateStartupResourceGraph(graph) {
  const issues = [...(Array.isArray(graph?.issues) ? graph.issues : [])];
  const manifest = graph?.manifest || {};
  if (manifest.schema_version !== PAGES_REACHABILITY_SCHEMA_VERSION) {
    issues.push(makeIssue("pages-reachability-schema-version-mismatch", {
      actual: Number.isFinite(manifest.schema_version) ? manifest.schema_version : null,
      expected: PAGES_REACHABILITY_SCHEMA_VERSION,
    }));
  }
  if (manifest.admission_status !== "complete") {
    issues.push(makeIssue("pages-reachability-admission-incomplete", { actual: manifest.admission_status || null }));
  }
  if (manifest.graph_scan_status !== "complete") {
    issues.push(makeIssue("pages-reachability-scan-incomplete", { actual: manifest.graph_scan_status || null }));
  }
  if (manifest.product_inventory_status !== "complete" || manifest.publication_ownership_status !== "complete") {
    issues.push(makeIssue("pages-product-ownership-incomplete", {
      product_inventory_status: manifest.product_inventory_status || null,
      publication_ownership_status: manifest.publication_ownership_status || null,
    }));
  }
  for (const record of [...(graph?.modules || []), ...(graph?.resources || [])]) {
    if (!STARTUP_RESOURCE_CLASSES.includes(record.classification)) {
      issues.push(makeIssue("invalid-resource-classification", { source_path: record.source_path || null }));
    }
    if (!String(record.product_owner || "").trim()) {
      issues.push(makeIssue("missing-product-owner", { source_path: record.source_path || null }));
    }
    if (record.base_startup && record.classification !== "critical") {
      issues.push(makeIssue("optional-resource-in-base-startup-graph", {
        classification: record.classification,
        manifest_load_phase: record.manifest_load_phase,
        source_path: record.source_path,
      }));
    }
  }
  const issuesByIdentity = new Map();
  for (const issue of issues) {
    const clone = JSON.parse(JSON.stringify(issue));
    issuesByIdentity.set(JSON.stringify(clone), clone);
  }
  const orderedIssues = [...issuesByIdentity.values()]
    .sort((left, right) => stableCompare(JSON.stringify(left), JSON.stringify(right)));
  return {
    issue_count: orderedIssues.length,
    issue_summary: summarizeIssues(orderedIssues),
    issues: orderedIssues,
    status: orderedIssues.length ? "rejected" : "complete",
  };
}

function parseArgs(argv) {
  const args = { check: false, out: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--check") args.check = true;
    else if (token === "--out") args.out = argv[++index];
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const graph = buildStartupResourceGraph();
  const output = `${JSON.stringify(graph, null, 2)}\n`;
  if (args.out) {
    const outputPath = path.resolve(REPO_ROOT, args.out);
    const repoRelativeOutputPath = toPosixPath(path.relative(REPO_ROOT, outputPath));
    if (
      !repoRelativeOutputPath.startsWith(".runtime/")
      || repoRelativeOutputPath.startsWith("../")
      || path.isAbsolute(repoRelativeOutputPath)
    ) {
      throw new Error("--out must stay below .runtime/");
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output, "utf8");
  } else {
    process.stdout.write(output);
  }
  if (args.check && graph.validation.status !== "complete") {
    process.stderr.write(`Startup resource graph rejected: ${graph.validation.issue_count} issue(s).\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
