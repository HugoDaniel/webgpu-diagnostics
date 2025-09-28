// WebGPU Pipeline Setup with Correct Timestamp Query Implementation
class WebGPUPipelineTracker {
  constructor() {
    this.timings = {
      adapterRequest: 0,
      deviceRequest: 0,
      shaderCompilation: 0,
      pipelineCreation: 0,
      total: 0,
    };
    this.errors = [];
    this.warnings = [];
    this.adapterLimits = {};
    this.deviceLimits = {};
    this.errorScopes = [];
  }

  logTiming(phase, duration) {
    this.timings[phase] = duration;
    console.log(`⏱️ ${phase}: ${duration.toFixed(2)}ms`);
  }

  logError(phase, error, scope = null) {
    const errorInfo = {
      phase,
      message: error.message || error,
      timestamp: new Date().toISOString(),
      stack: error.stack,
      scope: scope,
      type: error.constructor?.name || typeof error,
    };
    this.errors.push(errorInfo);
    console.error(
      `❌ Error in ${phase}${scope ? ` (${scope} scope)` : ""}:`,
      error,
    );
  }

  logWarning(phase, warning) {
    this.warnings.push({ phase, warning });
    console.warn(`⚠️ Warning in ${phase}:`, warning);
  }

  logScopeError(scopeType, error) {
    this.errorScopes.push({
      type: scopeType,
      error: error,
      timestamp: new Date().toISOString(),
    });
  }

  setLimits(type, limits) {
    if (type === "adapter") {
      this.adapterLimits = limits;
    } else if (type === "device") {
      this.deviceLimits = limits;
    }
  }

  getSummary() {
    return {
      timings: this.timings,
      errors: this.errors,
      warnings: this.warnings,
      errorScopes: this.errorScopes,
      adapterLimits: this.adapterLimits,
      deviceLimits: this.deviceLimits,
      success: this.errors.length === 0 && this.errorScopes.length === 0,
    };
  }
}

// Helper class for managing error scopes
class ErrorScopeManager {
  constructor(device, tracker) {
    this.device = device;
    this.tracker = tracker;
  }

  async wrapWithErrorScope(operation, operationName) {
    // Push all three error scope types
    this.device.pushErrorScope("validation");
    this.device.pushErrorScope("out-of-memory");
    this.device.pushErrorScope("internal");

    let result;
    let operationError = null;

    try {
      result = await operation();
    } catch (err) {
      operationError = err;
      this.tracker.logError(operationName, err, "immediate");
    }

    // Pop error scopes in reverse order and check for errors
    const internalError = await this.device.popErrorScope();
    const oomError = await this.device.popErrorScope();
    const validationError = await this.device.popErrorScope();

    // Log any GPU errors that were captured
    if (validationError) {
      this.tracker.logError(
        operationName,
        validationError.message,
        "validation",
      );
      this.tracker.logScopeError("validation", {
        operation: operationName,
        message: validationError.message,
      });
      console.error(
        `📍 Validation Error in ${operationName}:`,
        validationError.message,
      );
    }

    if (oomError) {
      this.tracker.logError(operationName, oomError.message, "out-of-memory");
      this.tracker.logScopeError("out-of-memory", {
        operation: operationName,
        message: oomError.message,
      });
      console.error(
        `💾 Out of Memory Error in ${operationName}:`,
        oomError.message,
      );
    }

    if (internalError) {
      this.tracker.logError(operationName, internalError.message, "internal");
      this.tracker.logScopeError("internal", {
        operation: operationName,
        message: internalError.message,
      });
      console.error(
        `⚙️ Internal Error in ${operationName}:`,
        internalError.message,
      );
    }

    // If there was an immediate error, throw it
    if (operationError) {
      throw operationError;
    }

    // If there were GPU errors, throw an aggregate error
    const gpuErrors = [validationError, oomError, internalError].filter(
      Boolean,
    );
    if (gpuErrors.length > 0) {
      const errorMessages = gpuErrors.map((e) => e.message).join("; ");
      throw new Error(`GPU errors in ${operationName}: ${errorMessages}`);
    }

    return result;
  }

