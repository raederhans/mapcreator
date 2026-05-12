export const TRANSPORT_FACILITY_ICON_ATLAS_URL = new URL("./transport_facility_icon_atlas.png", import.meta.url).href;

export const TRANSPORT_FACILITY_ICON_CELL_SIZE_PX = 64;

export const TRANSPORT_FACILITY_ICON_CELLS = Object.freeze({
  airport_major: Object.freeze({ x: 0, y: 0, size: TRANSPORT_FACILITY_ICON_CELL_SIZE_PX }),
  airport_regional: Object.freeze({ x: 64, y: 0, size: TRANSPORT_FACILITY_ICON_CELL_SIZE_PX }),
  airport_local: Object.freeze({ x: 128, y: 0, size: TRANSPORT_FACILITY_ICON_CELL_SIZE_PX }),
  airport_military: Object.freeze({ x: 192, y: 0, size: TRANSPORT_FACILITY_ICON_CELL_SIZE_PX }),
  airport_spaceport: Object.freeze({ x: 0, y: 64, size: TRANSPORT_FACILITY_ICON_CELL_SIZE_PX }),
  port_hub: Object.freeze({ x: 64, y: 64, size: TRANSPORT_FACILITY_ICON_CELL_SIZE_PX }),
  port_important: Object.freeze({ x: 128, y: 64, size: TRANSPORT_FACILITY_ICON_CELL_SIZE_PX }),
  port_local: Object.freeze({ x: 192, y: 64, size: TRANSPORT_FACILITY_ICON_CELL_SIZE_PX }),
});

const ICON_BASE_SIZE_PX = Object.freeze({
  airport_major: 15,
  airport_regional: 14,
  airport_local: 12,
  airport_military: 16,
  airport_spaceport: 16,
  port_hub: 15,
  port_important: 14,
  port_local: 12,
});

let atlasImage = null;
let atlasStatus = "idle";
const atlasStatusCallbacks = new Set();

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase();
}

function getImportanceRank(properties = {}) {
  return Math.max(1, Math.round(Number(properties.importance_rank || 1)));
}

export function resolveTransportFacilityIconKey(familyId, properties = {}) {
  const normalizedFamilyId = normalizeToken(familyId);
  const importanceRank = getImportanceRank(properties);
  if (normalizedFamilyId === "airport") {
    const type = normalizeToken(properties.airport_type || properties.category || properties.type);
    const typeLabel = normalizeToken(properties.airport_type_label || properties.category_label || properties.type_label);
    const combinedType = `${type} ${typeLabel}`.trim();
    if (combinedType.includes("space")) return "airport_spaceport";
    if (combinedType.includes("military")) return "airport_military";
    if (combinedType.includes("major") || combinedType.includes("international") || importanceRank >= 3) {
      return "airport_major";
    }
    if (combinedType.includes("mid") || combinedType.includes("regional") || importanceRank >= 2) {
      return "airport_regional";
    }
    return "airport_local";
  }
  if (normalizedFamilyId === "port") {
    const designation = normalizeToken(properties.legal_designation || properties.category || properties.type);
    const designationLabel = normalizeToken(properties.legal_designation_label || properties.category_label || properties.type_label);
    const combinedDesignation = `${designation} ${designationLabel}`.trim();
    if (
      designation === "international_hub"
      || combinedDesignation.includes("international")
      || combinedDesignation.includes("hub")
      || importanceRank >= 3
    ) {
      return "port_hub";
    }
    if (
      designation === "important"
      || combinedDesignation.includes("important")
      || combinedDesignation.includes("core")
      || importanceRank >= 2
    ) {
      return "port_important";
    }
    return "port_local";
  }
  return "";
}

export function getTransportFacilityIconCell(iconKey) {
  return TRANSPORT_FACILITY_ICON_CELLS[iconKey] || null;
}

export function resolveTransportFacilityIconDrawSizePx(
  familyId,
  properties = {},
  { visualScale = 1 } = {},
) {
  const iconKey = resolveTransportFacilityIconKey(familyId, properties);
  const baseSize = ICON_BASE_SIZE_PX[iconKey] || 12;
  const normalizedVisualScale = Math.min(1.14, Math.max(0.9, Number(visualScale) || 1));
  return Math.min(18, Math.max(10, baseSize * normalizedVisualScale));
}

function notifyAtlasStatus(status) {
  atlasStatus = status;
  const callbacks = Array.from(atlasStatusCallbacks);
  atlasStatusCallbacks.clear();
  callbacks.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      globalThis.console?.warn?.("[transport-facility-icons] atlas status callback failed", error);
    }
  });
}

export function isTransportFacilityIconAtlasReady() {
  return atlasStatus === "ready";
}

export function getTransportFacilityIconAtlasStatus() {
  return atlasStatus;
}

export function getTransportFacilityIconAtlasImage(onStatusChange = null) {
  if (typeof Image === "undefined") {
    atlasStatus = "unavailable";
    return null;
  }
  if (typeof onStatusChange === "function") {
    if (atlasStatus === "ready" || atlasStatus === "error") {
      onStatusChange();
    } else {
      atlasStatusCallbacks.add(onStatusChange);
    }
  }
  if (atlasImage) return atlasImage;
  atlasImage = new Image();
  atlasStatus = "loading";
  atlasImage.decoding = "async";
  atlasImage.onload = () => notifyAtlasStatus("ready");
  atlasImage.onerror = () => notifyAtlasStatus("error");
  atlasImage.src = TRANSPORT_FACILITY_ICON_ATLAS_URL;
  if (atlasImage.complete && Number(atlasImage.naturalWidth || 0) > 0) {
    notifyAtlasStatus("ready");
  }
  return atlasImage;
}
