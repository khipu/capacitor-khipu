import { beforeEach, describe, expect, it } from 'vitest';

import { renderError, renderResult } from './result.js';

describe('renderResult', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('muestra los campos del resultado', () => {
    renderResult(container, {
      operationId: 'abc123',
      exitTitle: 'Listo',
      exitMessage: 'Pago realizado',
      result: 'OK',
      events: [],
    });

    expect(container.textContent).toContain('abc123');
    expect(container.textContent).toContain('Pago realizado');
    expect(container.querySelector('.result-OK')).not.toBeNull();
  });

  it('lista los eventos en una tabla', () => {
    renderResult(container, {
      operationId: 'abc123',
      result: 'OK',
      events: [
        { name: 'start', timestamp: '2026-09-04T12:00:00Z', type: 'info' },
        { name: 'end', timestamp: '2026-09-04T12:00:09Z', type: 'info' },
      ],
    });

    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('no rompe si faltan campos opcionales', () => {
    renderResult(container, { operationId: 'abc123', result: 'ERROR' });

    expect(container.textContent).toContain('abc123');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });

  it('renderError muestra el mensaje', () => {
    renderError(container, new Error('el puente no respondió'));

    expect(container.textContent).toContain('el puente no respondió');
  });
});
