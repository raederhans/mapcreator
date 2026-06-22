# Thematic Legend And Safety Semantics Context

## Current Truth

- Current base for this planning phase is `origin/main@159870ed0752d5e03ef550c2ac51e2af87125f24`.
- WGI real-source QA is already integrated and pushed via `codex/wgi-real-source-qa-fix-20260622@6ac22158`.
- WGI source ingest preserves uncertainty and source-derived metadata.
- Thematic layers remain catalog-only and hidden by default.
- Main map rendering is still disabled for thematic layers.

## Why This Phase Exists

The next product risk is interpretation safety. The project can already carry real WGI metadata, but a reader still needs stable meaning for units, scale, missing values, uncertainty, composites, and warnings before any map renderer turns those metrics into color.

## Working Constraints

- Main Codex agent owns any live validation command.
- Subagents may review docs and code statically.
- The existing admin metrics loader worktree is separate and should keep its own delivery package.
- This docs phase should not edit renderer, UI toggles, save format, generated thematic assets, or Pages dist.

## Open Questions For The Implementation Slice

- Whether `legend_bins` should live in Python contracts first, JS catalog payloads first, or both in one small commit.
- Whether `render_readiness` should use a central enum in Python and a mirrored JS assertion.
- Which WGI citation text should be treated as required catalog metadata.

## Evidence Log

- `git worktree list --porcelain`: main, admin metrics loader, and this Legend/Safety worktree all start from `159870ed`.
- `docs/archive/wgi-real-source-qa-fix-20260622/task.md`: WGI QA is marked integrated, pushed, archived, and cleaned.
- `docs/active/_worktree_registry.md`: updated to treat WGI and cleanup as complete and to keep future semantic work before rendering.

## Live Process Ownership

- No dev server, browser inspection, long build, or long test is active.
- `npm run test:node:thematic-layer-catalog` is the only planned runtime check for this docs-only pass.
