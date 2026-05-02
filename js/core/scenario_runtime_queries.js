import { state as runtimeState } from "./state.js";
import { normalizeCountryCodeAlias } from "./country_code_aliases.js";
import {
  getCountryCode as getSharedFeatureCountryCode,
  getFeatureId as getSharedFeatureId,
} from "./feature_identity.js";
const state = runtimeState;

export function canonicalScenarioCountryCode(rawCode) {
  return normalizeCountryCodeAlias(rawCode);
}

export function extractScenarioCountryCodeFromId(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return "";
  const prefix = text.split(/[-_]/)[0];
  if (/^[A-Z]{2,3}$/.test(prefix)) {
    return prefix;
  }
  const alphaPrefix = prefix.match(/^[A-Z]{2,3}/);
  return alphaPrefix ? alphaPrefix[0] : "";
}

export function getRuntimeGeometryFeatureId(geometry) {
  return getSharedFeatureId(geometry, { fallback: "" });
}

export function getScenarioRuntimeGeometryCountryCode(geometry) {
  return canonicalScenarioCountryCode(getSharedFeatureCountryCode(geometry));
}

export function getScenarioEffectiveOwnerCodeByFeatureId(featureId) {
  const normalizedId = String(featureId || "").trim();
  if (!normalizedId) return "";
  return String(
    runtimeState.sovereigntyByFeatureId?.[normalizedId] ||
    runtimeState.runtimeCanonicalCountryByFeatureId?.[normalizedId] ||
    ""
  )
    .trim()
    .toUpperCase();
}

export function getScenarioEffectiveControllerCodeByFeatureId(featureId) {
  const normalizedId = String(featureId || "").trim();
  if (!normalizedId) return "";
  return String(
    runtimeState.scenarioControllersByFeatureId?.[normalizedId] ||
    getScenarioEffectiveOwnerCodeByFeatureId(normalizedId) ||
    ""
  )
    .trim()
    .toUpperCase();
}

export function shouldApplyHoi4FarEastSovietBackfill(scenarioId) {
  const normalizedId = String(scenarioId || "").trim();
  return normalizedId === "hoi4_1936" || normalizedId === "hoi4_1939";
}

export function hasExplicitScenarioAssignment(featureMap, featureId) {
  return !!(
    featureMap &&
    typeof featureMap === "object" &&
    Object.prototype.hasOwnProperty.call(featureMap, featureId)
  );
}

