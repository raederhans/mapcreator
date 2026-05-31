const STORAGE_KEY = "scenario_forge_landing_lang";

const translations = {
  en: {
    skipLink: "Skip to content",
    navWorks: "Works",
    navWorkflow: "Workflow",
    navProduct: "Product",
    navFeatures: "Features",
    navData: "Data",
    navFaq: "FAQ",
    navRoadmap: "In progress",
    headerGithub: "GitHub",
    headerOpenApp: "Open demo",
    heroEyebrow: "Scenario-first political map workbench",
    heroTitle: "Forge political maps",
    heroTitleAccent: "that feel alive.",
    heroBody:
      "Build from a world state, reshape ownership and control, layer context, and export a map that can actually carry a story.",
    heroPrimaryCta: "Open live demo",
    heroSecondaryCta: "View on GitHub",
    productPreviewLabel: "Scenario Forge product preview",
    productStageLabel: "Scenario Forge / Live workspace",
    brandHomeLabel: "Scenario Forge home",
    primaryNavLabel: "Primary navigation",
    languageSwitcherLabel: "Language switcher",
    productPreviewAlt: "Scenario Forge editor showing a world political map with side panels and toolbars.",
    workOneAlt: "A wide overview of Scenario Forge editing a global political scenario.",
    workTwoAlt: "Scenario Forge combining political ownership with night lights and labels.",
    workThreeAlt: "Scenario Forge showing multiple workspace UI panels for appearance, transport, color, and inspector controls.",
    chipBlank: "Blank",
    chipModern: "Modern",
    chipHoi4: "HOI4 1939",
    chipTno: "TNO 1962",
    worksEyebrow: "Selected works",
    worksTitle: "Show the result first.",
    worksBody:
      "Scenario Forge is easiest to understand when you see the maps it can produce, not when you read a wall of feature names.",
    workOneLabel: "Alternate history baseline",
    workOneTitle: "Start from a scenario, not a blank canvas.",
    workOneBody:
      "Switch between named world states, keep political context intact, and begin from something that already carries narrative meaning.",
    workTwoLabel: "Conflict and context",
    workTwoTitle: "Overlay political change with real-world texture.",
    workTwoBody:
      "Blend ownership, labels, urban lights, and context layers to move from editor output toward presentation-ready storytelling.",
    workThreeLabel: "Atlas-style output",
    workThreeTitle: "Push toward a cleaner, calmer final map.",
    workThreeBody:
      "Dial back the noise, tune the layer stack, and export a map that reads like a finished visual, not just an internal workspace snapshot.",
    previewEyebrow: "Live product preview",
    previewTitle: "Use a real pilot dataset as the first thing people can touch.",
    previewBody:
      "The Japan transport pack is the strongest current sample: road and rail previews are checked in, counted, and tied back to source manifests.",
    miniMapLabel: "Japan pilot preview",
    miniMapTitle:
      "Road, rail, cities, terrain, and night-light context in one compact view.",
    miniMapBadge: "Checked-in sample",
    previewTabsLabel: "Preview layers",
    previewTabTransport: "Transport",
    previewTabCities: "Cities",
    previewTabTerrain: "Terrain",
    previewTabNight: "Night context",
    previewPanelTransportBadge: "Japan road + rail",
    previewPanelTransportTitle:
      "4794 road preview features and 1105 rail preview features.",
    previewPanelTransportBody:
      "Use the checked-in Japan transport manifests as a compact proof that infrastructure layers can become a real product surface.",
    previewPanelCitiesBadge: "City points",
    previewPanelCitiesTitle:
      "Show settlement anchors, labels, and density cues before opening the editor.",
    previewPanelCitiesBody:
      "The landing page can preview how world city assets become readable map context instead of a plain feature list.",
    previewPanelTerrainBadge: "Relief and physical context",
    previewPanelTerrainTitle:
      "Terrain, bathymetry, rivers, and physical semantics give the map a real surface.",
    previewPanelTerrainBody:
      "This turns cartographic styling into a visible product claim instead of a hidden appearance panel.",
    previewPanelNightBadge: "Night-light layer",
    previewPanelNightTitle:
      "Night-light and political overlays help the same geography tell a different story.",
    previewPanelNightBody:
      "Use this mode to explain presentation maps, campaign atlases, and dense storytelling exports.",
    whyEyebrow: "Why Scenario Forge",
    whyTitle: "Stop stitching five tools together to tell one geopolitical story.",
    problemTitle: "Typical workflow",
    problemOne: "One tool for painting political states.",
    problemTwo: "Another for labels or overlays.",
    problemThree: "Another for exports or presentation cleanup.",
    problemFour: "No real scenario baseline to start from.",
    solutionTitle: "Scenario Forge",
    solutionOne: "Begin from a named world state.",
    solutionTwo:
      "Repaint ownership, controller, and frontline logic inside one workspace.",
    solutionThree:
      "Layer context and presentation surfaces without leaving the tool.",
    solutionFour: "Save the project or export the result when the story is ready.",
    workflowEyebrow: "Workflow",
    workflowTitle: "A short path from baseline to story-ready map.",
    stepOneTitle: "Start from a world state",
    stepOneBody:
      "Use built-in baselines like Blank Map, Modern World, HOI4 1936, HOI4 1939, or TNO 1962 to begin from an explicit scenario frame.",
    stepTwoTitle: "Repaint control and ownership",
    stepTwoBody:
      "Shift who owns what, who controls what, and how the map should read politically without rebuilding the whole surface from scratch.",
    stepThreeTitle: "Layer context and export",
    stepThreeBody:
      "Add rivers, urban areas, city points, water regions, special zones, legends, and visual refinements, then export a clean PNG or JPG snapshot.",
    featuresEyebrow: "Product capabilities",
    featuresTitle: "Organized like a serious map product.",
    featuresBody:
      "Each capability group starts from what already exists and points toward the product surface it can become.",
    featureGroupOneTitle: "Cartographic design",
    featureGroupOneBody:
      "Layer order, color palettes, borders, labels, legends, city points, water regions, and export-ready map presentation.",
    featureGroupTwoTitle: "Scenario editing",
    featureGroupTwoBody:
      "Named world states, ownership, controller, frontlines, special regions, country metadata, and scenario-aware startup.",
    featureGroupThreeTitle: "Spatial data and analysis",
    featureGroupThreeBody:
      "Source ledgers, asset catalogs, health checks, provenance sidecars, hierarchy data, and reusable geography pipelines.",
    featureGroupFourTitle: "Transport and infrastructure",
    featureGroupFourBody:
      "Road and rail previews are the current proof point; airports, ports, energy, industrial, and resource families are tracked as in-progress data packs.",
    featureGroupFiveTitle: "Imagery and context layers",
    featureGroupFiveBody:
      "Relief, bathymetry, contours, rivers, night lights, urban areas, and physical semantics for richer map reading.",
    featureGroupSixTitle: "Project management",
    featureGroupSixBody:
      "Local save/load, bilingual UI, export workflows, future cloud save surfaces, and repeatable publishing contracts.",
    audienceEyebrow: "Built for",
    audienceTitle: "People who need the map to carry the scenario.",
    audienceOne: "Alternate-history creators",
    audienceTwo: "HOI4, TNO, and Kaiserreich modders",
    audienceThree: "Scenario and campaign designers",
    audienceFour: "Geopolitical storytellers",
    audienceFive: "Researchers and presenters",
    dataEyebrow: "Data foundation",
    dataTitle: "A map product needs visible data trust.",
    dataBody:
      "Scenario Forge already tracks source ledgers, asset catalogs, build audits, and provenance sidecars. The landing page should make that trust layer visible.",
    dataCardOneTag: "Base geography",
    dataCardOneTitle: "Boundaries and populated places",
    dataCardOneBody:
      "Natural Earth, geoBoundaries, GeoNames, hierarchy data, and country policy assets provide the political and settlement backbone.",
    dataCardTwoTag: "Physical context",
    dataCardTwoTitle: "Relief, bathymetry, rivers, and semantics",
    dataCardTwoBody:
      "NOAA ETOPO, bathymetry packs, contours, rivers, and physical semantics help maps read like geography instead of flat color blocks.",
    dataCardThreeTag: "Infrastructure",
    dataCardThreeTitle: "Transport packs with manifests",
    dataCardThreeBody:
      "Japan road and rail previews are checked in with manifests. Additional infrastructure families stay visible as expansion work.",
    dataCardFourTag: "Governance",
    dataCardFourTitle: "Cataloged, reproducible, and inspectable",
    dataCardFourBody:
      "The checked-in catalog, source ledger, provenance files, and strict contract tests keep source claims tied to files instead of marketing copy.",
    editionsEyebrow: "Editions and license direction",
    editionsTitle:
      "Explain how people can try it today and where the product can grow.",
    editionOneBadge: "Available now",
    editionOneTitle: "Live demo",
    editionOneBody:
      "Open the browser workbench, explore built-in scenarios, tune layers, and export presentation snapshots.",
    editionTwoBadge: "Local creator workflow",
    editionTwoTitle: "Project files and reproducible data",
    editionTwoBody:
      "Keep scenario work local, inspect data assets, and use source manifests when a map needs a clear provenance trail.",
    editionThreeBadge: "Future direction",
    editionThreeTitle: "Team and cloud surfaces",
    editionThreeBody:
      "Future product packaging can extend the backend direction into cloud saves, shared project spaces, permissioned publishing, and larger data packs.",
    casesEyebrow: "Sample use cases",
    casesTitle: "Show product stories without inventing customer claims.",
    caseOneLabel: "Campaign atlas",
    caseOneTitle: "Build a TNO 1962 political briefing map.",
    caseOneBody:
      "Start from a named world state, adjust presentation layers, add city and water context, and export a map ready for a scenario brief.",
    caseTwoLabel: "Infrastructure review",
    caseTwoTitle: "Inspect Japan road and rail density.",
    caseTwoBody:
      "Use preview packs to explain corridors, rail hubs, ports, and transport readiness before deeper editor work.",
    caseThreeLabel: "Presentation map pack",
    caseThreeTitle: "Turn one geography into multiple story views.",
    caseThreeBody:
      "Move between political color, terrain, night-light, city, and infrastructure views to prepare a consistent visual set.",
    faqEyebrow: "FAQ",
    faqTitle: "Answer the questions a real map product page creates.",
    faqOneQuestion: "Is Scenario Forge a GIS tool or a map editor?",
    faqOneAnswer:
      "It is a scenario-first map workbench. It borrows GIS-style data discipline, then focuses the interface around political scenarios and presentation output.",
    faqTwoQuestion: "What data sources does it use?",
    faqTwoAnswer:
      "The current asset families include Natural Earth, geoBoundaries, GeoNames, NOAA ETOPO, NASA Black Marble style night-light assets, OpenStreetMap, Geofabrik, and country transport sources.",
    faqThreeQuestion: "Can it work offline?",
    faqThreeAnswer:
      "The checked-in demo assets run as a static web app. Larger source refresh and backend sharing workflows use local tooling or the local development backend.",
    faqFourQuestion: "What can I export?",
    faqFourAnswer:
      "The editor supports presentation snapshots such as PNG and JPG, with layer styling kept close to the map workspace.",
    faqFiveQuestion: "How mature are the transport layers?",
    faqFiveAnswer:
      "Japan road and rail previews are the clearest current sample. Other infrastructure families are visible as expansion work and should be read through the in-progress roadmap.",
    faqSixQuestion: "What is the license model?",
    faqSixAnswer:
      "The current page should describe the demo and repository honestly, then leave room for future creator, team, and cloud editions after product packaging is formalized.",
    roadmapEyebrow: "In progress",
    roadmapTitle: "Transparent about what is ready and what is not.",
    roadmapBody:
      "Scenario Forge already has a strong core. Some transport-related surfaces are still intentionally presented as work in progress.",
    roadmapStatusOne: "Active preview",
    roadmapOneTitle: "Transport workbench",
    roadmapOneBody:
      "Partially complete. It exists, but it is not yet the center of the product story.",
    roadmapStatusTwo: "Mature sample",
    roadmapTwoTitle: "Japan road preview",
    roadmapTwoBody: "Currently the most mature transport sample inside the project.",
    roadmapStatusThree: "Shell stage",
    roadmapThreeTitle: "Rail and other infrastructure families",
    roadmapThreeBody:
      "Still closer to baseline or shell stage and should be treated as in-progress, not product-defining yet.",
    ctaEyebrow: "Ready to open the workbench?",
    ctaTitle: "Step into the editor when you want to move from idea to map.",
    ctaBody:
      "The showcase explains the product. The editor is where you actually shape the scenario.",
    ctaPrimary: "Open the live demo",
    ctaSecondary: "Browse the repository",
    footerNote:
      "Built from scenario-aware map data, political state editing, and presentation-focused context layers.",
    footerSources:
      "Major data families include Natural Earth, geoBoundaries, GeoNames, NOAA ETOPO, NASA Black Marble, OpenStreetMap, and Geofabrik.",
    footerDemo: "Open demo",
    footerGithub: "GitHub",
    metaTitle: "Scenario Forge — Scenario-first political map workbench",
    metaDescription:
      "Scenario Forge is a scenario-first political map workbench for alternate history, strategy modding, and geopolitical storytelling.",
    metaOgDescription:
      "Build political maps that start from a world state, reshape control, layer context, and export a story-ready result.",
  },
  zh: {
    skipLink: "跳到正文",
    navWorks: "作品",
    navWorkflow: "流程",
    navProduct: "产品",
    navFeatures: "能力",
    navData: "数据",
    navFaq: "FAQ",
    navRoadmap: "进行中",
    headerGithub: "GitHub",
    headerOpenApp: "打开 Demo",
    heroEyebrow: "场景优先的政治地图工作台",
    heroTitle: "让政治地图",
    heroTitleAccent: "真正带着故事活起来。",
    heroBody:
      "从一个世界状态出发，改写归属与控制，叠加上下文图层，再导出一张真的能讲故事的地图。",
    heroPrimaryCta: "打开在线 Demo",
    heroSecondaryCta: "查看 GitHub",
    productPreviewLabel: "Scenario Forge 产品预览",
    productStageLabel: "Scenario Forge / 实时工作台",
    brandHomeLabel: "Scenario Forge 首页",
    primaryNavLabel: "主导航",
    languageSwitcherLabel: "语言切换",
    productPreviewAlt: "Scenario Forge 编辑器界面，展示世界政治地图、侧边面板和工具栏。",
    workOneAlt: "Scenario Forge 正在编辑全球政治场景的宽幅总览。",
    workTwoAlt: "Scenario Forge 将政治归属、夜间灯光和标签叠加在一起。",
    workThreeAlt: "Scenario Forge 展示外观、交通、颜色库和检查器等多个工作台界面选项。",
    chipBlank: "空白地图",
    chipModern: "现代世界",
    chipHoi4: "HOI4 1939",
    chipTno: "TNO 1962",
    worksEyebrow: "作品预览",
    worksTitle: "先看结果，再理解工具。",
    worksBody: "Scenario Forge 最容易理解的地方，是它最终能做出什么样的地图结果。",
    workOneLabel: "架空历史基线",
    workOneTitle: "从场景开始，直接进入有语境的地图。",
    workOneBody: "在命名世界状态之间切换，保留政治语境，从一开始就站在有叙事意味的地图上工作。",
    workTwoLabel: "冲突与上下文",
    workTwoTitle: "把政治变化和真实世界纹理叠在一起。",
    workTwoBody: "把归属、标签、夜光和上下文图层组合起来，让地图从编辑结果更接近可展示的叙事成品。",
    workThreeLabel: "Atlas 风格输出",
    workThreeTitle: "把地图往更干净、更沉静的成品方向推。",
    workThreeBody: "收掉噪音，整理图层结构，再导出一张更像最终视觉而不是工作台快照的地图。",
    previewEyebrow: "产品预览",
    previewTitle: "把真实试点数据包做成用户能先摸一下的入口。",
    previewBody: "日本交通包是当前最强的样例：道路和铁路预览已经入库，有数量统计，也能回到来源清单。",
    miniMapLabel: "日本 pilot 预览",
    miniMapTitle: "在一个紧凑视图里看道路、铁路、城市、地形和夜光上下文。",
    miniMapBadge: "已入库样例",
    previewTabsLabel: "预览图层",
    previewTabTransport: "交通",
    previewTabCities: "城市",
    previewTabTerrain: "地形",
    previewTabNight: "夜光上下文",
    previewPanelTransportBadge: "日本道路 + 铁路",
    previewPanelTransportTitle: "道路预览 4794 个要素，铁路预览 1105 个要素。",
    previewPanelTransportBody: "用已入库的日本交通 manifest，证明基础设施图层可以成为真正的产品展示面。",
    previewPanelCitiesBadge: "城市点",
    previewPanelCitiesTitle: "在打开编辑器前，先展示聚落锚点、标签和密度线索。",
    previewPanelCitiesBody: "展示页可以让世界城市点数据变成可读地图语境，而不是一串功能名。",
    previewPanelTerrainBadge: "地形和物理上下文",
    previewPanelTerrainTitle: "地形、水深、河流和物理语义让地图有真实表面。",
    previewPanelTerrainBody: "这能把制图样式变成可见的产品承诺，而不是藏在外观面板里。",
    previewPanelNightBadge: "夜光图层",
    previewPanelNightTitle: "夜光和政治叠加能让同一块地理空间讲出不同故事。",
    previewPanelNightBody: "这个模式适合解释展示地图、战役图集和高密度叙事导出。",
    whyEyebrow: "为什么是 Scenario Forge",
    whyTitle: "别再为了讲一个地缘政治故事，把五个工具硬拼在一起。",
    problemTitle: "常见工作流",
    problemOne: "一个工具画政治状态。",
    problemTwo: "另一个工具补标签或覆盖层。",
    problemThree: "再找一个工具处理导出或展示清理。",
    problemFour: "一开始缺少真正可用的场景基线。",
    solutionTitle: "Scenario Forge",
    solutionOne: "直接从一个命名世界状态出发。",
    solutionTwo: "在同一个工作台里改归属、控制方与前线逻辑。",
    solutionThree: "不离开工具就能叠上下文和表现层。",
    solutionFour: "故事成熟之后，保存项目或直接导出结果。",
    workflowEyebrow: "工作流程",
    workflowTitle: "从基线到可讲故事地图，一条更短的路。",
    stepOneTitle: "从世界状态开始",
    stepOneBody: "用 Blank Map、Modern World、HOI4 1936、HOI4 1939 或 TNO 1962 这样的基线，把工作起点锁在明确场景上。",
    stepTwoTitle: "改写控制与归属",
    stepTwoBody: "不必重画整张底图，就能直接调整谁拥有什么、谁控制什么，以及地图应该如何在政治上被阅读。",
    stepThreeTitle: "叠图层并导出",
    stepThreeBody: "叠加河流、城市点、水域、特殊区域、图例和展示层，然后导出干净的 PNG 或 JPG。",
    featuresEyebrow: "产品能力",
    featuresTitle: "按真正的地图产品来组织。",
    featuresBody: "每个能力组都从现有基础出发，同时指向它未来能成为的产品表面。",
    featureGroupOneTitle: "制图设计",
    featureGroupOneBody: "图层顺序、调色板、边界、标签、图例、城市点、水域和可导出的地图呈现。",
    featureGroupTwoTitle: "场景编辑",
    featureGroupTwoBody: "命名世界状态、归属、控制方、前线、特殊区域、国家元数据和场景感知启动。",
    featureGroupThreeTitle: "空间数据与分析",
    featureGroupThreeBody: "来源台账、资产目录、健康检查、溯源附表、层级数据和可复用地理流水线。",
    featureGroupFourTitle: "交通与基础设施",
    featureGroupFourBody: "道路和铁路预览是当前样例核心；机场、港口、能源、工业和资源族作为进行中的数据包继续展示。",
    featureGroupFiveTitle: "影像与上下文图层",
    featureGroupFiveBody: "地形、水深、等高线、河流、夜光、城市区域和物理语义，让地图读起来更丰富。",
    featureGroupSixTitle: "项目管理",
    featureGroupSixBody: "本地保存回读、中英双语、导出流程、未来云端保存表面和可重复发布合同。",
    audienceEyebrow: "适合谁",
    audienceTitle: "适合那些需要让地图承载场景的人。",
    audienceOne: "架空历史创作者",
    audienceTwo: "HOI4、TNO、Kaiserreich 模组作者",
    audienceThree: "场景与战役设计者",
    audienceFour: "地缘政治叙事创作者",
    audienceFive: "研究者与展示者",
    dataEyebrow: "数据基础",
    dataTitle: "地图产品需要把数据可信度展示出来。",
    dataBody: "Scenario Forge 已经跟踪来源台账、资产目录、构建审计和溯源附表。展示页应该让这层可信度可见。",
    dataCardOneTag: "基础地理",
    dataCardOneTitle: "边界和聚落",
    dataCardOneBody: "Natural Earth、geoBoundaries、GeoNames、层级数据和国家规则资产，构成政治与聚落骨架。",
    dataCardTwoTag: "物理上下文",
    dataCardTwoTitle: "地形、水深、河流和语义",
    dataCardTwoBody: "NOAA ETOPO、水深包、等高线、河流和物理语义，让地图读起来像真实地理空间。",
    dataCardThreeTag: "基础设施",
    dataCardThreeTitle: "带清单的交通包",
    dataCardThreeBody: "日本道路和铁路预览已经带清单入库。其他基础设施族作为扩展工作保持可见。",
    dataCardFourTag: "治理",
    dataCardFourTitle: "可目录化、可复现、可检查",
    dataCardFourBody: "入库目录、来源台账、溯源文件和严格合同测试，让来源声明绑定到真实文件。",
    editionsEyebrow: "版本与许可方向",
    editionsTitle: "讲清楚现在怎么试用，以及产品未来能怎么成长。",
    editionOneBadge: "现在可用",
    editionOneTitle: "在线 Demo",
    editionOneBody: "打开浏览器工作台，探索内置场景，调图层，并导出展示截图。",
    editionTwoBadge: "本地创作者流程",
    editionTwoTitle: "项目文件和可复现数据",
    editionTwoBody: "把场景工作保存在本地，检查数据资产，并在地图需要溯源时使用来源清单。",
    editionThreeBadge: "未来方向",
    editionThreeTitle: "团队和云端表面",
    editionThreeBody: "未来产品包装可以沿着后端方向，继续发展云端保存、共享项目空间、权限发布和更大的数据包。",
    casesEyebrow: "样例用例",
    casesTitle: "用产品故事展示能力，同时保持客户声明诚实。",
    caseOneLabel: "战役图集",
    caseOneTitle: "制作一张 TNO 1962 政治 briefing 地图。",
    caseOneBody: "从命名世界状态开始，调整展示图层，叠加城市和水域上下文，导出适合场景简报的地图。",
    caseTwoLabel: "基础设施审阅",
    caseTwoTitle: "检查日本道路和铁路密度。",
    caseTwoBody: "用 preview pack 说明交通走廊、铁路枢纽、港口和运输准备度，再进入更深的编辑工作。",
    caseThreeLabel: "展示地图包",
    caseThreeTitle: "把同一块地理空间做成多种故事视图。",
    caseThreeBody: "在政治色、地形、夜光、城市和基础设施视图之间切换，准备一组统一的展示视觉。",
    faqEyebrow: "FAQ",
    faqTitle: "回答一个真实地图产品页面会引出的问题。",
    faqOneQuestion: "Scenario Forge 是 GIS 工具还是地图编辑器？",
    faqOneAnswer: "它是场景优先的地图工作台。它吸收 GIS 式数据纪律，然后把界面聚焦在政治场景和展示输出上。",
    faqTwoQuestion: "它使用哪些数据来源？",
    faqTwoAnswer: "当前资产家族包括 Natural Earth、geoBoundaries、GeoNames、NOAA ETOPO、NASA Black Marble 风格夜光资产、OpenStreetMap、Geofabrik 和各国交通来源。",
    faqThreeQuestion: "它能离线使用吗？",
    faqThreeAnswer: "已入库演示资产可以作为静态网页应用运行。更大的来源刷新和后端共享流程使用本地工具或本地开发后端。",
    faqFourQuestion: "可以导出什么？",
    faqFourAnswer: "编辑器支持 PNG、JPG 这类展示截图，并把图层样式保留在地图工作台附近。",
    faqFiveQuestion: "交通图层成熟度如何？",
    faqFiveAnswer: "日本道路和铁路预览是当前最清楚的样例。其他基础设施族作为扩展工作展示，并通过进行中路线图说明成熟度。",
    faqSixQuestion: "许可模式是什么？",
    faqSixAnswer: "当前页面应诚实描述 demo 和仓库，同时为未来创作者版、团队版和云端版本留下产品包装空间。",
    roadmapEyebrow: "进行中",
    roadmapTitle: "清楚说明什么已经可用，什么还没完成。",
    roadmapBody: "Scenario Forge 的核心已经很鲜明，但交通相关能力目前仍然是有意保持透明的进行中状态。",
    roadmapStatusOne: "预览中",
    roadmapOneTitle: "交通工作台",
    roadmapOneBody: "已经有基础，但还不是这个产品当下的主叙事中心。",
    roadmapStatusTwo: "成熟样例",
    roadmapTwoTitle: "日本道路预览",
    roadmapTwoBody: "目前是交通相关样例里最成熟的一块。",
    roadmapStatusThree: "Shell 阶段",
    roadmapThreeTitle: "铁路和其他基础设施族",
    roadmapThreeBody: "目前更接近基线或外壳阶段，应被视为进行中能力。",
    ctaEyebrow: "准备打开工作台了吗？",
    ctaTitle: "当你想从想法走到地图，就进入编辑器。",
    ctaBody: "展示页负责讲清楚产品，编辑器负责真正把场景落到地图上。",
    ctaPrimary: "打开在线 Demo",
    ctaSecondary: "浏览仓库",
    footerNote: "围绕场景感知地图数据、政治状态编辑和偏展示表达的上下文图层构建。",
    footerSources: "主要数据家族包括 Natural Earth、geoBoundaries、GeoNames、NOAA ETOPO、NASA Black Marble、OpenStreetMap 与 Geofabrik。",
    footerDemo: "打开 Demo",
    footerGithub: "GitHub",
    metaTitle: "Scenario Forge — 场景优先政治地图工作台",
    metaDescription: "Scenario Forge 是一个面向架空历史、策略模组制作与地缘政治叙事的场景优先政治地图工作台。",
    metaOgDescription: "从一个世界状态出发，改写控制与归属，叠加上下文图层，再导出成故事就绪的政治地图。",
  },
};

