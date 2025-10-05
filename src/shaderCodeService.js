import { getComputeShader } from "./getComputeShader.js";
import { getFragmentShader } from "./getFragmentShader.js";
import { getVertexShader } from "./getVertexShader.js";

let workerInstance;
let requestId = 0;
const pending = new Map();

const MAX_SHADER_LENGTH = Number.MAX_SAFE_INTEGER;
const WORKER_SUPPORTED = typeof Worker === "function";
let workerDisabled = !WORKER_SUPPORTED;

const FALLBACK_WORKER_ERROR = "Shader worker error";

const toError = (err, fallbackMessage = FALLBACK_WORKER_ERROR) => {
  if (err instanceof Error) return err;
  if (typeof err === "string") return new Error(err);

  if (err && typeof err === "object") {
    const maybeError = err.error;
    if (maybeError !== undefined) {
      const nested = toError(maybeError, fallbackMessage);
      if (nested.message) return nested;
    }

    if (typeof err.message === "string") {
      return err.message.length > 0
        ? new Error(err.message)
        : new Error(fallbackMessage);
    }

    if (typeof err.reason === "string" && err.reason.length > 0) {
      return new Error(err.reason);
    }

    if (typeof err.type === "string") {
      const locationParts = [];
      if (typeof err.filename === "string" && err.filename.length > 0) {
        const lineInfo = [err.lineno, err.colno]
          .filter((value) => Number.isFinite(value))
          .join(":");
        locationParts.push(`${err.filename}${lineInfo ? `:${lineInfo}` : ""}`);
      }
      const location = locationParts.length > 0 ? ` (${locationParts.join(", ")})` : "";
      return new Error(`${fallbackMessage}: ${err.type}${location}`);
    }
  }

  try {
    return new Error(JSON.stringify(err));
  } catch (_) {
    return new Error(fallbackMessage);
  }
};

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

const runLocally = (type, payload) => {
  switch (type) {
    case "generate-all": {
      const { configs } = payload ?? {};
      const compute = getComputeShader(configs?.compute);
      ensureWithinLimits("Compute", compute, configs?.compute);
      const vertex = getVertexShader(configs?.vertex);
      ensureWithinLimits("Vertex", vertex, configs?.vertex);
      const fragment = getFragmentShader(configs?.fragment);
      ensureWithinLimits("Fragment", fragment, configs?.fragment);
      return {
        compute,
        vertex,
        fragment,
      };
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
      return code;
    }
    default:
      throw new Error(`Unknown shader worker command: ${type}`);
  }
};

const runLocallyAsync = (type, payload) => Promise.resolve().then(() => runLocally(type, payload));

const disableWorker = (cause, additionalEntry) => {
  workerInstance?.terminate?.();
  workerInstance = undefined;
  workerDisabled = true;

  const entries = [...pending.values()];
  pending.clear();
  if (additionalEntry) entries.push(additionalEntry);
  if (entries.length === 0) {
    if (cause) console.error(FALLBACK_WORKER_ERROR, cause);
    return;
  }

  for (const entry of entries) {
    runLocallyAsync(entry.type, entry.payload)
      .then(entry.resolve)
      .catch((error) => {
        const normalised = error instanceof Error ? error : toError(error);
        entry.reject(normalised);
      });
  }

  if (cause) console.error(FALLBACK_WORKER_ERROR, cause);
};

function getWorker() {
  if (workerDisabled) return undefined;
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL("./shaderWorker.js", import.meta.url), {
        type: "module",
      });
    } catch (error) {
      const err = toError(error, "Failed to start shader worker");
      disableWorker(err);
      return undefined;
    }

    workerInstance.onmessage = (event) => {
      const { id, ok, result, error } = event.data ?? {};
      if (typeof id !== "number") return;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (ok) {
        entry.resolve(result);
      } else {
        entry.reject(toError(error));
      }
    };

    workerInstance.onerror = (event) => {
      const err = toError(event);
      disableWorker(err);
    };
    workerInstance.onmessageerror = (event) => {
      const err = toError(event, "Shader worker message error");
      disableWorker(err);
    };
  }
  return workerInstance;
}

function postToWorker(type, payload) {
  if (workerDisabled) {
    return runLocallyAsync(type, payload);
  }

  const worker = getWorker();
  if (!worker) {
    return runLocallyAsync(type, payload);
  }

  const id = ++requestId;
  return new Promise((resolve, reject) => {
    let messagePayload = payload;
    try {
      if (typeof structuredClone === "function") {
        messagePayload = structuredClone(payload);
      } else {
        messagePayload = JSON.parse(JSON.stringify(payload));
      }
    } catch (error) {
      console.warn("Falling back to original payload for worker message", error);
    }

    const entry = { resolve, reject, type, payload: messagePayload };
    pending.set(id, entry);

    try {
      worker.postMessage({ id, type, payload: messagePayload });
    } catch (error) {
      pending.delete(id);
      disableWorker(toError(error, "Failed to post message to shader worker"), entry);
    }
  });
}

export function generateAllShaders(configs) {
  return postToWorker("generate-all", { configs });
}

export function generateShader(shader, config) {
  return postToWorker("generate-one", { shader, config });
}
