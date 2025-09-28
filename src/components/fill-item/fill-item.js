// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").webComponent<UIState>} webComponent */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";

export const FillItem = webComponent(
  () => onRender,
);

/** @type RenderFunction */
function onRender(params) {
  const { detail, slots } = params;
  let color = "#000000"; // default color;

  // detail is an object sent in the creation of this component
  // check the color-panel.js to see how this is being created
  // dynamically
  if (detail.data) {
    color = detail.data;
  }

  const div = document.createElement("div");
  div.style.background = color;

  slots.fill = div;
}
