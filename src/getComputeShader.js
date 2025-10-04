import { generate } from "./generator.js";

export function getComputeShader(
  { numberOfFunctions, statementsPerFunction, expressionDepthPerStatement } = {
    numberOfFunctions: 0,
    statementsPerFunction: 0,
    expressionDepthPerStatement: 0,
  },
) {
  const { functions, application } = generate(
    numberOfFunctions,
    statementsPerFunction,
    expressionDepthPerStatement,
  );
  const shader = `
    struct Vertex {
    position: vec3f,
    color: vec3f,
}

// Storage buffer that will hold our generated vertices
@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex, 3>;

${functions}

// Compute shader that generates a triangle's vertices
@compute @workgroup_size(1)
fn compute_main(@builtin(global_invocation_id) global_id: vec3u) {
  ${application}

  // Generate 3 vertices for a triangle
  // We only need one invocation for this simple example
  if (global_id.x == 0) {
      // Top vertex (red)
      vertices[0].position = vec3f(0.0, 0.5, accum);
      vertices[0].color = vec3f(1.0, 0.0, 0.0);
      
      // Bottom-left vertex (green)
      vertices[1].position = vec3f(-0.5, -0.8, accum);
      vertices[1].color = vec3f(0.0, 1.0, 0.0);
      
      // Bottom-right vertex (blue)
      vertices[2].position = vec3f(0.5, -0.5, accum);
      vertices[2].color = vec3f(0.0, 0.0, 1.0);
  }
}
  `;

  return shader;
}
