# 剧本标签创建器紧凑布局任务

## 验收标准
- `剧本标签创建器` 标题、场景名和空状态信息占用更少竖向空间。
- 表单字段保持可读，并在桌面宽度下以更紧凑的多列组织呈现。
- 色板区和底部按钮区不会把整个 tab 撑得过高。
- controller 数据流、事件绑定和 mutation endpoint 保持不变。
- 源码、`dist/app` 和 manifest 同步。
- targeted tests 通过。

## 当前 owner
- 主线程：DOM/CSS 修改、dist 同步、测试和最终提交。
- 子代理：只读 review 已完成，反馈的色板弹层定位风险已修复。

## 验证
- `node --check js\ui\dev_workspace\dev_workspace_shell_builder.js`
- `node --check dist\app\js\ui\dev_workspace\dev_workspace_shell_builder.js`
- `python -m unittest tests.test_dev_workspace_shell_builder_boundary_contract tests.test_dev_workspace_split_boundary_contract`
- `node -e ...` 校验 `dist/pages-dist-manifest.json` 中两个改动产物大小。
- `git diff --check`
