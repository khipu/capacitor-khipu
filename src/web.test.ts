import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KhipuWeb } from './web';

describe('KhipuWeb', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('monta el contenedor con el id esperado', () => {
    new KhipuWeb();

    expect(document.getElementById('khipu-web-root')).not.toBeNull();
  });

  it('rechaza cuando kws.js nunca inyecta Khipu', async () => {
    const web = new KhipuWeb();
    const assertion = expect(web.ensureKhipuIsSet()).rejects.toThrow(
      'timeout waiting for kws to inject Khipu',
    );

    await vi.advanceTimersByTimeAsync(10_050);

    await assertion;
  });
});
