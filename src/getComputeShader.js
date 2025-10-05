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

struct Params {
    angle: f32,
}

// Storage buffer that will hold our generated vertices
@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex, 3>;
@group(0) @binding(1) var<uniform> params: Params;

${functions}

// Compute shader that generates a triangle's vertices
@compute @workgroup_size(1)
fn compute_main(@builtin(global_invocation_id) global_id: vec3u) {
  ${application}

  // Generate 3 vertices for a triangle
  // We only need one invocation for this simple example
  if (global_id.x == 0) {
      let angle = params.angle + accum * 0.0001;
      let cos_angle = cos(angle);
      let sin_angle = sin(angle);
      let base_positions = array<vec2f, 3>(
          vec2f(0.0, 0.5),
          vec2f(-0.5, -0.8),
          vec2f(0.5, -0.5)
      );

      let top = vec2f(
          base_positions[0].x * cos_angle - base_positions[0].y * sin_angle,
          base_positions[0].x * sin_angle + base_positions[0].y * cos_angle,
      );
      let left = vec2f(
          base_positions[1].x * cos_angle - base_positions[1].y * sin_angle,
          base_positions[1].x * sin_angle + base_positions[1].y * cos_angle,
      );
      let right = vec2f(
          base_positions[2].x * cos_angle - base_positions[2].y * sin_angle,
          base_positions[2].x * sin_angle + base_positions[2].y * cos_angle,
      );

      let depth = clamp(accum * 0.001, -0.5, 0.5);

      // Top vertex (red)
      vertices[0].position = vec3f(top, depth);
      vertices[0].color = vec3f(1.0, 0.0, 0.0);
      
      // Bottom-left vertex (green)
      vertices[1].position = vec3f(left, depth);
      vertices[1].color = vec3f(0.0, 1.0, 0.0);
      
      // Bottom-right vertex (blue)
      vertices[2].position = vec3f(right, depth);
      vertices[2].color = vec3f(0.0, 0.0, 1.0);
  }
}
  `;

  return shader;
}
