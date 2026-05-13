const { test, expect } = require("@playwright/test");
const { gotoApp, waitForAppInteractive, waitForRenderIdle } = require("./support/playwright-app");

const TNO_TRANSPORT_READY_PATH = "/?render_profile=balanced&startup_interaction=readonly&startup_worker=1&startup_cache=1&default_scenario=tno_1962";


async function expectSupportPopoverVisibility(page, { guide, reference, export: exportVisible }) {
  await expect(page.locator("#scenarioGuidePopover"))[guide ? "toBeVisible" : "toBeHidden"]();
  await expect(page.locator("#scenarioGuideBackdrop"))[guide ? "toBeVisible" : "toBeHidden"]();
  await expect(page.locator("#dockReferencePopover"))[reference ? "toBeVisible" : "toBeHidden"]();
  await expect(page.locator("#exportWorkbenchOverlay"))[exportVisible ? "toBeVisible" : "toBeHidden"]();
}

async function activateSupportTrigger(page, selector) {
  await page.locator(selector).focus();
  await page.keyboard.press("Enter");
}

test("special zone layer workbench gates members and applies rectangular presets", async ({ page }) => {
  test.setTimeout(120_000);
  await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);

  await page.evaluate(() => {
    const appearance = document.querySelector('[aria-labelledby="appearanceSectionHeading labelMapStyle"]');
    const special = document.querySelector("#specialZonePopover");
    if (appearance instanceof HTMLDetailsElement) appearance.open = true;
    if (special instanceof HTMLDetailsElement) special.open = true;
  });

  const workbench = page.locator("[data-special-zone-layers-workbench]");
  await expect(workbench).toBeVisible();
  await expect(workbench.locator(".special-zone-member-tool-btn")).toHaveCount(3);
  await expect(workbench).toContainText("Select or create a layer before editing members.");
  await expect(workbench).toContainText("Select or create a layer to apply style presets.");

  await workbench.getByRole("button", { name: "New layer" }).click();
  await expect(workbench.locator(".special-zone-current-style-preview")).toBeVisible();
  await expect(workbench.locator(".special-zone-preset-preview").first()).toBeVisible();

  await workbench.getByRole("button", { name: "Demilitarized Zone" }).click();
  const layerState = await page.evaluate(async () => {
    const stateModuleUrl = new URL("./js/core/state.js", globalThis.location.href).toString();
    const stateModule = await import(stateModuleUrl);
    const layer = stateModule.state?.specialZoneLayers?.layers?.[0] || null;
    return {
      presetId: layer?.presetId || "",
      memberCount: layer?.memberFeatureIds?.length || 0,
    };
  });
  expect(layerState.presetId).toBe("demilitarized");
  expect(layerState.memberCount).toBe(0);
});

test("phase 03 support and transport surfaces stay unified", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);

  await page.locator("#inspectorSidebarTabProject").click();
  await expect(page.locator("#inspectorUtilitiesSection")).toBeVisible();
  await page.evaluate(() => {
    const utilities = document.querySelector("#inspectorUtilitiesSection");
    const diagnostics = document.querySelector("#diagnosticsSection");
    if (utilities instanceof HTMLDetailsElement) utilities.open = true;
    if (diagnostics instanceof HTMLDetailsElement) diagnostics.open = true;
  });
  await expect(page.locator("#inspectorUtilitiesSection")).toHaveJSProperty("open", true);

  await expect(page.locator("#utilitiesGuideBtn")).toHaveText("Guide");
  await expect(page.locator("#dockReferenceBtn")).toHaveText("Reference");
  await expect(page.locator("#dockExportBtn")).toHaveText("Open workbench");

  await activateSupportTrigger(page, "#utilitiesGuideBtn");
  await expectSupportPopoverVisibility(page, { guide: true, reference: false, export: false });
  await expect(page.locator("#scenarioGuideTitle")).not.toHaveText("");
  await expect(page.locator("body")).toHaveClass(/scenario-guide-open/);

  await page.keyboard.press("Escape");
  await expectSupportPopoverVisibility(page, { guide: false, reference: false, export: false });
  await expect(page.locator("#utilitiesGuideBtn")).toBeFocused();

  await page.locator("#dockReferenceBtn").focus();
  await page.keyboard.press("Enter");
  await expectSupportPopoverVisibility(page, { guide: false, reference: true, export: false });
  await expect(page.locator("#lblReferenceImage")).not.toHaveText("");
  await page.keyboard.press("Escape");
  await expectSupportPopoverVisibility(page, { guide: false, reference: false, export: false });
  await expect(page.locator("#dockReferenceBtn")).toBeFocused();
  await page.evaluate(() => {
    const exportSection = document.querySelector("#exportProjectSection");
    if (exportSection instanceof HTMLDetailsElement) exportSection.open = true;
  });
  await expect(page.locator("#dockExportBtn")).toBeVisible();

  await page.locator("#dockExportBtn").focus();
  await page.keyboard.press("Enter");
  await expectSupportPopoverVisibility(page, { guide: false, reference: false, export: true });
  await expect(page.locator("#exportWorkbenchTitle")).not.toHaveText("");

  await activateSupportTrigger(page, "#utilitiesGuideBtn");
  await expectSupportPopoverVisibility(page, { guide: true, reference: false, export: false });

  await page.keyboard.press("Escape");
  await expectSupportPopoverVisibility(page, { guide: false, reference: false, export: false });
  await expect(page.locator("#utilitiesGuideBtn")).toBeFocused();

  await page.locator("#zoomControls #scenarioTransportWorkbenchBtn").click();
  await expect(page.locator("#transportWorkbenchOverlay")).toBeVisible();
  await expect(page.locator("#transportWorkbenchLensTitle")).toBeVisible();
  await expect(page.locator(".transport-workbench-meta-strip")).toBeVisible();
  await expect(page.locator(".transport-workbench-meta-pill")).toHaveCount(4);
  await expect(page.locator("#transportWorkbenchInspectorDetails")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator("#transportWorkbenchLayerOrderPanel")).toHaveAttribute("aria-live", "polite");

  await page.locator("#transportWorkbenchCloseBtn").click();
  await expect(page.locator("#transportWorkbenchOverlay")).toBeHidden();
  await expect(page.locator("#zoomControls #scenarioTransportWorkbenchBtn")).toBeVisible();
});

