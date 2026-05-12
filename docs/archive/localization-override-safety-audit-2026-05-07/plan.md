# Localization Override Safety Audit Plan

## Scope
- Read-only audit of `js/core/scenario_localization_state.js`
- Trace related local state / scenario locale data flow
- Confirm explicit scenario geo locale patch still wins last
- Identify any current override-order risk
- Provide minimal verification commands only

## Steps
- [x] Read prior localization override memory notes
- [x] Inspect live merge implementation and call sites
- [x] Inspect startup/full-localization refresh paths
- [x] Inspect language-switch, chunk, editor, and rollback side paths
- [x] Inspect existing targeted tests / boundary contracts
- [x] Summarize merge order, risks, and minimal verification commands