function getStoredLanguage() {
  try {
    const value = String(globalThis.localStorage?.getItem(STORAGE_KEY) || "").trim().toLowerCase();
    return value === "zh" ? "zh" : "en";
  } catch (_error) {
    return "en";
  }
}

function applyLanguage(language) {
  const copy = translations[language] || translations.en;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key || !(key in copy)) return;
    node.textContent = copy[key];
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    const key = node.getAttribute("data-i18n-aria-label");
    if (!key || !(key in copy)) return;
    node.setAttribute("aria-label", copy[key]);
  });

  document.querySelectorAll("[data-i18n-alt]").forEach((node) => {
    const key = node.getAttribute("data-i18n-alt");
    if (!key || !(key in copy)) return;
    node.setAttribute("alt", copy[key]);
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    const active = button.getAttribute("data-lang") === language;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  document.title = copy.metaTitle;
  const description = document.querySelector('meta[name="description"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const twitterDescription = document.querySelector('meta[name="twitter:description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');

  if (description) description.setAttribute("content", copy.metaDescription);
  if (ogDescription) ogDescription.setAttribute("content", copy.metaOgDescription);
  if (twitterDescription) twitterDescription.setAttribute("content", copy.metaDescription);
  if (ogTitle) ogTitle.setAttribute("content", copy.metaTitle);
  if (twitterTitle) twitterTitle.setAttribute("content", copy.metaTitle);

  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, language);
  } catch (_error) {
    // noop
  }
}

function initScrollReveal() {
  const motionQuery = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (motionQuery?.matches) return;

  const revealNodes = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!revealNodes.length) return;

  document.documentElement.dataset.reveal = "enabled";

  if (!("IntersectionObserver" in globalThis)) {
    revealNodes.forEach((node) => node.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
  );

  revealNodes.forEach((node) => observer.observe(node));
}

function initPreviewTabs() {
  const root = document.querySelector("[data-preview-root]");
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll("[data-preview-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-preview-panel]"));
  if (!tabs.length || !panels.length) return;

  const selectTab = (tab, shouldFocus = false) => {
    const mode = tab.getAttribute("data-preview-tab");
    if (!mode) return;
    root.dataset.previewMode = mode;

    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute("aria-selected", active ? "true" : "false");
      item.setAttribute("tabindex", active ? "0" : "-1");
    });

    panels.forEach((panel) => {
      panel.hidden = panel.getAttribute("data-preview-panel") !== mode;
    });

    if (shouldFocus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      const key = event.key;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
      event.preventDefault();

      let nextIndex = index;
      if (key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (key === "Home") nextIndex = 0;
      if (key === "End") nextIndex = tabs.length - 1;

      selectTab(tabs[nextIndex], true);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const initialLanguage = getStoredLanguage();
  applyLanguage(initialLanguage);
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(button.getAttribute("data-lang") === "zh" ? "zh" : "en");
    });
  });
  initPreviewTabs();
  initScrollReveal();
});
