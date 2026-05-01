const fs = require("fs");
const path = require("path");

function toRepoPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

class FailureContextReporter {
  constructor() {
    this.outputFile = process.env.PLAYWRIGHT_FAILURE_CONTEXT_INDEX_FILE
      || path.join(process.cwd(), ".runtime", "reports", "generated", "failure-context-index.ndjson");
  }

  printsToStdio() {
    return false;
  }

  onTestEnd(test, result) {
    if (!["failed", "timedOut", "interrupted"].includes(String(result.status || ""))) {
      return;
    }
    try {
      fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
      const failureContextAttachment = (result.attachments || []).find((attachment) => {
        const attachmentPath = String(attachment.path || "");
        return (/failure-context/i.test(String(attachment.name || ""))
          || path.basename(attachmentPath) === "failure-context.json")
          && typeof attachment.path === "string"
          && attachment.path.trim();
      });
      const entry = {
        ts: new Date(result.startTime || Date.now()).toISOString(),
        specPath: test.location?.file ? toRepoPath(path.relative(process.cwd(), test.location.file)) : "",
        title: String(test.title || ""),
        status: String(result.status || ""),
        retry: Number(result.retry || 0),
        durationMs: Number(result.duration || 0),
        failureContextPath: failureContextAttachment?.path
          ? toRepoPath(path.relative(process.cwd(), failureContextAttachment.path))
          : "",
        errorMessage: String(result.error?.message || ""),
      };
      fs.appendFileSync(this.outputFile, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (_error) {
      // Reporter failures must stay best-effort so they never hide the underlying test result.
    }
  }
}

module.exports = FailureContextReporter;
