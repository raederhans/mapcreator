# Map Creator 三项架构清理上下文

## 当前状态

- 任务进入执行阶段，按 Issue 2 → Issue 1 → Issue 3 推进。
- 2026-05-05 初始工作树只有 `.omx/` runtime 状态噪音。
- 已读取 `lessons learned.md`，本任务重点遵守：长测试后台日志、checked-in scenario data 迁移需真实落地、contract/checker/fixtures 同步更新。

## 发现记录

## Phase 0 审计基线（2026-05-05）

生成报告：
- `.runtime/reports/generated/mapcreator-architecture-cleanup-3-issues/control_baseline_audit.json`
- `.runtime/reports/generated/mapcreator-architecture-cleanup-3-issues/topology_baseline_audit.json`

Control 基线：
- `blank_base`：0 owners / 0 controllers / 0 diff。
- `hoi4_1936`：22502 owners / 22502 controllers / 0 diff。
- `hoi4_1939`：22502 owners / 22502 controllers / 606 diff；controller-only country：NCP、RGC。
- `modern_world`：11294 owners / 11294 controllers / 0 diff。
- `tno_1962`：12811 owners / 12811 controllers / 1303 diff；controller-only country：POR、PRC、SIC、SIK、XSM。

Topology 基线：
- `data/europe_topology.runtime_political_v1.json`：15,682,866 bytes，22502 geometries，RU-sensitive geometry byte ratio 37.67%。
- `data/europe_topology.na_v2.json`：19,240,920 bytes，26767 geometries，RU-sensitive geometry byte ratio 35.58%。
- `data/europe_topology.json`：4,860,961 bytes，7743 geometries，RU-sensitive geometry byte ratio 0%。

计划偏差：
- controllers 文件当前是完整 map，只有部分 scenario 与 ownership 有差异；删除时要处理完整 checked-in data 和 old project import。
- RU-sensitive 数据占比远高于 5%，Topology 参数推广需要 candidate gate 先行。



## Phase 1 完成记录（2026-05-05）

- `presentation_features.atlantropa_relief/coastal_accent` 成为 HGO/Atlantropa 显示能力开关。
- `map_renderer`、ocean toolbar、TNO builder、manifest、i18n、contract tests 已改为 manifest 驱动。
- 保留 TNO parent grouping 的 `tno_1962` 业务硬规则；它属于国家层级分组，和 HGO 显示能力无关。

验证：
- `python -m unittest tests.test_tno_bundle_builder...` targeted HGO 测试通过。
- `python -m unittest tests.test_tno_relief_overlay_contract tests.test_scenario_presentation_runtime_boundary_contract` 通过。

## Phase 2 完成记录（2026-05-05）

- controller 数据文件和 `controllers_url` manifest 字段已移除。
- runtime state、loader、lifecycle、file manager、history、renderer、sidebar、toolbar/dev workspace 改为 owner-only。
- `controllers.by_feature.json` 删除后，checked-in `build_snapshot/audit/manifest.source` 已同步去掉 controller 输入。
- 旧项目导入继续显式删除 `scenarioControllersByFeatureId`，作为一次性迁移兼容。
- 部分 browser e2e 中的 controller-derived frontline 覆盖改成 retired/skip 或移除 view-mode selector 依赖；manual strategic overlay 覆盖保留。

验证：
- `node --test tests/scenario_runtime_state_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/border_mesh_owner_behavior.test.mjs tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/startup_hydration_behavior.test.mjs` 通过，33 tests pass。
- `python -m unittest` targeted scenario contract/HGO/dev-server tests 通过，15 tests pass。
- `python tools/check_scenario_contracts.py --scenario-dir data/scenarios/hoi4_1936 --strict` 通过。
- `python tools/check_scenario_contracts.py --scenario-dir data/scenarios/hoi4_1939 --strict` 通过。

计划偏差：
- `controller_feature_count` 仍保留在 country catalog 中作为旧数据字段；materializer 现在把它同步为 owner feature_count，避免引入额外 catalog schema 迁移。
- startup bundle 生成器仍有旧 controller 参数接口；本轮没有重写该构建器，只让 runtime loader 和 checked-in manifest/data 脱离 controller 文件。

## Phase 3 完成记录（2026-05-05）

- 在 `init_map_data.py::_promote_candidate_topology_if_safe` 加入 candidate audit sidecar：`<output>.candidate_audit.json`。
- audit 记录 candidate/output/previous path、sha、bytes、topology summary、contract problems、country gate metrics、result。
- contract gate 和 country gate 失败时也会写 audit，方便 A/B 参数试验定位失败原因。
- production topology quantization/toposimplify 参数保持原值；后续参数推广必须先产出 candidate audit。

验证：
- `python -m py_compile init_map_data.py map_builder/scenario_context.py map_builder/scenario_political_materialization_support.py map_builder/scenario_political_materializer.py tools/dev_server.py tools/check_scenario_contracts.py tools/patch_tno_1962_bundle.py tools/check_hoi4_scenario_bundle.py` 通过。
- 直接调用 `_write_candidate_topology_audit` 的临时脚本通过，输出 `candidate-audit-ok`。


## 收尾自检（2026-05-05）

- `rg` 复核：source/runtime 中 controller state 只保留旧项目迁移删除路径和少量测试中的 legacy import 断言。
- `dist/app` tracked JS/index 已同步 source 改动，避免发布壳层继续使用旧 controller/frontline 逻辑。
- final reviewer 子代理因上下文/运行时间关闭，未返回有效复核；主线程完成本地 review、`git diff --check`、syntax check 和 targeted tests。
- `git diff --check` 通过；输出仍有 Windows LF/CRLF 提示，未发现 whitespace error。
