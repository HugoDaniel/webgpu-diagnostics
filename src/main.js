/** @typedef {import("./types.ts").UIState} UIState */
/** @typedef {import("boredom").inflictBoreDOM<UIState>} */
import { inflictBoreDOM } from "../boreDOM.js";
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
  adapterInfo: {
    architecture: "-",
    vendor: "-",
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
    },
    vertex: {
      numberOfFunctions: 0,
      statementsPerFunction: 0,
      expressionDepthPerStatement: 0,
    },
    fragment: {
      numberOfFunctions: 0,
      statementsPerFunction: 0,
      expressionDepthPerStatement: 0,
    },
  },
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
    // @ts-expect-error
    canvas: undefined,
  },
};

window.addEventListener("DOMContentLoaded", async () => {
  const uiState = await inflictBoreDOM(initialUIState);
  console.log("ui state: ", JSON.parse(JSON.stringify(uiState)));
});
