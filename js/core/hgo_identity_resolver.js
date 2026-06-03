const HGO_MATCH_KINDS = Object.freeze({
  exact: "exact",
  reviewedAlias: "reviewed_alias",
  suggestedAlias: "suggested_alias",
  missing: "missing",
});

const FLAG_TIER_ORDER = Object.freeze(["small", "medium", "full"]);

function normalizeHgoTag(value) {
  const text = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{2,5}$/.test(text) ? text : "";
}

function normalizeVariantKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeNameMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([language, name]) => [
        String(language || "").trim().toLowerCase(),
        String(name || "").trim(),
      ])
      .filter(([language, name]) => !!language && !!name)
  );
}

function normalizeAliasBucket(value) {
  const aliases = new Map();
  if (!value || typeof value !== "object" || Array.isArray(value)) return aliases;
  Object.entries(value).forEach(([rawTag, rawSpec]) => {
    const scenarioTag = normalizeHgoTag(rawTag);
    const targetTag = normalizeHgoTag(rawSpec?.target_tag || rawSpec?.targetTag);
    if (!scenarioTag || !targetTag) return;
    aliases.set(scenarioTag, {
      scenarioTag,
      targetTag,
      label: String(rawSpec?.label || "").trim(),
      reason: String(rawSpec?.reason || "").trim(),
    });
  });
  return aliases;
}

function pickFlagTier(tiers = {}, preferredTier = "small") {
  const preferred = String(preferredTier || "small").trim().toLowerCase();
  const order = [preferred, ...FLAG_TIER_ORDER].filter((tier, index, values) => (
    FLAG_TIER_ORDER.includes(tier) && values.indexOf(tier) === index
  ));
  const tierKey = order.find((tier) => tiers?.[tier]?.pngPath);
  return tierKey ? { tier: tierKey, ...tiers[tierKey] } : null;
}

function normalizeFlagTiers(tiers = {}) {
  const normalized = {};
  FLAG_TIER_ORDER.forEach((tier) => {
    const spec = tiers?.[tier];
    const pngPath = String(spec?.png_path || "").trim();
    if (!pngPath) return;
    normalized[tier] = {
      tier,
      pngPath,
      sourcePath: String(spec?.source_path || "").trim(),
      width: Number(spec?.width || 0) || 0,
      height: Number(spec?.height || 0) || 0,
      sha256: String(spec?.sha256 || "").trim(),
      variantSource: String(spec?.variant_source || "").trim(),
    };
  });
  return normalized;
}

