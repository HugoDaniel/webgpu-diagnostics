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
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("Could not get WebGPU context from canvas.");
  }

  const { adapterInfo } = await webgpuInit(mutable);
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

  if (
    mutable.shaders.compute.length === 0 ||
    mutable.shaders.vertex.length === 0 ||
    mutable.shaders.fragment.length === 0
  ) {
    mutable.updateTmpShaders(true); // true means update all!
  }

  // Create the pipelines
  await createComputeAndRenderPipeline(
    mutable[runtimeAttribute].device,
    mutable[runtimeAttribute].context,
    canvasFormat,
    mutable.shaders.compute,
    mutable.shaders.vertex,
    mutable.shaders.fragment,
  ).then((pipelines) => {
    // Update the timings:
    for (const k in pipelines.timings) {
      mutable.timings[k] = pipelines.timings[k];
    }
    pipelines.render();
  });
}
