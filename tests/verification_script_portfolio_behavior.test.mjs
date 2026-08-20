import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildVerificationCatalog,
  buildVerificationSelectionPlan,
  buildScriptPortfolio,
  CANONICAL_VERIFICATION_ENTRYPOINTS,
  checkVerificationCatalogConsistency,
  formatScriptPortfolioJson,
  formatScriptPortfolioMarkdown,
  formatScriptPortfolioSummary,
  parseScriptPortfolioArgs,
  normalizeVerificationPath,
} from "../tools/verification/script_portfolio.mjs";
import { VERIFICATION_DOMAINS } from "../tools/verification/verification_domains.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_PATH = path.join(REPO_ROOT, "tools", "verification", "script_portfolio.mjs");

function completeFixture(extra = {}) {
  return {
    "verify:release": "node release.mjs",
    "verify:pr": "node pr.mjs",
    "verify:nightly": "node nightly.mjs",
    "verify:demo": "node demo.mjs",
    ...extra,
  };
}

test("classifies every script exactly once with stable name ordering", () => {
  const portfolio = buildScriptPortfolio(completeFixture({
    zeta: "node zeta.mjs",
    alpha: "node alpha.mjs",
  }));
  assert.deepEqual(portfolio.canonicalEntrypoints, CANONICAL_VERIFICATION_ENTRYPOINTS);
  assert.deepEqual(portfolio.scripts.map((entry) => entry.name), [
    "alpha",
    "verify:demo",
    "verify:nightly",
    "verify:pr",
    "verify:release",
    "zeta",
  ]);
  assert.deepEqual(portfolio.summary, {
    total: 6,
    canonical: 4,
    internal: 2,
    superseded: 0,
    complete: true,
  });
  assert.equal(new Set(portfolio.scripts.map((entry) => entry.name)).size, portfolio.summary.total);
});

test("uses the exact supersession graph and records the retained superseder", () => {
  const portfolio = buildScriptPortfolio(completeFixture({
    "verify:p4:p4-3": "node composite.mjs",
    "verify:p4:state-writer-policy": "node policy.mjs",
    "test:node:p4:state-writer-policy": "node full.mjs",
    "test:node:p4:state-writer-policy:quick": "node quick.mjs",
    "unrelated:leaf": "node unrelated.mjs",
  }));
  const byName = new Map(portfolio.scripts.map((entry) => [entry.name, entry]));
  assert.deepEqual(byName.get("verify:p4:state-writer-policy"), {
    name: "verify:p4:state-writer-policy",
    command: "node policy.mjs",
    classification: "superseded",
    supersededBy: "verify:p4:p4-3",
  });
  assert.equal(byName.get("test:node:p4:state-writer-policy:quick").supersededBy, "verify:p4:p4-3");
  assert.equal(byName.get("unrelated:leaf").classification, "internal");
});

test("does not infer supersession when the exact superseder is absent", () => {
  const portfolio = buildScriptPortfolio(completeFixture({
    "test:node:supervisor-contracts": "node contract.mjs",
  }));
  assert.equal(
    portfolio.scripts.find((entry) => entry.name === "test:node:supervisor-contracts").classification,
    "internal",
  );
});

test("reports every missing canonical entrypoint in contract order", () => {
  const portfolio = buildScriptPortfolio({ "verify:pr": "node pr.mjs" });
  assert.deepEqual(portfolio.missingCanonicalEntrypoints, [
    "verify:demo",
    "verify:nightly",
    "verify:release",
  ]);
  assert.equal(portfolio.summary.complete, false);
});

test("rejects blank script names and commands before completeness is evaluated", () => {
  assert.throws(() => buildScriptPortfolio({ "": "node valid.mjs" }), /invalid-name/);
  assert.throws(() => buildScriptPortfolio(completeFixture({ "verify:demo": "   " })), /blank-command:verify:demo/);
  assert.throws(() => buildScriptPortfolio({ internal: 7 }), /invalid-command:internal/);
});

