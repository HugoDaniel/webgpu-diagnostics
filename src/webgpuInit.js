// @ts-check
import { runtimeAttribute } from "./runtimeAttribute.js";
import { getFeaturesList } from "./getFeatureList.js";
import { extractLimits } from "./extractLimits.js";

export async function webgpuInit(uiState) {
  console.log("STATE:", uiState);
  // Try to get the WebGPU adapter
  try {
    // 1. Request Adapter
    const adapterStart = performance.now();
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
      forceFallbackAdapter: false,
    }).catch((err) => {
      uiState.errors.adapter.push(err);
      throw new Error("Failed to request WebGPU adapter");
    });

    if (!adapter) {
      throw new Error("No appropriate GPUAdapter found");
    }
    uiState.timings.adapterRequest = performance.now() - adapterStart;
    uiState[runtimeAttribute].adapter = adapter;
    uiState[runtimeAttribute].features = getFeaturesList(adapter);
    uiState.limits.adapter = extractLimits(adapter.limits);
  } catch (err) {
    console.error(err);
    uiState.errors.adapter.push(err);
    throw new Error("Unknown error when requesting GPUAdapter");
  }

  // Try to get the WebGPU device
  try {
    const adapter = uiState[runtimeAttribute].adapter;
    // 2. Request Device with selected features
    const deviceStart = performance.now();
    console.log("LIMITS", uiState.limits.adapter, uiState);
    const device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {
        maxTextureDimension2D: Math.min(
          8192,
          uiState.limits.adapter.maxTextureDimension2D,
        ),
        maxBufferSize: Math.min(
          268435456,
          uiState.limits.adapter.maxBufferSize,
        ),
        maxVertexBuffers: Math.min(8, uiState.limits.adapter.maxVertexBuffers),
        maxVertexAttributes: Math.min(
          16,
          uiState.limits.adapter.maxVertexAttributes,
        ),
      },
      label: "Main Device",
    }).catch((err) => {
      uiState.errors.device.push(err);
      throw new Error("Failed to create WebGPU device");
    });

    uiState.timings.deviceRequest = performance.now() - deviceStart;
    uiState[runtimeAttribute].device = device;
    uiState.limits.device = extractLimits(device.limits);

    // Set up error handlers
    device.addEventListener("uncapturederror", (event) => {
      const error = event.error;

      uiState.errors.device.push({
        message: error.message,
        type: error.constructor.name,
      });
    });

    device.lost.then((info) => {
      uiState.errors.device.push(
        {
          message: info.message || "Device was lost",
          reason: info.reason,
        },
      );
    });
  } catch (err) {
    uiState.errors.device.push(err);
    console.log(err);
    throw new Error("Unknown error when requesting GPUDevice");
  }
}
