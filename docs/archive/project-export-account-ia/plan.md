# Project / Export / Account IA Fix Plan

## Goal

Make export and project management easier to find and separate account actions from project save actions.

## Acceptance

- Project management has its own clear section separate from Legend.
- Export workbench is surfaced as an Export task near utilities, with export as the default destination for file output.
- Project download exposes format/source/loading choices before action.
- Cloud Save no longer puts login/register as the primary inline project-save workflow; account actions move behind a compact user/avatar entry in the project area.
- Existing export/package and project import behavior stays intact.
- Source and `dist/app` stay synchronized.

## Work Plan

- [x] Map current Project/Legend/Export/Cloud Save DOM, styles, controller hooks, and tests.
- [x] Patch the smallest UI structure and labels that satisfy the new IA.
- [x] Extend existing targeted tests instead of adding a parallel test system.
- [x] Run targeted tests, i18n audit, and `verify:pages-dist`.
- [x] Do final review, fix findings, archive this task note, commit, merge, push, and clean the worktree.

## External Reference Input

- ArcGIS keeps export as an output task with selectable output formats and downloadable items.
- QGIS exposes export as image/PDF/SVG/output dialogs with path and export settings.
- Mapbox Studio exposes style export as a downloadable package that contains style JSON and related assets.

## Live Process Owner

Main Codex thread owns browser inspection, test runs, build runs, and any localhost process checks.
