# context

Review follow-up verified both comments as valid.

Fixes:
- Blank apply commit now stores the explicit blank runtime topology instead of falling back to default political topology.
- Startup hydration blank test now asserts the stored runtimePoliticalTopology object.
- Startup bundle generation writes the same manifest source sha subset back to manifest.json.
- Startup bundle tests assert regenerated manifest.source and bundle manifest_subset.source match.
