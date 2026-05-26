# Startup Fill Render Regression Plan

## Goal

修复启动首屏国家填色被地貌视觉覆盖、填色交互颜色与色板不一致、填色后短暂黑屏这三条同源渲染/颜色回归。

## Constraints

- 主线程独占 live browser、dev server、长测试和最终验证。
- 子代理只做静态代码定位和复核，不能轮询同一个 live process。
- 保留当前 appearance/transport 平台化未提交改动，不回滚用户或既有改动。
- 共享文件 `index.html`、`css/style.css`、`js/ui/toolbar.js` 只由主线程串行集成。

## Acceptance

- 启动后默认国家填色正常显示，地貌区不遮蔽 political fill。
- 画笔填色使用当前色板选择值，颜色写入链和显示链一致。
- 填色后不出现完整黑屏或空 pass 闪烁。
- 至少有一个 targeted contract 覆盖根因。
- targeted verification 通过，最终 code-review 无阻塞项。

## Tasks

- [x] 建立 ultragoal story 和任务留档。
- [x] 静态追踪地貌层、政治填色、颜色画笔和 render dirty 数据流。
- [x] 复现或用最小测试证明根因。
- [x] 实施最小修复。
- [x] 补充或扩展现有测试入口。
- [x] 运行 targeted 验证和必要 browser smoke。
- [x] 做最终 code-review 自检并修复发现项。
