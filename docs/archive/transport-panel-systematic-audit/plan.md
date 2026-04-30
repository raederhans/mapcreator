# Transport panel systematic audit plan

## Intent
Audit the transport panel and transport workbench stack for rooted bugs, logic errors, redundant code defects, and security issues, then fix confirmed defects with the smallest safe changes.

## Scope
- Runtime transport overview: loader, renderer, toolbar/appearance toggles, state save/load.
- Transport workbench: family registry, preview dispatch, point/line/polygon preview controllers, inspector and UI state.
- Data/build/deploy contracts: manifests, builders, Pages allowlist, transport contract tests.
- Security surface: user-controlled imports, URL/path construction, DOM injection, dependency and secret exposure relevant to transport code.

## Acceptance criteria
- Root-cause evidence exists before every code fix.
- Road, rail, airport, and port runtime paths keep their current intended data scope.
- Workbench preview controls keep manifest-driven loading and do not silently fall back to wrong data.
- Confirmed bugs have targeted tests or an existing contract extended.
- Relevant syntax checks, manifest checks, and targeted unit tests pass.
- Unrelated pre-existing working-tree changes are preserved.

## Steps
- [x] Read repo agent tiers, lessons, memory, and working-tree baseline.
- [ ] Run parallel static review lanes for architecture/logic, security, and test coverage.
- [ ] Inspect current transport data flow locally and reproduce suspicious defects with code-level evidence.
- [ ] Patch only confirmed root causes.
- [ ] Run targeted verification serially in the main thread.
- [ ] Run final review pass, update lessons if needed, and archive this folder.
