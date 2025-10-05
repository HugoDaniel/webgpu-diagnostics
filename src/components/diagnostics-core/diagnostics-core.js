// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").InitFunction<UIState | undefined>} InitFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";
import { runtimeAttribute } from "../../runtimeAttribute.js";
import { createWebGPU } from "../../createWebGPU.js";
import { extractLimits } from "../../extractLimits.js";

export const DiagnosticsCore = webComponent(
  /** @type InitFunction */
  ({ on, refs }) => {
    // On mount initialization goes here
    on("canvasReady", async ({ state: mutable }) => {
      if (!mutable) {
        console.warn("canvas is ready but state is not available");
        return;
      }

      // Set the canvas information string:
      const canvas = refs.canvas;
      if (!(canvas instanceof HTMLCanvasElement)) {
        console.warn("Canvas reference must be a valid HTMLCanvasElement");
        return;
      }

      if (!mutable.isCompiling) {
        mutable.isCompiling = true;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      const w = canvas.width;
      const h = canvas.height;
      const info = `CSS: ${Math.floor(rect.width)}×${
        Math.floor(rect.height)
      }px | Canvas: ${w}×${h}px | DPR: ${dpr}`;

      mutable.canvasInfo = info;
      mutable[runtimeAttribute].canvas = canvas;

      try {
        await createWebGPU(mutable, canvas);
      } finally {
        mutable.isCompiling = false;
      }

      const adapter = mutable[runtimeAttribute].adapter;
      const adapterLimits = extractLimits(adapter.limits);
      const adapterLimitsState = mutable.limits.adapter;
      for (const key of Object.keys(adapterLimitsState)) {
        const limitKey = /** @type {keyof GPUSupportedLimits} */ (key);
        // Remove stale values so the UI reflects the freshly extracted limits
        delete adapterLimitsState[limitKey];
      }
      Object.assign(adapterLimitsState, adapterLimits);
      const features = [...adapter.features].sort((a, b) => a.localeCompare(b));
      mutable.adapterFeatures.length = 0;
      mutable.adapterFeatures.push(...features);
    });

    on("ui:fill-select", ({ e, state }) => {
      if (state) {
        state.selected = e.index;
      }
    });

    return renderCore;
  },
);

/**
 * @param {WebComponentRenderParams} params
 */
function renderCore(params) {
  const { state, self } = params;

  if (
    state[runtimeAttribute].adapter === undefined ||
    state[runtimeAttribute].device === undefined
  ) {
    // Send the "canvasReady" event to start initialization
    if (!self.__canvasInitQueued) {
      /** @type {any} */ (self).__canvasInitQueued = true;
      queueMicrotask(() => {
        dispatchEvent(
          new CustomEvent("canvasReady", {
            detail: { event: { currentTarget: self } },
          }),
        );
      });
    }
  }

  // Update the slots:
  // updatePanelFooterSlot(params);
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
