# Project Export Account Audit Plan

## Goal

Audit the current Project, Export, Legend, and Account workflow after the IA change, then fix concrete bugs found in code or UI behavior.

## Scope

- Project Management and Legend split in the sidebar.
- Export tab discoverability and default Project JSON/ZIP export path.
- Local project load path and cloud/account separation.
- Source and `dist/app` parity for changed UI files.
- Targeted tests and browser smoke only for the affected workflow.

## Steps

- [x] Inspect repository files and current implementation.
- [x] Run independent static review lanes for UI workflow and code risks.
- [x] Check current localhost page behavior with a lightweight browser smoke.
- [x] Fix confirmed bugs with the smallest code changes.
- [x] Run targeted JS/Python tests and `verify:pages-dist` when source or dist changes.
- [x] Archive this task folder, commit, push, and clean the worktree.

## Live Process Ownership

- Main agent owns all browser smoke, build, and test processes.
- Child agents may inspect files and report static findings only.
