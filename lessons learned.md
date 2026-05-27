# Lessons Learned

只记录后续还会反复用到的重大教训，尽量短，避免重复。一次性修复过程、已经明确收口的临时问题、纯执行快照，不继续保留。

## 当前高频主题

- canonical 输入、checked-in 产物、运行时 contract 要共用同一份真相源。
- owner / facade / support surface 拆分要同波次收口验证链、发布链、依赖注入、state writer 和真实运行分支。
- live test、长构建、browser smoke、bundle/checkpoint builder 一律单 owner，长流程默认后台日志。
- pending / settled 真状态要先钉住，再接保存、可见性和 reload 链。

## 构建、发布与真相源

### canonical 输入只能有一份
- internal partial 才能当主输入，公开诊断文件和组合产物默认都当输出。
- 不要从最终组合产物反提取主输入，也不要让 local mirror 反向支配 canonical。
- 审核重构进度时，要同时看代码、测试、checked-in 产物三件事。

### materialize 和 publish 必须分开
- `materialize` 只生成产物，`publish` 只发布现有产物。
- 如果 UI 需要“保存后立即可见”，显式串联 `materialize + publish`，不要把 publish 藏进 materializer。
- 编辑器输出 publish、bundle publish、startup supporting file publish 要分清边界。

### 多 scenario 能力必须整链 scenario-aware
- builder 一旦支持多个 scenario，默认输入、域规则、display 文案、bookmark、authoring input contract 都要跟着 scenario 切换。
- startup supporting file 一旦进入 scenario 链路，就直接正式化到 checkpoint artifact 和 scenario publish contract。
- delta / rule 文件只能表达差量规则，不能反客为主变成 full-pack 默认值。

### 发布链和审计链要共享同一套枚举
- 数据目录、健康检查、strict checker、catalog、audit 都要使用同一套 manifest 枚举规则。
- source recipe、build audit、签名和 checked-in 产物要对真实源文件做 repo-relative 校验。
- checked-in snapshot 只记录稳定事实；approval log 只能写在 strict 复验通过之后。

## 编辑器、状态与运行时边界

### 重逻辑按事务边界拆
- 先找一笔完整 transaction 的输入输出，再抽 service / materializer。
- 入口函数理想状态只剩校验、锁、调用、提交、响应整形。
- service 下沉后，测试也要跟着切到真实写口，不能继续 patch 旧 adapter helper。

### 锁语义要覆盖真实并发模型
- owner-aware 锁不能只看 pid，至少要把 thread 和 transaction 一起建模。
- builder、dev_server、checkpoint 等写链要共用同一把 scenario 级锁。
- 长流程开始前先看日志、退出码、锁文件，再判断是不是代码失败。

### merged state 要区分“缺失”和“明确为空”
- `merged?.layer || null` 这类写法会把“没有该 layer”和“该 layer 被清空”混成一件事。
- runtime merged state 回写前先判 `hasOwnProperty(layerKey)`。
- fallback layer 继续走既有 bundle/topology 路径，不能被 chunk refresh 顺手清空。

### pending / settled 真状态先于保存与可见性
- optional asset 真正加载前允许编辑时，保存链必须先抓住 pending canonical payload。
- per-scenario asset 的加载哨兵要绑定 `activeScenarioId`，空对象不代表已经加载。
- 打开面板时先触发真实加载；保存前若尚未 settled，就先加载并提示。

### 共享能力切换要整波次完成
- transport shared-variant cutover 要同时切 preview、inspector、validator、builder 和 checked-in 产物。
- family toggle、master toggle、tab selection、activePackId、runtime capability 必须描述同一件事。
- loader 白名单、发布 allowlist、生成源、fetch 前路径校验要一起收口。

## 渲染、性能与可见性

### 渲染 pass 要维护单一生命周期
- 任何依赖场景 mask、atlas、canvas 尺寸、DPR、baseline 的 render pass，都要在对应输入变化时统一失效。
- partial repaint 的基线要跟画布生命周期一起失效。
- 视觉资源未就绪时，可见 fallback 和交互目标必须保持一致。

### 性能优化先减阻塞边界，再谈微调
- 如果 startup 是 bundle-first，缩 bundle 边界通常比局部 cache 小技巧更稳。
- coarse preload、非关键 metadata、focus detail prewarm 这类高成本工作，优先移出首屏阻塞链。
- exact pass、mesh、contour、hit canvas 这类大成本路径，先缓存可见集和 clean frame，再谈 draw 性能。
- 首屏政治填色 gate 只等待政治首帧所需 chunk；water、relief、Atlantropa 等非政治可见层不要进入 boot-critical path。

