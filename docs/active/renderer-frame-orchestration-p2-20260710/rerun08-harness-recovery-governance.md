# P2.2b Williams Rerun08 Harness-Recovery Governance

Date: 2026-07-13

Status: approved single harness-recovery experiment

Protocol ID: `p2-williams-rerun08-harness-recovery-v1`

## Decision

Rerun07 remains immutable as terminal `harness fault / exit 1`. Its sole dry
plan completed, its Williams execute count stayed at zero, its quiet interval
never started, and its cleanup restored the original Balanced scheme.

The integration owner approves one new experiment because three independent
static reviews reached the same boundary:

- the failure occurred before Williams measurement;
- the returned temporary GUID was a valid Windows power-scheme identity;
- the extra `/list` set-difference assertion was the complete harness fault;
- all workload, policy, threshold, sample, order, role, candidate, control, and
  terminal-result contracts can remain frozen;
- repository governance requires an explicit new decision and does not reserve
  that decision to a separate human approver.

Rerun08 authorizes one dry plan, one execute, and zero retry. Every rerun08
result is terminal.

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
- power lifecycle helper Git blob: `ec311b844ff495b211e59404f51640e42e736862`
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
- no pooling with rerun01 through rerun07
- no threshold, estimator, order, workload, policy, or role adjustment
- compile the Job runner once before telemetry and require the resulting binary
  SHA256 across every block and manifest entry

## Corrected Windows power identity lifecycle

The rerun08 operator owns a generated destination GUID and uses this exact
sequence:

1. Record `powercfg /a` and the original `powercfg /getactivescheme` GUID.
2. Generate `<destination-guid>` before invoking Windows.
3. Run `powercfg /duplicatescheme SCHEME_MIN <destination-guid>`.
4. Require the returned GUID to equal `<destination-guid>`.
5. Run `powercfg /query <temporary-guid>` and require exit `0`.
6. Run `powercfg /setactive <temporary-guid>` and require exit `0`.
7. Run `powercfg /getactivescheme` and require the active GUID to equal the
   temporary GUID.
8. Require AC power, then start the fixed 120-second quiet interval.
9. Execute Williams exactly once.
10. In `finally`, restore the original scheme, verify the restored active GUID,
    delete the temporary scheme, and require `powercfg /query <temporary-guid>`
    to fail as deletion evidence.

`powercfg /list` is diagnostic-only. It supplies human-readable host context
and does not own temporary-scheme identity, existence, activation, or deletion
evidence.

This sequence follows the independent Windows operations documented by
Microsoft: `/duplicatescheme scheme_GUID [destination_GUID]`, `/query`,
`/setactive`, and `/getactivescheme`.

## Reproduced host capability

The current host reports S0 Low Power Idle (Modern Standby) and exposes only
Balanced through `/list`. A no-measurement lifecycle preflight nevertheless
completed the exact identity chain:

- duplicate returned the generated GUID;
- query succeeded;
- activation succeeded;
- active GUID matched;
- restore succeeded;
- delete succeeded;
- final active GUID returned to Balanced
  `381b4222-f694-41f0-9685-ff5bb260df2e`.

Evidence:

- report:
  `.runtime/reports/generated/p2-2b-williams-rerun08-power-preflight-v3.json`
- SHA256:
  `85b4c6d374fd9c0018529d7851bd75f3619e508e2244852e52838383cfb5082f`
- exit code: `0`
- lifecycle: `lifecycleSucceeded=true`
- cleanup: `cleanupValid=true`
- original GUID: `381b4222-f694-41f0-9685-ff5bb260df2e`
- temporary GUID: `48e07b9c-8653-460a-aee8-f997e862c009`
- deletion proof: post-delete query exit `1`, classified `scheme-absent`

The tracked helper executed the complete 11-event lifecycle, including the
final expected-failure query and the successful post-delete query of the
restored original scheme. The rerun08 operator must dot-source this helper.

## Fresh execution surfaces

- candidate worktree:
  `C:\Users\raede\.codex\worktrees\mapcreator-williams-rerun08-candidate-9479e9e6`
- control worktree:
  `C:\Users\raede\.codex\worktrees\mapcreator-williams-rerun08-control-bd98c580`
- evidence root:
  `.runtime/output/perf/p2-2b-williams-postchange-20260713-rerun08/`
- plan log:
  `.runtime/reports/generated/p2-2b-williams-rerun08-plan.log`
- execute log:
  `.runtime/reports/generated/p2-2b-williams-rerun08-execute.log`
- operator log:
  `.runtime/reports/generated/p2-2b-williams-rerun08-operator.stdout.log`
- operator finalization:
  `.runtime/output/perf/p2-2b-williams-postchange-20260713-rerun08/operator-finalization-rerun08.json`

All paths are fresh. Candidate and control worktrees must be detached, clean,
and exact at the frozen identities before the dry plan.

## Terminal mapping

- exit `0`, `accepted`: open P2 integration and closeout
- exit `2`, `valid-regression`: close the P2 acceptance gate with a valid
  regression result
- exit `3`, `invalid-experiment`: end P2 as
  implementation-complete / performance-unresolved
- exit `1`, harness fault: stop P2 acceptance as a harness failure

Every rerun08 result is terminal. Rerun08 receives no repetition.

## Scope boundary

This decision changes only the pre-measurement Windows power-scheme identity
verification. It leaves candidate/control code, product behavior, thresholds,
estimators, telemetry, sample count, workload, order, quiet duration, Job
Object isolation, cleanup admission, and terminal mapping unchanged.

Rerun07 evidence and governance remain immutable. This file is the sole
authorization for rerun08.
