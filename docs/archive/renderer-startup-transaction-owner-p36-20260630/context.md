# Context

P36 starts from P35 commit `12890fc6`, which added preflight-only guardrails for the startup transaction extraction.

The movable block in `js/core/map_renderer.js` starts immediately after:

```js
getRendererProjectionPathOwner().initializeProjectionPaths();
```

It ends after:

```js
runtimeState.syncDayNightClockTimerFn = syncDayNightClockTimer;
syncDayNightClockTimer();
```

The next line begins canvas pointer/touch style setup and remains in `initMap`.

The implementation should preserve `initMap` as the composition root. The new owner owns ordering only; `map_renderer.js` owns concrete effects and state writes.

Live process owner: main Codex agent only. Subagents may perform static review or mapping.

Final validation completed in the isolated worktree. The first dist-drift run failed because the generated dist mirrors were unstaged; staging the generated files made `npm run verify:dist-drift` pass. Browser smoke needed a live dev server URL, so the main agent started `tools/dev_server.py`, verified `http://127.0.0.1:8000/app/` returned 200, ran smoke against that base URL, then stopped the server.

Review closeout: code review found only stale registry state. Architecture review found the implementation boundary sound and marked WATCH for the legacy P33 bridge-order test naming/string-anchor drift. P36 keeps that as a documented maintenance risk and relies on the new P36 behavior plus architecture gates for startup reset order.
