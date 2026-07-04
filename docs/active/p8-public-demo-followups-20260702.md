# P8 Public Demo Follow-ups

Status: P8A release smoke guard ready for integration.

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

## P8A Release Smoke Guard Policy

- Preflight probes the landing root, `assets/sample-runs.json`, and `app/` shell entry before the full smoke attempt.
- The gate retries exactly once after 30 seconds for first-attempt landing preflight fetch/status failures, shell readiness timeout, or scenario apply idle timeout.
- HGO exposure, wrong public sample count or ids, missing export context, and unexpected console/network failures remain final.
- Each failed attempt writes release smoke context with base/current URL, probe results, attempt/retry metadata, console/network records, shell/runtime snapshot, sampleProjectDeeplink state, and scenario status selectors.
- Local generated `/dist/` release gate passed against `http://127.0.0.1:8892/dist/` after `npm run verify:pages-dist`; the first attempt passed and no retry was needed.
