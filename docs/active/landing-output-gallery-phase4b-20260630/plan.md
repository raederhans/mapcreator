# Phase 4B Output Gallery Plan

## Objective

Turn the existing Selected works landing section into a source-backed sample runs gallery without changing editor/runtime behavior, scenario runtime data, HGO Pages payload, or Pages publishing policy.

## Constraints

- Reuse checked-in landing media and metadata; add no large media assets.
- Keep Pages dist under the preferred 950 MiB target and inside the 1 GiB hard cap.
- Touch only landing source, landing tests, startup-shell landing contracts, generated dist mirrors, and task/registry docs.
- Keep one owner for live validation commands: the main Codex agent.

## Plan

1. Inventory the current landing works section, sample metadata, i18n keys, CSS hooks, and test harnesses.
2. Upgrade `#works` into a sample-runs gallery with at least three reproducible sample runs, source markers, filter controls, and bilingual copy.
3. Add landing-only JavaScript for filter state, click/keyboard navigation, active ARIA state, and reduced-motion-safe behavior.
4. Extend Node landing tests and startup-shell contracts for assets, metadata evidence, interaction, bilingual keys, and dist mirroring.
5. Regenerate Pages dist, run the requested validation commands, do a final review pass, update the delivery package, and leave the worktree ready for integration.

## Non-goals

- No editor/runtime behavior changes.
- No scenario runtime data changes.
- No HGO Pages payload or publishing-policy changes.
- No new sample project download flow.
