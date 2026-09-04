import { beforeEach, describe, expect, it } from 'vitest';

import { initialState } from './fields.js';
import { loadState, saveState } from './storage.js';

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sin nada guardado devuelve el fallback', () => {
    expect(loadState(initialState())).toEqual(initialState());
  });

  it('recupera lo que se guardó', () => {
    const state = initialState();
    state.operationId = 'abc123';
    state.options.showFooter.include = true;
    saveState(state);

    expect(loadState(initialState())).toEqual(state);
  });

  it('ignora un estado guardado corrupto', () => {
    window.localStorage.setItem('capacitor-khipu-harness', '{no es json');

    expect(loadState(initialState())).toEqual(initialState());
  });

  it('completa los campos que faltan en un estado de una versión anterior', () => {
    window.localStorage.setItem(
      'capacitor-khipu-harness',
      JSON.stringify({
        operationId: 'abc123',
        options: { showFooter: { include: true, value: false } },
      }),
    );

    const state = loadState(initialState());

    expect(state.operationId).toBe('abc123');
    expect(state.options.showFooter).toEqual({ include: true, value: false });
    expect(state.options.showMerchantLogo).toEqual({
      include: false,
      value: false,
    });
    expect(state.colors.include).toBe(false);
  });

  it('descarta claves guardadas que ya no existen en el esquema', () => {
    window.localStorage.setItem(
      'capacitor-khipu-harness',
      JSON.stringify({
        operationId: '',
        options: { flagQueYaNoExiste: { include: true, value: 1 } },
      }),
    );

    expect(loadState(initialState()).options).not.toHaveProperty(
      'flagQueYaNoExiste',
    );
  });
});
