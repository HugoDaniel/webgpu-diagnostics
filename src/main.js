/** @typedef {import("./types.ts").UIState} UIState */
/** @typedef {import("boredom").inflictBoreDOM<UIState>} */
import { inflictBoreDOM } from "../boreDOM.js";
import { getComputeShader } from "./getComputeShader.js";
import { getFragmentShader } from "./getFragmentShader.js";
import { getVertexShader } from "./getVertexShader.js";
import { runtimeAttribute } from "./runtimeAttribute.js";

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
  limits: {
    adapter: {},
    device: {},
  },
  canvasInfo: "-",
  shaders: {
    compute: getComputeShader(),
    vertex: getVertexShader(),
    fragment: getFragmentShader(),
  },
  // @ts-expect-error
  features: undefined,
  errors: {
    adapter: [],
    device: [],
  },
  [runtimeAttribute]: {
    // @ts-expect-error
    adapter: undefined,
    // @ts-expect-error
    device: undefined,
    // @ts-expect-error
    context: undefined,
  },
};

window.addEventListener("DOMContentLoaded", async () => {
  const uiState = await inflictBoreDOM(initialUIState);
  console.log("ui state: ", JSON.parse(JSON.stringify(uiState)));
});
