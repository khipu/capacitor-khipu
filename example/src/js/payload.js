/**
 * Construye el payload de `Khipu.startOperation` a partir del estado del
 * formulario.
 *
 * El plugin distingue "clave ausente" de `false`, así que cada campo lleva su
 * propio `include` y aquí solo se agregan los marcados. Un campo sin marcar deja
 * que el SDK nativo aplique su valor por omisión.
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
