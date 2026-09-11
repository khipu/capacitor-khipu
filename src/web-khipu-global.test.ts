import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

import { KhipuWeb } from './web';

/**
 * Regression test for a real defect: kws.js declares `class Khipu` at the top level
 * of a classic script. A top-level class creates a binding in the global LEXICAL
 * environment, not a property of the global object — so `window.Khipu` stays
 * `undefined` no matter how well the script loaded, and reading it made every real
 * call reject with "kws.js loaded but never defined Khipu".
 *
 * `web.test.ts`'s `fakeWidget` cannot exercise this: it does `window.Khipu = ...`,
 * a property assignment, which — unlike a top-level `class` — ALSO resolves via a
 * bare identifier lookup. It cannot tell a correct implementation (reads the bare
 * identifier) from the broken one (reads `window.Khipu`) apart; both pass.
 *
 * This file reproduces the actual mechanism instead of faking it: `vm.runInThisContext`
 * runs source text against the real global lexical environment — the same one a
 * classic `<script>` tag executes against — so a top-level `class Khipu` declared this
 * way is visible only as a bare identifier, exactly like the real kws.js.
 *
 * Why not go through a real `<script src>` and a dispatched `load` event, the way the
 * rest of `web.test.ts` does? Tried it first: this repo's jsdom setup
 * (`runScripts: 'dangerously'`, no `resources` loader configured) does not run
 * appended `<script>` elements — inline or `src` — within any bounded, observable
 * time. Confirmed empirically: no `load` event and no visible side effect of an
 * inline script's body appeared even after multi-second real-timer waits, most likely
 * because jsdom's internal resource queue never resolves an earlier, permanently
 * pending item (there is no configured resource loader to fetch anything). That
 * makes a genuine DOM-level version of this test flaky-to-impossible in this
 * environment; `vm.runInThisContext` is the closest deterministic stand-in for what a
 * real page load does to the global lexical environment, and the DOM/timer mechanics
 * of loading (the script tag, the `load`/`error` events, the timeout) stay covered by
 * `web.test.ts`.
 */
describe('the lexical Khipu global kws.js actually creates', () => {
  it('is visible only via a bare identifier, never as a globalThis/window property', () => {
    vm.runInThisContext('class KhipuLexicalProbe {}');

    expect((globalThis as unknown as Record<string, unknown>).KhipuLexicalProbe).toBeUndefined();
    expect(vm.runInThisContext('typeof KhipuLexicalProbe')).toBe('function');
  });

  it('resolves startOperation once kws.js "loads", via the bare identifier and not window.Khipu', async () => {
    expect((window as unknown as { Khipu?: unknown }).Khipu).toBeUndefined();

    const pending = new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    // Simulates kws.js finishing its load and being evaluated as a classic script:
    // this is the real mechanism, not a stand-in for it.
    vm.runInThisContext(
      `class Khipu {
         startOperation(descriptor, callback) {
           callback({ operationId: descriptor, result: 'OK' });
         }
       }`,
    );

    // Still not a window property — only a bare identifier, same as the real script.
    expect((window as unknown as { Khipu?: unknown }).Khipu).toBeUndefined();

    document.getElementById('kws_script_id')?.dispatchEvent(new Event('load'));

    await expect(pending).resolves.toEqual({ operationId: 'abc', result: 'OK' });

    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });
});
