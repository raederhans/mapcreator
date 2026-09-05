import assert from "node:assert/strict";
import test from "node:test";
import { VERIFICATION_CATALOG_SOURCE_FILES } from "../tools/verification/catalog/source_files.mjs";
import {
  buildCommitVerificationPlan,
  discoverChangedFiles as discoverCommitChangedFiles,
  parsePorcelainChangedFiles,
  parseCommitVerificationArgs,
  runCommitVerification,
  runCommitVerificationCli,
} from "../tools/run_commit_verification.mjs";

test("commit runner batches its canonical control-plane contract and keeps product edits adaptive", () => {
  const controlPlan = buildCommitVerificationPlan([
    "docs/active/test-verification-reform-20260813/task.md",
  ]);
  assert.equal(controlPlan.mode, "control-plane");
  assert.deepEqual(controlPlan.commands.at(-1), ["node", [
    "--test",
    "tests/verification_metadata_behavior.test.mjs",
    "tests/catalog_projection_shadow_behavior.test.mjs",
    "tests/verification_script_portfolio_behavior.test.mjs",
    "tests/verify_core_runner_behavior.test.mjs",
    "tests/verify_commit_runner_behavior.test.mjs",
  ]]);
  assert.equal(controlPlan.commands.some(([, args]) => args.includes("verify:pages-dist")), false);

  const derivedControlPlan = buildCommitVerificationPlan([
    "tools/run_adaptive_tests.mjs",
    "tools/select_verification_targets.mjs",
    "tools/verification/script_portfolio.mjs",
    "tools/verification/verification_profile.mjs",
    "tools/ai_test_supervisor/domain_registry.json",
  ]);
  assert.equal(derivedControlPlan.mode, "control-plane+adaptive-edit");
  assert.deepEqual(
    derivedControlPlan.commands.find(([, args]) => args[0] === "--test"),
    controlPlan.commands.at(-1),
  );

  const sharedPackagePlan = buildCommitVerificationPlan(["package.json"]);
  assert.equal(sharedPackagePlan.mode, "control-plane+adaptive-edit");
  assert.ok(sharedPackagePlan.commands.some(([, args]) => args.includes("verify:script-portfolio")));
  assert.ok(sharedPackagePlan.commands.some(([, args]) => args[0] === "tools/select_verification_targets.mjs"));
  assert.equal(sharedPackagePlan.commands.filter(([, args]) => args[0] === "--test").length, 1);
  assert.deepEqual(sharedPackagePlan.commands.at(-1).at(1).slice(-2), [
    "--changed-file",
    "package.json",
  ]);

  const productPlan = buildCommitVerificationPlan(["js/core/scenario_chunk_manager.js"]);
  assert.equal(productPlan.mode, "adaptive-edit");
  assert.deepEqual(productPlan.commands.at(-1), ["node", [
    "tools/run_adaptive_tests.mjs",
    "--entrypoint",
    "edit",
    "--execute",
    "--defer-main-thread",
    "--changed-file",
    "js/core/scenario_chunk_manager.js",
  ]]);

  const mixedPlan = buildCommitVerificationPlan([
    "package.json",
    "js/core/scenario_chunk_manager.js",
  ]);
  assert.equal(mixedPlan.mode, "control-plane+adaptive-edit");
  assert.equal(mixedPlan.commands.filter(([, args]) => args[0] === "--test").length, 1);
  assert.deepEqual(mixedPlan.commands.at(-1).at(1).slice(-4), [
    "--changed-file", "js/core/scenario_chunk_manager.js",
    "--changed-file", "package.json",
  ]);
});

test("split catalog modules retain exact commit control-plane coverage", () => {
  const baseline = buildCommitVerificationPlan(["tools/verification/verification_catalog_source.mjs"]);
  assert.equal(baseline.mode, "control-plane+adaptive-edit");
  for (const file of VERIFICATION_CATALOG_SOURCE_FILES) {
    const plan = buildCommitVerificationPlan([file]);
    assert.equal(plan.mode, baseline.mode, file);
    assert.deepEqual(plan.commands.slice(0, -1), baseline.commands.slice(0, -1), file);
    assert.deepEqual(plan.commands.at(-1)[1].slice(-2), ["--changed-file", file]);
  }
  for (const file of [
    "tools/verification/catalog/unregistered.mjs",
    "tools/verification/catalog/source_files.mjs.bak",
    "tools/verification/catalog-other/policies.mjs",
  ]) {
    const plan = buildCommitVerificationPlan([file]);
    assert.equal(plan.mode, "adaptive-edit", file);
    assert.equal(plan.commands.some(([, args]) => args[0] === "--test"), false, file);
  }
});

