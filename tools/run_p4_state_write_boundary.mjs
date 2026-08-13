import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  buildStrictStateWriterEvidenceEnvironment,
  createStateWriterPolicyEvidenceSession,
  ensureStateWriterPolicyEvidence,
  readCurrentStateWriterPolicyPhase,
} from "./verification/state_writer_policy_evidence.mjs";

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
  const liveFallbackSession = createStateWriterPolicyEvidenceSession();
  const phase = readCurrentStateWriterPolicyPhase({ cwd: REPO_ROOT });
  const evidenceResult = ensureStateWriterPolicyEvidence({
    cwd: REPO_ROOT,
    phase,
    producer: {
      entrypoint: "tools/run_p4_state_write_boundary.mjs",
      commandRef: "test:python:p4:state-write-boundary",
    },
    liveFallbackSession,
  });
  const evidenceTrace = [
    "State writer policy evidence",
    `id=${evidenceResult.evidenceId}`,
    `phase=${phase}`,
    `path=${evidenceResult.evidencePath}`,
    `source=${evidenceResult.sourceVerificationSha}`,
    `tree=${evidenceResult.sourceVerificationTreeSha}`,
    `disposition=${evidenceResult.disposition}`,
    `producer=${evidenceResult.producer.entrypoint}`,
    `producerCommand=${evidenceResult.producer.commandRef}`,
  ].join(" ");
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
      env: buildStrictStateWriterEvidenceEnvironment(evidenceResult, {
        cwd: REPO_ROOT,
      }),
    },
  );
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const report = [
    evidenceTrace,
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

try {
  run();
} catch (error) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const diagnostic = [
    "State writer policy evidence setup failed",
    `code=${error?.code || "state-writer-evidence-wrapper-error"}`,
    `disposition=${error?.disposition || "blocked"}`,
    `message=${error?.message || String(error)}`,
  ].join(" ");
  fs.writeFileSync(REPORT_PATH, `${diagnostic}\n`, "utf8");
  console.error(diagnostic);
  process.exit(2);
}
