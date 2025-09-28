// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").InitFunction<UIState | undefined>} InitFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";
import { runtimeAttribute } from "../../runtimeAttribute.js";
import { webgpuInit } from "../../webgpuInit.js";
import { createComputeAndRenderPipeline } from "../../createComputeAndRenderPipeline.js";
import { getComputeShader } from "../../getComputeShader.js";
import { getVertexShader } from "../../getVertexShader.js";
import { getFragmentShader } from "../../getFragmentShader.js";

export const DiagnosticsCore = webComponent(
  /** @type InitFunction */
  ({ on, refs }) => {
    // On mount initialization goes here
    on("canvasReady", ({ state: mutable }) => {
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

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      const w = canvas.width;
      const h = canvas.height;
      const info = `CSS: ${Math.floor(rect.width)}×${
        Math.floor(rect.height)
      }px | Canvas: ${w}×${h}px | DPR: ${dpr}`;

      mutable.canvasInfo = info;

      webgpuInit(mutable).then(() => {
        // const { width, height } = canvas.getBoundingClientRect();
        const context = canvas.getContext("webgpu");
        if (!context) {
          throw new Error("Could not get WebGPU context from canvas.");
        }

        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
          device: mutable[runtimeAttribute].device,
          format: canvasFormat,
        });

        mutable[runtimeAttribute].context = context;
        // Set the webgpu as green:
        mutable.isWebGPUSupported = true;

        // Create the pipelines
        createComputeAndRenderPipeline(
          mutable[runtimeAttribute].device,
          mutable[runtimeAttribute].context,
          canvasFormat,
          getComputeShader(),
          getVertexShader(),
          getFragmentShader(),
        ).then((pipelines) => {
          pipelines.render();
        });
      });
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
    dispatchEvent(
      new CustomEvent("canvasReady", {
        detail: { event: { currentTarget: self } },
      }),
    );
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
