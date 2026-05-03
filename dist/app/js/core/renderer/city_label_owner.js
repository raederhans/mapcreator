const DEFAULT_SERIF_STACK = '"Libre Baskerville", "Palatino Linotype", Georgia, serif';

function doScreenBoxesOverlap(a, b) {
  return (
    a.x < (b.x + b.w)
    && (a.x + a.w) > b.x
    && a.y < (b.y + b.h)
    && (a.y + a.h) > b.y
  );
}

export function createCityLabelOwner({ constants = {}, getters = {}, helpers = {} } = {}) {
  const serifStack = constants.textureLabelSerifStack || DEFAULT_SERIF_STACK;
  const getContext = typeof getters.getContext === "function" ? getters.getContext : () => null;
  const getViewportSize = typeof getters.getViewportSize === "function"
    ? getters.getViewportSize
    : () => ({ width: 0, height: 0 });

  function drawCityLabelsFromEntries(labelEntries, { config, scale } = {}) {
    const context = getContext();
    if (!Array.isArray(labelEntries) || !labelEntries.length || !context) return 0;
    let labelCount = 0;
    const fontPx = helpers.clamp((Number(config?.labelSize) || 11) - 1, 7, 23);
    context.save();
    context.globalAlpha = 1;
    context.textBaseline = "middle";
    context.lineJoin = "round";
    const occupiedBoxes = [];
    labelEntries.forEach((entry) => {
      const visualEntry = helpers.getCityVisualCapitalState(entry, config)
        ? entry
        : { ...entry, isCapital: false, markerSizePx: null };
      context.font = `${visualEntry.isCapital ? 600 : 400} ${fontPx / scale}px ${serifStack}`;
      const fullText = helpers.getCityDisplayLabel(visualEntry.feature);
      const text = helpers.formatCityMapLabel(fullText, {
        entry: visualEntry,
        context,
        config,
        scale,
      });
      const labelMinZoom = helpers.getCityLabelMinZoom(visualEntry, config);
      if (!text || !entry.screenPoint || scale < labelMinZoom) return;
      const markerSizePx = Number(visualEntry.markerSizePx || helpers.getCityMarkerSizePx(visualEntry, config));
      const offsetPx = Math.max(7, markerSizePx + 4);
      const verticalOffsetPx = Math.max(fontPx + 2, markerSizePx + 6);
      const metrics = context.measureText(text);
      const candidates = helpers.buildCityLabelPlacementCandidates(visualEntry, {
        textWidthPx: metrics.width * scale,
        fontPx,
        scale,
        offsetPx,
        verticalOffsetPx,
      });
      const viewportSize = getViewportSize();
      const acceptedPlacement = candidates.find(({ box }) => (
        !(box.x > viewportSize.width + 24
        || box.y > viewportSize.height + 24
        || (box.x + box.w) < -24
        || (box.y + box.h) < -24)
        && !occupiedBoxes.some((occupied) => doScreenBoxesOverlap(box, occupied))
      ));
      if (!acceptedPlacement) {
        return;
      }
      occupiedBoxes.push(acceptedPlacement.box);
      entry.acceptedLabelPlacement = acceptedPlacement.id;
      labelCount += 1;
      const labelStyle = helpers.getCityLabelRenderStyle(visualEntry, config);
      context.textAlign = acceptedPlacement.textAlign;
      context.shadowColor = labelStyle.shadowColor;
      context.shadowBlur = Math.max(1.1, fontPx * labelStyle.shadowBlurFactor) / scale;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = Math.max(0.5, fontPx * labelStyle.shadowOffsetYFactor) / scale;
      context.lineWidth = Math.max(0.9, fontPx * labelStyle.strokeWidthFactor) / scale;
      context.strokeStyle = labelStyle.strokeStyle;
      context.strokeText(text, acceptedPlacement.drawX, acceptedPlacement.drawY);
      context.fillStyle = labelStyle.fillStyle;
      context.fillText(text, acceptedPlacement.drawX, acceptedPlacement.drawY);
      entry.labelContrastMode = labelStyle.usesLightLabel ? "light" : "default";
    });
    context.restore();
    return labelCount;
  }

  return {
    drawCityLabelsFromEntries,
  };
}
