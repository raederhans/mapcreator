import { normalizeCountryCodeAlias } from "./country_code_aliases.js";

const FEATURE_ID_KEYS = Object.freeze(["id", "NUTS_ID"]);
const COUNTRY_CODE_KEYS = Object.freeze([
  "cntr_code",
  "CNTR_CODE",
  "CNTR",
  "iso_a2",
  "ISO_A2",
  "iso_a2_eh",
  "ISO_A2_EH",
  "adm0_a2",
  "ADM0_A2",
  "country_code",
  "countryCode",
]);
const STABLE_KEY_KEYS = Object.freeze([
  "__city_host_feature_id",
  "__city_stable_key",
  "stable_key",
  "__city_id",
  "id",
  "NUTS_ID",
]);
const RESERVED_COUNTRY_CODES = new Set(["ZZ", "XX"]);

function getFeatureProperties(featureLike) {
  return featureLike && typeof featureLike === "object" ? (featureLike.properties || {}) : {};
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function pickFirstText(source, keys) {
  for (const key of keys) {
    const text = normalizeText(source?.[key]);
    if (text) return text;
  }
  return "";
}

function normalizeFeatureIdentityOptions(options = {}) {
  return options && typeof options === "object" ? options : {};
}

function extractCountryCodeFromId(value) {
  const text = normalizeText(value).toUpperCase();
  if (!text) return "";
  const prefix = text.split(/[-_]/)[0];
  if (/^[A-Z]{2,3}$/.test(prefix)) return prefix;
  return prefix.match(/^[A-Z]{2,3}/)?.[0] || "";
}

function normalizeFeatureCountryCode(rawCode, { allowReserved = false } = {}) {
  const code = normalizeCountryCodeAlias(rawCode);
  if (!/^[A-Z]{2,3}$/.test(code)) return "";
  if (!allowReserved && RESERVED_COUNTRY_CODES.has(code)) return "";
  return code;
}

function getFeatureId(featureOrId, options = {}) {
  const { fallback = "" } = normalizeFeatureIdentityOptions(options);
  if (typeof featureOrId === "string" || typeof featureOrId === "number") {
    return normalizeText(featureOrId) || normalizeText(fallback);
  }
  const props = getFeatureProperties(featureOrId);
  return (
    pickFirstText(props, FEATURE_ID_KEYS) ||
    normalizeText(featureOrId?.id) ||
    normalizeText(fallback)
  );
}

function getCountryCode(featureLike, options = {}) {
  const {
    allowReserved = false,
    fallbackCountryCode = "",
    fallbackId = "",
    useIdFallback = true,
  } = normalizeFeatureIdentityOptions(options);
  const props = getFeatureProperties(featureLike);
  const direct = normalizeFeatureCountryCode(pickFirstText(props, COUNTRY_CODE_KEYS), { allowReserved });
  if (direct) return direct;
  const fallbackCode = normalizeFeatureCountryCode(fallbackCountryCode, { allowReserved });
  if (fallbackCode) return fallbackCode;
  if (!useIdFallback) return "";
  return normalizeFeatureCountryCode(
    extractCountryCodeFromId(pickFirstText(props, FEATURE_ID_KEYS)) ||
      extractCountryCodeFromId(featureLike?.id) ||
      extractCountryCodeFromId(fallbackId),
    { allowReserved }
  );
}

function getStableKey(featureLike, options = {}) {
  const { fallback = "" } = normalizeFeatureIdentityOptions(options);
  const props = getFeatureProperties(featureLike);
  return (
    pickFirstText(props, STABLE_KEY_KEYS) ||
    normalizeText(featureLike?.id) ||
    normalizeText(fallback)
  );
}

export {
  extractCountryCodeFromId,
  getCountryCode,
  getFeatureId,
  getStableKey,
  normalizeFeatureCountryCode,
};
