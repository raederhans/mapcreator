export const CITY_POINTS_THEME_OPTIONS = Object.freeze([
  Object.freeze({ value: "classic_graphite", labelKey: "optCityPointsThemeClassicGraphite", fallback: "Classic Graphite" }),
  Object.freeze({ value: "atlas_ink", labelKey: "optCityPointsThemeAtlasInk", fallback: "Atlas Ink" }),
  Object.freeze({ value: "parchment_sepia", labelKey: "optCityPointsThemeParchmentSepia", fallback: "Parchment Sepia" }),
  Object.freeze({ value: "slate_blue", labelKey: "optCityPointsThemeSlateBlue", fallback: "Slate Blue" }),
  Object.freeze({ value: "ivory_outline", labelKey: "optCityPointsThemeIvoryOutline", fallback: "Ivory Outline" }),
]);

export const CITY_POINTS_THEME_DEFAULT_STYLES = Object.freeze({
  classic_graphite: Object.freeze({
    color: "#2f343a",
    capitalColor: "#9f9072",
    hintEn: "Neutral graphite markers that stay readable on mixed political fills.",
    hintZh: "中性的石墨灰点位，适合混合政治底图，整体最稳。 ",
  }),
  atlas_ink: Object.freeze({
    color: "#35506e",
    capitalColor: "#d2aa72",
    hintEn: "Cool blue-ink markers with a cleaner atlas feel and clearer outlines.",
    hintZh: "偏蓝墨水感的点位，轮廓更清楚，更像地图集标注。",
  }),
  parchment_sepia: Object.freeze({
    color: "#866245",
    capitalColor: "#c78d55",
    hintEn: "Warmer sepia markers tuned for historical overlays and paper-like palettes.",
    hintZh: "更暖的棕褐色点位，适合历史纸面和偏暖色地图。",
  }),
  slate_blue: Object.freeze({
    color: "#566c86",
    capitalColor: "#d4b178",
    hintEn: "Cool slate-blue markers that sit quietly on modern, cleaner political maps.",
    hintZh: "偏冷的石板蓝点位，适合更现代、更干净的政治底图。",
  }),
  ivory_outline: Object.freeze({
    color: "#ddd2bf",
    capitalColor: "#b27a4a",
    hintEn: "Light ivory fills with darker rims for stronger contrast on darker land colors.",
    hintZh: "浅象牙底配深描边，在深色国土上会更显眼。",
  }),
});

export function getCityPointsThemeMeta(themeValue) {
  return CITY_POINTS_THEME_OPTIONS.find((option) => option.value === String(themeValue || "").trim().toLowerCase())
    || CITY_POINTS_THEME_OPTIONS[0];
}

export function getCityPointsThemeLabel(themeValue, translate) {
  const meta = getCityPointsThemeMeta(themeValue);
  return typeof translate === "function" ? translate(meta.fallback, "ui") : meta.fallback;
}

export function getCityPointsThemeStyle(themeValue) {
  return CITY_POINTS_THEME_DEFAULT_STYLES[getCityPointsThemeMeta(themeValue).value]
    || CITY_POINTS_THEME_DEFAULT_STYLES.classic_graphite;
}

export function getCityPointsThemeHint(themeValue, language) {
  const themeStyle = getCityPointsThemeStyle(themeValue);
  return String(language || "").trim().toLowerCase() === "zh" ? themeStyle.hintZh.trim() : themeStyle.hintEn;
}

export function getCityPointsLabelDensityHint(densityValue, language) {
  const normalized = String(densityValue || "balanced").trim().toLowerCase();
  if (String(language || "").trim().toLowerCase() === "zh") {
    if (normalized === "sparse") return "Sparse · 标签预算 P4 16 / P5 32，只保留更关键的名称。";
    if (normalized === "dense") return "Dense · 标签预算 P4 32 / P5 64，会显示更多次级城市名称。";
    return "Balanced · 标签预算 P4 24 / P5 48，是默认的均衡读图方案。";
  }
  if (normalized === "sparse") return "Sparse · label budget P4 16 / P5 32, favoring only the most important names.";
  if (normalized === "dense") return "Dense · label budget P4 32 / P5 64, allowing more secondary city labels.";
  return "Balanced · label budget P4 24 / P5 48, the default readability mix.";
}

export function formatCityPointsDensityValue(value) {
  return `${Number(value || 1).toFixed(2)}x`;
}
