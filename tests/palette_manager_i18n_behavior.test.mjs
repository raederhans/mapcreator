import test from "node:test";
import assert from "node:assert/strict";

import { buildPaletteLibraryEntries } from "../js/core/palette_manager.js";
import { state as runtimeState } from "../js/core/state.js";
import { createDefaultColorState } from "../js/core/state/color_state.js";
import { createDefaultLocalesState } from "../js/core/state/content_state.js";

function resetPaletteI18nState() {
  Object.assign(runtimeState, createDefaultColorState());
  runtimeState.locales = createDefaultLocalesState();
}

test("palette library entries localize titles and source labels in Chinese", () => {
  resetPaletteI18nState();
  runtimeState.currentLanguage = "zh";
  runtimeState.locales.geo = {
    Germany: { en: "Germany", zh: "德国" },
    "United States": { en: "United States", zh: "美国" },
  };
  runtimeState.activePalettePack = {
    quick_tags: ["GER", "USA"],
    entries: {
      GER: {
        color: [70, 87, 107],
        localized_name: "Germany",
        country_file_label: "Germany",
      },
      USA: {
        color: [95, 141, 198],
        localized_name: "United States",
        country_file_label: "USA",
      },
    },
  };
  runtimeState.activePaletteMap = {
    mapped: {
      GER: { iso2: "DE" },
      USA: { iso2: "US" },
    },
  };

  const entries = buildPaletteLibraryEntries();
  const germany = entries.find((entry) => entry.sourceTag === "GER");
  const usa = entries.find((entry) => entry.sourceTag === "USA");

  assert.equal(germany.localizedName, "德国");
  assert.equal(germany.sourceLabel, "德国");
  assert.equal(germany.countryFileLabel, "Germany");
  assert.equal(usa.localizedName, "美国");
  assert.equal(usa.sourceLabel, "美国");
  assert.equal(usa.sourceLabelZh, "美国");
});

test("palette library entries keep English labels in English", () => {
  resetPaletteI18nState();
  runtimeState.currentLanguage = "en";
  runtimeState.locales.geo = {
    Germany: { en: "Germany", zh: "德国" },
  };
  runtimeState.activePalettePack = {
    entries: {
      GER: {
        color: [70, 87, 107],
        localized_name: "Germany",
        country_file_label: "Germany",
      },
    },
  };
  runtimeState.activePaletteMap = {
    mapped: {
      GER: { iso2: "DE" },
    },
  };

  const [entry] = buildPaletteLibraryEntries();

  assert.equal(entry.localizedName, "Germany");
  assert.equal(entry.sourceLabel, "Germany");
  assert.equal(entry.sourceLabelZh, "德国");
});
