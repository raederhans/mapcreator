import { setScenarioDiagnosticsState } from "../../core/state.js";
import {
  createSpecialZonePatternPreviewStyle,
} from "../../core/special_zone_layers.js";
import {
  addCommunityComment,
  createBackendSave,
  downloadCommunitySave,
  listBackendSaves,
  listCommunitySaves,
  loginBackendUser,
  logoutBackendUser,
  publishBackendSave,
  refreshBackendSession,
  registerBackendUser,
  reportCommunitySave,
} from "../../api/backend_client.js";

/**
 * Owns the project support and diagnostics panels inside the sidebar:
 * - scenario audit panel rendering and load/hide actions
 * - legend editor rendering
 * - project import/export and debug-mode event binding
 *
 * sidebar.js keeps the higher-level facade:
 * - state callback registration
 * - startup restore and shell orchestration
 * - country/sidebar host layout and shared status flows
 */
export function createProjectSupportDiagnosticsController({
  state,
  elements,
  helpers,
}) {
  const {
    scenarioAuditSection,
    legendList,
    downloadProjectBtn,
    uploadProjectBtn,
    projectFileInput,
    projectFileName,
    projectSaveStatus,
    backendCloudSection,
    backendCloudStatus,
    backendCloudUsername,
    backendCloudPassword,
    backendCloudSaveTitle,
    backendCloudRegisterBtn,
    backendCloudLoginBtn,
    backendCloudLogoutBtn,
    backendCloudSaveBtn,
    backendCloudPublishBtn,
    backendCommunityRefreshBtn,
    backendCommunityList,
    debugModeSelect,
  } = elements;

  const {
    t,
    createEmptyNote,
    resolveAuditNumber,
    incrementSidebarCounter,
    loadScenarioAuditPayload,
    releaseScenarioAuditPayload,
    legendManager,
    mapRenderer,
    fileManager,
    showAppDialog,
    showToast,
    importProjectThroughFunnel,
    invalidateFrontlineOverlayState,
  } = helpers;

  const getScenarioAuditSummary = (auditPayload) => (
    auditPayload?.summary && typeof auditPayload.summary === "object" ? auditPayload.summary : {}
  );
  let latestCloudSaveId = "";
  let activeCloudUserKey = "";
  let latestCloudSaveUserKey = "";
  let latestCommunitySaves = [];

  const setBackendCloudStatus = (message) => {
    if (backendCloudStatus) {
      backendCloudStatus.textContent = message;
    }
  };

  const setBackendCloudSectionVisible = (visible) => {
    if (backendCloudSection) {
      backendCloudSection.hidden = !visible;
    }
  };

  const setDisabled = (element, disabled) => {
    if (element && typeof element === "object") {
      element.disabled = !!disabled;
    }
  };

  const setBackendCloudSessionState = (mode) => {
    const backendAvailable = mode === "anonymous" || mode === "authenticated";
    const authenticated = mode === "authenticated";
    setBackendCloudSectionVisible(backendAvailable || mode === "unavailable");
    setDisabled(backendCloudUsername, !backendAvailable);
    setDisabled(backendCloudPassword, !backendAvailable);
    setDisabled(backendCloudRegisterBtn, !backendAvailable);
    setDisabled(backendCloudLoginBtn, !backendAvailable);
    setDisabled(backendCloudSaveTitle, !authenticated);
    setDisabled(backendCloudLogoutBtn, !authenticated);
    setDisabled(backendCloudSaveBtn, !authenticated);
    setDisabled(backendCloudPublishBtn, !authenticated);
    setDisabled(backendCommunityRefreshBtn, !backendAvailable);
    renderCommunitySaves(latestCommunitySaves);
  };

  const resolveCloudUserKey = (user) => (
    String(user?.id || user?.username || user?.displayName || "").trim()
  );

  const updateActiveCloudUser = (user) => {
    const nextUserKey = resolveCloudUserKey(user);
    if (nextUserKey && activeCloudUserKey && nextUserKey !== activeCloudUserKey) {
      latestCloudSaveId = "";
      latestCloudSaveUserKey = "";
    }
    activeCloudUserKey = nextUserKey;
    return nextUserKey;
  };

  const clearActiveCloudUser = () => {
    activeCloudUserKey = "";
    latestCloudSaveId = "";
    latestCloudSaveUserKey = "";
  };

  const getBackendCredentials = () => ({
    username: String(backendCloudUsername?.value || "").trim(),
    password: String(backendCloudPassword?.value || ""),
  });

  const getCloudSaveTitle = () => (
    String(backendCloudSaveTitle?.value || "").trim()
    || String(state.activeScenarioManifest?.display_name || state.activeScenarioId || "Map project").trim()
    || "Map project"
  );

  const resolveLatestCloudSaveId = async () => {
    if (latestCloudSaveId && latestCloudSaveUserKey === activeCloudUserKey) return latestCloudSaveId;
    const payload = await listBackendSaves();
    const saves = Array.isArray(payload?.saves) ? payload.saves : [];
    const latestSave = saves.find((save) => save?.id);
    latestCloudSaveId = String(latestSave?.id || "");
    latestCloudSaveUserKey = activeCloudUserKey;
    return latestCloudSaveId;
  };

  const hydrateProjectFromCommunitySave = async (saveId) => {
    const payload = await downloadCommunitySave(saveId);
    const project = payload?.save?.project;
    if (!project || typeof project !== "object") {
      throw new Error("Community save did not include a project payload.");
    }
    const filename = String(payload?.filename || "community-mapcreator-save.json");
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const file = typeof File === "function" ? new File([blob], filename, { type: "application/json" }) : blob;
    importProjectThroughFunnel(file, {
      ui: {
        t,
        showAppDialog,
        showToast,
      },
      hooks: {
        refreshColorState: mapRenderer.refreshColorState,
        invalidateFrontlineOverlayState,
        onProjectImportComplete: () => {
          refreshProjectSaveStatus();
          setBackendCloudStatus(t("Community save loaded into the editor.", "ui"));
        },
        onProjectImportError: () => {
          const message = t("Project import failed before completion. Review the current map state.", "ui");
          refreshProjectSaveStatus(message);
          setBackendCloudStatus(message);
        },
      },
    });
  };

  const renderCommunitySaves = (saves = []) => {
    if (!backendCommunityList) return;
    backendCommunityList.replaceChildren();
    const normalizedSaves = Array.isArray(saves) ? saves : [];
    latestCommunitySaves = normalizedSaves;
    if (!normalizedSaves.length) {
      backendCommunityList.appendChild(createEmptyNote(t("No community saves yet", "ui")));
      return;
    }
    const authenticated = !!activeCloudUserKey;
    normalizedSaves.forEach((save) => {
      const row = document.createElement("div");
      row.className = "scenario-audit-stack-row";
      const title = document.createElement("span");
      title.className = "body-text scenario-audit-key";
      title.textContent = String(save?.title || "Community save");
      const meta = document.createElement("span");
      meta.className = "inspector-mini-label scenario-audit-note";
      meta.textContent = String(save?.owner?.displayName || save?.owner?.username || "unknown");
      const loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.className = "btn-secondary";
      loadButton.textContent = t("Load", "ui");
      loadButton.addEventListener("click", async () => {
        try {
          await hydrateProjectFromCommunitySave(String(save.id || ""));
          setBackendCloudStatus(t("Community save import started.", "ui"));
        } catch (error) {
          setBackendCloudStatus(String(error?.message || error || ""));
        }
      });
      const commentButton = document.createElement("button");
      commentButton.type = "button";
      commentButton.className = "btn-secondary";
      commentButton.disabled = !authenticated;
      commentButton.textContent = t("Comment", "ui");
      commentButton.addEventListener("click", async () => {
        try {
          await addCommunityComment(String(save.id || ""), "Tried this save locally.");
          setBackendCloudStatus(t("Comment posted.", "ui"));
        } catch (error) {
          setBackendCloudStatus(String(error?.message || error || ""));
        }
      });
      const reportButton = document.createElement("button");
      reportButton.type = "button";
      reportButton.className = "btn-secondary";
      reportButton.disabled = !authenticated;
      reportButton.textContent = t("Report", "ui");
      reportButton.addEventListener("click", async () => {
        try {
          await reportCommunitySave(String(save.id || ""), "other", "Reported from the local editor.");
          setBackendCloudStatus(t("Report submitted for review.", "ui"));
        } catch (error) {
          setBackendCloudStatus(String(error?.message || error || ""));
        }
      });
      row.append(title, meta, loadButton, commentButton, reportButton);
      backendCommunityList.appendChild(row);
    });
  };

  const refreshCommunitySaves = async () => {
    const payload = await listCommunitySaves();
    renderCommunitySaves(Array.isArray(payload?.saves) ? payload.saves : []);
  };

  const getScenarioAuditBlockerCount = (summary = {}) => {
    const flattened = Number(summary.blocker_count);
    if (Number.isFinite(flattened)) {
      return flattened;
    }
    return (
      Number(summary.geometry_blocker_count || 0)
      + Number(summary.topology_blocker_count || 0)
      + Number(summary.scenario_rule_blocker_count || 0)
    );
  };

  const createAuditValueRow = (label, value) => {
    const row = document.createElement("div");
    row.className = "scenario-audit-row";

    const left = document.createElement("span");
    left.className = "inspector-mini-label scenario-audit-label";
    left.textContent = label;

    const right = document.createElement("span");
    right.className = "country-row-title scenario-audit-value";
    right.textContent = String(value);

    row.appendChild(left);
    row.appendChild(right);
    return row;
  };

  const createAuditList = (items = [], renderItem) => {
    const list = document.createElement("div");
    list.className = "mt-2 flex flex-col gap-2 scenario-audit-list";
    if (!items.length) {
      list.appendChild(createEmptyNote(t("None", "ui")));
      return list;
    }
    items.forEach((item, index) => {
      const node = renderItem(item, index);
      if (node) {
        list.appendChild(node);
      }
    });
    return list;
  };

  const getVisibleSpecialZoneLegendLayers = () => (
    legendManager.getSpecialZoneLayers(state)
  );

  const refreshProjectSaveStatus = (message = "") => {
    if (!projectSaveStatus) return;
    const lastChange = String(state.lastDirtyReason || "").trim();
    if (message) {
      projectSaveStatus.textContent = message;
      return;
    }
    if (state.isDirty) {
      projectSaveStatus.textContent = `${t("Unsaved project changes.", "ui")} ${t("Project export includes appearance and transport settings.", "ui")}`;
      return;
    }
    if (lastChange === "project-export") {
      projectSaveStatus.textContent = t("Project exported. Appearance and transport settings are saved in the JSON file.", "ui");
      return;
    }
    if (lastChange === "project-import") {
      projectSaveStatus.textContent = t("Project imported. Appearance and transport settings were restored from the JSON file.", "ui");
      return;
    }
    projectSaveStatus.textContent = t("Project export includes appearance and transport settings.", "ui");
  };

  const appendSpecialZoneLegendRows = (layers = getVisibleSpecialZoneLegendLayers()) => {
    if (!layers.length) return false;
    const section = document.createElement("div");
    section.className = "legend-special-zone-section";
    const title = document.createElement("h4");
    title.className = "legend-section-title";
    title.textContent = t("Special Zone Layers", "ui");
    section.appendChild(title);
    layers.forEach((layer) => {
      const row = document.createElement("div");
      row.className = "legend-row legend-row-special-zone";
      const swatch = document.createElement("span");
      swatch.className = "legend-swatch legend-swatch-special-zone";
      const preview = createSpecialZonePatternPreviewStyle(layer.style);
      swatch.style.backgroundColor = preview.backgroundColor;
      swatch.style.backgroundImage = preview.backgroundImage;
      swatch.style.borderColor = preview.borderColor;
      const label = document.createElement("span");
      label.className = "legend-special-zone-label";
      label.textContent = layer.name;
      row.append(swatch, label);
      section.appendChild(row);
    });
    legendList.appendChild(section);
    return true;
  };

  const fetchScenarioDiagnosticsReport = async (scenarioId, { preview = false } = {}) => {
    const url = preview
      ? `/api/scenario-diagnostics/${encodeURIComponent(scenarioId)}/preview-repair`
      : `/api/scenario-diagnostics/${encodeURIComponent(scenarioId)}`;
    const response = await fetch(url, {
      method: preview ? "POST" : "GET",
      headers: preview ? { "Content-Type": "application/json" } : undefined,
      body: preview ? JSON.stringify({ scenarioId }) : undefined,
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(payload?.message || payload?.error || "Scenario diagnostics request failed."));
    }
    return payload;
  };

  const renderScenarioDiagnosticsSummary = (diagnosticsReport, diagnosticsPreview) => {
    const wrapper = document.createElement("div");
    wrapper.className = "mt-4 flex flex-col gap-2";
    const header = document.createElement("div");
    header.className = "section-header-block";
    header.textContent = t("Scenario diagnostics", "ui");
    wrapper.appendChild(header);
    if (!diagnosticsReport || typeof diagnosticsReport !== "object") {
      wrapper.appendChild(createEmptyNote(t("No diagnostics loaded", "ui")));
      return wrapper;
    }
    wrapper.appendChild(createAuditValueRow(t("Profile", "ui"), diagnosticsReport.profile || "unknown"));
    wrapper.appendChild(createAuditValueRow(
      t("Snapshot", "ui"),
      String(diagnosticsReport.snapshot_fingerprint || "").slice(0, 12) || "missing"
    ));
    wrapper.appendChild(createAuditValueRow(
      t("Safe fixes", "ui"),
      diagnosticsPreview?.preview?.safeRepairAvailable ? t("Available", "ui") : t("None", "ui")
    ));
    wrapper.appendChild(createAuditValueRow(
      t("Risky fixes", "ui"),
      Array.isArray(diagnosticsReport.risky_fixes_required) ? diagnosticsReport.risky_fixes_required.length : 0
    ));
    wrapper.appendChild(createAuditValueRow(
      t("Forbidden", "ui"),
      Array.isArray(diagnosticsReport.forbidden_violations) ? diagnosticsReport.forbidden_violations.length : 0
    ));
    wrapper.appendChild(createAuditValueRow(
      t("Owner bucket mismatches", "ui"),
      diagnosticsReport.owner_bucket_mismatch_count ?? 0
    ));
    wrapper.appendChild(createAuditValueRow(
      t("Coverage gaps", "ui"),
      diagnosticsReport.reverse_coverage_gap_count ?? 0
    ));
    const violations = Array.isArray(diagnosticsReport.violations) ? diagnosticsReport.violations.slice(0, 8) : [];
    wrapper.appendChild(createAuditList(violations, (item) => {
      const row = document.createElement("div");
      row.className = "scenario-audit-stack-row";
      row.appendChild(Object.assign(document.createElement("span"), {
        className: "inspector-mini-label scenario-audit-label",
        textContent: String(item?.fix_class || "info"),
      }));
      row.appendChild(Object.assign(document.createElement("span"), {
        className: "body-text scenario-audit-note",
        textContent: String(item?.message || ""),
      }));
      return row;
    }));
    return wrapper;
  };

  const renderScenarioAuditSummary = (auditPayload, manifestSummary = {}) => {
    const summary = getScenarioAuditSummary(auditPayload);
    const container = document.createElement("div");
    container.className = "mt-3 flex flex-col gap-2";
    container.appendChild(createAuditValueRow(
      t("Owners", "ui"),
      resolveAuditNumber(summary.owner_count, manifestSummary.owner_count)
    ));
    container.appendChild(createAuditValueRow(
      t("Features", "ui"),
      resolveAuditNumber(summary.feature_count, manifestSummary.feature_count)
    ));
    container.appendChild(createAuditValueRow(
      t("Approximate", "ui"),
      resolveAuditNumber(
        summary.approximate_count,
        summary.quality_counts?.approx_existing_geometry,
        manifestSummary.approximate_count,
        manifestSummary.quality_counts?.approx_existing_geometry
      )
    ));
    container.appendChild(createAuditValueRow(
      t("Manual-reviewed", "ui"),
      resolveAuditNumber(
        summary.manual_reviewed_feature_count,
        summary.quality_counts?.manual_reviewed,
        manifestSummary.manual_reviewed_feature_count,
        manifestSummary.quality_counts?.manual_reviewed
      )
    ));
    container.appendChild(createAuditValueRow(
      t("Synthetic", "ui"),
      resolveAuditNumber(
        summary.synthetic_count,
        summary.synthetic_owner_feature_count,
        manifestSummary.synthetic_count,
        manifestSummary.synthetic_owner_feature_count
      )
    ));
    container.appendChild(createAuditValueRow(
      t("Blockers", "ui"),
      getScenarioAuditBlockerCount(Object.keys(summary).length ? summary : manifestSummary)
    ));
    container.appendChild(createAuditValueRow(
      t("Critical checks", "ui"),
      resolveAuditNumber(
        summary.critical_region_check_count,
        summary.manual_reviewed_region_count,
        manifestSummary.critical_region_check_count,
        manifestSummary.manual_reviewed_region_count
      )
    ));
    return container;
  };

  const renderScenarioCriticalChecks = (auditPayload) => {
    const section = document.createElement("div");
    section.className = "mt-4";

    const title = document.createElement("div");
    title.className = "section-header-block";
    title.textContent = t("Critical checks", "ui");
    section.appendChild(title);

    const criticalRegions = Array.isArray(auditPayload?.critical_regions)
      ? auditPayload.critical_regions
      : [];
    const regionChecks = auditPayload?.region_checks && typeof auditPayload.region_checks === "object"
      ? auditPayload.region_checks
      : {};

    const items = criticalRegions.length
      ? criticalRegions.map((item) => ({
        regionId: String(item?.region_id || "").trim(),
        status: String(item?.status || regionChecks?.[item?.region_id]?.status || "unknown").trim(),
        notes: String(regionChecks?.[item?.region_id]?.notes || "").trim(),
      }))
      : Object.entries(regionChecks).map(([regionId, payload]) => ({
        regionId: String(regionId || "").trim(),
        status: String(payload?.status || "unknown").trim(),
        notes: String(payload?.notes || "").trim(),
      }));

    section.appendChild(createAuditList(items, ({ regionId, status, notes }) => {
      if (notes) {
        const details = document.createElement("details");
        details.className = "inspector-preset-details scenario-audit-check-details";

        const summary = document.createElement("summary");
        summary.className = "inspector-accordion-btn scenario-audit-check-summary";
        summary.textContent = `${regionId} · ${status}`;

        const body = document.createElement("div");
        body.className = "preset-country-body scenario-audit-note";
        body.textContent = notes;

        details.appendChild(summary);
        details.appendChild(body);
        return details;
      }

      const row = document.createElement("div");
      row.className = "scenario-audit-row scenario-audit-check-row";
      row.appendChild(Object.assign(document.createElement("span"), {
        className: "body-text scenario-audit-key",
        textContent: regionId,
      }));
      row.appendChild(Object.assign(document.createElement("span"), {
        className: "inspector-mini-label scenario-audit-status",
        textContent: status,
      }));
      return row;
    }));

    return section;
  };

  const renderScenarioAuditBlockers = (auditPayload) => {
    const section = document.createElement("div");
    section.className = "mt-4 flex flex-col gap-4";

    const topologyWrapper = document.createElement("div");
    const topologyTitle = document.createElement("div");
    topologyTitle.className = "section-header-block";
    topologyTitle.textContent = t("Topology blockers", "ui");
    topologyWrapper.appendChild(topologyTitle);
    topologyWrapper.appendChild(createAuditList(
      Array.isArray(auditPayload?.topology_blockers) ? auditPayload.topology_blockers : [],
      (item) => {
        const row = document.createElement("div");
        row.className = "scenario-audit-stack-row";
        row.appendChild(Object.assign(document.createElement("span"), {
          className: "body-text scenario-audit-key",
          textContent: String(item?.blocker_id || item?.id || "unknown"),
        }));
        if (item?.notes) {
          row.appendChild(Object.assign(document.createElement("span"), {
            className: "inspector-mini-label scenario-audit-note",
            textContent: String(item.notes),
          }));
        }
        return row;
      }
    ));

    const ruleWrapper = document.createElement("div");
    const ruleTitle = document.createElement("div");
    ruleTitle.className = "section-header-block";
    ruleTitle.textContent = t("Scenario rule blockers", "ui");
    ruleWrapper.appendChild(ruleTitle);
    ruleWrapper.appendChild(createAuditList(
      Array.isArray(auditPayload?.scenario_rule_blockers) ? auditPayload.scenario_rule_blockers : [],
      (item) => {
        const row = document.createElement("div");
        row.className = "scenario-audit-stack-row";
        row.appendChild(Object.assign(document.createElement("span"), {
          className: "body-text scenario-audit-key",
          textContent: String(item?.rule_id || item?.blocker_id || "unknown"),
        }));
        if (item?.notes) {
          row.appendChild(Object.assign(document.createElement("span"), {
            className: "inspector-mini-label scenario-audit-note",
            textContent: String(item.notes),
          }));
        }
        return row;
      }
    ));

    section.appendChild(topologyWrapper);
    section.appendChild(ruleWrapper);
    return section;
  };

  const renderScenarioAuditTopologySummary = (auditPayload) => {
    const section = document.createElement("div");
    section.className = "mt-4";

    const title = document.createElement("div");
    title.className = "section-header-block";
    title.textContent = t("Topology Summary", "ui");
    section.appendChild(title);

    const belarusHybrid = auditPayload?.topology_summaries?.belarus_hybrid || {};
    const rows = [
      [t("Total features", "ui"), belarusHybrid.total_feature_count],
      [t("Border rayons kept", "ui"), belarusHybrid.border_rayons_kept],
      [t("Historical composites built", "ui"), belarusHybrid.historical_composites_built],
      [t("Interior groups built", "ui"), belarusHybrid.interior_groups_built],
    ].filter(([, value]) => Number.isFinite(Number(value)));

    if (!rows.length) {
      section.appendChild(createEmptyNote(t("None", "ui")));
      return section;
    }

    const subtitle = document.createElement("div");
    subtitle.className = "inspector-mini-label mt-2";
    subtitle.textContent = t("Belarus hybrid", "ui");
    section.appendChild(subtitle);

    const list = document.createElement("div");
    list.className = "mt-2 flex flex-col gap-2";
    rows.forEach(([label, value]) => {
      list.appendChild(createAuditValueRow(label, value));
    });
    section.appendChild(list);
    return section;
  };

  const renderScenarioAuditPanel = () => {
    if (!scenarioAuditSection) return;

    const activeScenarioId = String(state.activeScenarioId || "").trim();
    const auditUi = state.scenarioAuditUi || {};
    const diagnosticsUi = state.scenarioDiagnosticsUi || {};
    const activeAuditLoaded =
      !!activeScenarioId &&
      auditUi.loadedForScenarioId === activeScenarioId &&
      state.scenarioAudit &&
      typeof state.scenarioAudit === "object";
    const activeDiagnosticsLoaded =
      !!activeScenarioId &&
      diagnosticsUi.loadedForScenarioId === activeScenarioId &&
      state.scenarioDiagnostics &&
      typeof state.scenarioDiagnostics === "object";
    const manifestSummary =
      state.activeScenarioManifest?.summary && typeof state.activeScenarioManifest.summary === "object"
        ? state.activeScenarioManifest.summary
        : {};

    scenarioAuditSection.replaceChildren();

    const title = document.createElement("div");
    title.className = "section-header sidebar-tool-title";
    title.textContent = t("Scenario Audit", "ui");

    const hint = document.createElement("p");
    hint.className = "sidebar-tool-hint";
    hint.textContent = t(
      "Inspect critical checks, blockers, and source quality for the active scenario.",
      "ui"
    );

    scenarioAuditSection.appendChild(title);
    scenarioAuditSection.appendChild(hint);

    const appendScenarioDiagnosticsStatus = () => {
      if (diagnosticsUi.loading) {
        scenarioAuditSection.appendChild(createEmptyNote(t("Loading diagnostics…", "ui")));
      } else if (diagnosticsUi.errorMessage) {
        const diagnosticsError = document.createElement("div");
        diagnosticsError.className = "inspector-mini-label mt-3";
        diagnosticsError.textContent = `${t("Unable to load diagnostics", "ui")}: ${diagnosticsUi.errorMessage}`;
        scenarioAuditSection.appendChild(diagnosticsError);
      } else if (activeDiagnosticsLoaded) {
        scenarioAuditSection.appendChild(
          renderScenarioDiagnosticsSummary(state.scenarioDiagnostics, state.scenarioDiagnosticsPreview)
        );
      }
    };

    if (!activeScenarioId) {
      scenarioAuditSection.appendChild(createEmptyNote(t("No scenario active", "ui")));
      return;
    }

    const actions = document.createElement("div");
    actions.className = "mt-3 flex flex-col gap-2";

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.className = activeAuditLoaded ? "btn-secondary" : "btn-primary";
    loadButton.disabled = !!auditUi.loading;
    loadButton.textContent = t(activeAuditLoaded ? "Hide Audit Details" : "Load Audit Details", "ui");
    loadButton.addEventListener("click", async () => {
      if (activeAuditLoaded) {
        releaseScenarioAuditPayload(activeScenarioId);
        return;
      }
      try {
        await loadScenarioAuditPayload(activeScenarioId, {
          forceReload: false,
        });
      } catch (error) {
        console.error("Failed to load scenario audit:", error);
      }
    });
    actions.appendChild(loadButton);

    const diagnosticsButton = document.createElement("button");
    diagnosticsButton.type = "button";
    diagnosticsButton.className = activeDiagnosticsLoaded ? "btn-secondary" : "btn-primary";
    diagnosticsButton.disabled = !!diagnosticsUi.loading;
    diagnosticsButton.textContent = t(activeDiagnosticsLoaded ? "Hide Diagnostics" : "Load Diagnostics", "ui");
    diagnosticsButton.addEventListener("click", async () => {
      if (activeDiagnosticsLoaded) {
        setScenarioDiagnosticsState(state);
        renderScenarioAuditPanel();
        return;
      }
      setScenarioDiagnosticsState(state, {
        ui: {
          loading: true,
          errorMessage: "",
          loadedForScenarioId: activeScenarioId,
        },
      });
      renderScenarioAuditPanel();
      try {
        const report = await fetchScenarioDiagnosticsReport(activeScenarioId);
        const previewPayload = await fetchScenarioDiagnosticsReport(activeScenarioId, { preview: true });
        setScenarioDiagnosticsState(state, {
          report,
          preview: previewPayload,
          ui: {
            loading: false,
            errorMessage: "",
            loadedForScenarioId: activeScenarioId,
          },
        });
      } catch (error) {
        console.error("Failed to load scenario diagnostics:", error);
        setScenarioDiagnosticsState(state, {
          ui: {
            loading: false,
            errorMessage: String(error?.message || error || ""),
            loadedForScenarioId: activeScenarioId,
          },
        });
      }
      renderScenarioAuditPanel();
    });
    actions.appendChild(diagnosticsButton);

    if (!activeAuditLoaded) {
      if (auditUi.loading) {
        scenarioAuditSection.appendChild(createEmptyNote(t("Loading audit details…", "ui")));
      } else if (auditUi.errorMessage) {
        const errorNote = createEmptyNote(t("Unable to load audit details", "ui"));
        scenarioAuditSection.appendChild(errorNote);

        const detail = document.createElement("div");
        detail.className = "inspector-mini-label mt-2";
        detail.textContent = auditUi.errorMessage;
        scenarioAuditSection.appendChild(detail);
      }
      appendScenarioDiagnosticsStatus();
      scenarioAuditSection.appendChild(actions);
      return;
    }

    if (auditUi.loading) {
      scenarioAuditSection.appendChild(createEmptyNote(t("Loading audit details…", "ui")));
    } else if (auditUi.errorMessage) {
      const errorDetail = document.createElement("div");
      errorDetail.className = "inspector-mini-label mt-3";
      errorDetail.textContent = `${t("Unable to load audit details", "ui")}: ${auditUi.errorMessage}`;
      scenarioAuditSection.appendChild(errorDetail);
    }

    scenarioAuditSection.appendChild(renderScenarioAuditSummary(state.scenarioAudit, manifestSummary));
    scenarioAuditSection.appendChild(renderScenarioCriticalChecks(state.scenarioAudit));
    scenarioAuditSection.appendChild(renderScenarioAuditBlockers(state.scenarioAudit));
    scenarioAuditSection.appendChild(renderScenarioAuditTopologySummary(state.scenarioAudit));
    appendScenarioDiagnosticsStatus();
    scenarioAuditSection.appendChild(actions);
  };


  let lastLegendKey = null;
  const refreshLegendEditor = () => {
    if (!legendList) return;
    incrementSidebarCounter("legendRenders");
    const colors = legendManager.getUniqueColors(state);
    const specialZoneLegendLayers = getVisibleSpecialZoneLegendLayers();
    const specialZoneLegendKey = legendManager.getSpecialZoneSignature(state);
    const key = `${colors.join("|")}::${specialZoneLegendKey}`;
    if (key === lastLegendKey && legendList.dataset.ready === "true") return;
    lastLegendKey = key;
    legendList.dataset.ready = "true";
    legendList.innerHTML = "";

    if (!colors.length && !specialZoneLegendKey) {
      const empty = document.createElement("div");
      empty.className = "legend-empty-state";
      empty.textContent = t("Paint the map first, then rename each color entry here. Empty names clear the label, and the current legend list is kept inside this working session.", "ui");
      legendList.appendChild(empty);
      return;
    }

    colors.forEach((color, index) => {
      const row = document.createElement("div");
      row.className = "legend-row";

      const swatch = document.createElement("span");
      swatch.className = "legend-swatch";
      swatch.style.backgroundColor = color;

      const input = document.createElement("input");
      input.type = "text";
      input.className = "legend-input";
      input.placeholder = `Category ${index + 1}`;
      input.value = legendManager.getLabel(color);
      input.addEventListener("input", (event) => {
        legendManager.setLabel(color, event.target.value);
        mapRenderer.renderLegend(colors, legendManager.getLabels());
      });

      row.appendChild(swatch);
      row.appendChild(input);
      legendList.appendChild(row);
    });
    appendSpecialZoneLegendRows(specialZoneLegendLayers);
  };


  const bindEvents = () => {
    refreshProjectSaveStatus();
    if (downloadProjectBtn && !downloadProjectBtn.dataset.bound) {
      downloadProjectBtn.addEventListener("click", () => {
        refreshProjectSaveStatus(t("Exporting project file with appearance and transport settings.", "ui"));
        fileManager.exportProject(state);
        refreshProjectSaveStatus();
      });
      downloadProjectBtn.dataset.bound = "true";
    }

    if (uploadProjectBtn && projectFileInput && !uploadProjectBtn.dataset.bound) {
      uploadProjectBtn.addEventListener("click", async () => {
        if (state.isDirty) {
          const shouldContinue = await showAppDialog({
            title: t("Load Project", "ui"),
            message: t("You have unsaved changes. Loading a project will replace the current map.", "ui"),
            details: t(
              "Continue only if you are ready to discard the current working state or have already exported it.",
              "ui"
            ),
            confirmLabel: t("Discard and Load", "ui"),
            cancelLabel: t("Stay on Current Map", "ui"),
            tone: "warning",
          });
          if (!shouldContinue) return;
        }
        projectFileInput.click();
      });
      uploadProjectBtn.dataset.bound = "true";
    }

    if (projectFileInput && !projectFileInput.dataset.bound) {
      projectFileInput.addEventListener("change", () => {
        const file = projectFileInput.files?.[0];
        if (!file) {
          if (projectFileName) {
            projectFileName.textContent = t("No file selected", "ui");
          }
          refreshProjectSaveStatus(t("No file selected", "ui"));
          return;
        }
        if (projectFileName) {
          projectFileName.textContent = file.name;
        }
        refreshProjectSaveStatus(t("Project import started. Appearance and transport settings will be restored from the file.", "ui"));
        importProjectThroughFunnel(file, {
          ui: {
            t,
            showAppDialog,
            showToast,
          },
          hooks: {
            refreshColorState: mapRenderer.refreshColorState,
            invalidateFrontlineOverlayState,
            onProjectImportComplete: () => refreshProjectSaveStatus(),
            onProjectImportError: () => refreshProjectSaveStatus(t("Project import failed before completion. Review the current map state.", "ui")),
          },
        });
        projectFileInput.value = "";
      });
      projectFileInput.dataset.bound = "true";
    }

    if (debugModeSelect && !debugModeSelect.dataset.bound) {
      debugModeSelect.value = String(state.debugMode || "PROD").toUpperCase();
      debugModeSelect.addEventListener("change", (event) => {
        mapRenderer.setDebugMode(event.target.value);
      });
      debugModeSelect.dataset.bound = "true";
    }

    if (backendCloudRegisterBtn && !backendCloudRegisterBtn.dataset.bound) {
      backendCloudRegisterBtn.addEventListener("click", async () => {
        try {
          const credentials = getBackendCredentials();
          const payload = await registerBackendUser({
            ...credentials,
            displayName: credentials.username,
          });
          latestCloudSaveId = "";
          latestCloudSaveUserKey = "";
          updateActiveCloudUser(payload?.user);
          setBackendCloudSessionState("authenticated");
          setBackendCloudStatus(`${t("Logged in as", "ui")} ${payload?.user?.displayName || credentials.username}`);
        } catch (error) {
          setBackendCloudStatus(String(error?.message || error || ""));
        }
      });
      backendCloudRegisterBtn.dataset.bound = "true";
    }

    if (backendCloudLoginBtn && !backendCloudLoginBtn.dataset.bound) {
      backendCloudLoginBtn.addEventListener("click", async () => {
        try {
          const credentials = getBackendCredentials();
          const payload = await loginBackendUser(credentials);
          latestCloudSaveId = "";
          latestCloudSaveUserKey = "";
          updateActiveCloudUser(payload?.user);
          setBackendCloudSessionState("authenticated");
          setBackendCloudStatus(`${t("Logged in as", "ui")} ${payload?.user?.displayName || credentials.username}`);
        } catch (error) {
          setBackendCloudStatus(String(error?.message || error || ""));
        }
      });
      backendCloudLoginBtn.dataset.bound = "true";
    }

    if (backendCloudLogoutBtn && !backendCloudLogoutBtn.dataset.bound) {
      backendCloudLogoutBtn.addEventListener("click", async () => {
        try {
          await logoutBackendUser();
          clearActiveCloudUser();
          setBackendCloudSessionState("anonymous");
          setBackendCloudStatus(t("Logged out.", "ui"));
        } catch (error) {
          setBackendCloudStatus(String(error?.message || error || ""));
        }
      });
      backendCloudLogoutBtn.dataset.bound = "true";
    }

    if (backendCloudSaveBtn && !backendCloudSaveBtn.dataset.bound) {
      backendCloudSaveBtn.addEventListener("click", async () => {
        try {
          const project = fileManager.buildProjectPayload?.(state);
          if (!project) throw new Error("Project state is unavailable.");
          const payload = await createBackendSave({
            title: getCloudSaveTitle(),
            description: String(state.activeScenarioId || ""),
            project,
          });
          latestCloudSaveId = String(payload?.save?.id || "");
          latestCloudSaveUserKey = activeCloudUserKey;
          setBackendCloudStatus(t("Cloud save created.", "ui"));
        } catch (error) {
          setBackendCloudStatus(String(error?.message || error || ""));
        }
      });
      backendCloudSaveBtn.dataset.bound = "true";
    }

    if (backendCloudPublishBtn && !backendCloudPublishBtn.dataset.bound) {
      backendCloudPublishBtn.addEventListener("click", async () => {
        try {
          const saveId = await resolveLatestCloudSaveId();
          if (!saveId) throw new Error("Create a cloud save before publishing.");
          await publishBackendSave(saveId);
          await refreshCommunitySaves();
          setBackendCloudStatus(t("Latest cloud save published.", "ui"));
        } catch (error) {
          setBackendCloudStatus(String(error?.message || error || ""));
        }
      });
      backendCloudPublishBtn.dataset.bound = "true";
    }

    if (backendCommunityRefreshBtn && !backendCommunityRefreshBtn.dataset.bound) {
      backendCommunityRefreshBtn.addEventListener("click", async () => {
        try {
          await refreshCommunitySaves();
          setBackendCloudStatus(t("Community saves refreshed.", "ui"));
        } catch (error) {
          setBackendCloudStatus(String(error?.message || error || ""));
        }
      });
      backendCommunityRefreshBtn.dataset.bound = "true";
    }

    if (backendCloudStatus && !backendCloudStatus.dataset.sessionChecked) {
      setBackendCloudSessionState("probing");
      refreshBackendSession()
        .then((payload) => {
          updateActiveCloudUser(payload?.user);
          setBackendCloudSessionState("authenticated");
          setBackendCloudStatus(`${t("Logged in as", "ui")} ${payload?.user?.displayName || payload?.user?.username || ""}`);
        })
        .catch((error) => {
          if (error?.code === "auth_required" || error?.status === 401) {
            clearActiveCloudUser();
            setBackendCloudSessionState("anonymous");
            return;
          }
          clearActiveCloudUser();
          setBackendCloudSessionState(error?.payload?.code ? "unavailable" : "hidden");
          setBackendCloudStatus(t("Local backend unavailable. Start the local dev server to use Cloud Saves.", "ui"));
        })
        .finally(() => {
          backendCloudStatus.dataset.sessionChecked = "true";
        });
    }

  };

  return {
    bindEvents,
    refreshProjectSaveStatus,
    refreshLegendEditor,
    renderScenarioAuditPanel,
  };
}
