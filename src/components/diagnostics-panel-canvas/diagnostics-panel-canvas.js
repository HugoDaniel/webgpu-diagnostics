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
  const { detail, slots, state } = params;

  slots.info.textContent = state.canvasInfo;
}
