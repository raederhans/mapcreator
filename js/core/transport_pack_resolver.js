const TARGET_MAIN_MAP_PACKS = Object.freeze({
  japan_road: Object.freeze({ packId: "japan_road", family: "road", label: "Japan road", country: "Japan", sourcePolicy: "local_source_cache_only" }),
  japan_rail: Object.freeze({ packId: "japan_rail", family: "rail", label: "Japan rail", country: "Japan", sourcePolicy: "local_source_cache_only" }),
  germany_road: Object.freeze({ packId: "germany_road", family: "road", label: "Germany road", country: "Germany", sourcePolicy: "real_source_cache_only" }),
  uk_road: Object.freeze({ packId: "uk_road", family: "road", label: "United Kingdom road", country: "United Kingdom", sourcePolicy: "real_source_cache_only" }),
  usa_road: Object.freeze({ packId: "usa_road", family: "road", label: "United States road", country: "United States", sourcePolicy: "real_source_cache_only" }),
  france_road: Object.freeze({ packId: "france_road", family: "road", label: "France road", country: "France", sourcePolicy: "real_source_cache_only" }),
  china_road: Object.freeze({ packId: "china_road", family: "road", label: "China road", country: "China", sourcePolicy: "real_source_cache_only" }),
  india_road: Object.freeze({ packId: "india_road", family: "road", label: "India road", country: "India", sourcePolicy: "real_source_cache_only" }),
  russia_road: Object.freeze({ packId: "russia_road", family: "road", label: "Russia road", country: "Russia", sourcePolicy: "real_source_cache_only" }),
  france_rail: Object.freeze({ packId: "france_rail", family: "rail", label: "France rail", country: "France", sourcePolicy: "real_source_cache_only" }),
  germany_rail: Object.freeze({ packId: "germany_rail", family: "rail", label: "Germany rail", country: "Germany", sourcePolicy: "real_source_cache_only" }),
  uk_rail: Object.freeze({ packId: "uk_rail", family: "rail", label: "United Kingdom rail", country: "United Kingdom", sourcePolicy: "real_source_cache_only" }),
  usa_rail: Object.freeze({ packId: "usa_rail", family: "rail", label: "United States rail", country: "United States", sourcePolicy: "real_source_cache_only" }),
  china_rail: Object.freeze({ packId: "china_rail", family: "rail", label: "China rail", country: "China", sourcePolicy: "real_source_cache_only" }),
  india_rail: Object.freeze({ packId: "india_rail", family: "rail", label: "India rail", country: "India", sourcePolicy: "real_source_cache_only" }),
  russia_rail: Object.freeze({ packId: "russia_rail", family: "rail", label: "Russia rail", country: "Russia", sourcePolicy: "real_source_cache_only" }),
  usa_airport: Object.freeze({ packId: "usa_airport", family: "airport", label: "United States airport", country: "United States", sourcePolicy: "real_source_cache_only" }),
  china_airport: Object.freeze({ packId: "china_airport", family: "airport", label: "China airport", country: "China", sourcePolicy: "real_source_cache_only" }),
  russia_airport: Object.freeze({ packId: "russia_airport", family: "airport", label: "Russia airport", country: "Russia", sourcePolicy: "real_source_cache_only" }),
  india_airport: Object.freeze({ packId: "india_airport", family: "airport", label: "India airport", country: "India", sourcePolicy: "real_source_cache_only" }),
  germany_airport: Object.freeze({ packId: "germany_airport", family: "airport", label: "Germany airport", country: "Germany", sourcePolicy: "real_source_cache_only" }),
  france_airport: Object.freeze({ packId: "france_airport", family: "airport", label: "France airport", country: "France", sourcePolicy: "real_source_cache_only" }),
  uk_airport: Object.freeze({ packId: "uk_airport", family: "airport", label: "United Kingdom airport", country: "United Kingdom", sourcePolicy: "real_source_cache_only" }),
  usa_port: Object.freeze({ packId: "usa_port", family: "port", label: "United States port", country: "United States", sourcePolicy: "real_source_cache_only" }),
  germany_port: Object.freeze({ packId: "germany_port", family: "port", label: "Germany port", country: "Germany", sourcePolicy: "real_source_cache_only" }),
  france_port: Object.freeze({ packId: "france_port", family: "port", label: "France port", country: "France", sourcePolicy: "real_source_cache_only" }),
  uk_port: Object.freeze({ packId: "uk_port", family: "port", label: "United Kingdom port", country: "United Kingdom", sourcePolicy: "real_source_cache_only" }),
  china_port: Object.freeze({ packId: "china_port", family: "port", label: "China port", country: "China", sourcePolicy: "real_source_cache_only" }),
  india_port: Object.freeze({ packId: "india_port", family: "port", label: "India port", country: "India", sourcePolicy: "real_source_cache_only" }),
  russia_port: Object.freeze({ packId: "russia_port", family: "port", label: "Russia port", country: "Russia", sourcePolicy: "real_source_cache_only" }),
});

