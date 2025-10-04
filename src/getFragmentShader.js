import { generate } from "./generator.js";

export function getFragmentShader(
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
struct VertexOutput {
    @builtin(position) clip_position: vec4f,
    @location(0) color: vec3f,
}
${functions}

	  @fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    ${application}
    // Output the interpolated color with full opacity
    // return vec4f(input.color, accum);
    return vec4f(input.color, 1.0);
}
	`;

  return shader;
}
