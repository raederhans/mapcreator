import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLoadStatusForDisplay } from "../js/core/load_status_display.js";

test("normalizeLoadStatusForDisplay flattens main_runtime and data_service providers into a shared entry list", () => {
  const normalized = normalizeLoadStatusForDisplay({
    providers: {
      data_service: {
        resources: {
          "asset:transport_carrier:japan_corridor": {
            status: "ready",
            kind: "asset",
            id: "transport_carrier:japan_corridor",
            url: "data/transport_layers/japan_corridor/carrier.json",
            errorCode: "",
            cachePolicy: "default",
          },
        },
      },
      main_runtime: {
        boot: {
          phase: "ready",
          interactionMode: "interactive",
        },
        startup: {
          startupBootCacheState: {
            baseTopology: "written",
            localization: "written",
            scenarioBootstrap: "written",
          },
        },
        chunkRuntime: {
          shellStatus: "ready",
        },
      },
    },
  });

  assert.equal(normalized.providerCount, 2);
  assert.equal(normalized.entries.length, 6);
  assert.deepEqual(
    normalized.entries.map((entry) => [entry.providerKey, entry.label, entry.status]),
    [
      ["data_service", "transport_carrier:japan_corridor", "ready"],
      ["main_runtime", "boot", "ready"],
      ["main_runtime", "startup-base-topology", "written"],
      ["main_runtime", "startup-localization", "written"],
      ["main_runtime", "startup-scenario-bootstrap", "written"],
      ["main_runtime", "chunk-runtime", "ready"],
    ],
  );
});
