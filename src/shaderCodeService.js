let workerInstance;
let requestId = 0;
const pending = new Map();

function getWorker() {
  if (!workerInstance) {
    workerInstance = new Worker(new URL("./shaderWorker.js", import.meta.url), {
      type: "module",
    });

    const toError = (err) => {
      if (err instanceof Error) return err;
      if (typeof err === "string") return new Error(err);
      if (err && typeof err.message === "string") return new Error(err.message);
      try {
        return new Error(JSON.stringify(err));
      } catch (_) {
        return new Error("Unknown shader worker error");
      }
    };

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
      console.error("Shader worker error", err);
      workerInstance?.terminate();
      workerInstance = undefined;
      // Reject all pending requests
      for (const [, entry] of pending.entries()) {
        entry.reject(err);
      }
      pending.clear();
    };
  }
  return workerInstance;
}

function postToWorker(type, payload) {
  const worker = getWorker();
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
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
    try {
      worker.postMessage({ id, type, payload: messagePayload });
    } catch (error) {
      pending.delete(id);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export function generateAllShaders(configs) {
  return postToWorker("generate-all", { configs });
}

export function generateShader(shader, config) {
  return postToWorker("generate-one", { shader, config });
}
