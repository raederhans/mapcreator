import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readText = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("ocean depth intensity channel is registered as a background pass mask", () => {
  const source = readText("js/core/intensity_field.js");

  assert.match(source, /oceanDepth:\s*Object\.freeze\(\{/);
  assert.match(source, /id:\s*"oceanDepth"/);
  assert.match(source, /targetPasses:\s*Object\.freeze\(\["background"\]\)/);
  assert.match(source, /applyMode:\s*"passMask"/);
});

test("background render pass composes ocean depth mask after ocean style", () => {
  const source = readText("js/core/map_renderer.js");
  const drawBackgroundBody = source.match(/function drawBackgroundPass\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const depthLayerBody = source.match(/function drawOceanDepthMaskLayer\(\) \{([\s\S]*?)\n\}\n\nfunction drawBackgroundPass/)?.[1] || "";

  assert.match(source, /createIntensityFieldMaskOwner/);
  assert.match(source, /`field:oceanDepth:\$\{Number\(intensityFields\.channels\.oceanDepth\?\.revision \|\| 0\)\}`/);
  assert.ok(drawBackgroundBody.indexOf("drawOceanStyle();") < drawBackgroundBody.indexOf("drawOceanDepthMaskLayer();"));
  assert.match(depthLayerBody, /getIntensityFieldMaskOwner\(\)\.getMaskCanvas\("oceanDepth"/);
  assert.match(depthLayerBody, /applyOceanClipMask\(runtimeState\.oceanMaskMode \|\| OCEAN_MASK_MODE_TOPOLOGY\)/);
  assert.match(depthLayerBody, /context\.globalCompositeOperation = OCEAN_DEPTH_MASK_BLEND_MODE/);
  assert.match(depthLayerBody, /context\.setTransform\(1, 0, 0, 1, 0, 0\)/);
  assert.match(depthLayerBody, /context\.drawImage\(maskResult\.canvas, 0, 0\)/);
});

test("ocean appearance panel binds depth field editor to oceanDepth", () => {
  const controller = readText("js/ui/toolbar/ocean_lake_controls_controller.js");
  const markup = readText("index.html");

  assert.match(controller, /createIntensityFieldEditorNodes\(documentRef,\s*\{\s*prefix:\s*"oceanDepthField"/);
  assert.match(controller, /channelIds:\s*\["oceanDepth"\]/);
  assert.match(controller, /defaultChannelId:\s*"oceanDepth"/);
  assert.match(controller, /oceanDepthFieldEditor\.render\(\)/);
  assert.match(controller, /oceanDepthFieldEditor\.bindEvents\(\)/);
  [
    "oceanDepthFieldEnabled",
    "oceanDepthFieldToolToggleBtn",
    "oceanDepthFieldPaintBtn",
    "oceanDepthFieldEraseBtn",
    "oceanDepthFieldPointsBtn",
    "oceanDepthFieldWeight",
    "oceanDepthFieldWeightValue",
    "oceanDepthFieldRadius",
    "oceanDepthFieldRadiusValue",
    "oceanDepthFieldClearBtn",
    "oceanDepthFieldPointCount",
    "oceanDepthFieldPointList",
  ].forEach((id) => {
    assert.match(markup, new RegExp(`id="${id}"`));
  });
});
