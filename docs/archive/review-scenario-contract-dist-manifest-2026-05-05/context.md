# Context

2026-05-05：工作树已有大量用户改动，本任务只碰 review blocker 相关生成/发布契约文件，避免扩大到其他 appearance/transport 改动。

执行发现：`python tools/build_pages_dist.py --help` 实际触发 build 并暴露 stale startup bundle `controllers_url`，所以修复点扩到 Pages 发布裁剪逻辑。最小修法是在 dist publish 阶段只对缺失的 `controllers_url` 做精确移除，并同步 startup bundle manifest_subset 与 gzip sidecar。没有做通用 `_url` 大清理，因为会误删仍在发布的 `countries_url`。

自检：review 子代理未发现 blocking；按建议补了 controllers_url 存在时保留的单测，防止剥离过宽。
