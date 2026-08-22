import { test } from "./helpers/scenario_chunk_contract_support.mjs";
import { registerScenarioChunkContractQuickTests } from "./scenario_chunk_contracts.test.mjs";

registerScenarioChunkContractQuickTests((_order, ...args) => test(...args));
