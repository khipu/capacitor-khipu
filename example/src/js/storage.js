const STORAGE_KEY = 'capacitor-khipu-harness';

/**
 * The saved state can come from an earlier version of the harness, with fewer
 * fields or with fields that no longer exist. The shape of `fallback` is taken as
 * the authority, and only the values of known keys are copied over, so adding a
 * flag does not break the saved session.
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
    // Without persistence the harness still works; not worth interrupting for.
  }
}
