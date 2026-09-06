// Coordinates core-territory application; target planning and state transactions stay separate.
export function createScenarioTerritoryController({
  t,
  prepareScenarioCoreApplication,
  getPrimaryReleasablePresetRef,
  applyPresetReference,
  getCountryState,
  getResolvedCountryColor,
  blockLockedScenarioInteraction,
  applyScenarioOwnerControllerAssignments,
  activateCoreOwner,
  setReleasableBoundaryVariant,
  applyScenarioAutoCompanionActions,
  refreshScenarioShellOverlays,
  showToast,
  render,
  renderList,
}) {
  function rejectPlan(countryState, plan, source) {
    if (plan.reason === "missing-preset") {
      console.warn("[scenario] Missing releasable core preset.", { source, code: countryState?.code || "" });
      return false;
    }
    if (plan.reason === "no-visible-features") {
      showToast(t("Current map does not include this preset's detail features. Load detail topology and try again.", "ui"), {
        title: t("Core territory was not applied.", "ui"), tone: "warning", duration: 4200,
      });
      console.warn("[scenario] Core territory apply skipped because no visible feature ids matched.", {
        source, code: countryState?.code || "", requestedCount: plan.requestedCount, missingCount: plan.missingCount,
      });
    } else if (plan.reason === "missing-variant") {
      showToast(t("Boundary variant could not be selected.", "ui"), {
        title: t("Variant not applied", "ui"), tone: "warning", duration: 3200,
      });
    }
    renderList();
    return false;
  }

  function rejectApplication(result) {
    if (result?.reason !== "no-visible-features") {
      showToast(t("Core territory was not applied.", "ui"), {
        title: t("Apply failed", "ui"), tone: "warning", duration: 3200,
      });
    }
    renderList();
    return false;
  }

  function commitCoreOwnership(countryState, plan, { forceSovereignty = false } = {}) {
    const result = applyScenarioOwnerControllerAssignments(plan.assignments, {
      render,
      historyKind: "scenario-core-apply-ownership",
      dirtyReason: "scenario-core-apply-ownership",
      recomputeReason: "scenario-core-apply-ownership",
    });
    if (!result?.applied) return rejectApplication(result);
    // Failed ownership edits must not change the active editing target or paint mode.
    activateCoreOwner(countryState.code, { forceSovereignty });
    showToast(result.changed > 0
      ? `${t("Applied", "ui")} ${result.changed}/${result.matchedCount} ${t("features", "ui")}`
      : t("Core territory already matches current ownership.", "ui"), {
      title: t(result.changed > 0 ? "Political ownership updated" : "No changes", "ui"),
      tone: result.changed > 0 ? "success" : "info",
      duration: result.changed > 0 ? 3200 : 2800,
    });
    applyScenarioAutoCompanionActions(countryState);
    refreshScenarioShellOverlays({ renderNow: false, borderReason: `scenario-shells:core-apply:${countryState.code}` });
    renderList();
    return true;
  }

  function applyScenarioReleasableCoreTerritory(countryState, {
    source = "scenario-actions", forceSovereignty = false, actionMode = "ownership",
  } = {}) {
    if (actionMode === "ownership") {
      if (blockLockedScenarioInteraction()) return false;
      const plan = prepareScenarioCoreApplication(countryState);
      if (!plan.applied) return rejectPlan(countryState, plan, source);
      return commitCoreOwnership(countryState, plan, { forceSovereignty });
    }
    const presetRef = getPrimaryReleasablePresetRef(countryState);
    if (!presetRef) return rejectPlan(countryState, { reason: "missing-preset" }, source);
    const color = getResolvedCountryColor(getCountryState(countryState.code) || countryState);
    const result = applyPresetReference(presetRef, {
      mode: "visual", color, render,
      visualHistoryKind: "scenario-core-apply-visual",
      visualDirtyReason: "scenario-core-apply-visual",
    });
    if (!result?.applied) return rejectApplication(result);
    showToast(`${t("Applied", "ui")} ${result.matchedCount}/${result.requestedCount} ${t("features", "ui")}`, {
      title: t("Visual color applied", "ui"), tone: "success", duration: 2800,
    });
    renderList();
    return true;
  }

  function applyReleasableBoundaryVariantSelection(countryState, variant) {
    if (!countryState?.code || !variant?.id || blockLockedScenarioInteraction()) return false;
    const plan = prepareScenarioCoreApplication(countryState, { variantId: variant.id });
    if (!plan.applied) return rejectPlan(countryState, plan, "scenario-boundary-variant");
    const selected = setReleasableBoundaryVariant(countryState.code, variant.id);
    if (!selected) {
      showToast(t("Boundary variant could not be selected.", "ui"), {
        title: t("Variant not applied", "ui"), tone: "warning", duration: 3200,
      });
      return false;
    }
    return commitCoreOwnership(getCountryState(countryState.code) || countryState, plan);
  }

  return { applyScenarioReleasableCoreTerritory, applyReleasableBoundaryVariantSelection };
}
