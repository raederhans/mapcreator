import { resolveFeatureColor } from "../color_resolver.js";

/**
 * Owns political fill color strategy:
 * - display owner/controller precedence
 * - scenario shell owner hints
 * - final feature color delegation through color_resolver.js
 *
 * map_renderer.js keeps rebuild orchestration and cache invalidation; this owner only decides
 * which country owns the color and which resolved color should be written.
 */
export function createColorResolutionStrategyOwner({
  state,
  helpers = {},
} = {}) {
  const {
    canonicalCountryCode,
    getFeatureCountryCodeNormalized,
    getFeatureId,
    getOceanBaseFillColor,
    getSafeCanvasColor,
    isAntarcticSectorFeature,
    isAtlantropaSeaFeature,
    isScenarioShellFeature,
    normalizeMapSemanticMode,
  } = helpers;

  function getDisplayOwnerCode(feature, id) {
    const resolvedId = String(id || "").trim() || getFeatureId(feature);
    if (isAntarcticSectorFeature(feature, resolvedId)) {
      return "";
    }
    const mapSemanticMode = normalizeMapSemanticMode(state.mapSemanticMode);
    const isScenarioShell = isScenarioShellFeature(feature, resolvedId);
    const shellOwnerHintCode = canonicalCountryCode(feature?.properties?.scenario_shell_owner_hint || "");
    const shellControllerHintCode = canonicalCountryCode(feature?.properties?.scenario_shell_controller_hint || "");
    const shellOwnerCode = String(
      state.scenarioAutoShellOwnerByFeatureId?.[resolvedId] || shellOwnerHintCode || shellControllerHintCode || ""
    ).trim().toUpperCase();
    const directOwnerCode = canonicalCountryCode(state.sovereigntyByFeatureId?.[resolvedId] || "");
    if (mapSemanticMode === "blank") {
      return isScenarioShell ? (directOwnerCode || shellOwnerCode || "") : directOwnerCode;
    }
    const fallbackOwnerCode = getFeatureCountryCodeNormalized(feature);
    const ownershipOwnerCode = isScenarioShell
      ? (directOwnerCode || shellOwnerCode || "")
      : (directOwnerCode || fallbackOwnerCode || "");
    return ownershipOwnerCode;
  }

  // 颜色优先级继续由 color_resolver.js 统一裁决；这里仅注入 renderer runtime 上下文。
  function getResolvedFeatureColor(feature, id) {
    return resolveFeatureColor(id, {
      state,
      feature,
      getSafeColor: getSafeCanvasColor,
      isOceanFeature: isAtlantropaSeaFeature,
      getOceanBaseFillColor,
      getOwnerCode: getDisplayOwnerCode,
    }).color;
  }

  return {
    getDisplayOwnerCode,
    getResolvedFeatureColor,
  };
}
