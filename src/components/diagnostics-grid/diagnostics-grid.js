// @ts-check
/** @typedef {import("../../types").UIState} UIState */
/** @typedef {import("boredom").RenderFunction<UIState | undefined>} RenderFunction */
/** @typedef {import("boredom").WebComponentRenderParams<UIState | undefined>} WebComponentRenderParams */
import { webComponent } from "boredom";

export const DiagnosticsGrid = webComponent(
  () => onRender,
);

/** @type {RenderFunction} */
function onRender(params) {
  const { slots: rawSlots, state, refs } = /** @type {WebComponentRenderParams} */ (params);

  if (!state) return;

  const slots = /** @type {Record<string, HTMLElement>} */ (rawSlots);
  const timingsTitle = /** @type {HTMLElement} */ (refs.timingsTitle);

  // Timings:
  const baseTimingTitle = (() => {
    const existing = timingsTitle.dataset.baseTitle;
    if (existing) return existing;
    const initial = timingsTitle.textContent ?? "";
    timingsTitle.dataset.baseTitle = initial;
    return initial;
  })();

  if (state.isCompiling) {
    timingsTitle.classList.add("loading");
    timingsTitle.textContent = `${baseTimingTitle} (loading)`;
  } else {
    timingsTitle.classList.remove("loading");
    timingsTitle.textContent = baseTimingTitle;
  }
  for (const [timingName, timingValue] of Object.entries(state.timings)) {
    const timingStr = state.isCompiling ? "–" : `${timingValue.toFixed(2)} ms`;
    const slot = /** @type {HTMLElement | undefined} */ (slots[timingName]);
    if (!slot) continue;
    slot.textContent = timingStr;
  }

  // Adapter Info:
  const adapterInfoSlot = /** @type {HTMLElement | undefined} */ (slots.adapterInfo);
  if (adapterInfoSlot) {
    adapterInfoSlot.textContent =
      `Vendor: ${state.adapterInfo.vendor} | Arch: ${state.adapterInfo.architecture}`;
  }

  // Features:
  slots.features = createFeaturesContent(state.adapterFeatures);

  // Adapter Limits:
  slots.adapterLimits = createLimitsContent(state.limits.adapter);
  // Device Limits:
  slots.deviceLimits = createLimitsContent(state.limits.device);

  const errorMessages = collectErrorMessages(state.errors);
  updateMessagesSection(refs.errorsCard, refs.errors, errorMessages);

  const warningMessages = collectWarningMessages(state.warnings);
  updateMessagesSection(refs.warningsCard, refs.warnings, warningMessages);
}

/**
 * @param {[string, number | string | undefined]} entry
 */
function limitElement([name, value]) {
  const limitContainerElem = document.createElement("a");
  limitContainerElem.classList.add("limit");
  limitContainerElem.href =
    `https://www.w3.org/TR/webgpu/#dom-supported-limits-${name.toLocaleLowerCase()}`;

  const nameElem = document.createElement("div");
  nameElem.classList.add("name");
  nameElem.textContent = name;

  const numElem = document.createElement("div");
  numElem.classList.add("num");
  numElem.textContent = value == null ? "–" : String(value);

  limitContainerElem.appendChild(nameElem);
  limitContainerElem.appendChild(numElem);

  return limitContainerElem;
}

/**
 * @param {Partial<GPUSupportedLimits>} limits
 */
function createLimitsContent(limits) {
  const container = document.createElement("div");
  container.classList.add("limits");

  const entries = Object.entries(limits).map(limitElement);
  if (entries.length > 0) {
    container.append(...entries);
  } else {
    container.textContent = "–";
  }

  return container;
}

/**
 * @param {string[]} features
 */
function createFeaturesContent(features) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("tags");

  if (features.length === 0) {
    wrapper.textContent = "–";
    return wrapper;
  }

  const items = features.map((feature) => {
    const a = document.createElement("a");
    a.classList.add("tag");
    switch (feature) {
      case "dual-source-blending":
      case "clip-distances":
        a.href = `https://www.w3.org/TR/webgpu/#dom-gpufeaturename-${feature}`;
        break;
      default:
        a.href = `https://www.w3.org/TR/webgpu/#${feature}`;
    }
    a.innerText = feature;
    return a;
  });

  wrapper.append(...items);
  return wrapper;
}

/**
 * @param {UIState["errors"] | undefined} errors
 */
function collectErrorMessages(errors) {
  if (!errors) return [];
  /** @type {(label: string, messages?: string[]) => string[]} */
  const normalize = (label, messages = []) =>
    (messages ?? []).map((msg) => prefixMessage(label, msg));
  return [
    ...normalize("Adapter", errors.adapter),
    ...normalize("Device", errors.device),
    ...normalize("Shader", errors.shader),
    ...normalize("Pipeline", errors.pipeline),
    ...normalize("Compilation", errors.compilation),
  ];
}

/**
 * @param {UIState["warnings"] | undefined} warnings
 */
function collectWarningMessages(warnings) {
  if (!warnings) return [];
  /** @type {(label: string, messages?: string[]) => string[]} */
  const normalize = (label, messages = []) =>
    (messages ?? []).map((msg) => prefixMessage(label, msg));
  return [
    ...normalize("Compilation", warnings.compilation),
  ];
}

/**
 * @param {string} label
 * @param {unknown} msg
 */
function prefixMessage(label, msg) {
  const message = typeof msg === "string" ? msg : String(msg ?? "");
  if (message.startsWith("[")) return message;
  return `[${label}] ${message}`;
}

/**
 * @param {Element | null | undefined} card
 * @param {Element | null | undefined} container
 * @param {string[]} messages
 */
function updateMessagesSection(card, container, messages) {
  if (!(container instanceof HTMLElement) || !(card instanceof HTMLElement)) {
    return;
  }

  if (messages.length === 0) {
    card.setAttribute("hidden", "true");
    container.replaceChildren();
    return;
  }

  card.removeAttribute("hidden");
  const elements = messages.map((message) => {
    const entry = document.createElement("div");
    entry.classList.add("message");
    entry.textContent = message;
    return entry;
  });
  container.replaceChildren(...elements);
}
