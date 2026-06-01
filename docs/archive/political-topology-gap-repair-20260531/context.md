# Political topology gap repair context

## 2026-05-31 intake
- User asked to verify and execute the attached bug diagnosis with `code-review`, `ultrawork`, and `ralph`.
- Current checkout was `main` ahead 1 and behind `origin/main` by 4 commits, with a pre-existing `.omx/metrics.json` change.
- Work is isolated in `C:\Users\raede\Desktop\dev\mapcreator-political-holes-fix` on branch `codex/fix-political-holes`.
- Main thread owns live builds/tests. Subagents are read-only until final review.
- Ralph CLI state activation hit stale `ultrawork` and `autoresearch` workflow states; this task uses file-backed Ralph context plus fresh verification.

## Findings
- `tools/build_runtime_political_topology.py::_compose_political_features` currently skips all primary features whose country code appears in detail features. This can drop FR overseas components when FR detail exists.
- `map_builder/processors/africa_admin1.py::_clip_features_to_shell` augments shell only for fully disjoint source features. Partly overlapping geoBoundaries features can still be clipped at incomplete shell edges.

## 2026-05-31 execution
- Added `tests/test_political_topology_gap_contract.py` and registered it in `tests/heavy_dependency_groups.json`.
- Fixed runtime composition by retaining only FR primary components left uncovered by FR detail, then recoding known French overseas components to GF/GP/MQ/RE/YT.
- Fixed geoBoundaries Africa overrides by using the source ADM1 union as the clip shell, so partially overlapping features are no longer cut by incomplete country shells.
- Full `tools/build_na_detail_topology.py` was blocked by pre-existing invalid urban metadata in checked-in topology inputs. Used a targeted political-layer rebuild with existing topology helpers and left other layers unchanged.
- Rebuilt `data/europe_topology.na_v2.json`, `data/europe_topology.runtime_political_v1.json`, TNO write-safe derived artifacts, and `dist/pages-dist-manifest.json`.
- Runtime data check passed: GF/GP/MQ/RE/YT each exist in runtime; Sanaag west bound is 46.0103 and Sool west bound is 46.0499 in detail.

## Verification
- `python -m unittest discover -s tests -p test_political_topology_gap_contract.py -q` passed.
- `python -m compileall -q tools/build_runtime_political_topology.py map_builder/processors/africa_admin1.py tests/test_political_topology_gap_contract.py` passed.
- `node tools/select_verification_targets.mjs --check` passed.
- `python -m unittest discover -s tests -p test_local_canonicalization.py -q` passed.
- `python -m unittest discover -s tests -p test_scenario_chunk_assets.py -q` passed.
- `npm run verify:scenario-contracts:strict` passed after `--write-safe`.
- `npm run verify:pages-dist` passed after final `na_v2` formatting.
- `git diff --check` passed.

## 2026-05-31 review follow-up
- Code review found that multiple French overseas polygons sharing the same code, especially Guadeloupe, could be assigned one fixed id and then be dropped by `seen_ids`.
- Fixed by grouping matched French overseas components by `(code, id, name)` and emitting one Polygon/MultiPolygon feature per overseas code.
- Extended the contract test with two Guadeloupe components and verified `GP_PRIMARY` remains a MultiPolygon.
- Rebuilt runtime political topology after the fix, then reran TNO `--write-safe`, strict scenario contract, pages-dist, data checks, local canonicalization tests, scenario chunk tests, route schema, compileall, and diff check.
