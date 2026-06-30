# Phase5B Sample Deep Link Plan

## Objective

Implement a safe public sample deep link:

- Landing links use `/app/?sample=<sample-id>&view=guide`.
- The app resolves sample ids through `landing/assets/sample-runs.json`.
- The selected checked-in `landing/assets/sample-projects/*.project.json` imports through the same FileManager normalization and interaction funnel used by manual project import.
- Unknown ids, HGO/developer preview ids, arbitrary URLs, remote URLs, and path traversal stop before any project JSON fetch.

## Task Grade

Complex. This touches app startup, FileManager import internals, landing HTML/CSS/i18n, public release smoke, Pages dist, docs, and worktree registry.

## Implementation Checklist

- [x] Refactor FileManager so file import and fetched text import share one normalization path.
- [x] Add sample project registry/loader with public manifest allowlist and fixed local asset path checks.
- [x] Add app startup scheduling after ready state to import a requested sample once.
- [x] Update landing sample links and manifest `demo_path` values.
- [x] Extend Node/Python/Playwright contracts.
- [x] Update README/release draft with sample deep-link format.
- [x] Regenerate Pages dist and verify Pages release package.
- [x] Run focused validations.
- [x] Run independent code-review and architect lanes.
- [x] Fix review findings for stale docs/registry and central state scaffold visibility.
- [x] Complete follow-up review.
- [ ] Commit, integrate to main, push, and clean worktree when safe.

## Live Process Owner

Main Codex agent owns all test/build commands. Subagents are static/review only and must not start or monitor the same live process.
