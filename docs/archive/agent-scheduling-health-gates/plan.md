# Agent Scheduling Health Gates Plan

## Goal

Make the existing verification selector a stronger fixed task entry for agents:
- map changed files to the smallest useful checks;
- expose owner files, risk signals, and diagnostic next steps in machine-readable output;
- add explicit health gates for TNO water geometry and transport/data governance contracts;
- keep main-thread or heavy routes out of child-agent execution by default.

## Acceptance

- `tools/test_route_registry.mjs` validates optional route guidance metadata.
- TNO water geometry changes recommend the dedicated validator route and mark it as main-thread/heavy.
- Pytest-style heavy Python tests run through `python -m pytest ...`, while unittest-style tests keep using `python -m unittest ...`.
- `tools/select_verification_targets.mjs` emits `diagnosticNextSteps` and `advisoryNotes`.
- `tools/run_adaptive_tests.mjs` carries those advisory fields into its generated report.
- Structural tests cover the route metadata, selector output, and adaptive main-thread block.

## Live Process Ownership

Main thread owns all live verification in this task. Child agents are limited to static review and test-shape analysis.
