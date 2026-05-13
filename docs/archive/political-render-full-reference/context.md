# political-render-full-reference context

## 2026-05-13
- 开始执行既定计划。
- 主线程拥有所有测试与 live process。
- 当前 git status 已有 `.omx/metrics.json` 修改，视为外部运行态产物，本任务不触碰。

## 2026-05-13 execution update
- Implemented `fullReferenceTransforms` as a political full-pass baseline separated from normal per-pass reference transforms.
- Main thread owns all live tests/browser checks. Node/Python/console allowlist checks passed; exploratory Playwright QA and existing dev chunk-runtime E2E exposed unrelated/unstable startup detail hydration and chunk probe issues, recorded as validation risk rather than production diff.
- Pending: final static review and any required narrow fixes from reviewer.

## 2026-05-13 final review
- Static reviewer lane timed out and was closed.
- Main-thread first-principles review found a resize lifecycle gap: resized pass canvases can clear pixels while old full reference survives. Fixed by clearing render pass references for all passes after size-change invalidation.
- Final targeted checks pass. Existing dev scenario chunk E2E remains unstable in unrelated probes and detail hydration, so it is recorded as exploratory QA risk rather than a blocker for this patch.
