import { runtimeAttribute } from "./runtimeAttribute";

export type UIState = {
  colors: string[];
  selected: number;
  // WebGPU Diagnostics
  isWebGPUSupported: undefined | boolean; // undefined happens when still loading
  isCompiling: boolean;
  timings: {
    adapterRequest: number;
    deviceRequest: number;
    renderPipelineCreation: number;
    computePipelineCreation: number;
    computeShaderCompilation: number;
    vertexShaderCompilation: number;
    fragmentShaderCompilation: number;
  };
  adapterInfo: {
    architecture: string;
    vendor: string;
  };
  adapterFeatures: string[];
  canvasInfo: string;
  limits: {
    adapter: Partial<GPUSupportedLimits>;
    device: Partial<GPUSupportedLimits>;
  };
  shaders: {
    compute: string;
    vertex: string;
    fragment: string;
  };
  shaderConfig: {
    compute: ShaderConfig;
    vertex: ShaderConfig;
    fragment: ShaderConfig;
  };
  selectedShader: "compute" | "vertex" | "fragment";
  showShaderCode: boolean;
  [runtimeAttribute]: {
    adapter?: GPUAdapter;
    device?: GPUDevice;
    context?: GPUCanvasContext;
    canvas?: HTMLCanvasElement;
    animationFrameId?: number;
  };
  features: {
    available: string[];
    unsupported: string[];
    additional: string[];
  };
  errors: {
    adapter: string[];
    device: string[];
    shader: string[];
    pipeline: string[];
    compilation: string[];
  };
  warnings: {
    compilation: string[];
  };
  updateTmpShaders: (all: boolean, shaderOverride?: "compute" | "vertex" | "fragment") => Promise<void>;
};

export type ShaderConfig = {
  numberOfFunctions: number;
  statementsPerFunction: number;
  expressionDepthPerStatement: number;
  size?: number;
};
