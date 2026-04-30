# Context

2026-04-30：继续左侧 Appearance 精修。当前文件已有前两轮 UI 精修 dirty，本轮只在同一文件内追加，不触碰 README。

执行记录：
- City Points 删除大段 hint，改为 `cityPointsHelpTooltip` 小帮助按钮；主体拆成 Style 和 Labels 两个卡片。
- Rivers 拆成 River Stroke 与 Outline & Dash 两个卡片；`riversDashStyle` 更新 runtime state，renderer 对 outline 和 core stroke 同步应用 dash pattern。
- Transport master toggle 与四个 family details 使用卡片化容器，family 内部 Visibility / Labels / Scope section 统一成子容器。
- 修复删除 `cityPointsLabelDensityHint` DOM 后 controller 变量未声明导致的 ReferenceError。
