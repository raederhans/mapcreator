# Data Quality Repair Task Checklist

## G001 High Restore

- [x] Reproduce current High failures in the isolated worktree.
- [x] Restore TNO strict scenario contract.
- [x] Restore HOI4 1936 strict scenario contract.
- [x] Restore HOI4 1939 strict scenario contract.
- [x] Refresh `data/manifest.json` output metadata for drifted outputs when needed.
- [x] Add verification selector route coverage for locale, alias, and HGO name catalog changes.
- [x] Run High verification gates.
- [x] Document ultragoal checkpoint objective mismatch.

## G002 Medium Semantic Repair

- [x] Fix TNO capital/city orphan tags.
- [x] Fix TNO core tag references.
- [x] Fix TNO Ross Sea raw coordinate drift.
- [x] Align global airport filter fields.
- [x] Align global port filter fields.
- [x] Add runtime asset registry coverage for `locales` and `geo_aliases`.
- [x] Fill missing i18n keys and wiring.
- [x] Align locale baseline.
- [x] Run Medium verification gates.
- [x] Document ultragoal checkpoint objective mismatch.

## G003 Low Governance Visibility

- [x] Add governance columns to `CATALOG.md`.
- [x] Surface empty `hashRef` coverage as warning-level visibility.
- [x] Reduce i18n audit false positives for source labels and data literals.
- [x] Run final verification.
- [x] Run UltraQA and independent review.
- [x] Document ultragoal checkpoint objective mismatch.
- [x] Commit and push prepared.
