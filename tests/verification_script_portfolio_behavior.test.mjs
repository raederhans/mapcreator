import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildScriptPortfolio,
  CANONICAL_VERIFICATION_ENTRYPOINTS,
  formatScriptPortfolioJson,
  formatScriptPortfolioMarkdown,
  formatScriptPortfolioSummary,
  parseScriptPortfolioArgs,
} from "../tools/verification/script_portfolio.mjs";

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
