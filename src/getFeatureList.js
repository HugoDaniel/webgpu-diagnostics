// @ts-check
/**
 * Get all available features from the adapter
 *
 * @param {GPUAdapter} adapter
 */
export function getFeaturesList(adapter) {
  const allPossibleFeatures = [
    // Texture compression formats
    "texture-compression-bc",
    "texture-compression-bc-sliced-3d",
    "texture-compression-etc2",
    "texture-compression-astc",

    // Advanced features
    "timestamp-query",
    "timestamp-query-inside-passes", // For timestamp inside render passes
    "indirect-first-instance",
    "shader-f16",
    "rg11b10ufloat-renderable",
    "bgra8unorm-storage",
    "float32-filterable",

    // Depth/stencil features
    "depth-clip-control",
    "depth32float-stencil8",

    // Subgroups
    "subgroups",
    "subgroups-f16",

    // Other features
    "dual-source-blending",
    "clip-distances",
  ];

  const availableFeatures = [];
  const unsupportedFeatures = [];

  for (const feature of allPossibleFeatures) {
    if (adapter.features.has(feature)) {
      availableFeatures.push(feature);
    } else {
      unsupportedFeatures.push(feature);
    }
  }

  // Check for any additional features not in our list
  const additionalFeatures = [];
  for (const feature of adapter.features) {
    if (!allPossibleFeatures.includes(feature)) {
      additionalFeatures.push(feature);
    }
  }

  return {
    available: availableFeatures,
    unsupported: unsupportedFeatures,
    additional: additionalFeatures,
  };
}
