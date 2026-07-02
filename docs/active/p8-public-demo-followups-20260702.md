# P8 Public Demo Follow-ups

Status: backlog, not started.

## Inputs

- P7 public demo release package: `9f8f4be2d50a315554f97c785fcf1c174ad1a76d`.
- Release tag: `v0.1-public-demo`.
- Public demo: https://raederhans.github.io/scenario-forge/
- GitHub pre-release: https://github.com/raederhans/scenario-forge/releases/tag/v0.1-public-demo
- Pages size baseline: `927.11 MiB`.

## Follow-ups

1. Add a propagation-aware release smoke guard for GitHub Pages deploys. The first P7 deploy smoke timed out during shell readiness, while URL probes, local remote smoke, and workflow rerun passed.
2. Keep the Pages payload under the 950 MiB warning target. Current headroom is about 22.89 MiB against the preferred warning target.
3. Plan the public backend/community path separately from the local backend preview. Cloud Saves, public posts, downloads, comments, reports, and admin moderation remain local-backend systems.
4. Keep HGO 1936 behind its developer/local preview gate until a dedicated public-readiness pass promotes it.
5. Collect demo feedback against the five public baselines before adding new public samples.
