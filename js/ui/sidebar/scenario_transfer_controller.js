// Owns manual historical transfers and automatic companions of core-territory application.
// The existing ownership transaction remains responsible for locks, history and rendering.
export function createScenarioTransferController({
  t,
  normalizeCountryCode,
  getScenarioCountryMeta,
  resolveCompanionActionFeatureIds,
  filterToVisibleFeatureIds,
  applyScenarioOwnerControllerAssignments,
  showToast,
  refreshScenarioShellOverlays,
  render,
  renderList,
  appendActionSection,
  createInspectorActionButton,
}) {
  function applyScenarioCompanionAction(
    countryState,
    action,
    { silent = false, suppressRenderList = false, recomputeShells = true } = {},
  ) {
    if (!countryState || !action) return false;
    const targetOwnerCode = normalizeCountryCode(action.target_owner_tag);
    if (!targetOwnerCode) {
      if (!silent) {
        showToast(t("Historical transfer target is missing.", "ui"), {
          title: t("Transfer not applied", "ui"), tone: "warning", duration: 3200,
        });
      }
      return false;
    }
    const featureIds = resolveCompanionActionFeatureIds(
      action, getScenarioCountryMeta(countryState.code) || countryState,
    );
    const { requestedIds, matchedIds: targetIds } = filterToVisibleFeatureIds(featureIds);
    if (!targetIds.length) {
      if (!silent) {
        // Empty source and unavailable detail keep their distinct existing messages.
        const hasRequestedIds = requestedIds.length > 0;
        showToast(t(hasRequestedIds
          ? "Current map does not include this action's detail features. Load detail topology and try again."
          : "Historical transfer was not applied.", "ui"), {
          title: t("Transfer not applied", "ui"), tone: "warning",
          duration: hasRequestedIds ? 4200 : 3200,
        });
      }
      if (!suppressRenderList) renderList();
      return false;
    }
    const assignments = Object.fromEntries(targetIds.map((id) => [id, {
      ownerCode: targetOwnerCode,
      controllerCode: targetOwnerCode,
    }]));
    const result = applyScenarioOwnerControllerAssignments(assignments, {
      render,
      historyKind: `scenario-companion-transfer:${countryState.code}:${action.id || "action"}`,
      dirtyReason: "scenario-companion-transfer",
      recomputeReason: "sidebar-companion-transfer",
    });
    if (!result?.applied) {
      if (!silent && result?.reason !== "no-visible-features") {
        showToast(t("Historical transfer was not applied.", "ui"), {
          title: t("Transfer not applied", "ui"), tone: "warning", duration: 3200,
        });
      }
      if (!suppressRenderList) renderList();
      return false;
    }
    if (!silent) {
      showToast(result.changed > 0
        ? `${t("Applied", "ui")} ${result.changed}/${targetIds.length} ${t("features", "ui")}`
        : t("Historical transfer already matches current ownership.", "ui"), {
        title: result.changed > 0
          ? action.label || t("Historical transfer applied", "ui") : t("No changes", "ui"),
        tone: result.changed > 0 ? "success" : "info",
        duration: result.changed > 0 ? 3200 : 2800,
      });
    }
    if (recomputeShells) {
      refreshScenarioShellOverlays({
        renderNow: false,
        borderReason: `scenario-shells:companion-action:${countryState.code}:${action.id || "action"}`,
      });
    }
    if (!suppressRenderList) renderList();
    return true;
  }

  function applyScenarioAutoCompanionActions(countryState) {
    const actions = Array.isArray(countryState?.companionActions) ? countryState.companionActions : [];
    let appliedAny = false;
    for (const action of actions) {
      if (!action?.auto_apply_on_core_territory) continue;
      const applied = applyScenarioCompanionAction(countryState, action, {
        silent: true, suppressRenderList: true, recomputeShells: false,
      });
      appliedAny = applied || appliedAny;
    }
    return appliedAny;
  }

  function renderScenarioHistoricalTransfers(container, countryState) {
    const actions = Array.isArray(countryState?.companionActions)
      ? countryState.companionActions.filter((action) => !action?.hidden_in_ui) : [];
    if (!actions.length) return;
    const section = appendActionSection(container, t("Historical Transfers", "ui"));
    for (const action of actions) {
      section.appendChild(createInspectorActionButton(action.label || action.id, () => {
        applyScenarioCompanionAction(countryState, action);
      }));
    }
  }

  return { applyScenarioCompanionAction, applyScenarioAutoCompanionActions, renderScenarioHistoricalTransfers };
}