export const TARGET_MAIN_MAP_PACK_IDS = Object.freeze(Object.keys(TARGET_MAIN_MAP_PACKS));

const WORKBENCH_SELECTABLE_PACKS = Object.freeze({
  ...TARGET_MAIN_MAP_PACKS,
  japan_airport: Object.freeze({ packId: "japan_airport", family: "airport", label: "Japan airport", country: "Japan", sourcePolicy: "local_source_cache_only" }),
  japan_port: Object.freeze({ packId: "japan_port", family: "port", label: "Japan port", country: "Japan", sourcePolicy: "local_source_cache_only_internal_trial" }),
  japan_energy_facilities: Object.freeze({ packId: "japan_energy_facilities", family: "energy_facilities", label: "Japan energy facilities", country: "Japan", sourcePolicy: "local_source_cache_only" }),
  japan_mineral_resources: Object.freeze({ packId: "japan_mineral_resources", family: "mineral_resources", label: "Japan mineral resources", country: "Japan", sourcePolicy: "local_source_cache_only" }),
  japan_industrial_zones: Object.freeze({ packId: "japan_industrial_zones", family: "industrial_zones", label: "Japan industrial zones", country: "Japan", sourcePolicy: "local_source_cache_with_download" }),
  japan_logistics_hubs: Object.freeze({ packId: "japan_logistics_hubs", family: "logistics_hubs", label: "Japan logistics hubs", country: "Japan", sourcePolicy: "local_source_cache_with_download" }),
  germany_energy_facilities: Object.freeze({ packId: "germany_energy_facilities", family: "energy_facilities", label: "Germany energy facilities", country: "Germany", sourcePolicy: "real_source_cache_only" }),
  germany_mineral_resources: Object.freeze({ packId: "germany_mineral_resources", family: "mineral_resources", label: "Germany mineral resources", country: "Germany", sourcePolicy: "real_source_cache_only" }),
  germany_industrial_zones: Object.freeze({ packId: "germany_industrial_zones", family: "industrial_zones", label: "Germany industrial zones", country: "Germany", sourcePolicy: "real_source_cache_only" }),
  germany_logistics_hubs: Object.freeze({ packId: "germany_logistics_hubs", family: "logistics_hubs", label: "Germany logistics hubs", country: "Germany", sourcePolicy: "real_source_cache_only" }),
  usa_energy_facilities: Object.freeze({ packId: "usa_energy_facilities", family: "energy_facilities", label: "United States energy facilities", country: "United States", sourcePolicy: "real_source_cache_only" }),
  usa_mineral_resources: Object.freeze({ packId: "usa_mineral_resources", family: "mineral_resources", label: "United States mineral resources", country: "United States", sourcePolicy: "real_source_cache_only" }),
  usa_industrial_zones: Object.freeze({ packId: "usa_industrial_zones", family: "industrial_zones", label: "United States industrial zones", country: "United States", sourcePolicy: "real_source_cache_only" }),
  usa_logistics_hubs: Object.freeze({ packId: "usa_logistics_hubs", family: "logistics_hubs", label: "United States logistics hubs", country: "United States", sourcePolicy: "real_source_cache_only" }),
  uk_energy_facilities: Object.freeze({ packId: "uk_energy_facilities", family: "energy_facilities", label: "United Kingdom energy facilities", country: "United Kingdom", sourcePolicy: "real_source_cache_only" }),
  uk_industrial_zones: Object.freeze({ packId: "uk_industrial_zones", family: "industrial_zones", label: "United Kingdom industrial zones", country: "United Kingdom", sourcePolicy: "real_source_cache_only" }),
  uk_logistics_hubs: Object.freeze({ packId: "uk_logistics_hubs", family: "logistics_hubs", label: "United Kingdom logistics hubs", country: "United Kingdom", sourcePolicy: "real_source_cache_only" }),
  uk_mineral_resources: Object.freeze({ packId: "uk_mineral_resources", family: "mineral_resources", label: "United Kingdom mineral resources", country: "United Kingdom", sourcePolicy: "real_source_cache_only" }),
  china_energy_facilities: Object.freeze({ packId: "china_energy_facilities", family: "energy_facilities", label: "China energy facilities", country: "China", sourcePolicy: "real_source_cache_only" }),
  china_mineral_resources: Object.freeze({ packId: "china_mineral_resources", family: "mineral_resources", label: "China mineral resources", country: "China", sourcePolicy: "real_source_cache_only" }),
  china_industrial_zones: Object.freeze({ packId: "china_industrial_zones", family: "industrial_zones", label: "China industrial zones", country: "China", sourcePolicy: "real_source_cache_only" }),
  china_logistics_hubs: Object.freeze({ packId: "china_logistics_hubs", family: "logistics_hubs", label: "China logistics hubs", country: "China", sourcePolicy: "real_source_cache_only" }),
  india_energy_facilities: Object.freeze({ packId: "india_energy_facilities", family: "energy_facilities", label: "India energy facilities", country: "India", sourcePolicy: "real_source_cache_only" }),
  india_mineral_resources: Object.freeze({ packId: "india_mineral_resources", family: "mineral_resources", label: "India mineral resources", country: "India", sourcePolicy: "real_source_cache_only" }),
  india_industrial_zones: Object.freeze({ packId: "india_industrial_zones", family: "industrial_zones", label: "India industrial zones", country: "India", sourcePolicy: "real_source_cache_only" }),
  india_logistics_hubs: Object.freeze({ packId: "india_logistics_hubs", family: "logistics_hubs", label: "India logistics hubs", country: "India", sourcePolicy: "real_source_cache_only" }),
  russia_energy_facilities: Object.freeze({ packId: "russia_energy_facilities", family: "energy_facilities", label: "Russia energy facilities", country: "Russia", sourcePolicy: "real_source_cache_only" }),
  russia_mineral_resources: Object.freeze({ packId: "russia_mineral_resources", family: "mineral_resources", label: "Russia mineral resources", country: "Russia", sourcePolicy: "real_source_cache_only" }),
  russia_industrial_zones: Object.freeze({ packId: "russia_industrial_zones", family: "industrial_zones", label: "Russia industrial zones", country: "Russia", sourcePolicy: "real_source_cache_only" }),
  russia_logistics_hubs: Object.freeze({ packId: "russia_logistics_hubs", family: "logistics_hubs", label: "Russia logistics hubs", country: "Russia", sourcePolicy: "real_source_cache_only" }),
  france_energy_facilities: Object.freeze({ packId: "france_energy_facilities", family: "energy_facilities", label: "France energy facilities", country: "France", sourcePolicy: "real_source_cache_only" }),
  france_industrial_zones: Object.freeze({ packId: "france_industrial_zones", family: "industrial_zones", label: "France industrial zones", country: "France", sourcePolicy: "real_source_cache_only" }),
  france_mineral_resources: Object.freeze({ packId: "france_mineral_resources", family: "mineral_resources", label: "France mineral resources", country: "France", sourcePolicy: "real_source_cache_only" }),
  france_logistics_hubs: Object.freeze({ packId: "france_logistics_hubs", family: "logistics_hubs", label: "France logistics hubs", country: "France", sourcePolicy: "real_source_cache_only" }),
});