test("commit runner discovers unstaged, staged, and untracked paths from porcelain", () => {
  assert.deepEqual(parsePorcelainChangedFiles([
    " M unstaged.js",
    "M  staged.py",
    "?? untracked.mjs",
  ].join("\0") + "\0"), ["staged.py", "unstaged.js", "untracked.mjs"]);
  const renamedFiles = parsePorcelainChangedFiles("R  docs/renamed.md\0js/core/scenario_chunk_manager.js\0");
  assert.deepEqual(renamedFiles, [
    "docs/renamed.md",
    "js/core/scenario_chunk_manager.js",
  ]);
  const renamedPlan = buildCommitVerificationPlan(renamedFiles);
  assert.equal(renamedPlan.mode, "adaptive-edit");
  assert.deepEqual(renamedPlan.commands.at(-1).at(1).slice(-2), [
    "--changed-file",
    "js/core/scenario_chunk_manager.js",
  ]);
  assert.throws(() => parsePorcelainChangedFiles("M malformed\0"), /verify-commit-porcelain-malformed/);

  const calls = [];
  assert.deepEqual(discoverCommitChangedFiles({
    runner: (bin, args) => {
      calls.push([bin, args]);
      return { status: 0, stdout: " M unstaged.js\0M  staged.py\0?? untracked.mjs\0" };
    },
  }), ["staged.py", "unstaged.js", "untracked.mjs"]);
  assert.deepEqual(calls, [["git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]]]);
});

test("commit runner CLI takes explicit changed files and fails closed for malformed input", () => {
  assert.deepEqual(parseCommitVerificationArgs([
    "--changed-file", "js/core/scenario_chunk_manager.js",
    "--changed-file", "js/core/scenario_chunk_manager.js",
  ]), {
    changedFiles: ["js/core/scenario_chunk_manager.js"],
    hasExplicitChangedFiles: true,
  });
  assert.throws(() => parseCommitVerificationArgs(["--unknown"]), /verify-commit-cli-unknown-arg/);
  assert.throws(() => parseCommitVerificationArgs(["--changed-file"]), /verify-commit-cli-changed-file-missing/);

  const calls = [];
  assert.equal(runCommitVerificationCli(["--changed-file", "js/core/scenario_chunk_manager.js"], {
    runner: (bin, args) => {
      calls.push([bin, args]);
      return { status: 0 };
    },
  }), 0);
  assert.equal(calls.some(([, args]) => args.join(" ").includes("git status --porcelain")), false);
  assert.deepEqual(calls.at(-1)[1], [
    "tools/run_adaptive_tests.mjs",
    "--entrypoint",
    "edit",
    "--execute",
    "--defer-main-thread",
    "--changed-file",
    "js/core/scenario_chunk_manager.js",
  ]);
});

test("commit runner executes its plan through the platform npm executable", () => {
  const calls = [];
  const status = runCommitVerification({
    changedFiles: ["package.json"],
    runner: (bin, args) => {
      calls.push([bin, args]);
      return { status: 0 };
    },
  });
  assert.equal(status, 0);
  if (process.platform === "win32") {
    assert.equal(calls[0][0], process.env.ComSpec || "cmd.exe");
    assert.deepEqual(calls[0][1], ["/d", "/s", "/c", "npm run verify:script-portfolio"]);
  } else {
    assert.equal(calls[0][0], "npm");
    assert.deepEqual(calls[0][1], ["run", "verify:script-portfolio"]);
  }
  assert.deepEqual(calls.find(([, args]) => args[0] === "--test")[1], [
    "--test",
    "tests/verification_metadata_behavior.test.mjs",
    "tests/catalog_projection_shadow_behavior.test.mjs",
    "tests/verification_script_portfolio_behavior.test.mjs",
    "tests/verify_core_runner_behavior.test.mjs",
    "tests/verify_commit_runner_behavior.test.mjs",
  ]);
});

test("commit runner limits registered product edits to import integrity and adaptive behavior", () => {
  const files = ["js/core/renderer/border_mesh_owner.js", "js/core/renderer/border_draw_owner.js"];
  const plan = buildCommitVerificationPlan(files);
  assert.equal(plan.commands.length, 2);
  assert.deepEqual(plan.commands[0], ["npm", ["run", "verify:test-import-graph"]]);
  assert.equal(plan.commands[1][1][0], "tools/run_adaptive_tests.mjs");
  assert.ok(plan.commands[1][1].includes("--execute"));
  for (const file of files) assert.ok(plan.commands[1][1].includes(file));

  for (const extra of ["js/new_unregistered_module.js", "package.json", "tests/example.test.mjs", "data/example.json"]) {
    const escalated = buildCommitVerificationPlan([...files, extra]);
    assert.ok(escalated.commands.some(([, args]) => args.includes("verify:script-portfolio")), extra);
    assert.ok(escalated.commands.some(([, args]) => args[0] === "tools/select_verification_targets.mjs"), extra);
    assert.ok(escalated.commands.at(-1)[1].includes(extra), extra);
  }
  assert.ok(buildCommitVerificationPlan([]).commands.some(([, args]) => args.includes("verify:script-portfolio")));
});

test("commit runner propagates missing coverage and import integrity failures", () => {
  const changedFiles = ["js/core/renderer/border_mesh_owner.js"];
  const calls = [];
  assert.equal(runCommitVerification({
    changedFiles,
    runner: (bin, args) => {
      calls.push([bin, args]);
      return { status: args[0] === "tools/run_adaptive_tests.mjs" ? 2 : 0 };
    },
  }), 2);
  assert.equal(calls.length, 2);
  let count = 0;
  assert.equal(runCommitVerification({
    changedFiles,
    runner: () => { count += 1; return { status: 1 }; },
  }), 1);
  assert.equal(count, 1);
});

test("commit runner and its isolated test remain canonical control-plane changes", () => {
  for (const file of ["tools/run_commit_verification.mjs", "tests/verify_commit_runner_behavior.test.mjs"]) {
    const plan = buildCommitVerificationPlan([file]);
    assert.equal(plan.mode, "control-plane", file);
    assert.equal(plan.commands.filter(([, args]) => args[0] === "--test").length, 1, file);
    assert.ok(plan.commands.some(([, args]) => args.includes("verify:script-portfolio")), file);
  }
});

function controlPlaneFixture() {
  return {
    canonicalEntrypoints: { tier: [{
      id: "commit",
      commitProjection: {
        controlPlaneRecordIds: ["infra", "commit"],
        controlPlaneTestFiles: ["tests/control.test.mjs"],
      },
    }] },
    records: [
      { id: "infra", sourceRefs: ["tools/infra.mjs", "package.json"] },
      { id: "commit", sourceRefs: ["tools/run_commit_verification.mjs"] },
      { id: "product", sourceRefs: ["js/product.js", "package.json"] },
    ],
  };
}

test("commit control-plane records form a union without masking shared product ownership", () => {
  const metadataSource = controlPlaneFixture();
  for (const file of ["tools/infra.mjs", "tools/run_commit_verification.mjs"]) {
    assert.equal(buildCommitVerificationPlan([file], { metadataSource }).mode, "control-plane");
  }
  const shared = buildCommitVerificationPlan(["package.json"], { metadataSource });
  assert.equal(shared.mode, "control-plane+adaptive-edit");
  assert.deepEqual(shared.commands.at(-1)[1].slice(-2), ["--changed-file", "package.json"]);
  const mixed = buildCommitVerificationPlan(["tools/run_commit_verification.mjs", "js/product.js"], { metadataSource });
  assert.equal(mixed.mode, "control-plane+adaptive-edit");
  assert.deepEqual(mixed.commands.at(-1)[1].slice(-2), ["--changed-file", "js/product.js"]);
  assert.ok(mixed.commands.some(([, args]) => args.includes("verify:script-portfolio")));
});

test("commit control-plane configuration rejects empty duplicate and missing record IDs", () => {
  for (const ids of [undefined, [], [""], ["   "], [null]]) {
    const metadataSource = controlPlaneFixture();
    metadataSource.canonicalEntrypoints.tier[0].commitProjection.controlPlaneRecordIds = ids;
    assert.throws(() => buildCommitVerificationPlan([], { metadataSource }), /record-ids-invalid/);
  }
  const duplicateIds = controlPlaneFixture();
  duplicateIds.canonicalEntrypoints.tier[0].commitProjection.controlPlaneRecordIds = ["infra", "infra"];
  assert.throws(() => buildCommitVerificationPlan([], { metadataSource: duplicateIds }), /record-ids-duplicate/);
  const missing = controlPlaneFixture();
  missing.records = missing.records.filter((record) => record.id !== "commit");
  assert.throws(() => buildCommitVerificationPlan([], { metadataSource: missing }), /record-missing:commit/);
  const duplicateRecord = controlPlaneFixture();
  duplicateRecord.records.push({ ...duplicateRecord.records[1] });
  assert.throws(() => buildCommitVerificationPlan([], { metadataSource: duplicateRecord }), /record-duplicate:commit/);
});