### 调度与刷新语义必须精确
- `flushPending` 的语义是“只冲刷待处理工作”，不要先清 pending 再判断是否启动 refresh。
- exact-after-settle、defer、post-ready 只负责冲刷真实 pending；退出 defer 后要补一次受控 flush。
- chunk promotion、视觉刷新、spatial、hit canvas 要作为同一世代提交。
- 首屏 ready 不能只看 schedule 是否发出；chunked 场景的首个可见帧要等真实 promotion 提交到 `selectionVersion`、`landData` 和 `colors`。

### 性能验证要基于真实 idle
- benchmark idle 必须包含 runtime chunk work、post-commit replay、post-ready 基础设施任务。
- perf gate 变红时，先在同机同环境重跑 HEAD，区分补丁回归和环境漂移。
- 黑帧、长任务、wheel idle、最终 sharpness、真正首屏完成时间要分别记录，不要混成一个指标。

## UI、交互与文案

### UI 改动要锁住真实可见行为
- 对首屏、滚动、点击、summary、toolbar 这类可见路径，先保静态可见性，再做 reveal、defer 和批处理。
- Inspector 的批量动作默认绑定当前可见过滤结果，并先给影响数量预览。
- ready 文案、禁用态、可编辑性、真实 runtime capability 要共享同一份 contract。
- 侧栏折叠这类 flex 布局变化要观察真实容器尺寸；合成 `window.resize` 只能作为辅助信号，最终视点修正要由 `ResizeObserver` 锁住。

### i18n 和容器绑定要尊重 DOM 结构
- 不要对带子节点的 summary / heading 容器整块写 `textContent`。
- routine i18n sweep 先 audit 再同步翻译；补 key 时优先定点 patch，避免整文件 churn。
- source-of-truth、baseline、runtime locale 三者要同时同步。

## 测试、审计与留档

### 新 review lane 的职责是暴露真实缺口
- 红灯优先保留为显式风险，不要靠降级 strict、skip scenario、warning-only 来伪装完成。
- static contract 从 E2E 拆出后，要接入具名入口和现有路由体系。
- selector explain、列表入口、变更入口、grep 规则、workflow paths 要共享同一份真相源。

### 测试要锁真实合同，不要绑旧实现
- 新边界优先补 source contract / node contract / targeted Python contract，再决定要不要上更重的 E2E。
- 退休一个 spec 时，要同步删除 manifest、test list、allowlist、引用关系。
- data URL harness、import-safe tool、CLI/library mode 这类特殊运行环境要单独有合同。

### 留档要短、准、可清理
- active 目录只保留当前仍在推进的主线。
- 任务已完成、验证已补齐、后续故事已转入别的 active 目录时，原目录立刻归档。
- archive 里保留可复用的计划、上下文、任务闭环；空目录和纯残留目录直接清理。
- 根目录文档声称已经有 canonical archive 副本时，先验证 archive 目标真实存在，再决定删不删根目录版本。

### 旧 worktree 只能移植合同，不能移植旧结论
- 从旧 worktree 抢救功能时，先对照当前 main 的既有回归测试；颜色、数据、policy 这类 checked-in 合同以当前测试和现有数据为准。
- 拆出独立按钮时，payload 只带按钮承诺的字段；复用旧保存接口前要确认不会把同面板的未保存输入一并提交。

## 项目状态面板

### 异步闭环要有完成和失败 observer
- Project import / export 这类异步闭环要在事务完成和失败时通知 UI，不能只在按钮点击时写 started 状态。
- observer 只做旁路通知；observer 报错应记录为 observer failure，不能把已经成功的导入事务改判成失败。
- 保存状态类 live region 要接到 `markDirty` / `clearDirty` 共同路径，覆盖 appearance、transport、special zones 等跨入口编辑。

### 测试路由要展开聚合入口
- 具名 npm script 作为测试入口时，route registry 要递归展开到真实 leaf test 文件；只记录聚合脚本会让 agent 误判具体测试已经可定向运行。

### 静态合同要锁 owner 面，避免整文件误伤
- 为了禁止某个 owner 回退到 `innerHTML` 这类旧实现，测试应列出该 owner 的具体禁止 token；整文件级禁令会把无关 sidebar 改动也变成假失败。

### 局部 UI 类必须有作用域样式
- 新增 `.secondary-btn`、`.danger-btn` 这类局部按钮类时，要同时在对应工作台作用域内定义完整按钮状态；只创建 class 不补 CSS 会回落成浏览器默认控件。

### 窄侧栏长文本用 scoped grid
- 右侧栏诊断、审计这类窄面板里，长 id 与状态值不要复用通用 `justify-between` flex 行；用面板专属 grid、固定状态列和 `overflow-wrap:anywhere` 锁住横向宽度。
