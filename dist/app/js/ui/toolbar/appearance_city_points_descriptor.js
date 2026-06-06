export const CITY_POINTS_THEME_OPTIONS = Object.freeze([
  Object.freeze({ value: "classic_graphite", labelKey: "optCityPointsThemeClassicGraphite", fallback: "Graphite Signal" }),
  Object.freeze({ value: "atlas_ink", labelKey: "optCityPointsThemeAtlasInk", fallback: "Cyan Beacon" }),
  Object.freeze({ value: "parchment_sepia", labelKey: "optCityPointsThemeParchmentSepia", fallback: "Vermilion Ledger" }),
  Object.freeze({ value: "slate_blue", labelKey: "optCityPointsThemeSlateBlue", fallback: "Royal Violet" }),
  Object.freeze({ value: "ivory_outline", labelKey: "optCityPointsThemeIvoryOutline", fallback: "Ivory Night" }),
]);

export const CITY_POINTS_THEME_DEFAULT_STYLES = Object.freeze({
  classic_graphite: Object.freeze({
    color: "#20262e",
    capitalColor: "#f0b84f",
    markerScale: 1,
    markerDensity: 0.95,
    opacity: 0.96,
    labelDensity: "balanced",
    labelSize: 11,
    hintEn: "Dark graphite points with warm capital accents for stable political-map reading.",
    hintZh: "深石墨点位配暖金首都高亮，适合稳定的政治底图读图。",
  }),
  atlas_ink: Object.freeze({
    color: "#008ea8",
    capitalColor: "#ffd166",
    markerScale: 1.15,
    markerDensity: 1.25,
    opacity: 0.94,
    labelDensity: "dense",
    labelSize: 12,
    hintEn: "Bright cyan markers with denser labels for quick city debugging on busy maps.",
    hintZh: "明亮青蓝点位配更密标签，适合在复杂地图上快速调试城市。",
  }),
  parchment_sepia: Object.freeze({
    color: "#9b3f2f",
    capitalColor: "#e6843a",
    markerScale: 1.08,
    markerDensity: 0.88,
    opacity: 0.92,
    labelDensity: "balanced",
    labelSize: 11,
    hintEn: "Warm vermilion points with lower density for paper and historical palettes.",
    hintZh: "暖朱红点位配较低密度，适合纸面感和历史色系地图。",
  }),
  slate_blue: Object.freeze({
    color: "#5b42a6",
    capitalColor: "#d7b7ff",
    markerScale: 1.22,
    markerDensity: 0.78,
    opacity: 0.95,
    labelDensity: "sparse",
    labelSize: 12,
    hintEn: "Large violet markers with sparse labels for high-contrast modern inspection.",
    hintZh: "较大的紫色点位配稀疏标签，适合高对比的现代调试视图。",
  }),
  ivory_outline: Object.freeze({
    color: "#f3ead2",
    capitalColor: "#ff9f43",
    markerScale: 1.3,
    markerDensity: 0.7,
    opacity: 0.98,
    labelDensity: "sparse",
    labelSize: 13,
    hintEn: "Pale ivory markers with strong dark rims for night and dark-land inspection.",
    hintZh: "浅象牙点位配强深色轮廓，适合夜色和深色国土检查。",
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
