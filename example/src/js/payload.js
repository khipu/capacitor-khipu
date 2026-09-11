/**
 * Builds the `Khipu.startOperation` payload from the form's state.
 *
 * The plugin distinguishes "key absent" from `false`, so each field carries its
 * own `include` flag and only the marked ones get added here. An unmarked field
 * lets the native SDK apply its default value.
 */
export function buildPayload(state) {
  const options = {};

  for (const [key, entry] of Object.entries(state.options)) {
    if (entry.include) {
      options[key] = entry.value;
    }
  }

  if (state.colors.include) {
    const colors = {};
    for (const [key, entry] of Object.entries(state.colors.fields)) {
      if (entry.include) {
        colors[key] = entry.value;
      }
    }
    options.colors = colors;
  }

  return { operationId: state.operationId, options };
}
