# 图例生成器上下文

- 任务开始：用户确认新增四类图例生成模式，并把现代大国固定排序放入面积排序细分设置。
- 当前约束：工作树已有大量未提交改动，本任务只改图例相关文件，避免回退已有改动。
- Live process owner：`npm run verify:pages-dist` 已由主代理单独执行并结束，输出 OK。
- 实现结果：`LegendManager` 统一计算加权随机、实控面积、宗主面积和大洲聚焦；右侧图例面板提供生成模式、大洲选择和面积模式现代大国排序；项目 payload 保存 `legendLabels` 与 `legendConfig`。
- 验证结果：图例生成器测试、项目保存 roundtrip、项目支持控制器测试、静态合同、语法检查与 pages-dist 验证均通过。
