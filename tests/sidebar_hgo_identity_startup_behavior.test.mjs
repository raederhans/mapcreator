import assert from "node:assert/strict";
import test from "node:test";

import { requestHgoIdentityAssetsForSettings } from "../js/ui/sidebar.js";

test("HGO identity startup loads assets only when persisted settings are enabled", () => {
  let loadCalls = 0;
  const loadAssets = () => {
    loadCalls += 1;
  };

  requestHgoIdentityAssetsForSettings({ enabled: false }, loadAssets);
  requestHgoIdentityAssetsForSettings({}, loadAssets);
  requestHgoIdentityAssetsForSettings(null, loadAssets);
  assert.equal(loadCalls, 0);

  requestHgoIdentityAssetsForSettings({ enabled: true }, loadAssets);
  assert.equal(loadCalls, 1);
});