test("project support panels and inspector search stay polished and inset", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);

  await page.locator("#inspectorSidebarTabProject").click();
  await page.evaluate(() => {
    for (const id of ["frontlineProjectSection", "exportProjectSection", "inspectorUtilitiesSection"]) {
      const section = document.querySelector(`#${id}`);
      if (section instanceof HTMLDetailsElement) section.open = true;
    }
    for (const id of ["accordionLines", "accordionGraphics", "accordionCounters"]) {
      const accordion = document.querySelector(`#${id}`);
      accordion?.classList.add("is-open");
      accordion?.querySelector(".strategic-accordion-header")?.setAttribute("aria-expanded", "true");
    }
  });

  await expect(page.locator("#exportProjectSection .sidebar-help-copy")).toHaveText("Preview layers, format, and resolution before export.");
  await expect(page.locator("#inspectorUtilitiesSection > .inspector-panel-body > .inspector-utilities-shell > .sidebar-help-copy")).toHaveCount(0);

  const projectMetrics = await page.evaluate(() => {
    const rectToObject = (rect) => rect ? {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    } : null;
    const exportSection = document.querySelector("#exportProjectSection");
    const utilitiesSection = document.querySelector("#inspectorUtilitiesSection");
    const frontlinePanel = document.querySelector("#frontlineOverlayPanel");
    const strategicPanel = document.querySelector("#strategicOverlayPanel");
    const accordionBodies = [...document.querySelectorAll("#strategicOverlayPanel .strategic-accordion-body")].map((element) => {
      const style = getComputedStyle(element);
      return {
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        overflowY: style.overflowY,
        maxHeight: style.maxHeight,
      };
    });
    const frontlineHints = [...document.querySelectorAll("#frontlineProjectSection .sidebar-tool-hint")]
      .filter((element) => getComputedStyle(element).display !== "none")
      .map((element) => String(element.textContent || "").trim())
      .filter(Boolean);
    const projectSectionIds = [
      "projectLegendSection",
      "frontlineProjectSection",
      "exportProjectSection",
      "inspectorUtilitiesSection",
      "diagnosticsSection",
    ];
    const visibleOverflow = [...document.querySelectorAll("#projectSidebarPanel *")].filter((element) => {
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") return false;
      const rect = element.getBoundingClientRect();
      const panelRect = document.querySelector("#projectSidebarPanel")?.getBoundingClientRect();
      return panelRect && rect.width > 0 && (rect.left < panelRect.left - 1 || rect.right > panelRect.right + 1);
    }).map((element) => element.id || element.className || element.tagName);
    return {
      exportSection: rectToObject(exportSection?.getBoundingClientRect()),
      exportButton: rectToObject(document.querySelector("#dockExportBtn")?.getBoundingClientRect()),
      utilitiesSection: rectToObject(utilitiesSection?.getBoundingClientRect()),
      guideButton: rectToObject(document.querySelector("#utilitiesGuideBtn")?.getBoundingClientRect()),
      referenceButton: rectToObject(document.querySelector("#dockReferenceBtn")?.getBoundingClientRect()),
      utilityActionsDisplay: getComputedStyle(document.querySelector("#inspectorUtilitiesSection .inspector-utility-actions")).display,
      frontlinePanelRadius: frontlinePanel ? getComputedStyle(frontlinePanel).borderRadius : "",
      strategicPanelRadius: strategicPanel ? getComputedStyle(strategicPanel).borderRadius : "",
      strategicAccordionRadii: [...document.querySelectorAll("#strategicOverlayPanel .strategic-accordion-section")]
        .map((element) => getComputedStyle(element).borderRadius),
      strategicAccordionBodies: accordionBodies,
      frontlineHintTexts: frontlineHints,
      projectSectionRadii: projectSectionIds
        .map((id) => document.querySelector(`#${id}`))
        .filter(Boolean)
        .map((element) => getComputedStyle(element).borderRadius),
      visibleOverflow,
    };
  });

  expect(projectMetrics.visibleOverflow).toEqual([]);
  expect(projectMetrics.exportButton.left).toBeGreaterThan(projectMetrics.exportSection.left + 12);
  expect(projectMetrics.exportButton.right).toBeLessThan(projectMetrics.exportSection.right - 12);
  expect(projectMetrics.guideButton.left).toBeGreaterThan(projectMetrics.utilitiesSection.left + 12);
  expect(projectMetrics.referenceButton.right).toBeLessThan(projectMetrics.utilitiesSection.right - 12);
  expect(projectMetrics.utilityActionsDisplay).toBe("grid");
  expect(projectMetrics.frontlinePanelRadius).toBe("18px");
  expect(projectMetrics.strategicPanelRadius).toBe("18px");
  expect(projectMetrics.strategicAccordionRadii.every((radius) => radius === "15px")).toBe(true);
  expect(projectMetrics.strategicAccordionBodies.length).toBe(3);
  expect(projectMetrics.strategicAccordionBodies.every((body) => body.overflowY === "auto" && body.maxHeight !== "none")).toBe(true);
  expect(projectMetrics.frontlineHintTexts.every((text) => text.length <= 42)).toBe(true);
  expect(projectMetrics.projectSectionRadii.every((radius) => radius === "18px")).toBe(true);

  await page.locator("#inspectorSidebarTabInspector").click();
  const searchMetrics = await page.evaluate(() => {
    const rectToObject = (rect) => rect ? {
      left: rect.left,
      right: rect.right,
      width: rect.width,
    } : null;
    const searchBlock = document.querySelector(".inspector-search-block");
    const countrySection = document.querySelector("#countryInspectorSection");
    const searchInput = document.querySelector("#countrySearch");
    const inputStyle = getComputedStyle(searchInput);
    return {
      searchBlock: rectToObject(searchBlock?.getBoundingClientRect()),
      countrySection: rectToObject(countrySection?.getBoundingClientRect()),
      inputPaddingLeft: Number.parseFloat(inputStyle.paddingLeft),
      inputPaddingRight: Number.parseFloat(inputStyle.paddingRight),
      inputBorderLeft: inputStyle.borderLeftWidth,
    };
  });

  expect(searchMetrics.searchBlock.left).toBeCloseTo(searchMetrics.countrySection.left, 0);
  expect(searchMetrics.searchBlock.width).toBeCloseTo(searchMetrics.countrySection.width, 0);
  expect(searchMetrics.inputPaddingLeft).toBeGreaterThanOrEqual(6);
  expect(searchMetrics.inputPaddingRight).toBeGreaterThanOrEqual(6);
  expect(searchMetrics.inputBorderLeft).toBe("0px");
});


