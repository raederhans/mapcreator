# Plan

- [x] 阶段 0：冻结 inventory 与 source-of-truth 矩阵
- [x] 阶段 1：生成 data/CATALOG.json 与 data/CATALOG.md
- [x] 阶段 2：前移 schema 与 topology metadata
- [x] 阶段 3：新增 js/core/data_service.js
- [x] 阶段 4：迁移 transport workbench preview GET
- [x] 阶段 5：接入 __mapcreator__
- [x] 阶段 6：接入 source_ledger provenance gate
- [x] 阶段 7：startup / data_loader 状态观测收口
- [x] 阶段 8：颜色状态稳定性 follow-up
- [x] 验证、自检、留档、lessons learned

## 已完成交付

- `data/CATALOG.json` / `data/CATALOG.md`
- `tools/build_data_catalog.py` / `tools/check_data_catalog.py`
- `js/core/data_service.js`
- `js/core/mapcreator_snapshot.js`
- transport preview shared loaders 全部切到 `data_service`
- Pages dist publish contract 已补 `app/data/CATALOG.json`
- `data/manifest.json` topology metadata 扩展
- transport manifest path contract 校验增强
- color cache capacity / explicit reset / mirror consistency check
