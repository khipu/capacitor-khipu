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

  it('mounts the container with the expected id', () => {
    new KhipuWeb();

    expect(document.getElementById('khipu-web-root')).not.toBeNull();
  });

  it('rejects when kws.js never injects Khipu', async () => {
    const web = new KhipuWeb();
    const assertion = expect(web.ensureKhipuIsSet()).rejects.toThrow('timeout waiting for kws to inject Khipu');

    await vi.advanceTimersByTimeAsync(10_050);

    await assertion;
  });
});
