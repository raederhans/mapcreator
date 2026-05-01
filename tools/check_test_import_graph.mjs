import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const REPO_ROOT = process.cwd();
const CHECKED_IN_GRAPH = path.join(REPO_ROOT, "tests", "e2e", "test-import-graph.json");
const TMP_ROOT = path.join(REPO_ROOT, ".runtime", "tmp", "test-import-graph-check");

function runBuild(graphOut, summaryJsonOut, summaryMdOut) {
  const result = spawnSync("node", [
    "tools/build_test_import_graph.mjs",
    "--graph-out",
    graphOut,
    "--summary-json-out",
    summaryJsonOut,
    "--summary-md-out",
    summaryMdOut,
  ], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: false,
    encoding: "utf8",
  });
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function main() {
  if (!fs.existsSync(CHECKED_IN_GRAPH)) {
    console.error(`Missing checked-in import graph: ${path.relative(REPO_ROOT, CHECKED_IN_GRAPH)}`);
    process.exit(1);
  }

  fs.mkdirSync(TMP_ROOT, { recursive: true });
  const tmpGraph = path.join(TMP_ROOT, "test-import-graph.json");
  const tmpSummaryJson = path.join(TMP_ROOT, "test-import-graph-summary.json");
  const tmpSummaryMd = path.join(TMP_ROOT, "test-import-graph-summary.md");
  runBuild(tmpGraph, tmpSummaryJson, tmpSummaryMd);

  const expected = JSON.parse(fs.readFileSync(CHECKED_IN_GRAPH, "utf8"));
  const actual = JSON.parse(fs.readFileSync(tmpGraph, "utf8"));
  delete expected.generatedAt;
  delete actual.generatedAt;
  if (Array.isArray(actual.unresolved) && actual.unresolved.length > 0) {
    console.error(`Generated import graph still has ${actual.unresolved.length} unresolved dependency entries.`);
    process.exit(1);
  }
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    console.error("Checked-in test-import-graph.json is stale. Re-run node tools/build_test_import_graph.mjs.");
    process.exit(1);
  }
  console.log("Test import graph check passed.");
}

main();
