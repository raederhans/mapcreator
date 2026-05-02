import "./feature_identity_shared.js";
import { normalizeCountryCodeAlias } from "./country_code_aliases.js";

const shared = globalThis.__scenarioForgeFeatureIdentityShared;

if (!shared) {
  throw new Error("[feature_identity] Shared helper failed to initialize.");
}

const {
  extractCountryCodeFromId,
  getFeatureId,
  getStableKey,
} = shared;

function normalizeFeatureCountryCode(rawCode, { allowReserved = false } = {}) {
  return shared.normalizeFeatureCountryCode(rawCode, {
    allowReserved,
    normalizeAlias: normalizeCountryCodeAlias,
  });
}

function getCountryCode(featureLike, options = {}) {
  return shared.getCountryCode(featureLike, {
    ...(options && typeof options === "object" ? options : {}),
    normalizeAlias: normalizeCountryCodeAlias,
  });
}

export {
  extractCountryCodeFromId,
  getCountryCode,
  getFeatureId,
  getStableKey,
  normalizeFeatureCountryCode,
};
