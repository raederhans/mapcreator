# 任务
- [x] 目标：只读审计当前测试系统对 coding agent 的可操作性。
- [x] 限制：不跑 live tests，不改生产代码。
- [x] 重点：命令入口清晰度、参数语义误导、文档/脚本/artifact 支撑度、误选 heavy tests 或漏掉关键 tests 的高风险点。

## 已完成输出
- 汇总了命令入口、selector、adaptive runner、shared boot、CI explain artifact 的风险点。
- 给出了真实误用路径示例与最小修正建议。
