# TNO Open Ocean Regression Context

## 2026-05-12

- User screenshot shows large light-blue open-ocean macro polygons visible by default and offset from the expected ocean background.
- Static checks show all 20 `water_type=ocean` / `region_group=ocean_macro` features are `interactive=false` and `render_as_base_geography=false`.
- Current `isWaterRegionRenderable()` returns true for open-ocean regions, while `isWaterRegionEnabled()` still requires the Open Ocean toggle path. That creates visible but non-interactive open-ocean overlays.
- Browser plugin connection to `http://127.0.0.1:8000` was blocked by local browser security policy. Use project Playwright E2E for visual evidence.
- Implemented `isOpenOceanOverlayActive()` as the shared open-ocean render/hit gate. Open-ocean macro regions are hidden and non-interactive by default, then become visible and clickable when select or paint mode is active.
- Strengthened the open-ocean E2E to assert default click misses, active click hits `water`, and click misses again after disabling Open Ocean.
- `tno_open_ocean_rendering` had an independent stale Atlantropa chunk request: the current manifest exposes `scenario_atlantropa.detail.r1c2` at `min_zoom=1.7`, so the test focus now uses 180% zoom and waits for that registered chunk id.
- Verification completed: node scenario chunk contracts, TNO water geometry validator, strict scenario contract, targeted open-ocean E2E, targeted Atlantropa E2E, and full `npm run test:e2e:water-rendering`.
