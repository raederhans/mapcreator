export function createPageLifetimeModuleLoader({ importModule, createValue = (module) => module } = {}) {
  if (typeof importModule !== "function") {
    throw new TypeError("createPageLifetimeModuleLoader requires importModule");
  }
  if (typeof createValue !== "function") {
    throw new TypeError("createPageLifetimeModuleLoader requires createValue");
  }

  let modulePromise = null;
  let valuePromise = null;

  function loadModuleOnce() {
    if (!modulePromise) {
      // Import failures stay sticky for this page lifetime. Startup recovery receives
      // the original rejection; retrying a deployment-integrity failure requires reload.
      modulePromise = Promise.resolve().then(importModule);
    }
    return modulePromise;
  }

  function preload() {
    const pendingModule = loadModuleOnce();
    void pendingModule.catch(() => null);
    return pendingModule;
  }

  function loadValueOnce() {
    if (!valuePromise) {
      valuePromise = loadModuleOnce().then(createValue);
    }
    return valuePromise;
  }

  return Object.freeze({ loadModuleOnce, loadValueOnce, preload });
}

export async function runOptionalStartupTask({ loadModule, run, onError = () => {} } = {}) {
  if (typeof loadModule !== "function" || typeof run !== "function") {
    throw new TypeError("runOptionalStartupTask requires loadModule and run");
  }
  try {
    const module = await loadModule();
    return await run(module);
  } catch (error) {
    onError(error);
    return false;
  }
}
