# Ocean Refinement task ledger

- [x] Capture Phase 0 baseline audit.
- [x] Capture routing preview.
- [x] Inspect existing generator/validator/runtime/test contracts.
- [x] Patch Phase 1 validator target/report guardrails.
- [x] Patch Weddell/Scotia probe and seam guardrails.
- [x] Patch startup hydration water-only secondary index guardrail.
- [ ] Run transaction rebuild with `python tools/patch_tno_1962_bundle.py --changed-domain water --manual-sync-policy strict-block --checkpoint-dir .runtime/tmp/tno-water-checkpoints`.
- [ ] Run required validation gates as main-thread owner.
- [ ] Run final review/deslop/reverification and update lessons learned if a major new lesson remains.

## Current status 2026-05-12

- Completed: phase target schema/tests, startup hydration scope fix, LF byte-exact `.gitattributes`, strict contract drift diagnosis, D3 source orientation diagnosis, topology memory workaround attempt.
- Blocked: final generator idempotence after Cyprus/runtime topology manual clamp; strict snapshot/source drift remains.
- Remaining: repair generator-side ATL ownership/runtime topology consistency, rerun strict write-safe to idempotence, rerun E2E water/TNO, then perf gate.