test("left sidebar scenario and appearance panels keep compact hierarchy", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);

  await page.evaluate(() => {
    const scenario = document.querySelector('[aria-labelledby="lblScenario"]');
    const appearance = document.querySelector('[aria-labelledby="appearanceSectionHeading labelMapStyle"]');
    const special = document.querySelector('#specialZonePopover');
    if (scenario instanceof HTMLDetailsElement) scenario.open = true;
    if (appearance instanceof HTMLDetailsElement) appearance.open = true;
    if (special instanceof HTMLDetailsElement) special.open = true;
  });

  await expect(page.locator('#appearanceLayerFilter')).toHaveCount(0);
  await expect(page.locator('#lblTextureInfo')).toHaveCount(0);
  await expect(page.locator('#appearancePanelTexture .info-trigger')).toHaveCount(0);

  const activateAppearanceTab = async (tabSelector, panelSelector) => {
    await page.locator(tabSelector).click();
    await expect(page.locator(panelSelector)).toBeVisible();
  };

  await activateAppearanceTab('#appearanceTabOcean', '#appearancePanelOcean');
  await expect(page.locator('#appearancePanelOcean .appearance-control-card')).toHaveCount(3);
  const oceanLayout = await page.evaluate(() => {
    const panel = document.querySelector('#appearancePanelOcean')?.getBoundingClientRect();
    const cards = [...document.querySelectorAll('#appearancePanelOcean .appearance-control-card')]
      .map((element) => element.getBoundingClientRect());
    return {
      cardCount: cards.length,
      firstInset: panel && cards[0] ? cards[0].left - panel.left : 0,
      firstRightGap: panel && cards[0] ? panel.right - cards[0].right : 0,
      firstGap: cards[1] ? cards[1].top - cards[0].bottom : 0,
    };
  });
  await activateAppearanceTab('#appearanceTabBorders', '#appearancePanelBorders');
  await activateAppearanceTab('#appearanceTabLayers', '#appearancePanelLayers');
  await page.evaluate(() => {
    const physical = document.querySelector('#appearancePanelLayers .appearance-mini-section');
    const cityPoints = document.querySelector('#appearancePanelLayers [data-appearance-filter-label="city points capitals labels"]');
    const rivers = document.querySelector('#appearancePanelLayers [data-appearance-filter-label="rivers waterways"]');
    if (physical instanceof HTMLDetailsElement) physical.open = true;
    if (cityPoints instanceof HTMLDetailsElement) cityPoints.open = true;
    if (rivers instanceof HTMLDetailsElement) rivers.open = true;
  });
  await expect(page.locator('#cityPointsPresetDensityGroupHint')).toHaveCount(0);
  await expect(page.locator('#cityPointsMarkerDensityHint')).toHaveCount(0);
  await expect(page.locator('#cityPointsLabelDensityHint')).toHaveCount(0);
  await expect(page.locator('#cityPointsHelpTooltip')).toContainText('Pick a restrained style');
  await expect(page.locator('#appearancePanelLayers .city-points-toggle-card')).toHaveCount(1);
  await expect(page.locator('#appearancePanelLayers .city-points-style-card')).toHaveCount(1);
  await expect(page.locator('#appearancePanelLayers .city-points-label-card')).toHaveCount(1);
  await expect(page.locator('#appearancePanelLayers .rivers-toggle-card')).toHaveCount(1);
  await expect(page.locator('#appearancePanelLayers .rivers-stroke-card')).toHaveCount(1);
  await expect(page.locator('#appearancePanelLayers .rivers-outline-card')).toHaveCount(1);
  await page.locator('#riversDashStyle').selectOption('dashed');
  const riverDashState = await page.evaluate(async () => {
    const stateModuleUrl = new URL('./js/core/state.js', globalThis.location.href).toString();
    const stateModule = await import(stateModuleUrl);
    return {
      dashStyle: stateModule?.state?.styleConfig?.rivers?.dashStyle || '',
    };
  });
  expect(riverDashState.dashStyle).toBe('dashed');
  const layerLayout = await page.evaluate(() => {
    const details = document.querySelector('#appearancePanelLayers .appearance-mini-section')?.getBoundingClientRect();
    const content = document.querySelector('#appearancePanelLayers .appearance-mini-section .ml-5.space-y-2')?.getBoundingClientRect();
    const cityToggle = document.querySelector('#appearancePanelLayers .city-points-toggle-card')?.getBoundingClientRect();
    const riverGap = (() => {
      const cards = [...document.querySelectorAll('#appearancePanelLayers .rivers-panel-stack > .appearance-control-card')]
        .map((element) => element.getBoundingClientRect());
      return cards[1] ? cards[1].top - cards[0].bottom : 0;
    })();
    return {
      contentInset: details && content ? content.left - details.left : 0,
      contentRightGap: details && content ? details.right - content.right : 0,
      contentWidthDelta: details && content ? details.width - content.width : 0,
      cityTogglePaddingTop: cityToggle ? Number.parseFloat(getComputedStyle(document.querySelector('#appearancePanelLayers .city-points-toggle-card')).paddingTop) : 0,
      riverGap,
    };
  });
  await activateAppearanceTab('#appearanceTabDayNight', '#appearancePanelDayNight');
  const dayNightLayout = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#appearancePanelDayNight .appearance-day-night-card')]
      .filter((element) => getComputedStyle(element).display !== 'none')
      .map((element) => element.getBoundingClientRect());
    const gaps = cards.slice(1).map((card, index) => card.top - cards[index].bottom);
    const firstCard = document.querySelector('#appearancePanelDayNight .appearance-day-night-card');
    const modeRow = document.querySelector('#appearancePanelDayNight .appearance-day-night-mode-row');
    return {
      cardCount: cards.length,
      minGap: gaps.length ? Math.min(...gaps) : 0,
      cardPaddingTop: firstCard ? Number.parseFloat(getComputedStyle(firstCard).paddingTop) : 0,
      modeGap: modeRow ? Number.parseFloat(getComputedStyle(modeRow).gap) : 0,
    };
  });
  await activateAppearanceTab('#appearanceTabTexture', '#appearancePanelTexture');
  await activateAppearanceTab('#appearanceTabTransport', '#appearancePanelTransport');
  const transportLayout = await page.evaluate(() => {
    const families = [...document.querySelectorAll('#appearancePanelTransport .transport-family-section')];
    const childCards = [...document.querySelectorAll('#appearancePanelTransport .transport-family-body > section')];
    const firstFamily = families[0]?.getBoundingClientRect();
    const firstChild = childCards[0]?.getBoundingClientRect();
    return {
      familyCount: families.length,
      childCardCount: childCards.length,
      familyRadius: families[0] ? Number.parseFloat(getComputedStyle(families[0]).borderRadius) : 0,
      childInset: firstFamily && firstChild ? firstChild.left - firstFamily.left : 0,
      masterTogglePaddingTop: Number.parseFloat(getComputedStyle(document.querySelector('#appearancePanelTransport .transport-master-toggle-card')).paddingTop || '0'),
    };
  });
  await activateAppearanceTab('#appearanceTabTexture', '#appearancePanelTexture');

  const metrics = await page.evaluate(() => {
    const rectToObject = (rect) => rect ? {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    } : null;
    const fontSize = (selector) => {
      const element = document.querySelector(selector);
      return element ? Number.parseFloat(getComputedStyle(element).fontSize) : 0;
    };
    const leftSidebar = document.querySelector('#leftSidebar');
    const leftRect = leftSidebar?.getBoundingClientRect();
    const visibleOverflow = [...document.querySelectorAll('#leftSidebar *')].filter((element) => {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const rect = element.getBoundingClientRect();
      return leftRect && rect.width > 0 && rect.height > 0 && (rect.left < leftRect.left - 1 || rect.right > leftRect.right + 1);
    }).map((element) => element.id || element.className || element.tagName).slice(0, 10);
    return {
      scenarioStatusRect: rectToObject(document.querySelector('#scenarioStatus')?.getBoundingClientRect()),
      scenarioAuditRect: rectToObject(document.querySelector('#scenarioAuditHint')?.getBoundingClientRect()),
      scenarioBodyHeight: document.querySelector('[aria-labelledby="lblScenario"] .sidebar-details-body')?.getBoundingClientRect().height || 0,
      sectionTitle: fontSize('#labelMapStyle'),
      oceanToggle: fontSize('#appearancePanelOcean .toggle-label'),
      borderSummary: fontSize('#appearancePanelBorders .appearance-mini-section > summary'),
      borderLabel: fontSize('#appearancePanelBorders .range-label'),
      textureLabel: fontSize('#appearancePanelTexture .section-header-block'),
      textureSelect: fontSize('#textureSelect'),
      specialOverlayToggle: fontSize('.special-zone-overlay-toggle'),
      specialLabel: fontSize('#specialZonePopover .range-label'),
      paletteTitle: fontSize('#paletteLibraryList .palette-library-title'),
      paletteSubtitle: fontSize('#paletteLibraryList .palette-library-subtitle'),
      layersStackTop: document.querySelector('#appearancePanelLayers .appearance-subsection-stack')?.getBoundingClientRect().top || 0,
      layersTitleBottom: document.querySelector('#lblContextLayers')?.getBoundingClientRect().bottom || 0,
      textureFirstControlTop: document.querySelector('#lblOverlay')?.getBoundingClientRect().top || 0,
      textureTitleBottom: document.querySelector('#lblTexture')?.getBoundingClientRect().bottom || 0,
      scenarioArrowRight: document.querySelector('[aria-labelledby="lblScenario"] > summary')?.getBoundingClientRect().right || 0,
      colorToggleRight: document.querySelector('#paletteLibraryToggle')?.getBoundingClientRect().right || 0,
      visibleOverflow,
    };
  });

  expect(metrics.scenarioStatusRect.height).toBeLessThanOrEqual(1);
  expect(metrics.scenarioAuditRect.height).toBeLessThanOrEqual(1);
  expect(metrics.scenarioBodyHeight).toBeLessThan(230);
  expect(metrics.sectionTitle).toBeGreaterThan(metrics.oceanToggle);
  expect(metrics.sectionTitle).toBeGreaterThan(metrics.borderSummary);
  expect(metrics.borderSummary).toBeGreaterThanOrEqual(metrics.borderLabel);
  expect(Math.abs(metrics.oceanToggle - metrics.textureSelect)).toBeLessThanOrEqual(0.5);
  expect(metrics.specialOverlayToggle).toBeGreaterThan(0);
  expect(metrics.paletteTitle).toBeGreaterThan(metrics.paletteSubtitle);
  expect(metrics.textureFirstControlTop - metrics.textureTitleBottom).toBeLessThan(24);
  expect(metrics.layersStackTop - metrics.layersTitleBottom).toBeLessThan(24);
  expect(Math.abs(metrics.colorToggleRight - metrics.scenarioArrowRight)).toBeLessThanOrEqual(3);
  expect(oceanLayout.cardCount).toBe(3);
  expect(oceanLayout.firstInset).toBeGreaterThanOrEqual(12);
  expect(oceanLayout.firstRightGap).toBeGreaterThanOrEqual(12);
  expect(oceanLayout.firstGap).toBeGreaterThanOrEqual(10);
  expect(layerLayout.contentInset).toBeLessThanOrEqual(14);
  expect(layerLayout.contentRightGap).toBeGreaterThanOrEqual(10);
  expect(layerLayout.contentWidthDelta).toBeLessThanOrEqual(28);
  expect(layerLayout.cityTogglePaddingTop).toBeGreaterThanOrEqual(9);
  expect(layerLayout.riverGap).toBeGreaterThanOrEqual(10);
  expect(dayNightLayout.cardCount).toBeGreaterThanOrEqual(3);
  expect(dayNightLayout.minGap).toBeGreaterThanOrEqual(12);
  expect(dayNightLayout.cardPaddingTop).toBeGreaterThanOrEqual(10);
  expect(dayNightLayout.modeGap).toBeGreaterThanOrEqual(10);
  expect(transportLayout.familyCount).toBe(4);
  expect(transportLayout.childCardCount).toBeGreaterThanOrEqual(11);
  expect(transportLayout.familyRadius).toBeGreaterThanOrEqual(14);
  expect(transportLayout.childInset).toBeGreaterThanOrEqual(10);
  expect(transportLayout.masterTogglePaddingTop).toBeGreaterThanOrEqual(9);
  expect(metrics.visibleOverflow).toEqual([]);
});

