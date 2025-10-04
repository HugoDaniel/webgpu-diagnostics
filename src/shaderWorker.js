import { getComputeShader } from "./getComputeShader.js";
import { getVertexShader } from "./getVertexShader.js";
import { getFragmentShader } from "./getFragmentShader.js";

const MAX_SHADER_LENGTH = Number.MAX_SAFE_INTEGER;

const ensureWithinLimits = (shaderName, code, config) => {
  const limit = typeof config?.size === "number" && config.size > 0
    ? config.size
    : MAX_SHADER_LENGTH;
  if (code.length > limit) {
    throw new Error(
      `${shaderName} shader output is too large (${code.length} chars, limit ${limit})`,
    );
  }
};

/**
 * @param {MessageEvent} event
 */
self.onmessage = (event) => {
  const { id, type, payload } = event.data ?? {};
  const respond = (message) => self.postMessage({ id, ...message });

  try {
    switch (type) {
      case "generate-all": {
        const { configs } = payload ?? {};
        const compute = getComputeShader(configs?.compute);
        ensureWithinLimits("Compute", compute, configs?.compute);
        const vertex = getVertexShader(configs?.vertex);
        ensureWithinLimits("Vertex", vertex, configs?.vertex);
        const fragment = getFragmentShader(configs?.fragment);
        ensureWithinLimits("Fragment", fragment, configs?.fragment);
        respond({
          ok: true,
          result: {
            compute,
            vertex,
            fragment,
          },
        });
        break;
      }
      case "generate-one": {
        const { shader, config } = payload ?? {};
        let code = "";
        if (shader === "compute") code = getComputeShader(config);
        else if (shader === "vertex") code = getVertexShader(config);
        else if (shader === "fragment") code = getFragmentShader(config);
        else throw new Error(`Unsupported shader type: ${shader}`);
        const shaderName = typeof shader === "string"
          ? shader.charAt(0).toUpperCase() + shader.slice(1)
          : "Shader";
        ensureWithinLimits(shaderName, code, config);
        respond({ ok: true, result: code });
        break;
      }
      default:
        throw new Error(`Unknown shader worker command: ${type}`);
    }
  } catch (error) {
    respond({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
