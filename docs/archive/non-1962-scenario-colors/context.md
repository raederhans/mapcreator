# 非1962剧本国家颜色修复上下文

当前仓库已有大量未提交改动，本任务只触碰颜色链路、相关测试和本任务留档。

使用技能：systematic-debugging 用于先查根因；code-review 用于并行审查颜色链路风险。

## 根因取证
- 场景数据层：五个场景的 `countries.json` 都有 `color_hex`，owner tags 也都能在 countries 中找到；颜色丢失风险主要来自 runtime 合成逻辑，而非当前 checked-in countries 文件为空。
- palette 选择层：`manifest.palette_id` 对非 TNO 场景均为 `hoi4_vanilla`，启动后浏览器运行态也显示 `activePaletteId=hoi4_vanilla`；TNO 使用 `tno`。
- 根因：`scenario_apply_pipeline` 之前只把 `startupApplySeed.scenario_color_map` 和 `countries.json.color_hex` 写入 `scenarioFixedOwnerColors`。当后续场景国家缺少 `color_hex`、且只存在 palette tag/ISO2 映射时，renderer 的 `resolveFeatureColor` 找不到 owner color，最终会留白或落入视觉兜底。
- 修复假设：在 scenario apply 的单一合成点补齐完整 owner color map，优先级为 seed/countries → 当前场景 palette 直接 tag → 当前场景 palette ISO2 bridge → deterministic generated color。这样不会覆盖 TNO 已有 mixed-policy 显式颜色，也能覆盖 HOI4/现代国家缺色。

## 修复与验证
- palette_runtime_bridge 新增 uildScenarioOwnerColorMapDetails()，在单一合成点返回最终 owner color map 和 generatedTags 诊断。
- scenario_apply_pipeline 写入 scenarioGeneratedColorTags，scenario_data_health 暴露 generatedColorTags，rollback/reset/default state 同步覆盖新字段。
- 补充 Node 测试：场景色优先于 palette、palette tag/ISO2 可补缺、缺失国家生成稳定颜色、TNO mixed-policy 显式颜色不被 palette bridge 覆盖、非 1962 checked-in 场景均声明 hoi4_vanilla 且 countries.json.color_hex 完整。
- 补充 E2E 断言：非 1962 四场景启动后 ctivePaletteId=hoi4_vanilla，关键国家颜色等于 HOI4/现代数据，scenarioGeneratedColorTags=[]，无 actionable console issue，无网络失败。
- 已通过：
ode --check 覆盖 6 个改动 JS 文件；
ode --test tests/palette_runtime_bridge.node.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs，17 pass；
ode node_modules/@playwright/test/cli.js test tests/e2e/non_1962_runtime_matrix.spec.js --reporter=list --workers=1 --retries=0，4 pass；
ode tools/e2e_layering.mjs check 通过；git diff --check 通过。
- 已知长期 WATCH：scenario_builder/hoi4/compiler.py 仍把 HOI4 builder manifest palette_id 写成 hoi4_vanilla。当前 HOI4/现代/blank 场景正确；未来非 HOI4 palette 剧本应让 builder 从 palette pack/map 推导 palette_id。