test("phase 03 support surfaces restore the requested view from URL", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, "/?render_profile=balanced&startup_interaction=readonly&startup_worker=1&startup_cache=1&view=reference", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);

  await expect(page.locator("#inspectorSidebarTabProject")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#inspectorUtilitiesSection")).toHaveJSProperty("open", true);
  await expect(page.locator("#dockReferencePopover")).toBeVisible();
  await expect(page.locator("#dockReferenceBtn")).toHaveAttribute("aria-expanded", "true");

  await page.locator("#inspectorSidebarTabInspector").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#dockReferencePopover")).toBeHidden();
  await expect(page.locator("#dockReferenceBtn")).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(/scope=current-object/);
  await expect(page).not.toHaveURL(/view=/);
});

test("phase 03 support surfaces restore the guide view from URL", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, "/?render_profile=balanced&startup_interaction=readonly&startup_worker=1&startup_cache=1&view=guide&guide_section=tools", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);
  await expect(page.locator("#scenarioGuideBackdrop")).toBeVisible();
  await expect(page.locator("#scenarioGuidePopover")).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/scenario-guide-open/);
  await expect(page.locator("#scenarioGuideBtn")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#scenarioGuideTabTools")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#scenarioGuideSectionTools")).toBeVisible();
});

test("phase 03 guide URL restore returns focus to visible topbar trigger on compact viewport", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1024, height: 900 });
  await gotoApp(page, "/?render_profile=balanced&startup_interaction=readonly&startup_worker=1&startup_cache=1&view=guide", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);
  await expect(page.locator("#scenarioGuideBackdrop")).toBeVisible();
  await expect(page.locator("#scenarioGuidePopover")).toBeVisible();
  await expect(page.locator("body")).not.toHaveClass(/right-drawer-open/);

  await page.keyboard.press("Escape");
  await expect(page.locator("#scenarioGuideBackdrop")).toBeHidden();
  await expect(page.locator("#scenarioGuidePopover")).toBeHidden();
  await expect(page.locator("#scenarioGuideBtn")).toBeFocused();
});

