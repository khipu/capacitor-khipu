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

  it('never injects a second script tag across separate instances', () => {
    const first = new KhipuWeb().startOperation({ operationId: 'a', options: {} });
    const second = new KhipuWeb().startOperation({ operationId: 'b', options: {} });

    expect(document.querySelectorAll('#kws_script_id')).toHaveLength(1);

    // Neither call is settled yet (no load/error dispatched, no timer advanced); avoid
    // leaking them as unhandled rejections once this test's fake timers are torn down.
    first.catch(() => undefined);
    second.catch(() => undefined);
  });

  it('resolves every pending call once the one shared script settles', async () => {
    const first = new KhipuWeb().startOperation({ operationId: 'a', options: {} });
    const second = new KhipuWeb().startOperation({ operationId: 'b', options: {} });

    expect(document.querySelectorAll('#kws_script_id')).toHaveLength(1);

    // Simulates kws.js finishing its load: both instances share the one script tag,
    // so both must have attached their own listeners to it rather than waiting on one
    // that was never going to fire again.
    fakeWidget(calls);
    document.getElementById('kws_script_id')?.dispatchEvent(new Event('load'));

    await expect(first).resolves.toEqual({ result: 'OK' });
    await expect(second).resolves.toEqual({ result: 'OK' });
  });

  it('replaces a dead script instead of reusing one that already loaded garbage', async () => {
    const first = new KhipuWeb().startOperation({ operationId: 'a', options: {} });
    const firstScript = document.getElementById('kws_script_id');
    expect(firstScript).not.toBeNull();

    const firstAssertion = expect(first).rejects.toThrow('kws.js loaded but never defined Khipu');
    // This script's one and only `load` event, exactly once — real network scripts do
    // not fire it twice, and this test must not either, or it would stop testing
    // anything.
    firstScript?.dispatchEvent(new Event('load'));
    await firstAssertion;

    const second = new KhipuWeb().startOperation({ operationId: 'b', options: {} });
    const secondScript = document.getElementById('kws_script_id');

    // The load-bearing assertion: a dead tag that already fired `load` without ever
    // defining `Khipu` must not survive the failed attempt that created it. If it
    // did, this would be the exact same node, `secondScript` would attach to an event
    // that will never come again, and the promise below would only ever settle via
    // the ten-second timeout — with the wrong diagnosis.
    expect(secondScript).not.toBeNull();
    expect(secondScript).not.toBe(firstScript);

    const secondAssertion = expect(second).rejects.toThrow('kws.js loaded but never defined Khipu');
    // No `vi.advanceTimersByTimeAsync` here on purpose: a fresh script's own `load`
    // event is enough. If the fix regressed, this would hang until the surrounding
    // test's own timeout, not settle on the (wrong) 10s timer.
    secondScript?.dispatchEvent(new Event('load'));
    await secondAssertion;
  });
});
