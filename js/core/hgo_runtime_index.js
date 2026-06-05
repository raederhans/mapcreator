function normalizeHgoRuntimeProvinceId(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return "";
  return String(number);
}

function normalizeHgoRuntimeStateId(value) {
  return normalizeHgoRuntimeProvinceId(value);
}

function normalizeHgoRuntimeTag(value) {
  const tag = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{2,5}$/.test(tag) ? tag : "";
}

function normalizeHexColor(value) {
  const hex = String(value || "").trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  return match ? `#${match[1].toUpperCase()}` : "";
}

function parseHexRgb(value) {
  const hex = normalizeHexColor(value);
  if (!hex) return null;
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function normalizeRgbChannel(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 255) return null;
  return number;
}

function normalizeHgoRuntimeRgb(value) {
  if (typeof value === "string") {
    return parseHexRgb(value);
  }
  let raw = null;
  if (Array.isArray(value)) {
    raw = value;
  } else if (value && typeof value === "object") {
    raw = [
      value.r ?? value.red,
      value.g ?? value.green,
      value.b ?? value.blue,
    ];
  }
  if (!raw || raw.length < 3) return null;
  const rgb = raw.slice(0, 3).map(normalizeRgbChannel);
  return rgb.every((channel) => channel !== null) ? rgb : null;
}

function hgoRuntimeRgbKey(rgb) {
  const triplet = normalizeHgoRuntimeRgb(rgb);
  if (!triplet) return "";
  return String((triplet[0] << 16) | (triplet[1] << 8) | triplet[2]);
}

