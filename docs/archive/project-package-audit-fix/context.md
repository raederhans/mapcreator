# Project Package Audit Fix Context

## 2026-06-02

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-project-package-audit-fix`
- Branch: `codex/project-package-audit-fix`
- Live process owner: main agent owns all test/build commands in this task.
- Static reviewer agent: `019e8903-6d15-7c73-830b-d4a548005dd0`, read-only review lane.
- Findings handled locally:
  - Primary `manifest.json` parse failures were previously hidden by fallback parsing.
  - Strict editable project packages could omit the selected project checksum.
  - Resource index could point at `project/map_project.json` even when that directory was disabled by custom content options.
  - ZIP import had no compressed size, entry count, or expanded size budget.
  - Core project package source/dist parity was verified manually but not locked by static contract.
- Verification completed:
  - `node --test tests/file_manager_project_roundtrip_behavior.test.mjs tests/project_support_diagnostics_controller_behavior.test.mjs tests/export_workbench_state_behavior.test.mjs`
  - `python -m unittest tests.test_project_support_diagnostics_sidebar_boundary_contract -q`
  - `npm run verify:pages-dist`
  - `git diff --check`
