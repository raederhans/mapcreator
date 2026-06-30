# Phase 5A Sample Projects Plan

## Objective

Add a small downloadable sample project pack and reproducible demo recipe manifest that sit on top of the merged Phase4B sample-runs gallery.

## Success Criteria

- Public downloads use only public scenarios: `blank_base`, `modern_world`, `hoi4_1936`, `hoi4_1939`, and `tno_1962`.
- `hgo_1936` remains local-preview-only and is excluded from sample project JSON and sample-run manifest entries.
- Landing sample cards expose clear project JSON download links and reproducible recipe metadata.
- README, Simplified Chinese README, and release draft tell users how to import the sample projects without promising one-click app state loading.
- Contract tests validate sample files, manifest URLs, public scenario boundaries, and project schema compatibility.
- Pages dist is regenerated from source and remains within existing size gates.

## Plan

1. Inventory current Phase4B gallery, FileManager project schema, scenario index, README sections, release draft, and existing tests.
2. Add compact project JSON files under `landing/assets/sample-projects/` and a source manifest at `landing/assets/sample-runs.json`.
3. Wire landing cards to the manifest/downloads with bilingual copy and small, stable controls.
4. Add or extend focused contracts for sample project schema, manifest URL resolution, public scenario boundaries, and landing download links.
5. Update docs and generated dist, run the validation set, then do independent code/architecture/QA review.
6. Commit, push branch, merge back to main, update registry, and clean the worktree after verification.

## Non-goals

- No editor runtime behavior changes.
- No private HGO sample downloads.
- No new media assets.
- No browser inspection unless a later failure specifically needs it.
- No large project-package abstraction beyond the minimal reusable manifest contract.

## Live Process Ownership

The main Codex agent owns all builds, tests, dev servers, and browser processes. Subagents may inspect source and recommend fixes only.
