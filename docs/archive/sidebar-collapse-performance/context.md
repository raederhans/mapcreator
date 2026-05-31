# Sidebar Collapse Performance Context

2026-05-31: Started from user report: left/right sidebar collapse animation feels janky; sidebar disappears, then map updates after a pause. Main thread owns live dev server and browser measurement.

2026-05-31: Baseline evaluator reproduced long frame gaps during left/right collapse. Static mapping found two coupled causes: sidebar code dispatched immediate resize/render during the CSS transition, and map renderer treated resize as a full projection/spatial/render rebuild.

2026-05-31: Implemented lighter collapse path. Sidebar now emits explicit layout start/refresh events, map resize observer coalesces container changes, same-size resize exits early, sidebar layout refresh skips immediate spatial index rebuild, and continuity frame reuse can tolerate temporary canvas-size mismatch during non-idle phases.

2026-05-31: Validation passed. `node .runtime/tmp/sidebar-collapse-evaluator.mjs` passed with latest report at `.runtime/reports/generated/sidebar-collapse-performance/latest.json`; targeted Python contracts passed; `npm run verify:pages-dist` rebuilt and verified dist.

2026-05-31: Reviewer found a regression: toolbar responsive chrome still listened only to `resize`, so sidebar custom refresh would not update scenario context bar / dock / palette layout. Added toolbar listener for `mapcreator:sidebar-layout-refresh`, locked it in the mainline UI contract, and kept `sidebar-layout-refresh` in interacting phase so the renderer continues to use continuity frames during the collapse refresh.

2026-05-31: Final validation stayed green after reviewer fix. `node .runtime/tmp/sidebar-collapse-evaluator.mjs` passed with current max frame gap 1819.4ms versus baseline 1995.5ms; `python -m unittest tests.test_ui_rework_plan02_mainline_contract tests.test_frontend_render_boundary_contract -q` passed; `npm run verify:pages-dist` passed. OMX performance-goal completed.
