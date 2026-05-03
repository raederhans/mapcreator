// File-backed country feature policy display defaults.
// JS runtime and Python build helpers both read the same JSON owner.

import countryFeaturePolicies from "../../data/country_feature_policies.json" with { type: "json" };

const COUNTRY_FEATURE_POLICIES_RUNTIME_ASSET_KEY = "country_feature_policies";
const COUNTRY_FEATURE_POLICIES = countryFeaturePolicies || {};
const display = COUNTRY_FEATURE_POLICIES.display || {};
const paletteDisplay = display.palette || {};

const PALETTE_THEMES = paletteDisplay.themes || {};
const countryPalette = { ...(paletteDisplay.countryPalette || {}) };
const legacyDefaultCountryPalette = { ...countryPalette };
const defaultCountryPalette = { ...countryPalette };
const countryNames = display.countryNames || {};
const countryPresets = display.presets || {};
const detailOverlaySupportTiers = display.detailOverlaySupportTiers || {};

export {
  COUNTRY_FEATURE_POLICIES_RUNTIME_ASSET_KEY,
  COUNTRY_FEATURE_POLICIES,
  PALETTE_THEMES,
  countryPalette,
  defaultCountryPalette,
  legacyDefaultCountryPalette,
  countryNames,
  countryPresets,
  detailOverlaySupportTiers,
};
