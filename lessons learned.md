# Lessons Learned

只保留跨任务会反复复用的长期规则。重复口径合并到单处；一次性修补过程、已收口的窄问题、纯执行快照直接移除。

## 构建、发布与真相源

### canonical 输入只能有一份
- internal partial 才能当主输入，公开诊断文件和组合产物默认都当输出。
- 不要从最终组合产物反提取主输入，也不要让 local mirror 反向支配 canonical。
- 审核重构进度时，同时看代码、测试、checked-in 产物。

### materialize 和 publish 必须分开
- `materialize` 只生成产物，`publish` 只发布现有产物。
- UI 需要“保存后立即可见”时，显式串联 `materialize + publish`。
- 编辑器输出、bundle publish、startup supporting file publish 要分清边界。

### 多 scenario 能力必须整链 scenario-aware
- builder 一旦支持多个 scenario，默认输入、域规则、display 文案、bookmark、authoring input contract 都要一起切换。
- startup supporting file 进入 scenario 链路后，要直接正式化到 checkpoint artifact 和 scenario publish contract。
- delta / rule 文件只表达差量规则，full-pack 默认值继续放在 canonical 主输入。

### 发布链和审计链共享一套枚举
- 数据目录、健康检查、strict checker、catalog、audit 共用同一套 manifest 枚举规则。
- source recipe、build audit、签名和 checked-in 产物都做 repo-relative 真源校验。
- checked-in snapshot 只记录稳定事实，approval log 放在 strict 复验通过之后。

## 编辑器、状态与运行时边界

### 重逻辑先按事务边界拆
- 先找一笔完整 transaction 的输入输出，再抽 service / materializer。
- 入口函数理想状态只剩校验、锁、调用、提交、响应整形。
- service 下沉后，测试也切到真实写口。

### 锁语义覆盖真实并发模型
- owner-aware 锁至少建模 pid、thread、transaction。
- builder、dev server、checkpoint 等写链共用 scenario 级锁。
- 长流程开始前先看日志、退出码、锁文件。

### merged state 区分“缺失”和“明确为空”
- 回写 merged layer 前先判 `hasOwnProperty(layerKey)`。
- fallback layer 继续走既有 bundle/topology 路径。

### pending / settled 真状态先于保存与可见性
- optional asset 允许先编辑时，保存链先抓 pending canonical payload。
- per-scenario asset 的加载哨兵绑定 `activeScenarioId`，空对象不代表已加载。
- 打开面板先触发真实加载；保存前如果尚未 settled，就先加载并提示。

### 共享能力切换要整波次完成
- shared-variant cutover 同时切 preview、inspector、validator、builder 和 checked-in 产物。
- family toggle、master toggle、tab selection、active 项和 runtime capability 描述同一件事。
- loader 白名单、发布 allowlist、生成源、fetch 前路径校验一起收口。

## 渲染、性能与可见性

### render pass 维护单一生命周期
- 依赖场景 mask、atlas、canvas 尺寸、DPR、baseline 的 pass，在对应输入变化时统一失效。
- partial repaint 基线跟画布生命周期一起失效。
- 视觉资源未就绪时，可见 fallback 和交互目标保持一致。

### 性能优化先减阻塞边界
- startup 是 bundle-first 时，先缩 bundle 边界。
- coarse preload、非关键 metadata、focus detail prewarm 这类高成本工作优先移出首屏阻塞链。
- exact pass、mesh、contour、hit canvas 这类大成本路径先缓存可见集和 clean frame。
- 首屏政治填色 gate 只等待政治首帧所需 chunk。

### 调度与刷新语义必须精确
- `flushPending` 表达“只冲刷待处理工作”。
- exact-after-settle、defer、post-ready 只冲刷真实 pending；退出 defer 后补一次受控 flush。
- chunk promotion、视觉刷新、spatial、hit canvas 作为同一世代提交。
- chunked 场景首个可见帧要等真实 promotion 提交到 `selectionVersion`、`landData` 和 `colors`。

### 性能验证基于真实 idle
- benchmark idle 包含 runtime chunk work、post-commit replay、post-ready 基础设施任务。
- perf gate 变红时先在同机同环境重跑 HEAD，区分补丁回归和环境漂移。
- 黑帧、长任务、wheel idle、最终 sharpness、真正首屏完成时间分别记录。

