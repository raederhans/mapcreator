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
    productPreviewLabel: "Scenario Forge generated cartography preview",
    productStageLabel: "Scenario Forge / Generated atlas",
    heroChipsLabel: "Hero scenario style",
    heroMapHudOne: "Political baseline",
    heroMapHudTwo: "Routes + lights",
    heroMapLegend: "Scenario layer stack",
    brandHomeLabel: "Scenario Forge home",
    primaryNavLabel: "Primary navigation",
    languageSwitcherLabel: "Language switcher",
    statsLabel: "Scenario Forge product statistics",
    productPreviewAlt:
      "Generated Scenario Forge HOI4 1936 political map with borders and capital labels.",
    heroAltBlank: "Generated neutral blank Europe map with land, water, borders, and grid lines.",
    heroAltHoi41936: "Generated Scenario Forge HOI4 1936 Europe political map with capital labels.",
    heroAltHoi41939: "Generated Scenario Forge HOI4 1939 Europe political map with capital labels.",
    heroAltTno1962: "Generated Scenario Forge TNO 1962 Europe political map with Atlantropa context and capital labels.",
    workOneAlt:
      "Generated Scenario Forge showcase map with political borders, route overlays, and scenario labels.",
    workTwoAlt: "Generated Japan preview map with night-light context and transport cues.",
    workThreeAlt: "Generated modern world scenario template map.",
    chipBlank: "Blank",
    chipHoi41936: "HOI4 1936",
    chipHoi41939: "HOI4 1939",
    chipTno1962: "TNO 1962",
    statScenarios: "built-in scenarios",
    statCities: "world city points",
    statAliases: "city aliases",
    statCatalog: "map-ready data assets",
    statJapan: "Japan transport map features",
    sourcesEyebrow: "Data sources",
    sourcesTitle: "Built on recognizable map data families.",
    sourcesBody:
      "Open any source button to see the public dataset or repository behind the maps.",
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
    showcaseEyebrow: "Cartography showcase",
    showcaseTitle:
      "A scenario page should look like it already knows how maps behave.",
    showcaseBody:
      "This Europe view is generated from the same scenario, topology, capital, and rail data that power the map workbench.",
    showcaseAlt: "Europe 1936 generated scenario showcase map.",
    showcaseMapLabel: "Europe 1936 generated scenario showcase map",
    showcaseLayerTabsLabel: "Europe 1936 showcase layers",
    showcaseLayerPolitical: "Political",
    showcaseLayerRail: "Rail",
    showcaseLayerCities: "Cities",
    showcaseLayerDayNight: "Day-Night",
    showcaseLayerPoliticalBadge: "HOI4 1936 Europe",
    showcaseLayerPoliticalTitle:
      "Political ownership comes from the 1936 scenario data.",
    showcaseLayerPoliticalBody:
      "The map colors European territory through Scenario Forge's HOI4 1936 ownership table and country palette.",
    showcaseLayerRailBadge: "Europe rail network",
    showcaseLayerRailTitle: "Rail corridors come from the global rail source.",
    showcaseLayerRailBody:
      "The rail layer samples visible European lines from the OpenStreetMap-derived transport package.",
    showcaseLayerCitiesBadge: "Capital anchors",
    showcaseLayerCitiesTitle: "Capitals make the scenario readable at a glance.",
    showcaseLayerCitiesBody:
      "City markers use the HOI4 1936 capital hints table, so Berlin, Paris, London, Warsaw, Rome, and other anchors stay tied to scenario data.",
    showcaseLayerDayNightBadge: "Day-night cycle",
    showcaseLayerDayNightTitle: "A moving day-night pass makes context layers feel alive.",
    showcaseLayerDayNightBody:
      "The overlay combines the Europe scenario map with animated night shade and capital lights, echoing the night-light context used elsewhere in the product.",
    showcaseMeta:
      "Generated from HOI4 1936 ownership, Europe topology, capital hints, and Europe rail data.",
    previewEyebrow: "Live product preview",
    previewTitle: "Preview real transport layers before opening the editor.",
    previewBody:
      "The Japan view samples real Japan transport and geography data so visitors can read the map before opening the editor.",
    miniMapLabel: "Japan pilot preview",
    miniMapTitle:
      "A readable sample of Japan roads, rail, cities, terrain, rivers, and night-light context.",
    miniMapBadge: "Interactive preview",
    previewTabsLabel: "Preview layers",
    previewTabTransport: "Transport",
    previewTabCities: "Cities",
    previewTabTerrain: "Terrain",
    previewTabNight: "Night context",
    previewPanelTransportBadge: "Japan road + rail",
    previewPanelTransportTitle:
      "The preview renders 260 road lines and 160 rail lines from Japan transport data.",
    previewPanelTransportBody:
      "Use this view to judge corridor density, railway continuity, and major station anchors before entering the editor.",
    previewPanelCitiesBadge: "City points",
    previewPanelCitiesTitle:
      "The city mode samples 32 recognizable anchors from the Japan city catalog.",
    previewPanelCitiesBody:
      "City points make the transport preview easier to read by tying routes to familiar regional hubs.",
    previewPanelTerrainBadge: "Relief and physical context",
    previewPanelTerrainTitle:
      "Terrain mode adds real contour and river data around the Japan map base.",
    previewPanelTerrainBody:
      "Physical context helps users see where corridors meet mountains, coastlines, and river systems.",
    previewPanelNightBadge: "Night-light layer",
    previewPanelNightTitle:
      "Night mode samples 88 light points from Black Marble and historical city anchors.",
    previewPanelNightBody:
      "This mode shows how population and activity context can sit on the same transport geography.",
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
      "Each capability group supports a real creator workflow, from editing political states to exporting presentation maps.",
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
      "Boundaries, settlements, hierarchy data, physical context, and source links that help maps stay readable and trustworthy.",
    featureGroupFourTitle: "Transport and infrastructure",
    featureGroupFourBody:
      "Roads and rail are already visible in the Japan preview, with airports, ports, energy, industry, and resources forming the next infrastructure views.",
    featurePointTransport:
      "Japan roads, rail, airports, ports, energy, industry, logistics, and resource families.",
    featurePointAudits:
      "Source links help reviewers understand where infrastructure layers come from.",
    featureGroupFiveTitle: "Imagery and context layers",
    featureGroupFiveBody:
      "Relief, bathymetry, contours, rivers, night lights, urban areas, and physical semantics for richer map reading.",
    featureGroupSixTitle: "Project management",
    featureGroupSixBody:
      "Local save/load, bilingual UI, export workflows, and future team surfaces for sharing map projects.",
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
    templateBlankAlt: "Generated blank map scenario template.",
    templateModernAlt: "Generated modern world scenario template.",
    templateHoi4Alt: "Generated strategy baseline scenario template.",
    templateTnoAlt: "Generated alternate-history scenario template.",
    dataEyebrow: "Data foundation",
    dataTitle: "A map product needs visible data trust.",
    dataBody:
      "Scenario Forge keeps source links close to the map experience, so viewers can understand where boundaries, places, terrain, and transport layers come from.",
    dataCardOneTag: "Base geography",
    dataCardOneTitle: "Boundaries and populated places",
    dataCardOneBody:
      "Natural Earth, geoBoundaries, GeoNames, hierarchy data, and country policy assets provide the political and settlement backbone.",
    dataCardTwoTag: "Physical context",
    dataCardTwoTitle: "Relief, bathymetry, rivers, and semantics",
    dataCardTwoBody:
      "NOAA ETOPO, bathymetry packs, contours, rivers, and physical semantics help maps read like geography instead of flat color blocks.",
    dataCardThreeTag: "Infrastructure",
    dataCardThreeTitle: "Transport layers you can inspect",
    dataCardThreeBody:
      "Japan roads and railways already appear as visible map layers. More infrastructure views can grow from the same product pattern.",
    dataCardFourTag: "Governance",
    dataCardFourTitle: "Traceable from source to map",
    dataCardFourBody:
      "Every public source button points to a real dataset family, making the data foundation easier to evaluate.",
    editionsEyebrow: "Editions and license direction",
    editionsTitle:
      "Explain how people can try it today and where the product can grow.",
    editionOneBadge: "Available now",
    editionOneTitle: "Live demo",
    editionOneBody:
      "Open the browser workbench, explore built-in scenarios, tune layers, and export presentation snapshots.",
    editionTwoBadge: "Local creator workflow",
    editionTwoTitle: "Project files and traceable data",
    editionTwoBody:
      "Keep scenario work local, inspect map layers, and use source links when a map needs a clear data trail.",
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
      "Use the preview to explain corridors, rail hubs, ports, and transport readiness before deeper editor work.",
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
      "The public demo can run as a static web app in the browser. Larger refresh and sharing workflows belong to the local creator setup.",
    faqFourQuestion: "What can I export?",
    faqFourAnswer:
      "The editor supports presentation snapshots such as PNG and JPG, with layer styling kept close to the map workspace.",
    faqFiveQuestion: "How mature are the transport layers?",
    faqFiveAnswer:
      "Japan roads and railways are the clearest current transport view. Other infrastructure families are shown as upcoming product areas.",
    faqSixQuestion: "What is the license model?",
    faqSixAnswer:
      "The current public surface is a live demo and repository. Creator, team, and cloud packaging are future product directions.",
    roadmapEyebrow: "In progress",
    roadmapTitle: "Transparent about what is ready and what is not.",
    roadmapBody:
      "Scenario Forge already has a strong core. Some transport-related surfaces are still intentionally presented as work in progress.",
    roadmapStatusOne: "Active preview",
    roadmapOneTitle: "Transport workbench",
    roadmapOneBody:
      "The workbench already lets users inspect transport layers and understand route density inside the map experience.",
    roadmapStatusTwo: "Ready view",
    roadmapTwoTitle: "Japan road preview",
    roadmapTwoBody: "Currently the clearest transport view available in the product.",
    roadmapStatusThree: "Shell stage",
    roadmapThreeTitle: "Rail and other infrastructure families",
    roadmapThreeBody:
      "Rail, airport, port, energy, industry, logistics, and resource views are expanding from the same map-layer pattern.",
    updatesEyebrow: "What’s new",
    updatesTitle: "A product surface that keeps moving.",
    updateOneDate: "May 31, 2026",
    updateOneTitle: "Product-grade landing showcase",
    updateOneBody:
      "The homepage now gives visitors a faster path from product promise to visible maps, use cases, and answers.",
    updateTwoDate: "May 31, 2026",
    updateTwoTitle: "Cloud save foundation",
    updateTwoBody:
      "The local creator setup now supports a clearer path toward future shared project spaces.",
    updateThreeDate: "May 12, 2026",
    updateThreeTitle: "Map data foundation",
    updateThreeBody:
      "The data foundation now covers 641 map assets across geography, transport, palettes, and runtime views.",
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
    productPreviewLabel: "Scenario Forge 生成式制图预览",
    productStageLabel: "Scenario Forge / 生成图集",
    heroChipsLabel: "首屏场景风格",
    heroMapHudOne: "政治基线",
    heroMapHudTwo: "路线与夜光",
    heroMapLegend: "场景图层栈",
    brandHomeLabel: "Scenario Forge 首页",
    primaryNavLabel: "主导航",
    languageSwitcherLabel: "语言切换",
    statsLabel: "Scenario Forge 产品数据",
    productPreviewAlt: "生成式 Scenario Forge HOI4 1936 欧洲政治地图，包含边界和首都标签。",
    heroAltBlank: "生成式中性欧洲空白地图，包含陆地、水域、边界和网格线。",
    heroAltHoi41936: "生成式 Scenario Forge HOI4 1936 欧洲政治地图，包含首都标签。",
    heroAltHoi41939: "生成式 Scenario Forge HOI4 1939 欧洲政治地图，包含首都标签。",
    heroAltTno1962: "生成式 Scenario Forge TNO 1962 欧洲政治地图，包含 Atlantropa 上下文和首都标签。",
    workOneAlt: "生成式 Scenario Forge 展示地图，包含政治边界、路线覆盖层和场景标签。",
    workTwoAlt: "生成式日本预览图，展示夜光上下文和交通线索。",
    workThreeAlt: "生成式现代世界场景模板地图。",
    chipBlank: "空白地图",
    chipHoi41936: "HOI4 1936",
    chipHoi41939: "HOI4 1939",
    chipTno1962: "TNO 1962",
    statScenarios: "内置场景",
    statCities: "世界城市点",
    statAliases: "城市别名",
    statCatalog: "地图数据资源",
    statJapan: "日本交通地图要素",
    sourcesEyebrow: "数据来源",
    sourcesTitle: "数据来源清晰，可追溯。",
    sourcesBody: "点击任意来源按钮，就能查看地图背后的公开数据集或仓库。",
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
    showcaseEyebrow: "制图展示",
    showcaseTitle: "场景页面应该一眼看起来就懂地图。",
    showcaseBody: "这张欧洲视图由场景、拓扑、首都和铁路数据生成，和地图工作台使用同一批数据来源。",
    showcaseAlt: "欧洲 1936 场景展示地图。",
    showcaseMapLabel: "欧洲 1936 场景展示地图",
    showcaseLayerTabsLabel: "欧洲 1936 展示图层",
    showcaseLayerPolitical: "政治",
    showcaseLayerRail: "铁路",
    showcaseLayerCities: "城市",
    showcaseLayerDayNight: "昼夜",
    showcaseLayerPoliticalBadge: "HOI4 1936 欧洲",
    showcaseLayerPoliticalTitle: "政治归属来自 1936 场景数据。",
    showcaseLayerPoliticalBody: "欧洲地块颜色来自仓库中的 HOI4 1936 归属表和国家配色。",
    showcaseLayerRailBadge: "欧洲铁路网络",
    showcaseLayerRailTitle: "铁路走廊来自 global rail 数据源。",
    showcaseLayerRailBody: "铁路图层从仓库中 OpenStreetMap 衍生交通包里抽取欧洲可见线路。",
    showcaseLayerCitiesBadge: "首都锚点",
    showcaseLayerCitiesTitle: "首都点让场景一眼可读。",
    showcaseLayerCitiesBody: "城市标记使用 HOI4 1936 首都提示表，让柏林、巴黎、伦敦、华沙、罗马等锚点对应真实场景数据。",
    showcaseLayerDayNightBadge: "昼夜循环",
    showcaseLayerDayNightTitle: "昼夜变化让上下文图层更有生命感。",
    showcaseLayerDayNightBody: "这一层把欧洲场景地图、移动夜色和首都光点组合起来，对应产品里的夜光上下文能力。",
    showcaseMeta: "由 HOI4 1936 归属、欧洲拓扑、首都提示和欧洲铁路数据生成。",
    previewEyebrow: "产品预览",
    previewTitle: "进入编辑器之前，先预览真实交通图层。",
    previewBody: "日本视图抽样展示真实交通和地理数据，让用户进入编辑器之前先看懂地图。",
    miniMapLabel: "日本数据预览",
    miniMapTitle: "用可读抽样查看日本道路、铁路、城市、地形、河流和夜光上下文。",
    miniMapBadge: "可交互预览",
    previewTabsLabel: "预览图层",
    previewTabTransport: "交通",
    previewTabCities: "城市",
    previewTabTerrain: "地形",
    previewTabNight: "夜光上下文",
    previewPanelTransportBadge: "日本道路 + 铁路",
    previewPanelTransportTitle: "预览图从日本交通包渲染 260 条道路线和 160 条铁路线。",
    previewPanelTransportBody: "这个视图用来判断走廊密度、铁路连续性和主要车站锚点是否清晰。",
    previewPanelCitiesBadge: "城市点",
    previewPanelCitiesTitle: "城市模式从日本城市目录抽样展示 32 个可识别锚点。",
    previewPanelCitiesBody: "城市点把路线连接到熟悉的区域中心，让交通预览更容易阅读。",
    previewPanelTerrainBadge: "地形和物理上下文",
    previewPanelTerrainTitle: "地形模式在日本基底上叠加真实等高线和河流数据。",
    previewPanelTerrainBody: "物理上下文帮助用户看到交通走廊和山地、海岸、河流系统的关系。",
    previewPanelNightBadge: "夜光图层",
    previewPanelNightTitle: "夜光模式从 Black Marble 和历史城市锚点抽样展示 88 个光点。",
    previewPanelNightBody: "这个模式展示人口和活动上下文如何叠加在同一套交通地理之上。",
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
    featuresBody: "每组能力都对应创作者高频使用的操作，从政治编辑到展示导出都能接上。",
    featureGroupOneTitle: "制图设计",
    featureGroupOneBody: "图层顺序、调色板、边界、标签、图例、城市点、水域和可导出的地图呈现。",
    featurePointPalettes: "HOI4、Kaiserreich、TNO、Red Flood 和 Vanilla 风格调色板。",
    featurePointExport: "导出工作台支持 1x-4x 展示截图。",
    featureGroupTwoTitle: "场景编辑",
    featureGroupTwoBody: "命名世界状态、归属、控制方、前线、特殊区域、国家元数据和场景化启动。",
    featurePointUndo: "地图编辑会话支持 80 步撤销与重做。",
    featurePointDistricts: "行政区和层级编辑支撑更深的场景制作。",
    featureGroupThreeTitle: "空间数据与分析",
    featureGroupThreeBody: "边界、聚落、层级数据、物理上下文和来源链接，让地图更清楚，也更容易被信任。",
    featureGroupFourTitle: "交通与基础设施",
    featureGroupFourBody: "日本预览已经能看到道路和铁路，机场、港口、能源、工业和资源会继续扩展成新的基础设施视图。",
    featurePointTransport: "日本道路、铁路、机场、港口、能源、工业、物流和资源数据族。",
    featurePointAudits: "来源链接帮助审阅者理解基础设施图层来自哪里。",
    featureGroupFiveTitle: "影像与上下文图层",
    featureGroupFiveBody: "地形、水深、等高线、河流、夜光、城市区域和物理语义，让地图具备更完整的地理背景。",
    featureGroupSixTitle: "项目管理",
    featureGroupSixBody: "本地保存回读、中英双语、导出流程，以及后续面向团队协作的共享入口。",
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
    templateBlankAlt: "生成式空白地图场景模板。",
    templateModernAlt: "生成式现代世界场景模板。",
    templateHoi4Alt: "生成式策略基线场景模板。",
    templateTnoAlt: "生成式架空历史场景模板。",
    dataEyebrow: "数据基础",
    dataTitle: "数据可信度是产品能力的一部分。",
    dataBody: "Scenario Forge 会把来源链接放在靠近地图体验的位置，让用户理解边界、地名、地形和交通图层来自哪里。",
    dataCardOneTag: "基础地理",
    dataCardOneTitle: "边界和聚落",
    dataCardOneBody: "Natural Earth、geoBoundaries、GeoNames、层级数据和国家规则资产，构成政治与聚落骨架。",
    dataCardTwoTag: "物理上下文",
    dataCardTwoTitle: "地形、水深、河流和物理语义",
    dataCardTwoBody: "NOAA ETOPO、水深包、等高线、河流和物理语义，让地图更接近真实地理空间。",
    dataCardThreeTag: "基础设施",
    dataCardThreeTitle: "可以查看的交通图层",
    dataCardThreeBody: "日本道路和铁路已经作为可见地图图层展示，更多基础设施视图可以沿用这套产品表达。",
    dataCardFourTag: "治理",
    dataCardFourTitle: "从来源到地图都能追溯",
    dataCardFourBody: "每个公开来源按钮都会指向真实数据族，让数据基础更容易被评估。",
    editionsEyebrow: "版本与许可方向",
    editionsTitle: "当前试用方式与后续扩展方向。",
    editionOneBadge: "现在可用",
    editionOneTitle: "在线 Demo",
    editionOneBody: "打开浏览器工作台，探索内置场景，调整图层，并导出展示截图。",
    editionTwoBadge: "本地创作者流程",
    editionTwoTitle: "本地项目和可追溯数据",
    editionTwoBody: "将场景工作保存在本地，检查地图图层，并在需要说明来源时查看来源链接。",
    editionThreeBadge: "未来方向",
    editionThreeTitle: "团队协作和云端能力",
    editionThreeBody: "后续可以继续发展云端保存、共享项目空间、权限发布和更大的数据包。",
    casesEyebrow: "典型用例",
    casesTitle: "典型工作流可以直接在地图产品中完成。",
    caseOneLabel: "战役图集",
    caseOneTitle: "制作一张 TNO 1962 政治简报图。",
    caseOneBody: "从命名世界状态开始，调整展示图层，叠加城市和水域上下文，导出适合场景简报的地图。",
    caseTwoLabel: "基础设施审阅",
    caseTwoTitle: "查看日本道路和铁路密度。",
    caseTwoBody: "使用预览查看交通走廊、铁路枢纽、港口和运输条件，再进入更深入的编辑工作。",
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
    faqThreeAnswer: "公开 Demo 可以作为静态网页应用在浏览器里运行。更大的刷新和共享流程属于本地创作者设置。",
    faqFourQuestion: "可以导出什么？",
    faqFourAnswer: "编辑器支持 PNG、JPG 这类展示截图，并把图层样式保留在地图工作台附近。",
    faqFiveQuestion: "交通图层成熟度如何？",
    faqFiveAnswer: "日本道路和铁路是当前最清楚的交通视图。其他基础设施族会作为后续产品区域继续展示。",
    faqSixQuestion: "许可模式是什么？",
    faqSixAnswer: "当前公开入口是在线演示和仓库。创作者版、团队版和云端包装属于后续产品方向。",
    roadmapEyebrow: "进行中",
    roadmapTitle: "明确展示已完成能力和进行中能力。",
    roadmapBody: "Scenario Forge 的核心方向已经清晰，交通相关能力仍在持续推进，因此这里会标明各项能力的成熟度。",
    roadmapStatusOne: "预览中",
    roadmapOneTitle: "交通工作台",
    roadmapOneBody: "交通工作台已经支持查看交通图层，并在地图里理解线路密度。",
    roadmapStatusTwo: "可用视图",
    roadmapTwoTitle: "日本道路预览",
    roadmapTwoBody: "这是目前交通相关能力里最清晰的预览。",
    roadmapStatusThree: "框架阶段",
    roadmapThreeTitle: "铁路和其他基础设施族",
    roadmapThreeBody: "铁路、机场、港口、能源、工业、物流和资源视图会从同一套地图图层模式继续扩展。",
    updatesEyebrow: "最近更新",
    updatesTitle: "产品持续迭代中。",
    updateOneDate: "2026 年 5 月 31 日",
    updateOneTitle: "更完整的首页展示",
    updateOneBody: "首页现在让访客更快看到产品承诺、可见地图、典型用例和常见问题。",
    updateTwoDate: "2026 年 5 月 31 日",
    updateTwoTitle: "云端保存基础能力",
    updateTwoBody: "本地创作者设置为后续共享项目空间提供了更清晰的路径。",
    updateThreeDate: "2026 年 5 月 12 日",
    updateThreeTitle: "地图数据基础",
    updateThreeBody: "数据基础已经覆盖 641 个地图资源，包括地理、交通、调色板和运行时视图。",
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

