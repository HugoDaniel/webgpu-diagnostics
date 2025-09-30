export function getFragmentShader() {
  const shader = `
struct VertexOutput {
    @builtin(position) clip_position: vec4f,
    @location(0) color: vec3f,
}

	  @fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    // Output the interpolated color with full opacity
    return vec4f(input.color, 1.0);
}
	`;

  return shader;
}
