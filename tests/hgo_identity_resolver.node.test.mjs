import assert from "node:assert/strict";
import test from "node:test";

import {
  HGO_MATCH_KINDS,
  createHgoIdentityResolver,
  normalizeHgoTag,
} from "../js/core/hgo_identity_resolver.js";

const placeNames = {
  entries: {
    ABK: {
      kind: "country",
      names: { en: "Abkhazia", fr: "Abkhazie" },
      source_files: ["localisation/countries_l_english.yml"],
    },
    FEA: {
      kind: "country",
      names: { en: "French Equatorial Africa" },
      source_files: ["localisation/countries_l_english.yml"],
    },
    LKA: {
      kind: "country",
      names: { en: "Sri Lanka" },
      source_files: ["localisation/countries_l_english.yml"],
    },
  },
};

const flagsManifest = {
  tags: {
    ABK: {
      base: {
        small: {
          png_path: "data/hgo_catalogs/flags_png/small/AB/ABK.png",
          width: 10,
          height: 7,
        },
        medium: {
          png_path: "data/hgo_catalogs/flags_png/medium/AB/ABK.png",
          width: 41,
          height: 26,
        },
      },
      variants: {
        SOV: {
          small: {
            png_path: "data/hgo_catalogs/flags_png/small/AB/ABK_SOV.png",
            width: 10,
            height: 7,
            variant_source: "SOV",
          },
        },
      },
    },
    FEA: {
      base: {
        medium: {
          png_path: "data/hgo_catalogs/flags_png/medium/FE/FEA.png",
          width: 41,
          height: 26,
        },
      },
      variants: {},
    },
    LKA: {
      base: {},
      variants: {
        democratic: {
          small: {
            png_path: "data/hgo_catalogs/flags_png/small/LK/LKA_democratic.png",
            width: 10,
            height: 7,
            variant_source: "democratic",
          },
        },
      },
    },
  },
};

const palettePack = {
  entries: {
    ABK: { ui_hex: "#930000" },
    FEA: { map_hex: "#123456" },
  },
};

const aliases = {
  reviewed_aliases: {
    AEF: {
      target_tag: "FEA",
      label: "French Equatorial Africa",
      note: "Reviewed historical scenario alias.",
    },
  },
  suggested_aliases: {
    CEY: {
      target_tag: "LKA",
      label: "Ceylon / Sri Lanka",
      note: "Suggested historical country rename.",
    },
  },
};

function createResolver() {
  return createHgoIdentityResolver({
    placeNames,
    flagsManifest,
    palettePack,
    aliases,
  });
}

test("normalizes HGO tags for lookup", () => {
  assert.equal(normalizeHgoTag(" abk "), "ABK");
  assert.equal(normalizeHgoTag(null), "");
});

test("exact tag lookup returns HGO names, base flag, variants, and palette", () => {
  const identity = createResolver().resolveIdentity(
    { tag: "ABK", displayName: "Scenario Abkhazia" },
    { nameMode: "hgo" },
  );

  assert.equal(identity.matchKind, HGO_MATCH_KINDS.exact);
  assert.equal(identity.displayName, "Abkhazia");
  assert.equal(identity.hgoNames.en, "Abkhazia");
  assert.equal(identity.flag.base.small.pngPath, "data/hgo_catalogs/flags_png/small/AB/ABK.png");
  assert.equal(identity.flag.preferredBaseFlag.tier, "small");
  assert.deepEqual(
    identity.flag.variants.map((variant) => variant.key),
    ["sov"],
  );
  assert.equal(identity.flag.variants[0].variantSource, "SOV");
  assert.equal(identity.paletteColor, "#930000");
  assert.ok(identity.searchTokens.includes("Abkhazie"));
});

test("preferred flag tier controls the selected base preview", () => {
  const resolver = createResolver();
  const small = resolver.resolveIdentity(
    { tag: "ABK", displayName: "Scenario Abkhazia" },
    { preferredFlagTier: "small" },
  );
  const medium = resolver.resolveIdentity(
    { tag: "ABK", displayName: "Scenario Abkhazia" },
    { preferredFlagTier: "medium" },
  );

  assert.equal(small.flag.preferredBaseFlag.tier, "small");
  assert.equal(medium.flag.preferredBaseFlag.tier, "medium");
  assert.equal(medium.flag.preferredBaseFlag.pngPath, "data/hgo_catalogs/flags_png/medium/AB/ABK.png");
});

test("reviewed aliases are strong HGO identity matches", () => {
  const identity = createResolver().resolveIdentity(
    { tag: "AEF", displayName: "Afrique Equatoriale Francaise" },
    { nameMode: "hgo" },
  );

  assert.equal(identity.matchKind, HGO_MATCH_KINDS.reviewedAlias);
  assert.equal(identity.targetTag, "FEA");
  assert.equal(identity.displayName, "French Equatorial Africa");
  assert.equal(identity.flag.preferredBaseFlag.tier, "medium");
  assert.equal(identity.paletteColor, "#123456");
  assert.equal(identity.sourceRefs.alias, "data/hgo_catalogs/hgo_identity_aliases.json");
});

test("suggested aliases stay visibly weak and can be hidden", () => {
  const resolver = createResolver();
  const shown = resolver.resolveIdentity(
    { tag: "CEY", displayName: "Ceylon" },
    { nameMode: "hgo", allowSuggestedAliases: true },
  );
  const hidden = resolver.resolveIdentity(
    { tag: "CEY", displayName: "Ceylon" },
    { nameMode: "hgo", allowSuggestedAliases: false },
  );

  assert.equal(shown.matchKind, HGO_MATCH_KINDS.suggestedAlias);
  assert.equal(shown.targetTag, "LKA");
  assert.equal(shown.displayName, "Sri Lanka");
  assert.equal(shown.flag.variants[0].key, "democratic");
  assert.equal(hidden.matchKind, HGO_MATCH_KINDS.missing);
  assert.equal(hidden.displayName, "Ceylon");
});

test("missing tags keep scenario display data intact", () => {
  const identity = createResolver().resolveIdentity(
    { tag: "ZZZ", displayName: "Unknown Country" },
    { nameMode: "hgo" },
  );

  assert.equal(identity.matchKind, HGO_MATCH_KINDS.missing);
  assert.equal(identity.targetTag, "");
  assert.equal(identity.displayName, "Unknown Country");
  assert.deepEqual(identity.flag.base, {});
  assert.deepEqual(identity.flag.variants, []);
  assert.equal(identity.paletteColor, "");
});

test("coverage summary separates exact, reviewed, suggested, and missing tags", () => {
  const summary = createResolver().summarizeCoverage([
    { tag: "ABK", displayName: "Abkhazia" },
    { tag: "AEF", displayName: "Afrique Equatoriale Francaise" },
    { tag: "CEY", displayName: "Ceylon" },
    { tag: "ZZZ", displayName: "Unknown Country" },
  ]);

  assert.equal(summary.total, 4);
  assert.equal(summary.flags, 2);
  assert.equal(summary.exact, 1);
  assert.equal(summary.reviewedAlias, 1);
  assert.equal(summary.suggestedAlias, 1);
  assert.equal(summary.missing, 1);
});
