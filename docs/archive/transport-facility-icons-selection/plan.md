# Transport Facility Icons Selection Plan

## Goal

Improve Appearance > Transport airport and port point layers with category-specific pixel icons, stable screen-space sizing, and precise hover/click selection.

## Checklist

- [x] Work in isolated branch/worktree.
- [x] Generate a visually consistent simplified airport/port icon atlas.
- [x] Add a small icon owner for category mapping, atlas cells, and screen-size rules.
- [x] Replace airport/port rectangle/diamond drawing with atlas icon drawing.
- [x] Store hover entries with screen-space points and bounded hit radius.
- [x] Extend contracts for icon atlas, category mapping, screenPoint calculation, and old shape removal.
- [x] Run targeted Python/Node verification.
- [x] Run final static review and archive docs after completion.
