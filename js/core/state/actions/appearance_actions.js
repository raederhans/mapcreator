// Canonical appearance style state mutations. UI/render effects stay in callers.

export const APPEARANCE_STYLE_GROUP_KEYS = Object.freeze([
  "ocean", "lakes", "internalBorders", "empireBorders", "coastlines",
  "parentBorders", "physical", "urban", "cityPoints", "rivers",
  "texture", "dayNight", "transportOverview",
]);

function assertTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new TypeError("[appearance_actions] target must be an object");
  }
}
function assertGroup(group) {
  if (!APPEARANCE_STYLE_GROUP_KEYS.includes(group)) {
    throw new RangeError(`[appearance_actions] unknown style group: ${group}`);
  }
}

function normalizeBooleanRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`[appearance_actions] ${label} must be an object`);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, enabled]) => [key, Boolean(enabled)]),
  );
}

export function ensureAppearanceStyleConfigState(target) {
  assertTarget(target);
  if (!target.styleConfig || typeof target.styleConfig !== "object" || Array.isArray(target.styleConfig)) {
    target.styleConfig = {};
  }
  return target.styleConfig;
}

export function setAppearanceStyleConfigState(target, value) {
  assertTarget(target);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("[appearance_actions] style config must be an object");
  }
  target.styleConfig = value;
  return value;
}

export function setAppearanceStyleGroupState(target, group, value) {
  assertTarget(target); assertGroup(group);
  const styleConfig = ensureAppearanceStyleConfigState(target);
  styleConfig[group] = value;
  return value;
}

export function patchAppearanceStyleGroupState(target, group, patch) {
  assertTarget(target); assertGroup(group);
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError("[appearance_actions] patch must be an object");
  }
  const styleConfig = ensureAppearanceStyleConfigState(target);
  const current = styleConfig[group] && typeof styleConfig[group] === "object" && !Array.isArray(styleConfig[group])
    ? styleConfig[group] : {};
  styleConfig[group] = { ...current, ...patch };
  return styleConfig[group];
}

export function applyAppearanceStylePathPatchState(target, stylePatch) {
  assertTarget(target);
  if (!stylePatch || typeof stylePatch !== "object" || Array.isArray(stylePatch)) {
    return ensureAppearanceStyleConfigState(target);
  }
  const styleConfig = ensureAppearanceStyleConfigState(target);
  Object.entries(stylePatch).forEach(([path, value]) => {
    const segments = String(path || "").split(".").filter(Boolean);
    if (!segments.length) return;
    let cursor = styleConfig;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      if (!cursor[segment] || typeof cursor[segment] !== "object") {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    }
    const last = segments[segments.length - 1];
    if (value === null || value === undefined) {
      delete cursor[last];
    } else {
      cursor[last] = value;
    }
  });
  return styleConfig;
}

export function setAppearanceParentBorderEnabledMapState(target, value) {
  assertTarget(target);
  const next = normalizeBooleanRecord(value, "enabled map");
  target.parentBorderEnabledByCountry = next;
  return next;
}

export function patchAppearanceParentBorderEnabledMapState(target, patch) {
  assertTarget(target);
  const current = target.parentBorderEnabledByCountry
    && typeof target.parentBorderEnabledByCountry === "object"
    && !Array.isArray(target.parentBorderEnabledByCountry)
    ? target.parentBorderEnabledByCountry
    : {};
  const nextPatch = normalizeBooleanRecord(patch, "enabled-map patch");
  return setAppearanceParentBorderEnabledMapState(target, { ...current, ...nextPatch });
}
