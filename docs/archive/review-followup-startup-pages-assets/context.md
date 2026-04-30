# Context

- Review 指出 `startupBundleResult.ok === false` 时，场景级 startup localization URL 被置空，legacy 启动会回落到全局 localization。
- Review 指出 Pages dist 只保留 global airport/port full pack，airport/port workbench 放大后仍会按 Japan manifest 请求 Japan full pack。
- 当前工作树有大量既有改动，本任务只改 review 相关文件。
- 已修复：`loadStartupBaseData()` 总是按 `startupFallbackScenarioId` 解析 startup locales / geo aliases URL；startup bundle artifact override 仍只在 bundle 成功时启用。
- 已修复：Pages dist 保留 Japan airport full pack 与 Japan port full/core/expanded pack，覆盖 manifest full 路径。
- 验证：`python tools/build_pages_dist.py` 通过，dist total size 944.39 MiB；`python -m unittest tests.test_main_startup_data_pipeline_boundary_contract tests.test_pages_dist_startup_shell tests.test_global_transport_builder_contracts` 通过 69 tests。
