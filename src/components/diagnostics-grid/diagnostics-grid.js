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

  for (
    const [adapterLimitName, adapterLimitValue] of Object.entries(
      state.limits.adapter,
    )
  ) {
    slots.adapterLimits.appendChild(
      limitElement(adapterLimitName, adapterLimitValue),
    );
  }

  for (
    const [deviceLimitName, deviceLimitValue] of Object.entries(
      state.limits.device,
    )
  ) {
    slots.deviceLimits.appendChild(
      limitElement(deviceLimitName, deviceLimitValue),
    );
  }
}

function limitElement(name, value) {
  const limitContainerElem = document.createElement("a");
  limitContainerElem.classList.add("limit");
  limitContainerElem.href =
    `https://www.w3.org/TR/webgpu/#dom-supported-limits-${name.toLocaleLowerCase()}`;

  const nameElem = document.createElement("div");
  nameElem.classList.add("name");
  nameElem.textContent = name;

  const numElem = document.createElement("div");
  numElem.classList.add("num");
  numElem.textContent = value;

  limitContainerElem.appendChild(nameElem);
  limitContainerElem.appendChild(numElem);

  return limitContainerElem;
}
