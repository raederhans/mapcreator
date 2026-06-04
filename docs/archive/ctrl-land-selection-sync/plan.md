# Ctrl 地块选择同步

## 目标
- 普通工具栏模式下按住 Ctrl/Command 点击地块可加入或移出开发选择集合。
- Ctrl/Command 点击地块后，右侧检查器和领土预设切到本次点击地块对应的国家。
- 多国多选时，以最后一次点击的地块国家作为领土预设展示对象。

## 进度
- [x] 定位地图点击和预设树同步逻辑
- [x] 实现普通模式 Ctrl/Command 选择和减选
- [x] 同步选中国家到检查器/领土预设
- [x] 跑 targeted tests 和 dist 同步

## 结果
- `handleClick` 中的 Ctrl/Command 地块选择不再依赖 dev 选择模式。
- Ctrl/Command 点击会复用现有 dev selection toggle，因此同一地块可加选和减选。
- 本次点击地块的归属国家会同步到 `selectedInspectorCountryCode`，并刷新检查器和领土预设树。
