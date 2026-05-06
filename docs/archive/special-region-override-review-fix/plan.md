# Plan

1. 恢复 sidebar 对旧 scenario special regions 的颜色改写与清除入口。
2. 恢复 renderer 对 `specialRegionOverrides` 的颜色/透明度兼容读取，并把 overrides 纳入 special visual signature。
3. 更新现有边界测试与 renderer 合同测试，防止再次把兼容层误删。
4. 跑定向校验并完成 review 自检。
