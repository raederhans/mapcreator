import { initTranslations } from "../ui/i18n.js";

const DEFERRED_UI_MODULE_PATHS = Object.freeze([
  "../ui/toolbar.js",
  "../ui/sidebar.js",
  "../ui/scenario_controls.js",
  "../ui/styled_selects.js",
  "../ui/shortcuts.js",
]);

function getTimeoutFn(globalScope) {
  return typeof globalScope?.setTimeout === "function"
    ? globalScope.setTimeout.bind(globalScope)
    : globalThis.setTimeout.bind(globalThis);
}

export async function yieldToMain({ globalScope = globalThis } = {}) {
  if (typeof globalScope?.scheduler?.yield === "function") {
    await globalScope.scheduler.yield();
    return;
  }
  await new Promise((resolve) => {
    getTimeoutFn(globalScope)(resolve, 0);
  });
}

export function createDeferredUiBootstrapper({
  globalScope = globalThis,
  importModule = (path) => import(path),
  initTranslationsFn = initTranslations,
} = {}) {
  let deferredUiBootstrapPromise = null;

  function bootstrapDeferredUi(renderApp) {
    if (deferredUiBootstrapPromise) {
      return deferredUiBootstrapPromise;
    }
    deferredUiBootstrapPromise = (async () => {
      const [
        { initToolbar },
        { initSidebar },
        { initScenarioControls },
        { initStyledSelects },
        { initShortcuts },
      ] = await Promise.all(DEFERRED_UI_MODULE_PATHS.map((path) => importModule(path)));
      await yieldToMain({ globalScope });
      initToolbar({ render: renderApp });
      await yieldToMain({ globalScope });
      initSidebar({ render: renderApp });
      await yieldToMain({ globalScope });
      initStyledSelects();
      await yieldToMain({ globalScope });
      initScenarioControls();
      initTranslationsFn();
      initShortcuts();
      return true;
    })();
    return deferredUiBootstrapPromise;
  }

  function reset() {
    deferredUiBootstrapPromise = null;
  }

  function getPromise() {
    return deferredUiBootstrapPromise;
  }

  return {
    bootstrapDeferredUi,
    reset,
    getPromise,
  };
}