test("phase 03 guide remembers active section across close and reopen", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);

  await page.locator("#scenarioGuideBtn").click();
  await expect(page.locator("#scenarioGuidePopover")).toBeVisible();
  await page.locator("#scenarioGuideTabTools").click();
  await expect(page.locator("#scenarioGuideTabTools")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#scenarioGuideSectionTools")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#scenarioGuidePopover")).toBeHidden();

  await page.locator("#scenarioGuideBtn").click();
  await expect(page.locator("#scenarioGuidePopover")).toBeVisible();
  await expect(page.locator("#scenarioGuideTabTools")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#scenarioGuideSectionTools")).toBeVisible();
});

test("phase 03 support surfaces restore the export view and stay idempotent", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, "/?render_profile=balanced&startup_interaction=readonly&startup_worker=1&startup_cache=1&view=export", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);
  await expect(page.locator("#inspectorSidebarTabProject")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#exportProjectSection")).toHaveJSProperty("open", true);
  await expect(page.locator("#exportWorkbenchOverlay")).toBeVisible();
  await expect(page.locator("#dockExportBtn")).toHaveAttribute("aria-expanded", "true");

  const stateAfterRepeat = await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    state.restoreSupportSurfaceFromUrlFn?.();
    state.restoreSupportSurfaceFromUrlFn?.();
    const overlay = document.querySelector("#exportWorkbenchOverlay");
    const trigger = document.querySelector("#dockExportBtn");
    return {
      visible: overlay instanceof HTMLElement ? !overlay.classList.contains("hidden") : false,
      expanded: trigger?.getAttribute("aria-expanded") || "",
    };
  });
  expect(stateAfterRepeat.visible).toBe(true);
  expect(stateAfterRepeat.expanded).toBe("true");
});

