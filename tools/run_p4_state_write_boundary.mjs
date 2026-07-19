import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const REPORT_DIR = path.join(
  REPO_ROOT,
  ".runtime",
  "reports",
  "generated",
  "p4-state-actions",
  "P4.0",
);
const REPORT_PATH = path.join(REPORT_DIR, "state-write-boundary.log");

function run() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const result = spawnSync(
    process.execPath,
    [
      "tools/run_python.mjs",
      "-m",
      "unittest",
      "tests.test_state_write_guardrail_contract",
      "-q",
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      shell: false,
    },
  );
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const report = [
    stdout.trimEnd(),
    stderr.trimEnd(),
  ].filter(Boolean).join("\n");
  fs.writeFileSync(REPORT_PATH, `${report}\n`, "utf8");
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`P4 state write boundary exited with signal ${result.signal}.`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

run();
