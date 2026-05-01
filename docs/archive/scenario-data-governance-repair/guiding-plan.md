# TNO 与全场景 scenario 数据治理修复计划

## 目标
1. 修掉 TNO chunk 污染、manifest 计数漂移、startup/bootstrap/coarse 分叉、audit drift。
2. 把 shared builder / validator / publish gate 升级成闭环一致性检查。
3. 自动化分三档：safe 自动修、risky 审批、forbidden 禁止自动修。
4. TNO 立刻 hard gate，HOI4 先 shadow，blank/modern 走 lightweight contract。

## 已定合同
- canonical feature identity: properties.id
- ownership 真值: owners.by_feature[featureId]
- shell helper 特例: scenario_helper_kind == shell_fallback 时用 scenario_shell_owner_hint
- political coarse source: runtime_topology.topo.json
- bootstrap topology 只服务 startup shell
- audit.json 是 derived artifact，manifest 声明 audit_url 时必须与 manifest/snapshot 对齐

## 阶段 1
- 收口 files: scenario_chunk_assets.py, build_scenario_chunk_assets.py, check_scenario_contracts.py, map_builder/contracts.py, patch_tno_1962_bundle.py, build_startup_bootstrap_assets.py, build_startup_bundle.py
- 新增 build_snapshot.json
- strict validator 扩到 owner bucket、manifest metrics、startup/bootstrap/support files、audit drift
- --write-safe 允许重建纯派生产物并立刻 strict 复验，第二次运行必须零 diff

## 阶段 2
- 引入 scenario profile: tno_full / hoi4_chunked / lightweight_base
- 全场景输出结构化报告
- trusted branch 允许 safe auto-fix 自动闭环，untrusted branch 只产出 patch artifact + report

## 本轮最低验收
- tno_1962 strict checker 能准确打红当前坏数据
- safe rebuild 后 strict checker 通过，第二次 --write-safe 零 diff
- validate_tno_water_geometries 继续通过
- 相关 targeted tests 覆盖 canonical identity / owner bucket / snapshot / startup/bootstrap 对齐
