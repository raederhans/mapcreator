# Transport workbench sidebar entry plan

## Goal

Move the transport workbench entry out of the top viewport utility controls and place it in the right project sidebar while preserving the existing transport overlay controller.

## Tasks

- [x] Confirm current DOM ownership and selector contracts.
- [x] Move the existing `scenarioTransportWorkbenchBtn` entry to the project sidebar in source and packaged HTML.
- [x] Keep the button wired through the existing id-based transport workbench controller.
- [x] Update source and packaged toolbar label handling for the sidebar entry label.
- [x] Update targeted structure and e2e selector contracts.
- [x] Run targeted static checks and unit contracts.
- [x] Archive this task record after verification.

## Verification

- `node --check js/ui/toolbar.js`
- `node --check dist/app/js/ui/toolbar.js`
- Targeted Python contract tests covering sidebar order and support controls.
- Static grep confirms active transport workbench clicks use `#projectSidebarPanel #scenarioTransportWorkbenchBtn`.
- `git diff --check`
