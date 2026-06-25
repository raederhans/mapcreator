import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(...segments) {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

test("main imports and calls the startup render runtime binding owner", () => {
  const mainSource = readRepoFile("js", "main.js");
  const bindingCalls = mainSource.match(/createStartupRenderRuntimeBinding\(\{/g) || [];

  assert.match(mainSource, /from "\.\/bootstrap\/render_runtime_binding\.js";/);
  assert.equal(bindingCalls.length, 2);
  assert.match(mainSource, /flushReason: "ui-shell-render-now"/);
  assert.match(mainSource, /flushReason: "legacy-render-now"/);
});

test("main no longer owns render runtime binding internals", () => {
  const mainSource = readRepoFile("js", "main.js");

  assert.equal(mainSource.includes("createRenderDispatcher(() =>"), false);
  assert.equal(mainSource.includes("globalThis.renderApp = renderApp"), false);
  assert.equal(mainSource.includes("bindRenderBoundary({"), false);
  assert.equal(mainSource.includes("globalThis.renderNow = flushRenderNow"), false);
  assert.equal(mainSource.includes('registerRuntimeHook(state, "renderNowFn"'), false);
  assert.equal(mainSource.includes('registerRuntimeHook(state, "ensureDetailTopologyFn"'), false);
});

test("startup render runtime binding owner exports the expected API", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "render_runtime_binding.js");

  assert.ok(ownerSource.includes("export function createStartupRenderRuntimeBinding"));
  assert.ok(ownerSource.includes("globalScope.renderApp = renderApp"));
  assert.ok(ownerSource.includes("globalScope.renderNow = flushRenderNow"));
  assert.ok(ownerSource.includes('"renderNowFn"'));
  assert.ok(ownerSource.includes('"ensureDetailTopologyFn"'));
  assert.ok(ownerSource.includes('"showToastFn"'));
});

test("startup render runtime binding owner avoids root state import and direct state writes", () => {
  const ownerSource = readRepoFile("js", "bootstrap", "render_runtime_binding.js");
  const statePathWritePattern = /\b(?:targetState|state)(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])+\s*(?:=(?!=|>)|\+=|-=|\*=|\/=|%=|\+\+|--)/;
  const statePrefixWritePattern = /(?:\+\+|--)\s*\b(?:targetState|state)(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])+/;

  assert.equal(ownerSource.includes('from "../core/state.js"'), false);
  assert.equal(ownerSource.includes('from "./core/state.js"'), false);
  assert.equal(ownerSource.includes("runtimeState."), false);
  assert.equal(ownerSource.includes("const state ="), false);
  assert.equal(statePathWritePattern.test(ownerSource), false);
  assert.equal(statePrefixWritePattern.test(ownerSource), false);
});