function normalizeFlag(tag, flagRecord = {}) {
  if (!flagRecord || typeof flagRecord !== "object") {
    return {
      tag,
      base: {},
      variants: [],
      variantCount: 0,
    };
  }
  const base = normalizeFlagTiers(flagRecord.base || {});
  const variants = Object.entries(flagRecord.variants || {})
    .map(([rawVariantKey, rawVariantRecord]) => {
      const variantKey = normalizeVariantKey(rawVariantKey);
      const tiers = normalizeFlagTiers(rawVariantRecord || {});
      if (!variantKey || !Object.keys(tiers).length) return null;
      const variantSource = Object.values(tiers).find((tier) => tier.variantSource)?.variantSource || rawVariantKey;
      return {
        key: variantKey,
        label: variantSource || variantKey,
        variantSource: variantSource || variantKey,
        tiers,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.key.localeCompare(b.key));
  return {
    tag,
    base,
    variants,
    variantCount: variants.length,
  };
}

function resolveBestDisplayName({ scenarioDisplayName = "", hgoNames = {}, nameMode = "scenario", targetTag = "" } = {}) {
  const scenarioName = String(scenarioDisplayName || "").trim();
  const hgoName = String(hgoNames.en || Object.values(hgoNames)[0] || "").trim();
  return String(nameMode || "scenario") === "hgo"
    ? (hgoName || scenarioName || targetTag)
    : (scenarioName || hgoName || targetTag);
}

function normalizePaletteColor(paletteEntry = {}) {
  const candidates = [
    paletteEntry?.ui_hex,
    paletteEntry?.map_hex,
    paletteEntry?.country_file_hex,
  ];
  const value = candidates.map((candidate) => String(candidate || "").trim()).find((candidate) => /^#[0-9a-f]{6}$/i.test(candidate));
  return value ? value.toUpperCase() : "";
}

function buildMissingIdentity(tag, scenarioDisplayName = "") {
  return {
    tag,
    sourceTag: tag,
    targetTag: "",
    matchKind: HGO_MATCH_KINDS.missing,
    displayName: String(scenarioDisplayName || tag || "").trim(),
    scenarioDisplayName: String(scenarioDisplayName || "").trim(),
    hgoNames: {},
    flag: {
      tag: "",
      base: {},
      variants: [],
      variantCount: 0,
    },
    paletteColor: "",
    alias: null,
    sourceRefs: {},
    searchTokens: [tag, scenarioDisplayName].map((value) => String(value || "").trim()).filter(Boolean),
  };
}

function createHgoIdentityResolver({
  placeNames = {},
  flagsManifest = {},
  palettePack = {},
  aliases = {},
} = {}) {
  const placeEntries = placeNames?.entries && typeof placeNames.entries === "object" ? placeNames.entries : {};
  const flagEntries = flagsManifest?.tags && typeof flagsManifest.tags === "object" ? flagsManifest.tags : {};
  const paletteEntries = palettePack?.entries && typeof palettePack.entries === "object" ? palettePack.entries : {};
  const reviewedAliases = normalizeAliasBucket(aliases?.reviewed_aliases || aliases?.reviewedAliases);
  const suggestedAliases = normalizeAliasBucket(aliases?.suggested_aliases || aliases?.suggestedAliases);

  const findMatch = (scenarioTag, { allowSuggestedAliases = true } = {}) => {
    if (placeEntries[scenarioTag] || flagEntries[scenarioTag] || paletteEntries[scenarioTag]) {
      return {
        matchKind: HGO_MATCH_KINDS.exact,
        targetTag: scenarioTag,
        alias: null,
      };
    }
    const reviewedAlias = reviewedAliases.get(scenarioTag);
    if (reviewedAlias) {
      return {
        matchKind: HGO_MATCH_KINDS.reviewedAlias,
        targetTag: reviewedAlias.targetTag,
        alias: reviewedAlias,
      };
    }
    const suggestedAlias = suggestedAliases.get(scenarioTag);
    if (allowSuggestedAliases && suggestedAlias) {
      return {
        matchKind: HGO_MATCH_KINDS.suggestedAlias,
        targetTag: suggestedAlias.targetTag,
        alias: suggestedAlias,
      };
    }
    return {
      matchKind: HGO_MATCH_KINDS.missing,
      targetTag: "",
      alias: null,
    };
  };

  const resolveIdentity = (
    countryStateOrTag,
    {
      nameMode = "scenario",
      allowSuggestedAliases = true,
      preferredFlagTier = "small",
    } = {}
  ) => {
    const tag = normalizeHgoTag(
      typeof countryStateOrTag === "object" && countryStateOrTag
        ? countryStateOrTag.code || countryStateOrTag.tag
        : countryStateOrTag
    );
    const scenarioDisplayName = typeof countryStateOrTag === "object" && countryStateOrTag
      ? String(countryStateOrTag.displayName || countryStateOrTag.name || "").trim()
      : "";
    if (!tag) {
      return buildMissingIdentity("", scenarioDisplayName);
    }

    const match = findMatch(tag, { allowSuggestedAliases });
    if (!match.targetTag) {
      return buildMissingIdentity(tag, scenarioDisplayName);
    }

    const placeEntry = placeEntries[match.targetTag] || {};
    const hgoNames = normalizeNameMap(placeEntry.names);
    const flagEntry = flagEntries[match.targetTag] || null;
    const flag = normalizeFlag(match.targetTag, flagEntry || {});
    const preferredBaseFlag = pickFlagTier(flag.base, preferredFlagTier);
    const paletteEntry = paletteEntries[match.targetTag] || null;
    const displayName = resolveBestDisplayName({
      scenarioDisplayName,
      hgoNames,
      nameMode,
      targetTag: match.targetTag,
    });
    const sourceRefs = {
      placeNames: placeEntry.source_files || [],
      flagsManifest: flagEntry ? "data/hgo_catalogs/hgo_flags.png_manifest.json" : "",
      palette: paletteEntry ? "data/palettes/hgo.palette.json" : "",
      alias: match.alias ? "data/hgo_catalogs/hgo_identity_aliases.json" : "",
    };
    const searchTokens = [
      tag,
      match.targetTag,
      scenarioDisplayName,
      displayName,
      ...Object.values(hgoNames),
      match.alias?.label,
      match.alias?.reason,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return {
      tag,
      sourceTag: tag,
      targetTag: match.targetTag,
      matchKind: match.matchKind,
      displayName,
      scenarioDisplayName,
      hgoNames,
      flag: {
        ...flag,
        preferredBaseFlag,
      },
      paletteColor: normalizePaletteColor(paletteEntry || {}),
      alias: match.alias,
      sourceRefs,
      searchTokens,
    };
  };

  const summarizeCoverage = (countryStates = [], { allowSuggestedAliases = true } = {}) => {
    const summary = {
      total: 0,
      flags: 0,
      names: 0,
      exact: 0,
      reviewedAlias: 0,
      suggestedAlias: 0,
      missing: 0,
    };
    (Array.isArray(countryStates) ? countryStates : []).forEach((countryState) => {
      const identity = resolveIdentity(countryState, { allowSuggestedAliases });
      if (!identity.tag) return;
      summary.total += 1;
      if (identity.flag?.preferredBaseFlag || Object.keys(identity.flag?.base || {}).length) summary.flags += 1;
      if (Object.keys(identity.hgoNames || {}).length) summary.names += 1;
      if (identity.matchKind === HGO_MATCH_KINDS.exact) summary.exact += 1;
      else if (identity.matchKind === HGO_MATCH_KINDS.reviewedAlias) summary.reviewedAlias += 1;
      else if (identity.matchKind === HGO_MATCH_KINDS.suggestedAlias) summary.suggestedAlias += 1;
      else summary.missing += 1;
    });
    return summary;
  };

  return {
    resolveIdentity,
    summarizeCoverage,
  };
}

export {
  HGO_MATCH_KINDS,
  createHgoIdentityResolver,
  normalizeHgoTag,
};
