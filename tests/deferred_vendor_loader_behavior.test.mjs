import assert from "node:assert/strict";
import test from "node:test";

import { createDeferredMilsymbolLoader } from "../js/bootstrap/deferred_vendor_loader.js";

function createScript({ src = "", attrSrc = "" } = {}) {
  const listeners = new Map();
  return {
    src,
    async: false,
    onload: null,
    onerror: null,
    getAttribute(name) {
      return name === "src" ? attrSrc : "";
    },
    addEventListener(type, callback, options = {}) {
      const records = listeners.get(type) || [];
      records.push({ callback, options });
      listeners.set(type, records);
    },
    dispatch(type) {
      for (const record of listeners.get(type) || []) {
        record.callback();
      }
    },
  };
}

function createDocumentRef({ scripts = [] } = {}) {
  const createdScripts = [];
  const appendedScripts = [];
  return {
    scripts,
    body: {
      appendChild(script) {
        appendedScripts.push(script);
      },
    },
    createElement(tagName) {
      assert.equal(tagName, "script");
      const script = createScript();
      createdScripts.push(script);
      return script;
    },
    __test: {
      createdScripts,
      appendedScripts,
    },
  };
}

test("loadMilsymbol resolves true when ms.Symbol already exists", async () => {
  const documentRef = createDocumentRef();
  const loader = createDeferredMilsymbolLoader({
    globalScope: { ms: { Symbol: function Symbol() {} } },
    documentRef,
  });

  assert.equal(await loader.loadMilsymbol(), true);
  assert.deepEqual(documentRef.__test.createdScripts, []);
  assert.deepEqual(documentRef.__test.appendedScripts, []);
});

test("loadMilsymbol resolves false without a document", async () => {
  const loader = createDeferredMilsymbolLoader({
    globalScope: {},
    documentRef: null,
  });

  assert.equal(await loader.loadMilsymbol(), false);
});

test("loadMilsymbol reuses a pending cached promise", () => {
  const documentRef = createDocumentRef();
  const loader = createDeferredMilsymbolLoader({ globalScope: {}, documentRef });

  const firstPromise = loader.loadMilsymbol();
  const secondPromise = loader.loadMilsymbol();

  assert.equal(firstPromise, secondPromise);
  assert.equal(documentRef.__test.createdScripts.length, 1);
  assert.equal(documentRef.__test.appendedScripts.length, 1);
});

test("existing script load resolves based on ms.Symbol", async () => {
  const globalScope = {};
  const existingScript = createScript({
    src: "https://example.test/assets/vendor/milsymbol.js",
  });
  const documentRef = createDocumentRef({ scripts: [existingScript] });
  const loader = createDeferredMilsymbolLoader({ globalScope, documentRef });

  const loadPromise = loader.loadMilsymbol();
  globalScope.ms = { Symbol: function Symbol() {} };
  existingScript.dispatch("load");

  assert.equal(await loadPromise, true);
  assert.equal(documentRef.__test.createdScripts.length, 0);
  assert.equal(documentRef.__test.appendedScripts.length, 0);
});

test("existing script error resolves false", async () => {
  const existingScript = createScript({ attrSrc: "vendor/milsymbol.js" });
  const documentRef = createDocumentRef({ scripts: [existingScript] });
  const loader = createDeferredMilsymbolLoader({ globalScope: {}, documentRef });

  const loadPromise = loader.loadMilsymbol();
  existingScript.dispatch("error");

  assert.equal(await loadPromise, false);
});

test("created script uses the deferred vendor source and appends to body", () => {
  const documentRef = createDocumentRef();
  const loader = createDeferredMilsymbolLoader({ globalScope: {}, documentRef });

  loader.loadMilsymbol();

  assert.equal(documentRef.__test.createdScripts.length, 1);
  assert.equal(documentRef.__test.appendedScripts.length, 1);
  assert.equal(documentRef.__test.createdScripts[0].src, "vendor/milsymbol.js");
  assert.equal(documentRef.__test.createdScripts[0].async, true);
  assert.equal(documentRef.__test.appendedScripts[0], documentRef.__test.createdScripts[0]);
});

test("created script onload resolves true when ms.Symbol becomes available", async () => {
  const globalScope = {};
  const documentRef = createDocumentRef();
  const loader = createDeferredMilsymbolLoader({ globalScope, documentRef });

  const loadPromise = loader.loadMilsymbol();
  globalScope.ms = { Symbol: function Symbol() {} };
  documentRef.__test.createdScripts[0].onload();

  assert.equal(await loadPromise, true);
});

test("created script onload resolves false when ms.Symbol is absent", async () => {
  const documentRef = createDocumentRef();
  const loader = createDeferredMilsymbolLoader({ globalScope: {}, documentRef });

  const loadPromise = loader.loadMilsymbol();
  documentRef.__test.createdScripts[0].onload();

  assert.equal(await loadPromise, false);
});

test("created script onerror warns with the stable boot message and resolves false", async () => {
  const warnings = [];
  const documentRef = createDocumentRef();
  const loader = createDeferredMilsymbolLoader({
    globalScope: {},
    documentRef,
    consoleApi: {
      warn(message) {
        warnings.push(message);
      },
    },
  });

  const loadPromise = loader.loadMilsymbol();
  documentRef.__test.createdScripts[0].onerror();

  assert.equal(await loadPromise, false);
  assert.deepEqual(warnings, ["[boot] Failed to load deferred milsymbol renderer."]);
});

test("reset clears the cached promise", () => {
  const documentRef = createDocumentRef();
  const loader = createDeferredMilsymbolLoader({ globalScope: {}, documentRef });
  const firstPromise = loader.loadMilsymbol();

  loader.reset();
  const secondPromise = loader.loadMilsymbol();

  assert.notEqual(firstPromise, secondPromise);
  assert.equal(documentRef.__test.createdScripts.length, 2);
  assert.equal(documentRef.__test.appendedScripts.length, 2);
});