export const WORKBENCH_SELECTABLE_PACK_IDS = Object.freeze(Object.keys(WORKBENCH_SELECTABLE_PACKS));

// main map 只消费各 family 的稳定输出键；workbench 预览字段留在 manifest/preview owner 内部。
export const MAIN_MAP_CONSUMER_KEYS_BY_FAMILY = Object.freeze({
  road: Object.freeze(["roads", "road_labels"]),
  rail: Object.freeze(["railways", "rail_stations_major"]),
  airport: Object.freeze(["airports"]),
  port: Object.freeze(["ports"]),
});

const FORBIDDEN_SOURCE_SIGNATURE_TOKENS = Object.freeze([
  "checked_in_global",
  "global_overview",
  "clipped_global",
  "derived_from_global",
]);

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeId(value) {
  return normalizeText(value).toLowerCase();
}

function sameStringSet(left = [], right = []) {
  const leftValues = Array.from(new Set((Array.isArray(left) ? left : []).map(normalizeText).filter(Boolean))).sort();
  const rightValues = Array.from(new Set((Array.isArray(right) ? right : []).map(normalizeText).filter(Boolean))).sort();
  return leftValues.length === rightValues.length && leftValues.every((value, index) => value === rightValues[index]);
}

function listSignatureTokens(sourceSignature) {
  if (!sourceSignature || typeof sourceSignature !== "object") return [];
  return Object.entries(sourceSignature).flatMap(([key, value]) => {
    if (!value || typeof value !== "object") return [key];
    return [
      key,
      value.filename,
      value.path,
      value.url,
      value.source,
    ].map(normalizeText).filter(Boolean);
  });
}

