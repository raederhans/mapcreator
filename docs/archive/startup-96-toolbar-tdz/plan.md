# Startup 96 Toolbar TDZ Plan

## Goal

Fix the startup stall where the app stops at 96% preparing the first frame because a toolbar refresh hook reads an ocean/lake controller facade before it is initialized.

## Steps

- [x] Trace the console stack to the exact toolbar/state-bus call path.
- [x] Move hook registration so workspace refresh callbacks are registered after their controller dependencies exist.
- [x] Add a focused boundary test that locks the registration order.
- [x] Run syntax, targeted contract, and startup smoke verification.
- [x] Review the patch for simpler failure modes, then archive this task folder.