const SHOWCASE_LAYER_COPY_KEYS = {
  political: {
    badge: "showcaseLayerPoliticalBadge",
    title: "showcaseLayerPoliticalTitle",
    body: "showcaseLayerPoliticalBody",
  },
  rail: {
    badge: "showcaseLayerRailBadge",
    title: "showcaseLayerRailTitle",
    body: "showcaseLayerRailBody",
  },
  cities: {
    badge: "showcaseLayerCitiesBadge",
    title: "showcaseLayerCitiesTitle",
    body: "showcaseLayerCitiesBody",
  },
  "day-night": {
    badge: "showcaseLayerDayNightBadge",
    title: "showcaseLayerDayNightTitle",
    body: "showcaseLayerDayNightBody",
  },
};
const SHOWCASE_METADATA_URL = "./assets/europe-1936-showcase.json";
const DEFAULT_SHOWCASE_LAYER = "political";
const SHOWCASE_VIEW_WIDTH = 980;
const SHOWCASE_VIEW_HEIGHT = 620;
const SHOWCASE_VIEW_SCALES = [1, 1.25, 1.55, 1.9, 2.3];
const DEFAULT_HERO_MODE = "hoi4-1936";
const HERO_SCENARIO_ASSETS = {
  blank: {
    src: "./assets/hero-blank.svg",
    metadata: "./assets/hero-blank.json",
    altKey: "heroAltBlank",
  },
  "hoi4-1936": {
    src: "./assets/hero-hoi4-1936.svg",
    metadata: "./assets/hero-hoi4-1936.json",
    altKey: "heroAltHoi41936",
  },
  "hoi4-1939": {
    src: "./assets/hero-hoi4-1939.svg",
    metadata: "./assets/hero-hoi4-1939.json",
    altKey: "heroAltHoi41939",
  },
  "tno-1962": {
    src: "./assets/hero-tno-1962.svg",
    metadata: "./assets/hero-tno-1962.json",
    altKey: "heroAltTno1962",
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
  updateShowcaseLayerCopy(language);
  syncHeroMapFromDom();

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

function initMetricCountUp() {
  const motionQuery = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
  const statNodes = Array.from(document.querySelectorAll("[data-stat-value]"));
  if (motionQuery?.matches || !statNodes.length) return;

  const animateNode = (node) => {
    const target = Number.parseInt(node.getAttribute("data-stat-value") || "", 10);
    if (Number.isNaN(target) || node.dataset.counted === "true") return;
    node.dataset.counted = "true";
    const language = document.documentElement.lang === "zh-CN" ? "zh" : "en";
    const formatter = new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US");
    const duration = 760;
    const start = globalThis.performance?.now?.() || Date.now();
    const tick = (now) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      node.textContent = formatter.format(Math.round(target * eased));
      if (elapsed < 1) globalThis.requestAnimationFrame(tick);
    };
    globalThis.requestAnimationFrame(tick);
  };

  if (!("IntersectionObserver" in globalThis)) {
    statNodes.forEach(animateNode);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateNode(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.4 },
  );

  statNodes.forEach((node) => observer.observe(node));
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

function resolveHeroMode(mode) {
  return Object.prototype.hasOwnProperty.call(HERO_SCENARIO_ASSETS, mode) ? mode : DEFAULT_HERO_MODE;
}

function syncHeroMap(root, mode, options = {}) {
  const nextMode = resolveHeroMode(mode);
  const asset = HERO_SCENARIO_ASSETS[nextMode];
  const image = root.querySelector("[data-hero-image]");
  const chips = Array.from(document.querySelectorAll("[data-hero-chip]"));
  const copy = translations[getActiveLanguage()] || translations.en;

  root.dataset.heroMode = nextMode;
  if (asset.metadata) {
    root.dataset.heroMetadata = asset.metadata;
  }

  if (image) {
    const swapImage = () => {
      image.src = asset.src;
      image.alt = copy[asset.altKey] || copy.productPreviewAlt;
    };
    if (options.animate) {
      root.dataset.heroTransition = "loading";
      root.dataset.heroPendingMode = nextMode;
      globalThis.setTimeout(() => {
        if (root.dataset.heroPendingMode !== nextMode) return;
        swapImage();
        root.dataset.heroTransition = "ready";
        delete root.dataset.heroPendingMode;
      }, 80);
    } else {
      delete root.dataset.heroPendingMode;
      swapImage();
      root.dataset.heroTransition = "ready";
    }
  }

  chips.forEach((chip) => {
    const active = chip.getAttribute("data-hero-chip") === nextMode;
    chip.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function syncHeroMapFromDom() {
  const root = document.querySelector("[data-hero-map]");
  if (!root) return;
  syncHeroMap(root, root.dataset.heroMode || DEFAULT_HERO_MODE);
}

function initHeroMap() {
  const root = document.querySelector("[data-hero-map]");
  const chips = Array.from(document.querySelectorAll("[data-hero-chip]"));
  if (!root || !chips.length) return;
  syncHeroMap(root, root.dataset.heroMode || DEFAULT_HERO_MODE);

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      syncHeroMap(root, chip.getAttribute("data-hero-chip") || DEFAULT_HERO_MODE, { animate: true });
    });
  });
}

function initTopbarState() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  const update = () => {
    topbar.classList.toggle("is-scrolled", globalThis.scrollY > 12);
  };
  update();
  globalThis.addEventListener("scroll", update, { passive: true });
}

