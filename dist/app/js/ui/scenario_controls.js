import { state as runtimeState } from "../core/state.js";
import { registerRuntimeHook } from "../core/state/index.js";
import {
  clearActiveScenarioCommand,
  applyScenarioByIdCommand,
  resetScenarioToBaselineCommand,
} from "../core/scenario_dispatcher.js";
import {
  formatScenarioAuditText,
  formatScenarioStatusText,
  getScenarioDisplayName,
  getScenarioRegistryEntries,
  normalizeScenarioId,
} from "../core/scenario_manager.js";
import {
  formatScenarioFatalRecoveryMessage,
  getScenarioFatalRecoveryState,
} from "../core/scenario_recovery.js";
import { loadScenarioRegistry } from "../core/scenario_resources.js";
import { t } from "./i18n.js";
import { showToast } from "./toast.js";
const state = runtimeState;

export function initScenarioControls() {
  const scenarioSelect = document.getElementById("scenarioSelect");
  const scenarioSelectButton = document.getElementById("scenarioSelectButton");
  const scenarioSelectButtonText = document.getElementById("scenarioSelectButtonText");
  const scenarioSelectMenu = document.getElementById("scenarioSelectMenu");
  const applyScenarioBtn = document.getElementById("applyScenarioBtn");
  const resetScenarioBtn = document.getElementById("resetScenarioBtn");
  const clearScenarioBtn = document.getElementById("clearScenarioBtn");
  const scenarioStatus = document.getElementById("scenarioStatus");
  const scenarioAuditHint = document.getElementById("scenarioAuditHint");
  let pendingScenarioId = "";

  const closeScenarioSelectMenu = () => {
    if (!scenarioSelectMenu || !scenarioSelectButton) return;
    scenarioSelectMenu.classList.add("hidden");
    scenarioSelectButton.setAttribute("aria-expanded", "false");
  };

  const syncScenarioSelectSurface = ({ entries, currentValue, disabled }) => {
    if (!scenarioSelectButton || !scenarioSelectButtonText || !scenarioSelectMenu) return;
    const normalizedValue = normalizeScenarioId(currentValue);
    const selectedOption = scenarioSelect?.selectedOptions?.[0] || null;
    scenarioSelectButtonText.textContent = selectedOption?.textContent || t("None", "ui");
    scenarioSelectButton.disabled = !!disabled;
    scenarioSelectButton.title = scenarioSelect?.title || "";
    scenarioSelectMenu.replaceChildren();

    const optionPayloads = [
      { value: "", label: t("None", "ui") },
      ...entries.map((entry) => ({
        value: normalizeScenarioId(entry.scenario_id),
        label: getScenarioDisplayName(entry, entry.scenario_id),
      })),
    ];
    optionPayloads.forEach(({ value, label }) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "scenario-select-option";
      optionButton.setAttribute("role", "option");
      optionButton.setAttribute("aria-selected", normalizeScenarioId(value) === normalizedValue ? "true" : "false");
      optionButton.classList.toggle("is-selected", normalizeScenarioId(value) === normalizedValue);
      optionButton.dataset.value = value;
      optionButton.textContent = label;
      optionButton.addEventListener("click", () => {
        if (!scenarioSelect || scenarioSelect.disabled) return;
        scenarioSelect.value = value;
        scenarioSelect.dispatchEvent(new Event("change", { bubbles: true }));
        closeScenarioSelectMenu();
        scenarioSelectButton.focus();
      });
      scenarioSelectMenu.appendChild(optionButton);
    });
  };

  const renderScenarioControls = () => {
    const entries = getScenarioRegistryEntries();
    const isApplyInFlight = !!runtimeState.scenarioApplyInFlight;
    const isBootBlocking = runtimeState.bootBlocking !== false;
    const fatalState = getScenarioFatalRecoveryState();
    const isFatalLocked = !!fatalState;
    const fatalMessage = formatScenarioFatalRecoveryMessage(fatalState);
    if (scenarioSelect) {
      const activeValue = normalizeScenarioId(runtimeState.activeScenarioId);
      const hasPendingOption = !!pendingScenarioId
        && entries.some((entry) => normalizeScenarioId(entry.scenario_id) === pendingScenarioId);
      const currentValue = (hasPendingOption ? pendingScenarioId : "") || activeValue;
      scenarioSelect.replaceChildren();
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = t("None", "ui");
      scenarioSelect.appendChild(emptyOption);
      entries.forEach((entry) => {
        const option = document.createElement("option");
        option.value = normalizeScenarioId(entry.scenario_id);
        option.textContent = getScenarioDisplayName(entry, entry.scenario_id);
        scenarioSelect.appendChild(option);
      });
      scenarioSelect.value = currentValue || "";
      scenarioSelect.disabled = isApplyInFlight || isBootBlocking || isFatalLocked;
      scenarioSelect.title = isFatalLocked ? fatalMessage : "";
      pendingScenarioId = normalizeScenarioId(scenarioSelect.value);
      syncScenarioSelectSurface({
        entries,
        currentValue: scenarioSelect.value,
        disabled: scenarioSelect.disabled,
      });
    }

    if (scenarioStatus) {
      scenarioStatus.textContent = formatScenarioStatusText();
    }
    if (scenarioAuditHint) {
      const auditText = formatScenarioAuditText();
      scenarioAuditHint.textContent = auditText;
      scenarioAuditHint.classList.toggle("hidden", !auditText);
    }
    if (resetScenarioBtn) {
      resetScenarioBtn.textContent = t("Reset", "ui");
      resetScenarioBtn.disabled = !runtimeState.activeScenarioId || isApplyInFlight || isBootBlocking || isFatalLocked;
      resetScenarioBtn.classList.toggle("hidden", !runtimeState.activeScenarioId);
      resetScenarioBtn.title = isFatalLocked ? fatalMessage : "";
    }
    if (clearScenarioBtn) {
      clearScenarioBtn.textContent = t("Exit Scenario", "ui");
      clearScenarioBtn.disabled = !runtimeState.activeScenarioId || isApplyInFlight || isBootBlocking || isFatalLocked;
      clearScenarioBtn.classList.toggle("hidden", !runtimeState.activeScenarioId);
      clearScenarioBtn.title = isFatalLocked ? fatalMessage : "";
    }
    if (applyScenarioBtn) {
      const selectedScenarioId = pendingScenarioId || normalizeScenarioId(scenarioSelect?.value);
      const isSelectedScenarioActive =
        !!selectedScenarioId && selectedScenarioId === normalizeScenarioId(runtimeState.activeScenarioId);
      applyScenarioBtn.textContent = t("Apply", "ui");
      applyScenarioBtn.disabled = !selectedScenarioId || isSelectedScenarioActive || isApplyInFlight || isBootBlocking || isFatalLocked;
      applyScenarioBtn.classList.toggle("hidden", isSelectedScenarioActive);
      applyScenarioBtn.title = isFatalLocked ? fatalMessage : "";
    }
  };

  registerRuntimeHook(state, "updateScenarioUIFn", renderScenarioControls);

  if (scenarioSelect && !scenarioSelect.dataset.bound) {
    scenarioSelect.addEventListener("change", () => {
      pendingScenarioId = normalizeScenarioId(scenarioSelect.value);
      renderScenarioControls();
    });
    scenarioSelect.dataset.bound = "true";
  }

  if (scenarioSelectButton && !scenarioSelectButton.dataset.bound) {
    scenarioSelectButton.addEventListener("click", () => {
      if (!scenarioSelectMenu || scenarioSelectButton.disabled) return;
      const isOpen = !scenarioSelectMenu.classList.contains("hidden");
      scenarioSelectMenu.classList.toggle("hidden", isOpen);
      scenarioSelectButton.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });
    scenarioSelectButton.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeScenarioSelectMenu();
      }
    });
    scenarioSelectButton.dataset.bound = "true";
  }

  if (scenarioSelectMenu && !scenarioSelectMenu.dataset.bound) {
    scenarioSelectMenu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeScenarioSelectMenu();
        scenarioSelectButton?.focus();
      }
    });
    document.addEventListener("click", (event) => {
      if (!scenarioSelectMenu || !scenarioSelectButton) return;
      if (scenarioSelectMenu.contains(event.target) || scenarioSelectButton.contains(event.target)) return;
      closeScenarioSelectMenu();
    });
    scenarioSelectMenu.dataset.bound = "true";
  }

  if (applyScenarioBtn && !applyScenarioBtn.dataset.bound) {
    applyScenarioBtn.addEventListener("click", async () => {
      const scenarioId = pendingScenarioId || normalizeScenarioId(scenarioSelect?.value);
      if (!scenarioId) return;
      try {
        await applyScenarioByIdCommand(scenarioId, {
          renderMode: "request",
          markDirtyReason: "scenario-apply",
          showToastOnComplete: true,
        });
        pendingScenarioId = normalizeScenarioId(runtimeState.activeScenarioId);
        renderScenarioControls();
      } catch (error) {
        console.error("Failed to apply scenario:", error);
        const message = String(error?.message || "").trim() || t("Unable to apply scenario.", "ui");
        showToast(message, {
          title: t("Scenario failed", "ui"),
          tone: "error",
          duration: 5200,
        });
      }
    });
    applyScenarioBtn.dataset.bound = "true";
  }

  if (resetScenarioBtn && !resetScenarioBtn.dataset.bound) {
    resetScenarioBtn.addEventListener("click", () => {
      if (!runtimeState.activeScenarioId || runtimeState.scenarioApplyInFlight) return;
      const changed = resetScenarioToBaselineCommand({
        renderMode: "request",
        markDirtyReason: "scenario-reset",
        showToastOnComplete: true,
      });
      if (changed) {
        pendingScenarioId = normalizeScenarioId(runtimeState.activeScenarioId);
        renderScenarioControls();
      }
    });
    resetScenarioBtn.dataset.bound = "true";
  }

  if (clearScenarioBtn && !clearScenarioBtn.dataset.bound) {
    clearScenarioBtn.addEventListener("click", () => {
      if (!runtimeState.activeScenarioId || runtimeState.scenarioApplyInFlight) return;
      clearActiveScenarioCommand({
        renderMode: "request",
        markDirtyReason: "scenario-clear",
        showToastOnComplete: true,
      });
      pendingScenarioId = normalizeScenarioId(runtimeState.activeScenarioId);
      renderScenarioControls();
    });
    clearScenarioBtn.dataset.bound = "true";
  }

  loadScenarioRegistry()
    .then(() => {
      renderScenarioControls();
    })
    .catch((error) => {
      console.warn("Unable to load scenario registry:", error);
      renderScenarioControls();
    });
}

