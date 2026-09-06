import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import { registerScenarioChunkContractQuickTests } from "./scenario_chunk_contracts.quick_cases.mjs";
import { registerScenarioChunkContractHeavyTests } from "./scenario_chunk_contracts.heavy_cases.mjs";

export {
  registerScenarioChunkContractQuickTests,
  registerScenarioChunkContractHeavyTests,
};

export function registerScenarioChunkContractTests() {
  const registrations = [];
  const collect = (order, ...args) => registrations.push({ order, args });
  registerScenarioChunkContractQuickTests(collect);
  registerScenarioChunkContractHeavyTests(collect);
  registrations.sort((left, right) => left.order - right.order);
  for (const { args } of registrations) test(...args);
}

export function scenarioChunkContractRegistrationManifest() {
  const registrations = [];
  registerScenarioChunkContractQuickTests((order, name) => {
    registrations.push({ order, name, partition: "quick" });
  });
  registerScenarioChunkContractHeavyTests((order, name) => {
    registrations.push({ order, name, partition: "heavy" });
  });
  return registrations.sort((left, right) => left.order - right.order);
}

const directPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (directPath === path.resolve(fileURLToPath(import.meta.url))) {
  registerScenarioChunkContractTests();
}