function getActiveLanguage() {
  return document.documentElement.lang === "zh-CN" ? "zh" : "en";
}

function getShowcaseLayerIds(root) {
  return String(root.dataset.showcaseLayerIds || Object.keys(SHOWCASE_LAYER_COPY_KEYS).join(","))
    .split(",")
    .map((layer) => layer.trim())
    .filter(Boolean);
}

function isShowcaseLayerAllowed(root, layer) {
  return getShowcaseLayerIds(root).includes(layer) && Object.prototype.hasOwnProperty.call(SHOWCASE_LAYER_COPY_KEYS, layer);
}

function resolveShowcaseLayer(root, layer) {
  if (isShowcaseLayerAllowed(root, layer)) {
    delete root.dataset.showcaseLayerError;
    return layer;
  }
  root.dataset.showcaseLayerError = layer || "missing";
  return null;
}

async function loadShowcaseMetadata(root) {
  if (!globalThis.fetch) return;
  const response = await fetch(SHOWCASE_METADATA_URL);
  if (!response.ok) throw new Error(`Unable to load ${SHOWCASE_METADATA_URL}`);
  const metadata = await response.json();
  const layerIds = Array.isArray(metadata?.layers)
    ? metadata.layers.map((layer) => String(layer?.id || "").trim()).filter(Boolean)
    : [];
  if (!layerIds.length) throw new Error("Europe showcase metadata is missing layers");
  root.dataset.showcaseLayerIds = layerIds.join(",");
}

