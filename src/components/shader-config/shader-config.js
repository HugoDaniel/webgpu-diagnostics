// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").webComponent<UIState>} webComponent */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";
import { runtimeAttribute } from "../../runtimeAttribute.js";
import { createWebGPU } from "../../createWebGPU.js";

export const ShaderConfig = webComponent(
  /** @type InitFunction */
  ({ on, refs }) => {
    on("recompile", ({ state: mutable }) => {
      console.log("RECOMPILING", mutable[runtimeAttribute].canvas);

      mutable[runtimeAttribute].device?.destroy();

      createWebGPU(mutable, mutable[runtimeAttribute].canvas);
    });

    return onRender;
  },
);

/** @type RenderFunction */
function onRender(params) {
  const { slots, makeComponent } = params;
  console.log("RENDERING SHADER CONFIG");

  const panels = [
    makeComponent("sliders-panel", {
      detail: { data: "compute", index: 0, name: "shader-config-panel" },
    }),
    makeComponent("sliders-panel", {
      detail: { data: "vertex", index: 1, name: "shader-config-panel" },
    }),
    makeComponent("sliders-panel", {
      detail: { data: "fragment", index: 2, name: "shader-config-panel" },
    }),
  ].map((panel, i) => {
    panel.setAttribute("id", `panel${i + 1}`);
    panel.classList.add("tab-panel");
    return panel;
  });

  console.log("Replacing panels");
  slots.panels.replaceChildren(...panels);
}
