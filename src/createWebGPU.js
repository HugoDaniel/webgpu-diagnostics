/** @typedef {import("./types").UIState} UIState */
import { webgpuInit } from "./webgpuInit.js";
import { createComputeAndRenderPipeline } from "./createComputeAndRenderPipeline.js";
import { runtimeAttribute } from "./runtimeAttribute.js";

/**
 * @param {unknown} scope
 */
const normalizeScope = (scope) => {
  if (!scope) return "";
  const text = String(scope);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * @param {unknown} scope
 * @param {unknown} error
 */
const formatError = (scope, error) => {
  const normalizedScope = normalizeScope(scope);
  const prefix = normalizedScope ? `[${normalizedScope}] ` : "";
  if (error instanceof Error) return `${prefix}${error.message}`;
  if (typeof error === "string") return `${prefix}${error}`;
  try {
    return `${prefix}${JSON.stringify(error)}`;
  } catch (_) {
    return `${prefix}Unknown error`;
  }
};

/**
 * @param {UIState} mutable
 * @param {HTMLCanvasElement} canvas
 */
export async function createWebGPU(mutable, canvas) {
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("Could not get WebGPU context from canvas.");
  }

  const runtimeState = mutable[runtimeAttribute];
  if (runtimeState.animationFrameId !== undefined) {
    cancelAnimationFrame(runtimeState.animationFrameId);
    runtimeState.animationFrameId = undefined;
  }

  const { adapterInfo } = await webgpuInit(mutable);
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  const device = runtimeState.device;
  if (!device) {
    throw new Error("GPU device is not available after initialization");
  }

  context.configure({
    device,
    format: canvasFormat,
  });

  runtimeState.context = context;
  // Set the webgpu as green:
  mutable.isWebGPUSupported = true;

  if (adapterInfo) {
    mutable.adapterInfo.architecture = String(adapterInfo.architecture);
    mutable.adapterInfo.vendor = String(adapterInfo.vendor);
  } else {
    mutable.adapterInfo.architecture = "-";
    mutable.adapterInfo.vendor = "-";
  }

  if (
    mutable.shaders.compute.length === 0 ||
    mutable.shaders.vertex.length === 0 ||
    mutable.shaders.fragment.length === 0
  ) {
    await mutable.updateTmpShaders(true); // true means update all!
  }

  // Create the pipelines
  /** @type {Awaited<ReturnType<typeof createComputeAndRenderPipeline>> | undefined} */
  let pipelines;
  try {
    const pipelineContext = runtimeState.context;
    if (!pipelineContext) {
      throw new Error("WebGPU context is not available");
    }
    pipelines = await createComputeAndRenderPipeline(
      device,
      pipelineContext,
      canvasFormat,
      mutable.shaders.compute,
      mutable.shaders.vertex,
      mutable.shaders.fragment,
    );
  } catch (error) {
    const message = formatError("pipeline", error);
    console.error("Failed to create WebGPU pipelines", error);
    if (!mutable.errors.pipeline.includes(message)) {
      mutable.errors.pipeline.push(message);
    }
    return;
  }

  if (!pipelines) {
    return;
  }

  // Update the timings:
  for (const [name, value] of /** @type {Array<[keyof UIState["timings"], number]>} */ (Object.entries(pipelines.timings))) {
    mutable.timings[name] = value;
  }

  const diagnostics = pipelines.diagnostics?.compilation;
  if (diagnostics) {
    const compilationErrors = mutable.errors.compilation;
    const compilationWarnings = mutable.warnings.compilation;
    compilationErrors.length = 0;
    compilationWarnings.length = 0;
    for (const [stage, report] of Object.entries(diagnostics)) {
      report.errors?.forEach((message) => {
        compilationErrors.push(`[${stage}] ${message}`);
      });
      report.warnings?.forEach((message) => {
        compilationWarnings.push(`[${stage}] ${message}`);
      });
    }
    if (compilationErrors.length > 0) {
      console.error("Shader compilation errors", [...compilationErrors]);
    }
    if (compilationWarnings.length > 0) {
      console.warn("Shader compilation warnings", [...compilationWarnings]);
    }
  } else {
    mutable.errors.compilation.length = 0;
    mutable.warnings.compilation.length = 0;
  }

  mutable.errors.pipeline.length = 0;

  const frame = () => {
    pipelines.render();
    runtimeState.animationFrameId = requestAnimationFrame(frame);
  };

  frame();
}
