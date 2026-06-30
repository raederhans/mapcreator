# Phase6A Public Sample Experience Plan

## Objective

Polish the public sample editing experience added in Phase5B without changing the core import architecture or public scenario policy.

## Task Grade

Complex. The work touches app UI, landing copy, sample contracts, release smoke, Pages dist, and docs. Main agent owns all live tests, browser checks, Pages builds, commits, pushes, and cleanup. Subagents may only perform static mapping, planning review, code review, or QA review unless reassigned by the main agent.

## First-Principles Framing

- A user who opens `/app/?sample=<id>&view=guide` needs visible confirmation that the starter project loaded.
- A failed or unknown sample link needs a visible, non-blocking message that does not break the app shell.
- Users need clear next actions: edit, export their own copy, download the original JSON, or read the recipe.
- The safe import boundary remains the Phase5B registry plus FileManager shared normalization path.
- The landing page should keep source-backed sample metadata and direct JSON downloads.

## Constraints

- Keep HGO as developer/local preview.
- Do not add arbitrary URL import, backend/cloud dependency, runtime sample gallery, HGO runtime payload, or core scenario runtime data changes.
- Keep existing download JSON fallback.
- Keep source and `dist/**` Pages mirrors aligned after source changes.
- Shared hot files must be edited serially: `index.html`, `css/style.css`, and `js/ui/toolbar.js` if touched.

## Implementation Checklist

- [x] Add a compact app sample status/error banner using `state.sampleProjectDeeplink`.
- [x] Register one `refreshSampleProjectBannerFn` runtime hook and call it from the existing startup sample state writer.
- [x] Wire banner actions to the existing export workbench hook and original sample JSON download.
- [x] Preserve toast behavior, sample URL behavior, registry allowlist, and FileManager shared import path.
- [x] Polish landing sample CTA copy and add a short Guide-panel note.
- [x] Extend existing sample/landing/release tests instead of creating a new test system.
- [x] Update README, README.zh-CN, and release draft wording if source copy changes.
- [x] Regenerate Pages dist and verify release behavior.
- [x] Run independent code-review and architect lanes.
- [x] Run QA gate or record a justified skip with evidence.
- [ ] Commit, push, update registry, and archive this task folder after final validation.

## Implementation Design

- App banner placement: static DOM in `#projectSidebarPanel`, between Project Management and Legend/Export sections, so the success/error message sits beside project/export controls.
- Runtime refresh: `startup_sample_project_deeplink.js` remains the owner of `sampleProjectDeeplink`; each state write calls the narrow `refreshSampleProjectBannerFn` hook after mutation.
- UI controller: add a small `js/ui/toolbar/sample_project_banner_controller.js` with pure view-resolution helpers plus DOM binding. It reads state, renders success/error only, supports dismissing the current message, and leaves pending/loading/importing silent.
- Actions: success banner opens the existing export workbench through `openExportWorkbenchFn` and links to `appProjectUrl` or `projectUrl` for the original checked-in JSON.
- Errors: unknown/bad sample links surface a nonfatal banner using the existing sample registry error codes and keep the existing toast path.
- Landing copy: change sample CTAs to clearer labels while retaining the same `./app/?sample=<id>&view=guide`, download JSON, and recipe manifest links.

## Planned Validation

- `npm run test:node:sample-project-contracts`
- `npm run test:node:annotation-productization`
- `npm run test:node:landing-showcase-view`
- `npm run python -- -m unittest tests.test_pages_dist_startup_shell -q`
- `npm run python -- -m unittest tests.test_data_manifest_contract -q`
- `npm run verify:pages-dist`
- focused sample deep-link Playwright release smoke
- `npm run verify:dist-drift` after the Phase6A commit, because this script compares generated dist against HEAD.
- `git diff --check`

## Live Process Owner

Main Codex agent owns all live commands and logs for this task. Subagents must not start, poll, retry, stop, or interpret live browser/dev-server/build/test processes.
