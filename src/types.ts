import { runtimeAttribute } from "./runtimeAttribute";

export type UIState = {
  colors: string[];
  selected: number;
  // WebGPU Diagnostics
  isWebGPUSupported: undefined | boolean; // undefined happens when still loading
  timings: {
    adapterRequest: number;
    deviceRequest: number;
    renderPipelineCreation: number;
    computePipelineCreation: number;
    computeShaderCompilation: number;
    vertexShaderCompilation: number;
    fragmentShaderCompilation: number;
  };
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
  [runtimeAttribute]: {
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    init: (canvas: HTMLCanvasElement) => void;
  };
  features: {
    available: string[];
    unsupported: string[];
    additional: string[];
  };
  errors: {
    adapter: string[];
    device: string[];
  };
};