export function getTargetMainMapPackMeta(packId) {
  return TARGET_MAIN_MAP_PACKS[normalizeId(packId)] || null;
}

export function getTransportWorkbenchPackMeta(packId) {
  return WORKBENCH_SELECTABLE_PACKS[normalizeId(packId)] || null;
}

export function isTargetMainMapPackId(packId) {
  return !!getTargetMainMapPackMeta(packId);
}

export function listTargetMainMapPacks({ familyId = "" } = {}) {
  const normalizedFamilyId = normalizeId(familyId);
  return TARGET_MAIN_MAP_PACK_IDS
    .map((packId) => TARGET_MAIN_MAP_PACKS[packId])
    .filter((entry) => !normalizedFamilyId || entry.family === normalizedFamilyId)
    .map((entry) => ({ ...entry }));
}

export function listTransportWorkbenchPacks({ familyId = "" } = {}) {
  const normalizedFamilyId = normalizeId(familyId);
  return WORKBENCH_SELECTABLE_PACK_IDS
    .map((packId) => WORKBENCH_SELECTABLE_PACKS[packId])
    .filter((entry) => !normalizedFamilyId || entry.family === normalizedFamilyId)
    .map((entry) => ({ ...entry }));
}

export function getDefaultMainMapPackIdForFamily(familyId) {
  const normalizedFamilyId = normalizeId(familyId);
  return listTargetMainMapPacks({ familyId: normalizedFamilyId })[0]?.packId || "";
}

export function getDefaultTransportWorkbenchPackIdForFamily(familyId) {
  const normalizedFamilyId = normalizeId(familyId);
  return listTransportWorkbenchPacks({ familyId: normalizedFamilyId })[0]?.packId || "";
}

