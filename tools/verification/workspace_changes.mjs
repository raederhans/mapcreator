import { spawnSync } from "node:child_process";

// Keep rename/copy source paths: their former owner still needs verification.
export function parsePorcelainChangedFiles(output) {
  const records = String(output || "").split("\0");
  const files = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    if (record.length < 4 || record[2] !== " ") {
      throw new Error("verify-commit-porcelain-malformed");
    }
    const status = record.slice(0, 2);
    const file = record.slice(3);
    if (!file) throw new Error("verify-commit-porcelain-path-missing");
    files.push(file);
    if (/[RC]/u.test(status)) {
      const previousPath = records[index + 1];
      if (!previousPath) throw new Error("verify-commit-porcelain-previous-path-missing");
      files.push(previousPath);
      index += 1;
    }
  }
  return [...new Set(files)].sort();
}

export function discoverWorkspaceChangedFiles({
  runner = spawnSync,
  cwd = process.cwd(),
  failureCode = "adaptive-workspace-discovery-failed",
} = {}) {
  const result = runner("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd, encoding: "utf8", shell: false,
  });
  if (result?.status !== 0) {
    const error = new Error(failureCode);
    error.code = failureCode;
    throw error;
  }
  return parsePorcelainChangedFiles(result.stdout);
}