## UI、交互与文案

### UI 改动先锁真实可见行为
- 对首屏、滚动、点击、summary、toolbar 这类可见路径，先保静态可见性，再做 reveal、defer 和批处理。
- Inspector 的批量动作默认绑定当前可见过滤结果，并先给影响数量预览。
- ready 文案、禁用态、可编辑性、真实 runtime capability 共用同一份 contract。
- 侧栏折叠这类布局变化最终由 `ResizeObserver` 锁住。
- 把 layout 刷新从 `resize` 切到自定义事件时，同步接上 toolbar / dock / context bar 等所有原 `resize` 订阅者。

### i18n 和容器绑定尊重 DOM 结构
- 带子节点的 summary / heading 容器不要整块写 `textContent`。
- routine i18n sweep 先 audit 再同步翻译；补 key 优先定点 patch。
- source-of-truth、baseline、runtime locale 一起同步。
- Cloud Saves / community 这类 JS 动态面板新增 copy 时，要同轮补 `data/locales.json` 和 `dist/app/data/locales.json`；数据源品牌名如 `OpenStreetMap`、`Natural Earth` 这类固定来源词要进 audit 的 non-translatable 规则，避免把来源标签误报成 UI 漏翻。

### Project 状态类异步闭环要完整
- import / export 这类异步闭环在事务完成和失败时都通知 UI。
- observer 只做旁路通知，observer failure 不改判已成功事务。
- 保存状态类 live region 接到 `markDirty` / `clearDirty` 共同路径。

## 测试、审计与留档

### review lane 的职责是暴露真实缺口
- 红灯保留为显式风险。
- static contract 从 E2E 拆出后，要接入具名入口和现有路由体系。
- selector explain、列表入口、变更入口、grep 规则、workflow paths 共用同一份真相源。
- source replacement 经公开源复核确认缺少可用几何时，要写入 source-review metadata 并退出 actionable 队列，避免同一个不可替换候选被重复重开。

### 测试锁真实合同
- 新边界优先补 source contract、node contract、targeted Python contract，再决定是否上更重的 E2E。
- static contract 进入具名入口后，route registry 递归展开到真实 leaf test 文件。
- owner boundary 测试锁具体 owner token，避免整文件级禁令误伤。
- 退休一个 spec 时，同步删除 manifest、test list、allowlist、引用关系。
- data URL harness、import-safe tool、CLI/library mode 这类特殊运行环境单独有合同。

### 留档要短、准、可清理
- active 目录只保留当前仍在推进的主线。
- 任务已完成、验证已补齐、后续故事转入别的 active 目录时，原目录立刻归档。
- archive 里保留可复用的计划、上下文、任务闭环；空目录和纯残留目录直接清理。
- 根目录文档如果声称已有 canonical archive 副本，先验证 archive 目标真实存在。

### 旧 worktree 只移植合同
- 从旧 worktree 抢救功能时，先对照当前 main 的既有回归测试。
- 颜色、数据、policy 这类 checked-in 合同以当前测试和现有数据为准。
- 拆出独立按钮时，payload 只带按钮承诺的字段。

### source/dist 同步先看漂移范围
- 如果源码和 `dist/app` 已有历史漂移，共享大文件优先做 scoped patch。
- 修改 `dist/pages-dist-manifest.json` 时，顺手复核自引用尺寸记录。
- 重建拓扑产物时先确认非目标 layer 合同是否能过；如果 full builder 被旧 layer 元数据挡住，targeted rebuild 只能替换本轮 owned layer，并要补数据级验收。
- 被 strict 合同按字节 hash 的 scenario JSON 必须在 `.gitattributes` 明确 `eol=lf`，否则 Windows checkout 会让本地 strict 误报指纹漂移。
- Marine Regions source snapshot 接近 GitHub 100MiB 限制时，要把简化规则写进 source spec/provenance，比如 `snapshot_simplify_tolerance`；只压最终 water feature 会留下不可推送的大 snapshot。
- 只改 water layer 时，优先在现有 `runtime_topology.topo.json` 上替换 `scenario_water`；从 political/land/context 反提再重建会丢失独立的 `scenario_atlantropa` 对象。
- open-ocean 扣减后沿用既有 `component_min_area` 裁剪合同，避免生成小碎片打破 component 上限。

