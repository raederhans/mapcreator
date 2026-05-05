# Special Zone Layers Workbench Task Ledger

| Step | Status | Notes |
| --- | --- | --- |
| Docs/context | completed | 建立 `docs/active/special-zone-layers-workbench/` 与 `.omx/context` 快照 |
| Current implementation map | completed | 子代理完成 render、toolbar/export、tests、风险静态复核 |
| Foundation modules | completed | 新增 `js/core/special_zone_layers.js`，包含 schema、preset、mutation、serialize、render bridge |
| Persistence/scenario | completed | state/file/history/interaction funnel/scenario optional layer/manifest/dev endpoint 已接入 |
| Render/export | completed | map renderer 改为 memberFeatureIds 渲染；export workbench 增加 `special-zones` 独立 SVG layer |
| Workbench/tool | completed | 新 workbench controller、toolbar 入口、membership click/Shift drag/Alt drag、bulk actions、dev save 已接入 |
| Tests/i18n/review | completed | node --check、special-zone unit、176 个 Python targeted tests、i18n audit、scenario contracts 已通过；最终 reviewer blocker 已处理 |