test("JSON, Markdown, and summary formats are deterministic", () => {
  const portfolio = buildScriptPortfolio(completeFixture({ internal: "node x.mjs | tee out" }));
  assert.equal(formatScriptPortfolioJson(portfolio), formatScriptPortfolioJson(portfolio));
  assert.match(formatScriptPortfolioMarkdown(portfolio), /\| internal \| internal \|  \| node x\.mjs \\| tee out \|/);
  assert.equal(
    formatScriptPortfolioSummary(portfolio),
    "scripts=5 canonical=4 internal=1 superseded=0 complete=true missingCanonical=none\n",
  );
});

test("CLI argument parsing is fail-closed", () => {
  assert.deepEqual(parseScriptPortfolioArgs(["check", "--format", "json", "--package", "fixture.json"]), {
    action: "check",
    format: "json",
    packagePath: path.resolve("fixture.json"),
  });
  assert.throws(() => parseScriptPortfolioArgs(["publish"]), /unknown-action/);
  assert.throws(() => parseScriptPortfolioArgs(["list", "--format", "yaml"]), /unknown-format/);
  assert.throws(() => parseScriptPortfolioArgs(["list", "--package"]), /missing-value/);
  assert.throws(() => parseScriptPortfolioArgs(["list", "--wat"]), /unknown-argument/);
});

