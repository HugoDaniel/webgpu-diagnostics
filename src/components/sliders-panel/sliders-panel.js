// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").webComponent<UIState>} webComponent */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";

export const SlidersPanel = webComponent(
  /** @type InitFunction */
  ({ on, refs }) => {
    const DEBOUNCE_MS = 150;
    const debounceTimers = new Map();

    const queueUpdate = (mutable, shader) => {
      const existing = debounceTimers.get(shader);
      if (typeof existing === "number") {
        clearTimeout(existing);
      }

      const timer = setTimeout(() => {
        debounceTimers.delete(shader);
        mutable.updateTmpShaders(false, shader).catch((error) => {
          console.error(`Failed to regenerate ${shader} shader`, error);
        });
      }, DEBOUNCE_MS);

      debounceTimers.set(shader, timer);
    };

    on("numberOfFunctions", ({ state: mutable, e, detail }) => {
      const value = Number(e.event.target.value);
      mutable.shaderConfig[detail.data].numberOfFunctions = value;
      queueUpdate(mutable, detail.data);
    });
    on("statementsPerFunction", ({ state: mutable, e, detail }) => {
      const value = Number(e.event.target.value);
      mutable.shaderConfig[detail.data]
        .statementsPerFunction = value;
      queueUpdate(mutable, detail.data);
    });
    on("expressionDepthPerStatement", ({ state: mutable, e, detail }) => {
      const value = Number(e.event.target.value);
      mutable.shaderConfig[detail.data]
        .expressionDepthPerStatement = value;
      queueUpdate(mutable, detail.data);
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
