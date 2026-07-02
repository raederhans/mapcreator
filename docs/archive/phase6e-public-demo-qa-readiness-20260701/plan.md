# Phase 6E Public Demo QA Readiness Plan

## Task Grade

- Grade: complex.
- Reason: this touches public sample state, Guide, Export Workbench, landing, E2E coverage, i18n, Pages dist, release docs, and release smoke readiness.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-phase6e-public-demo-qa-readiness`
- Branch: `codex/phase6e-public-demo-qa-readiness`
- Base: `origin/main@bb75c0cc5fc9c38ddb076674151a3f17135c5ec7`

## First Principles

The public demo release needs trust more than new surface area. Phase 6E should prove that the already-built sample path behaves consistently, remains reachable on mobile, keeps focus usable, localizes visible sample UI, and ships with release docs that match actual behavior.

## Non-goals

- No new public sample feature.
- No full sample gallery beyond the existing switcher.
- No export file auto-download in release smoke.
- No HGO exposure in public samples.
- No backend, cloud, or large media asset additions.

## Execution Plan

Execution constraints:
- Prefer extending existing `tests/e2e/sample_guide_deeplink.spec.js` and `tests/e2e/release/pages_public_release_gate.spec.js`; add new routing only if a real coverage gap cannot fit those entries.
- Treat `package.json`, `tools/e2e_layering.mjs`, `tools/select_verification_targets.mjs`, and `tests/e2e/test-layer-manifest.json` as shared hot files; default to leaving them unchanged.
- If existing contracts already prove a target behavior, stop at docs/test hardening instead of expanding production code.

1. Ground the codebase and tests.
   - Map current sample registry, import workflow, Guide card, banner, switcher, Export Workbench, landing cards, release smoke, i18n, and E2E layer manifest.
   - Confirm existing test entry points before adding tests.

2. Audit public sample state.
   - Normal Guide route has no misleading sample state.
   - TNO sample deep link reaches success.
   - Bad sample link reaches visible nonfatal error.
   - Sample switch success updates sample id, scenario id, URL, selected state, and recommendation.
   - Failed sample switch preserves previous committed sample and previous recommended export.
   - Dirty cancel preserves current sample and URL.

3. Audit focus and stacking.
   - Dirty confirmation appears above Guide.
   - Cancel returns focus to selected sample choice or a safe Guide control.
   - Confirm imports the selected sample and leaves keyboard focus usable.
   - Opening and closing Export from Guide returns focus to a sensible Guide action.
   - Escape behavior stays predictable across Guide, dirty dialog, and Export Workbench.

4. Audit mobile and Chinese UI.
   - Add or extend focused Playwright coverage at 375px, 768px, and desktop.
   - Verify Guide sample card, sample choices, Project sample banner actions, Export Workbench context, landing sample cards, and CTAs.
   - Switch to Simplified Chinese and assert sample-aware Guide, recommended export, switcher, and Export context show localized text.

5. Update release readiness.
   - Keep release smoke focused on landing, one TNO deep link, five public samples, no HGO, recommendation, Export context, banner, and console/network expectations.
   - Update `docs/releases/v0.1-public-demo-draft.md` with actual Pages size, current coverage, behavior, and known limits.
   - Update README files only when public wording is stale.

6. Validate and close.
   - Run targeted Node/E2E/i18n gates first.
   - Regenerate Pages dist and run local dist release gate.
   - Run import graph, dist drift, i18n audit, and diff checks.
   - Run independent review and QA, then commit, push, archive docs, and clean the worktree when integrated.

## Live Process Ownership

Main Codex thread owns all live browser, Playwright, Pages dist, dev server, and local HTTP server runs. Subagents may inspect code, propose tests, and review static outputs. They must not start, monitor, or retry the same live process.

## Product Design Audit Destination

Audit evidence and screenshots go under `.runtime/browser/phase6e-public-demo-qa/`. The local folder is chosen because project rules require disposable runtime outputs under `.runtime/`.
