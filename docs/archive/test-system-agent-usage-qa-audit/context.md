# 上下文
- 2026-05-01：完成只读审计，范围覆盖测试入口、selector、adaptive runner、shared boot、CI explain artifact。
- 关键误导点：route registry 把单 spec 映射成整 domain；test:adaptive 名字像执行测试但默认 dry-run；README 只暴露 npm run test:e2e；manifest 45 spec 与 import graph 47 spec 存在双真相。
- 关键 debug 缺口：selector explain 不支持 helper/import-graph fallback；artifact 不上传 changed-files 输入与 test-list 展开；workflow caller pr-verify.yml 没有 route；verify-shared.yml 被误归到 pages-dist。
- shared boot 当前是 city-runtime 专用 worker 级共享页，真相主要埋在 tests/e2e/support/fixtures.js 与 docs/active/test-system-structural-improvement/context.md，主 README 无入口说明。
- 审计已完成，剩余只有最终汇报、lessons learned 追加与归档。
