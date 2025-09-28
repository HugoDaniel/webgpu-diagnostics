// @ts-check
/**
 * @param {GPUDevice} device
 * @param {GPUCanvasContext} context
 * @param {GPUTextureFormat} format
 * @param {string} computeShaderCode
 * @param {string} vertexShaderCode
 * @param {string} fragmentShaderCode
 */
export async function createComputeAndRenderPipeline(
  device,
  context,
  format,
  computeShaderCode,
  vertexShaderCode,
  fragmentShaderCode,
) {
  // ============================================
  // 1. Create shader modules
  // ============================================

  const computeShaderModule = device.createShaderModule({
    label: "Compute shader",
    code: computeShaderCode,
  });

  const renderShaderModule = device.createShaderModule({
    label: "Vertex and Fragment shaders",
    code: vertexShaderCode + "\n" + fragmentShaderCode,
  });

  // ============================================
  // 2. Create storage buffer for vertices
  // ============================================

  // Each vertex has: position (vec3f) + color (vec3f) = 6 floats = 24 bytes
  // 3 vertices total = 72 bytes
  const vertexBuffer = device.createBuffer({
    label: "Vertex storage buffer",
    size: Math.max(96, 3 * (3 * 4 + 3 * 4)), // 3 vertices * (12 bytes position + 12 bytes color)
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  // ============================================
  // 3. Create SEPARATE bind group layouts
  // ============================================

  // Compute pipeline bind group layout
  const computeBindGroupLayout = device.createBindGroupLayout({
    label: "Compute bind group layout",
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: "storage", // read-write storage buffer for compute
      },
    }],
  });

  // Render pipeline bind group layout (for vertex shader)
  const renderBindGroupLayout = device.createBindGroupLayout({
    label: "Render bind group layout",
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "read-only-storage", // read-only storage buffer for vertex shader
      },
    }],
  });

  // ============================================
  // 4. Create SEPARATE bind groups
  // ============================================

  const computeBindGroup = device.createBindGroup({
    label: "Compute bind group",
    layout: computeBindGroupLayout,
    entries: [{
      binding: 0,
      resource: {
        buffer: vertexBuffer,
      },
    }],
  });

  const renderBindGroup = device.createBindGroup({
    label: "Render bind group",
    layout: renderBindGroupLayout,
    entries: [{
      binding: 0,
      resource: {
        buffer: vertexBuffer,
      },
    }],
  });

  // ============================================
  // 5. Create compute pipeline
  // ============================================

  const computePipelineLayout = device.createPipelineLayout({
    label: "Compute pipeline layout",
    bindGroupLayouts: [computeBindGroupLayout],
  });

  const computePipeline = device.createComputePipeline({
    label: "Compute pipeline",
    layout: computePipelineLayout,
    compute: {
      module: computeShaderModule,
      entryPoint: "compute_main",
    },
  });

  // ============================================
  // 6. Create render pipeline
  // ============================================

  const renderPipelineLayout = device.createPipelineLayout({
    label: "Render pipeline layout",
    bindGroupLayouts: [renderBindGroupLayout],
  });

  const renderPipeline = device.createRenderPipeline({
    label: "Render pipeline",
    layout: renderPipelineLayout,
    vertex: {
      module: renderShaderModule,
      entryPoint: "vertex_main",
      // No vertex buffers needed - we read from storage buffer
      buffers: [],
    },
    fragment: {
      module: renderShaderModule,
      entryPoint: "fragment_main",
      targets: [{
        format: format,
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
      cullMode: "none",
    },
    // Optional: add depth testing if needed
    // depthStencil: {
    //     depthWriteEnabled: true,
    //     depthCompare: 'less',
    //     format: 'depth24plus',
    // },
  });

  // ============================================
  // 7. Create render pass descriptor
  // ============================================

  const renderPassDescriptor = {
    label: "Main render pass",
    colorAttachments: [{
      view: null, // Will be set each frame
      clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
      loadOp: "clear",
      storeOp: "store",
    }],
  };

  // ============================================
  // 8. Render function
  // ============================================

  function render() {
    // Get the current texture from the canvas context
    const currentTexture = context.getCurrentTexture();

    // Update the render pass descriptor with the current texture view
    renderPassDescriptor.colorAttachments[0].view = currentTexture.createView();

    // Create command encoder
    const commandEncoder = device.createCommandEncoder({
      label: "Main command encoder",
    });

    // ============================================
    // Step 1: Run compute pass to generate vertices
    // ============================================

    const computePass = commandEncoder.beginComputePass({
      label: "Compute pass",
    });
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, computeBindGroup); // Use compute bind group
    computePass.dispatchWorkgroups(1); // Only need 1 workgroup for 3 vertices
    computePass.end();

    // ============================================
    // Step 2: Run render pass to draw the triangle
    // ============================================

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup); // Use render bind group
    renderPass.draw(3); // Draw 3 vertices (one triangle)
    renderPass.end();

    // Submit the commands
    device.queue.submit([commandEncoder.finish()]);
  }

  // Return the render function and resources for external use
  return {
    render,
    device,
    context,
    computePipeline,
    renderPipeline,
    vertexBuffer,
    computeBindGroup,
    renderBindGroup,
  };
}
