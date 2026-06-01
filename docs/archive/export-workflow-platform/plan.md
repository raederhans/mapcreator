# Export Workflow Platform Plan

## Goal

Turn the current browser export flow into a traceable artifact workflow that covers Export workbench downloads, Project JSON handoff, and scenario publish records.

## Acceptance

- Export workbench can produce a single ZIP artifact for per-layer PNG and bake-pack exports.
- Export artifacts include a manifest with kind, generated time, scenario/project context, settings, file list, dimensions, and checksums.
- Project export records enough handoff metadata to connect an editable JSON state with exported artifacts.
- Scenario publish records expose aligned artifact manifest fields without changing materialize/publish ownership.
- Targeted Node and Python tests pass.
- i18n audit and `verify:pages-dist` pass after source changes.

## Execution Stages

- [x] Stage 1: Add ZIP artifact helper and unit coverage.
- [x] Stage 2: Wire Export workbench per-layer and bake-pack exports to ZIP artifacts.
- [x] Stage 3: Add Project JSON and scenario publish artifact metadata.
- [x] Stage 4: Update UI copy/i18n and dist output.
- [x] Stage 5: Run final review and prepare git closeout.

## Constraints

- Main thread owns live tests, builds, browser smoke, and shared file edits.
- Shared files `index.html`, `css/style.css`, and `js/ui/toolbar.js` are integrated serially.
- Keep materialize and publish separate.
- Do not change README.
- Introduce one ZIP dependency only if it stays scoped to export packaging.
