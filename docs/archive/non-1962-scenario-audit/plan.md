# 非1962剧本全面审计计划

范围：`blank_base`、`hoi4_1936`、`hoi4_1939`、`modern_world`；排除 `tno_1962`。

目标：
- 核对场景基底数据：manifest、audit、bundle、transport/city/color/ownership 等引用完整性。
- 核对交互状态：场景切换、startup/runtime state、chunk/promotion、通用交互 smoke。
- 静态审查 bug、逻辑错误、冗余和非最优实践。
- 只汇报发现，不直接修改生产代码。

验证策略：
1. 枚举真实场景和已存在命名测试入口。
2. 对每个非1962剧本运行 strict scenario contract 或同等脚本。
3. 跑与非1962场景有关的 Node/Python/Playwright targeted tests，长命令落 `.runtime/tmp`。
4. 用静态扫描补齐测试未覆盖的数据和代码路径。
5. 最后做一次 review-查bug-第一性原理复核。
