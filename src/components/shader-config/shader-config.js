// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").webComponent<UIState>} webComponent */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";
import { runtimeAttribute } from "../../runtimeAttribute.js";
import { createWebGPU } from "../../createWebGPU.js";
import { stringSizeInKB } from "../../stringSizeInKb.js";

export const ShaderConfig = webComponent(
  /** @type InitFunction */
  ({ on, refs }) => {
    on("recompile", ({ state: mutable }) => {
      mutable.isCompiling = true;
      mutable[runtimeAttribute].device?.destroy();

      createWebGPU(mutable, mutable[runtimeAttribute].canvas).then(() => {
        mutable.isCompiling = false;
      });
    });

    on(
      "tab1Change",
      ({ state: mutable }) => mutable.selectedShader = "compute",
    );
    on("tab2Change", ({ state: mutable }) => mutable.selectedShader = "vertex");
    on(
      "tab3Change",
      ({ state: mutable }) => mutable.selectedShader = "fragment",
    );

    return onRender;
  },
);

/** @type RenderFunction */
function onRender(params) {
  const { slots, makeComponent, state, self } = params;
  console.log("<shader-config>");
  if (!state) return;

  if (slots.panels.childElementCount === 0) {
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
    slots.panels.replaceChildren(...panels);
  }

  const sizeCompute = stringSizeInKB(state.shaders.compute);
  const sizeVertex = stringSizeInKB(state.shaders.vertex);
  const sizeFragment = stringSizeInKB(state.shaders.fragment);

  switch (state.selectedShader) {
    case "compute":
      slots.shaderSize = `${sizeCompute} KB`;
      break;
    case "vertex":
      slots.shaderSize = `${sizeVertex} KB`;
      break;
    case "fragment":
      slots.shaderSize = `${sizeFragment} KB`;
      break;
  }

  const buttons = self.querySelectorAll("button");
  buttons.forEach((btn) => {
    if (state.isCompiling) {
      btn.setAttribute("disabled", "true");
    } else {
      btn.removeAttribute("disabled");
    }
  });
}
