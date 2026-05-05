# Special Zone Layers Workbench Plan

目标：把特殊区域主路径收口为 layer-based `specialZoneLayers`，覆盖数据模型、持久化、场景资产、渲染、导出、workbench 入口、dev 写盘与 targeted tests。

## 执行阶段
- [ ] 1. 建立 schema/state/manager/preset/pattern 基础模块。
- [ ] 2. 接入 file manager、history manager、interaction funnel。
- [ ] 3. 接入场景 asset loader 与 manifest 字段。
- [ ] 4. 建立 render owner，并用最小 facade 接入 renderer。
- [ ] 5. 接入 export layer。
- [ ] 6. 建立 workbench controller 与 toolbar 入口。
- [ ] 7. 接入地图编辑 tool 与批量操作。
- [ ] 8. 接入场景写盘 endpoint。
- [ ] 9. 移除旧 freehand/manual/scenario override 主路径。
- [ ] 10. 补齐 i18n、a11y、状态提示。
- [ ] 11. 跑 targeted tests 与最终 review。

## 验收标准
- special zone layer schema normalize、CRUD、membership、serialization 有自动化测试。
- 项目保存/读取包含 `specialZoneLayers`。
- scenario manifest 支持 `special_zone_layers_url`，loader 能读取场景 layer asset。
- renderer/export 通过 `special-zones` layer 绘制，不依赖旧 special region 主路径。
- toolbar 能打开 workbench，workbench 支持基础图层创建、样式修改、显隐、成员操作与只读提示。
- dev endpoint 能写回 scenario layer JSON。
- targeted tests 通过；最终子代理 review 通过。
