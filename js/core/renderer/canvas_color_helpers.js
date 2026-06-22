import { ColorManager } from "../color_manager.js";

const COLOR_HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FUNC_RE = /^(?:rgb|rgba|hsl|hsla)\([^)]*\)$/i;
const COLOR_NAME_RE = /^[a-z]+$/i;

function clampCanvasValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isProbablyCanvasColor(value) {
  if (typeof value !== "string") return false;
  const candidate = value.trim();
  if (!candidate || candidate.includes("var(")) return false;
  if (COLOR_HEX_RE.test(candidate)) {
    return true;
  }
  if (!COLOR_FUNC_RE.test(candidate) && !COLOR_NAME_RE.test(candidate)) {
    return false;
  }
  if (globalThis.CSS?.supports) {
    return globalThis.CSS.supports("color", candidate);
  }
  return false;
}

function getSafeCanvasColor(value, fallback) {
  if (isProbablyCanvasColor(value)) {
    return String(value).trim();
  }
  return fallback;
}

function parseCanvasColorChannels(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return null;

  const normalizedHex = ColorManager.normalizeHexColor(candidate);
  if (normalizedHex) {
    const rgb = ColorManager.hexToRgb(normalizedHex);
    return rgb ? { ...rgb, a: 1 } : null;
  }

  const rgbMatch = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+)\s*)?\)$/iu.exec(candidate);
  if (!rgbMatch) return null;
  return {
    r: clampCanvasValue(Number(rgbMatch[1]) || 0, 0, 255),
    g: clampCanvasValue(Number(rgbMatch[2]) || 0, 0, 255),
    b: clampCanvasValue(Number(rgbMatch[3]) || 0, 0, 255),
    a: clampCanvasValue(rgbMatch[4] === undefined ? 1 : (Number(rgbMatch[4]) || 0), 0, 1),
  };
}

function getCanvasColorRelativeLuminance(value) {
  const channels = parseCanvasColorChannels(value);
  if (!channels) return null;
  const r = ColorManager.srgbToLinear(channels.r / 255);
  const g = ColorManager.srgbToLinear(channels.g / 255);
  const b = ColorManager.srgbToLinear(channels.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mixCanvasColors(baseColor, targetColor, amount) {
  const base = parseCanvasColorChannels(baseColor);
  const target = parseCanvasColorChannels(targetColor);
  if (!base || !target) return null;
  const mix = clampCanvasValue(Number(amount) || 0, 0, 1);
  return ColorManager.rgbToHex(
    base.r + ((target.r - base.r) * mix),
    base.g + ((target.g - base.g) * mix),
    base.b + ((target.b - base.b) * mix),
  );
}

export {
  getCanvasColorRelativeLuminance,
  getSafeCanvasColor,
  mixCanvasColors,
  parseCanvasColorChannels,
};
