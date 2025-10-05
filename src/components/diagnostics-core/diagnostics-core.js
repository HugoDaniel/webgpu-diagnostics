// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").InitFunction<UIState | undefined>} InitFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState | undefined>} WebComponentRenderParams */
import { webComponent } from "boredom";
import { runtimeAttribute } from "../../runtimeAttribute.js";
import { createWebGPU } from "../../createWebGPU.js";
import { extractLimits } from "../../extractLimits.js";

export const DiagnosticsCore = webComponent(
  /** @type InitFunction */
  ({ on, refs }) => {
    // On mount initialization goes here
    on("canvasReady", async ({ state: mutable }) => {
      if (!mutable) {
        console.warn("canvas is ready but state is not available");
        return;
      }

      // Set the canvas information string:
      const canvas = refs.canvas;
      const preview = refs.preview;
      const unsupported = refs.unsupported;
      if (!(canvas instanceof HTMLCanvasElement) ||
        !(preview instanceof HTMLElement) ||
        !(unsupported instanceof HTMLElement)) {
        console.warn("Canvas preview elements are missing or invalid");
        mutable.isWebGPUSupported = false;
        return;
      }

      /**
       * @param {boolean} flag
       */
      const setUnsupported = (flag) => {
        unsupported.hidden = !flag;
        unsupported.style.display = flag ? "flex" : "none";
        canvas.hidden = flag;
        canvas.style.display = flag ? "none" : "block";
        preview.classList.toggle("is-unsupported", flag);
      };

      if (!navigator.gpu) {
        mutable.isWebGPUSupported = false;
        setUnsupported(true);
        return;
      }

      setUnsupported(false);
      if (!mutable.isCompiling) {
        mutable.isCompiling = true;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = Math.max(1, Math.round(rect.width));
      const cssHeight = Math.max(1, Math.round(rect.height));
      const targetWidth = Math.max(1, cssWidth * dpr);
      const targetHeight = Math.max(1, cssHeight * dpr);

      if (canvas.width !== targetWidth) {
        canvas.width = targetWidth;
      }
      if (canvas.height !== targetHeight) {
        canvas.height = targetHeight;
      }

      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      const w = canvas.width;
      const h = canvas.height;
      const info = `CSS: ${Math.floor(rect.width)}×${
        Math.floor(rect.height)
      }px | Canvas: ${w}×${h}px | DPR: ${dpr}`;

      mutable.canvasInfo = info;
      const runtimeState = mutable[runtimeAttribute];
      runtimeState.canvas = canvas;

      try {
        await createWebGPU(mutable, canvas);
      } catch (error) {
        mutable.isWebGPUSupported = false;
        setUnsupported(true);
        console.error("Failed to initialise WebGPU", error);
        return;
      } finally {
        mutable.isCompiling = false;
      }

      mutable.isWebGPUSupported = true;
      setUnsupported(false);

      const adapter = runtimeState.adapter;
      if (!adapter) {
        console.warn("GPU adapter is not available after initialization");
        return;
      }
      const adapterLimits = extractLimits(adapter.limits);
      const adapterLimitsState = mutable.limits.adapter;
      for (const key of Object.keys(adapterLimitsState)) {
        const limitKey = /** @type {keyof GPUSupportedLimits} */ (key);
        // Remove stale values so the UI reflects the freshly extracted limits
        delete adapterLimitsState[limitKey];
      }
      Object.assign(adapterLimitsState, adapterLimits);
      const features = [...adapter.features].sort((a, b) => a.localeCompare(b));
      mutable.adapterFeatures.length = 0;
      mutable.adapterFeatures.push(...features);
    });

    on("ui:fill-select", ({ e, state }) => {
      if (state) {
        state.selected = e.index;
      }
    });

    return renderCore;
  },
);

/**
 * @param {WebComponentRenderParams} params
 */
function renderCore(params) {
  const { state, self } = params;

  if (!state) return;

  const runtimeState = state[runtimeAttribute];
  if (!runtimeState.adapter || !runtimeState.device) {
    // Send the "canvasReady" event to start initialization
    const extendedSelf = /** @type {{ __canvasInitQueued?: boolean }} */ (self);
    if (!extendedSelf.__canvasInitQueued) {
      extendedSelf.__canvasInitQueued = true;
      queueMicrotask(() => {
        dispatchEvent(
          new CustomEvent("canvasReady", {
            detail: { event: { currentTarget: self } },
          }),
        );
      });
    }
  }

  const unsupported = /** @type {HTMLElement | null} */ (self.querySelector('[data-ref="unsupported"]'));
  const canvas = /** @type {HTMLElement | null} */ (self.querySelector('[data-ref="canvas"]'));
  const preview = /** @type {HTMLElement | null} */ (self.querySelector('[data-ref="preview"]'));
  const isUnsupported = state.isWebGPUSupported === false;
  if (unsupported) {
    unsupported.hidden = !isUnsupported;
    unsupported.style.display = isUnsupported ? "flex" : "none";
  }
  if (canvas) {
    canvas.hidden = isUnsupported;
    canvas.style.display = isUnsupported ? "none" : "block";
  }
  preview?.classList.toggle("is-unsupported", isUnsupported);

  // Update the slots:
  // updatePanelFooterSlot(params);
}
