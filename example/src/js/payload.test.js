import { describe, expect, it } from 'vitest';

import {
  COLOR_FIELDS,
  OPTION_FIELDS,
  PRESETS,
  applyPreset,
  initialState,
} from './fields.js';
import { buildPayload } from './payload.js';

describe('buildPayload', () => {
  it('con el estado inicial envía solo el operationId', () => {
    const state = initialState();
    state.operationId = 'abc123';

    expect(buildPayload(state)).toEqual({ operationId: 'abc123', options: {} });
  });

  it('omite la clave de un campo no incluido', () => {
    const state = initialState();
    state.options.showFooter.include = false;
    state.options.showFooter.value = true;

    expect(buildPayload(state).options).not.toHaveProperty('showFooter');
  });

  it('envía false cuando el campo está incluido en false', () => {
    const state = initialState();
    state.options.showFooter.include = true;
    state.options.showFooter.value = false;

    expect(buildPayload(state).options.showFooter).toBe(false);
  });

  it('no envía la clave colors si el objeto no está incluido', () => {
    const state = initialState();
    state.colors.include = false;
    state.colors.fields.lightPrimary.include = true;

    expect(buildPayload(state).options).not.toHaveProperty('colors');
  });

  it('envía colors vacío si el objeto está incluido sin ningún color', () => {
    const state = initialState();
    state.colors.include = true;

    expect(buildPayload(state).options.colors).toEqual({});
  });

  it('envía solo los colores marcados', () => {
    const state = initialState();
    state.colors.include = true;
    state.colors.fields.lightPrimary.include = true;
    state.colors.fields.darkPrimary.include = true;

    expect(buildPayload(state).options.colors).toEqual({
      lightPrimary: '#8347AD',
      darkPrimary: '#3CB4E5',
    });
  });
});

describe('applyPreset', () => {
  it('el preset "all" incluye los 9 campos y los 12 colores', () => {
    const preset = PRESETS.find(item => item.id === 'all');
    const payload = buildPayload(applyPreset(initialState(), preset));

    expect(Object.keys(payload.options)).toHaveLength(OPTION_FIELDS.length + 1);
    expect(Object.keys(payload.options.colors)).toHaveLength(
      COLOR_FIELDS.length,
    );
  });

  it('el preset "defaults" no incluye nada', () => {
    const preset = PRESETS.find(item => item.id === 'defaults');
    const payload = buildPayload(applyPreset(initialState(), preset));

    expect(payload.options).toEqual({});
  });

  it('el preset "dark" fuerza el valor del tema', () => {
    const preset = PRESETS.find(item => item.id === 'dark');
    const payload = buildPayload(applyPreset(initialState(), preset));

    expect(payload.options.theme).toBe('dark');
  });

  it('preserva el operationId ya tipeado', () => {
    const state = initialState();
    state.operationId = 'no-me-borres';
    const preset = PRESETS.find(item => item.id === 'khipu');

    expect(applyPreset(state, preset).operationId).toBe('no-me-borres');
  });
});
