// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").webComponent<UIState>} webComponent */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState>} WebComponentRenderParams */
import { webComponent } from "boredom";
import { runtimeAttribute } from "../../runtimeAttribute.js";
import { createWebGPU } from "../../createWebGPU.js";
import { stringSizeInKB } from "../../stringSizeInKb.js";

export const ShaderConfig = webComponent(
  /** @type InitFunction */
  ({ on, refs }) => {
    on("recompile", ({ state: mutable }) => {
      mutable.isCompiling = true;
      mutable[runtimeAttribute].device?.destroy();

      createWebGPU(mutable, mutable[runtimeAttribute].canvas).then(() => {
        mutable.isCompiling = false;
      });
    });

    on("showCode", ({ state: mutable }) => {
      mutable.showShaderCode = !mutable.showShaderCode;
    });

    on(
      "tab1Change",
      ({ state: mutable }) => mutable.selectedShader = "compute",
    );
    on("tab2Change", ({ state: mutable }) => mutable.selectedShader = "vertex");
    on(
      "tab3Change",
      ({ state: mutable }) => mutable.selectedShader = "fragment",
    );

    return onRender;
  },
);

/** @type RenderFunction */
function onRender(params) {
  const { slots, makeComponent, state, self, refs } = params;
  if (!state) return;

  if (slots.panels.childElementCount === 0) {
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
    slots.panels.replaceChildren(...panels);
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
    const currentShader = state.shaders[state.selectedShader] ?? "";
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
