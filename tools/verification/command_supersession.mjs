import { VERIFICATION_METADATA_SOURCE } from "./verification_catalog_source.mjs";
import { VERIFICATION_METADATA_SOURCE_IDENTITY } from "./verification_catalog_projection.mjs";

// Shadow-only baseline retained for deterministic legacy/canonical comparison.
export const LEGACY_VERIFICATION_COMMAND_SUPERSESSION = Object.freeze({
  "verify:supervisor-contracts": Object.freeze([
    "test:node:supervisor-contracts",
    "test:node:supervisor-routing",
  ]),
  "verify:supervisor-plan": Object.freeze([
    "test:node:supervisor-plan",
  ]),
  "verify:p4:p4-1": Object.freeze([
    "test:node:p4:p4-1",
    "test:python:p4:p4-1-boundary",
  ]),
  "verify:p4:p4-2a": Object.freeze([
    "test:node:p4:p4-2a",
    "test:python:p4:p4-2a-boundary",
  ]),
  "verify:p4:p4-2b": Object.freeze([
    "test:node:p4:p4-2b",
    "test:python:p4:p4-2b-boundary",
    "test:node:p4:state-writer-policy",
    "test:node:p4:state-writer-policy:quick",
  ]),
  "verify:p4:p4-2c": Object.freeze([
    "test:node:p4:p4-2c",
    "test:python:p4:p4-2c-boundary",
    "test:node:p4:state-writer-policy",
    "test:node:p4:state-writer-policy:quick",
  ]),
  "verify:p4:p4-3": Object.freeze([
    "test:node:p4:p4-3",
    "test:python:p4:p4-3-boundary",
    "verify:p4:state-writer-policy",
    "test:node:p4:state-writer-policy",
    "test:node:p4:state-writer-policy:quick",
  ]),
  "verify:p4:state-writer-policy": Object.freeze([
    "test:node:p4:state-writer-policy",
    "test:node:p4:state-writer-policy:quick",
  ]),
  "test:node:p4:state-writer-policy": Object.freeze([
    "test:node:p4:state-writer-policy:quick",
  ]),
  "test:node:p4:p4-2a": Object.freeze([
    "test:node:scenario-apply-transaction-ownership",
    "test:node:scenario-lifecycle-runtime-behavior",
    "test:node:scenario-runtime-state-behavior",
  ]),
  "test:node:p4:p4-2b": Object.freeze([
    "test:node:scenario-chunk-contracts",
  ]),
  "test:node:p4:p4-3": Object.freeze([
    "test:node:renderer-render-phase-lifecycle",
    "test:node:zoom-interaction-lifecycle-owner",
  ]),
  "test:node:hit-canvas-scheduling-owner-suite": Object.freeze([
    "test:node:renderer-hit-canvas-scheduling-inventory",
  ]),
  "verify:tno-coverage-chain": Object.freeze([
    "verify:scenario-contracts:strict",
    "verify:tno-coverage-ledger",
    "verify:tno-atlantropa-coverage",
    "verify:tno-polar-coverage",
    "test:node:scenario-chunk-contracts",
  ]),
  "verify:pages-dist-and-drift": Object.freeze([
    "verify:pages-dist",
    "verify:dist-drift",
  ]),
});

export const VERIFICATION_COMMAND_SUPERSESSION = VERIFICATION_METADATA_SOURCE.supersession;
export const COMMAND_SUPERSESSION_SOURCE_IDENTITY = VERIFICATION_METADATA_SOURCE_IDENTITY;

function commandSupersessionCycleError(nodes) {
  const stableNodes = [...new Set(nodes)].sort();
  const error = new Error(`command-supersession-cycle:${stableNodes.join(",")}`);
  error.code = "command-supersession-cycle";
  error.nodes = stableNodes;
  return error;
}

function commandSupersessionUnresolvedError(commandRef) {
  const error = new Error(`command-supersession-unresolved:${commandRef}`);
  error.code = "command-supersession-unresolved";
  error.commandRef = commandRef;
  return error;
}

function assertAcyclicSelectedSupersessionGraph(ordered, selected, supersession) {
  const graph = new Map(ordered.map((commandRef) => [
    commandRef,
    [...new Set((supersession[commandRef] || []).filter((covered) => selected.has(covered)))].sort(),
  ]));
  const state = new Map();
  const stack = [];
  const stackIndexes = new Map();

  function visit(commandRef) {
    state.set(commandRef, "visiting");
    stackIndexes.set(commandRef, stack.length);
    stack.push(commandRef);
    for (const covered of graph.get(commandRef) || []) {
      if (state.get(covered) === "visiting") {
        throw commandSupersessionCycleError(stack.slice(stackIndexes.get(covered)));
      }
      if (state.get(covered) !== "visited") visit(covered);
    }
    stack.pop();
    stackIndexes.delete(commandRef);
    state.set(commandRef, "visited");
  }

  for (const commandRef of [...ordered].sort()) {
    if (!state.has(commandRef)) visit(commandRef);
  }
}

export function buildCommandSupersessionPlan(commandRefs, {
  supersession = VERIFICATION_COMMAND_SUPERSESSION,
} = {}) {
  const ordered = [...new Set((commandRefs || []).map((entry) => String(entry || "").trim()).filter(Boolean))];
  const selected = new Set(ordered);
  assertAcyclicSelectedSupersessionGraph(ordered, selected, supersession);
  const superseded = new Set();
  const directSuperseders = new Map();
  for (const commandRef of ordered) {
    const coveredCommands = supersession[commandRef] || [];
    for (const covered of coveredCommands) superseded.add(covered);
    for (const covered of coveredCommands) {
      if (!selected.has(covered)) continue;
      const candidates = directSuperseders.get(covered) || [];
      candidates.push(commandRef);
      directSuperseders.set(covered, candidates);
    }
  }
  const retained = new Set(ordered.filter((commandRef) => !superseded.has(commandRef)));
  function resolveRetainedSuperseder(commandRef, seen = new Set()) {
    if (seen.has(commandRef)) return null;
    const nextSeen = new Set(seen).add(commandRef);
    const candidates = directSuperseders.get(commandRef) || [];
    for (const candidate of candidates) {
      if (retained.has(candidate)) return candidate;
    }
    for (const candidate of candidates) {
      const resolved = resolveRetainedSuperseder(candidate, nextSeen);
      if (resolved) return resolved;
    }
    return null;
  }
  return {
    commandRefs: ordered.filter((commandRef) => retained.has(commandRef)),
    supersededCommands: ordered
      .filter((commandRef) => superseded.has(commandRef))
      .map((commandRef) => {
        const supersededBy = resolveRetainedSuperseder(commandRef);
        if (!supersededBy) throw commandSupersessionUnresolvedError(commandRef);
        return { commandRef, supersededBy };
      }),
  };
}

export function collapseSupersededCommands(commandRefs, options = {}) {
  return buildCommandSupersessionPlan(commandRefs, options).commandRefs;
}
