import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES } from "./fixtures/polyline_simplification_benchmark_fixtures.mjs";
import {
  FORBIDDEN_PRODUCTION_SIMPLIFICATION_DEPENDENCIES,
  runPolylineSimplificationBenchmark,
} from "../tools/perf/polyline_simplification_benchmark.mjs";

test("benchmark fixtures are named and exercise sanitization plus latitude scaling", () => {
  assert.ok(POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES.length >= 3);
  assert.ok(POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES.some((fixture) => fixture.name === "messy-coastline-input"));
  assert.ok(POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES.some((fixture) => fixture.name === "high-latitude-wave"));
  POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES.forEach((fixture) => {
    assert.equal(typeof fixture.name, "string");
    assert.ok(fixture.points.length >= 2);
    assert.ok(fixture.baseEpsilon >= 0);
    assert.ok(fixture.areaThreshold >= 0);
  });
});

test("benchmark report preserves local helper invariants for every fixture", async () => {
  const report = await runPolylineSimplificationBenchmark({
    fixtures: POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES,
    iterations: 3,
  });

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.benchmark, "polyline-simplification");
  assert.equal(report.iterations, 3);
  assert.equal(report.fixtures.length, POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES.length);
  assert.equal(report.passed, true);
  assert.ok(report.local.totalDurationMs >= 0);
  assert.ok(report.local.rdpTotalDurationMs >= 0);
  assert.ok(report.local.effectiveAreaTotalDurationMs >= 0);

  report.fixtures.forEach((fixture) => {
    assert.ok(fixture.rawPointCount >= fixture.sanitizedPointCount);
    assert.ok(fixture.local.rdp.pointCount >= 2);
    assert.ok(fixture.local.effectiveArea.pointCount >= 2);
    assert.equal(fixture.local.rdp.endpointStable, true);
    assert.equal(fixture.local.effectiveArea.endpointStable, true);
    assert.ok(fixture.latitudeAdjustedEpsilon >= fixture.baseEpsilon);
  });
});

test("candidate comparison is optional and does not affect local pass status", async () => {
  const candidateCalls = [];
  const report = await runPolylineSimplificationBenchmark({
    fixtures: POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES.slice(0, 1),
    iterations: 2,
    candidateName: "identity-candidate",
    candidateSimplify(points) {
      candidateCalls.push(points);
      return points.slice();
    },
  });

  assert.equal(report.passed, true);
  assert.equal(report.candidate.name, "identity-candidate");
  assert.equal(report.candidate.available, true);
  assert.equal(report.fixtures[0].candidate.endpointStable, true);
  assert.equal(candidateCalls.length, 2);
});

test("production dependency fields stay free of geometry simplification candidates", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const packageLockJson = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const rootLockPackage = packageLockJson.packages?.[""] ?? {};
  const productionFields = [
    packageJson.dependencies ?? {},
    packageJson.optionalDependencies ?? {},
    packageJson.peerDependencies ?? {},
    rootLockPackage.dependencies ?? {},
    rootLockPackage.optionalDependencies ?? {},
    rootLockPackage.peerDependencies ?? {},
  ];
  const devDependencyFields = [packageJson.devDependencies ?? {}, rootLockPackage.devDependencies ?? {}];

  FORBIDDEN_PRODUCTION_SIMPLIFICATION_DEPENDENCIES.forEach((packageName) => {
    productionFields.forEach((field) => {
      assert.equal(Object.hasOwn(field, packageName), false, `${packageName} must not be a production dependency`);
    });
    devDependencyFields.forEach((field) => {
      assert.equal(Object.hasOwn(field, packageName), false, `${packageName} must stay out of devDependencies in this spike`);
    });
  });
});
