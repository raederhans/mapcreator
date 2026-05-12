# Context

- 2026-05-12: Started read-only diagnosis for intermittent Codex App high load and stalls.
- Initial process list shows several `Codex` / `codex` processes with the highest cumulative CPU since App startup.
- `C:\Users\raede\.codex\logs_2.sqlite` is very large, and the active WAL file is also large. This is a strong candidate for App-side logging/state overhead.
- 8-second CPU sample: Codex App `app-server` used about 9.66 CPU seconds, roughly 120.7% of one CPU core. Main Codex and renderer/GPU processes also consumed visible CPU.
- `omx doctor` passed native hooks and MCP configuration, with warnings for Windows explore harness, context budget above recommendation, and legacy skill root.
- `logs_2.sqlite` is about 2833.7 MB; `logs_2.sqlite-wal` is about 719.4 MB. WAL did not grow during a 10-second sample.
- SQLite metadata: `page_count=725427`, `page_size=4096`, `freelist_count=191051`, `journal_mode=wal`; schema has one main `logs` table plus indexes.
- Codex App `app-server` has repeated child MCP server processes: 24 `code-intel-server`, 11 `memory-server`, 11 `trace-server`, 10 `wiki-server`, 8 `state-server`.
- There are 49 `context7-mcp` related process-chain entries across `cmd`, `npx`, and Node.
- `codex-tui.log` includes repeated `app-server event consumer lagged` warnings and repeated plugin loader warnings for `chrome@openai-bundled`.
- Manual invocation of `codex-native-hook.js` completed in about 184.86 ms, so the hook script alone is not the direct CPU spike in this sample.
- Follow-up OMX MCP check: `omx_state`, `omx_memory`, `omx_trace`, `omx_wiki`, and `omx_code_intel` all responded successfully from the current session.
- `omx doctor` again reported `MCP Servers: 7 servers configured; first-party OMX MCP compatibility is explicitly present` with 13 passed, 3 warnings, 0 failed.
- The current problem is MCP lifecycle/process pressure: Codex App `app-server` has 80 OMX MCP child Node processes, exactly 16 each for `code-intel`, `memory`, `state`, `trace`, and `wiki`.
- Those 80 OMX MCP child processes account for about 4.5 GB total working set in the process snapshot.
- `context7-mcp` related process-chain entries increased to 81.
- `.omx` state reports `ultrawork` still active in planning phase, with `last_turn_at=2026-05-12T15:48:34.723Z`. In this Codex App outside-tmux surface, that looks like stale runtime state unless a real OMX tmux run is still active elsewhere.
