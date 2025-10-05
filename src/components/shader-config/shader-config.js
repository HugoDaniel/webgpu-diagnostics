// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").InitFunction<UIState | undefined>} InitFunction */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState | undefined>} WebComponentRenderParams */
import { webComponent } from "boredom";
import { runtimeAttribute } from "../../runtimeAttribute.js";
import { createWebGPU } from "../../createWebGPU.js";
import { stringSizeInKB } from "../../stringSizeInKb.js";

export const ShaderConfig = webComponent(
  /** @type InitFunction */
  ({ on }) => {
    on("recompile", ({ state: mutable }) => {
      if (!mutable) return;
      mutable.isCompiling = true;
      const runtimeState = mutable[runtimeAttribute];
      runtimeState.device?.destroy();

      const canvas = runtimeState.canvas;
      if (!(canvas instanceof HTMLCanvasElement)) {
        console.warn("Cannot recompile shaders without a valid canvas");
        mutable.isCompiling = false;
        return;
      }

      createWebGPU(mutable, canvas)
        .catch((error) => {
          console.error("Recompile failed", error);
        })
        .finally(() => {
          mutable.isCompiling = false;
        });
    });

    on("showCode", ({ state: mutable }) => {
      if (!mutable) return;
      mutable.showShaderCode = !mutable.showShaderCode;
    });

    on("tab1Change", ({ state: mutable }) => {
      if (!mutable) return;
      mutable.selectedShader = "compute";
    });
    on("tab2Change", ({ state: mutable }) => {
      if (!mutable) return;
      mutable.selectedShader = "vertex";
    });
    on("tab3Change", ({ state: mutable }) => {
      if (!mutable) return;
      mutable.selectedShader = "fragment";
    });

    return onRender;
  },
);

/** @type {RenderFunction} */
function onRender(params) {
  const { slots: rawSlots, makeComponent, state, refs } =
    /** @type {WebComponentRenderParams} */ (params);
  if (!state) return;

  const slots = /** @type {Record<string, HTMLElement>} */ (rawSlots);

  const panelsContainer = /** @type {HTMLElement} */ (slots.panels);
  if (panelsContainer.childElementCount === 0) {
    const panels = [
      makeComponent("sliders-panel", {
        detail: { data: "compute", index: 0, name: "shader-config-panel" },
      }),
      makeComponent("sliders-panel", {
        detail: { data: "vertex", index: 1, name: "shader-config-panel" },
      }),
      makeComponent("sliders-panel", {
        detail: { data: "fragment", index: 2, name: "shader-config-panel" },
      }),
    ].map((panel, i) => {
      panel.setAttribute("id", `panel${i + 1}`);
      panel.classList.add("tab-panel");
      return panel;
    });
    panelsContainer.replaceChildren(...panels);
  }

  const sizeCompute = stringSizeInKB(state.shaders.compute);
  const sizeVertex = stringSizeInKB(state.shaders.vertex);
  const sizeFragment = stringSizeInKB(state.shaders.fragment);

  const sizeMap = {
    compute: { text: sizeCompute, value: Number(sizeCompute) || 0 },
    vertex: { text: sizeVertex, value: Number(sizeVertex) || 0 },
    fragment: { text: sizeFragment, value: Number(sizeFragment) || 0 },
  };

  const selectedSize = sizeMap[state.selectedShader] ?? sizeMap.compute;
  slots.shaderSize = createSizeBadge(selectedSize.value, selectedSize.text);

  const recompileButton = refs.recompileButton;
  if (recompileButton instanceof HTMLButtonElement) {
    if (state.isCompiling) {
      recompileButton.setAttribute("disabled", "true");
      recompileButton.textContent = "Compiling...";
    } else {
      recompileButton.removeAttribute("disabled");
      recompileButton.textContent = "Compile All";
    }
  }

  const codeToggleButton = refs.codeToggle;
  const codeBlock = refs.codeBlock;
  if (
    codeToggleButton instanceof HTMLButtonElement &&
    codeBlock instanceof HTMLElement
  ) {
    const key = state.selectedShader;
    const currentShader = state.shaders[key] ?? "";
    const scopeLabel = state.selectedShader
      ? state.selectedShader.charAt(0).toUpperCase() +
        state.selectedShader.slice(1)
      : "";
    const shaderError = state.errors.shader.find((msg) =>
      scopeLabel ? msg.startsWith(`[${scopeLabel}]`) : false
    );
    if (state.showShaderCode) {
      codeToggleButton.textContent = "Hide Code";
      codeBlock.hidden = false;
      codeBlock.textContent = currentShader || shaderError ||
        "// No shader code generated yet";
    } else {
      codeToggleButton.textContent = "View Code";
      codeBlock.hidden = true;
      codeBlock.textContent = "";
    }
  }
}

const SIZE_SMALL_THRESHOLD = 1024; // KB
const SIZE_MEDIUM_THRESHOLD = 4096; // KB

/**
 * @param {number} sizeInKb
 * @param {string} formattedText
 */
function createSizeBadge(sizeInKb, formattedText) {
  const badge = document.createElement("span");
  badge.classList.add("shader-size");

  if (Number.isFinite(sizeInKb)) {
    if (sizeInKb <= SIZE_SMALL_THRESHOLD) {
      badge.classList.add("shader-size--small");
    } else if (sizeInKb <= SIZE_MEDIUM_THRESHOLD) {
      badge.classList.add("shader-size--medium");
    } else {
      badge.classList.add("shader-size--large");
    }
  }

  const text = typeof formattedText === "string" && formattedText
    ? formattedText
    : "0.00";
  badge.textContent = `${text} KB`;
  return badge;
}
