// @ts-check
/** @typedef {import("./types.ts").UIState} UIState */
import { runtimeAttribute } from "./runtimeAttribute.js";
import { extractLimits } from "./extractLimits.js";

/**
 * Initialize WebGPU and surface adapter metadata.
 * @param {UIState} uiState
 * @returns {Promise<{ adapterInfo: GPUAdapterInfo | null }>}
 */
export async function webgpuInit(uiState) {
  /** @type {GPUAdapterInfo | null} */
  let adapterInfo = null;
  // Try to get the WebGPU adapter
  try {
    // 1. Request Adapter
    const adapterStart = performance.now();
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
      forceFallbackAdapter: false,
    }).catch((err) => {
      uiState.errors.adapter.push(
        err instanceof Error ? err.message : String(err),
      );
      throw new Error("Failed to request WebGPU adapter");
    });

    if (!adapter) {
      throw new Error("No appropriate GPUAdapter found");
    }
    uiState.timings.adapterRequest = performance.now() - adapterStart;
    uiState[runtimeAttribute].adapter = adapter;
    adapterInfo = adapter.info;
  } catch (err) {
    console.error(err);
    uiState.errors.adapter.push(
      err instanceof Error ? err.message : String(err),
    );
    throw new Error("Unknown error when requesting GPUAdapter");
  }

  // Try to get the WebGPU device
  try {
    const adapter = uiState[runtimeAttribute].adapter;
    // 2. Request Device with selected features
    const deviceStart = performance.now();

    const adapterLimits = uiState.limits.adapter;
    const device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {
        maxTextureDimension2D: Math.min(
          8192,
          adapterLimits.maxTextureDimension2D ?? 8192,
        ),
        maxBufferSize: Math.min(
          268435456,
          adapterLimits.maxBufferSize ?? 268435456,
        ),
        maxVertexBuffers: Math.min(8, adapterLimits.maxVertexBuffers ?? 8),
        maxVertexAttributes: Math.min(
          16,
          adapterLimits.maxVertexAttributes ?? 16,
        ),
      },
      label: "Main Device",
    }).catch((err) => {
      uiState.errors.device.push(
        err instanceof Error ? err.message : String(err),
      );
      throw new Error("Failed to create WebGPU device");
    });

    uiState.timings.deviceRequest = performance.now() - deviceStart;
    uiState[runtimeAttribute].device = device;
    const deviceLimits = extractLimits(device.limits);
    const deviceLimitsState = uiState.limits.device;
    for (const key of Object.keys(deviceLimitsState)) {
      const limitKey = /** @type {keyof GPUSupportedLimits} */ (key);
      delete deviceLimitsState[limitKey];
    }
    Object.assign(deviceLimitsState, deviceLimits);

    // Set up error handlers
    device.addEventListener("uncapturederror", (event) => {
      const error = event.error;

      uiState.errors.device.push(
        `${error.constructor.name}: ${error.message}`,
      );
    });

    device.lost.then((info) => {
      const reason = info.reason ?? "";
      if (reason === "destroyed") {
        return;
      }
      uiState.errors.device.push(
        `${normalizeReason(reason)}: ${info.message || "Device was lost"}`,
      );
    });
  } catch (err) {
    uiState.errors.device.push(
      err instanceof Error ? err.message : String(err),
    );
    console.log(err);
    throw new Error("Unknown error when requesting GPUDevice");
  }

  return { adapterInfo };
}

function normalizeReason(reason) {
  if (!reason) return "Device";
  if (reason === "unknown") return "Device";
  return reason.charAt(0).toUpperCase() + reason.slice(1);
}
