import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRepositoryCatalogProjectionShadowComparison } from "./catalog_projection_legacy.mjs";
import { advanceCatalogProjectionShadowReceipt } from "./catalog_projection_shadow.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_OUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "catalog-projection-shadow", "receipt.json");

function git(args) {
  const completed = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
  if (completed.status !== 0) throw new Error(`catalog-projection-shadow-git:${args.join(":")}`);
  return String(completed.stdout || "").trim();
}

function parseArgs(argv) {
  const options = { out: DEFAULT_OUT, previous: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--out" || argument === "--previous") {
      const value = argv[index + 1];
      if (!value) throw new Error(`catalog-projection-shadow-missing-value:${argument}`);
      options[argument.slice(2)] = path.resolve(REPO_ROOT, value);
      index += 1;
      continue;
    }
    throw new Error(`catalog-projection-shadow-unknown-argument:${argument}`);
  }
  return options;
}

function readPrevious(previousPath) {
  if (!previousPath) return null;
  return JSON.parse(fs.readFileSync(previousPath, "utf8"));
}

function writeReceipt(receipt, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, outputPath);
}

export function runCatalogProjectionShadowCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const workspaceStatus = git(["status", "--porcelain=v1", "--untracked-files=all"]);
  if (workspaceStatus !== "") throw new Error("catalog-projection-shadow-workspace-not-clean");
  const verificationSha = git(["rev-parse", "HEAD"]);
  const verificationTreeSha = git(["rev-parse", "HEAD^{tree}"]);
  const comparison = buildRepositoryCatalogProjectionShadowComparison();
  const receipt = advanceCatalogProjectionShadowReceipt({
    comparison,
    sourceIdentity: comparison.sourceIdentity,
    runIdentity: {
      runId: `local-${verificationSha}`,
      verificationSha,
      verificationTreeSha,
    },
    previousReceipt: readPrevious(options.previous),
  });
  writeReceipt(receipt, options.out);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  return comparison.equal ? 0 : 1;
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    process.exitCode = runCatalogProjectionShadowCli();
  } catch (error) {
    console.error(error?.stack || String(error));
    process.exitCode = 2;
  }
}
