# 非1962剧本国家颜色修复计划

范围：`blank_base`、`hoi4_1936`、`hoi4_1939`、`modern_world`。

调试原则：先找颜色丢失的真实来源，再修改。颜色链路按数据流拆成四段：场景 manifest / countries.json → palette manager → scenario apply → renderer color resolver。

验收目标：
- 非 TNO 场景按 manifest 的 `palette_id` 使用对应色板。
- HOI4 1936/1939 优先采用 HOI4 vanilla palette。
- 场景国家缺少 `color_hex` 且色板无匹配时，获得稳定 deterministic generated color，避免地图留白。
- TNO 1962 现有 mixed-policy 不被破坏。
- 增加自动化测试锁住非1962颜色链路。

阶段：
1. 根因取证：审查 palette/country/scenario/render 数据流。
2. 最小复现：补一个失败测试覆盖非1962颜色解析。
3. 修复：只改根因所在模块，避免堆多层 fallback。
4. 验证：运行颜色、scenario、renderer 相关定向测试。
5. review 自检并归档。
