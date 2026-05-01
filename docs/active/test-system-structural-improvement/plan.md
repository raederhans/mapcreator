# 测试系统结构性改造执行计划

## 目标
- 保持现有测试入口稳定。
- 先把 cheap proof、静态观测、失败定位补齐。
- 再把 timing / flake / adaptive route / shared fixture 分批推进。

## 批次
1. **Batch 0**：留档与口径同步
2. **Batch 1**：timeout inventory、import graph、selector 基础层、CI artifact 扩展
3. **Batch 2**：console allowlist 注册表、timeout guardrail scanner
4. **Batch 3**：failure-context 扩展
5. **Batch 4**：Playwright wrapper、timing history、adaptive route、flake budget
6. **Batch 5**：city-runtime shared fixture 小范围灰度

## 执行原则
- 现有 `reporter=list` 保持稳定，新增观测优先走 artifact / wrapper。
- live Playwright、perf、dist 只由主线程串行验证。
- 新增 gate 先走 observe/report，再收紧成 fail-fast。
- 任务完成前，本目录保持在 `docs/active`。

## 当前进度快照
- Batch 0-4 的骨架已经落地，当前主线转到 Batch 5 shared fixture 灰度与收尾验证。
- Batch 5 采用更稳的路径：先做 `shared shell-ready boot`，再让 spec 自己保留 scenario / city data / zoom 的控制权。
- 当前灰度结果：
  - `city_label_i18n_redraw`
  - `city_points_urban_runtime`
  - `city_reveal_plan_regression`
  - `city_urban_rendering_regression`
  已接入 shared boot 并通过 shared-on 验证。
- `city_lights_layer_regression` 已接入 shared boot，但当前仍有原有亮度阈值边界失败，需在收尾阶段单独处理。
