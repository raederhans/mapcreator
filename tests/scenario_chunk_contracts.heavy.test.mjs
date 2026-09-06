import { test } from "./helpers/scenario_chunk_contract_support.mjs";
import { registerScenarioChunkContractHeavyTests } from "./scenario_chunk_contracts.heavy_cases.mjs";

registerScenarioChunkContractHeavyTests((_order, ...args) => test(...args));