/** @typedef {import("./types.ts").UIState} UIState */
/** @typedef {import("boredom").inflictBoreDOM<UIState>} */
import { inflictBoreDOM } from "boredom";
import { runtimeAttribute } from "./runtimeAttribute.js";
import { generateAllShaders, generateShader } from "./shaderCodeService.js";

function normalizeScope(scope) {
  if (!scope) return "";
  const asString = String(scope);
  if (asString.length === 0) return "";
  return asString.charAt(0).toUpperCase() + asString.slice(1);
}

function formatErrorMessage(error, scope) {
  const normalizedScope = normalizeScope(scope);
  const prefix = normalizedScope ? `[${normalizedScope}] ` : "";
  if (error instanceof Error) return `${prefix}${error.message}`;
  if (typeof error === "string") return `${prefix}${error}`;
  try {
    return `${prefix}${JSON.stringify(error)}`;
  } catch (_) {
    return `${prefix}Unknown error`;
  }
}

/** @type UIState */
const initialUIState = {
  colors: ["#ff00ff", "#ffad00", "#3366EE"],
  selected: 0,
  //
  isWebGPUSupported: Boolean(navigator.gpu),
  timings: {
    adapterRequest: 0,
    deviceRequest: 0,
    renderPipelineCreation: 0,
    computePipelineCreation: 0,
    computeShaderCompilation: 0,
    vertexShaderCompilation: 0,
    fragmentShaderCompilation: 0,
  },
  adapterInfo: {
    architecture: "-",
    vendor: "-",
  },
  shaders: {
    compute: "",
    vertex: "",
    fragment: "",
  },
  adapterFeatures: [],
  limits: {
    adapter: {},
    device: {},
  },
  canvasInfo: "-",
  shaderConfig: {
    compute: {
      numberOfFunctions: 0,
      statementsPerFunction: 0,
      expressionDepthPerStatement: 0,
      size: 0,
    },
    vertex: {
      numberOfFunctions: 0,
      statementsPerFunction: 0,
      expressionDepthPerStatement: 0,
      size: 0,
    },
    fragment: {
      numberOfFunctions: 0,
      statementsPerFunction: 0,
      expressionDepthPerStatement: 0,
      size: 0,
    },
  },
  selectedShader: "compute",
  isCompiling: false,
  showShaderCode: false,
  errors: {
    adapter: [],
    device: [],
    shader: [],
    pipeline: [],
    compilation: [],
  },
  warnings: {
    compilation: [],
  },

  /**
   * @param {boolean} all
   */
  async updateTmpShaders(all, shaderOverride) {
    const shaderErrors = this.errors.shader;

    const clearShaderError = (shaderName) => {
      if (!Array.isArray(shaderErrors) || shaderErrors.length === 0) return;
      const scopeLabel = normalizeScope(shaderName);
      if (!scopeLabel) return;
      const prefix = `[${scopeLabel}]`;
      const remaining = shaderErrors.filter((msg) => !msg.startsWith(prefix));
      if (remaining.length !== shaderErrors.length) {
        shaderErrors.length = 0;
        shaderErrors.push(...remaining);
      }
    };

    const captureShaderError = (shaderName, error) => {
      const message = formatErrorMessage(error, shaderName);
      clearShaderError(shaderName);
      shaderErrors.push(message);
    };

    try {
      if (all) {
        const configs = {
          compute: { ...this.shaderConfig.compute },
          vertex: { ...this.shaderConfig.vertex },
          fragment: { ...this.shaderConfig.fragment },
        };
        const { compute, vertex, fragment } = await generateAllShaders(configs);
        shaderErrors.length = 0;
        this.shaders.compute = compute;
        this.shaders.vertex = vertex;
        this.shaders.fragment = fragment;
        return;
      }

      const shader = shaderOverride ?? this.selectedShader;
      clearShaderError(shader);
      const code = await generateShader(shader, {
        ...this.shaderConfig[shader],
      });
      this.shaders[shader] = code;
    } catch (error) {
      const shader = shaderOverride ?? (all ? "all" : this.selectedShader);
      captureShaderError(shader, error);
      throw error;
    }
  },
  [runtimeAttribute]: {
    // @ts-expect-error
    adapter: undefined,
    // @ts-expect-error
    device: undefined,
    // @ts-expect-error
    context: undefined,
    // @ts-expect-error
    canvas: undefined,
  },
};

window.addEventListener("DOMContentLoaded", async () => {
  const uiState = await inflictBoreDOM(initialUIState);
  console.log("ui state: ", JSON.parse(JSON.stringify(uiState)));
});
