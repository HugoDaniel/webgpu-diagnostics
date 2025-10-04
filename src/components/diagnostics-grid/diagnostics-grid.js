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
  const { slots, state, refs } = params;

  console.log("diagnostics-grid rendeR()", state);

  // Timings:
  if (state.isCompiling) {
    refs.timingsTitle.classList.add("loading");
    refs.timingsTitle.textContent += " (loading) ";
  } else {
    refs.timingsTitle.classList.remove("loading");
    refs.timingsTitle.textContent = refs.timingsTitle.textContent?.replace(
      " (loading) ",
      "",
    );
  }
  for (const [timingName, timingValue] of Object.entries(state.timings)) {
    const timingStr = state.isCompiling ? "–" : `${timingValue.toFixed(2)} ms`;
    slots[timingName].textContent = timingStr;
  }

  // Adapter Info:
  slots.adapterInfo.textContent =
    `Vendor: ${state.adapterInfo.vendor} | Arch: ${state.adapterInfo.architecture}`;

  // Features:
  console.log("diagnostics-grid rendeR() - FEATURES", state.adapterFeatures);
  if (slots.features.childElementCount === 0) {
    const elements = state.adapterFeatures.map((feature) => {
      const a = document.createElement("a");

      a.classList.add("tag");
      switch (feature) {
        case "dual-source-blending":
        case "clip-distances":
          a.href =
            `https://www.w3.org/TR/webgpu/#dom-gpufeaturename-${feature}`;
          break;
        default:
          a.href = `https://www.w3.org/TR/webgpu/#${feature}`;
      }
      a.innerText = feature;
      return a;
    });
    slots.features.replaceChildren(...elements);
  }

  // Adapter Limits:
  if (slots.adapterLimits.childElementCount === 0) {
    slots.adapterLimits.replaceChildren(
      ...Object.entries(state.limits.adapter).map(limitElement),
    );
  }
  // Device Limits:
  if (slots.deviceLimits.childElementCount === 0) {
    slots.deviceLimits.replaceChildren(
      ...Object.entries(state.limits.device).map(limitElement),
    );
  }
}

function limitElement([name, value]) {
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
