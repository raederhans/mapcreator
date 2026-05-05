import { state as runtimeState } from "./state.js";
import { clearDirtyState, markDirtyState } from "./state/ui_state.js";

function updateDirtyIndicator() {
  const indicator = document.getElementById("appDirtyIndicator");
  if (!indicator) return;
  indicator.classList.toggle("hidden", !runtimeState.isDirty);
  indicator.setAttribute("aria-hidden", runtimeState.isDirty ? "false" : "true");
}

function markDirty(reason = "") {
  markDirtyState(runtimeState, reason);
  updateDirtyIndicator();
}

function clearDirty(reason = "") {
  clearDirtyState(runtimeState, reason);
  updateDirtyIndicator();
}

function handleBeforeUnload(event) {
  if (!runtimeState.isDirty) return;
  event.preventDefault();
  event.returnValue = "";
}

function bindBeforeUnload() {
  globalThis.removeEventListener("beforeunload", handleBeforeUnload);
  globalThis.addEventListener("beforeunload", handleBeforeUnload);
  updateDirtyIndicator();
}

export {
  bindBeforeUnload,
  clearDirty,
  markDirty,
  updateDirtyIndicator,
};

