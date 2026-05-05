# Task

- 目标：完成 data architecture hardening v2.1 的 Batch 1-4。
- 完成状态：已完成。
- 主验证证据：
  - python tools/data_health.py
  - python -m unittest tests.test_data_catalog_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_mapcreator_snapshot_contract tests.test_dev_workspace_split_boundary_contract tests.test_dev_workspace_selection_ownership_boundary_contract tests.test_dev_workspace_scenario_text_editors_boundary_contract tests.test_dev_workspace_district_editor_boundary_contract
  - 
ode --test tests/data_service_runtime_behavior.test.mjs tests/load_status_display.node.test.mjs
  - architect THOROUGH review APPROVE
- backlog：schema runtime validator、diagnostics client、dev runtime metadata contract、legacy color compatibility、core 层剩余 GET/POST、大文件阈值策略。
- review follow-up：已修复 data_health --catalog rooting 契约，并清除误入仓库的本机 .codex spillover 目录。
- 第二轮 review follow-up：已闭合 --catalog rooting 全链路，并删除 tracked spillover .codex memory 文件。
