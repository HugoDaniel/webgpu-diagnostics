/** @typedef {import("./types").UIState} UIState */
import { webgpuInit } from "./webgpuInit.js";
import { createComputeAndRenderPipeline } from "./createComputeAndRenderPipeline.js";
import { getComputeShader } from "./getComputeShader.js";
import { getVertexShader } from "./getVertexShader.js";
import { getFragmentShader } from "./getFragmentShader.js";
import { runtimeAttribute } from "./runtimeAttribute.js";

/**
 * @param {UIState} mutable
 * @param {HTMLCanvasElement} canvas
 */
export async function createWebGPU(mutable, canvas) {
  webgpuInit(mutable).then(({ adapterInfo }) => {
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

    mutable.adapterInfo.architecture = String(adapterInfo.architecture);
    mutable.adapterInfo.vendor = String(adapterInfo.vendor);

    // Create the pipelines
    createComputeAndRenderPipeline(
      mutable[runtimeAttribute].device,
      mutable[runtimeAttribute].context,
      canvasFormat,
      getComputeShader(),
      getVertexShader(),
      getFragmentShader(),
    ).then((pipelines) => {
      // Update the timings:
      for (const k in pipelines.timings) {
        mutable.timings[k] = pipelines.timings[k];
      }
      pipelines.render();
    });
  });
}
