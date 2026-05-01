# land-data architecture repair plan

## Batch 1 acceptance
- data manifest hash/size drift is fixed and guarded by a targeted check.
- hoi4_1939 startup shell source identity is coherent: startup_topology_url points to the light startup shell, while full runtime_bootstrap_topology_url remains available.
- Pages dist has no scenario index/manifest audit_url fields pointing to excluded audit.json.
- Targeted Python tests pass.

## Batch 1 steps
- [ ] Inspect existing generation and tests.
- [ ] Patch source/build contracts.
- [ ] Update checked-in generated metadata only where evidence proves drift.
- [ ] Run targeted tests and strict contract where relevant.
- [ ] Review for simpler safer path.
