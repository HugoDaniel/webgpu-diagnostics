// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").webComponent<UIState>} webComponent */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";

export const DiagnosticsGrid = webComponent(
  () => onRender,
);

/** @type RenderFunction */
function onRender(params) {
  const { slots, state } = params;

  // Timings:
  for (const [timingName, timingValue] of Object.entries(state.timings)) {
    slots[timingName].textContent = `${timingValue.toFixed(2)} ms`;
  }

  // Adapter Info:
  for (
    const [adapterInfoName, adapterInfoValue] of Object.entries(
      state.adapterInfo,
    )
  ) {
    slots[adapterInfoName].textContent = adapterInfoValue;
  }

  // Features:
  const elements = state.adapterFeatures.map((feature) => {
    const a = document.createElement("a");

    a.classList.add("tag");
    a.href = `https://www.w3.org/TR/webgpu/#${feature}`;
    a.innerText = feature;

    return a;
  });
  slots.features.replaceChildren(...elements);

  // Adapter Limits:
  // <div class="limit"><div class="name">${key}</div><div class="num">${displayValue}</div></div>
}
