import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compareCatalogProjections } from "./catalog_projection_shadow.mjs";
import { buildCanonicalCatalogProjectionBundle } from "./verification_catalog_projection.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Historical receipt support only. This snapshot is never synchronized with current metadata.
const HISTORICAL_BASELINE = JSON.parse(fs.readFileSync(
  new URL("./catalog_projection_historical_baseline.json", import.meta.url), "utf8",
));

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values) {
  return [...new Set(values)].sort(compareText);
}

function normalizeAliases(packageScripts, supersession) {
  const aliases = new Map();
  for (const [commandRef, command] of Object.entries(packageScripts || {})) {
    const match = /^npm run\s+([^\s]+)$/u.exec(String(command).trim());
    if (match) aliases.set(commandRef, { commandRef, supersedes: [], targetCommandRef: match[1] });
  }
  for (const [commandRef, supersedes] of Object.entries(supersession || {})) {
    const existing = aliases.get(commandRef) || { commandRef, supersedes: [] };
    existing.supersedes = sortedUnique(supersedes || []);
    aliases.set(commandRef, existing);
  }
  return [...aliases.values()].sort((left, right) => compareText(left.commandRef, right.commandRef));
}

function normalizeHeavyGroups(groups) {
  return Object.entries(groups || {}).sort(([left], [right]) => compareText(left, right)).map(([id, group]) => ({
    id,
    description: group.description,
    patterns: sortedUnique(group.patterns || []),
  }));
}

function workflowJobIds(workflowText) {
  const jobs = [];
  let inJobs = false;
  for (const line of String(workflowText).split(/\r?\n/u)) {
    if (line === "jobs:") {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    const match = /^  ([a-z0-9-]+):\s*$/u.exec(line);
    if (match) jobs.push(match[1]);
  }
  return sortedUnique(jobs);
}

function linuxCoreShards(workflowText) {
  const match = /\n  linux-core:[\s\S]*?\n  [a-z0-9-]+:/u.exec(`\n${workflowText}\n`);
  const matrix = /\n\s+shard:\s*\[([^\]]+)\]/u.exec(match?.[0] || "");
  return matrix
    ? sortedUnique(matrix[1].split(",").map((value) => value.trim()).filter(Boolean))
    : [];
}

function normalizeNightlyRolesFromWorkflow(workflowText) {
  const linuxShards = linuxCoreShards(workflowText);
  return workflowJobIds(workflowText).map((id) => ({
    id,
    shards: id === "linux-core" ? linuxShards : [id],
  }));
}

function nightlyShards(roles) {
  return roles.flatMap((role) => role.shards.map((shard, index) => ({
    id: `${role.id}:${shard}`,
    roleId: role.id,
    shard,
    shardIndex: index + 1,
    shardCount: role.shards.length,
  }))).sort((left, right) => compareText(left.id, right.id));
}

function finalDependenciesFromWorkflow(workflowText) {
  const finalBlock = /\n  final:[\s\S]*$/u.exec(`\n${workflowText}`)?.[0] || "";
  const needsMatch = /\n    needs:\s*\[([^\]]+)\]/u.exec(finalBlock);
  const expectedMatch = /const expectedJobs = \[([^\]]+)\]/u.exec(finalBlock);
  const parse = (match) => match
    ? sortedUnique([...match[1].matchAll(/["']([a-z0-9-]+)["']/gu)].map((entry) => entry[1]))
    : [];
  const needs = parse(needsMatch);
  const expectedJobs = parse(expectedMatch);
  if (JSON.stringify(needs) !== JSON.stringify(expectedJobs)) {
    throw new Error("catalog-projection-shadow-nightly-final-dependency-drift");
  }
  return needs;
}

function prProfilesFromWorkflows(prWorkflow, perfPrGateWorkflow) {
  const profiles = [...String(prWorkflow).matchAll(/^\s+profile:\s*([a-z0-9-]+)\s*$/gmu)]
    .map((match) => match[1]);
  if (/^name:\s*perf-pr-gate\s*$/mu.test(String(perfPrGateWorkflow))) profiles.push("perf-pr-gate");
  return sortedUnique(profiles);
}

export function buildLegacyCatalogProjections({
  repoRoot = REPO_ROOT,
  packageScripts = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")).scripts,
  heavyDependencyGroups = JSON.parse(fs.readFileSync(path.join(repoRoot, "tests", "heavy_dependency_groups.json"), "utf8")),
  verificationRecords = [{ sourceRefs: HISTORICAL_BASELINE.documentation }],
  supersession = HISTORICAL_BASELINE.supersession,
  prWorkflow = fs.readFileSync(path.join(repoRoot, ".github", "workflows", "pr-verify.yml"), "utf8"),
  perfPrGateWorkflow = fs.readFileSync(path.join(repoRoot, ".github", "workflows", "perf-pr-gate.yml"), "utf8"),
  nightlyWorkflow = fs.readFileSync(path.join(repoRoot, ".github", "workflows", "nightly-verification.yml"), "utf8"),
} = {}) {
  const roles = normalizeNightlyRolesFromWorkflow(nightlyWorkflow);
  return {
    heavyDependencyGroups: normalizeHeavyGroups(heavyDependencyGroups),
    packageAliases: normalizeAliases(packageScripts, supersession),
    prProfiles: prProfilesFromWorkflows(prWorkflow, perfPrGateWorkflow).map((id) => ({ id })),
    nightlyTopology: {
      roles,
      shards: nightlyShards(roles),
      finalDependencies: finalDependenciesFromWorkflow(nightlyWorkflow),
    },
    documentation: sortedUnique(verificationRecords.flatMap((record) => record.sourceRefs || [])
      .filter((sourceRef) => sourceRef.startsWith("docs/"))).map((sourceRef) => ({ sourceRef })),
  };
}

export function buildRepositoryCatalogProjectionShadowComparison({
  canonicalBundle = buildCanonicalCatalogProjectionBundle(),
  legacyOptions = {},
} = {}) {
  return compareCatalogProjections({
    canonicalBundle,
    legacy: buildLegacyCatalogProjections(legacyOptions),
  });
}
