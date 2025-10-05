// @ts-check
/** @typedef {import("./types").ShaderConfig} ShaderConfig */

import { getComputeShader } from "./getComputeShader.js";
import { getFragmentShader } from "./getFragmentShader.js";
import { getVertexShader } from "./getVertexShader.js";

/** @typedef {"compute" | "vertex" | "fragment"} ShaderKind */
/** @typedef {{ compute: string; vertex: string; fragment: string }} ShaderBundle */
/** @typedef {{ configs?: Partial<Record<ShaderKind, ShaderConfig>> }} GenerateAllPayload */
/** @typedef {{ shader: ShaderKind; config?: ShaderConfig }} GenerateOnePayload */
/**
 * @typedef {Object} WorkerQueueEntry
 * @property {(value: ShaderBundle | string) => void} resolve
 * @property {(reason: Error) => void} reject
 * @property {"generate-all" | "generate-one"} type
 * @property {GenerateAllPayload | GenerateOnePayload} payload
 */

/** @type {Worker | undefined} */
let workerInstance;
let requestId = 0;
/** @type {Map<number, WorkerQueueEntry>} */
const pending = new Map();

const MAX_SHADER_LENGTH = Number.MAX_SAFE_INTEGER;
const WORKER_SUPPORTED = typeof Worker === "function";
let workerDisabled = !WORKER_SUPPORTED;

const FALLBACK_WORKER_ERROR = "Shader worker error";

/**
 * @param {unknown} err
 * @param {string} [fallbackMessage]
 * @returns {Error}
 */
const toError = (err, fallbackMessage = FALLBACK_WORKER_ERROR) => {
  if (err instanceof Error) return err;
  if (typeof err === "string") return new Error(err);

  if (err && typeof err === "object") {
    const errObj = /** @type {Record<string, unknown>} */ (err);

    if ("error" in errObj && errObj.error !== undefined) {
      const nested = toError(errObj.error, fallbackMessage);
      if (nested.message) return nested;
    }

    if (typeof errObj.message === "string") {
      return errObj.message.length > 0
        ? new Error(errObj.message)
        : new Error(fallbackMessage);
    }

    if (typeof errObj.reason === "string" && errObj.reason.length > 0) {
      return new Error(errObj.reason);
    }

    if (typeof errObj.type === "string") {
      const locationParts = [];
      if (typeof errObj.filename === "string" && errObj.filename.length > 0) {
        const lineInfo = [errObj.lineno, errObj.colno]
          .filter((value) => Number.isFinite(value))
          .join(":");
        locationParts.push(`${errObj.filename}${lineInfo ? `:${lineInfo}` : ""}`);
      }
      const location = locationParts.length > 0 ? ` (${locationParts.join(", ")})` : "";
      return new Error(`${fallbackMessage}: ${errObj.type}${location}`);
    }
  }

  try {
    return new Error(JSON.stringify(err));
  } catch (_) {
    return new Error(fallbackMessage);
  }
};

/**
 * @param {string} shaderName
 * @param {string} code
 * @param {ShaderConfig | undefined} config
 */
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
 * @param {"generate-all" | "generate-one"} type
 * @param {GenerateAllPayload | GenerateOnePayload} payload
 * @returns {ShaderBundle | string}
 */
const runLocally = (type, payload) => {
  switch (type) {
    case "generate-all": {
      const { configs } = /** @type {GenerateAllPayload} */ (payload ?? {});
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
      const { shader, config } = /** @type {GenerateOnePayload} */ (payload ?? {});
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

/**
 * @param {"generate-all" | "generate-one"} type
 * @param {GenerateAllPayload | GenerateOnePayload} payload
 * @returns {Promise<ShaderBundle | string>}
 */
const runLocallyAsync = (type, payload) => Promise.resolve().then(() => runLocally(type, payload));

/**
 * @param {Error=} cause
 * @param {WorkerQueueEntry=} additionalEntry
 */
const disableWorker = (cause, additionalEntry) => {
  workerInstance?.terminate?.();
  workerInstance = undefined;
  workerDisabled = true;

  const entries = /** @type {WorkerQueueEntry[]} */ ([...pending.values()]);
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

/**
 * @returns {Worker | undefined}
 */
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

    /** @type {(event: MessageEvent<{ id?: number; ok?: boolean; result?: unknown; error?: unknown }>) => void} */
    const handleMessage = (event) => {
      const { id, ok, result, error } = event.data ?? {};
      if (typeof id !== "number") return;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (ok) {
        entry.resolve(/** @type {ShaderBundle | string} */ (result));
      } else {
        entry.reject(toError(error));
      }
    };
    workerInstance.onmessage = handleMessage;

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

/**
 * @param {"generate-all" | "generate-one"} type
 * @param {GenerateAllPayload | GenerateOnePayload} payload
 * @returns {Promise<ShaderBundle | string>}
 */
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
    /** @type {GenerateAllPayload | GenerateOnePayload} */
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

    const entry = /** @type {WorkerQueueEntry} */ ({ resolve, reject, type, payload: messagePayload });
    pending.set(id, entry);

    try {
      worker.postMessage({ id, type, payload: messagePayload });
    } catch (error) {
      pending.delete(id);
      disableWorker(toError(error, "Failed to post message to shader worker"), entry);
    }
  });
}

/**
 * @param {Partial<Record<ShaderKind, ShaderConfig>> | undefined} configs
 * @returns {Promise<ShaderBundle>}
 */
export function generateAllShaders(configs) {
  return /** @type {Promise<ShaderBundle>} */ (postToWorker("generate-all", { configs }));
}

/**
 * @param {ShaderKind} shader
 * @param {ShaderConfig | undefined} config
 * @returns {Promise<string>}
 */
export function generateShader(shader, config) {
  return /** @type {Promise<string>} */ (postToWorker("generate-one", { shader, config }));
}
