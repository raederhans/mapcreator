# Codex App Load Diagnosis

## Goal

Check whether intermittent Codex App high load and UI stalls come from the App itself, local logs/state storage, hooks/MCP child processes, or project-side long-running processes.

## Plan

- [x] Read project operating notes and prior local Codex/OMX memory.
- [x] Sample live process CPU and memory from the main thread only.
- [x] Inspect Codex state/log database size and basic health.
- [x] Inspect static Codex config, hooks, and MCP surfaces.
- [x] Compare findings and identify the most likely load source.
- [x] Record final result and any remaining verification gap.

## Live Process Ownership

Main thread owns all live process sampling and any `omx doctor` run for this diagnosis.

Child agents are read-only and may inspect files or already-written outputs only. They must not run, poll, stop, or interpret live tests, dev servers, App processes, or long-running diagnostics.

## Result

Diagnosis points to Codex App-side pressure amplified by a very large log database, repeated MCP child processes, and repeated plugin warning/log activity.

Remediation is intentionally left out of this pass. Candidate next changes are: reduce context budget to the current OMX recommendation, trim enabled plugin/MCP surface, restart Codex App to clear duplicate child processes, then re-sample CPU and process counts.
