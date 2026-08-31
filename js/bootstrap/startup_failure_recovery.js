function assertObjectRecord(value, name) {
  if (value === null || typeof value !== "object") {
    throw new TypeError(`handleStartupFailure requires ${name} to be an object.`);
  }
}

function assertFunction(value, name) {
  if (typeof value !== "function") {
    throw new TypeError(`handleStartupFailure requires ${name} to be a function.`);
  }
}

function validateHelpers(helpers) {
  assertObjectRecord(helpers, "helpers");
  const requiredHelperNames = [
    "finalizeReadyState",
    "getBootLanguage",
    "getBootProgressWindow",
    "checkpointBootMetricOnce",
    "finishBootMetric",
    "invalidateAllRenderPasses",
    "rollbackStartupScenarioToBaseMap",
    "runPostScenarioUiReplay",
    "setBootContinueHandler",
    "setBootState",
    "setStartupReadonlyState",
  ];
  for (const helperName of requiredHelperNames) {
    assertFunction(helpers[helperName], `helpers.${helperName}`);
  }
}

function logConsoleError(consoleApi, ...args) {
  if (typeof consoleApi?.error === "function") {
    consoleApi.error(...args);
  }
}

export async function handleStartupFailure({
  error,
  targetState,
  renderDispatcher,
  startupUiBootstrapPromise = null,
  startupUiBootstrapAwaited = false,
  startupUiBootstrapFailed = false,
  helpers = {},
  consoleApi = console,
} = {}) {
  assertObjectRecord(targetState, "targetState");
  validateHelpers(helpers);

  let resolvedStartupUiBootstrapFailed = !!startupUiBootstrapFailed;
  let deferredUiBootstrapError = null;
  let deferredUiBootstrapObservation = null;

  if (startupUiBootstrapPromise && !startupUiBootstrapAwaited) {
    deferredUiBootstrapObservation = Promise.resolve(startupUiBootstrapPromise)
      .then(() => {
        helpers.runPostScenarioUiReplay({ full: true });
        return { failed: false, error: null };
      })
      .catch((uiBootstrapError) => {
        resolvedStartupUiBootstrapFailed = true;
        deferredUiBootstrapError = uiBootstrapError;
        logConsoleError(consoleApi, "Deferred UI bootstrap failed during startup:", uiBootstrapError);
        return { failed: true, error: uiBootstrapError };
      });
  } else if (!resolvedStartupUiBootstrapFailed) {
    helpers.runPostScenarioUiReplay({ full: true });
  }

  targetState.scenarioApplyInFlight = false;
  helpers.finishBootMetric("total", { failed: true });
  logConsoleError(consoleApi, "Failed to boot application:", error);
  logConsoleError(consoleApi, "Stack trace:", error?.stack);
  helpers.setStartupReadonlyState(false);

  const canContinueWithoutScenario =
    !!targetState.landData?.features?.length
    && typeof renderDispatcher?.flush === "function";

  helpers.setBootContinueHandler(canContinueWithoutScenario
    ? async () => {
      if (String(targetState.activeScenarioId || "").trim()) {
        await helpers.rollbackStartupScenarioToBaseMap();
      }
      if (startupUiBootstrapPromise && !resolvedStartupUiBootstrapFailed && !deferredUiBootstrapError) {
        try {
          await startupUiBootstrapPromise;
        } catch (_uiBootstrapError) {
          // The shared observation above records the concrete UI error. Base-map recovery remains available.
        }
      }
      helpers.setBootState("warmup", {
        message: helpers.getBootLanguage() === "zh"
          ? "正在以基础地图模式继续。"
          : "Continuing with the base map only.",
        canContinueWithoutScenario: false,
      });
      helpers.invalidateAllRenderPasses("bootstrap-first-frame");
      renderDispatcher.flush();
      helpers.checkpointBootMetricOnce("first-visible");
      helpers.checkpointBootMetricOnce("first-visible-base");
      await helpers.finalizeReadyState(renderDispatcher);
    }
    : null);

  helpers.setBootState("error", {
    error: error?.message || "Failed to load the default startup scenario.",
    canContinueWithoutScenario,
    progress: targetState.bootProgress || helpers.getBootProgressWindow("scenario-apply").min,
  });

  return {
    startupUiBootstrapFailed: resolvedStartupUiBootstrapFailed,
    deferredUiBootstrapError,
    deferredUiBootstrapObservation,
    canContinueWithoutScenario,
  };
}