function setShowcaseSvgLayer(root) {
  const layer = resolveShowcaseLayer(root, root.dataset.showcaseLayer || DEFAULT_SHOWCASE_LAYER);
  if (!layer) return;
  const objectNode = root.querySelector("[data-showcase-object]");
  if (!objectNode?.contentDocument) return;
  const svg = objectNode.contentDocument.querySelector("svg");
  if (!svg) return;
  svg.setAttribute("data-active-layer", layer);
}

function getShowcaseSvgViewport(root) {
  const objectNode = root.querySelector("[data-showcase-object]");
  if (!objectNode?.contentDocument) return null;
  return objectNode.contentDocument.querySelector("[data-showcase-viewport]");
}

function getShowcaseViewState(root) {
  const scaleIndex = Number.parseInt(root.dataset.showcaseViewScaleIndex || "0", 10);
  return {
    scaleIndex: Number.isNaN(scaleIndex) ? 0 : Math.max(0, Math.min(scaleIndex, SHOWCASE_VIEW_SCALES.length - 1)),
    x: Number.parseFloat(root.dataset.showcaseViewX || "0") || 0,
    y: Number.parseFloat(root.dataset.showcaseViewY || "0") || 0,
  };
}

function clampShowcaseViewPosition(scale, x, y) {
  if (scale <= 1) return { x: 0, y: 0 };
  return {
    x: Math.max(SHOWCASE_VIEW_WIDTH * (1 - scale), Math.min(0, x)),
    y: Math.max(SHOWCASE_VIEW_HEIGHT * (1 - scale), Math.min(0, y)),
  };
}

