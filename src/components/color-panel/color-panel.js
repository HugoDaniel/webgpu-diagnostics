// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").InitFunction<UIState | undefined>} InitFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";
import { ERROR_NO_2D_CONTEXT } from "../../errors.js";

export const ColorPanel = webComponent(
  /** @type InitFunction */
  ({ on }) => {
    // On mount initialization goes here
    on("ui:fill-select", ({ e, state }) => {
      if (state) {
        state.selected = e.index;
      }
    });

    return renderColorPanel;
  },
);

/**
 * @param {WebComponentRenderParams} params
 */
function renderColorPanel(params) {
  const { state, self } = params;

  const colors = state.colors;
  const selectedColor = colors[state.selected];

  // Paint the canvas with the selected color
  const canvas = self.querySelector("canvas");
  if (canvas instanceof HTMLCanvasElement) {
    const { width, height } = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(ERROR_NO_2D_CONTEXT);
    ctx.fillStyle = selectedColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Update the slots:
  updatePanelFooterSlot(params);
}

/**
 * @param {WebComponentRenderParams} params
 */
function updatePanelFooterSlot({ state, makeComponent, slots }) {
  const list = document.createElement("ol");
  state.colors.map((c, i) => {
    list.appendChild(
      makeComponent(`fill-item`, {
        // Detail is passed to the render function of the component (as .detail)
        detail: { data: c, index: i, name: "fill-item" },
      }),
    );
  });

  slots["panel-footer"] = list;
}
