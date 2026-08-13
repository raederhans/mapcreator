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
const QUICK_REPORT_PATH = path.join(REPORT_DIR, "state-writer-policy-tests.quick.tap");
const FOCUSED_REPORT_PATH = path.join(REPORT_DIR, "state-writer-policy-tests.focused.tap");
export const P4_STATE_WRITER_POLICY_RUN_MODE_ENV =
  "MAPCREATOR_INTERNAL_P4_STATE_WRITER_POLICY_RUN_MODE";
const P4_STATE_WRITER_POLICY_RUN_MODES = Object.freeze([
  "full",
  "focused",
  "quick",
]);
export const P4_STATE_WRITER_POLICY_TEST_FILES = Object.freeze([
  "tests/state_action_delegation_edges_behavior.test.mjs",
  "tests/state_writer_policy_behavior.test.mjs",
  "tests/state_writer_policy_batch_scan_behavior.test.mjs",
  "tests/state_writer_policy_soundness_behavior.test.mjs",
  "tests/state_writer_scanner_soundness_behavior.test.mjs",
  "tests/state_writer_policy_manifest_behavior.test.mjs",
  "tests/state_writer_policy_evidence_behavior.test.mjs",
  "tests/p4_state_action_routes_behavior.test.mjs",
  "tests/p4_state_writer_runner_reachability_behavior.test.mjs",
]);
export const P4_STATE_WRITER_POLICY_QUICK_TEST_FILES = Object.freeze(
  P4_STATE_WRITER_POLICY_TEST_FILES.filter((testFile) => (
    testFile !== "tests/state_writer_policy_manifest_behavior.test.mjs"
  )),
);

export function resolveP4StateWriterPolicyTestFiles(
  requestedTestFiles = [],
) {
  return requestedTestFiles.length
    ? [...requestedTestFiles]
    : [...P4_STATE_WRITER_POLICY_TEST_FILES];
}

export function resolveP4StateWriterPolicyRun(argv = []) {
  if (argv.includes("--quick")) {
    if (argv.length !== 1) {
      throw new Error("--quick cannot be combined with focused Node test arguments.");
    }
    return {
      mode: "quick",
      testArguments: [...P4_STATE_WRITER_POLICY_QUICK_TEST_FILES],
      reportPath: QUICK_REPORT_PATH,
    };
  }
  return {
    mode: argv.length ? "focused" : "full",
    testArguments: resolveP4StateWriterPolicyTestFiles(argv),
    reportPath: argv.length ? FOCUSED_REPORT_PATH : REPORT_PATH,
  };
}

export function buildP4StateWriterPolicyChildEnv(
  mode,
  parentEnv = process.env,
) {
  const normalizedMode = String(mode || "");
  if (!P4_STATE_WRITER_POLICY_RUN_MODES.includes(normalizedMode)) {
    const error = new Error(
      `Unsupported P4 state-writer policy run mode: ${normalizedMode || "<empty>"}.`,
    );
    error.code = "p4-state-writer-policy-run-mode-invalid";
    error.mode = normalizedMode;
    throw error;
  }
  return {
    ...parentEnv,
    [P4_STATE_WRITER_POLICY_RUN_MODE_ENV]: normalizedMode,
  };
}

export function assertP4StateWriterPolicyManifestRunMode({
  env = process.env,
} = {}) {
  const mode = String(env?.[P4_STATE_WRITER_POLICY_RUN_MODE_ENV] || "");
  if (mode === "full" || mode === "focused") return mode;
  const error = new Error([
    "The state-writer policy manifest suite requires the official full or focused runner.",
    "Run: npm run test:node:p4:state-writer-policy -- --test-name-pattern=\"<pattern>\" tests/state_writer_policy_manifest_behavior.test.mjs",
  ].join(" "));
  error.code = "p4-state-writer-policy-manifest-run-mode-required";
  error.mode = mode;
  throw error;
}

export function spawnP4StateWriterPolicyTestProcess(
  testArguments,
  {
    mode,
    runner = spawnSync,
    parentEnv = process.env,
  } = {},
) {
  return runner(process.execPath, ["--test", ...testArguments], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: buildP4StateWriterPolicyChildEnv(mode, parentEnv),
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
  });
}

export function run(
  testArguments = resolveP4StateWriterPolicyRun(process.argv.slice(2)).testArguments,
  {
    reportPath = REPORT_PATH,
    mode = "full",
  } = {},
) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const result = spawnP4StateWriterPolicyTestProcess(testArguments, {
    mode,
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
  fs.writeFileSync(reportPath, `${report}\n`, "utf8");
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
  const request = resolveP4StateWriterPolicyRun(process.argv.slice(2));
  run(request.testArguments, {
    mode: request.mode,
    reportPath: request.reportPath,
  });
}
