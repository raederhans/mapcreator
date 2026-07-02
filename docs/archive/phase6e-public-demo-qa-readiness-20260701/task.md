# Phase 6E Public Demo QA Readiness Task Tracker

## Checklist

- [x] Create isolated worktree from current `origin/main`.
- [x] Load requested skills and project rules.
- [x] Read Phase 6E attachment.
- [x] Read `lessons learned.md`.
- [x] Create active task docs.
- [x] Update `docs/active/_worktree_registry.md` with Phase 6E current truth.
- [x] Map existing source and tests.
- [x] Decide whether to extend existing E2E specs or add focused specs.
- [x] Add state consistency coverage.
- [x] Add focus and modal stacking coverage.
- [x] Add mobile/narrow viewport coverage.
- [x] Add Chinese UI coverage and run i18n audit.
- [x] Update release smoke coverage.
- [x] Update release draft and README copy only when stale.
- [x] Regenerate dist.
- [x] Run required validation gates.
- [x] Run independent code review and QA.
- [x] Commit with Lore protocol.
- [ ] Push feature branch and clean worktree after integration.

## Acceptance Mapping

- State consistency: good, bad, switch, failed switch, and dirty cancel paths covered.
- Focus and stacking: dirty dialog, Export Workbench, Escape, and focus return covered.
- Mobile: Guide, banner, Export context, landing cards, and CTAs checked at narrow and wider widths.
- Chinese UI: sample path localized with no visible fallback or missing copy.
- Release smoke: focused on one TNO path, five public samples, no HGO, recommendation, banner, and Export context.
- Release docs: draft reflects actual final Pages size and behavior.
- Size: Pages dist stays below preferred 950 MiB and hard 1 GiB.

## Final Readiness Notes

- Current branch has a Lore commit rebased onto `origin/main@58e3935b` and passed fresh post-rebase validation.
- Integration can fast-forward through the isolated Phase 6E worktree while preserving the parent `main` checkout WIP.
- Remote deployed Pages smoke remains a post-deploy gate.
