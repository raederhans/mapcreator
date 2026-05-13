# Task

- [x] Confirm instantaneous CPU load instead of relying only on cumulative CPU.
- [x] Map high-load processes to command lines and parents.
- [x] Check sqlite file size, WAL growth, and metadata.
- [x] Check hooks/config for obvious repeated heavy work.
- [x] Run a bounded OMX doctor check.
- [x] Produce a concise Chinese verdict with next action.

## Remaining Work

- Apply config trimming only after the user asks for remediation.
- Restart Codex App and re-sample process counts to verify whether duplicate MCP children are session residue.
- Clear stale `.omx` runtime state only after confirming no real OMX CLI/tmux process still owns that workflow.
