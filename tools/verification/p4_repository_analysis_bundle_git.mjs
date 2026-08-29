import path from "node:path";
import { spawnSync } from "node:child_process";

import { produceP4RepositoryAnalysisBundle } from "./p4_repository_analysis_bundle.mjs";

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  throw error;
}

function canonicalRepositoryPath(value, label = "path") {
  const normalized = String(value || "");
  if (
    !normalized
    || normalized.includes("\\")
    || normalized.includes("\0")
    || normalized.startsWith("/")
    || /^[A-Za-z]:/u.test(normalized)
    || normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    fail("p4-repository-analysis-git-path-invalid", `${label} must be a canonical repository path.`);
  }
  return normalized;
}

function createGitRunner(cwd, runner) {
  const resolvedCwd = path.resolve(String(cwd || "."));
  return function runGit(args, {
    encoding = "utf8",
    acceptedStatuses = [0],
    input = undefined,
  } = {}) {
    const result = runner("git", args, {
      cwd: resolvedCwd,
      encoding,
      input,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      maxBuffer: 128 * 1024 * 1024,
      windowsHide: true,
    });
    if (result.error || !acceptedStatuses.includes(result.status)) {
      const stderr = Buffer.isBuffer(result.stderr)
        ? result.stderr.toString("utf8")
        : String(result.stderr || "");
      fail(
        "p4-repository-analysis-git-command-failed",
        `git ${args[0]} failed with status ${String(result.status)}: ${stderr.trim()}`,
        { args: [...args], status: result.status, cause: result.error },
      );
    }
    return result;
  };
}

