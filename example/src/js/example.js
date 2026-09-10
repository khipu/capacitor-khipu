import { Capacitor } from '@capacitor/core';
import { Khipu } from 'capacitor-khipu';

import { COLOR_FIELDS, OPTION_FIELDS, applyPreset, initialState } from './fields.js';
import { buildPayload } from './payload.js';
import { renderError, renderResult } from './result.js';
import { loadState, saveState } from './storage.js';
import { renderColors, renderOptions, renderPayload, renderPresets } from './ui.js';

const dom = {
  operationId: document.getElementById('operationId'),
  presets: document.getElementById('presets'),
  options: document.getElementById('options'),
  colorsInclude: document.getElementById('colors-include'),
  colors: document.getElementById('colors'),
  payload: document.getElementById('payload'),
  start: document.getElementById('start'),
  result: document.getElementById('result'),
  platformNote: document.getElementById('platform-note'),
};

let state = loadState(initialState());

function render() {
  dom.operationId.value = state.operationId;
  dom.colorsInclude.checked = state.colors.include;
  renderOptions(dom.options, state, (key, entry) => apply(state.options, key, entry));
  renderColors(dom.colors, state, (key, entry) => apply(state.colors.fields, key, entry));
  renderPayload(dom.payload, buildPayload(state));
}

/**
 * Redraws the whole form only when `include` changes, since that's the only thing
 * that alters the control's `disabled` state and the row's look. For a value
 * change, refreshing the preview is enough.
 *
 * The distinction is not cosmetic: `renderOptions` and `renderColors` use
 * `replaceChildren`, so a re-render destroys the input and steals focus from
 * whoever is typing. Without this, typing into `title`, `titleImageUrl` or
 * `locale` loses focus on every character.
 *
 * It also closes off `ui.js`'s closure risk: the handlers capture `entry` at
 * render time, and since every `include` change forces a re-render, the captured
 * `include` never goes stale.
 */
function apply(bag, key, entry) {
  const toggled = bag[key].include !== entry.include;
  bag[key] = entry;
  saveState(state);

  if (toggled) {
    render();
  } else {
    renderPayload(dom.payload, buildPayload(state));
  }
}

function commit() {
  saveState(state);
  render();
}

/**
 * On web, `src/web.ts` receives the full payload but only implements `theme`,
 * `locale`, `lightPrimary`/`darkPrimary`, `skipExitPage` and `skipExitSuccessPage`.
 * This is flagged above so it doesn't read as a broken plugin flag.
 */
function platformNote() {
  if (Capacitor.getPlatform() !== 'web') {
    return `Platform ${Capacitor.getPlatform()}: every field has an effect.`;
  }

  const ignored = [...OPTION_FIELDS, ...COLOR_FIELDS].filter((entry) => !entry.webSupported).map((entry) => entry.key);

  return `Platform web: the src/web.ts fallback ignores ${
    ignored.length
  } fields (${ignored.join(', ')}). Try iOS or Android to exercise them.`;
}

dom.platformNote.textContent = platformNote();

dom.operationId.addEventListener('input', () => {
  state.operationId = dom.operationId.value;
  saveState(state);
  renderPayload(dom.payload, buildPayload(state));
});

dom.colorsInclude.addEventListener('change', () => {
  state.colors.include = dom.colorsInclude.checked;
  commit();
});

renderPresets(dom.presets, (preset) => {
  state = applyPreset(state, preset);
  commit();
});

dom.start.addEventListener('click', async () => {
  dom.start.disabled = true;
  try {
    renderResult(dom.result, await Khipu.startOperation(buildPayload(state)));
  } catch (error) {
    renderError(dom.result, error);
  } finally {
    dom.start.disabled = false;
  }
});

render();
