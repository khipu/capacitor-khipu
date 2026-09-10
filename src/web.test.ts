import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KhipuWeb } from './web';

interface StartedCall {
  descriptor: string;
  settings: Record<string, any>;
}

/** Installs a fake `window.Khipu` and records what the plugin asks it to start. */
function fakeWidget(calls: StartedCall[], result: unknown = { result: 'OK' }) {
  (window as any).Khipu = function FakeKhipu() {
    return {
      startOperation(descriptor: string, callback: (value: unknown) => void, settings: any) {
        calls.push({ descriptor, settings });
        callback(result);
      },
    };
  };
}

describe('KhipuWeb', () => {
  let calls: StartedCall[];

  beforeEach(() => {
    calls = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).Khipu;
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('does not touch the page when it is merely constructed', () => {
    new KhipuWeb();

    expect(document.getElementById('kws_script_id')).toBeNull();
    expect(document.getElementById('khipu-web-root')).toBeNull();
  });

  it('mounts the container on the first operation', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    expect(document.getElementById('khipu-web-root')).not.toBeNull();
  });

  it('resolves with what the widget hands back', async () => {
    fakeWidget(calls, { operationId: 'abc', result: 'OK' });

    const result = await new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    expect(result).toEqual({ operationId: 'abc', result: 'OK' });
    expect(calls[0].descriptor).toBe('abc');
  });

  it('sends locale at the root of the settings, where kws.js reads it', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: { locale: 'es_CL' } });

    expect(calls[0].settings.locale).toBe('es_CL');
  });

  it('omits locale when the merchant did not send one', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    expect('locale' in calls[0].settings).toBe(false);
  });

  it('picks the primary colour that matches the resolved theme', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({
      operationId: 'abc',
      options: { theme: 'dark', colors: { lightPrimary: '#8347AD', darkPrimary: '#3CB4E5' } },
    });

    expect(calls[0].settings.options.style).toEqual({ theme: 'dark', primaryColor: '#3CB4E5' });
  });

  it('omits primaryColor when no colours were given', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: { theme: 'light' } });

    expect(calls[0].settings.options.style).toEqual({ theme: 'light' });
  });

  it('resolves the system theme against the media query', async () => {
    fakeWidget(calls);
    (window as any).matchMedia = () => ({ matches: true });

    await new KhipuWeb().startOperation({ operationId: 'abc', options: { theme: 'system' } });

    expect(calls[0].settings.options.style.theme).toBe('dark');
    delete (window as any).matchMedia;
  });

  it('follows the system when no theme was sent, as both native SDKs do', async () => {
    fakeWidget(calls);
    (window as any).matchMedia = () => ({ matches: true });

    await new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    expect(calls[0].settings.options.style.theme).toBe('dark');
    delete (window as any).matchMedia;
  });

  it('defaults both skip flags to false', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    expect(calls[0].settings.options.skipExitPage).toBe(false);
    expect(calls[0].settings.options.skipExitSuccessPage).toBe(false);
  });

  it('rejects instead of hanging when the widget throws', async () => {
    (window as any).Khipu = function FakeKhipu() {
      return {
        startOperation() {
          throw new Error('descriptor must be defined');
        },
      };
    };

    await expect(new KhipuWeb().startOperation({ operationId: '', options: {} })).rejects.toThrow(
      'descriptor must be defined',
    );
  });

  it('rejects when kws.js fails to load', async () => {
    const pending = new KhipuWeb().startOperation({ operationId: 'abc', options: {} });
    const assertion = expect(pending).rejects.toThrow('kws.js failed to load');

    document.getElementById('kws_script_id')?.dispatchEvent(new Event('error'));

    await assertion;
  });

  it('rejects when kws.js loads but never defines Khipu', async () => {
    const pending = new KhipuWeb().startOperation({ operationId: 'abc', options: {} });
    const assertion = expect(pending).rejects.toThrow('kws.js loaded but never defined Khipu');

    document.getElementById('kws_script_id')?.dispatchEvent(new Event('load'));

    await assertion;
  });

  it('rejects when kws.js never fires either event', async () => {
    const pending = new KhipuWeb().startOperation({ operationId: 'abc', options: {} });
    const assertion = expect(pending).rejects.toThrow('timed out waiting for kws.js');

    await vi.advanceTimersByTimeAsync(10_050);

    await assertion;
  });
});
