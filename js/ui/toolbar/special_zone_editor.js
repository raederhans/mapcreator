// Special zone editor compatibility adapter.
// 新的编辑主路径是 layer-based workbench；这个 adapter 只保留旧 toolbar facade 和旧项目读取后的提示面。

function createSpecialZoneEditorController({
  runtimeState,
  specialZoneEditorHint = null,
  renderTransportAppearanceUi,
  t,
} = {}) {
  const translate = (value) => (typeof t === "function" ? t(value, "ui") : value);

  const normalizeSpecialZoneEditorState = () => {
    if (!runtimeState || typeof runtimeState !== "object") return;
    if (!runtimeState.specialZoneEditor || typeof runtimeState.specialZoneEditor !== "object") {
      runtimeState.specialZoneEditor = {};
    }
    runtimeState.specialZoneEditor.active = false;
    runtimeState.specialZoneEditor.zoneType = String(runtimeState.specialZoneEditor.zoneType || "custom");
    runtimeState.specialZoneEditor.label = String(runtimeState.specialZoneEditor.label || "");
    if (!runtimeState.manualSpecialZones || runtimeState.manualSpecialZones.type !== "FeatureCollection") {
      runtimeState.manualSpecialZones = { type: "FeatureCollection", features: [] };
    }
    if (!Array.isArray(runtimeState.manualSpecialZones.features)) {
      runtimeState.manualSpecialZones.features = [];
    }
  };

  const renderSpecialZoneEditorUI = () => {
    if (specialZoneEditorHint) {
      specialZoneEditorHint.textContent = translate(
        "Layer-based special zones are the canonical editor. Use the workbench above to edit memberships."
      );
    }
    renderTransportAppearanceUi?.();
  };

  const bindSpecialZoneEditorEvents = () => {
    renderSpecialZoneEditorUI();
  };

  return {
    bindSpecialZoneEditorEvents,
    normalizeSpecialZoneEditorState,
    renderSpecialZoneEditorUI,
  };
}

export { createSpecialZoneEditorController };
