const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function toRepoPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function resolveGitSha() {
  if (process.env.GITHUB_SHA) {
    return String(process.env.GITHUB_SHA).trim();
  }
  try {
    return execSync("git rev-parse HEAD", {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
    }).toString("utf8").trim();
  } catch (_error) {
    return "";
  }
}

class TimingReporter {
  constructor() {
    this.outputFile = process.env.PLAYWRIGHT_TIMING_OUTPUT_FILE
      || path.join(process.cwd(), ".runtime", "reports", "test-timings.ndjson");
    this.gitSha = resolveGitSha();
  }

  printsToStdio() {
    return false;
  }

  onTestEnd(test, result) {
    try {
      fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
      const failureContextAttachment = (result.attachments || []).find((attachment) => {
        return /failure-context/i.test(String(attachment.name || ""))
          && typeof attachment.path === "string"
          && attachment.path.trim();
      });
      const entry = {
        ts: new Date(result.startTime || Date.now()).toISOString(),
        specPath: test.location?.file ? toRepoPath(path.relative(process.cwd(), test.location.file)) : "",
        title: String(test.title || ""),
        durationMs: Number(result.duration || 0),
        status: String(result.status || ""),
        retry: Number(result.retry || 0),
        workerIndex: Number(result.parallelIndex || 0),
        gitSha: this.gitSha,
        failureContextPath: failureContextAttachment?.path
          ? toRepoPath(path.relative(process.cwd(), failureContextAttachment.path))
          : "",
      };
      fs.appendFileSync(this.outputFile, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (_error) {
      // Reporter failures must stay best-effort so they never hide the underlying test result.
    }
  }
}

module.exports = TimingReporter;
