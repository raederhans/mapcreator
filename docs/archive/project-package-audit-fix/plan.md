# Project Package Audit Fix Plan

## Goal

Audit the editable project package changes and repair concrete correctness gaps in the ZIP package contract.

## Acceptance

- Project ZIP import rejects a malformed primary manifest.
- Strict project manifests must list the selected editable project file and its checksum.
- Resource index paths only reference files actually included in the package.
- Source and `dist/app` stay synchronized.
- Targeted Node tests, sidebar contract test, Pages dist verification, and diff whitespace check pass.

## Tasks

- [x] Inspect current project package code and tests.
- [x] Patch package manifest validation and resource index path selection.
- [x] Add regression tests for malformed manifests, missing checksums, and optional project directory paths.
- [x] Run targeted verification.
- [x] Integrate reviewer findings.
- [x] Archive this task folder after final verification.
