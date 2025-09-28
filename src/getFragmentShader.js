export function getFragmentShader() {
  const shader = `
	  @fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    // Output the interpolated color with full opacity
    return vec4f(input.color, 1.0);
}
	`;

  return shader;
}