  async checkErrors(operation, operationName) {
    return this.wrapWithErrorScope(async () => {
      await operation();
      return null;
    }, operationName);
  }
}

// Helper function to extract all limits
function extractLimits(supportedLimits) {
  const limits = {};

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
    "maxInterStageShaderComponents",
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

  for (const prop of limitProperties) {
    if (supportedLimits[prop] !== undefined) {
      limits[prop] = supportedLimits[prop];
    }
  }

  return limits;
}

// Get all available features from the adapter
function getFeaturesList(adapter) {
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

  return { availableFeatures, unsupportedFeatures, additionalFeatures };
}

// Helper to read timestamp values from buffer
async function readTimestampBuffer(device, buffer, count) {
  const size = count * 8; // 8 bytes per timestamp
  const readBuffer = device.createBuffer({
    size,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    label: "Timestamp read buffer",
  });

  const commandEncoder = device.createCommandEncoder();
  commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
  device.queue.submit([commandEncoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const arrayBuffer = readBuffer.getMappedRange();
  const timestamps = new BigUint64Array(arrayBuffer);
  const values = Array.from(timestamps);
  readBuffer.unmap();
  readBuffer.destroy();

  return values;
}

export async function initWebGPUWithTracking(options = {}) {
  const tracker = new WebGPUPipelineTracker();
  const totalStart = performance.now();
  const { canvas: providedCanvas } = options ?? {};

  // Check WebGPU support
  if (!navigator.gpu) {
    tracker.logError(
      "initialization",
      new Error("WebGPU is not supported in this browser"),
    );
    return { tracker, success: false };
  }

  try {
    // 1. Request Adapter
    const adapterStart = performance.now();
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
      forceFallbackAdapter: false,
    }).catch((err) => {
      tracker.logError("adapter", err);
      throw new Error("Failed to request WebGPU adapter");
    });

    if (!adapter) {
      throw new Error("No appropriate GPUAdapter found");
    }
    tracker.logTiming("adapterRequest", performance.now() - adapterStart);

    // Access adapter info directly
    console.group("🎮 Adapter Information");
    if (adapter.info) {
      console.log("Vendor:", adapter.info.vendor || "Unknown");
      console.log("Architecture:", adapter.info.architecture || "Unknown");
      console.log("Device:", adapter.info.device || "Unknown");
      console.log("Description:", adapter.info.description || "Unknown");
      console.log("Driver:", adapter.info.driver || "Unknown");
      console.log("Backend:", adapter.info.backend || "Unknown");
      console.log("Type:", adapter.info.type || "Unknown");
    }
    console.log("Is Fallback:", adapter.isFallbackAdapter === true);
    console.groupEnd();

    // Get feature support
    const features = getFeaturesList(adapter);
    console.group("🔧 Feature Support");
    console.log("Available:", features.availableFeatures);
    if (features.additionalFeatures.length > 0) {
      console.log("Additional:", features.additionalFeatures);
    }
    console.log("Unsupported:", features.unsupportedFeatures);
    console.groupEnd();

    // Get adapter limits
    const adapterLimits = extractLimits(adapter.limits);
    tracker.setLimits("adapter", adapterLimits);

    // 2. Request Device with selected features
    const deviceStart = performance.now();

    const requiredFeatures = [];

    // Enable timestamp queries if available
    if (adapter.features.has("timestamp-query")) {
      requiredFeatures.push("timestamp-query");
      console.log("✅ Timestamp queries will be enabled");
    }

    // Check for timestamp inside passes (needed for render pass timestamps)
    if (adapter.features.has("timestamp-query-inside-passes")) {
      requiredFeatures.push("timestamp-query-inside-passes");
      console.log("✅ Timestamps inside passes will be enabled");
    }

    // Enable shader-f16 if available
    if (adapter.features.has("shader-f16")) {
      requiredFeatures.push("shader-f16");
    }

    const device = await adapter.requestDevice({
      requiredFeatures,
      requiredLimits: {
        maxTextureDimension2D: Math.min(
          8192,
          adapter.limits.maxTextureDimension2D,
        ),
        maxBufferSize: Math.min(268435456, adapter.limits.maxBufferSize),
        maxVertexBuffers: Math.min(8, adapter.limits.maxVertexBuffers),
        maxVertexAttributes: Math.min(16, adapter.limits.maxVertexAttributes),
      },
      label: "Main Device",
    }).catch((err) => {
      tracker.logError("device", err);
      throw new Error("Failed to create WebGPU device");
    });
    tracker.logTiming("deviceRequest", performance.now() - deviceStart);

    // Get device limits
    const deviceLimits = extractLimits(device.limits);
    tracker.setLimits("device", deviceLimits);

    console.log("✨ Device Features Enabled:", [...device.features]);

    // Create error scope manager
    const errorScope = new ErrorScopeManager(device, tracker);

    // Set up error handlers
    device.addEventListener("uncapturederror", (event) => {
      const error = event.error;
      tracker.logError("uncaptured", {
        message: error.message,
        type: error.constructor.name,
      });
    });

    device.lost.then((info) => {
      tracker.logError("device-lost", {
        message: info.message || "Device was lost",
        reason: info.reason,
      });
    });

    // 3. Create shaders
    const shaderStart = performance.now();

    const shaderCode = `
            ${requiredFeatures.includes("shader-f16") ? "enable f16;" : ""}
            
            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) color: vec3<f32>,
            };

            @vertex
            fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
                var output: VertexOutput;
                
                var positions = array<vec2<f32>, 3>(
                    vec2<f32>(-0.5, -0.5),
                    vec2<f32>(0.0, 0.5),
                    vec2<f32>(0.5, -0.5)
                );
                
                var colors = array<vec3<f32>, 3>(
                    vec3<f32>(1.0, 0.0, 0.0),
                    vec3<f32>(0.0, 1.0, 0.0),
                    vec3<f32>(0.0, 0.0, 1.0)
                );
                
                output.position = vec4<f32>(positions[vertex_index], 0.0, 1.0);
                output.color = colors[vertex_index];
                return output;
            }

            @fragment
            fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
                return vec4<f32>(input.color, 1.0);
            }
        `;

    const shaderModule = await errorScope.wrapWithErrorScope(async () => {
      const module = device.createShaderModule({
        label: "Triangle shader",
        code: shaderCode,
      });

      const compilationInfo = await module.getCompilationInfo();

      for (const message of compilationInfo.messages) {
        const logMessage = message.lineNum
          ? `Line ${message.lineNum}:${message.linePos} - ${message.message}`
          : message.message;

        switch (message.type) {
          case "error":
            tracker.logError("shader-compilation", logMessage);
            break;
          case "warning":
            tracker.logWarning("shader-compilation", logMessage);
            break;
          case "info":
            console.log("ℹ️ Shader:", logMessage);
            break;
        }
      }

      return module;
    }, "shader-creation");

    tracker.logTiming("shaderCompilation", performance.now() - shaderStart);

    // 4. Create render pipeline
    const pipelineStart = performance.now();

    const canvas = providedCanvas ?? document.createElement("canvas");
    if (!providedCanvas) {
      if (canvas.width === 0) canvas.width = 800;
      if (canvas.height === 0) canvas.height = 600;
      document.body.appendChild(canvas);
    }

    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to get WebGPU context from canvas");
    }

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    await errorScope.checkErrors(async () => {
      context.configure({
        device: device,
        format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        colorSpace: "srgb",
        alphaMode: "premultiplied",
      });
    }, "canvas-configuration");

    const pipeline = await errorScope.wrapWithErrorScope(async () => {
      return device.createRenderPipeline({
        label: "Main render pipeline",
        layout: "auto",
        vertex: {
          module: shaderModule,
          entryPoint: "vs_main",
          buffers: [],
        },
        fragment: {
          module: shaderModule,
          entryPoint: "fs_main",
          targets: [{
            format: canvasFormat,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
            writeMask: GPUColorWrite.ALL,
          }],
        },
        primitive: {
          topology: "triangle-list",
          frontFace: "ccw",
          cullMode: "back",
        },
        multisample: {
          count: 1,
          mask: 0xFFFFFFFF,
          alphaToCoverageEnabled: false,
        },
      });
    }, "pipeline-creation");

    tracker.logTiming("pipelineCreation", performance.now() - pipelineStart);

    // 5. Test render with proper timestamp queries
    console.group("🎨 Test Render with Timing");

    let gpuTiming = null;

    await errorScope.wrapWithErrorScope(async () => {
      const commandEncoder = device.createCommandEncoder({
        label: "Test render encoder",
      });

      const textureView = context.getCurrentTexture().createView();

      let renderPassDescriptor = {
        label: "Test render pass",
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0.1, g: 0.2, b: 0.3, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      };

      // Add timestamp queries if supported
      let querySet = null;
      let queryBuffer = null;

      if (device.features.has("timestamp-query")) {
        querySet = device.createQuerySet({
          type: "timestamp",
          count: 2,
          label: "Render pass timestamps",
        });

        queryBuffer = device.createBuffer({
          size: 16, // 2 timestamps × 8 bytes
          usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
          label: "Query buffer",
        });

        // Add timestamp writes to render pass descriptor
        renderPassDescriptor.timestampWrites = {
          querySet: querySet,
          beginningOfPassWriteIndex: 0,
          endOfPassWriteIndex: 1,
        };

        console.log("⏱️ Timestamp queries configured for render pass");
      }

      const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);

      // Add debug markers if available
      if (renderPass.pushDebugGroup) {
        renderPass.pushDebugGroup("Triangle rendering");
      }

      renderPass.setPipeline(pipeline);
      renderPass.draw(3, 1, 0, 0);

      if (renderPass.popDebugGroup) {
        renderPass.popDebugGroup();
      }

      renderPass.end();

      // Resolve timestamp queries
      if (querySet && queryBuffer) {
        commandEncoder.resolveQuerySet(
          querySet,
          0, // first query
          2, // count
          queryBuffer,
          0, // destination offset
        );
      }

      const commandBuffer = commandEncoder.finish();
      device.queue.submit([commandBuffer]);

      await device.queue.onSubmittedWorkDone();

      // Read timestamp values if available
      if (queryBuffer) {
        const timestamps = await readTimestampBuffer(device, queryBuffer, 2);
        const gpuDuration = Number(timestamps[1] - timestamps[0]) / 1000000; // Convert to ms
        gpuTiming = {
          start: timestamps[0],
          end: timestamps[1],
          duration: gpuDuration,
        };
        console.log(`⏱️ GPU Render Pass Duration: ${gpuDuration.toFixed(3)}ms`);

        // Cleanup
        querySet.destroy();
        queryBuffer.destroy();
      }

      console.log("✅ Test render completed");
    }, "test-render");

    console.groupEnd();

    // 6. Additional validation tests
    console.group("🧪 Validation Tests");

    // Test buffer creation with error scope
    await errorScope.wrapWithErrorScope(async () => {
      const testBuffer = device.createBuffer({
        size: 256,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        label: "Test vertex buffer",
      });
      console.log("✅ Valid buffer created");
      testBuffer.destroy();
    }, "valid-buffer-test");

    // Intentionally test an invalid operation to verify error catching
    await errorScope.wrapWithErrorScope(async () => {
      try {
        const invalidBuffer = device.createBuffer({
          size: 0, // Invalid: size must be > 0
          usage: GPUBufferUsage.VERTEX,
        });
      } catch (e) {
        console.log("✅ Invalid buffer error caught as expected");
      }
    }, "invalid-buffer-test").catch(() => {
      // Expected to fail
    });

    console.groupEnd();

    // Calculate total time
    tracker.logTiming("total", performance.now() - totalStart);

    // Final summary
    const summary = tracker.getSummary();

    console.group("📊 Final Summary");
    console.table({
      "Adapter Request": `${summary.timings.adapterRequest.toFixed(2)}ms`,
      "Device Creation": `${summary.timings.deviceRequest.toFixed(2)}ms`,
      "Shader Compilation": `${summary.timings.shaderCompilation.toFixed(2)}ms`,
      "Pipeline Creation": `${summary.timings.pipelineCreation.toFixed(2)}ms`,
      "Total Time": `${summary.timings.total.toFixed(2)}ms`,
      "GPU Render Time": gpuTiming
        ? `${gpuTiming.duration.toFixed(3)}ms`
        : "N/A",
    });
    console.log("Success:", summary.success);
    console.log("Errors:", summary.errors.length);
    console.log("Warnings:", summary.warnings.length);
    console.groupEnd();

    return {
      success: true,
      device,
      pipeline,
      context,
      canvas,
      canvasFormat,
      tracker,
      summary,
      errorScope,
      gpuTiming,
      features: {
        adapter: features.availableFeatures,
        device: [...device.features],
      },
      limits: {
        adapter: adapterLimits,
        device: deviceLimits,
      },
      info: adapter.info,
    };
  } catch (error) {
    tracker.logError("fatal", error);
    tracker.logTiming("total", performance.now() - totalStart);

    return {
      success: false,
      canvas: providedCanvas ?? null,
      context: undefined,
      tracker,
      summary: tracker.getSummary(),
      error,
    };
  }
}

