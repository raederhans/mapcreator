# Task

Fix TNO country inspector grouping so the fallback Other group is not used for known Chinese and Russian splinter tags.

Acceptance checks:

- `python -m unittest tests.test_tno_inspector_groups -q`
- Startup bundles regenerated for TNO 1962.
- `npm run verify:pages-dist`
- Browser smoke confirms XIK appears in China Region, Russian splinter tags appear in Russia Region, and Other is absent when no top-level unclassified entries remain.
