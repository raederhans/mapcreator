# TNO zoom / Atlantropa / Mediterranean repair plan

## Goal
Fix the TNO 1962 runtime regressions where zoomed political colors disappear, Mediterranean Atlantropa land/islands lose interaction, and Mediterranean ATLSEA appears as pale unselectable ocean.

## Execution steps
- Keep live browser and long tests on the main thread only.
- Fix zoom-end retained-active TTL across scenario-apply and exact-after-settle.
- Raise TNO political detail chunk budget enough for Mediterranean/Europe zoom viewports.
- Sample viewport bounds as a small grid and inflate the result so curved-projection edge countries stay chunk-eligible during pan/zoom.
- Give ATLSEA one clear runtime path through scenario water render/hit while ATLISL remains political land.
- Add targeted contracts before final verification.

## Acceptance
- Node chunk contracts cover TNO Mediterranean ATL companion selection, curved-projection viewport edge bounds, and TTL retention.
- TNO ATLSEA features are present in water indexes when their political detail chunk is active.
- Atlantropa water click hits water while Cyprus/Balearics/Crete/Sicily remain land hits.
- Targeted Node, strict scenario contract, and targeted e2e gates pass on the main thread.

## 2026-05-06 comprehensive follow-up
- Re-audit Mediterranean ATLSEA/ATLISL/HGO donor data, including donor role tags, owner/palette routing, and checked-in generated artifacts.
- Re-audit projection and ocean adaptation so local donor seas stay local, water stays interactive, and nearby political land keeps land precedence.
- Re-audit zoom-end behavior for long stalls, black frames, and disappearing political colors after detail chunk promotion.
- Main thread owns live browser and test execution; child agents stay read-only and static.
