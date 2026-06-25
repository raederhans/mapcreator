# Startup Ready Handoff Phase8 Plan

Date: 2026-06-25

## Goal

Extract the startup ready-state handoff and post-ready policy from `js/main.js` into `js/bootstrap/startup_ready_handoff.js` without changing task order, scheduler keys, timing, chunk refresh first-ready seeding, hydration, context warmup, visual warmup, interaction infrastructure warmup, or deferred detail promotion handoff behavior.

## Scope

- Add `createStartupReadyHandoffOwner(options = {})`.
- Keep startup data pipeline wrappers in `main.js` where they bridge to `getStartupDataPipelineOwner()`.
- Wire `DeferredDetailPromotionOwner` to ready handoff helper methods.
- Update phase7 bootstrap wiring boundary so phase8 owns ready handoff policy.
- Add behavior and boundary tests through `npm run test:node:startup-ready-handoff`.
- Sync Pages dist when source changes drift.

## Non-Goals

- Do not change startup data pipeline boot flow.
- Do not change startup scenario boot flow.
- Do not change UI shell boot, failure recovery, deferred UI/bootstrap owner, or post-ready scheduler implementation.
- Do not expand the state-write allowlist.
- Do not touch the parent checkout `docs/archive/**` deletion WIP.

## Validation

Run the requested phase8 stack:

- `node --check js/bootstrap/startup_ready_handoff.js js/main.js`
- `npm run test:node:startup-ready-handoff`
- phase1-7 node regressions
- scenario refresh and render diagnostics node regressions
- `npm run verify:state-write-allowlist`
- `npm run verify:architecture-boundaries`
- `npm run verify:pages-dist`
- `npm run verify:dist-drift`
- TNO ready-state, smoke, UI rework mainline, and scenario chunk runtime e2e gates

Live test/build owner: main Codex agent.
