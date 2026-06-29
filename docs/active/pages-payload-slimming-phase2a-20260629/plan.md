# Phase 2A Pages Payload Slimming Plan

Base: `origin/main@d331daae879af0a70312c0f82f9c1a9bfb0e710d`
Worktree: `C:\Users\raede\.codex\worktrees\scenario-forge-phase2a-pages-slimming`
Branch: `codex/phase2a-pages-payload-slimming`

## Success Criteria

- [x] Pages build succeeds under the 1 GiB hard cap.
- [x] `dist/pages-dist-manifest.json` reports `size_gate.status == "within_limit"`.
- [x] Public scenario policy remains five public baselines plus HGO 1936 developer/local preview.
- [x] Published Pages metadata and catalogs reference only shipped files.
- [x] Source data remains intact.
- [x] Verification commands pass or have explicit evidence-backed exceptions.

## Work Plan

- [x] Inspect manifest, copy policy, and runtime references for the largest Pages files.
- [x] Choose explicit Pages prune/allowlist rules for local-only or developer-preview payloads.
- [x] Add a compact Pages payload summary if it improves reviewability.
- [x] Patch build policy and affected metadata/tests.
- [x] Rebuild `dist/` and validate size gate.
- [x] Run targeted Node/Python/static verification.
- [x] Run independent code review and architect verification.
- [ ] Commit, push, merge into `main`, update registry, and clean the worktree after verification.

## Live Process Ownership

Main agent owns all build/test/dev-server/browser live processes. Subagents may inspect source files and completed outputs only.
