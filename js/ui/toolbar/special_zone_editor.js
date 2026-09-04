// Special zone editor compatibility adapter.
// 新的编辑主路径是 layer-based workbench；这个 adapter 只保留旧 toolbar facade 和旧项目读取后的提示面。

import {
  ensureManualSpecialZonesState,
  patchSpecialZoneEditorState,
} from "../../core/state/actions/special_zone_actions.js";

function createSpecialZoneEditorController({
  runtimeState,
  specialZoneEditorHint = null,
  renderTransportAppearanceUi,
  t,
} = {}) {
  const translate = (value) => (typeof t === "function" ? t(value, "ui") : value);

  const normalizeSpecialZoneEditorState = () => {
    if (!runtimeState || typeof runtimeState !== "object") return;
    patchSpecialZoneEditorState(runtimeState, {
      active: false,
      zoneType: String(runtimeState.specialZoneEditor?.zoneType || "custom"),
      label: String(runtimeState.specialZoneEditor?.label || ""),
    });
    ensureManualSpecialZonesState(runtimeState);
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