test("CLI check succeeds for a complete fixture and fails with explicit missing canonical names", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "script-portfolio-"));
  try {
    const completePath = path.join(tempDir, "complete.json");
    const incompletePath = path.join(tempDir, "incomplete.json");
    fs.writeFileSync(completePath, JSON.stringify({ scripts: completeFixture() }));
    fs.writeFileSync(incompletePath, JSON.stringify({ scripts: { internal: "node internal.mjs" } }));
    const complete = spawnSync(process.execPath, [CLI_PATH, "check", "--package", completePath], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    assert.equal(complete.status, 0, complete.stderr);
    assert.match(complete.stdout, /complete=true missingCanonical=none/);
    const incomplete = spawnSync(process.execPath, [CLI_PATH, "check", "--format", "json", "--package", incompletePath], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    assert.equal(incomplete.status, 1, incomplete.stderr);
    assert.deepEqual(JSON.parse(incomplete.stdout).missingCanonicalEntrypoints, CANONICAL_VERIFICATION_ENTRYPOINTS);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("real package list is read-only and stable", () => {
  const result = spawnSync(process.execPath, [CLI_PATH, "list", "--format", "json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const portfolio = JSON.parse(result.stdout);
  const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  assert.equal(portfolio.summary.total, Object.keys(packageJson.scripts).length);
  assert.equal(portfolio.scripts.length, portfolio.summary.total);
});

test("real package check enforces catalog consistency through the retained CLI entrypoint", () => {
  const result = spawnSync(process.execPath, [CLI_PATH, "check"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /complete=true missingCanonical=none/);
});

function route(commandRef, domain, overrides = {}) {
  return {
    commandRef,
    domain,
    cost: "fast",
    executionOwner: "child-safe",
    platforms: ["linux", "win32"],
    resourceLocks: [],
    tier: "pr",
    ciProfile: "pr-fast",
    ...overrides,
  };
}

test("builds a canonical catalog from package scripts and route records", () => {
  const catalog = buildVerificationCatalog({
    packageScripts: {
      "test:node:a": "node --test tests\\a.test.mjs --test-name-pattern 'works here'",
      "test:python:b": "npm run python -- -m unittest tests.test_b -q",
      "test:python:path": "python -m unittest tests\\test_path.py -q",
      "test:python:discover": "python -m unittest discover -s tests -p 'test_*.py'",
      "test:python:pytest": "python -m pytest tests/test_pytest.py -q",
      "test:e2e:c": "node node_modules/@playwright/test/cli.js test tests/e2e/c.spec.js --workers=1",
      "verify:all": "npm run test:node:a && npm run test:python:b",
    },
    records: [
      route("test:node:a", "node-domain"),
      route("test:node:a", "shared-domain", { tier: "nightly", ciProfile: "nightly" }),
      route("test:python:b", "python-domain"),
      route("test:e2e:c", "browser-domain", {
        cost: "heavy",
        executionOwner: "main-thread",
        platforms: ["linux"],
        resourceLocks: ["playwright-browser", ".runtime-output"],
        tier: "nightly",
        ciProfile: "browser",
      }),
    ],
  });
  const byId = new Map(catalog.entries.map((entry) => [entry.id, entry]));
  assert.deepEqual(byId.get("test:node:a"), {
    id: "test:node:a",
    kind: "leaf",
    command: "node --test tests\\a.test.mjs --test-name-pattern 'works here'",
    executable: "node",
    argv: ["--test", "tests\\a.test.mjs", "--test-name-pattern", "works here"],
    runner: "node-test",
    files: ["tests/a.test.mjs"],
    modules: [],
    specs: [],
    runnerArgs: ["--test-name-pattern", "works here"],
    domains: ["node-domain", "shared-domain"],
    cost: "fast",
    executionOwner: "child-safe",
    platforms: ["linux", "win32"],
    resourceLocks: [],
    tiers: ["nightly", "pr"],
    ciProfiles: ["nightly", "pr-fast"],
    metadataComplete: true,
  });
  assert.equal(byId.get("test:python:b").runner, "python-unittest");
  assert.deepEqual(byId.get("test:python:b").modules, ["tests.test_b"]);
  assert.deepEqual(byId.get("test:python:path").files, ["tests/test_path.py"]);
  assert.deepEqual(byId.get("test:python:discover").files, ["tests/test_*.py"]);
  assert.equal(byId.get("test:python:pytest").runner, "python-pytest");
  assert.deepEqual(byId.get("test:python:pytest").files, ["tests/test_pytest.py"]);
  assert.equal(byId.get("test:e2e:c").runner, "playwright");
  assert.deepEqual(byId.get("test:e2e:c").specs, ["tests/e2e/c.spec.js"]);
  assert.deepEqual(byId.get("verify:all").refs, [
    { id: "test:node:a", args: [] },
    { id: "test:python:b", args: [] },
  ]);
});

test("recursively expands nested suites and preserves forwarded Node, Python, and Playwright args", () => {
  const catalog = buildVerificationCatalog({
    packageScripts: {
      node: "node --test ./tests/a.test.mjs --test-name-pattern base",
      python: "python -m unittest tests.test_b -q",
      e2e: "node node_modules/@playwright/test/cli.js test tests/e2e/c.spec.js --workers=1",
      nested: "npm run node -- --test-reporter=spec && npm run python",
      all: "npm run nested && npm run e2e -- --retries=2",
    },
    records: [route("all", "all")],
  });
  const plan = buildVerificationSelectionPlan(catalog, ["all"]);
  assert.deepEqual(plan.executions.map((entry) => entry.id), ["node", "e2e", "python"]);
  assert.deepEqual(plan.executions.find((entry) => entry.id === "node").forwardedArgs, ["--test-reporter=spec"]);
  assert.deepEqual(plan.executions.find((entry) => entry.id === "node").effectiveArgv, [
    "--test", "./tests/a.test.mjs", "--test-name-pattern", "base", "--test-reporter=spec",
  ]);
  assert.deepEqual(plan.executions.find((entry) => entry.id === "e2e").forwardedArgs, ["--retries=2"]);
  assert.deepEqual(plan.executions.find((entry) => entry.id === "python").effectiveArgv, [
    "-m", "unittest", "tests.test_b", "-q",
  ]);
  assert.deepEqual(plan.normalizedLeaves, [
    "node-test:tests/a.test.mjs",
    "playwright:tests/e2e/c.spec.js",
    "python-unittest:tests.test_b",
  ]);
});

test("fails closed for duplicate normalized leaves reached through direct and nested aliases", () => {
  const catalog = buildVerificationCatalog({
    packageScripts: {
      unix: "node --test tests/duplicate.test.mjs",
      windows: "node --test tests\\duplicate.test.mjs",
      nested: "npm run unix",
      duplicate: "npm run nested && npm run windows",
    },
    records: [route("duplicate", "duplicates")],
  });
  assert.throws(
    () => buildVerificationSelectionPlan(catalog, ["duplicate"]),
    /verification-plan-duplicate-leaf:node-test:tests\/duplicate\.test\.mjs/,
  );
});

test("fails closed for cycles and unresolved suite references", () => {
  const cyclic = buildVerificationCatalog({ packageScripts: { a: "npm run b", b: "npm run a" } });
  assert.throws(() => buildVerificationSelectionPlan(cyclic, ["a"]), /verification-plan-cycle:a->b->a/);
  const unresolved = buildVerificationCatalog({ packageScripts: { a: "npm run missing" } });
  assert.throws(() => buildVerificationSelectionPlan(unresolved, ["a"]), /verification-plan-unresolved-ref:missing/);
  assert.throws(() => buildVerificationSelectionPlan(unresolved, ["unknown"]), /verification-plan-unresolved-ref:unknown/);
});

test("fails closed when duplicate leaves disagree on runner args, owner, platform, or locks", () => {
  const baseLeaf = {
    kind: "leaf",
    runner: "node-test",
    executable: "node",
    argv: ["--test", "tests/a.test.mjs"],
    files: ["tests/a.test.mjs"],
    modules: [],
    specs: [],
    domains: ["a"],
    cost: "fast",
    executionOwner: "child-safe",
    platforms: ["linux"],
    resourceLocks: [],
    tiers: ["pr"],
    ciProfiles: ["pr-fast"],
  };
  for (const [field, value] of [
    ["argv", ["--test", "tests/a.test.mjs", "--test-name-pattern", "x"]],
    ["executionOwner", "main-thread"],
    ["platforms", ["win32"]],
    ["resourceLocks", [".runtime-output"]],
    ["runner", "opaque"],
  ]) {
    const catalog = {
      entries: [
        { id: "a", ...baseLeaf },
        { id: "b", ...baseLeaf, [field]: value },
        { id: "both", kind: "suite", refs: [{ id: "a", args: [] }, { id: "b", args: [] }] },
      ],
    };
    assert.throws(
      () => buildVerificationSelectionPlan(catalog, ["both"]),
      new RegExp(`verification-plan-leaf-conflict:node-test:tests/a\\.test\\.mjs:${field}`),
    );
  }
});

test("keeps locks as an execution boundary and returns deterministic plans", () => {
  const catalog = buildVerificationCatalog({
    packageScripts: {
      z: "node --test tests/z.test.mjs",
      a: "node --test tests/a.test.mjs",
      all: "npm run z && npm run a",
    },
    records: [
      route("z", "z", { executionOwner: "main-thread", resourceLocks: ["port:4173", ".runtime-output"] }),
      route("a", "a"),
    ],
  });
  const first = buildVerificationSelectionPlan(catalog, ["all"]);
  const second = buildVerificationSelectionPlan(catalog, ["all"]);
  assert.deepEqual(first, second);
  assert.deepEqual(first.executions.map((entry) => entry.id), ["a", "z"]);
  assert.deepEqual(first.resourceLockGroups, [
    { resourceLocks: [], executionIds: ["a"] },
    { resourceLocks: [".runtime-output", "port:4173"], executionIds: ["z"] },
  ]);
  const direct = buildVerificationSelectionPlan(catalog, ["z", "a"]);
  const reversed = buildVerificationSelectionPlan(catalog, ["a", "z"]);
  assert.deepEqual(direct, reversed);
  assert.deepEqual(direct.selectedCommandRefs, ["a", "z"]);
});

test("normalizes Windows and Unix leaf paths without changing module names", () => {
  assert.equal(normalizeVerificationPath(".\\tests\\nested\\..\\a.test.mjs"), "tests/a.test.mjs");
  assert.equal(normalizeVerificationPath("./tests/nested/../a.test.mjs"), "tests/a.test.mjs");
  assert.equal(normalizeVerificationPath("C:\\repo\\tests\\a.test.mjs"), "c:/repo/tests/a.test.mjs");
  const catalog = buildVerificationCatalog({
    packageScripts: { windows: "powershell.exe -File tools/check.ps1" },
  });
  assert.deepEqual(catalog.entries[0].platforms, ["win32"]);
});

test("reports mechanical consistency gaps across catalog, scripts, and route records", () => {
  const scripts = {
    a: "node --test tests/a.test.mjs",
    b: "python -m unittest tests.test_b",
  };
  const records = [route("a", "a"), route("b", "b")];
  const catalog = buildVerificationCatalog({ packageScripts: scripts, records });
  assert.deepEqual(checkVerificationCatalogConsistency(catalog, {
    packageScripts: scripts,
    records,
  }), {
    schemaVersion: 1,
    kind: "verification-catalog-consistency",
    consistent: true,
    missingCatalogEntries: [],
    orphanCatalogEntries: [],
    unresolvedRecordRefs: [],
    entryMismatches: [],
    unresolvedSuiteRefs: [],
    cyclicSuiteRefs: [],
    invalidSuitePlans: [],
    unclassifiedCatalogEntries: [],
    targetlessDiscoveryEntries: [],
  });
  const unclassifiedCatalog = buildVerificationCatalog({ packageScripts: scripts });
  assert.deepEqual(checkVerificationCatalogConsistency({
    entries: [unclassifiedCatalog.entries[0], { ...unclassifiedCatalog.entries[0], id: "legacy" }],
  }, {
    packageScripts: scripts,
    records: [route("missing-route", "missing")],
  }), {
    schemaVersion: 1,
    kind: "verification-catalog-consistency",
    consistent: false,
    missingCatalogEntries: ["b"],
    orphanCatalogEntries: ["legacy"],
    unresolvedRecordRefs: ["missing-route"],
    entryMismatches: [],
    unresolvedSuiteRefs: [],
    cyclicSuiteRefs: [],
    invalidSuitePlans: [],
    unclassifiedCatalogEntries: ["a", "b"],
    targetlessDiscoveryEntries: [],
  });
});

test("mechanical consistency rejects unresolved and cyclic retained aliases", () => {
  const unresolvedScripts = { a: "npm run missing" };
  const unresolved = buildVerificationCatalog({ packageScripts: unresolvedScripts });
  assert.deepEqual(checkVerificationCatalogConsistency(unresolved, { packageScripts: unresolvedScripts }), {
    schemaVersion: 1,
    kind: "verification-catalog-consistency",
    consistent: false,
    missingCatalogEntries: [],
    orphanCatalogEntries: [],
    unresolvedRecordRefs: [],
    entryMismatches: [],
    unresolvedSuiteRefs: ["a->missing"],
    cyclicSuiteRefs: [],
    invalidSuitePlans: [{ id: "a", error: "verification-plan-unresolved-ref:missing" }],
    unclassifiedCatalogEntries: [],
    targetlessDiscoveryEntries: [],
  });
  const cyclicScripts = { a: "npm run b", b: "npm run a" };
  const cyclic = buildVerificationCatalog({ packageScripts: cyclicScripts });
  assert.deepEqual(
    checkVerificationCatalogConsistency(cyclic, { packageScripts: cyclicScripts }).cyclicSuiteRefs,
    ["a->b->a"],
  );
});

test("models every mixed command-chain segment as an alias or stable inline leaf", () => {
  const catalog = buildVerificationCatalog({
    packageScripts: {
      leaf: "node --test tests/leaf.test.mjs",
      mixed: "node --test tests/direct.test.mjs && npm run python -- -m unittest tests.test_inline -q && npm run leaf",
    },
    records: [route("mixed", "mixed")],
  });
  const byId = new Map(catalog.entries.map((entry) => [entry.id, entry]));
  assert.equal(byId.get("mixed").kind, "suite");
  assert.deepEqual(byId.get("mixed").refs, [
    { id: "mixed#inline:01", args: [] },
    { id: "mixed#inline:02", args: [] },
    { id: "leaf", args: [] },
  ]);
  assert.deepEqual({
    kind: byId.get("mixed#inline:01").kind,
    runner: byId.get("mixed#inline:01").runner,
    files: byId.get("mixed#inline:01").files,
    sourceKind: byId.get("mixed#inline:01").sourceKind,
    sourceScript: byId.get("mixed#inline:01").sourceScript,
  }, {
    kind: "leaf",
    runner: "node-test",
    files: ["tests/direct.test.mjs"],
    sourceKind: "inline",
    sourceScript: "mixed",
  });
  assert.equal(byId.get("mixed#inline:02").runner, "python-unittest");
  const plan = buildVerificationSelectionPlan(catalog, ["mixed"]);
  assert.deepEqual(plan.executions.map((entry) => entry.id), [
    "mixed#inline:01",
    "leaf",
    "mixed#inline:02",
  ]);
  assert.deepEqual(plan.executions.find((entry) => entry.id === "mixed#inline:02").argv, [
    "run", "python", "--", "-m", "unittest", "tests.test_inline", "-q",
  ]);
});

test("propagates suite metadata to leaf plans and detects root-specific metadata conflicts", () => {
  const catalog = buildVerificationCatalog({
    packageScripts: {
      leaf: "node --test tests/leaf.test.mjs",
      suite: "npm run leaf",
    },
    records: [
      route("leaf", "leaf-domain", { cost: "fast", tier: undefined, ciProfile: "pr-fast" }),
      route("suite", "suite-domain", {
        cost: "heavy",
        executionOwner: "main-thread",
        platforms: ["win32"],
        resourceLocks: [".runtime-output"],
        tier: undefined,
        layer: "heavy",
        ciProfile: "full",
      }),
    ],
  });
  const plan = buildVerificationSelectionPlan(catalog, ["suite"], { platform: "win32" });
  const [execution] = plan.executions;
  assert.deepEqual({
    domains: execution.domains,
    cost: execution.cost,
    executionOwner: execution.executionOwner,
    platforms: execution.platforms,
    resourceLocks: execution.resourceLocks,
    tiers: execution.tiers,
    ciProfiles: execution.ciProfiles,
  }, {
    domains: ["leaf-domain", "suite-domain"],
    cost: "heavy",
    executionOwner: "main-thread",
    platforms: ["win32"],
    resourceLocks: [".runtime-output"],
    tiers: ["heavy"],
    ciProfiles: ["full", "pr-fast"],
  });
  assert.throws(
    () => buildVerificationSelectionPlan(catalog, ["leaf", "suite"]),
    /verification-plan-leaf-conflict:node-test:tests\/leaf\.test\.mjs:executionOwner/,
  );
});

test("creates catalog leaves for direct metadata command refs", () => {
  const directNode = "node tools/select_verification_targets.mjs --check";
  const directPython = "npm run python -- -m unittest tests.test_direct -q";
  const records = [
    { ...route(directNode, "selector"), commandType: "direct", packageScriptRequired: false, layer: "contract" },
    { ...route(directPython, "python"), commandType: "direct", packageScriptRequired: false, layer: "contract" },
  ];
  const catalog = buildVerificationCatalog({ packageScripts: {}, records });
  const byId = new Map(catalog.entries.map((entry) => [entry.id, entry]));
  assert.equal(byId.get(directNode).sourceKind, "direct-record");
  assert.equal(byId.get(directNode).runner, "node-script");
  assert.equal(byId.get(directPython).runner, "python-unittest");
  assert.deepEqual(byId.get(directPython).modules, ["tests.test_direct"]);
  assert.equal(checkVerificationCatalogConsistency(catalog, { packageScripts: {}, records }).consistent, true);
});

test("requires explicit execution metadata before a selected leaf can enter a plan", () => {
  const packageScripts = {
    leaf: "node --test tests/leaf.test.mjs",
    suite: "npm run leaf",
  };
  const unclassified = buildVerificationCatalog({ packageScripts });
  assert.equal(unclassified.entries.find((entry) => entry.id === "leaf").executionOwner, "unclassified");
  assert.throws(
    () => buildVerificationSelectionPlan(unclassified, ["leaf"]),
    /verification-plan-unclassified-leaf:leaf/,
  );
  const forged = {
    entries: [{
      ...unclassified.entries.find((entry) => entry.id === "leaf"),
      metadataComplete: true,
    }],
  };
  assert.throws(
    () => buildVerificationSelectionPlan(forged, ["leaf"]),
    /verification-plan-unclassified-leaf:leaf/,
  );
  const authorized = buildVerificationCatalog({
    packageScripts,
    records: [route("suite", "catalog", { resourceLocks: [".runtime-output"] })],
  });
  const [execution] = buildVerificationSelectionPlan(authorized, ["suite"]).executions;
  assert.equal(execution.executionOwner, "child-safe");
  assert.deepEqual(execution.resourceLocks, [".runtime-output"]);
});

test("recognizes direct Playwright binaries and rejects config discovery without an explicit owner", () => {
  const packageScripts = {
    direct: "playwright test tests/e2e/direct.spec.js --config=playwright.config.js --workers=1",
    discovery: "playwright.cmd test",
  };
  const records = [route("direct", "browser"), route("discovery", "browser")];
  const catalog = buildVerificationCatalog({ packageScripts, records });
  const direct = catalog.entries.find((entry) => entry.id === "direct");
  assert.equal(direct.runner, "playwright");
  assert.deepEqual(direct.specs, ["tests/e2e/direct.spec.js"]);
  assert.deepEqual(direct.runnerArgs, ["--config=playwright.config.js", "--workers=1"]);
  assert.deepEqual(buildVerificationSelectionPlan(catalog, ["direct"]).normalizedLeaves, [
    "playwright:tests/e2e/direct.spec.js",
  ]);
  const discovery = catalog.entries.find((entry) => entry.id === "discovery");
  assert.deepEqual(discovery.discovery, { kind: "playwright-config" });
  assert.throws(
    () => buildVerificationSelectionPlan(catalog, ["discovery"]),
    /verification-plan-targetless-leaf:discovery:playwright-config/,
  );
  const staleCatalog = {
    entries: [{
      ...discovery,
      targetless: undefined,
      discovery: undefined,
    }],
  };
  assert.throws(
    () => buildVerificationSelectionPlan(staleCatalog, ["discovery"]),
    /verification-plan-targetless-leaf:discovery:unknown/,
  );
});

test("keeps Node reporter modules outside normalized test file targets", () => {
  const catalog = buildVerificationCatalog({
    packageScripts: {
      node: "node --test tests/node.test.mjs --test-reporter=tools/reporter.mjs",
    },
    records: [route("node", "node")],
  });
  const [leaf] = catalog.entries;
  assert.deepEqual(leaf.files, ["tests/node.test.mjs"]);
  assert.deepEqual(leaf.runnerArgs, ["--test-reporter=tools/reporter.mjs"]);
  assert.deepEqual(buildVerificationSelectionPlan(catalog, ["node"]).normalizedLeaves, [
    "node-test:tests/node.test.mjs",
  ]);
});

test("keeps unittest filter values outside normalized Python modules", () => {
  const catalog = buildVerificationCatalog({
    packageScripts: {
      python: "python -m unittest -k=smoke tests.test_python -q",
    },
    records: [route("python", "python")],
  });
  const [leaf] = catalog.entries;
  assert.deepEqual(leaf.modules, ["tests.test_python"]);
  assert.deepEqual(leaf.runnerArgs, ["-k=smoke", "-q"]);
  assert.deepEqual(buildVerificationSelectionPlan(catalog, ["python"]).normalizedLeaves, [
    "python-unittest:tests.test_python",
  ]);
});

test("uses Node module identity to reject duplicate and conflicting invocations", () => {
  const duplicateCatalog = buildVerificationCatalog({
    packageScripts: {
      unix: "node tools/check.mjs --mode same",
      windows: "node tools\\check.mjs --mode same",
      both: "npm run unix && npm run windows",
    },
    records: [route("both", "node-tools")],
  });
  assert.throws(
    () => buildVerificationSelectionPlan(duplicateCatalog, ["both"]),
    /verification-plan-duplicate-leaf:node-script:tools\/check\.mjs/,
  );
  const conflictCatalog = buildVerificationCatalog({
    packageScripts: {
      first: "node tools/check.mjs --mode a",
      second: "node tools/check.mjs --mode b",
      both: "npm run first && npm run second",
    },
    records: [route("both", "node-tools")],
  });
  assert.throws(
    () => buildVerificationSelectionPlan(conflictCatalog, ["both"]),
    /verification-plan-leaf-conflict:node-script:tools\/check\.mjs:argv/,
  );
});

test("treats Windows and Unix Python targets as the same normalized leaf", () => {
  const catalog = buildVerificationCatalog({
    packageScripts: {
      unix: "python -m unittest tests/test_same.py -q",
      windows: "python -m unittest tests\\test_same.py -q",
      both: "npm run unix && npm run windows",
    },
    records: [route("both", "python")],
  });
  assert.throws(
    () => buildVerificationSelectionPlan(catalog, ["both"]),
    /verification-plan-duplicate-leaf:python-unittest:tests\/test_same\.py/,
  );
});

test("reports deterministic command, target, and execution metadata drift", () => {
  const packageScripts = { a: "node --test tests/a.test.mjs" };
  const records = [route("a", "a")];
  const catalog = buildVerificationCatalog({ packageScripts, records });
  const commandDrift = checkVerificationCatalogConsistency(catalog, {
    packageScripts: { a: "node --test tests/b.test.mjs" },
    records,
  });
  assert.deepEqual(commandDrift.entryMismatches, [{
    id: "a",
    fields: ["argv", "command", "files"],
  }]);
  assert.equal(commandDrift.consistent, false);

  const metadataDrift = checkVerificationCatalogConsistency(catalog, {
    packageScripts,
    records: [route("a", "a", {
      executionOwner: "main-thread",
      platforms: ["win32"],
      resourceLocks: [".runtime-output"],
      ciProfile: "full",
    })],
  });
  assert.deepEqual(metadataDrift.entryMismatches, [{
    id: "a",
    fields: ["ciProfiles", "executionOwner", "platforms", "resourceLocks"],
  }]);
  assert.equal(metadataDrift.consistent, false);
});

test("real package scripts and verification domains form one mechanically consistent catalog", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  const catalog = buildVerificationCatalog({
    packageScripts: packageJson.scripts,
    records: VERIFICATION_DOMAINS,
  });
  const consistency = checkVerificationCatalogConsistency(catalog, {
    packageScripts: packageJson.scripts,
    records: VERIFICATION_DOMAINS,
  });
  assert.equal(consistency.consistent, true);
  assert.deepEqual({
    missingCatalogEntries: consistency.missingCatalogEntries,
    orphanCatalogEntries: consistency.orphanCatalogEntries,
    unresolvedRecordRefs: consistency.unresolvedRecordRefs,
    entryMismatches: consistency.entryMismatches,
    unresolvedSuiteRefs: consistency.unresolvedSuiteRefs,
    cyclicSuiteRefs: consistency.cyclicSuiteRefs,
    invalidSuitePlans: consistency.invalidSuitePlans,
  }, {
    missingCatalogEntries: [],
    orphanCatalogEntries: [],
    unresolvedRecordRefs: [],
    entryMismatches: [],
    unresolvedSuiteRefs: [],
    cyclicSuiteRefs: [],
    invalidSuitePlans: [],
  });
  assert.ok(consistency.unclassifiedCatalogEntries.includes("bench:editor-performance"));
  assert.ok(consistency.unclassifiedCatalogEntries.includes("test:e2e"));
  assert.deepEqual(consistency.targetlessDiscoveryEntries, ["test:e2e"]);
  const directRefs = VERIFICATION_DOMAINS
    .filter((entry) => entry.commandType === "direct")
    .map((entry) => entry.commandRef);
  const catalogIds = new Set(catalog.entries.map((entry) => entry.id));
  assert.ok(catalogIds.has("node tools/select_verification_targets.mjs --check"));
  assert.ok(catalogIds.has(directRefs.find((commandRef) => commandRef.includes("tests.test_app_entry_resolver"))));
});
