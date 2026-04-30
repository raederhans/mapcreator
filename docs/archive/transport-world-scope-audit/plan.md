# Transport world scope audit plan

## Intent
Audit and fix the transport panel mismatch where road/rail use world data while airport/port remained Japan-scoped.

## Acceptance criteria
- Root cause is traced through UI -> loader -> deploy assets.
- Airport and port runtime defaults point at world-scope data.
- A targeted automated contract proves airport and port are no longer locked to Japan-only packs.
- Pages dist includes the global airport/port packs and excludes the old Japan full packs.
- Existing unrelated working-tree edits are preserved.

## Steps
- [x] Map current transport data flow and current assets.
- [x] Add failing contract for airport/port world scope.
- [x] Apply the smallest source-of-truth fix.
- [x] Generate checked-in global airport/port point packs.
- [x] Run targeted checks and review pass.
- [x] Archive active docs after verified completion.

