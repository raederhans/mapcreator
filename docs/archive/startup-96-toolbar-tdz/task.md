# Startup 96 Toolbar TDZ Task

## Task

Repair the startup 96% stall caused by early toolbar hook registration.

## Acceptance

- `toolbar.js` cannot register refresh callbacks that call `refreshWorkspaceStatus()` before `renderOceanCoastalAccentUi` is available.
- A targeted test protects the registration order.
- Runtime smoke reaches the map ready state without the reported `renderOceanCoastalAccentUi` ReferenceError.
