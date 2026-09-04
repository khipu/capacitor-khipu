const STORAGE_KEY = 'capacitor-khipu-harness';

/**
 * El estado guardado puede venir de una versión anterior del harness, con menos
 * campos o con campos que ya no existen. Se toma la forma de `fallback` como
 * autoridad y solo se copian los valores de claves conocidas, para que agregar un
 * flag no rompa la sesión guardada.
 */
function merge(fallback, stored) {
  const state = JSON.parse(JSON.stringify(fallback));

  if (typeof stored?.operationId === 'string') {
    state.operationId = stored.operationId;
  }

  for (const key of Object.keys(state.options)) {
    const entry = stored?.options?.[key];
    if (entry) {
      state.options[key] = {
        include: Boolean(entry.include),
        value: entry.value ?? state.options[key].value,
      };
    }
  }

  if (stored?.colors) {
    state.colors.include = Boolean(stored.colors.include);
    for (const key of Object.keys(state.colors.fields)) {
      const entry = stored.colors.fields?.[key];
      if (entry) {
        state.colors.fields[key] = {
          include: Boolean(entry.include),
          value: entry.value ?? state.colors.fields[key].value,
        };
      }
    }
  }

  return state;
}

export function loadState(fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? merge(fallback, JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sin persistencia el harness sigue funcionando; no vale la pena interrumpir.
  }
}
