import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { FileManager } from "../js/core/file_manager.js";
import { scheduleStartupSampleProjectDeeplink } from "../js/bootstrap/startup_sample_project_deeplink.js";
import { registerRuntimeHook } from "../js/core/state/index.js";
import {
  loadSampleProjectText,
  resolveSampleProjectFromManifest,
  SampleProjectLoadError,
} from "../js/core/sample_project_registry.js";
import {
  createSampleProjectBannerController,
  resolveSampleProjectBannerView,
} from "../js/ui/toolbar/sample_project_banner_controller.js";

const SAMPLE_RUNS_PATH = "landing/assets/sample-runs.json";
const PUBLIC_SCENARIO_IDS = [
  "blank_base",
  "modern_world",
  "hoi4_1936",
  "hoi4_1939",
  "tno_1962",
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
}

function resolveLandingUrl(url) {
  assert.match(url, /^\.\//, `sample URL must be relative: ${url}`);
  return `landing/${url.slice(2)}`;
}

function readLandingUrlJson(url) {
  return readJson(resolveLandingUrl(url));
}

function assertNoDeveloperPreviewId(value, context) {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes("hgo_1936"), false, `${context} must stay outside developer preview assets`);
}

function resolveMarkerPath(value, expression) {
  let current = value;
  for (const segment of expression.split(".")) {
    if (segment === "length") {
      assert.ok(
        typeof current === "string" || Array.isArray(current),
        `marker segment length requires an array or string for ${expression}`,
      );
      current = current.length;
      continue;
    }
    assert.ok(current && Object.hasOwn(current, segment), `marker segment missing: ${expression}`);
    current = current[segment];
  }
  return current;
}

function resolveEvidenceMarker(marker) {
  const [assetPath, expression] = marker.split(":");
  assert.ok(assetPath && expression, `invalid evidence marker: ${marker}`);
  const asset = readJson(assetPath);
  return expression
    .split("+")
    .map((part) => resolveMarkerPath(asset, part))
    .reduce((total, value) => total + Number(value), 0);
}

class SampleBannerTestClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(name, force) {
    if (force) {
      this.values.add(name);
    } else {
      this.values.delete(name);
    }
  }

  contains(name) {
    return this.values.has(name);
  }
}

