# TNO Coverage Chain Audit Plan

## Goal

Turn the TNO land/water coverage concerns into hard data contracts before changing geometry generation. The first implementation pass adds ledgers, validators, report fields, npm entrypoints, and focused tests for:

- Russia Arctic shell fallback coverage (`RU_ARCTIC_FB_`).
- Atlantropa donor-to-runtime coverage, including Ionian/Mediterranean basin probes.
- Atlantropa land/helper interaction coverage.
- Antarctic/AQ polar spherical geometry checks.

## Constraints

- Work in isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-tno-coverage-chain-audit`.
- Preserve parent checkout WIP in `C:\Users\raede\Desktop\dev\mapcreator`.
- Main agent owns live tests, Pages dist, merge, push, and cleanup.
- Subagents are static/review lanes only.
- Runtime reports go under `.runtime/reports/generated/`.
- Durable generated ledgers go under `data/scenarios/tno_1962/derived/`.

## Implementation Phases

1. Sync worktree registry and task docs.
2. Re-run current gates and classify `build_snapshot.json` drift.
3. Add coverage ledger generation and protected-prefix drop audit.
4. Add validators for RU Arctic, Atlantropa/Ionian, and AQ polar coverage.
5. Wire strict contract report fields and npm scripts.
6. Add focused unit tests and run targeted validation.
7. Run review/self-audit, commit, merge, push, and cleanup only after verification passes.

## Acceptance Gates

- `npm run verify:scenario-contracts:strict`
- `npm run verify:scenario-contracts:hgo`
- `npm run test:node:scenario-chunk-contracts`
- `npm run test:py:tno-water-repair-contracts`
- `npm run verify:tno-coverage-chain`
- `git diff --check`

`npm run verify:pages-dist` is required if source/dist or Pages manifest outputs are touched.