function rgbToHex(rgb) {
  const triplet = normalizeHgoRuntimeRgb(rgb);
  if (!triplet) return "";
  return `#${triplet.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function copyNumberArray(values) {
  return Object.freeze((Array.isArray(values) ? values : []).map((value) => Number(value)).filter(Number.isFinite));
}

function normalizeProvinceRecord(rawProvince = {}) {
  const id = normalizeHgoRuntimeProvinceId(rawProvince.id);
  const rgb = copyNumberArray(normalizeHgoRuntimeRgb(rawProvince.rgb) || []);
  if (!id || rgb.length !== 3) return null;
  return Object.freeze({
    id: Number(id),
    rgb,
    rgbKey: Number(rawProvince.rgb_key ?? hgoRuntimeRgbKey(rgb)),
    rgbHex: normalizeHexColor(rawProvince.rgb_hex) || rgbToHex(rgb),
    type: String(rawProvince.type || "").trim().toLowerCase(),
    terrain: String(rawProvince.terrain || "").trim().toLowerCase(),
    continent: Number.isInteger(Number(rawProvince.continent)) ? Number(rawProvince.continent) : null,
  });
}

function normalizeStateRecord(rawState = {}) {
  const id = normalizeHgoRuntimeStateId(rawState.id);
  if (!id) return null;
  const provinceIds = copyNumberArray(rawState.province_ids);
  const ownerTag = normalizeHgoRuntimeTag(rawState.owner);
  return Object.freeze({
    id: Number(id),
    nameKey: String(rawState.name_key || "").trim(),
    ownerTag,
    controllerTag: normalizeHgoRuntimeTag(rawState.controller) || ownerTag,
    coreTags: Object.freeze((Array.isArray(rawState.core_tags) ? rawState.core_tags : [])
      .map(normalizeHgoRuntimeTag)
      .filter(Boolean)),
    category: String(rawState.category || "").trim(),
    provinceIds,
    provinceCount: Number(rawState.province_count || provinceIds.length) || 0,
    sourcePath: String(rawState.source_path || "").trim(),
  });
}

function normalizeCountryRecord(rawCountry = {}, rawTag = "") {
  const tag = normalizeHgoRuntimeTag(rawCountry.tag || rawTag);
  if (!tag) return null;
  const colorRgb = copyNumberArray(normalizeHgoRuntimeRgb(rawCountry.color_rgb) || []);
  return Object.freeze({
    tag,
    definitionPath: String(rawCountry.definition_path || "").trim(),
    sourcePath: String(rawCountry.source_path || "").trim(),
    colorRgb,
    colorHex: normalizeHexColor(rawCountry.color_hex) || rgbToHex(colorRgb),
    stateCount: Number(rawCountry.state_count || 0) || 0,
    provinceCount: Number(rawCountry.province_count || 0) || 0,
  });
}

function normalizeSeedObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function buildResolvedProvince({ province, state, country }) {
  return Object.freeze({
    province,
    state,
    country,
    provinceId: province.id,
    stateId: state ? state.id : null,
    ownerTag: state ? state.ownerTag : "",
    controllerTag: state ? state.controllerTag : "",
    countryColorHex: country ? country.colorHex : "",
  });
}

function createHgoRuntimeIndex(seed = {}) {
  const payload = normalizeSeedObject(seed);
  const provinceById = new Map();
  const provinceIdByRgbKey = new Map();
  const stateById = new Map();
  const countryByTag = new Map();
  const provinceToStateId = new Map();
  const provinceIdsByStateId = new Map();

  Object.values(normalizeSeedObject(payload.provinces)).forEach((rawProvince) => {
    const province = normalizeProvinceRecord(rawProvince);
    if (!province) return;
    provinceById.set(String(province.id), province);
    provinceIdByRgbKey.set(String(province.rgbKey), String(province.id));
  });

  (Array.isArray(payload.states) ? payload.states : []).forEach((rawState) => {
    const state = normalizeStateRecord(rawState);
    if (!state) return;
    stateById.set(String(state.id), state);
    provinceIdsByStateId.set(String(state.id), state.provinceIds);
  });

  Object.entries(normalizeSeedObject(payload.countries)).forEach(([rawTag, rawCountry]) => {
    const country = normalizeCountryRecord(rawCountry, rawTag);
    if (!country) return;
    countryByTag.set(country.tag, country);
  });

  Object.entries(normalizeSeedObject(payload.province_to_state)).forEach(([rawProvinceId, rawStateId]) => {
    const provinceId = normalizeHgoRuntimeProvinceId(rawProvinceId);
    const stateId = normalizeHgoRuntimeStateId(rawStateId);
    if (provinceId && stateId) {
      provinceToStateId.set(provinceId, stateId);
    }
  });

  const resolveState = (value) => {
    const stateId = normalizeHgoRuntimeStateId(value);
    return stateId ? stateById.get(stateId) || null : null;
  };

  const resolveCountry = (value) => {
    const tag = normalizeHgoRuntimeTag(value);
    return tag ? countryByTag.get(tag) || null : null;
  };

  const resolveProvinceById = (value) => {
    const provinceId = normalizeHgoRuntimeProvinceId(value);
    if (!provinceId) return null;
    const province = provinceById.get(provinceId);
    if (!province) return null;
    const stateId = provinceToStateId.get(provinceId) || "";
    const state = stateId ? stateById.get(stateId) || null : null;
    const country = state?.ownerTag ? countryByTag.get(state.ownerTag) || null : null;
    return buildResolvedProvince({ province, state, country });
  };

  const resolveProvinceByRgb = (value) => {
    const rgbKey = hgoRuntimeRgbKey(value);
    if (!rgbKey) return null;
    const provinceId = provinceIdByRgbKey.get(rgbKey);
    return provinceId ? resolveProvinceById(provinceId) : null;
  };

  const resolveProvince = (value) => {
    if (typeof value === "string" && normalizeHexColor(value)) {
      return resolveProvinceByRgb(value);
    }
    if (Array.isArray(value) || (value && typeof value === "object")) {
      return resolveProvinceByRgb(value);
    }
    return resolveProvinceById(value);
  };

  const getStateProvinceIds = (value) => {
    const stateId = normalizeHgoRuntimeStateId(value);
    return stateId ? Array.from(provinceIdsByStateId.get(stateId) || []) : [];
  };

  const getSummary = () => Object.freeze({
    seedSummary: Object.freeze({ ...normalizeSeedObject(payload.summary) }),
    provinceCount: provinceById.size,
    stateCount: stateById.size,
    countryCount: countryByTag.size,
    mappedProvinceCount: provinceToStateId.size,
  });

  return Object.freeze({
    getStateProvinceIds,
    getSummary,
    resolveCountry,
    resolveProvince,
    resolveProvinceByHex: resolveProvinceByRgb,
    resolveProvinceById,
    resolveProvinceByRgb,
    resolveState,
  });
}

export {
  createHgoRuntimeIndex,
  hgoRuntimeRgbKey,
  normalizeHgoRuntimeProvinceId,
  normalizeHgoRuntimeRgb,
  normalizeHgoRuntimeTag,
};
