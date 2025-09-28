export function getComputeShader() {
  const shader = `
    struct Vertex {
    position: vec3f,
    color: vec3f,
}

// Storage buffer that will hold our generated vertices
@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex, 3>;

// Compute shader that generates a triangle's vertices
@compute @workgroup_size(1)
fn compute_main(@builtin(global_invocation_id) global_id: vec3u) {
    // Generate 3 vertices for a triangle
    // We only need one invocation for this simple example
    if (global_id.x == 0) {
        // Top vertex (red)
        vertices[0].position = vec3f(0.0, 0.5, 0.0);
        vertices[0].color = vec3f(1.0, 0.0, 0.0);
        
        // Bottom-left vertex (green)
        vertices[1].position = vec3f(-0.5, -0.8, 0.0);
        vertices[1].color = vec3f(0.0, 1.0, 0.0);
        
        // Bottom-right vertex (blue)
        vertices[2].position = vec3f(0.5, -0.5, 0.0);
        vertices[2].color = vec3f(0.0, 0.0, 1.0);
    }
}
  `;

  return shader;
}
