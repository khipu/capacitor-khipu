import { describe, expect, it } from 'vitest';

import { COLOR_FIELDS, OPTION_FIELDS, PRESETS, applyPreset, initialState } from './fields.js';
import { buildPayload } from './payload.js';

describe('buildPayload', () => {
  it('with the initial state sends only the operationId', () => {
    const state = initialState();
    state.operationId = 'abc123';

    expect(buildPayload(state)).toEqual({ operationId: 'abc123', options: {} });
  });

  it('omits the key for a field that is not included', () => {
    const state = initialState();
    state.options.showFooter.include = false;
    state.options.showFooter.value = true;

    expect(buildPayload(state).options).not.toHaveProperty('showFooter');
  });

  it('sends false when the field is included as false', () => {
    const state = initialState();
    state.options.showFooter.include = true;
    state.options.showFooter.value = false;

    expect(buildPayload(state).options.showFooter).toBe(false);
  });

  it('does not send the colors key if the object is not included', () => {
    const state = initialState();
    state.colors.include = false;
    state.colors.fields.lightPrimary.include = true;

    expect(buildPayload(state).options).not.toHaveProperty('colors');
  });

  it('sends an empty colors object if it is included with no colors', () => {
    const state = initialState();
    state.colors.include = true;

    expect(buildPayload(state).options.colors).toEqual({});
  });

  it('sends only the checked colors', () => {
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
  it('the "all" preset includes the 9 fields and the 12 colors', () => {
    const preset = PRESETS.find((item) => item.id === 'all');
    const payload = buildPayload(applyPreset(initialState(), preset));

    expect(Object.keys(payload.options)).toHaveLength(OPTION_FIELDS.length + 1);
    expect(Object.keys(payload.options.colors)).toHaveLength(COLOR_FIELDS.length);
  });

  it('the "defaults" preset includes nothing', () => {
    const preset = PRESETS.find((item) => item.id === 'defaults');
    const payload = buildPayload(applyPreset(initialState(), preset));

    expect(payload.options).toEqual({});
  });

  it('the "dark" preset forces the theme value', () => {
    const preset = PRESETS.find((item) => item.id === 'dark');
    const payload = buildPayload(applyPreset(initialState(), preset));

    expect(payload.options.theme).toBe('dark');
  });

  it('preserves the already-typed operationId', () => {
    const state = initialState();
    state.operationId = 'no-me-borres';
    const preset = PRESETS.find((item) => item.id === 'khipu');

    expect(applyPreset(state, preset).operationId).toBe('no-me-borres');
  });
});
