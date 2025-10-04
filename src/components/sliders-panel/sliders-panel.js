// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").webComponent<UIState>} webComponent */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";

export const SlidersPanel = webComponent(
  /** @type InitFunction */
  ({ on, refs }) => {
    on("numberOfFunctions", ({ state: mutable, e, detail }) => {
      mutable.shaderConfig[detail.data].numberOfFunctions =
        e.event.target.value;
      mutable.updateTmpShaders();
    });
    on("statementsPerFunction", ({ state: mutable, e, detail }) => {
      mutable.shaderConfig[detail.data]
        .statementsPerFunction = e.event.target.value;
      mutable.updateTmpShaders();
    });
    on("expressionDepthPerStatement", ({ state: mutable, e, detail }) => {
      mutable.shaderConfig[detail.data]
        .expressionDepthPerStatement = e.event.target.value;
      mutable.updateTmpShaders();
    });

    return onRender;
  },
);

/** @type RenderFunction */
function onRender(params) {
  const { detail, slots, state, self } = params;

  let shader = "compute";

  // detail is an object sent in the creation of this component
  // check the shader-config.js to see how this is being created
  // dynamically
  if (detail.data) {
    shader = detail.data;
  }

  slots.functions.textContent = state.shaderConfig[shader].numberOfFunctions;
  slots.statements.textContent =
    state.shaderConfig[shader].statementsPerFunction;
  slots.expressionDepth.textContent =
    state.shaderConfig[shader].expressionDepthPerStatement;

  // self.setAttribute("data-shader", shader);
}
