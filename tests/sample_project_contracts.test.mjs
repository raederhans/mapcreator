import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { FileManager } from "../js/core/file_manager.js";

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
    FileManager.importProject(
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
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { callbacks, errors, successes };
  } finally {
    globalThis.document = previousDocument;
    globalThis.FileReader = previousFileReader;
  }
}

test("sample runs manifest exposes only public scenario project downloads", () => {
  const scenarioIndex = readJson("data/scenarios/index.json");
  const manifest = readJson(SAMPLE_RUNS_PATH);
  const publicScenarioIds = new Set(scenarioIndex.public_baseline_ids);
  const sampleProjectScenarioIds = manifest.sample_projects.map((project) => project.scenario_id);

  assert.deepEqual(scenarioIndex.public_baseline_ids, PUBLIC_SCENARIO_IDS);
  assert.deepEqual(manifest.public_scenario_ids, PUBLIC_SCENARIO_IDS);
  assert.deepEqual(manifest.developer_preview_exclusions, scenarioIndex.developer_preview_ids);
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

test("featured sample runs point at checked-in evidence and matching projects", () => {
  const manifest = readJson(SAMPLE_RUNS_PATH);
  const sampleProjects = new Map(manifest.sample_projects.map((project) => [project.id, project]));

  for (const run of manifest.featured_runs) {
    const sampleProject = sampleProjects.get(run.project_id);
    assert.ok(sampleProject, `${run.id} must reference a sample project`);
    assert.equal(run.project_url, sampleProject.project_url, `${run.id} project URL drifted`);
    assert.equal(run.scenario_id, sampleProject.scenario_id, `${run.id} scenario drifted`);

    for (const url of [run.image_url, run.metadata_url, run.project_url]) {
      const assetPath = resolveLandingUrl(url);
      assert.ok(existsSync(new URL(`../${assetPath}`, import.meta.url)), `missing ${run.id} asset ${assetPath}`);
    }

    for (const marker of run.evidence_markers) {
      assert.ok(Number.isFinite(resolveEvidenceMarker(marker)), `${run.id} evidence marker must resolve: ${marker}`);
    }
  }
});
