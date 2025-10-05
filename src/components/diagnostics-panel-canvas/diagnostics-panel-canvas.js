// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState | undefined>} WebComponentRenderParams */
import { webComponent } from "boredom";

export const DiagnosticsPanelCanvas = webComponent(
  () => onRender,
);

/** @type {RenderFunction} */
function onRender(params) {
  const { slots, state } = /** @type {WebComponentRenderParams} */ (params);
  if (!state) return;

  const infoSlot = /** @type {HTMLElement | undefined} */ (slots.info);
  if (infoSlot) {
    infoSlot.textContent = state.canvasInfo;
  }
}
