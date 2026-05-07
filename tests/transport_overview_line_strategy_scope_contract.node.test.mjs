import test from "node:test";
import assert from "node:assert/strict";

import { resolveTransportOverviewLineStrategy } from "../js/core/transport_capability_registry.js";

const LINE_FIXTURES = Object.freeze({
  road: Object.freeze([
    { className: "motorway", revealRank: 1 },
    { className: "motorway", revealRank: 2 },
    { className: "trunk", revealRank: 2 },
  ]),
  rail: Object.freeze([
    { className: "mainline", revealRank: 1 },
    { className: "mainline", revealRank: 2 },
    { className: "regional", revealRank: 2 },
  ]),
});

function countVisibleLines(familyId, config, scale) {
  const strategy = resolveTransportOverviewLineStrategy(familyId, config, { scale });
  const primaryClass = familyId === "rail" ? "mainline" : "motorway";
  return LINE_FIXTURES[familyId].filter((feature) => {
    if (feature.revealRank > strategy.maximumRevealRank) return false;
    if (strategy.minimumScopeRank <= 1 && feature.className !== primaryClass) return false;
    return true;
  }).length;
}

test("rail and road line scope thresholds still constrain counts across overview scales", () => {
  const cases = [
    {
      familyId: "road",
      primaryConfig: { scope: "motorway_only", importanceThreshold: "primary" },
      broadConfig: { scope: "motorway_trunk", importanceThreshold: "secondary" },
    },
    {
      familyId: "rail",
      primaryConfig: { scope: "mainline_only", importanceThreshold: "primary" },
      broadConfig: { scope: "mainline_plus_regional", importanceThreshold: "secondary" },
    },
  ];

  for (const { familyId, primaryConfig, broadConfig } of cases) {
    for (const scale of [1.2, 3, 5]) {
      assert.equal(countVisibleLines(familyId, primaryConfig, scale), 1, `${familyId} primary scale ${scale}`);
      assert.equal(countVisibleLines(familyId, broadConfig, scale), 3, `${familyId} broad scale ${scale}`);
    }
  }
});
