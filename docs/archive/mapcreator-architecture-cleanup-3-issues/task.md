# Map Creator 三项架构清理任务清单

## Phase 0：审计基线

- [x] 生成 controller 差异和 controller-only country 审计。
- [x] 生成 topology 当前大小与 RU shell 占比审计。
- [x] 将审计摘要写入 context。

## Phase 1：HGO capability 化

- [x] 扩展 scenario presentation helper。
- [x] 替换 renderer 中 TNO Atlantropa/relief/coastal gates。
- [x] 替换 toolbar ocean/coastal UI gate。
- [x] 更新 TNO manifest / builder / dist manifest。
- [x] 更新 contract/i18n/tests。
- [x] 运行 targeted verification。

## Phase 2：Control / frontline 退场

- [x] Loader 不再加载 controllers。
- [x] Runtime state/lifecycle/file-manager 移除 controller state。
- [x] Renderer/overlay/city policy/frontline 逻辑 owner-only。
- [x] Sidebar/toolbar/dev workspace 移除 controller/frontline UI。
- [x] 删除 controller data/manual rule，处理 controller-only countries。
- [x] 更新 targeted tests 和 old project import。

## Phase 3：Topology candidate audit gate

- [x] 找到现有 candidate/promotion 扩展点。
- [x] 加 audit artifact 输出。
- [x] 加 promotion gate。
- [x] 加 targeted tests。
- [x] 保持 production topology 参数原值，后续再参数推广。

## 收尾

- [x] review/查 bug/第一性原理自检。
- [x] 更新 context/task。
- [x] 记录重大 lessons learned。
- [x] 报告已完成阶段和剩余工作。