export function createTransportPackSourceGateReport(packId, manifest = null) {
  const normalizedPackId = normalizeId(packId);
  const meta = getTargetMainMapPackMeta(normalizedPackId);
  const reasons = [];
  if (!meta) {
    reasons.push("unknown_pack");
  }
  if (!manifest || typeof manifest !== "object") {
    reasons.push("manifest_missing");
    return {
      packId: normalizedPackId,
      family: meta?.family || "",
      passed: false,
      reasons,
    };
  }

  const manifestFamily = normalizeId(manifest.family);
  const expectedKeys = MAIN_MAP_CONSUMER_KEYS_BY_FAMILY[meta?.family] || [];
  const supportedKeys = manifest.main_map_consumer?.supported_keys;
  const signatureTokens = listSignatureTokens(manifest.source_signature);
  const signatureText = signatureTokens.join("\n").toLowerCase();

  // Gate report 用原因码暴露真实阻塞点，调用方据此决定禁用 Apply 或展示诊断。
  if (manifest.pack_id && normalizeId(manifest.pack_id) !== normalizedPackId) reasons.push("pack_id_mismatch");
  if (meta && manifestFamily !== meta.family) reasons.push("family_mismatch");
  if (meta && normalizeText(manifest.source_policy) !== meta.sourcePolicy) reasons.push("source_policy_mismatch");
  if (!manifest.source_signature || typeof manifest.source_signature !== "object" || !Object.keys(manifest.source_signature).length) {
    reasons.push("source_signature_missing");
  }
  if (FORBIDDEN_SOURCE_SIGNATURE_TOKENS.some((token) => signatureText.includes(token))) {
    reasons.push("forbidden_source_signature");
  }
  if (manifest.mainMapEligible !== true) reasons.push("main_map_eligible_missing");
  if (manifest.apply_bridge_supported !== true) reasons.push("apply_bridge_supported_missing");
  if (normalizeText(manifest.coverage_scope) !== "country") reasons.push("coverage_scope_invalid");
  if (!manifest.main_map_consumer || typeof manifest.main_map_consumer !== "object") {
    reasons.push("main_map_consumer_missing");
  } else if (!sameStringSet(supportedKeys, expectedKeys)) {
    reasons.push("main_map_consumer_keys_mismatch");
  }
  expectedKeys.forEach((key) => {
    const previewPath = manifest.paths?.preview?.[key];
    const fullPath = manifest.paths?.full?.[key];
    if (!previewPath || !fullPath) reasons.push(`path_missing:${key}`);
  });
  if (expectedKeys.includes("road_labels") && manifest.sidecars?.road_labels?.required !== true) {
    reasons.push("sidecar_missing:road_labels");
  }
  if (expectedKeys.includes("rail_stations_major") && manifest.sidecars?.rail_stations_major?.required !== true) {
    reasons.push("sidecar_missing:rail_stations_major");
  }

  return {
    packId: normalizedPackId,
    family: meta?.family || manifestFamily,
    passed: reasons.length === 0,
    reasons,
    sourcePolicy: normalizeText(manifest.source_policy),
    sourceSignature: manifest.source_signature || null,
    supportedKeys: Array.isArray(supportedKeys) ? [...supportedKeys] : [],
  };
}

export function resolveTransportActivePack({
  activePackId = "",
  familyId = "",
  manifest = null,
  consumerAvailable = true,
} = {}) {
  const normalizedFamilyId = normalizeId(familyId);
  const requestedPackId = normalizeId(activePackId) || getDefaultMainMapPackIdForFamily(normalizedFamilyId);
  const meta = getTargetMainMapPackMeta(requestedPackId);
  // resolver 只决定当前 pack 是否能进入 main map；具体加载和绘制继续由对应 owner 执行。
  if (!meta) {
    return {
      ok: false,
      reason: "unknown_pack",
      activePackId: requestedPackId,
      family: normalizedFamilyId,
      gateReport: null,
      meta: null,
    };
  }
  if (normalizedFamilyId && meta.family !== normalizedFamilyId) {
    return {
      ok: false,
      reason: "family_mismatch",
      activePackId: requestedPackId,
      family: normalizedFamilyId,
      gateReport: null,
      meta,
    };
  }
  if (!manifest || typeof manifest !== "object") {
    return {
      ok: false,
      reason: "manifest_missing",
      activePackId: requestedPackId,
      family: meta.family,
      gateReport: null,
      meta,
    };
  }
  const gateReport = createTransportPackSourceGateReport(requestedPackId, manifest);
  if (gateReport && !gateReport.passed) {
    return {
      ok: false,
      reason: "source_failed",
      activePackId: requestedPackId,
      family: meta.family,
      gateReport,
      meta,
    };
  }
  if (!consumerAvailable) {
    return {
      ok: false,
      reason: "consumer_missing",
      activePackId: requestedPackId,
      family: meta.family,
      gateReport,
      meta,
    };
  }
  return {
    ok: true,
    reason: "",
    activePackId: requestedPackId,
    family: meta.family,
    gateReport,
    meta,
  };
}