### 浏览器原生 zoom 是独立渲染输入
- `devicePixelRatio` 可能降到 1 以下且被 runtime DPR 上限/下限钳住；监听到 browser zoom 时仍要强制失效 overlay/texture pass。
- DPR 监听用 `matchMedia("(resolution: ...dppx)")` 后，每次 change 都重新绑定当前 DPR 查询。
- 侧栏 resize 期间 `setRenderPhase("interacting")` 可能先更新 canvas size；后续 resize handler 仍要识别这次尺寸变化并继续执行 projection fit / zoom reset。

### 异步闭环要有完成和失败 observer
- Project import / export 这类异步闭环要在事务完成和失败时通知 UI，不能只在按钮点击时写 started 状态。
- observer 只做旁路通知；observer 报错应记录为 observer failure，不能把已经成功的导入事务改判成失败。
- 保存状态类 live region 要接到 `markDirty` / `clearDirty` 共同路径，覆盖 appearance、transport、special zones 等跨入口编辑。
- 公开分享、community download、已登录读取要共用 public DTO / allowlist，避免旁路泄露本地私有字段。

### inspector 聚合只放展示层
- Water Region 这类由碎片 feature 组成的列表可以合并显示；selection、history、override 仍保存真实 feature id 数组。

### 场景颜色要显式声明管理权
- 手工、controller-only、生成型国家颜色需要写入 `color_policy: "locked"`；缺少 policy 的 checked-in 场景色会在重建时被 palette audit 同步回去。
- startup cache key 要包含 `countries_sha256`；只改国家颜色时，runtime topology hash 不变，缺少 countries hash 会让浏览器继续读取旧 IndexedDB 场景启动缓存。

### 静态合同要锁 owner 面，避免整文件误伤
- 为了禁止某个 owner 回退到 `innerHTML` 这类旧实现，测试应列出该 owner 的具体禁止 token；整文件级禁令会把无关 sidebar 改动也变成假失败。

### 局部 UI 类必须有作用域样式
- 新增 `.secondary-btn`、`.danger-btn` 这类局部按钮类时，要同时在对应工作台作用域内定义完整按钮状态；只创建 class 不补 CSS 会回落成浏览器默认控件。

### 窄侧栏长文本用 scoped grid
- 右侧栏诊断、审计这类窄面板里，长 id 与状态值不要复用通用 `justify-between` flex 行；用面板专属 grid、固定状态列和 `overflow-wrap:anywhere` 锁住横向宽度。

### worktree 补丁要锚定真实路径
- 在隔离 worktree 开发时，`apply_patch` 使用 worktree 绝对路径；工具默认根目录可能仍指向主 checkout。

### 同步 dist/app 时先判断漂移范围
- 如果源码和 `dist/app` 已经存在历史漂移，CSS 这类共享大文件优先做 scoped patch；全量复制前先看 diff，否则会把无关旧差异卷进当前任务。

### Quickbar 复用开发工具动作要锁行为
- quickbar 新按钮如果代理点击主开发工具按钮，要同时加 source/dist 镜像合同和轻量 node 行为测试；只查 token 容易漏掉“代理到了按钮但行为已变”的回退。

### 手改 dist manifest 要同步自引用尺寸
- 直接修改 `dist/app` 和 `dist/pages-dist-manifest.json` 时，除了改动文件本身的 `size_bytes`，还要复查 `pages-dist-manifest.json` 自己的尺寸记录；`tests.test_pages_dist_startup_shell` 会校验这个自引用值。

### 本地后端接入要同时锁 API 和 UI 状态机
- 同源后端即使只是本地开发框架，私有读接口也要走 dev token / same-origin 边界；GET 读取用户数据时不能弱于 POST。
- UI 的“已加载 / 已发布”状态要绑定真实事务完成点；异步导入只启动时，应写 started 状态，把 success/error 留给 callback。

### shell 兜底可见性要分清集合级和要素级
- shell-only runtime 集合是否能当政治底图，和单个 shell fallback 是否能参与视觉填色，是两个不同 gate；集合级过滤保 startup 安全，要素级视觉过滤保承重补洞。
- 只允许视觉填色的兜底块要在政治 pass 中先画成 underlay，再让 detail feature 覆盖，并用行为级 fixture 锁住“可见但不可交互”。

