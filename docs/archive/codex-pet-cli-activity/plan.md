# Codex pet CLI activity test plan

目标：验证 Codex App 的 Mochi 水豚能否稳定反映本机 CLI 端活动。

阶段：
- [x] 确认宠物文件、App 映射、CLI 状态库入口。
- [x] 用短命令采样 CLI thread 状态变化。
- [x] 判断原生 App 链路是否足够。
- [x] 如原生粒度不足，给出最小 hook bridge 方案。

约束：
- 不修改 App 安装目录。
- 不修改 hooks.json。
- live CLI 状态检查由主线程单独拥有。
- 临时输出写入 .runtime/tmp/codex-pet-cli-activity/。

结果：
Codex App 原生链路足够覆盖 CLI/exec 会话级动作；hook bridge 只适合后续增强细粒度动作。
