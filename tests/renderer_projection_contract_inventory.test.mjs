import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  PROJECTION_STATIC_NORMALIZED_NAMES,
  analyzeRendererProjectionModule,
  evaluateRendererProjectionContract,
  projectionContractFailures,
  resolveRendererProjectionFunction,
} from "../tools/verification/renderer_projection_contract.mjs";

const REPORT = evaluateRendererProjectionContract();

test("canonical renderer projection contract keeps every normalized identity green", () => {
  assert.equal(REPORT.schemaVersion, 1);
  assert.equal(REPORT.kind, "renderer-projection-runtime-context-contract");
  assert.equal(REPORT.equal, true, projectionContractFailures(REPORT).join("\n"));
  assert.deepEqual(REPORT.results.map(({ name }) => name), PROJECTION_STATIC_NORMALIZED_NAMES);
  assert.equal(new Set(REPORT.results.map(({ name }) => name)).size, 12);
  assert.ok(REPORT.findings.sourceInputs.length > 20);
  for (const relativePath of REPORT.findings.sourceInputs) {
    assert.equal(fs.existsSync(path.join(process.cwd(), relativePath)), true, relativePath);
  }
});

test("function facts exclude hostile nested function and class scopes", () => {
  const module = analyzeRendererProjectionModule("hostile.js", `
    export function outer(receiver) {
      receiver.allowed();
      function nested() {
        receiver.forbiddenNestedCall();
        receiver.state = "forbidden-nested-assignment";
      }
      const arrow = () => receiver.forbiddenArrowCall();
      class NestedClass {
        method() {
          receiver.forbiddenClassCall();
          receiver.otherState++;
        }
      }
      return { nested, arrow, NestedClass };
    }
  `);
  const outer = resolveRendererProjectionFunction(module, [], "outer").facts;
  assert.deepEqual(outer.calls.map(({ callee }) => callee), ["receiver.allowed"]);
  assert.deepEqual(outer.assignments, []);
  assert.equal(outer.identifiers.includes("forbiddenNestedCall"), false);
  assert.equal(outer.identifiers.includes("forbiddenArrowCall"), false);
  assert.equal(outer.identifiers.includes("forbiddenClassCall"), false);
});

test("lexical function identities reject hostile same-name replacement and ambiguity", () => {
  const module = analyzeRendererProjectionModule("hostile-identities.js", `
    export function createRendererProjectionPathOwner(receiver) {
      function initializeProjectionPaths() {
        receiver.allowedInitialization();
      }
      function deadWrapper() {
        function initializeProjectionPaths() {
          receiver.forgedNestedInitialization();
        }
      }
      class DeadClass {
        initializeProjectionPaths() {
          receiver.forgedClassInitialization();
        }
      }
      return { initializeProjectionPaths, deadWrapper, DeadClass };
    }
    function unrelated() {
      function getRendererProjectionPathOwner() {
        return "forged-renderer-factory";
      }
      return getRendererProjectionPathOwner;
    }
  `);
  const initialization = resolveRendererProjectionFunction(
    module,
    ["createRendererProjectionPathOwner"],
    "initializeProjectionPaths",
  );
  assert.equal(initialization.status, "resolved");
  assert.deepEqual(initialization.facts.calls.map(({ callee }) => callee), ["receiver.allowedInitialization"]);
  assert.equal(resolveRendererProjectionFunction(module, [], "getRendererProjectionPathOwner").status, "missing");

  const ambiguous = analyzeRendererProjectionModule("ambiguous.js", `
    function owner() {
      function target() { return 1; }
      function target() { return 2; }
      return target;
    }
  `);
  const target = resolveRendererProjectionFunction(ambiguous, ["owner"], "target");
  assert.equal(target.status, "ambiguous");
  assert.equal(target.count, 2);
  assert.equal(target.facts, null);

  const deadControl = analyzeRendererProjectionModule("dead-control.js", `
    export function createRendererProjectionPathOwner(receiver) {
      if (false) {
        function initializeProjectionPaths() {
          receiver.forgedControlFlowInitialization();
        }
      }
      return {};
    }
  `);
  assert.equal(resolveRendererProjectionFunction(
    deadControl,
    ["createRendererProjectionPathOwner"],
    "initializeProjectionPaths",
  ).status, "missing");
});
