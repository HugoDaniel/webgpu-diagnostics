import { generate } from "./generator.js";

export function getVertexShader(
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

${functions}

struct VertexOutput {
    @builtin(position) clip_position: vec4f,
    @location(0) color: vec3f,
}

@group(0) @binding(0) var<storage, read> vertex_buffer: array<Vertex, 3>;

@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    ${application}

    var output: VertexOutput;
    let vertex = vertex_buffer[vertex_index];
    output.clip_position = vec4f(vertex.position, 1.0); //  + accum - accum * 1.0);
    output.color = vertex.color;
    return output;
}
`;

  return shader;
}
