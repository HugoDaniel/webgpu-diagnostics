// @ts-check
/**
 * Helper function to extract all limits
 * @param {GPUSupportedLimits} supportedLimits
 * @returns {Partial<GPUSupportedLimits>}
 */
export function extractLimits(supportedLimits) {
  /** @type {(keyof GPUSupportedLimits)[]} */
  const limitProperties = [
    // Texture limits
    "maxTextureDimension1D",
    "maxTextureDimension2D",
    "maxTextureDimension3D",
    "maxTextureArrayLayers",
    // Binding limits
    "maxBindGroups",
    "maxBindGroupsPlusVertexBuffers",
    "maxBindingsPerBindGroup",
    "maxDynamicUniformBuffersPerPipelineLayout",
    "maxDynamicStorageBuffersPerPipelineLayout",
    "maxSampledTexturesPerShaderStage",
    "maxSamplersPerShaderStage",
    "maxStorageBuffersPerShaderStage",
    "maxStorageTexturesPerShaderStage",
    "maxUniformBuffersPerShaderStage",
    // Buffer limits
    "maxUniformBufferBindingSize",
    "maxStorageBufferBindingSize",
    "maxBufferSize",
    // Vertex limits
    "maxVertexBuffers",
    "maxVertexAttributes",
    "maxVertexBufferArrayStride",
    // "maxInterStageShaderComponents",
    "maxInterStageShaderVariables",
    // Compute limits
    "maxComputeWorkgroupStorageSize",
    "maxComputeInvocationsPerWorkgroup",
    "maxComputeWorkgroupSizeX",
    "maxComputeWorkgroupSizeY",
    "maxComputeWorkgroupSizeZ",
    "maxComputeWorkgroupsPerDimension",
    // Render limits
    "maxColorAttachments",
    "maxColorAttachmentBytesPerSample",
    // Alignment limits
    "minUniformBufferOffsetAlignment",
    "minStorageBufferOffsetAlignment",
  ];

  /** @type {Partial<GPUSupportedLimits>} */
  const limits = {};

  for (const prop of limitProperties) {
    if (supportedLimits[prop] !== undefined) {
      // @ts-expect-error
      limits[prop] = supportedLimits[prop];
    }
  }

  return limits;
}
