# Generated Artifact Slimming Evaluation

## Current Large Files

Measured on `origin/main` after the ocean-refinement merge:

| File | Raw MiB | gzip MiB | gzip ratio |
| --- | ---: | ---: | ---: |
| `data/scenarios/tno_1962/derived/marine_regions_named_waters.snapshot.geojson` | 85.91 | 21.61 | 25.15% |
| `data/scenarios/tno_1962/runtime_topology.topo.json` | 61.34 | 16.24 | 26.48% |
| `data/scenarios/tno_1962/water_regions.geojson` | 17.78 | 5.58 | 31.41% |
| `data/scenarios/tno_1962/chunks/water.detail.r1c2.json` | 29.03 | 2.75 | 9.46% |
| `data/scenarios/tno_1962/chunks/water.detail.r1c1.json` | 21.64 | 2.39 | 11.05% |

Only the first two files cross GitHub's 50 MiB warning threshold today.

## Official / Upstream Constraints Adopted

- GitHub warns at 50 MiB, blocks files larger than 100 MiB, and recommends keeping programmatically generated files outside normal Git storage: <https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github>
- GitHub recommends Git LFS for large binary files and object storage for generated files: <https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits>
- Git LFS uses pointer files and plan-based storage/bandwidth quotas, and GitHub Pages does not support Git LFS delivery: <https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage>
- HTTP `Content-Encoding: gzip` preserves the original media type while transferring compressed bytes: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding>

## Existing Project Support

- `tools/dev_server.py` already serves `.json`, `.geojson`, `.topo.json`, and matching gzip sidecars with `Content-Encoding: gzip` when the client accepts gzip.
- `js/core/data_loader.js` uses `fetch(...).text()` followed by `JSON.parse`; browser fetch receives transparently decoded text when the server uses `Content-Encoding`.
- `tools/build_startup_bundle.py` already writes deterministic `.json.gz` sidecars for startup bundles.
- `tools/build_pages_dist.py` currently refreshes gzip sidecars only for startup bundles.
- `js/workers/startup_boot.worker.js` has a startup-specific optional `.json.gz` fetch path using `DecompressionStream`.

## Recommended Path

### Phase 1: Size Gates And Existing Transparent Compression

- Add a generated-artifact size audit command that reports files above 25 MiB, warns above 50 MiB, and fails above 100 MiB.
- Keep `.json/.geojson/.topo.json` filenames in manifests so browser and server `Content-Encoding` behavior stays simple.
- Verify local dev server and Pages output serve JSON-family artifacts with `Content-Encoding: gzip` where hosting supports it.
- Keep checked-in gzip sidecars scoped to the existing startup bundle contract until a broader artifact contract is designed.

### Phase 2: Artifact Contract For Large Runtime Outputs

- Design one artifact-contract change that updates generation, publish whitelist, dist copy, runtime loader assumptions, and tests together.
- Evaluate deterministic gzip sidecars for selected large runtime outputs inside that contract, starting with `runtime_topology.topo.json`.
- Treat checked-in gzip sidecars as a delivery contract decision, not a repo-size shortcut.
- Prefer payload-level simplification or chunking inside the generator when it preserves geometry contracts.

### Phase 3: Derived Snapshot Policy

- Treat `derived/marine_regions_named_waters.snapshot.geojson` as a regenerated cache.
- Keep source recipes, source queries, provenance, and builder code in Git.
- Move the large derived snapshot to one of these controlled stores:
  - release artifact for versioned build outputs,
  - object storage/CDN for active scenario delivery,
  - local build cache under `.runtime/` for development rebuilds.
- Keep a small manifest entry in Git with checksum, generation command, source URLs, and expected feature count.

### Phase 4: Loader Protocol Only If Needed

- Add a shared optional `.json.gz` loader only if static hosting cannot provide transparent HTTP gzip.
- Reuse the startup worker's `DecompressionStream` pattern through a shared loader.
- Update manifest schema with explicit compressed sidecar metadata only after the loader contract exists.

## Decisions

- Adopt transparent server compression and a size audit gate as the first low-coupling move.
- Adopt an artifact-size audit gate before adding more geometry detail.
- Reserve Git LFS for large files that must be versioned as large files in Git history.
- Prefer release/object storage for regenerated scenario outputs that change often.
- Keep startup bundle gzip sidecars because runtime, dist, and tests already define them as a first-class contract.

## Stable Boundary Rule

- Source inputs: hand-authored rules, source recipes, source queries, provenance policy, builder code, and small reviewed metadata stay in Git.
- Regenerated caches: large snapshots that can be rebuilt from source inputs should move toward release artifacts, object storage, or `.runtime/` development cache with a small Git manifest entry.
- Delivery artifacts: files directly loaded by runtime, Pages dist, or startup workers stay in Git only when their loader, publish whitelist, checksum, and tests define them as a first-class contract.
- New generated files above 25 MiB must be classified into one of these groups before they are committed.

## Open Risks

- The current checked-in history already contains large blobs; a future history rewrite needs a separate migration plan.
- GitHub Pages delivery path must be confirmed before relying on any non-repo artifact store.
- Removing the derived snapshot from Git requires a rebuild path that works without private local data.
