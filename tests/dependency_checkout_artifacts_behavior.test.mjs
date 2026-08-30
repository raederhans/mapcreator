import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  assertCloseoutValidatorManifest,
  assertPythonCoreProfile,
  buildCloseoutValidatorManifest,
  buildPythonCoreProfile,
  closeoutBundleDescriptor,
  discoverCloseoutValidatorClosure,
  writeCloseoutValidatorBundle,
} from "../tools/verification/dependency_checkout_artifacts.mjs";

const CORE_LOCK = [
  "attrs==26.1.0",
  "jsonschema==4.26.0",
  "jsonschema-specifications==2025.9.1",
  "referencing==0.37.0",
  "rpds-py==2026.5.1",
  "",
].join("\n");

function coreFixture(lockText = CORE_LOCK) {
  const canonical = { commands: [] };
  const pythonAudit = {
    roots: [{
      path: "tests/test_contract.py",
      verdict: "external-or-unresolved",
      thirdPartyImports: ["jsonschema"],
      unresolvedDynamicImports: [],
      parseErrors: [],
    }],
  };
  const assignments = [{
    commandRef: "python -m unittest tests.test_contract -q",
    profileId: "python-core",
    pythonRoots: ["tests/test_contract.py"],
  }];
  return buildPythonCoreProfile({
    canonical,
    pythonAudit,
    assignments,
    requirementsLockText: lockText,
  });
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

test("python-core profile emits an exact minimal transitive lock", () => {
  const profile = assertPythonCoreProfile(coreFixture());
  assert.equal(profile.status, "ready");
  assert.deepEqual(profile.directDistributions, ["jsonschema"]);
  assert.deepEqual(profile.pins, CORE_LOCK.trim().split("\n"));
  assert.equal(profile.pythonRuntime.minimumVersion, "3.12");
  assert.match(profile.dependencyPolicy.digest, /^[0-9a-f]{64}$/u);
  assert.match(profile.lockSha256, /^[0-9a-f]{64}$/u);
});

test("python-core profile fails closed on a missing transitive pin", () => {
  const profile = assertPythonCoreProfile(coreFixture(CORE_LOCK.replace("rpds-py==2026.5.1\n", "")));
  assert.equal(profile.status, "blocked");
  assert.ok(profile.blockers.includes("missing-lock-pin:rpds-py"));
  assert.deepEqual(profile.pins, []);
  assert.equal(profile.lockSha256, null);
});

test("closeout validator bundle binds every closure byte to an exact Git SHA and tree", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "m11-validator-closure-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "tools"), { recursive: true });
  fs.writeFileSync(path.join(root, "tools", "entry.mjs"), "import { value } from './helper.mjs';\nconsole.log(value);\n");
  fs.writeFileSync(path.join(root, "tools", "helper.mjs"), "export const value = 1;\n");
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "m11@example.invalid"]);
  git(root, ["config", "user.name", "M11 Test"]);
  git(root, ["add", "tools/entry.mjs", "tools/helper.mjs"]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  const expectedSha = git(root, ["rev-parse", "HEAD"]);
  const expectedTree = git(root, ["rev-parse", "HEAD^{tree}"]);
  const manifest = assertCloseoutValidatorManifest(buildCloseoutValidatorManifest({
    repoRoot: root,
    entrypoint: "tools/entry.mjs",
    expectedSha,
    expectedTree,
  }));
  assert.equal(manifest.status, "complete");
  assert.deepEqual(manifest.files.map((entry) => entry.path), ["tools/entry.mjs", "tools/helper.mjs"]);
  assert.match(manifest.manifestDigest, /^[0-9a-f]{64}$/u);
  assert.throws(() => buildCloseoutValidatorManifest({
    repoRoot: root,
    entrypoint: "tools/entry.mjs",
    expectedSha,
    expectedTree: expectedSha,
  }), /validator-closure-source-binding-mismatch/u);
  const bundleRoot = path.join(root, ".runtime", "bundle");
  const manifestPath = writeCloseoutValidatorBundle(manifest, { repoRoot: root, bundleRoot });
  assert.ok(fs.existsSync(manifestPath));
  assert.equal(
    closeoutBundleDescriptor(manifest, {
      artifactIdentityBound: true,
      allInputsArtifactLocal: true,
      immutableDownloadNames: true,
      runtimeProvided: true,
    }).manifestValidated,
    true,
  );

  fs.rmSync(path.join(root, "tools", "helper.mjs"));
  const rebound = buildCloseoutValidatorManifest({
    repoRoot: root,
    entrypoint: "tools/entry.mjs",
    expectedSha,
    expectedTree,
  });
  assert.equal(rebound.status, "complete");
  const reboundBundle = path.join(root, ".runtime", "rebound-bundle");
  writeCloseoutValidatorBundle(rebound, { repoRoot: root, bundleRoot: reboundBundle });
  assert.equal(
    fs.readFileSync(path.join(reboundBundle, "tools", "helper.mjs"), "utf8"),
    "export const value = 1;\n",
  );
});

test("template-expression dynamic imports block validator closure completeness", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "m11-dynamic-validator-closure-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "tools"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "tools", "entry.mjs"),
    "const output = `${await import('./helper.mjs')}`;\nexport default output;\n",
  );
  fs.writeFileSync(path.join(root, "tools", "helper.mjs"), "export default 1;\n");

  const closure = discoverCloseoutValidatorClosure({ repoRoot: root, entrypoint: "tools/entry.mjs" });

  assert.equal(closure.dynamicImportGaps.length, 1);
  assert.deepEqual(closure.files, ["tools/entry.mjs"]);
});

test("repository closeout validator bundle imports without a checkout", (t) => {
  const expectedSha = git(process.cwd(), ["rev-parse", "HEAD"]);
  const expectedTree = git(process.cwd(), ["rev-parse", "HEAD^{tree}"]);
  const manifest = assertCloseoutValidatorManifest(buildCloseoutValidatorManifest({
    expectedSha,
    expectedTree,
  }));
  assert.equal(manifest.status, "complete");
  assert.equal(manifest.blockers.length, 0);
  assert.ok(manifest.files.length >= 5);
  const bundleRoot = fs.mkdtempSync(path.join(os.tmpdir(), "m11-repository-validator-bundle-"));
  t.after(() => fs.rmSync(bundleRoot, { recursive: true, force: true }));
  writeCloseoutValidatorBundle(manifest, { bundleRoot });
  const entrypointUrl = pathToFileURL(path.join(bundleRoot, manifest.entrypoint)).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "--eval",
    `await import(${JSON.stringify(entrypointUrl)})`,
  ], { cwd: bundleRoot, stdio: "pipe" });
});
