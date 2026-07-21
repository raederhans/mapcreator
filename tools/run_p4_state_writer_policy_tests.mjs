import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = process.cwd();
const REPORT_DIR = path.join(
  REPO_ROOT,
  ".runtime",
  "reports",
  "generated",
  "p4-state-actions",
  "P4.0",
);
const REPORT_PATH = path.join(REPORT_DIR, "state-writer-policy-tests.tap");
export const P4_STATE_WRITER_POLICY_TEST_FILES = Object.freeze([
  "tests/state_action_delegation_edges_behavior.test.mjs",
  "tests/state_writer_policy_behavior.test.mjs",
  "tests/state_writer_policy_batch_scan_behavior.test.mjs",
  "tests/state_writer_policy_soundness_behavior.test.mjs",
  "tests/state_writer_scanner_soundness_behavior.test.mjs",
  "tests/state_writer_policy_manifest_behavior.test.mjs",
  "tests/p4_state_action_routes_behavior.test.mjs",
  "tests/p4_state_writer_runner_reachability_behavior.test.mjs",
]);

export function resolveP4StateWriterPolicyTestFiles(
  requestedTestFiles = [],
) {
  return requestedTestFiles.length
    ? [...requestedTestFiles]
    : [...P4_STATE_WRITER_POLICY_TEST_FILES];
}

export function run(requestedTestFiles = process.argv.slice(2)) {
  const testFiles = resolveP4StateWriterPolicyTestFiles(requestedTestFiles);
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const stderrComments = stderr
    .trimEnd()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `# stderr: ${line}`)
    .join("\n");
  const report = [
    stdout.trimEnd(),
    stderrComments,
  ].filter(Boolean).join("\n");
  fs.writeFileSync(REPORT_PATH, `${report}\n`, "utf8");
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`P4 state writer policy tests exited with signal ${result.signal}.`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  run();
}