test("phase 03 ignores unknown support-surface view values", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, "/?render_profile=balanced&startup_interaction=readonly&startup_worker=1&startup_cache=1", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);
  await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    history.replaceState(history.state, "", `${location.pathname}?render_profile=balanced&startup_interaction=readonly&startup_worker=1&startup_cache=1&view=bogus`);
    state.restoreSupportSurfaceFromUrlFn?.();
  });
  await expect(page.locator("#scenarioGuidePopover")).toBeHidden();
  await expect(page.locator("#scenarioGuideBackdrop")).toBeHidden();
  await expect(page.locator("#dockReferencePopover")).toBeHidden();
  await expect(page.locator("#exportWorkbenchOverlay")).toBeHidden();
});

test("phase 03 guide modal closes cleanly from backdrop without leaving drawer scrim behind", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);

  await page.locator("#scenarioGuideBtn").click();
  await expect(page.locator("#scenarioGuideBackdrop")).toBeVisible();
  await expect(page.locator("#scenarioGuidePopover")).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/scenario-guide-open/);
  await expect(page.locator("body")).not.toHaveClass(/right-drawer-open/);

  await page.mouse.click(16, 16);
  await expect(page.locator("#scenarioGuideBackdrop")).toBeHidden();
  await expect(page.locator("#scenarioGuidePopover")).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/scenario-guide-open/);
  await expect(page.locator("body")).not.toHaveClass(/right-drawer-open/);
  await expect(page.locator("#scenarioGuideBtn")).toBeFocused();
});