class SampleBannerTestElement {
  constructor() {
    this.attributes = new Map();
    this.classList = new SampleBannerTestClassList();
    this.dataset = {};
    this.hidden = false;
    this.listeners = new Map();
    this.textContent = "";
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || "";
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(name, handler) {
    this.listeners.set(name, handler);
  }

  click() {
    this.listeners.get("click")?.();
  }
}

async function importProjectPayload(payload) {
  const previousDocument = globalThis.document;
  const previousFileReader = globalThis.FileReader;
  const callbacks = [];
  const successes = [];
  const errors = [];

  globalThis.document = {
    getElementById: () => null,
  };
  globalThis.FileReader = class {
    readAsText(file) {
      this.result = file.text;
      queueMicrotask(() => this.onload?.());
    }
  };

  try {
    await FileManager.importProject(
      {
        name: "map_project.json",
        text: JSON.stringify(payload),
      },
      async (data) => {
        callbacks.push(data);
      },
      {
        onSuccess: (data) => successes.push(data),
        onError: (error) => errors.push(error),
      },
    );
    return { callbacks, errors, successes };
  } finally {
    globalThis.document = previousDocument;
    globalThis.FileReader = previousFileReader;
  }
}

function assertSampleProjectError(callback, expectedCode) {
  assert.throws(
    callback,
    (error) => error instanceof SampleProjectLoadError && error.code === expectedCode,
  );
}

function cloneWithSampleProject(manifest, projectPatch) {
  return {
    ...manifest,
    sample_projects: [
      ...manifest.sample_projects,
      {
        id: "unsafe-sample",
        title: "Unsafe sample",
        scenario_id: "blank_base",
        project_url: "./assets/sample-projects/blank-base-starter.project.json",
        ...projectPatch,
      },
    ],
  };
}

test("sample runs manifest exposes only public scenario project downloads", () => {
  const scenarioIndex = readJson("data/scenarios/index.json");
  const manifest = readJson(SAMPLE_RUNS_PATH);
  const publicScenarioIds = new Set(scenarioIndex.public_baseline_ids);
  const sampleProjectScenarioIds = manifest.sample_projects.map((project) => project.scenario_id);
  const sampleProjectIds = manifest.sample_projects.map((project) => project.id);
  const sampleProjectUrls = manifest.sample_projects.map((project) => project.project_url);

  assert.deepEqual(scenarioIndex.public_baseline_ids, PUBLIC_SCENARIO_IDS);
  assert.deepEqual(manifest.public_scenario_ids, PUBLIC_SCENARIO_IDS);
  assert.deepEqual(manifest.developer_preview_exclusions, scenarioIndex.developer_preview_ids);
  assert.equal(manifest.sample_projects.length, PUBLIC_SCENARIO_IDS.length);
  assert.equal(new Set(sampleProjectIds).size, sampleProjectIds.length);
  assert.equal(new Set(sampleProjectUrls).size, sampleProjectUrls.length);
  assert.deepEqual(sampleProjectScenarioIds, PUBLIC_SCENARIO_IDS);
  assert.equal(manifest.project_schema_version, 22);
  assertNoDeveloperPreviewId(manifest.sample_projects, "sample project manifest");

  for (const project of manifest.sample_projects) {
    assert.ok(publicScenarioIds.has(project.scenario_id), `${project.id} must use a public scenario`);
    const projectPath = resolveLandingUrl(project.project_url);
    assert.ok(existsSync(new URL(`../${projectPath}`, import.meta.url)), `missing ${projectPath}`);
  }
});

test("sample project JSON files match current scenario baselines and import cleanly", async () => {
  const manifest = readJson(SAMPLE_RUNS_PATH);
  const publicScenarioIds = new Set(manifest.public_scenario_ids);

  for (const project of manifest.sample_projects) {
    const payload = readLandingUrlJson(project.project_url);
    const scenarioManifest = readJson(`data/scenarios/${project.scenario_id}/manifest.json`);

    assert.equal(payload.schemaVersion, manifest.project_schema_version, `${project.id} schema version drifted`);
    assert.equal(payload.scenario?.id, project.scenario_id, `${project.id} scenario id drifted`);
    assert.ok(publicScenarioIds.has(payload.scenario.id), `${project.id} must import a public scenario`);
    assert.equal(payload.scenario.version, scenarioManifest.version, `${project.id} scenario version drifted`);
    assert.equal(payload.scenario.baselineHash, scenarioManifest.baseline_hash, `${project.id} baseline hash drifted`);
    assertNoDeveloperPreviewId(payload, project.id);

    const result = await importProjectPayload(payload);
    assert.equal(result.errors.length, 0, `${project.id} import should not emit errors`);
    assert.equal(result.callbacks.length, 1, `${project.id} import callback count drifted`);
    assert.equal(result.successes.length, 1, `${project.id} import success count drifted`);
    assert.equal(result.callbacks[0].schemaVersion, manifest.project_schema_version, `${project.id} imported schema drifted`);
    assert.equal(result.callbacks[0].scenario?.id, project.scenario_id, `${project.id} imported scenario drifted`);
    assert.equal(
      result.callbacks[0].scenario?.baselineHash,
      scenarioManifest.baseline_hash,
      `${project.id} imported baseline hash drifted`,
    );
  }
});

test("sample project registry resolves only public checked-in project assets", () => {
  const manifest = readJson(SAMPLE_RUNS_PATH);

  for (const project of manifest.sample_projects) {
    const resolved = resolveSampleProjectFromManifest(manifest, project.id);
    assert.equal(resolved.id, project.id);
    assert.equal(resolved.scenarioId, project.scenario_id);
    assert.equal(resolved.projectUrl, project.project_url);
    assert.match(resolved.fileName, /^[a-z0-9-]+\.project\.json$/);
    assert.equal(resolved.appProjectUrl, `../assets/sample-projects/${resolved.fileName}`);
  }

  assertSampleProjectError(
    () => resolveSampleProjectFromManifest(manifest, "missing-public-sample"),
    "unknown-sample-id",
  );
  assertSampleProjectError(
    () => resolveSampleProjectFromManifest(manifest, "hgo_1936"),
    "invalid-sample-id",
  );
  assertSampleProjectError(
    () => resolveSampleProjectFromManifest(
      cloneWithSampleProject(manifest, { id: "hgo-preview", scenario_id: "hgo_1936" }),
      "hgo-preview",
    ),
    "private-sample-scenario",
  );
  assertSampleProjectError(
    () => resolveSampleProjectFromManifest(
      cloneWithSampleProject(manifest, { project_url: "https://example.test/map.project.json" }),
      "unsafe-sample",
    ),
    "unsafe-project-url",
  );
  assertSampleProjectError(
    () => resolveSampleProjectFromManifest(
      cloneWithSampleProject(manifest, { project_url: "./assets/sample-projects/../hgo_1936.project.json" }),
      "unsafe-sample",
    ),
    "unsafe-project-file",
  );
});

test("sample project loader fetches manifest before checked-in project JSON", async () => {
  const manifest = readJson(SAMPLE_RUNS_PATH);
  const project = manifest.sample_projects.find((entry) => entry.id === "tno-1962-atlantropa-briefing");
  const payloadText = JSON.stringify(readLandingUrlJson(project.project_url));
  const fetchCalls = [];
  const fetchImpl = async (url) => {
    fetchCalls.push(url);
    if (url === "../assets/sample-runs.json") {
      return { ok: true, json: async () => manifest };
    }
    if (url === "../assets/sample-projects/tno-1962-atlantropa-briefing.project.json") {
      return { ok: true, text: async () => payloadText };
    }
    return { ok: false };
  };

  const { sampleProject, text } = await loadSampleProjectText("tno-1962-atlantropa-briefing", { fetchImpl });
  assert.equal(sampleProject.id, "tno-1962-atlantropa-briefing");
  assert.equal(sampleProject.scenarioId, "tno_1962");
  assert.deepEqual(fetchCalls, [
    "../assets/sample-runs.json",
    "../assets/sample-projects/tno-1962-atlantropa-briefing.project.json",
  ]);

  const callbacks = [];
  const previousDocument = globalThis.document;
  globalThis.document = {
    getElementById: () => null,
  };
  try {
    const importResult = await FileManager.importProjectText(text, async (data) => {
      callbacks.push(data);
    });
    assert.equal(importResult, true);
    assert.equal(callbacks.length, 1);
    assert.equal(callbacks[0].scenario?.id, "tno_1962");
  } finally {
    globalThis.document = previousDocument;
  }

  const unknownFetchCalls = [];
  await assert.rejects(
    () => loadSampleProjectText("missing-public-sample", {
      fetchImpl: async (url) => {
        unknownFetchCalls.push(url);
        return { ok: true, json: async () => manifest };
      },
    }),
    (error) => error instanceof SampleProjectLoadError && error.code === "unknown-sample-id",
  );
  assert.deepEqual(unknownFetchCalls, ["../assets/sample-runs.json"]);

  const invalidFetchCalls = [];
  await assert.rejects(
    () => loadSampleProjectText("hgo_1936", {
      fetchImpl: async (url) => {
        invalidFetchCalls.push(url);
        return { ok: false };
      },
    }),
    (error) => error instanceof SampleProjectLoadError && error.code === "invalid-sample-id",
  );
  assert.deepEqual(invalidFetchCalls, []);
});

test("sample startup import failures record state without duplicate sample toast", async () => {
  const manifest = readJson(SAMPLE_RUNS_PATH);
  const scheduledTasks = [];
  const helperToasts = [];
  const targetState = {};
  const didSchedule = scheduleStartupSampleProjectDeeplink({
    targetState,
    postReadyScheduler: {
      scheduleTask: (key, callback, options) => {
        scheduledTasks.push({ key, callback, options });
      },
    },
    helpers: {
      search: "?sample=tno-1962-atlantropa-briefing&view=guide",
      fetchImpl: async (url) => {
        if (url === "../assets/sample-runs.json") {
          return { ok: true, json: async () => manifest };
        }
        if (url === "../assets/sample-projects/tno-1962-atlantropa-briefing.project.json") {
          return { ok: true, text: async () => "{" };
        }
        return { ok: false };
      },
      showToast: (message, options) => {
        helperToasts.push({ message, options });
      },
    },
  });

  assert.equal(didSchedule, true);
  assert.equal(scheduledTasks.length, 1);
  assert.equal(targetState.sampleProjectDeeplink.status, "pending");

  await scheduledTasks[0].callback();

  assert.equal(helperToasts.length, 0);
  assert.equal(targetState.sampleProjectDeeplink.status, "error");
  assert.equal(targetState.sampleProjectDeeplink.sampleId, "tno-1962-atlantropa-briefing");
  assert.equal(targetState.sampleProjectDeeplink.scenarioId, "tno_1962");
  assert.equal(targetState.sampleProjectDeeplink.errorCode, "sample-project-import-failed");
});

test("sample project banner view exposes success actions and public error messages", () => {
  const successView = resolveSampleProjectBannerView({
    status: "success",
    sampleId: "tno-1962-atlantropa-briefing",
    title: "TNO 1962 Atlantropa briefing",
    projectUrl: "./assets/sample-projects/tno-1962-atlantropa-briefing.project.json",
    appProjectUrl: "../assets/sample-projects/tno-1962-atlantropa-briefing.project.json",
    fileName: "tno-1962-atlantropa-briefing.project.json",
  });
  assert.equal(successView.tone, "success");
  assert.equal(successView.title, "Sample loaded: TNO 1962 Atlantropa briefing");
  assert.match(successView.body, /Edit this starter map/);
  assert.equal(successView.canOpenExport, true);
  assert.equal(successView.canDownloadOriginal, true);
  assert.equal(
    successView.downloadHref,
    "../assets/sample-projects/tno-1962-atlantropa-briefing.project.json",
  );
  assert.equal(successView.downloadName, "tno-1962-atlantropa-briefing.project.json");

  const landingOnlyHrefView = resolveSampleProjectBannerView({
    status: "success",
    sampleId: "blank-base-starter",
    projectUrl: "./assets/sample-projects/blank-base-starter.project.json",
  });
  assert.equal(
    landingOnlyHrefView.downloadHref,
    "../assets/sample-projects/blank-base-starter.project.json",
  );

  const unknownSampleView = resolveSampleProjectBannerView({
    status: "error",
    sampleId: "missing-public-sample",
    errorCode: "unknown-sample-id",
    errorMessage: "Unknown sample project id: missing-public-sample",
  });
  assert.equal(unknownSampleView.tone, "error");
  assert.equal(unknownSampleView.title, "Sample unavailable");
  assert.equal(unknownSampleView.body, "This sample project is not in the public sample list.");
  assert.equal(unknownSampleView.canOpenExport, false);
  assert.equal(unknownSampleView.canDownloadOriginal, false);

  const invalidSampleView = resolveSampleProjectBannerView({
    status: "error",
    sampleId: "../bad",
    errorCode: "invalid-sample-id",
    errorMessage: "Sample project id is not valid.",
  });
  assert.equal(invalidSampleView.body, "This sample link is not valid.");
  assert.equal(resolveSampleProjectBannerView({ status: "loading", sampleId: "blank-base-starter" }), null);
});

test("sample project banner controller opens export and dismisses current message", () => {
  const runtimeState = {
    sampleProjectDeeplink: {
      status: "success",
      sampleId: "tno-1962-atlantropa-briefing",
      title: "TNO 1962 Atlantropa briefing",
      appProjectUrl: "../assets/sample-projects/tno-1962-atlantropa-briefing.project.json",
      fileName: "tno-1962-atlantropa-briefing.project.json",
    },
  };
  const root = new SampleBannerTestElement();
  const titleNode = new SampleBannerTestElement();
  const bodyNode = new SampleBannerTestElement();
  const openExportButton = new SampleBannerTestElement();
  const downloadOriginalLink = new SampleBannerTestElement();
  const dismissButton = new SampleBannerTestElement();
  const exportTriggers = [];
  const controller = createSampleProjectBannerController({
    runtimeState,
    root,
    titleNode,
    bodyNode,
    openExportButton,
    downloadOriginalLink,
    dismissButton,
    openExportWorkbench: (trigger) => exportTriggers.push(trigger),
  });

  controller.bindEvents();
  const view = controller.render();

  assert.equal(view.status, "success");
  assert.equal(root.hidden, false);
  assert.equal(root.getAttribute("aria-hidden"), "false");
  assert.equal(titleNode.textContent, "Sample loaded: TNO 1962 Atlantropa briefing");
  assert.equal(
    downloadOriginalLink.getAttribute("href"),
    "../assets/sample-projects/tno-1962-atlantropa-briefing.project.json",
  );

  openExportButton.click();
  assert.deepEqual(exportTriggers, [openExportButton]);

  dismissButton.click();
  assert.equal(root.hidden, true);
  assert.equal(root.classList.contains("hidden"), true);
  assert.equal(controller.render(), null);
});

test("sample startup state writes notify banner refresh hook for bad links", async () => {
  const manifest = readJson(SAMPLE_RUNS_PATH);
  const scheduledTasks = [];
  const refreshSnapshots = [];
  const helperToasts = [];
  const targetState = {};

  registerRuntimeHook(targetState, "refreshSampleProjectBannerFn", (sampleState) => {
    refreshSnapshots.push({
      status: sampleState.status,
      sampleId: sampleState.sampleId,
      errorCode: sampleState.errorCode,
    });
  });

  try {
    const didSchedule = scheduleStartupSampleProjectDeeplink({
      targetState,
      postReadyScheduler: {
        scheduleTask: (key, callback, options) => {
          scheduledTasks.push({ key, callback, options });
        },
      },
      helpers: {
        search: "?sample=missing-public-sample&view=guide",
        fetchImpl: async (url) => {
          if (url === "../assets/sample-runs.json") {
            return { ok: true, json: async () => manifest };
          }
          return { ok: false };
        },
        showToast: (message, options) => {
          helperToasts.push({ message, options });
        },
        ui: {
          t: (key) => ({
            "Sample unavailable": "示例不可用",
            "This sample project is not in the public sample list.": "这个示例项目不在公开示例列表中。",
          }[key] || key),
        },
      },
    });

    assert.equal(didSchedule, true);
    assert.equal(scheduledTasks.length, 1);
    assert.equal(refreshSnapshots[0].status, "pending");
    assert.equal(refreshSnapshots[0].sampleId, "missing-public-sample");

    await scheduledTasks[0].callback();

    assert.equal(targetState.sampleProjectDeeplink.status, "error");
    assert.equal(targetState.sampleProjectDeeplink.errorCode, "unknown-sample-id");
    assert.deepEqual(
      refreshSnapshots.map((snapshot) => snapshot.status),
      ["pending", "loading", "error"],
    );
    assert.equal(helperToasts.length, 1);
    assert.equal(helperToasts[0].message, "这个示例项目不在公开示例列表中。");
    assert.equal(helperToasts[0].options.title, "示例不可用");
  } finally {
    registerRuntimeHook(targetState, "refreshSampleProjectBannerFn", null);
  }
});

test("featured sample runs point at checked-in evidence and matching projects", () => {
  const manifest = readJson(SAMPLE_RUNS_PATH);
  const sampleProjects = new Map(manifest.sample_projects.map((project) => [project.id, project]));
  const runIds = manifest.featured_runs.map((run) => run.id);
  const runProjectUrls = manifest.featured_runs.map((run) => run.project_url);
  assert.equal(new Set(runIds).size, runIds.length);
  assert.equal(new Set(runProjectUrls).size, runProjectUrls.length);

  for (const run of manifest.featured_runs) {
    const sampleProject = sampleProjects.get(run.project_id);
    assert.ok(sampleProject, `${run.id} must reference a sample project`);
    assert.equal(run.project_url, sampleProject.project_url, `${run.id} project URL drifted`);
    assert.equal(run.scenario_id, sampleProject.scenario_id, `${run.id} scenario drifted`);
    assert.equal(run.demo_path, `./app/?sample=${sampleProject.id}&view=guide`, `${run.id} demo path drifted`);

    for (const url of [run.image_url, run.metadata_url, run.project_url]) {
      const assetPath = resolveLandingUrl(url);
      assert.ok(existsSync(new URL(`../${assetPath}`, import.meta.url)), `missing ${run.id} asset ${assetPath}`);
    }

    for (const marker of run.evidence_markers) {
      assert.ok(Number.isFinite(resolveEvidenceMarker(marker)), `${run.id} evidence marker must resolve: ${marker}`);
    }
  }
});
