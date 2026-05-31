# context

2026-05-29: 用户要求审核并修复本线程所有改动。当前仓库存在多项用户/构建脏文件；本轮只处理已改 UI fix 的代码和测试，不回滚无关删除或 lessons learned。live server/browser smoke 由主线程独占。

2026-05-29: 审查发现 `dist/app` 在指南语言按钮补丁后缺少重新生成，可能导致 `dist/pages-dist-manifest.json` 尺寸记录漂移。已重新运行 `python tools/build_pages_dist.py`。随后通过目标 unittest、JS 语法检查、`git diff --check`、以及浏览器冒烟：指南 EN/ZH 同步、accordion 箭头固定、右栏 1267/1023 响应式、场景指南按钮顶部位置和首页作品图 16:9 比例。
