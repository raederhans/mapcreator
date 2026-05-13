# TNO Atlantropa Browser Debug Context

## 2026-05-07

- User reports the architecture migration did not fix the visible Mediterranean color mismatch or some non-interactive tiles.
- Static contract state before browser debug:
  - `scenario_atlantropa` has 927 features.
  - `political` has 0 ATL features.
  - `max_required_political_chunks` is 6.
- Current dev server metadata points to `http://127.0.0.1:8000/app/`.
- Debug approach: parent owns dev server/browser/tests; child agents only read code for color and hit-path hypotheses.
- Browser reproduction before the fix showed the split clearly:
  - `scenarioAtlantropaFeatureCount=927`.
  - `landDataFullAtlCount=840`, but `landAtlSpatialItemCount=0`.
  - Sample ATL land-like features had D3 world bounds such as `[-180,-90]..[180,90]`, so the renderer treated local polygons as global shells and skipped/indexed them incorrectly.
- Root cause:
  - `scenario_atlantropa` had moved out of political correctly, but its direct GeoJSON chunk/topology output did not receive the D3 small-polygon ring normalization previously applied only to ATLSEA donor seas.
- Fix applied:
  - `tools/scenario_chunk_assets.py` now normalizes all ATL features before direct chunk serialization.
  - `tools/patch_tno_1962_bundle.py` now rewrites `scenario_atlantropa` via the D3-safe TopoJSON path when building runtime topology.
  - TNO 1962 scenario_atlantropa topology/chunks/runtime metadata were regenerated and hashes resynced through the strict checker write-safe path.
- Browser verification after the fix:
  - `missingPrefixes=[]`, `unmatchedPrefixes=[]`.
  - `targetCount=12`, `mismatchedClickCount=0`.
  - `scenarioAtlantropaFeatureCount=927`.
  - `landAtlSpatialItemCount=840`, `waterAtlSpatialItemCount=87`, `colorCacheAtlCount=840`.
  - Prefix buckets: `ATLPRV=86`, `ATLISL=64`, `ATLSEA=87`, `ATLSEA_FILL=376`, `ATLWLD=226`, `ATLSHL=88`.
  - Screenshot: `.runtime/browser/mcp-artifacts/tno-atlantropa-browser-probe.png`.
- Targeted dense probe confirms the previously marginal `ATLSHL_west_med_14` sample is selectable.
