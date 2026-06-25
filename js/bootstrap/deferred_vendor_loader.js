function hasMilsymbolSymbol(globalScope) {
  return !!globalScope?.ms?.Symbol;
}

function normalizeScriptSrc(scriptSrc) {
  return String(scriptSrc || "").trim() || "vendor/milsymbol.js";
}

function isMatchingScript(script, scriptSrc) {
  const normalizedSrc = normalizeScriptSrc(scriptSrc);
  const suffix = normalizedSrc.startsWith("/") ? normalizedSrc : `/${normalizedSrc}`;
  return String(script?.src || "").endsWith(suffix)
    || String(script?.getAttribute?.("src") || "").trim() === normalizedSrc;
}

function warnDeferredMilsymbolFailure(consoleApi) {
  if (typeof consoleApi?.warn === "function") {
    consoleApi.warn("[boot] Failed to load deferred milsymbol renderer.");
  }
}

export function createDeferredMilsymbolLoader({
  globalScope = globalThis,
  documentRef = typeof document === "undefined" ? null : document,
  consoleApi = console,
  scriptSrc = "vendor/milsymbol.js",
} = {}) {
  let milsymbolLoadPromise = null;
  const normalizedScriptSrc = normalizeScriptSrc(scriptSrc);

  function loadMilsymbol() {
    if (hasMilsymbolSymbol(globalScope)) {
      return Promise.resolve(true);
    }
    if (milsymbolLoadPromise) {
      return milsymbolLoadPromise;
    }
    if (!documentRef) {
      return Promise.resolve(false);
    }

    const existingScript = Array.from(documentRef.scripts || [])
      .find((script) => isMatchingScript(script, normalizedScriptSrc));
    if (existingScript) {
      milsymbolLoadPromise = new Promise((resolve) => {
        const finalize = (loaded) => resolve(loaded && hasMilsymbolSymbol(globalScope));
        existingScript.addEventListener("load", () => finalize(true), { once: true });
        existingScript.addEventListener("error", () => finalize(false), { once: true });
        if (hasMilsymbolSymbol(globalScope)) {
          finalize(true);
        }
      });
      return milsymbolLoadPromise;
    }

    milsymbolLoadPromise = new Promise((resolve) => {
      const script = documentRef.createElement("script");
      script.src = normalizedScriptSrc;
      script.async = true;
      script.onload = () => resolve(hasMilsymbolSymbol(globalScope));
      script.onerror = () => {
        warnDeferredMilsymbolFailure(consoleApi);
        resolve(false);
      };
      documentRef.body?.appendChild(script);
    });
    return milsymbolLoadPromise;
  }

  function reset() {
    milsymbolLoadPromise = null;
  }

  return {
    loadMilsymbol,
    reset,
  };
}
