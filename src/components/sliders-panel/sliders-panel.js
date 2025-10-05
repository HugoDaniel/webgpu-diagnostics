// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").InitFunction<UIState | undefined>} InitFunction */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState | undefined>} WebComponentRenderParams */
import { webComponent } from "boredom";

/** @typedef {"compute" | "vertex" | "fragment"} ShaderKind */

/**
 * @param {unknown} value
 * @returns {ShaderKind}
 */
function normalizeShaderKind(value) {
  if (value === "vertex" || value === "fragment") {
    return value;
  }
  return "compute";
}

export const SlidersPanel = webComponent(
  /** @type InitFunction */
  ({ on }) => {
    const DEBOUNCE_MS = 150;
    /** @type {Map<"compute" | "vertex" | "fragment", ReturnType<typeof setTimeout>>} */
    const debounceTimers = new Map();

    /**
     * @param {UIState | undefined} mutable
     * @param {ShaderKind} shader
     */
    const queueUpdate = (mutable, shader) => {
      if (!mutable) return;
      const existing = debounceTimers.get(shader);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(() => {
        debounceTimers.delete(shader);
        mutable.updateTmpShaders(false, shader).catch((error) => {
          console.error(`Failed to regenerate ${shader} shader`, error);
        });
      }, DEBOUNCE_MS);

      debounceTimers.set(shader, timer);
    };

    on("numberOfFunctions", ({ state: mutable, e, detail }) => {
      if (!mutable) return;
      const value = Number((/** @type {HTMLInputElement} */ (e.event.target)).value);
      const shader = normalizeShaderKind(detail?.data);
      mutable.shaderConfig[shader].numberOfFunctions = value;
      queueUpdate(mutable, shader);
    });
    on("statementsPerFunction", ({ state: mutable, e, detail }) => {
      if (!mutable) return;
      const value = Number((/** @type {HTMLInputElement} */ (e.event.target)).value);
      const shader = normalizeShaderKind(detail?.data);
      mutable.shaderConfig[shader]
        .statementsPerFunction = value;
      queueUpdate(mutable, shader);
    });
    on("expressionDepthPerStatement", ({ state: mutable, e, detail }) => {
      if (!mutable) return;
      const value = Number((/** @type {HTMLInputElement} */ (e.event.target)).value);
      const shader = normalizeShaderKind(detail?.data);
      mutable.shaderConfig[shader]
        .expressionDepthPerStatement = value;
      queueUpdate(mutable, shader);
    });

    return onRender;
  },
);

/** @type {RenderFunction} */
function onRender(params) {
  const { detail, slots: rawSlots, state } =
    /** @type {WebComponentRenderParams} */ (params);
  if (!state) return;

  const slots = /** @type {Record<string, HTMLElement>} */ (rawSlots);

  const shader = normalizeShaderKind(detail?.data);

  const config = state.shaderConfig[shader];
  const functionsSlot = /** @type {HTMLElement | undefined} */ (slots.functions);
  const statementsSlot = /** @type {HTMLElement | undefined} */ (slots.statements);
  const depthSlot = /** @type {HTMLElement | undefined} */ (slots.expressionDepth);

  if (functionsSlot) {
    functionsSlot.textContent = String(config.numberOfFunctions);
  }
  if (statementsSlot) {
    statementsSlot.textContent = String(config.statementsPerFunction);
  }
  if (depthSlot) {
    depthSlot.textContent = String(config.expressionDepthPerStatement);
  }

  // self.setAttribute("data-shader", shader);
}
