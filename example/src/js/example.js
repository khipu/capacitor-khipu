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
 * Re-dibuja el formulario completo solo cuando cambia `include`, que es lo único
 * que altera el `disabled` del control y el aspecto de la fila. Para un cambio de
 * valor basta refrescar el preview.
 *
 * La distinción no es cosmética: `renderOptions` y `renderColors` usan
 * `replaceChildren`, así que un re-render destruye el input y le quita el foco a
 * quien esté tipeando. Sin esto, escribir en `title`, `titleImageUrl` o `locale`
 * pierde el foco en cada carácter.
 *
 * De paso cierra el riesgo del closure de `ui.js`: los handlers capturan `entry`
 * en el momento del render, y como todo cambio de `include` fuerza un re-render,
 * el `include` capturado nunca queda viejo.
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
 * En web, `src/web.ts` recibe el payload completo pero solo implementa `theme`,
 * `lightPrimary`/`darkPrimary`, `skipExitPage` y `skipExitSuccessPage`. Se avisa
 * arriba para que no se lea como un flag roto del plugin.
 */
function platformNote() {
  if (Capacitor.getPlatform() !== 'web') {
    return `Plataforma ${Capacitor.getPlatform()}: todos los campos tienen efecto.`;
  }

  const ignored = [...OPTION_FIELDS, ...COLOR_FIELDS].filter((entry) => !entry.webSupported).map((entry) => entry.key);

  return `Plataforma web: el fallback de src/web.ts ignora ${
    ignored.length
  } campos (${ignored.join(', ')}). Prueba en iOS o Android para ejercitarlos.`;
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