function applyShowcaseViewState(root, nextState) {
  const scaleIndex = Math.max(0, Math.min(nextState.scaleIndex, SHOWCASE_VIEW_SCALES.length - 1));
  const scale = SHOWCASE_VIEW_SCALES[scaleIndex];
  const position = clampShowcaseViewPosition(scale, nextState.x, nextState.y);
  root.dataset.showcaseViewScaleIndex = String(scaleIndex);
  root.dataset.showcaseViewScale = scale.toFixed(2);
  root.dataset.showcaseViewZoomed = scale > 1 ? "true" : "false";
  root.dataset.showcaseViewX = position.x.toFixed(1);
  root.dataset.showcaseViewY = position.y.toFixed(1);
  const viewport = getShowcaseSvgViewport(root);
  if (viewport) {
    viewport.setAttribute("transform", `matrix(${scale} 0 0 ${scale} ${position.x.toFixed(1)} ${position.y.toFixed(1)})`);
  }
}

function zoomShowcaseView(root, direction) {
  const state = getShowcaseViewState(root);
  const currentScale = SHOWCASE_VIEW_SCALES[state.scaleIndex];
  const nextScaleIndex = Math.max(0, Math.min(state.scaleIndex + direction, SHOWCASE_VIEW_SCALES.length - 1));
  const nextScale = SHOWCASE_VIEW_SCALES[nextScaleIndex];
  const centerX = (SHOWCASE_VIEW_WIDTH / 2 - state.x) / currentScale;
  const centerY = (SHOWCASE_VIEW_HEIGHT / 2 - state.y) / currentScale;
  applyShowcaseViewState(root, {
    scaleIndex: nextScaleIndex,
    x: SHOWCASE_VIEW_WIDTH / 2 - centerX * nextScale,
    y: SHOWCASE_VIEW_HEIGHT / 2 - centerY * nextScale,
  });
}

