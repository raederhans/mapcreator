# TNO Atlantropa Island/Hole Tail Debug Task

## Checklist

- [x] Skills loaded: systematic-debugging, research-before-fix.
- [x] Lessons reviewed for Atlantropa D3 orientation and browser hit probing.
- [x] Read-only subagents deployed.
- [x] Browser/runtime reproduction captured.
- [x] Island root cause confirmed: large ATLISL interior rings rendered as sea holes.
- [x] Greek southwest sea root cause corrected: `ATLSEA_FILL_*` is sea completion and must route as water, while `(20.6, 35.0)` also needed a missing water strip.
- [x] Island fix implemented in the generator and current 1962 generated assets.
- [x] Cyprus west-side geometry repaired against runtime baseline `CY000`.
- [x] `ATLSEA_FILL_*` rerouted to `water/atlantropa_sea` in source rules, current topology, chunks, and strict contracts.
- [x] Final review blocker fixed: `extract_scenario_atlantropa.py` now writes the full Atlantropa style-default manifest contract.
- [x] Verification captured.
