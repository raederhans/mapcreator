# P2.2b Williams Rerun07 Final Repetition Governance

Date: 2026-07-12

Status: approved final capped repetition

Protocol ID: `p2-williams-rerun07-final-repeat-v1`

## Purpose

Rerun06 completed all eight frozen Williams blocks, all 32 measured raw files,
all 115 manifest entries, and valid cleanup, then returned terminal
`invalid-experiment / exit 3`. The invalid reasons describe host-frequency
instability, one internal TNO startup outlier, and one same-side startup drift
failure. Rerun06 remains immutable and supplies no acceptance, regression,
equivalence, improvement, or slowdown verdict.

This supplement authorizes exactly one final repetition under a symmetric,
fixed Windows power regime. It preserves every workload, role, estimator,
threshold, block, order, sample, telemetry, identity, and exit-code contract.

## Frozen identities

- candidate HEAD: `9479e9e6ff8d4b2fa8ba969fdc7b7e2f341d2d40`
- control HEAD: `bd98c5800ac5cca2a93d7f55ac1b0a254ca5028f`
- package-lock Git blob: `df70020f2f930d5692a1ff9febebf86dbb0e0db1`
- baseline-runner Git blob: `70453d9b1b17b9013929a11e9a8e05044dc7682d`
- role-policy Git blob: `7d11e76bb87e0f62fc4270288d617640e59dc267`
- Williams analyzer Git blob: `69ef6844f388754f9e39d68b9c87bc714cea45c6`
- Williams policy Git blob: `9f222e70d66b30b3766a37a9da23590954baff81`
- Windows runtime Git blob: `a9e1861376631b0331df270c959f589efadc4c2e`
- Job runner source Git blob: `16e388fa3992f98518a27d529c54ab1cb8b0ce81`
- policy ID: `p2-williams-crossover-v4`
- render-sample role policy: `render-sample-role-v2`
- canonical role: `last-post-promotion-idle-scenario-frame-v1`

## Frozen experiment shape

- blocks: `A/TH, B/TH, B/HT, A/HT, B/TH, A/TH, A/HT, B/HT`
- one warmup per scenario and block
- two measured runs per scenario and block
- exact measured raw count: 32
- exact manifest entry count: 115
- adjacent `B-A` pairs: `01/02, 04/03, 06/05, 07/08`
- same-side/order drift pairs: `A-TH-1-6, A-HT-4-7, B-TH-2-5, B-HT-3-8`
- all existing startup, canonical-render, outlier, telemetry, drift, direction,
  cleanup, identity, and manifest thresholds remain frozen
- one dry plan, one execute, and zero retry
- no continuation from a partial block
- no block or sample exclusion
- no pooling with rerun01 through rerun06
- no threshold, estimator, order, workload, policy, or role adjustment
- compile the Job runner once before telemetry; record the newly compiled binary
  SHA256 and require that exact binary across all eight blocks and all manifest
  evidence for rerun07

## Fresh execution surfaces

- fresh detached clean candidate worktree at the frozen candidate HEAD
- fresh detached clean control worktree at the frozen control HEAD
- evidence root:
  `.runtime/output/perf/p2-2b-williams-postchange-20260712-rerun07/`
- plan log:
  `.runtime/reports/generated/p2-2b-williams-rerun07-plan.log`
- execute log:
  `.runtime/reports/generated/p2-2b-williams-rerun07-execute.log`

## Windows power stabilization

1. Record the original active power-scheme GUID.
2. Duplicate the standard High performance scheme identified by `SCHEME_MIN`.
3. Record and activate the temporary scheme GUID returned by Windows.
4. Query the active scheme, require AC power, and use the same temporary GUID
   across every candidate and control telemetry window.
5. Apply one fixed 120-second host quiet interval after activation and before
   the sole execute command.
6. Keep the quiet interval fixed. Dynamic extension and workload-based
   pre-screening stay outside the protocol.
7. Record command text, UTC timestamps, exit codes, output paths, and SHA256 for
   scheme creation, activation, query, restore, and deletion.
8. Record an operator preregistration containing original GUID, temporary GUID,
   AC status, frozen heads, evidence paths, and quiet-window start/end.
9. In a `finally` cleanup path, restore the original active scheme and delete
   the temporary scheme.
10. Verify the restored active GUID and verify the temporary GUID is absent from
    the final power-scheme list.

External-validity label:
`Windows AC power with a temporary standard High performance scheme`.

## Terminal mapping

- exit `0`, `accepted`: open P2 integration and closeout
- exit `2`, `valid-regression`: close the P2 acceptance gate with a valid
  regression result
- exit `3`, `invalid-experiment`: end P2 as
  implementation-complete / performance-unresolved
- exit `1`, harness fault: stop P2 acceptance as a harness failure

Every result is terminal. Rerun07 receives no repetition.

## Rerun06 immutable evidence

- result: `invalid-experiment / exit 3`
- execution: one dry plan, one execute, zero retry
- blocks/raw/manifest: `8/8`, `32/32`, `115/115`
- evidence root:
  `.runtime/output/perf/p2-2b-williams-postchange-20260712-rerun06/`
- invalid reasons:
  - `telemetry.pair-03-04.pre-frequency-difference`: `15.625% > 5%`
  - `telemetry.pair-07-08.pre-frequency-difference`: `9.271523% > 5%`
  - `telemetry.global.pre-frequency-drift`: `35.036496% > 10%`
  - `outlier.block-02.tno_1962.startup`: ratio `1.260172 > 1.25`,
    spread `1692ms > 250ms`
  - `drift.B-TH-2-5.tno_1962.startup`: `12.234332% > 5%`
- analysis JSON SHA256:
  `d4460c9155fee1d659b91eda1c56faff8c3903ed22b42056b2891c8200aeb16f`
- analysis Markdown SHA256:
  `56bfec960c8abea2054e6e2a14d94a003edf6cd225cf7727d0df8b3d57b8f95b`
- preregistration SHA256:
  `18ca132ea80ab4f0490207c97e3bd0f376b4b5ce24cb59ec68e80cfef3516011`
- manifest SHA256:
  `366afef88be900e8b34aca3b0699404f13c80eb74a4de18f12b87738eb0f322b`
- executed Job runner binary SHA256:
  `c35ca8c47c0ca67362d3a0ff3ac44bb98970f718511864e72a1986caa3f6df58`
- dry-plan log SHA256:
  `483ad2c1f68700b1ded8085f00ff09b6f881fe75333433588042a2942a9dd435`
- execute log SHA256:
  `818667acac0b80f4859b257908cd6743deb3e837ac36424cd2efb40f15da6e30`

## Relationship to the immutable P2 plan

The original plan remains unchanged. The v4/role-v2 identity supersedes v1
after a reproduced valid three-sample lifecycle exposed a fail-closed role
contract mismatch. The later independent architecture decision admitted a
reversible isolated P2.2b implementation. Main integration and P2 closeout
remain governed by the final terminal mapping above.

The Job runner assembly is rebuilt by `Add-Type -OutputAssembly`, so its binary
SHA256 is an experiment-local identity. Rerun07 freezes the source blob and the
compile-before-telemetry procedure, then requires one newly compiled binary
identity throughout the complete experiment. The rerun06 binary hash above is
historical evidence and is not a cross-run equality requirement.
