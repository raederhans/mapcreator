import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(...segments) {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

test("main imports and registers the main runtime diagnostics owner", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.match(mainSource, /from "\.\/bootstrap\/main_runtime_diagnostics\.js";/);
  assert.match(mainSource, /registerMainRuntimeDiagnostics\(\{\s*targetState: state,\s*registerSnapshotProvider: registerMapcreatorSnapshotProvider,\s*\}\);/s);
});

test("main no longer owns main runtime diagnostics internals", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.equal(mainSource.includes("function buildMainRuntimeLoadStatusSnapshot("), false);
  assert.equal(mainSource.includes("function cloneSnapshotValue("), false);
  assert.equal(mainSource.includes('registerMapcreatorSnapshotProvider("loadStatus", "main_runtime"'), false);
  assert.equal(mainSource.includes('registerMapcreatorSnapshotProvider("version", "main_runtime"'), false);
});

test("main runtime diagnostics owner exports the expected API", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "main_runtime_diagnostics.js");

  assert.ok(ownerSource.includes("export function cloneSnapshotValue"));
  assert.ok(ownerSource.includes("export function buildMainRuntimeLoadStatusSnapshot"));
  assert.ok(ownerSource.includes("export function buildMainRuntimeVersionSnapshot"));
  assert.ok(ownerSource.includes("export function registerMainRuntimeDiagnostics"));
  assert.ok(ownerSource.includes('"loadStatus"'));
  assert.ok(ownerSource.includes('"main_runtime"'));
  assert.ok(ownerSource.includes('"version"'));
});

test("main runtime diagnostics owner avoids root state import and targetState writes", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "main_runtime_diagnostics.js");
  const statePathWritePattern = /\b(?:targetState|state)(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])+\s*(?:=(?!=|>)|\+=|-=|\*=|\/=|%=|\+\+|--)/;
  const statePrefixWritePattern = /(?:\+\+|--)\s*\b(?:targetState|state)(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])+/;

  assert.equal(ownerSource.includes('from "../core/state.js"'), false);
  assert.equal(ownerSource.includes('from "./core/state.js"'), false);
  assert.equal(statePathWritePattern.test(ownerSource), false);
  assert.equal(statePrefixWritePattern.test(ownerSource), false);
});
