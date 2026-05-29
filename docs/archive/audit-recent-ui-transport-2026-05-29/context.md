# 最近 UI/transport 提交审计上下文

## 2026-05-29
- 自动化记忆提示：上一轮误判来自本地分支差异，本轮必须明确区分当前检出代码、其他本地分支、未提交工作区。
- 当前分支：`main`，`HEAD` 与 `origin/main` 对齐。
- 当前未提交改动：`.omx/metrics.json`、`data/locales.json`、`index.html`、`tests/test_i18n_audit.py`。
- `.omx/metrics.json` 是运行态噪声，收尾不提交。
- `data/locales.json`、`index.html`、`tests/test_i18n_audit.py` 与 transport i18n 缺口相关，可作为本轮候选修复继续审查。
- 审计范围：`HEAD~10..HEAD`，功能集中在 UI support surfaces、transport workbench/sidebar、quickbar、dev workspace、dist 同步。
- live process owner：主线程。子代理 `code-reviewer` 与 `architect` 只做静态审计。
- 初步缺口：transport 入口迁移后，source 的 transport tab/heading i18n 已有未提交修补；需要确认 Project sidebar 新入口 tooltip/aria key、dist/app 同步和 manifest 自引用。
- 修复：transport tab 与 panel heading 补上 `data-i18n="Transport"`，并同步 `dist/app/index.html`。
- 修复：`data/locales.json` 补 `Transport actions` 与 transport workbench tooltip 文案，`tests/test_i18n_audit.py` 同时检查 source 与 dist。
- 修复：移除 `js/ui/sidebar.js` 与 `dist/app/js/ui/sidebar.js` 中 preset 批处理成功路径的裸 `console.log`。
- 修复：transport E2E 打开 Project sidebar transport 区域时改为点击 `#lblTransportProject`，避免直接写 `details.open` 跳过真实交互。
- 收敛：运行过一次 `python tools/build_pages_dist.py`，发现历史 source/dist 漂移会把无关 dist 文件带入本轮；已撤回无关 dist，只保留本轮需要的精确 dist patch 与 manifest 尺寸校准。
- 修复：`ui_rework_mainline_shell_sidebar` 的 special region 断言接受有效空状态，覆盖当前数据下“区域可见但无列表行”的产品状态。
- 已验证：`python -m unittest tests.test_i18n_audit tests.test_ui_rework_plan02_mainline_contract tests.test_ui_rework_plan03_support_transport_contract tests.test_pages_dist_startup_shell -q` 通过。
- 已验证：`node --check js/ui/sidebar.js`、`node --check dist/app/js/ui/sidebar.js` 和 3 个变更 E2E spec 通过。
- 已验证：`python tools/i18n_audit.py`、`git diff --check` 通过。
- 已验证：`npm run -s test:e2e:ui-rework-mainline` 通过，日志在 `.runtime/tests/playwright/ui-rework-mainline-audit-20260529-rerun.log`。
- 最终自检：保留最短路径修复，不增加 fallback；source 与 dist 精确同步；`.omx/metrics.json` 保持不提交。
- reviewer 复核后补修：`dist/pages-dist-manifest.json` 改为全量尺寸校准，并在 `tests/test_pages_dist_startup_shell.py` 增加逐项 `size_bytes` 与 `total_bytes` 校验。
- reviewer 复核后补修：6 个 transport workbench/project 入口测试都改为在需要时点击 `#lblTransportProject`，不再直接写 `details.open`。
- reviewer 复核后补修：special region 初始断言按 `is-empty-scenario-panel` 分支收紧；有内容时要求列表可见，无内容时要求 empty state 可见。
- 已验证：manifest 1720 条记录 `bad=0 total=1001069218 actual=1001069218`。
- 已验证：transport workbench 3 项 Playwright 通过，日志在 `.runtime/tests/playwright/audit-transport-workbench-only-20260529-rerun.log`。
- 已验证：mainline 5 项 Playwright 通过，日志在 `.runtime/tests/playwright/ui-rework-mainline-audit-20260529-final.log`。
- 已验证：support transport/helper 10 项与 adaptive support 1 项 Playwright 通过，日志在 `.runtime/tests/playwright/ui-rework-support-transport-helper-audit-20260529.log` 和 `.runtime/tests/playwright/ui-rework-support-adaptive-audit-20260529.log`。
- 额外发现：完整 `ui_rework_support_transport_hardening` 批次仍有旧断言失败，包括 special zone preview、frontline hint length、city toggle spacing、port apply bridge；这些未纳入本轮提交。
