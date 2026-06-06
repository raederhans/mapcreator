<p align="right">
  <a href="./README.md"><img src="https://img.shields.io/badge/English-2563eb?style=for-the-badge" alt="English"></a>
  <a href="./README.zh-CN.md"><img src="https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-111111?style=for-the-badge" alt="Chinese"></a>
</p>

# Scenario Forge

Scenario Forge 是一个以世界场景为核心的地图创作工作台，适合架空历史、策略游戏 Mod、地缘政治叙事和地图展示。

它把场景选择、政治编辑、地图外观、战略标注、交通图层检查和导出流程放在同一个工作区里，让创作者可以从世界状态快速走到可展示的地图成品。

**在线体验：** https://raederhans.github.io/scenario-forge/

**最近更新：** 2026-06-06

## 功能亮点

| 功能面 | 你可以做什么 |
| --- | --- |
| 场景地图 | 从 Blank Map、Modern World、HOI4 1936、HOI4 1939 或 TNO 1962 开始创作。 |
| 政治编辑 | 重绘国家归属和实际控制，检查同一地区被多方控制的情况，并在归属、控制、战线视图之间切换。 |
| 视觉风格 | 调整海洋、边界、上级边界、地形区域、城市范围、城市标记、河流、纹理、昼夜阴影和参考底图。 |
| 战略展示 | 添加图例、战线、作战线、作战图形、标签和兵棋单位标记。 |
| 交通背景 | 通过交通工作台检查道路、铁路、机场、港口、矿产、能源设施、工业区、物流节点和图层顺序。 |
| 导出流程 | 导出 PNG/JPG，调整亮度/对比度/饱和度，管理图层顺序，并准备最高 8K 的高分辨率输出。 |
| 项目文件 | 保存可编辑项目 JSON，记录场景、外观、交通、战略标注、参考图对齐值和导出设置。 |
| 社区预览 | 在本地后端模式中试用登录状态、云端保存预览（Cloud Saves）、发布、社区下载、评论、举报和管理审核工具。 |
| Mod 预览 | 在本地开发预览模式中，用 HGO（HOI4 Mod 数据）运行预览和配色库工具检查国家身份、旗帜、颜色和渲染效果。 |
| 多语言 | 使用英文或简体中文界面。 |

## 适合谁

- 需要快速制作政治地图的架空历史创作者。
- 正在探索世界设定的 HOI4、TNO、Kaiserreich 和 Red Flood Mod 作者。
- 准备地图概念图的场景与战役设计者。
- 需要清晰地缘政治视觉材料的写作者、研究者和展示者。
- 希望在同一工作区完成保存、样式调整和导出的地图创作者。

## 开始使用

### 在线体验

打开在线版本：

- https://raederhans.github.io/scenario-forge/

在线版本适合体验场景编辑、外观调整、项目文件和导出流程。

### 本地编辑器

启动完整本地编辑器：

```bat
start_dev.bat
```

数据已经构建后，可以更快启动：

```bat
start_dev.bat fast
```

用干净运行时会话启动：

```bat
start_dev.bat fresh
```

### 本地后端预览

打开本地后端和社区预览：

```bat
start_backend_preview.bat
```

这个本地模式会把预览后端数据存到本机 `.runtime/backend/`。它适合试用云端保存预览、公开社区帖子、下载、评论、举报和管理员审核流程。

## 常见工作流

1. 选择一个场景基线。
2. 编辑国家归属、实际控制或战线状态。
3. 调整边界、水域、地形、城市、河流、交通和参考图等视觉图层。
4. 添加图例、作战线、兵棋单位标记、标签和作战图形等展示元素。
5. 保存可编辑项目 JSON，再导出最终图片或图层包。

## 功能状态

主编辑路径已经可以用于常规地图创作：场景切换、政治编辑、外观控制、项目保存/载入、战略标注和导出。

一些较大的系统目前以预览能力呈现：

- **云端保存预览和社区：** 通过本地后端预览使用。
- **交通工作台：** 多个交通类别已接入真实来源数据和缓存数据。道路、铁路、机场、港口目前最稳定地连接到主地图；更广的全球覆盖持续推进。
- **HGO 运行预览：** 用于检查 HOI4 Mod 国家身份、配色库、旗帜和地图渲染效果的本地开发预览能力。

## 许可证

项目代码和文档采用 **MIT 许可证**。

第三方数据和衍生资产保留各自原始来源条款与溯源记录。

## 维护者

当前维护者：**[@raederhans](https://github.com/raederhans)**。

## 问题反馈

如果你发现功能异常、显示问题或体验不一致，可以在 GitHub 上提交问题：

- https://github.com/raederhans/scenario-forge/issues

有帮助的问题反馈通常包括当时使用的场景、浏览器和操作系统、清晰复现步骤，以及必要时附上的截图或导出项目文件。

## 数据来源

Scenario Forge 结合公开地理数据、参考数据和项目派生资产。主要来源包括：

| 来源 | 用途 |
| --- | --- |
| [Natural Earth](https://www.naturalearthdata.com/) | 基础地理、国家、海岸线和小比例尺参考图层。 |
| [geoBoundaries](https://www.geoboundaries.org/) | 行政边界参考数据。 |
| [GeoNames](https://www.geonames.org/) | 地名和聚落参考数据。 |
| [NOAA ETOPO 2022](https://www.ncei.noaa.gov/products/etopo-global-relief-model) | 全球地形、海底地形和物理地貌背景。 |
| [NASA Black Marble](https://blackmarble.gsfc.nasa.gov/) | 夜间灯光和城市灯光纹理背景。 |
| [OpenStreetMap](https://www.openstreetmap.org/) | 道路、铁路、设施和其他交通/背景要素。 |
| [Geofabrik](https://download.geofabrik.de/) | 用于交通工作台的区域 OpenStreetMap 数据摘录。 |
| [日本 MLIT 道路数据（N06）](https://nlftp.mlit.go.jp/ksj/) | 日本道路校准和交通预览参考数据。 |

详细溯源信息记录在 `data/source_ledger.json`、`data/` 目录下的 `.provenance.json`、`data/transport_layers/` 下的交通数据来源配方，以及生成资产的来源记录中。
