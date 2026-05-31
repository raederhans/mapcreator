# Sidebar Collapse Performance

## Goal
Improve left/right sidebar collapse smoothness without removing existing functionality.

## Evaluator Contract
PASS when the local evaluator can toggle both sidebars repeatedly on the running dev server and records:
- no failed page response for `/app/`;
- a lower or acceptable post-patch sidebar collapse response time compared with baseline;
- no obvious console crash during the measurement loop.

## Live Process Ownership
Main thread owns the running dev server at `http://127.0.0.1:8000/` and any browser/performance measurement runs for this task.
Subagents may do static analysis and review only.

## Task List
- [x] Capture baseline with a scriptable evaluator.
- [x] Locate collapse/render trigger path.
- [x] Apply the smallest performance patch.
- [x] Run evaluator and targeted regression tests.
- [x] Review for simpler/stabler implementation.