function resetShowcaseView(root) {
  applyShowcaseViewState(root, { scaleIndex: 0, x: 0, y: 0 });
}

function initShowcaseView() {
  const root = document.querySelector("[data-showcase-root]");
  if (!root) return;

  const objectNode = root.querySelector("[data-showcase-object]");
  if (!objectNode) return;

  let dragState = null;

  const onWheel = (event) => {
    event.preventDefault();
    zoomShowcaseView(root, event.deltaY < 0 ? 1 : -1);
  };

  const onPointerDown = (event) => {
    const state = getShowcaseViewState(root);
    if (SHOWCASE_VIEW_SCALES[state.scaleIndex] <= 1) return;
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      viewX: state.x,
      viewY: state.y,
    };
    root.dataset.showcaseViewDragging = "true";
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    applyShowcaseViewState(root, {
      scaleIndex: getShowcaseViewState(root).scaleIndex,
      x: dragState.viewX + event.clientX - dragState.startX,
      y: dragState.viewY + event.clientY - dragState.startY,
    });
  };

  const onPointerEnd = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
    dragState = null;
    delete root.dataset.showcaseViewDragging;
  };

  const bindEmbeddedSvg = () => {
    applyShowcaseViewState(root, getShowcaseViewState(root));
    const svg = objectNode.contentDocument?.querySelector("svg");
    if (!svg || svg.dataset.showcaseViewBound === "true") return;
    svg.dataset.showcaseViewBound = "true";
    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerEnd);
    svg.addEventListener("pointercancel", onPointerEnd);
    svg.addEventListener("dblclick", () => resetShowcaseView(root));
  };

  objectNode.addEventListener("wheel", onWheel, { passive: false });
  objectNode.addEventListener("pointerdown", onPointerDown);
  objectNode.addEventListener("pointermove", onPointerMove);
  objectNode.addEventListener("pointerup", onPointerEnd);
  objectNode.addEventListener("pointercancel", onPointerEnd);
  objectNode.addEventListener("dblclick", () => resetShowcaseView(root));
  objectNode.addEventListener("load", bindEmbeddedSvg);
  resetShowcaseView(root);
  bindEmbeddedSvg();
}

