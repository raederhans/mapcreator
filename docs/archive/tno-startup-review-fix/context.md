# TNO Startup Review Fix Context

## 2026-05-27

- Main checkout has unrelated user WIP; review/fix work is isolated in `C:\Users\raede\Desktop\dev\mapcreator-tno-startup-review-fix`.
- Review target is commit `7bf1181 Make startup ready wait for real scenario chunk paint`.
- Live process owner: main agent owns the local dev server on port `8821` for startup timing probes. Review lanes remain static/read-only.
- Startup probe found `initialScenarioChunkVisualPromotion` took about `3077ms`, loaded four chunks, and promoted `11935` political features before first visible TNO acceptance. The first gate was loading non-political visible chunks too, including water/Atlantropa/relief.
- Fix direction: keep startup visual gate before first visible, but make its initial visual selection political-only. Non-political chunks should stay out of the boot-critical path and load through later normal refreshes.
