import { beforeEach, describe, expect, it } from 'vitest';

import { renderError, renderResult } from './result.js';

describe('renderResult', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('shows the result fields', () => {
    renderResult(container, {
      operationId: 'abc123',
      exitTitle: 'Done',
      exitMessage: 'Payment completed',
      result: 'OK',
      events: [],
    });

    expect(container.textContent).toContain('abc123');
    expect(container.textContent).toContain('Payment completed');
    expect(container.querySelector('.result-OK')).not.toBeNull();
  });

  it('lists the events in a table', () => {
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

  it('does not break if optional fields are missing', () => {
    renderResult(container, { operationId: 'abc123', result: 'ERROR' });

    expect(container.textContent).toContain('abc123');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });

  it('renderError shows the message', () => {
    renderError(container, new Error('the bridge did not respond'));

    expect(container.textContent).toContain('the bridge did not respond');
  });
});
