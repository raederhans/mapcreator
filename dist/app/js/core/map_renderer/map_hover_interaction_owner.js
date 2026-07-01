const TOOLTIP_OFFSET_PX = 12;

const REQUIRED_GETTER_NAMES = Object.freeze([
  "nowMs",
  "getLastMouseMoveTime",
  "getMouseThrottleMs",
  "hasHoverData",
  "isSpecialZoneEditorActive",
  "inspectHgoRuntimePreviewFromEvent",
  "isReducedHoverPhase",
  "getHoverIds",
  "getHitFromEvent",
  "hasTooltip",
  "getHoveredFacilityEntry",
  "getHoveredFacilityEntryFromEvent",
  "isFacilityDetailsSurfaceActive",
  "getHoveredCityTooltipEntry",
  "getFeatureForHit",
  "getTooltipTextForFeature",
]);

const REQUIRED_EFFECT_NAMES = Object.freeze([
  "setLastMouseMoveTime",
  "setHoverIds",
  "setHoveredFacilityEntry",
  "updateDevHoverHit",
  "markHoverOverlayDirty",
  "scheduleHoverOverlayRender",
  "queueTooltipUpdate",
  "setMapInteractionCursor",
  "clearUnderlyingHoverForFacilityEntry",
]);

const REQUIRED_HELPER_NAMES = Object.freeze(["getFacilityKey"]);

function requireFunction(source, name, label) {
  const candidate = source?.[name];
  if (typeof candidate !== "function") {
    throw new TypeError(`${label}.${name} must be a function.`);
  }
  return candidate;
}

function createApi(source, names, label) {
  return Object.fromEntries(names.map((name) => [name, requireFunction(source, name, label)]));
}

function createTrace() {
  return { effectOrder: [], getterOrder: [] };
}

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function createSummary({ branch, skipped = false, hit = null, cursor = "", tooltipVisible = false, trace }) {
  return Object.freeze({
    branch,
    skipped: Boolean(skipped),
    hitId: String(hit?.id || ""),
    targetType: String(hit?.targetType || ""),
    cursor: String(cursor || ""),
    tooltipVisible: Boolean(tooltipVisible),
    effectOrder: freezeArray(trace?.effectOrder),
    getterOrder: freezeArray(trace?.getterOrder),
  });
}

function getTooltipPayload(event, text) {
  return { visible: true, text, x: Number(event?.clientX || 0) + TOOLTIP_OFFSET_PX, y: Number(event?.clientY || 0) + TOOLTIP_OFFSET_PX };
}

function normalizeHoverIds(ids = {}) {
  return {
    landId: ids.landId || null,
    waterId: ids.waterId || null,
    specialId: ids.specialId || null,
  };
}

function getNextHoverIds(hit = {}) {
  const id = hit.id || null;
  return normalizeHoverIds({
    landId: hit.targetType === "land" ? id : null,
    waterId: hit.targetType === "water" ? id : null,
    specialId: hit.targetType === "special" ? id : null,
  });
}

function hasAnyHoverId(ids = {}) {
  return !!(ids.landId || ids.waterId || ids.specialId);
}

function sameHoverIds(left = {}, right = {}) {
  return left.landId === right.landId
    && left.waterId === right.waterId
    && left.specialId === right.specialId;
}