### 交通工作台数据必须带渲染契约字段
- 非 Japan 交通 pack 不能只满足 manifest 合同；点状 preview 还需要 `clip_bbox` 投影路径，以及工作台筛选会读取的 `airport_type/status_category`、`legal_designation/manager_type_code`、facility subtype/status 等字段。

### 社区后台要先分清用户视角和管理视角
- 后台预览页要把游客社区、登录用户中心、管理员治理面板拆成独立状态机；登录框、注册框和治理动作混在同一屏会掩盖权限边界。

### startup chunk visual gate 要等真实 selection
- readonly startup 下首个 chunk visual gate 需要等到 `selectionVersion`、政治 chunk、`landData` 和 `colors` 一起就绪；只等 pending promotion 清空会把“尚未开始 selection”误判成失败。
- Playwright 长套件使用任务专属 `--output` 目录，避免清理整棵 `.runtime/tests/playwright` 导致测试启动阶段长时间无输出。

### scenario checkpoint 要固定到已验证目录
- 只改 reviewed exceptions 这类输入会改变默认 checkpoint hash；后续只刷新 geo-locale/support 时，要显式传入已验证 checkpoint 目录，避免从空 checkpoint 误触 countries rebuild。
- 发布 water 几何前先让 builder 复用已验证 checkpoint；从旧 checkpoint 全量重建会把非目标 global ocean 拓扑问题提前拉进本轮发布。
- checked-in `water_regions.geojson` 已经通过 D3 几何验证时，水域窄发布应直接替换 runtime topology 的 `scenario_water`，避免再次调用 full water generator 或 source split 步骤引入旧拓扑失败。
- water changed-domain 在 safe repair/startup bundle 之前要从 checked-in `water_regions.geojson` 同步 `manifest.summary` 和 `audit.summary`，否则 bundle subset 会保留旧 water count。

### 主图 transport 恢复不能写死 family 列表
- project import/export 保存的是已 Apply 到主图的 pack 身份；恢复时应从已保存的 family map 读取，并用主图 pack registry 过滤 workbench-only pack。

### no-bundler 依赖要同步 vendor 和 Pages manifest
- 给浏览器端新增 npm 依赖时，要把可直接 import 的 ESM 文件 vendored 到 `vendor/`，再跑 `verify:pages-dist` 确认 `dist/app/vendor` 和 `pages-dist-manifest.json` 同步。

### 项目 ZIP 导入要同时锁完整性和预算
- 可编辑项目包的 `manifest.json` 要作为严格合同校验，至少锁所选项目文件路径和 checksum。
- ZIP 导入要同时限制压缩包体积、entry 数和解压后总字节，避免坏包绕过预览路径拖垮浏览器。

### Transport carrier 切换要锁异步代次和数据合同
- carrier / pack 切换会并发触发 manifest、audit、pack、carrier asset 加载；每条异步链路都要带 generation，过期结果不能回写新状态。
- pack manifest 的 `carrier_asset_key` 只解决路由；`extensions.carrier` 还要带 scope/projection/basemap 元数据，并由 builder 统一写入 checked-in 数据。
- carrier rebuild 后要同时跑 manifest 合同、catalog 检查和 `verify:pages-dist`，俄罗斯这类跨境外观数据还要用 provenance 锁住真实行政代码范围。

### 公开 catalog 要进入 manifest 治理面
- 通过 palette registry 或 runtime asset registry 暴露的新数据入口，要同步写入 artifact contract 并刷新 `data/manifest.json`，否则 catalog 可见但 hash/owner 治理链会漂。

### 子海域拆分要锁 sibling 合同
- 新增 source-backed child waters 时，除了父水域 subtraction，还要给 sibling non-overlap 和 detail `water_type` 加 focused contract，避免相邻子海域或类型语义在后续批次漂移。

### 大批量图片目录要有实体合同
- catalog 入口只登记 manifest JSON 时，要另加实体文件合同校验路径、数量、大小和 hash；否则批量 PNG 丢文件也可能绕过 data health。

### runtime registry 新资产要同步 Pages 发布面
- 新增浏览器直接读取的 `runtime_asset_registry` key 后，要同步 `tools/build_pages_dist.py` 的 allowlist 和 `tests.test_pages_dist_startup_shell`；source 下能读取不代表 Pages dist 已发布。
