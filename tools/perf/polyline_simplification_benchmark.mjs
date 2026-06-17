import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import {
  getLatitudeAdjustedSimplifyEpsilon,
  sanitizePolyline,
  simplifyPolylineEffectiveArea,
  simplifyPolylineRDP,
} from "../../js/core/renderer/polyline_simplification_helpers.js";
import { POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES } from "../../tests/fixtures/polyline_simplification_benchmark_fixtures.mjs";

export const FORBIDDEN_PRODUCTION_SIMPLIFICATION_DEPENDENCIES = [
  "simplify-js",
  "rbush",
  "flatbush",
  "@turf/turf",
];

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function toFixedMillis(value) {
  return Number(value.toFixed(3));
}

function pointsEqual(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left[0] === right[0] && left[1] === right[1];
}

function endpointStable(source, simplified) {
  if (!Array.isArray(source) || source.length < 2 || !Array.isArray(simplified) || simplified.length < 2) {
    return false;
  }
  return pointsEqual(simplified[0], source[0]) && pointsEqual(simplified[simplified.length - 1], source[source.length - 1]);
}

function summarizeRun({ source, simplified, durationMs }) {
  return {
    durationMs: toFixedMillis(durationMs),
    pointCount: simplified.length,
    endpointStable: endpointStable(source, simplified),
    reductionRatio: source.length > 0 ? Number((simplified.length / source.length).toFixed(4)) : 0,
  };
}

export async function runPolylineSimplificationBenchmark({
  fixtures = POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES,
  iterations = 40,
  candidateName = null,
  candidateSimplify = null,
} = {}) {
  const safeIterations = Math.max(1, Number(iterations) || 1);
  const report = {
    schemaVersion: 1,
    benchmark: "polyline-simplification",
    iterations: safeIterations,
    fixtureCount: fixtures.length,
    local: {
      totalDurationMs: 0,
      rdpTotalDurationMs: 0,
      effectiveAreaTotalDurationMs: 0,
    },
    candidate: {
      name: candidateName,
      available: Boolean(candidateSimplify),
      totalDurationMs: 0,
    },
    fixtures: [],
    passed: true,
  };

  for (const fixture of fixtures) {
    const rawPoints = Array.isArray(fixture.points) ? fixture.points : [];
    const sanitized = sanitizePolyline(rawPoints);
    const baseEpsilon = Math.max(0, Number(fixture.baseEpsilon) || 0);
    const areaThreshold = Math.max(0, Number(fixture.areaThreshold) || 0);
    const latitudeAdjustedEpsilon = getLatitudeAdjustedSimplifyEpsilon(baseEpsilon, sanitized);

    let rdpSimplified = sanitized.slice();
    const rdpStartedAt = performance.now();
    for (let index = 0; index < safeIterations; index += 1) {
      rdpSimplified = simplifyPolylineRDP(sanitized, latitudeAdjustedEpsilon);
    }
    const rdpDurationMs = performance.now() - rdpStartedAt;

    let effectiveAreaSimplified = sanitized.slice();
    const effectiveAreaStartedAt = performance.now();
    for (let index = 0; index < safeIterations; index += 1) {
      effectiveAreaSimplified = simplifyPolylineEffectiveArea(sanitized, areaThreshold);
    }
    const effectiveAreaDurationMs = performance.now() - effectiveAreaStartedAt;

    const fixtureResult = {
      name: fixture.name,
      rawPointCount: rawPoints.length,
      sanitizedPointCount: sanitized.length,
      removedDuringSanitize: rawPoints.length - sanitized.length,
      baseEpsilon,
      latitudeAdjustedEpsilon,
      areaThreshold,
      local: {
        rdp: summarizeRun({ source: sanitized, simplified: rdpSimplified, durationMs: rdpDurationMs }),
        effectiveArea: summarizeRun({
          source: sanitized,
          simplified: effectiveAreaSimplified,
          durationMs: effectiveAreaDurationMs,
        }),
      },
    };
    report.local.totalDurationMs += rdpDurationMs + effectiveAreaDurationMs;
    report.local.rdpTotalDurationMs += rdpDurationMs;
    report.local.effectiveAreaTotalDurationMs += effectiveAreaDurationMs;

    const localPassed =
      sanitized.length >= 2 &&
      fixtureResult.local.rdp.pointCount >= 2 &&
      fixtureResult.local.effectiveArea.pointCount >= 2 &&
      fixtureResult.local.rdp.endpointStable &&
      fixtureResult.local.effectiveArea.endpointStable;
    report.passed = report.passed && localPassed;

    if (candidateSimplify) {
      let candidateSimplified = sanitized.slice();
      const candidateStartedAt = performance.now();
      for (let index = 0; index < safeIterations; index += 1) {
        candidateSimplified = candidateSimplify(sanitized, latitudeAdjustedEpsilon);
      }
      const candidateDurationMs = performance.now() - candidateStartedAt;
      report.candidate.totalDurationMs += candidateDurationMs;
      fixtureResult.candidate = summarizeRun({
        source: sanitized,
        simplified: Array.isArray(candidateSimplified) ? candidateSimplified : [],
        durationMs: candidateDurationMs,
      });
    }

    report.fixtures.push(fixtureResult);
  }

  report.local.totalDurationMs = toFixedMillis(report.local.totalDurationMs);
  report.local.rdpTotalDurationMs = toFixedMillis(report.local.rdpTotalDurationMs);
  report.local.effectiveAreaTotalDurationMs = toFixedMillis(report.local.effectiveAreaTotalDurationMs);
  report.local.averageFixtureMs = report.fixtureCount > 0 ? toFixedMillis(report.local.totalDurationMs / report.fixtureCount) : 0;
  if (report.candidate.available) {
    report.candidate.totalDurationMs = toFixedMillis(report.candidate.totalDurationMs);
    report.candidate.averageFixtureMs =
      report.fixtureCount > 0 ? toFixedMillis(report.candidate.totalDurationMs / report.fixtureCount) : 0;
  } else {
    report.candidate.totalDurationMs = null;
    report.candidate.averageFixtureMs = null;
  }
  return report;
}

export function createSimplifyJsCandidate(simplifyFunction) {
  if (typeof simplifyFunction !== "function") {
    throw new TypeError("simplify-js candidate module must export a function");
  }
  return function simplifyJsCandidate(points, epsilon) {
    const simplifyJsPoints = points.map((point) => ({ x: point[0], y: point[1] }));
    const simplified = simplifyFunction(simplifyJsPoints, epsilon, true);
    return Array.isArray(simplified) ? simplified.map((point) => [point.x, point.y]) : [];
  };
}

function loadCandidateModule(modulePath) {
  const require = createRequire(import.meta.url);
  const imported = require(resolve(modulePath));
  const simplifyFunction = imported?.default ?? imported?.simplify ?? imported;
  return createSimplifyJsCandidate(simplifyFunction);
}

async function main() {
  const iterations = Number(readArg("--iterations", "40")) || 40;
  const outPath = readArg("--out", ".runtime/reports/generated/geometry-simplification-benchmark.json");
  const candidateModule = readArg("--candidate-module");
  const candidateName = readArg("--candidate-name", candidateModule ? "simplify-js" : null);
  const candidateSimplify = candidateModule ? loadCandidateModule(candidateModule) : null;
  const report = await runPolylineSimplificationBenchmark({
    fixtures: POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES,
    iterations,
    candidateName,
    candidateSimplify,
  });

  if (!report.passed) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