// Test compute pipeline with timestamps
export async function testComputeWithTimestamps(device, errorScope) {
  if (!device.features.has("timestamp-query")) {
    console.log("⚠️ Timestamp queries not supported for compute test");
    return;
  }

  console.group("🔧 Testing Compute Pipeline with Timestamps");

  await errorScope.wrapWithErrorScope(async () => {
    // Simple compute shader
    const computeShader = device.createShaderModule({
      label: "Compute shader",
      code: `
                @group(0) @binding(0) var<storage, read_write> data: array<f32>;
                
                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if (id.x < arrayLength(&data)) {
                        data[id.x] = data[id.x] * 2.0;
                    }
                }
            `,
    });

    const computePipeline = device.createComputePipeline({
      label: "Compute pipeline",
      layout: "auto",
      compute: {
        module: computeShader,
        entryPoint: "main",
      },
    });

    // Create buffer
    const dataBuffer = device.createBuffer({
      size: 256 * 4, // 256 floats
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });

    // Create bind group
    const bindGroup = device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: dataBuffer },
      }],
    });

    // Create timestamp query set for compute
    const querySet = device.createQuerySet({
      type: "timestamp",
      count: 2,
    });

    const queryBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });

    // Record commands
    const commandEncoder = device.createCommandEncoder();

    const computePass = commandEncoder.beginComputePass({
      label: "Compute pass",
      timestampWrites: {
        querySet: querySet,
        beginningOfPassWriteIndex: 0,
        endOfPassWriteIndex: 1,
      },
    });

    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(4); // 256 / 64 = 4 workgroups
    computePass.end();

    commandEncoder.resolveQuerySet(querySet, 0, 2, queryBuffer, 0);

    device.queue.submit([commandEncoder.finish()]);
    await device.queue.onSubmittedWorkDone();

    // Read timestamps
    const timestamps = await readTimestampBuffer(device, queryBuffer, 2);
    const duration = Number(timestamps[1] - timestamps[0]) / 1000000;
    console.log(`⏱️ Compute Pass Duration: ${duration.toFixed(3)}ms`);

    // Cleanup
    dataBuffer.destroy();
    querySet.destroy();
    queryBuffer.destroy();
  }, "compute-pipeline-test");

  console.groupEnd();
}
