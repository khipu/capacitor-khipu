import { WebPlugin } from '@capacitor/core';

import type { KhipuColors, KhipuOptions, KhipuPlugin, KhipuResult, StartOperationOptions } from './definitions';

/** The slice of the kws.js widget this plugin drives. */
interface KwsWidget {
  startOperation(descriptor: string, callback: (result: KhipuResult) => void, settings: KwsSettings): unknown;
}

/**
 * Settings kws.js actually reads. `locale` sits at the root, not inside `options` —
 * `renderIframe` forwards `this.settings.locale`, and a `locale` nested under
 * `options` is dropped without a word.
 */
interface KwsSettings {
  mountElement: HTMLElement;
  modal: boolean;
  locale?: string;
  options: {
    style: { theme: 'light' | 'dark'; primaryColor?: string };
    skipExitPage: boolean;
    skipExitSuccessPage: boolean;
  };
}

declare global {
  interface Window {
    Khipu?: new () => KwsWidget;
  }
}

/**
 * Options the web layer deliberately does not send, because the loader has nowhere to
 * put them. Declared rather than merely omitted so `check-option-keys.mjs` can force a
 * decision when a new option is added to the contract.
 */
export const WEB_UNSUPPORTED: readonly (keyof KhipuOptions)[] = [
  'title',
  'titleImageUrl',
  'showFooter',
  'showMerchantLogo',
  'showPaymentDetails',
];

/** Colours with no equivalent in the loader's `style` object. */
export const WEB_UNSUPPORTED_COLORS: readonly (keyof KhipuColors)[] = [
  'lightBackground',
  'lightOnBackground',
  'lightOnPrimary',
  'lightTopBarContainer',
  'lightOnTopBarContainer',
  'darkBackground',
  'darkOnBackground',
  'darkOnPrimary',
  'darkTopBarContainer',
  'darkOnTopBarContainer',
];

export class KhipuWeb extends WebPlugin implements KhipuPlugin {
  private static readonly SCRIPT_ID = 'kws_script_id';
  private static readonly ROOT_ID = 'khipu-web-root';
  private static readonly SCRIPT_SRC = 'https://js.khipu.com/v1/kws.js';
  private static readonly LOAD_TIMEOUT_MS = 10_000;

  private loading?: Promise<KwsWidget> | undefined;

  async startOperation(call: StartOperationOptions): Promise<KhipuResult> {
    const widget = await this.widget();
    return this.run(widget, call);
  }

  /**
   * Injects kws.js on first use, never on construction: the merchant's app should not
   * pay for a third-party script on every page view just because the plugin is
   * registered.
   */
  private widget(): Promise<KwsWidget> {
    if (window.Khipu) {
      return Promise.resolve(new window.Khipu());
    }

    this.loading ??= new Promise<KwsWidget>((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => reject(new Error('timed out waiting for kws.js')), KhipuWeb.LOAD_TIMEOUT_MS);

      script.addEventListener('load', () => {
        clearTimeout(timer);
        if (window.Khipu) {
          resolve(new window.Khipu());
        } else {
          reject(new Error('kws.js loaded but never defined Khipu'));
        }
      });
      script.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('kws.js failed to load'));
      });

      script.id = KhipuWeb.SCRIPT_ID;
      script.type = 'text/javascript';
      script.src = KhipuWeb.SCRIPT_SRC;
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      // Do not cache a failure: a later call should be free to try again.
      this.loading = undefined;
      throw error;
    });

    return this.loading;
  }

  private run(widget: KwsWidget, call: StartOperationOptions): Promise<KhipuResult> {
    const opts: KhipuOptions = call.options ?? {};
    const theme = KhipuWeb.theme(opts.theme);
    const colors = opts.colors;
    const primaryColor = theme === 'dark' ? colors?.darkPrimary : colors?.lightPrimary;

    return new Promise<KhipuResult>((resolve, reject) => {
      try {
        widget.startOperation(call.operationId, resolve, {
          mountElement: this.mountElement(),
          modal: true,
          ...(opts.locale !== undefined ? { locale: opts.locale } : {}),
          options: {
            style: { theme, ...(primaryColor !== undefined ? { primaryColor } : {}) },
            skipExitPage: opts.skipExitPage ?? false,
            skipExitSuccessPage: opts.skipExitSuccessPage ?? false,
          },
        });
      } catch (error: unknown) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Resolves to what kws.js understands, which is only light or dark.
   *
   * An absent theme follows the system rather than falling back to light. Both native
   * SDKs default to SYSTEM (`KhipuOptions.kt:37`, `KhipuOptions.swift:68`), so web
   * quietly choosing light meant the same payment rendered light on web and dark on the
   * phone, with nothing in the merchant's code to explain it.
   */
  private static theme(theme: KhipuOptions['theme']): 'light' | 'dark' {
    if (theme === 'dark') {
      return 'dark';
    }
    if (theme === 'light') {
      return 'light';
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private mountElement(): HTMLElement {
    const existing = document.getElementById(KhipuWeb.ROOT_ID);
    if (existing) {
      return existing;
    }

    const root = document.createElement('div');
    root.id = KhipuWeb.ROOT_ID;
    document.body.appendChild(root);
    return root;
  }
}