test("phase 03 transport compare runtime strings localize across live states", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);

  const transportTrigger = page.locator("#zoomControls #scenarioTransportWorkbenchBtn");
  const compareBtn = page.locator("#transportWorkbenchCompareBtn");
  const compareStatus = page.locator("#transportWorkbenchCompareStatus");
  const roadTab = page.locator('[data-transport-family="road"]');
  const layersTab = page.locator('[data-transport-family="layers"]');

  await transportTrigger.click();
  await expect(page.locator("#transportWorkbenchOverlay")).toBeVisible();
  await expect(compareBtn).toHaveText("Compare baseline");
  await expect(compareStatus).toHaveText("Live working state");

  await compareBtn.focus();
  await page.keyboard.down("Enter");
  await expect(compareStatus).toHaveText("Baseline preview");
  await page.keyboard.up("Enter");
  await expect(compareStatus).toHaveText("Live working state");

  await layersTab.click();
  await expect(compareBtn).toHaveText("Baseline unavailable");
  await expect(compareStatus).toHaveText("Local layer board");

  await page.evaluate(() => {
    document.getElementById("btnToggleLang")?.click();
  });
  await expect(compareBtn).toHaveText("\u57fa\u7ebf\u4e0d\u53ef\u7528");
  await expect(compareStatus).toHaveText("\u672c\u5730\u56fe\u5c42\u6392\u5e8f\u677f");

  await roadTab.click();
  await expect(compareBtn).toHaveText("\u6bd4\u8f83\u57fa\u7ebf");
  await expect(compareStatus).toHaveText("\u5f53\u524d\u5de5\u4f5c\u72b6\u6001");

  await compareBtn.focus();
  await page.keyboard.down("Enter");
  await expect(compareStatus).toHaveText("\u57fa\u7ebf\u9884\u89c8\u4e2d");
  await page.keyboard.up("Enter");
  await expect(compareStatus).toHaveText("\u5f53\u524d\u5de5\u4f5c\u72b6\u6001");
});

test("transport visual mode and apply bridge stay aligned across appearance and workbench", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoApp(page, TNO_TRANSPORT_READY_PATH, { waitUntil: "domcontentloaded" });
  await waitForRenderIdle(page, { scenarioId: "tno_1962", timeout: 240_000 });

  await page.evaluate(() => {
    const appearance = document.querySelector('[aria-labelledby="appearanceSectionHeading labelMapStyle"]');
    const portCard = document.querySelector('#transportPortCard');
    if (appearance instanceof HTMLDetailsElement) appearance.open = true;
    if (portCard instanceof HTMLDetailsElement) portCard.open = true;
  });
  await page.locator("#appearanceTabTransport").click();

  await page.locator("#transportAppearanceMasterToggle").uncheck();
  await expect(page.locator("#transportVisualMode")).toBeDisabled();
  await page.locator("#togglePorts").check();
  await expect(page.locator("#transportAppearanceMasterToggle")).toBeChecked();
  await expect(page.locator("#transportVisualMode")).toBeEnabled();
  await page.locator("#transportVisualMode").selectOption("network");

  await expect.poll(async () => page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    return {
      visualMode: String(state.styleConfig?.transportOverview?.visualMode || ""),
      showTransport: !!state.showTransport,
      showPorts: !!state.showPorts,
    };
  }), { timeout: 30_000 }).toMatchObject({
    visualMode: "network",
    showTransport: true,
    showPorts: true,
  });

  await page.locator("#zoomControls #scenarioTransportWorkbenchBtn").click();
  await expect(page.locator("#transportWorkbenchOverlay")).toBeVisible();

  await expect(page.locator("#transportWorkbenchApplyBtn")).toHaveText("Apply to Main Map", { timeout: 30_000 });
  await expect(page.locator("#transportWorkbenchApplyBtn")).toBeEnabled();

  await page.locator('[data-transport-family="airport"]').click();
  await expect(page.locator("#transportWorkbenchApplyBtn")).toHaveText("Apply to Main Map", { timeout: 30_000 });
  await expect(page.locator("#transportWorkbenchApplyBtn")).toBeEnabled();
  await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    state.transportWorkbenchUi.familyConfigs.airport.airportTypes = [
      "company_managed",
      "national",
      "specific_local",
      "local",
      "other",
      "shared",
    ];
    state.transportWorkbenchUi.familyConfigs.airport.statuses = [
      "active",
      "paused",
      "unknown",
    ];
    state.refreshTransportWorkbenchUiFn?.();
  });
  await expect(page.locator("#transportWorkbenchApplyBtn")).toHaveText("Apply to Main Map");
  await expect(page.locator("#transportWorkbenchApplyBtn")).toBeEnabled();

  await page.locator('[data-transport-family="layers"]').click();
  await expect(page.locator("#transportWorkbenchApplyBtn")).toHaveText("Workbench-only family");
  await expect(page.locator("#transportWorkbenchApplyBtn")).toBeDisabled();
  await expect(page.locator("#transportWorkbenchCompareStatus")).toHaveText("Local layer board");

  await page.locator('[data-transport-family="mineral_resources"]').click();
  await expect(page.locator("#transportWorkbenchApplyBtn")).toHaveText("Workbench preview only");
  await expect(page.locator("#transportWorkbenchApplyBtn")).toBeDisabled();

  await page.locator('button[data-transport-family="port"]').click();
  await expect(page.locator("#transportWorkbenchApplyBtn")).toHaveText("Workbench preview only");
  await expect(page.locator("#transportWorkbenchApplyBtn")).toBeDisabled();

  await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    state.transportWorkbenchUi.familyConfigs.port.managerTypes = ["1"];
    state.refreshTransportWorkbenchUiFn?.();
  });
  await expect(page.locator("#transportWorkbenchApplyBtn")).toHaveText("Workbench preview only");
  await expect(page.locator("#transportWorkbenchApplyBtn")).toBeDisabled();

  await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    state.transportWorkbenchUi.familyConfigs.port.managerTypes = ["1", "2", "3", "4", "5"];
    state.transportWorkbenchUi.familyConfigs.port.showLabels = false;
    state.transportWorkbenchUi.familyConfigs.port.baseOpacity = 74;
    state.transportWorkbenchUi.displayConfigs.port.coverage = "expanded";
    state.refreshTransportWorkbenchUiFn?.();
  });
  await page.locator("#transportWorkbenchApplyBtn").click();

  await expect.poll(async () => page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    const portConfig = state.styleConfig?.transportOverview?.port || {};
    return {
      visualMode: String(state.styleConfig?.transportOverview?.visualMode || ""),
      showTransport: !!state.showTransport,
      showPorts: !!state.showPorts,
      labelsEnabled: !!portConfig.labelsEnabled,
      scopeLinkMode: String(portConfig.scopeLinkMode || ""),
      hasPortsData: Array.isArray(state.portsData?.features) && state.portsData.features.length > 0,
      visualModeControl: String(document.querySelector("#transportVisualMode")?.value || ""),
    };
  }), { timeout: 30_000 }).toMatchObject({
    visualMode: "network",
    showTransport: true,
    showPorts: true,
    labelsEnabled: false,
    scopeLinkMode: "linked",
    hasPortsData: true,
    visualModeControl: "network",
  });

  const appliedConfig = await page.evaluate(async () => {
    const { state } = await import("/js/core/state.js");
    const portConfig = state.styleConfig?.transportOverview?.port || {};
    return {
      opacity: Number(portConfig.opacity || 0),
      importanceThreshold: String(portConfig.importanceThreshold || ""),
      coverageReach: Number(portConfig.coverageReach || 0),
    };
  });
  expect(appliedConfig.opacity).toBeCloseTo(0.74, 1);
  expect(appliedConfig.importanceThreshold).toBe("secondary");
  expect(appliedConfig.coverageReach).toBeGreaterThan(0.35);
});


