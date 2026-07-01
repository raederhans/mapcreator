# Phase 6D Sample Export Proof Polish Plan

## Task Grade

- Grade: complex.
- Reason: this touches manifest schema, Guide UI, Export Workbench UI, Node contracts, E2E/release smoke, docs, and generated Pages dist.
- Live owner: main Codex thread owns dev server, browser E2E, Pages dist, and all long-running verification.
- Subagent lanes: static code mapping, QA scenario design, and final review/architecture verification only.

## Success Criteria

1. Every public sample in `landing/assets/sample-runs.json` has a small validated `recommended_export` object.
2. HGO/developer preview remains absent from public samples.
3. Guide sample card shows compact recommended export text for loaded samples.
4. Export Workbench shows loaded sample title and recommended export text when a sample is active.
5. Normal Export Workbench usage without a loaded sample remains unchanged.
6. Focused Node tests, focused sample Guide E2E, release gate assertions, Pages dist verification, dist drift verification, import graph verification, and diff check pass or have explicit evidence-backed blockers.

## Steps

- [x] Inspect sample manifest, sample registry, Guide card, Export Workbench state, tests, scripts, and docs.
- [x] Add recommendation metadata and pure resolver with validation-friendly shape.
- [x] Update Guide card and Export Workbench UI using existing controller patterns.
- [x] Extend Node contracts, focused Playwright, release smoke, docs, and generated dist.
- [x] Run UltraQA scenario matrix and required validation commands.
- [x] Run review / bug-finding / first-principles pass, fix findings, rerun impacted validation.
- [ ] Commit with Lore protocol and leave integration-ready delivery package in the registry.

## First-Principles Check

The root user need is proof that a loaded public sample can produce a concrete export outcome. The smallest durable path is metadata plus UI readouts plus tests around the existing export surface. Export architecture, scenario runtime data, and download behavior stay stable because the phase is about guidance and proof, not a new export engine.
