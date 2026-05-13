# political-render-full-reference plan

## 目标
- 为 political full repaint 保存独立 full reference transform。
- partial political repaint 只能基于完整 full repaint 的 transform 继续。
- 冷启动首帧在 startup flush 前强制失效所有 render pass。

## 验收
- renderer runtime state 默认/归一化包含 `fullReferenceTransforms`。
- render cache owner 暴露 get/set/has/clear full reference API，clone 输入输出。
- `renderPassToCache()` 只在 political full pass 完成后写 full reference。
- partial political repaint 缺 full reference 或 transform 不一致时记录明确 reason 并走 full repaint。
- 启动正常 flush 与 fallback continue flush 前调用 `invalidateAllRenderPasses("bootstrap-first-frame")`。
- 指定 Node/Python/console allowlist 验证通过。

## live process owner
- 主线程拥有所有 live tests / browser / 长命令。
- 子代理仅做静态复核和最终 review。
