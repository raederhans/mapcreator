import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";

import {
  createLayerFromPreset,
  getSpecialZoneLayerMemberSetOperationIds,
  getSpecialZoneStoryPreviewSteps,
  mutateSpecialZoneLayersState,
  serializeSpecialZoneLayersState,
} from "../../js/core/special_zone_layers.js";

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const memberCount = Math.max(200, Number(readArg("--members", "240")) || 240);
const iterations = Math.max(1, Number(readArg("--iterations", "40")) || 40);
const outPath = readArg("--out", ".runtime/output/perf/special-zone-members-benchmark.json");
const memberIds = Array.from({ length: memberCount }, (_value, index) => `member-${String(index + 1).padStart(4, "0")}`);
let state = {
  version: 1,
  layers: [
    createLayerFromPreset("custom", { id: "target", memberFeatureIds: memberIds.slice(0, Math.floor(memberCount * 0.75)) }),
    createLayerFromPreset("buffer", { id: "source", memberFeatureIds: memberIds.slice(Math.floor(memberCount * 0.25)) }),
  ],
  activeLayerId: "target",
  storySteps: [{ id: "step-all", title: "All zones", layerIds: ["target", "source"] }],
};

const startedAt = performance.now();
for (let index = 0; index < iterations; index += 1) {
  const sourceIds = getSpecialZoneLayerMemberSetOperationIds(
    state.layers[0].memberFeatureIds,
    state.layers[1].memberFeatureIds,
    index % 3 === 0 ? "union" : index % 3 === 1 ? "subtract" : "intersect",
  );
  state = mutateSpecialZoneLayersState(state, {
    action: "replaceMembers",
    layerId: "target",
    featureIds: sourceIds,
  });
  serializeSpecialZoneLayersState(state);
  getSpecialZoneStoryPreviewSteps(state);
}
const durationMs = performance.now() - startedAt;
const payload = {
  schemaVersion: 1,
  benchmark: "special-zone-members",
  memberCount,
  iterations,
  durationMs: Number(durationMs.toFixed(3)),
  averageIterationMs: Number((durationMs / iterations).toFixed(3)),
  finalMemberCount: state.layers[0].memberFeatureIds.length,
  passed: memberCount >= 200 && durationMs < 250,
};
if (!payload.passed) {
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
}
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload));
