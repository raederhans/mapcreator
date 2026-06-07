# Landing Showcase Map Depth Plan

## Goal

Make the homepage showcase map read less like a hard Europe-only crop while keeping it local-only for this iteration.

## Acceptance

- The generated showcase SVG includes adjacent North Africa, Anatolia, and Near East territories as background color shapes.
- Background territories do not add city labels, country labels, rail, river, or urban detail.
- The showcase map surface has an internal soft edge so the embedded map rectangle feels less abrupt.
- The default showcase viewport starts slightly zoomed in and still supports moderate modified-wheel, keyboard, double-click, and drag interactions.
- Landing source and checked-in dist assets stay in sync.

## Tasks

- [x] Inspect current generator, CSS, JS, and tests.
- [x] Add background territory selection and SVG layer contract.
- [x] Add internal fog/soft-edge treatment.
- [x] Adjust default viewport zoom and update interaction tests.
- [x] Rebuild landing and pages dist assets.
- [x] Run targeted tests and diff review.

## Context

- User requested local development for the next landing iteration.
- Existing local dirty state includes `.omx/metrics.json`; product changes should avoid mixing that runtime file.
- Live process owner: main agent owns all tests/builds for this task. No child agent may run or poll live tests.

## Completion Evidence

- `python tools/build_landing_europe_1936_showcase.py` passed.
- `python tools/build_pages_dist.py` passed and refreshed `dist/pages-dist-manifest.json`.
- `node --test tests\landing_showcase_view_behavior.test.mjs` passed.
- `python -m unittest tests.test_pages_dist_startup_shell -q` passed with 33 tests.
- `landing/assets/europe-1936-showcase.svg` and `dist/assets/europe-1936-showcase.svg` contain `data-layer="context-land"`, `territory-context--egy`, `territory-context--syr`, and `map-edge-fog`.
