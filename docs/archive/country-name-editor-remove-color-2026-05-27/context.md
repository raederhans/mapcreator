# 国家名称编辑器移除颜色栏目上下文

## 2026-05-27
- 用户反馈 `国家名称编辑器` tab 中颜色设置栏目占用空间，需要移除栏目及其相应空间。
- 已读 `lessons learned.md`：UI 改动要锁真实可见行为，测试要锁真实合同，`dist/app` 同步要避免卷入无关漂移。
- 已读 `frontend-testing-debugging` skill：当前 Browser 访问 localhost 仍受策略阻断，本轮用静态合同和 targeted tests 验证。
- 已读 `ultrawork` skill 与 agent tier 文档：本任务是单一串行小修，主线程直接执行。
- 相关文件：
  - `js/ui/dev_workspace/dev_workspace_shell_builder.js`
  - `js/ui/dev_workspace/scenario_text_editors_controller.js`
  - `tests/test_dev_workspace_scenario_text_editors_boundary_contract.py`
  - `dist/app/...` 对应交付文件
- 已移除国家名称编辑器中的颜色输入、颜色保存按钮、颜色状态节点，以及 controller 中的颜色 helper import、渲染、保存、输入绑定和颜色保存状态。
- `scenario_country_color_editor.js` 在源码和 `dist/app` 中已无引用并已删除。
- `devScenarioCountryEditor` 默认状态中已移除颜色字段，避免国家名称编辑器继续暴露已删除能力的状态槽。
- `dist/app/js/ui/dev_workspace/dev_workspace_shell_builder.js`、`dist/app/js/ui/dev_workspace/scenario_text_editors_controller.js`、`dist/app/js/core/state/dev_state.js` 已同步，`dist/pages-dist-manifest.json` 只保留本次交付文件、删除 helper 文件和 manifest 自身的尺寸变化。
- `npm run -s verify:pages-dist` 通过，但该脚本会重建一批历史漂移的 dist 文件；本轮已收回无关 dist 变动，最终验证使用 targeted node check、unittest、token scan 和 manifest target size check。
- 最终验证：
  - `node --check` 通过：源码与 dist 的 `dev_state.js`、`dev_workspace_shell_builder.js`、`scenario_text_editors_controller.js`。
  - `python -m unittest tests.test_pages_dist_startup_shell tests.test_dev_workspace_scenario_text_editors_boundary_contract tests.test_state_split_boundary_contract tests.test_dev_workspace_shell_builder_boundary_contract` 通过，42 tests。
  - `git diff --check` 通过。
  - token scan 确认颜色编辑相关 token 只存在于负向测试断言和归档留档中。
- reviewer 复核后补充了两类合同：`devScenarioCountryEditor` 默认状态不再保留颜色字段；`dist/pages-dist-manifest.json` 中每条记录必须指向真实文件，并显式排除已删除的 `scenario_country_color_editor.js`。
