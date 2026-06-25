# Bootstrap Wiring Phase7 Plan

## Scope

- Clean `js/main.js` wiring after phase1-6 owner extraction.
- Add a focused boundary contract that keeps `main.js` as the composition root for this stage.
- Preserve startup runtime behavior, ready handoff policy, post-ready task keys, and browser-visible diagnostics.

## Allowed Files

- `js/main.js`
- `tests/main_bootstrap_wiring_boundary.test.mjs`
- `package.json`
- `docs/active/_worktree_registry.md`
- `docs/active/bootstrap-wiring-phase7-20260625/`
- Generated `dist` only if Pages dist drift appears.

## Steps

1. Confirm clean worktree and record phase7 registry state.
2. Search `js/main.js` imports and remove only proven unused wiring imports.
3. Keep or simplify the deferred UI bootstrap alias based on usage and binding semantics.
4. Add `tests/main_bootstrap_wiring_boundary.test.mjs` and package script.
5. Run required node/static/dist/browser validation.
6. Archive docs, commit, push, and clean the temporary worktree.
