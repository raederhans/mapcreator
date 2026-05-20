// Transport workbench event owner.
// 这里集中处理 workbench chrome 的事件绑定，controller 继续拥有状态语义和渲染顺序。

function requireAction(actions, actionName) {
  const action = actions?.[actionName];
  if (typeof action !== "function") {
    throw new TypeError(`transport workbench event owner requires action: ${actionName}`);
  }
  return action;
}

export function bindTransportWorkbenchEventOnce(node, bind) {
  if (!node || node.dataset?.transportWorkbenchEventBound === "true") return false;
  bind(node);
  node.dataset.transportWorkbenchEventBound = "true";
  return true;
}

function isCompareKey(event) {
  return event.key === " " || event.key === "Enter";
}

export function createTransportWorkbenchEventOwner({
  documentRef = globalThis.document,
  body = documentRef?.body || null,
  scenarioButton = null,
  appearanceButton = null,
  infoButton = null,
  closeButton = null,
  resetButton = null,
  compareButton = null,
  zoomOutButton = null,
  zoomInButton = null,
  rotateButton = null,
  applyButton = null,
  packSelect = null,
  familyTabs = [],
  inspectorTabButtons = [],
  actions = {},
} = {}) {
  const bind = () => {
    bindTransportWorkbenchEventOnce(scenarioButton, (button) => {
      const isOpen = requireAction(actions, "isOpen");
      const setOpen = requireAction(actions, "setOpen");
      button.addEventListener("click", () => {
        if (isOpen()) {
          setOpen(false);
          return;
        }
        setOpen(true, { trigger: button });
      });
    });

    bindTransportWorkbenchEventOnce(appearanceButton, (button) => {
      const setOpen = requireAction(actions, "setOpen");
      button.addEventListener("click", () => {
        setOpen(true, { trigger: button });
      });
    });

    bindTransportWorkbenchEventOnce(infoButton, (button) => {
      const toggleInfoPopover = requireAction(actions, "toggleInfoPopover");
      button.addEventListener("click", () => {
        toggleInfoPopover();
      });
    });

    bindTransportWorkbenchEventOnce(closeButton, (button) => {
      const setOpen = requireAction(actions, "setOpen");
      button.addEventListener("click", () => {
        setOpen(false);
      });
    });

    bindTransportWorkbenchEventOnce(resetButton, (button) => {
      const resetView = requireAction(actions, "resetView");
      button.addEventListener("click", () => {
        resetView();
      });
    });

    bindTransportWorkbenchEventOnce(compareButton, (button) => {
      const setCompareHeld = requireAction(actions, "setCompareHeld");
      button.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        setCompareHeld(true);
      });
      ["pointerup", "pointercancel", "pointerleave", "blur"].forEach((eventName) => {
        button.addEventListener(eventName, () => {
          setCompareHeld(false);
        });
      });
      button.addEventListener("keydown", (event) => {
        if (!isCompareKey(event)) return;
        event.preventDefault();
        setCompareHeld(true);
      });
      button.addEventListener("keyup", (event) => {
        if (!isCompareKey(event)) return;
        event.preventDefault();
        setCompareHeld(false);
      });
    });

    bindTransportWorkbenchEventOnce(zoomOutButton, (button) => {
      const stepCarrierZoom = requireAction(actions, "stepCarrierZoom");
      const syncPreviewControls = requireAction(actions, "syncPreviewControls");
      button.addEventListener("click", () => {
        stepCarrierZoom(-1);
        syncPreviewControls();
      });
    });

    bindTransportWorkbenchEventOnce(zoomInButton, (button) => {
      const stepCarrierZoom = requireAction(actions, "stepCarrierZoom");
      const syncPreviewControls = requireAction(actions, "syncPreviewControls");
      button.addEventListener("click", () => {
        stepCarrierZoom(1);
        syncPreviewControls();
      });
    });

    bindTransportWorkbenchEventOnce(rotateButton, (button) => {
      const rotateCarrier = requireAction(actions, "rotateCarrier");
      const syncPreviewControls = requireAction(actions, "syncPreviewControls");
      button.addEventListener("click", () => {
        rotateCarrier();
        syncPreviewControls();
      });
    });

    bindTransportWorkbenchEventOnce(applyButton, (button) => {
      const getRenderContext = requireAction(actions, "getRenderContext");
      const getApplyButtonState = requireAction(actions, "getApplyButtonState");
      const applyFamilyToMainMap = requireAction(actions, "applyFamilyToMainMap");
      const renderShell = requireAction(actions, "renderShell");
      button.addEventListener("click", async () => {
        const context = getRenderContext();
        const applyState = getApplyButtonState(context.family.id);
        if (!applyState.enabled) return;
        try {
          await applyFamilyToMainMap(context);
        } catch (error) {
          console.error(`[transport-workbench] Failed to apply ${context.family.id} to the main map.`, error);
        }
        renderShell(getRenderContext());
      });
    });

    bindTransportWorkbenchEventOnce(packSelect, (select) => {
      const setActivePackId = requireAction(actions, "setActivePackId");
      select.addEventListener("change", () => {
        setActivePackId(select.value);
      });
    });

    familyTabs.forEach((button) => {
      bindTransportWorkbenchEventOnce(button, (tabButton) => {
        const setActiveFamily = requireAction(actions, "setActiveFamily");
        const renderUi = requireAction(actions, "renderUi");
        tabButton.addEventListener("click", () => {
          setActiveFamily(tabButton.dataset.transportFamily || "road");
          renderUi();
        });
      });
    });

    inspectorTabButtons.forEach((button) => {
      bindTransportWorkbenchEventOnce(button, (tabButton) => {
        const setInspectorTab = requireAction(actions, "setInspectorTab");
        const getRenderContext = requireAction(actions, "getRenderContext");
        const renderShell = requireAction(actions, "renderShell");
        const renderInspector = requireAction(actions, "renderInspector");
        tabButton.addEventListener("click", () => {
          setInspectorTab(tabButton.dataset.transportInspectorTab || "inspect");
          const context = getRenderContext();
          renderShell(context);
          renderInspector(context.family, context.config, context.compareHeld);
        });
      });
    });

    if (documentRef && body && !body.dataset.transportWorkbenchEscapeBound) {
      const isOpen = requireAction(actions, "isOpen");
      const handlePopoverEscape = requireAction(actions, "handlePopoverEscape");
      const setOpen = requireAction(actions, "setOpen");
      documentRef.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !isOpen()) return;
        if (handlePopoverEscape(event)) return;
        event.preventDefault();
        setOpen(false);
      });
      body.dataset.transportWorkbenchEscapeBound = "true";
    }
  };

  return { bind };
}
