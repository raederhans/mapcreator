function assertTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) throw new TypeError("[appearance_selection_actions] target must be an object");
}
export function setSelectedColorState(target, color) { assertTarget(target); target.selectedColor = color; return color; }