export function createMapHoverInteractionOwner({ state = {}, getters = {}, effects = {}, helpers = {} } = {}) {
  const hoverSnapPx = Number(state.hoverSnapPx || 0);
  const getterApi = createApi(getters, REQUIRED_GETTER_NAMES, "getters");
  const effectApi = createApi(effects, REQUIRED_EFFECT_NAMES, "effects");
  const helperApi = createApi(helpers, REQUIRED_HELPER_NAMES, "helpers");

  function runGetter(trace, name, ...args) {
    trace.getterOrder.push(name);
    return getterApi[name](...args);
  }

  function runEffect(trace, name, ...args) {
    trace.effectOrder.push(name);
    return effectApi[name](...args);
  }

  function markAndSchedule(trace) {
    runEffect(trace, "markHoverOverlayDirty");
    runEffect(trace, "scheduleHoverOverlayRender");
  }

  function hideTooltipAndCursor(trace) {
    runEffect(trace, "queueTooltipUpdate", { visible: false });
    runEffect(trace, "setMapInteractionCursor", "");
  }

  function clearFacilityIfPresent(trace) {
    if (runGetter(trace, "getHoveredFacilityEntry")) {
      runEffect(trace, "setHoveredFacilityEntry", null);
    }
  }

  function clearHoverForExclusiveMode(trace, branch, devHit = null, cursor = "") {
    runEffect(trace, "setHoverIds", normalizeHoverIds());
    clearFacilityIfPresent(trace);
    runEffect(trace, "updateDevHoverHit", devHit);
    markAndSchedule(trace);
    runEffect(trace, "queueTooltipUpdate", { visible: false });
    runEffect(trace, "setMapInteractionCursor", cursor);
    return createSummary({ branch, hit: devHit, cursor, trace });
  }

  function clearReducedHover(trace) {
    const currentHoverIds = normalizeHoverIds(runGetter(trace, "getHoverIds"));
    if (hasAnyHoverId(currentHoverIds)) {
      runEffect(trace, "setHoverIds", normalizeHoverIds());
      markAndSchedule(trace);
    }
    if (runGetter(trace, "getHoveredFacilityEntry")) {
      runEffect(trace, "setHoveredFacilityEntry", null);
      markAndSchedule(trace);
    }
    runEffect(trace, "updateDevHoverHit", null);
    hideTooltipAndCursor(trace);
    return createSummary({ branch: "reduced-hover", skipped: true, trace });
  }

  function updateHoverIds(trace, hit) {
    const nextHoverIds = getNextHoverIds(hit);
    const currentHoverIds = normalizeHoverIds(runGetter(trace, "getHoverIds"));
    if (!sameHoverIds(nextHoverIds, currentHoverIds)) {
      runEffect(trace, "setHoverIds", nextHoverIds);
      markAndSchedule(trace);
    }
  }

  function queueVisibleTooltip(trace, event, text, branch, hit = null, cursor = "") {
    runEffect(trace, "queueTooltipUpdate", getTooltipPayload(event, text));
    return createSummary({ branch, hit, cursor, tooltipVisible: true, trace });
  }

  function handleMouseMove(event) {
    const trace = createTrace();
    const now = runGetter(trace, "nowMs");
    const throttleMs = Number(runGetter(trace, "getMouseThrottleMs") || 0);
    const lastMouseMoveTime = Number(runGetter(trace, "getLastMouseMoveTime") || 0);
    if (now - lastMouseMoveTime < throttleMs) {
      return createSummary({ branch: "throttled", skipped: true, trace });
    }
    runEffect(trace, "setLastMouseMoveTime", now);
    if (!runGetter(trace, "hasHoverData")) {
      return createSummary({ branch: "no-hover-data", skipped: true, trace });
    }
    if (runGetter(trace, "isSpecialZoneEditorActive")) {
      return clearHoverForExclusiveMode(trace, "special-zone-editor");
    }

    const hgoRuntimeHover = runGetter(trace, "inspectHgoRuntimePreviewFromEvent", event, { eventType: "hover" });
    if (hgoRuntimeHover?.active) {
      const hgoHit = hgoRuntimeHover.hit?.id ? hgoRuntimeHover.hit : null;
      return clearHoverForExclusiveMode(trace, "hgo-runtime-hover", hgoHit, hgoHit ? "pointer" : "");
    }

    if (runGetter(trace, "isReducedHoverPhase")) {
      return clearReducedHover(trace);
    }

    const hit = runGetter(trace, "getHitFromEvent", event, {
      enableSnap: false,
      snapPx: hoverSnapPx,
      eventType: "hover",
    }) || {};
    updateHoverIds(trace, hit);
    runEffect(trace, "updateDevHoverHit", hit.id ? hit : null);

    if (!runGetter(trace, "hasTooltip")) {
      return createSummary({ branch: "no-tooltip", hit, skipped: true, trace });
    }

    const hoveredFacility = runGetter(trace, "getHoveredFacilityEntryFromEvent", event);
    const facilityDetailsActive = hoveredFacility
      ? runGetter(trace, "isFacilityDetailsSurfaceActive", hoveredFacility.familyId)
      : false;
    const nextFacilityKey = helperApi.getFacilityKey(hoveredFacility);
    const previousFacilityKey = helperApi.getFacilityKey(runGetter(trace, "getHoveredFacilityEntry"));
    if (nextFacilityKey !== previousFacilityKey) {
      runEffect(trace, "setHoveredFacilityEntry", hoveredFacility || null);
      markAndSchedule(trace);
    }
    const blockedUnderlyingHover = hoveredFacility
      ? runEffect(trace, "clearUnderlyingHoverForFacilityEntry", hoveredFacility)
      : false;
    const cursor = facilityDetailsActive ? "pointer" : "";
    runEffect(trace, "setMapInteractionCursor", cursor);
    if (hoveredFacility?.tooltipText) {
      return queueVisibleTooltip(trace, event, hoveredFacility.tooltipText, "facility-tooltip", hit, cursor);
    }
    if (blockedUnderlyingHover) {
      runEffect(trace, "queueTooltipUpdate", { visible: false });
      return createSummary({ branch: "facility-blocked-underlying", hit, cursor, trace });
    }

    const hoveredCityEntry = runGetter(trace, "getHoveredCityTooltipEntry", event, hit);
    if (hoveredCityEntry?.tooltipText) {
      return queueVisibleTooltip(trace, event, hoveredCityEntry.tooltipText, "city-tooltip", hit, cursor);
    }

    const feature = hit.id ? runGetter(trace, "getFeatureForHit", hit) : null;
    if (feature) {
      return queueVisibleTooltip(
        trace,
        event,
        runGetter(trace, "getTooltipTextForFeature", feature),
        "feature-tooltip",
        hit,
        cursor,
      );
    }
    runEffect(trace, "queueTooltipUpdate", { visible: false });
    return createSummary({ branch: "empty-hover", hit, cursor, trace });
  }

  return Object.freeze({
    handleMouseMove,
  });
}