function updateShowcaseLayerCopy(language = getActiveLanguage()) {
  const root = document.querySelector("[data-showcase-root]");
  if (!root) return;
  const layer = resolveShowcaseLayer(root, root.dataset.showcaseLayer || DEFAULT_SHOWCASE_LAYER);
  if (!layer) return;
  const keys = SHOWCASE_LAYER_COPY_KEYS[layer];
  const copy = translations[language] || translations.en;
  const badge = root.querySelector("[data-showcase-layer-badge]");
  const title = root.querySelector("[data-showcase-layer-title]");
  const body = root.querySelector("[data-showcase-layer-body]");
  if (badge) badge.textContent = copy[keys.badge];
  if (title) title.textContent = copy[keys.title];
  if (body) body.textContent = copy[keys.body];
}

function initShowcaseLayers() {
  const root = document.querySelector("[data-showcase-root]");
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll("[data-showcase-layer-tab]"));
  const panel = root.querySelector("[role=\"tabpanel\"]");
  if (!tabs.length) return;

  const selectLayer = (tab, shouldFocus = false) => {
    const layer = resolveShowcaseLayer(root, tab.getAttribute("data-showcase-layer-tab") || DEFAULT_SHOWCASE_LAYER);
    if (!layer) return;
    root.dataset.showcaseLayer = layer;

    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute("aria-selected", active ? "true" : "false");
      item.setAttribute("tabindex", active ? "0" : "-1");
    });
    if (panel && tab.id) panel.setAttribute("aria-labelledby", tab.id);

    updateShowcaseLayerCopy();
    setShowcaseSvgLayer(root);
    if (shouldFocus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectLayer(tab));
    tab.addEventListener("keydown", (event) => {
      const key = event.key;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
      event.preventDefault();

      let nextIndex = index;
      if (key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (key === "Home") nextIndex = 0;
      if (key === "End") nextIndex = tabs.length - 1;

      selectLayer(tabs[nextIndex], true);
    });
  });

  const objectNode = root.querySelector("[data-showcase-object]");
  objectNode?.addEventListener("load", () => setShowcaseSvgLayer(root));
  loadShowcaseMetadata(root)
    .then(() => {
      const selectedTab = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
      selectLayer(selectedTab);
    })
    .catch((error) => {
      root.dataset.showcaseLayerError = error?.message || "metadata";
    });
  updateShowcaseLayerCopy();
  setShowcaseSvgLayer(root);
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
  initShowcaseLayers();
  initShowcaseView();
  initHeroMap();
  initTopbarState();
  initMetricCountUp();
  initScrollReveal();
});
