export const VERIFICATION_COMMAND_SUPERSESSION = Object.freeze({
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

export function collapseSupersededCommands(commandRefs, {
  supersession = VERIFICATION_COMMAND_SUPERSESSION,
} = {}) {
  const ordered = [...new Set((commandRefs || []).map((entry) => String(entry || "").trim()).filter(Boolean))];
  const selected = new Set(ordered);
  const superseded = new Set();
  for (const [commandRef, coveredCommands] of Object.entries(supersession)) {
    if (!selected.has(commandRef)) continue;
    for (const covered of coveredCommands) superseded.add(covered);
  }
  return ordered.filter((commandRef) => !superseded.has(commandRef));
}
