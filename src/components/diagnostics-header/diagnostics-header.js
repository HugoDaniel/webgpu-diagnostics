// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").webComponent<UIState>} webComponent */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";

export const DiagnosticsPanelCanvas = webComponent(
  () => onRender,
);

/** @type RenderFunction */
function onRender(params) {
  const { slots, state, refs } = params;
  if (state?.isWebGPUSupported) {
    slots.statusText.textContent = "WebGPU Ready";
    refs.badge.classList.add("ok");
  } else if (state?.isWebGPUSupported === false) {
    slots.statusText.textContent = "WebGPU is not supported in this browser";
    refs.badge.classList.add("bad");
  }
}
