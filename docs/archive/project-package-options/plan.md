# Project package options plan

## Goal

Build a project package workflow that keeps editable project loading separate from export artifacts, while sharing low-level ZIP and manifest utilities.

## Acceptance

- Project JSON download stays editable and unchanged in purpose.
- Project ZIP can include optional package directories and still loads from the editable project JSON.
- Loading a ZIP shows package preview information before import when dialog support exists.
- Export artifact packages keep their own export workbench flow.
- Targeted node tests pass for project package build/load and sidebar behavior.

## Steps

- [x] Inspect current project/export package boundaries.
- [x] Add project package IO module.
- [x] Wire FileManager export/import helpers to project package IO.
- [x] Add project UI package options and import preview.
- [x] Extend targeted tests.
- [x] Run review/check tests and fix findings.

## Live process owner

Main agent owns all test/build commands for this task. Subagents may do static analysis only.
