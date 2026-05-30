// Transport workbench popover owner.
// Owns info/help popover DOM, focus, and positioning so the controller keeps only workbench orchestration.

import {
  TRANSPORT_WORKBENCH_FAMILIES,
  TRANSPORT_WORKBENCH_INLINE_HELP_COPY,
  TRANSPORT_WORKBENCH_INLINE_HELP_SECTIONS,
} from "./transport_workbench_descriptor.js";

const isNodeLike = (node) => !!node && typeof node.classList?.contains === "function";
const isOpen = (node) => isNodeLike(node) && !node.classList.contains("hidden");
const focusNode = (node) => {
  if (node && typeof node.focus === "function") {
    node.focus({ preventScroll: true });
  }
};

const APPLY_COMPATIBILITY_COPY = Object.freeze({
  main_map_bridge: "main map apply",
  local_board: "workbench board",
  preview_only: "preview only",
});

function buildTransportCapabilityMatrixBody(translate) {
  return TRANSPORT_WORKBENCH_FAMILIES
    .map((entry) => `${translate(entry.label)}: ${translate(APPLY_COMPATIBILITY_COPY[entry.applyCompatibility] || "preview only")}`)
    .join(" · ");
}

export function createTransportWorkbenchPopoverOwner({
  panel = null,
  infoButton = null,
  infoPopover = null,
  infoBody = null,
  sectionHelpPopover = null,
  sectionHelpTitle = null,
  sectionHelpBody = null,
  translate = (label) => label,
  pickUiCopy = (_zh, en) => en,
  getDataContract = () => null,
  focusSurface = () => {},
  rememberTrigger = () => {},
} = {}) {
  let sectionHelpState = null;

  const closeInfoPopover = ({ restoreFocus = false } = {}) => {
    if (!infoPopover) return;
    infoPopover.classList.add("hidden");
    infoPopover.setAttribute("aria-hidden", "true");
    infoButton?.setAttribute("aria-expanded", "false");
    if (restoreFocus) {
      focusNode(infoButton);
    }
  };

  const closeSectionHelpPopover = ({ restoreFocus = false } = {}) => {
    if (!sectionHelpPopover) return;
    sectionHelpPopover.classList.add("hidden");
    sectionHelpPopover.setAttribute("aria-hidden", "true");
    sectionHelpState?.trigger?.setAttribute?.("aria-expanded", "false");
    if (restoreFocus) {
      focusNode(sectionHelpState?.trigger);
    }
    sectionHelpState = null;
  };

  const positionSectionHelpPopover = (trigger) => {
    if (
      !trigger
      || !sectionHelpPopover
      || !panel
      || typeof trigger.getBoundingClientRect !== "function"
      || typeof sectionHelpPopover.getBoundingClientRect !== "function"
      || typeof panel.getBoundingClientRect !== "function"
    ) {
      return;
    }
    const panelRect = panel.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const popoverWidth = sectionHelpPopover.offsetWidth || 280;
    const popoverHeight = sectionHelpPopover.offsetHeight || 140;
    let left = triggerRect.right + 10;
    let top = triggerRect.top - 4;
    const minInset = 18;
    if (left + popoverWidth > panelRect.right - minInset) {
      left = triggerRect.left - popoverWidth - 10;
    }
    left = Math.min(Math.max(left, panelRect.left + minInset), Math.max(panelRect.left + minInset, panelRect.right - popoverWidth - minInset));
    top = Math.min(Math.max(top, panelRect.top + minInset), Math.max(panelRect.top + minInset, panelRect.bottom - popoverHeight - minInset));
    sectionHelpPopover.style.left = `${left}px`;
    sectionHelpPopover.style.top = `${top}px`;
  };

  const renderSectionHelpPopover = (familyId, sectionKey) => {
    if (!sectionHelpTitle || !sectionHelpBody) return false;
    const helpCopy = TRANSPORT_WORKBENCH_INLINE_HELP_COPY[familyId]?.[sectionKey];
    if (!helpCopy) return false;
    sectionHelpTitle.textContent = translate(helpCopy.title);
    sectionHelpBody.replaceChildren();
    const body = document.createElement("p");
    body.className = "transport-workbench-info-text";
    body.textContent = translate(helpCopy.body);
    sectionHelpBody.appendChild(body);
    return true;
  };

  const toggleSectionHelpPopover = (trigger, familyId, sectionKey) => {
    if (!sectionHelpPopover) return { opened: false };
    const isSameTarget = sectionHelpState
      && sectionHelpState.familyId === familyId
      && sectionHelpState.sectionKey === sectionKey
      && sectionHelpState.trigger === trigger
      && isOpen(sectionHelpPopover);
    if (isSameTarget) {
      closeSectionHelpPopover({ restoreFocus: true });
      return { opened: false };
    }
    closeInfoPopover({ restoreFocus: false });
    closeSectionHelpPopover({ restoreFocus: false });
    if (!renderSectionHelpPopover(familyId, sectionKey)) {
      return { opened: false };
    }
    sectionHelpState = { familyId, sectionKey, trigger };
    sectionHelpPopover.classList.remove("hidden");
    sectionHelpPopover.setAttribute("aria-hidden", "false");
    trigger?.setAttribute?.("aria-expanded", "true");
    positionSectionHelpPopover(trigger);
    return { opened: true };
  };

  const renderInfoContent = (family) => {
    if (!infoBody || !family) return { blockCount: 0 };
    infoBody.replaceChildren();
    const dataContract = getDataContract(family.id);
    const defaultBlocks = [
      {
        title: "Current lens",
        body: family.lensBody,
      },
      {
        title: "Baseline",
        body: family.lensNext,
      },
      family.supportsDetailedControls
        ? null
        : {
          title: "Availability",
          body: `${family.label} is still a reserved shell. Detailed controls stay closed until the live Japan schema and packs are wired.`,
        },
      {
        title: "Preview controls",
        body: "Use mouse wheel or the + / - controls to zoom. The 90° button swaps between the framed Japan default view and the north-up reference view. Reset View restores the framed default preview.",
      },
      {
        title: "Capability matrix",
        body: () => buildTransportCapabilityMatrixBody(translate),
      },
      dataContract
        ? {
          title: "Data path",
          body: `${dataContract.adapterId} stays on ${dataContract.packs.join(" + ")} using ${dataContract.geometrySource} with ${dataContract.hardeningSource}. Keep the pack build reproducible and diagnostics-friendly so rule changes can be traced later.`,
        }
        : null,
    ];
    const blocks = family.id === "layers"
      ? [
        {
          title: pickUiCopy("当前用途", "Current use"),
          body: pickUiCopy(
            "Layers 用来调整 transport families 的当前本地绘制顺序。中间排序板负责拖拽重排，Inspect 会同步回显当前顺序。",
            "Layers controls the current local draw order for transport families. Use the center board to drag and reorder families, and use Inspect to review the active order.",
          ),
        },
        {
          title: pickUiCopy("排序板行为", "Board behavior"),
          body: pickUiCopy(
            "Layers 使用排序板模式。这里没有缩放、旋转或基线对比，重点是确认绘制顺序和 family 状态。",
            "Layers uses board mode. Zoom, rotate, and baseline compare are hidden here, and the main task is confirming draw order and family status.",
          ),
        },
        {
          title: pickUiCopy("Inspector 分工", "Inspector role"),
          body: pickUiCopy(
            "左侧只保留上下文说明，真正的顺序确认在中间排序板和右侧 Inspect。其余页签继续保留统一结构，方便以后接入更多帮助内容。",
            "The left column keeps context only, while the center board and right-side Inspect confirm the active order. The remaining tabs stay in place so later help and controls can land without changing the shell.",
          ),
        },
        {
          title: "Capability matrix",
          body: () => buildTransportCapabilityMatrixBody(translate),
        },
      ]
      : defaultBlocks;

    const visibleBlocks = blocks.filter(Boolean);
    visibleBlocks.forEach((block) => {
      const node = document.createElement("section");
      node.className = "transport-workbench-info-block";
      const title = document.createElement("div");
      title.className = "transport-workbench-info-subtitle";
      title.textContent = translate(block.title);
      const body = document.createElement("p");
      body.className = "transport-workbench-info-text";
      body.textContent = typeof block.body === "function" ? block.body() : translate(block.body);
      node.append(title, body);
      infoBody.appendChild(node);
    });
    return { blockCount: visibleBlocks.length };
  };

  const toggleInfoPopover = (family) => {
    if (!infoPopover) return { opened: false };
    if (isOpen(infoPopover)) {
      closeInfoPopover({ restoreFocus: true });
      return { opened: false };
    }
    closeSectionHelpPopover({ restoreFocus: false });
    renderInfoContent(family);
    rememberTrigger(infoPopover, infoButton);
    infoPopover.classList.remove("hidden");
    infoPopover.setAttribute("aria-hidden", "false");
    infoButton?.setAttribute("aria-expanded", "true");
    focusSurface(infoPopover);
    return { opened: true };
  };

  const createSectionHelpButton = (familyId, section) => {
    if (!TRANSPORT_WORKBENCH_INLINE_HELP_SECTIONS[familyId]?.has(section.key)) {
      return null;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "transport-workbench-section-help-btn";
    button.textContent = "?";
    const helpLabel = translate("Open section help");
    button.setAttribute("aria-label", helpLabel);
    button.setAttribute("title", helpLabel);
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSectionHelpPopover(button, familyId, section.key);
    });
    return button;
  };

  const handleEscape = (event) => {
    if (event?.key !== "Escape") return false;
    if (isOpen(sectionHelpPopover)) {
      event.preventDefault();
      closeSectionHelpPopover({ restoreFocus: true });
      return true;
    }
    if (isOpen(infoPopover)) {
      event.preventDefault();
      closeInfoPopover({ restoreFocus: true });
      return true;
    }
    return false;
  };

  return {
    closeInfoPopover,
    closeSectionHelpPopover,
    createSectionHelpButton,
    handleEscape,
    isInfoPopoverOpen: () => isOpen(infoPopover),
    isSectionHelpPopoverOpen: () => isOpen(sectionHelpPopover),
    renderInfoContent,
    toggleInfoPopover,
    toggleSectionHelpPopover,
  };
}