test("adaptive support, transport, and palette surfaces stay contained", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 900, height: 720 });
  await gotoApp(page, "/", { waitUntil: "domcontentloaded" });
  await waitForAppInteractive(page);

  await page.evaluate(() => {
    document.querySelector("#rightPanelToggle")?.click();
    document.querySelector("#inspectorSidebarTabProject")?.click();
    const utilities = document.querySelector("#inspectorUtilitiesSection");
    if (utilities instanceof HTMLDetailsElement) utilities.open = true;
  });

  await page.locator("#dockReferenceBtn").click();
  await expect(page.locator("#dockReferencePopover")).toBeVisible();

  const supportMetrics = await page.evaluate(() => {
    const rectToObject = (rect) => rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
    const popover = rectToObject(document.querySelector("#dockReferencePopover")?.getBoundingClientRect());
    return {
      popover,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      bodyScrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(supportMetrics.popover.left).toBeGreaterThanOrEqual(0);
  expect(supportMetrics.popover.right).toBeLessThanOrEqual(supportMetrics.viewportWidth);
  expect(supportMetrics.popover.bottom).toBeLessThanOrEqual(supportMetrics.viewportHeight);
  expect(supportMetrics.bodyScrollWidth).toBeLessThanOrEqual(supportMetrics.viewportWidth + 1);

  await page.keyboard.press("Escape");
  await page.locator("#zoomControls #scenarioTransportWorkbenchBtn").click();
  await expect(page.locator("#transportWorkbenchOverlay")).toBeVisible();
  await page.locator("#transportWorkbenchInfoBtn").click();
  await expect(page.locator("#transportWorkbenchInfoPopover")).toBeVisible();

  const transportMetrics = await page.evaluate(() => {
    const rectToObject = (rect) => rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
    const popover = rectToObject(document.querySelector("#transportWorkbenchInfoPopover")?.getBoundingClientRect());
    return {
      popover,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(transportMetrics.popover.left).toBeGreaterThanOrEqual(0);
  expect(transportMetrics.popover.right).toBeLessThanOrEqual(transportMetrics.viewportWidth);
  expect(transportMetrics.popover.bottom).toBeLessThanOrEqual(transportMetrics.viewportHeight);

  await page.locator("#transportWorkbenchCloseBtn").click();
  const paletteMetrics = await page.evaluate(() => {
    const rectToObject = (rect) => rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
    const list = document.querySelector("#paletteLibraryList");
    const rect = rectToObject(list?.getBoundingClientRect());
    const styles = list ? getComputedStyle(list) : null;
    return {
      rect,
      minHeight: styles?.getPropertyValue("--palette-library-list-min-block") || "",
      maxHeight: styles?.getPropertyValue("--palette-library-list-max-block") || "",
      overflowY: styles?.overflowY || "",
    };
  });
  expect(paletteMetrics.minHeight.trim()).toBe("240px");
  expect(paletteMetrics.maxHeight.trim()).toBe("480px");
  expect(["auto", "scroll"]).toContain(paletteMetrics.overflowY);
});
