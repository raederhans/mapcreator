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
    statsLabel: "Scenario Forge product statistics",
    productPreviewAlt: "Scenario Forge editor showing a world political map with side panels and toolbars.",
    workOneAlt: "A wide overview of Scenario Forge editing a global political scenario.",
    workTwoAlt: "Scenario Forge combining political ownership with night lights and labels.",
    workThreeAlt: "Scenario Forge showing multiple workspace UI panels for appearance, transport, color, and inspector controls.",
    chipBlank: "Blank",
    chipModern: "Modern",
    chipHoi4: "HOI4 1939",
    chipTno: "TNO 1962",
    statScenarios: "built-in scenarios",
    statCities: "world city points",
    statAliases: "city aliases",
    statCatalog: "cataloged data assets",
    statJapan: "Japan road + rail preview features",
    sourcesEyebrow: "Data sources",
    sourcesTitle: "Built on recognizable map data families.",
    sourcesBody:
      "Every source claim below is tied to checked-in manifests, ledgers, or build audits.",
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
      "Relief, bathymetry, and river context make the preview read like geography before the full editor opens.",
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
      "Each capability group is organized around a real creator workflow and the data contracts behind it.",
    featureGroupOneTitle: "Cartographic design",
    featureGroupOneBody:
      "Layer order, color palettes, borders, labels, legends, city points, water regions, and export-ready map presentation.",
    featurePointPalettes:
      "Mod palettes for HOI4, Kaiserreich, TNO, Red Flood, and Vanilla-style maps.",
    featurePointExport: "Export workbench with 1x-4x presentation snapshots.",
    featureGroupTwoTitle: "Scenario editing",
    featureGroupTwoBody:
      "Named world states, ownership, controller, frontlines, special regions, country metadata, and scenario-aware startup.",
    featurePointUndo: "80-step undo and redo for map editing sessions.",
    featurePointDistricts:
      "Administrative districts and hierarchy editing for deep scenario work.",
    featureGroupThreeTitle: "Spatial data and analysis",
    featureGroupThreeBody:
      "Source ledgers, asset catalogs, health checks, provenance sidecars, hierarchy data, and reusable geography pipelines.",
    featureGroupFourTitle: "Transport and infrastructure",
    featureGroupFourBody:
      "Road and rail previews are the current proof point; airports, ports, energy, industrial, and resource families are tracked as in-progress data packs.",
    featurePointTransport:
      "Japan roads, rail, airports, ports, energy, industry, logistics, and resource families.",
    featurePointAudits:
      "Source signatures and build audits keep infrastructure packs reproducible.",
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
    templatesEyebrow: "Scenario templates",
    templatesTitle: "Start from a real world state.",
    templatesBody:
      "The first action can be choosing the political universe, not rebuilding a base map.",
    templateBlankTag: "Clean base",
    templateBlankTitle: "Blank Map",
    templateModernTag: "Current world",
    templateModernTitle: "Modern World",
    templateHoi4Tag: "Strategy baseline",
    templateHoi4Title: "HOI4 1936 / 1939",
    templateTnoTag: "Alternate history",
    templateTnoTitle: "TNO 1962",
    dataEyebrow: "Data foundation",
    dataTitle: "A map product needs visible data trust.",
    dataBody:
      "Scenario Forge tracks source ledgers, asset catalogs, build audits, and provenance sidecars so map claims stay tied to real files.",
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
    casesTitle: "Show the workflows a map product should own.",
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
      "The current public surface is a live demo and repository. Creator, team, and cloud packaging are product directions for a later release.",
    roadmapEyebrow: "In progress",
    roadmapTitle: "Transparent about what is ready and what is not.",
    roadmapBody:
      "Scenario Forge already has a strong core. Some transport-related surfaces are still intentionally presented as work in progress.",
    roadmapStatusOne: "Active preview",
    roadmapOneTitle: "Transport workbench",
    roadmapOneBody:
      "The workbench already carries transport pack inspection, manifest review, and route-density preview into the product surface.",
    roadmapStatusTwo: "Mature sample",
    roadmapTwoTitle: "Japan road preview",
    roadmapTwoBody: "Currently the most mature transport sample inside the project.",
    roadmapStatusThree: "Shell stage",
    roadmapThreeTitle: "Rail and other infrastructure families",
    roadmapThreeBody:
      "Rail, airport, port, energy, industrial, logistics, and resource packs are moving through the same manifest-led pipeline.",
    updatesEyebrow: "What’s new",
    updatesTitle: "A product surface that keeps moving.",
    updateOneDate: "May 31, 2026",
    updateOneTitle: "Product-grade landing showcase",
    updateOneBody:
      "The homepage now exposes live preview, data trust, editions, use cases, and FAQ in the first product narrative.",
    updateTwoDate: "May 31, 2026",
    updateTwoTitle: "Cloud save foundation",
    updateTwoBody:
      "Local backend boundaries and shared project contracts are now visible as the foundation for future team surfaces.",
    updateThreeDate: "May 12, 2026",
    updateThreeTitle: "Cataloged data foundation",
    updateThreeBody:
      "The checked-in catalog tracks 487 assets across source ledgers, transport manifests, topology, palettes, and runtime data.",
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
    heroTitle: "把政治地图做成",
    heroTitleAccent: "能讲故事的作品。",
    heroBody:
      "从一个世界状态出发，改归属、调图层、加地理背景，最后导出一张能直接用于展示的地图。",
    heroPrimaryCta: "打开在线 Demo",
    heroSecondaryCta: "查看 GitHub",
    productPreviewLabel: "Scenario Forge 产品预览",
    productStageLabel: "Scenario Forge / 实时工作台",
    brandHomeLabel: "Scenario Forge 首页",
    primaryNavLabel: "主导航",
    languageSwitcherLabel: "语言切换",
    statsLabel: "Scenario Forge 产品数据",
    productPreviewAlt: "Scenario Forge 编辑器界面，展示世界政治地图、侧边面板和工具栏。",
    workOneAlt: "Scenario Forge 正在编辑全球政治场景的宽幅总览。",
    workTwoAlt: "Scenario Forge 将政治归属、夜间灯光和标签叠加在一起。",
    workThreeAlt: "Scenario Forge 展示外观、交通、颜色库和检查器等多个工作台界面选项。",
    chipBlank: "空白地图",
    chipModern: "现代世界",
    chipHoi4: "HOI4 1939",
    chipTno: "TNO 1962",
    statScenarios: "内置场景",
    statCities: "世界城市点",
    statAliases: "城市别名",
    statCatalog: "入库数据资产",
    statJapan: "日本道路与铁路预览要素",
    sourcesEyebrow: "数据来源",
    sourcesTitle: "数据来源清晰，可追溯。",
    sourcesBody: "主要数据都对应入库清单、来源台账或构建审计，便于回查来源和生成过程。",
    worksEyebrow: "作品预览",
    worksTitle: "先看成图效果。",
    worksBody: "成图效果更能说明 Scenario Forge 适合哪些制图任务。",
    workOneLabel: "架空历史基线",
    workOneTitle: "从一个有背景的世界开始。",
    workOneBody: "在不同世界状态之间切换，保留政治语境，从一开始就在有叙事背景的地图上工作。",
    workTwoLabel: "冲突与上下文",
    workTwoTitle: "把政治变化放回真实地理环境里。",
    workTwoBody: "把归属、标签、夜光和上下文图层组合起来，让编辑结果更接近可以展示的成图。",
    workThreeLabel: "Atlas 风格输出",
    workThreeTitle: "把工作台里的地图整理成成品。",
    workThreeBody: "减少视觉噪音，理清图层关系，再导出一张更像最终稿的地图。",
    previewEyebrow: "产品预览",
    previewTitle: "用日本数据包提供真实预览。",
    previewBody: "日本交通包是当前最完整的样例：道路和铁路预览已经入库，有数量统计，也能追到来源清单。",
    miniMapLabel: "日本数据预览",
    miniMapTitle: "在同一张预览图中查看道路、铁路、城市、地形和夜光。",
    miniMapBadge: "已入库样例",
    previewTabsLabel: "预览图层",
    previewTabTransport: "交通",
    previewTabCities: "城市",
    previewTabTerrain: "地形",
    previewTabNight: "夜光上下文",
    previewPanelTransportBadge: "日本道路 + 铁路",
    previewPanelTransportTitle: "道路预览 4794 个要素，铁路预览 1105 个要素。",
    previewPanelTransportBody: "这组数据来自已入库的日本交通清单，可以展示基础设施图层的实际价值。",
    previewPanelCitiesBadge: "城市点",
    previewPanelCitiesTitle: "展示城市锚点、标签和密度关系。",
    previewPanelCitiesBody: "城市点数据提供清晰的空间参照，帮助用户理解地图结构。",
    previewPanelTerrainBadge: "地形和物理上下文",
    previewPanelTerrainTitle: "地形、水深和河流让地图更像真实空间。",
    previewPanelTerrainBody: "这些物理图层会给政治地图增加地理背景，预览阶段就能看出空间关系。",
    previewPanelNightBadge: "夜光图层",
    previewPanelNightTitle: "夜光图层能补上人口和活动强度的线索。",
    previewPanelNightBody: "这个模式适合做展示地图、战役图集和高密度叙事导出。",
    whyEyebrow: "为什么是 Scenario Forge",
    whyTitle: "地缘政治制图需要更集中的工作流。",
    problemTitle: "常见工作流",
    problemOne: "政治状态在一个工具里画。",
    problemTwo: "标签和覆盖层又放到另一个工具里补。",
    problemThree: "导出和展示清理还要再换一套流程。",
    problemFour: "开始时缺少可以直接使用的场景基线。",
    solutionTitle: "Scenario Forge",
    solutionOne: "从一个命名世界状态开始。",
    solutionTwo: "在同一个工作台里调整归属、控制方和前线逻辑。",
    solutionThree: "直接叠加上下文图层和表现层。",
    solutionFour: "地图成型后，保存项目或导出结果。",
    workflowEyebrow: "工作流程",
    workflowTitle: "从场景基线到展示地图，流程更短。",
    stepOneTitle: "选一个世界状态",
    stepOneBody: "用 Blank Map、Modern World、HOI4 1936、HOI4 1939 或 TNO 1962 这样的基线，把工作起点放到明确场景里。",
    stepTwoTitle: "调整控制和归属",
    stepTwoBody: "直接调整谁拥有什么、谁控制什么，以及地图的政治阅读方式。",
    stepThreeTitle: "叠加图层并导出",
    stepThreeBody: "叠加河流、城市点、水域、特殊区域、图例和展示层，然后导出干净的 PNG 或 JPG。",
    featuresEyebrow: "产品能力",
    featuresTitle: "产品能力围绕真实制图流程组织。",
    featuresBody: "每组能力都对应创作者高频使用的操作，并与背后的数据合同保持一致。",
    featureGroupOneTitle: "制图设计",
    featureGroupOneBody: "图层顺序、调色板、边界、标签、图例、城市点、水域和可导出的地图呈现。",
    featurePointPalettes: "HOI4、Kaiserreich、TNO、Red Flood 和 Vanilla 风格调色板。",
    featurePointExport: "导出工作台支持 1x-4x 展示截图。",
    featureGroupTwoTitle: "场景编辑",
    featureGroupTwoBody: "命名世界状态、归属、控制方、前线、特殊区域、国家元数据和场景化启动。",
    featurePointUndo: "地图编辑会话支持 80 步撤销与重做。",
    featurePointDistricts: "行政区和层级编辑支撑更深的场景制作。",
    featureGroupThreeTitle: "空间数据与分析",
    featureGroupThreeBody: "来源台账、资产目录、健康检查、溯源文件、层级数据和可复用地理流水线。",
    featureGroupFourTitle: "交通与基础设施",
    featureGroupFourBody: "道路和铁路预览是当前核心样例；机场、港口、能源、工业和资源数据包也在同一方向上扩展。",
    featurePointTransport: "日本道路、铁路、机场、港口、能源、工业、物流和资源数据族。",
    featurePointAudits: "来源签名和构建审计让基础设施包可以复现。",
    featureGroupFiveTitle: "影像与上下文图层",
    featureGroupFiveBody: "地形、水深、等高线、河流、夜光、城市区域和物理语义，让地图具备更完整的地理背景。",
    featureGroupSixTitle: "项目管理",
    featureGroupSixBody: "本地保存回读、中英双语、导出流程、后续云端保存入口和可重复发布合同。",
    audienceEyebrow: "适合谁",
    audienceTitle: "面向需要用地图呈现场景的人。",
    audienceOne: "架空历史创作者",
    audienceTwo: "HOI4、TNO、Kaiserreich 模组作者",
    audienceThree: "场景与战役设计者",
    audienceFour: "地缘政治叙事创作者",
    audienceFive: "研究者与展示者",
    templatesEyebrow: "场景模板",
    templatesTitle: "从现成世界状态开始制作。",
    templatesBody: "第一步先选择政治宇宙，再在这个基础上继续编辑和展示。",
    templateBlankTag: "干净基线",
    templateBlankTitle: "Blank Map",
    templateModernTag: "当代世界",
    templateModernTitle: "Modern World",
    templateHoi4Tag: "策略基线",
    templateHoi4Title: "HOI4 1936 / 1939",
    templateTnoTag: "架空历史",
    templateTnoTitle: "TNO 1962",
    dataEyebrow: "数据基础",
    dataTitle: "数据可信度是产品能力的一部分。",
    dataBody: "Scenario Forge 会跟踪来源台账、资产目录、构建审计和溯源文件，让地图声明能够回到真实文件。",
    dataCardOneTag: "基础地理",
    dataCardOneTitle: "边界和聚落",
    dataCardOneBody: "Natural Earth、geoBoundaries、GeoNames、层级数据和国家规则资产，构成政治与聚落骨架。",
    dataCardTwoTag: "物理上下文",
    dataCardTwoTitle: "地形、水深、河流和物理语义",
    dataCardTwoBody: "NOAA ETOPO、水深包、等高线、河流和物理语义，让地图更接近真实地理空间。",
    dataCardThreeTag: "基础设施",
    dataCardThreeTitle: "带清单的交通包",
    dataCardThreeBody: "日本道路和铁路预览已经带清单入库，其他基础设施数据族也会沿着同一套流程扩展。",
    dataCardFourTag: "治理",
    dataCardFourTitle: "可入库、可复现、可检查",
    dataCardFourBody: "入库目录、来源台账、溯源文件和合同测试，会把来源声明固定到真实文件上。",
    editionsEyebrow: "版本与许可方向",
    editionsTitle: "当前试用方式与后续扩展方向。",
    editionOneBadge: "现在可用",
    editionOneTitle: "在线 Demo",
    editionOneBody: "打开浏览器工作台，探索内置场景，调整图层，并导出展示截图。",
    editionTwoBadge: "本地创作者流程",
    editionTwoTitle: "本地项目和可复现数据",
    editionTwoBody: "将场景工作保存在本地，检查数据资产，并在需要说明来源时查看来源清单。",
    editionThreeBadge: "未来方向",
    editionThreeTitle: "团队协作和云端能力",
    editionThreeBody: "后续可以继续发展云端保存、共享项目空间、权限发布和更大的数据包。",
    casesEyebrow: "样例用例",
    casesTitle: "典型工作流可以直接在地图产品中完成。",
    caseOneLabel: "战役图集",
    caseOneTitle: "制作一张 TNO 1962 政治简报图。",
    caseOneBody: "从命名世界状态开始，调整展示图层，叠加城市和水域上下文，导出适合场景简报的地图。",
    caseTwoLabel: "基础设施审阅",
    caseTwoTitle: "查看日本道路和铁路密度。",
    caseTwoBody: "使用预览数据包查看交通走廊、铁路枢纽、港口和运输条件，再进入更深入的编辑工作。",
    caseThreeLabel: "展示地图包",
    caseThreeTitle: "用同一块地理空间做出多种故事视图。",
    caseThreeBody: "在政治色、地形、夜光、城市和基础设施视图之间切换，准备一组统一的展示视觉。",
    faqEyebrow: "FAQ",
    faqTitle: "回应用户最关心的问题。",
    faqOneQuestion: "Scenario Forge 是 GIS 工具还是地图编辑器？",
    faqOneAnswer: "它是场景优先的地图工作台。它保留 GIS 式的数据纪律，同时把界面重点放在政治场景和展示输出上。",
    faqTwoQuestion: "它使用哪些数据来源？",
    faqTwoAnswer: "当前数据资产包括 Natural Earth、geoBoundaries、GeoNames、NOAA ETOPO、NASA Black Marble 风格夜光资产、OpenStreetMap、Geofabrik 和各国交通来源。",
    faqThreeQuestion: "它能离线使用吗？",
    faqThreeAnswer: "已入库的演示资产可以作为静态网页应用运行。更大的来源刷新和后端共享流程会使用本地工具或本地开发后端。",
    faqFourQuestion: "可以导出什么？",
    faqFourAnswer: "编辑器支持 PNG、JPG 这类展示截图，并把图层样式保留在地图工作台附近。",
    faqFiveQuestion: "交通图层成熟度如何？",
    faqFiveAnswer: "日本道路和铁路预览是当前最完整的样例。其他基础设施数据族会通过路线图说明成熟度。",
    faqSixQuestion: "许可模式是什么？",
    faqSixAnswer: "当前公开入口是在线演示和仓库。创作者版、团队版和云端包装属于后续产品方向。",
    roadmapEyebrow: "进行中",
    roadmapTitle: "明确展示已完成能力和进行中能力。",
    roadmapBody: "Scenario Forge 的核心方向已经清晰，交通相关能力仍在持续推进，因此这里会标明各项能力的成熟度。",
    roadmapStatusOne: "预览中",
    roadmapOneTitle: "交通工作台",
    roadmapOneBody: "交通工作台已经支持数据包检查、清单审阅和线路密度预览。",
    roadmapStatusTwo: "成熟样例",
    roadmapTwoTitle: "日本道路预览",
    roadmapTwoBody: "这是目前交通相关能力里最成熟的样例。",
    roadmapStatusThree: "框架阶段",
    roadmapThreeTitle: "铁路和其他基础设施族",
    roadmapThreeBody: "铁路、机场、港口、能源、工业、物流和资源数据包正在接入同一套清单驱动流水线。",
    updatesEyebrow: "最近更新",
    updatesTitle: "产品持续迭代中。",
    updateOneDate: "2026 年 5 月 31 日",
    updateOneTitle: "更完整的首页展示",
    updateOneBody: "首页现在将实时预览、数据可信度、版本方向、用例和 FAQ 纳入第一层产品叙事。",
    updateTwoDate: "2026 年 5 月 31 日",
    updateTwoTitle: "云端保存基础能力",
    updateTwoBody: "本地后端边界和共享项目合同，为后续团队协作能力打下基础。",
    updateThreeDate: "2026 年 5 月 12 日",
    updateThreeTitle: "数据入库基础",
    updateThreeBody: "入库目录跟踪 487 个资产，覆盖来源台账、交通清单、拓扑、调色板和运行时数据。",
    ctaEyebrow: "打开工作台",
    ctaTitle: "从想法到地图，下一步在编辑器里完成。",
    ctaBody: "展示页用于介绍产品，编辑器用于完成具体制图工作。",
    ctaPrimary: "打开在线 Demo",
    ctaSecondary: "浏览仓库",
    footerNote: "围绕场景感知地图数据、政治状态编辑和偏展示表达的上下文图层构建。",
    footerSources: "主要数据来源包括 Natural Earth、geoBoundaries、GeoNames、NOAA ETOPO、NASA Black Marble、OpenStreetMap 与 Geofabrik。",
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
  formatMetricNumbers(language);

  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, language);
  } catch (_error) {
    // noop
  }
}

function formatMetricNumbers(language) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const formatter = new Intl.NumberFormat(locale);
  document.querySelectorAll("[data-stat-value]").forEach((node) => {
    const value = Number.parseInt(node.getAttribute("data-stat-value") || "", 10);
    if (Number.isNaN(value)) return;
    node.textContent = formatter.format(value);
  });
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