export function createGitP4RepositoryAnalysisReader({
  cwd = process.cwd(),
  runner = spawnSync,
} = {}) {
  if (typeof runner !== "function") {
    fail("p4-repository-analysis-git-runner-invalid", "runner must be a function.");
  }
  const initialRunGit = createGitRunner(cwd, runner);
  const repositoryRoot = String(initialRunGit(["rev-parse", "--show-toplevel"]).stdout).trim();
  if (!repositoryRoot) {
    fail("p4-repository-analysis-git-root-invalid", "Git repository root is unavailable.");
  }
  const runGit = createGitRunner(repositoryRoot, runner);

  const reader = {
    async resolveSourceIdentity(ref = "HEAD") {
      const normalizedRef = String(ref || "HEAD").trim() || "HEAD";
      const sha = String(runGit(["rev-parse", "--verify", `${normalizedRef}^{commit}`]).stdout).trim();
      const treeSha = String(runGit(["rev-parse", "--verify", `${sha}^{tree}`]).stdout).trim();
      if (!/^[0-9a-f]{40}$/u.test(sha) || !/^[0-9a-f]{40}$/u.test(treeSha)) {
        fail("p4-repository-analysis-git-identity-invalid", "Git returned an invalid SHA/tree identity.");
      }
      return Object.freeze({ sha, treeSha });
    },

    async assertTrackedSourceIdentity(source) {
      const result = runGit(
        ["diff", "--quiet", String(source?.sha || ""), "--"],
        { acceptedStatuses: [0, 1] },
      );
      if (result.status !== 0) {
        fail(
          "p4-repository-analysis-git-worktree-drift",
          "Tracked repository bytes differ from the frozen source commit.",
        );
      }
      const observed = await this.resolveSourceIdentity(source.sha);
      if (observed.sha !== source.sha || observed.treeSha !== source.treeSha) {
        fail(
          "p4-repository-analysis-git-identity-drift",
          "Source SHA/tree changed during repository analysis.",
        );
      }
      return observed;
    },

    async readBlob({ sourceSha, path: repositoryPath }) {
      const normalizedPath = canonicalRepositoryPath(repositoryPath, "repositoryPath");
      const result = runGit(
        [
          "ls-tree",
          "-z",
          "--full-tree",
          String(sourceSha || ""),
          "--",
          `:(literal)${normalizedPath}`,
        ],
        { encoding: null },
      );
      const output = Buffer.from(result.stdout || []);
      const records = output.toString("utf8").split("\0").filter(Boolean);
      if (records.length !== 1) {
        fail(
          "p4-repository-analysis-git-blob-missing",
          `Expected one Git blob for ${normalizedPath}; found ${records.length}.`,
          { path: normalizedPath },
        );
      }
      const match = /^(\d{6}) (\w+) ([0-9a-f]{40})\t(.+)$/u.exec(records[0]);
      if (!match || match[2] !== "blob" || match[4] !== normalizedPath) {
        fail(
          "p4-repository-analysis-git-blob-invalid",
          `Git tree entry is invalid for ${normalizedPath}.`,
          { path: normalizedPath },
        );
      }
      const blob = runGit(["cat-file", "blob", match[3]], { encoding: null });
      return Object.freeze({
        mode: match[1],
        bytes: Buffer.from(blob.stdout || []),
      });
    },

    async readBlobs({ sourceSha, paths }) {
      if (!Array.isArray(paths) || paths.length === 0) {
        fail("p4-repository-analysis-git-inputs-invalid", "paths must be non-empty.");
      }
      const normalizedPaths = paths.map((entry, index) => (
        canonicalRepositoryPath(entry, `paths[${index}]`)
      ));
      const tree = runGit(
        ["ls-tree", "-r", "-z", "--full-tree", String(sourceSha || "")],
        { encoding: null },
      );
      const entries = new Map();
      for (const record of Buffer.from(tree.stdout || []).toString("utf8").split("\0").filter(Boolean)) {
        const match = /^(\d{6}) (\w+) ([0-9a-f]{40})\t(.+)$/u.exec(record);
        if (match && match[2] === "blob") {
          entries.set(match[4], { mode: match[1], oid: match[3] });
        }
      }
      const selected = normalizedPaths.map((repositoryPath) => {
        const entry = entries.get(repositoryPath);
        if (!entry) {
          fail(
            "p4-repository-analysis-git-blob-missing",
            `Git source does not contain ${repositoryPath}.`,
            { path: repositoryPath },
          );
        }
        return { path: repositoryPath, ...entry };
      });
      const batch = runGit(
        ["cat-file", "--batch"],
        {
          encoding: null,
          input: Buffer.from(`${selected.map((entry) => entry.oid).join("\n")}\n`, "utf8"),
        },
      );
      const output = Buffer.from(batch.stdout || []);
      let offset = 0;
      const blobs = selected.map((entry) => {
        const headerEnd = output.indexOf(0x0a, offset);
        if (headerEnd < 0) {
          fail("p4-repository-analysis-git-batch-invalid", "Git cat-file batch header is truncated.");
        }
        const header = output.subarray(offset, headerEnd).toString("utf8");
        const match = /^([0-9a-f]{40}) blob (\d+)$/u.exec(header);
        if (!match || match[1] !== entry.oid) {
          fail("p4-repository-analysis-git-batch-invalid", `Git cat-file identity drifted for ${entry.path}.`);
        }
        const size = Number(match[2]);
        const start = headerEnd + 1;
        const end = start + size;
        if (!Number.isSafeInteger(size) || end >= output.length || output[end] !== 0x0a) {
          fail("p4-repository-analysis-git-batch-invalid", `Git cat-file payload is invalid for ${entry.path}.`);
        }
        offset = end + 1;
        return Object.freeze({ mode: entry.mode, bytes: Buffer.from(output.subarray(start, end)) });
      });
      if (offset !== output.length) {
        fail("p4-repository-analysis-git-batch-invalid", "Git cat-file batch has trailing bytes.");
      }
      return blobs;
    },
  };
  return Object.freeze(reader);
}

export async function produceGitBackedP4RepositoryAnalysisBundle({
  cwd = process.cwd(),
  sourceRef = "HEAD",
  inputPaths,
  authorityPaths,
  extractFacts,
  runner = spawnSync,
} = {}) {
  if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
    fail("p4-repository-analysis-git-inputs-invalid", "inputPaths must be non-empty.");
  }
  if (typeof extractFacts !== "function") {
    fail("p4-repository-analysis-git-extractor-invalid", "extractFacts must be a function.");
  }
  const repository = createGitP4RepositoryAnalysisReader({ cwd, runner });
  const source = await repository.resolveSourceIdentity(sourceRef);
  await repository.assertTrackedSourceIdentity(source);
  const normalizedInputPaths = inputPaths.map((inputPath, index) => (
    canonicalRepositoryPath(inputPath, `inputPaths[${index}]`)
  ));
  const blobs = await repository.readBlobs({ sourceSha: source.sha, paths: normalizedInputPaths });
  const inputs = normalizedInputPaths.map((inputPath, index) => ({
    path: inputPath,
    mode: blobs[index].mode,
    bytes: blobs[index].bytes,
  }));
  const facts = await extractFacts({ source, repository });
  await repository.assertTrackedSourceIdentity(source);
  return produceP4RepositoryAnalysisBundle({
    source,
    inputs,
    authorityPaths,
    facts,
  });
}
