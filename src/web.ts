import { WebPlugin } from '@capacitor/core';

import type {KhipuPlugin, KhipuResult, StartOperationOptions} from './definitions';

export class KhipuWeb extends WebPlugin implements KhipuPlugin {

  private static KWS_SCRIPT_ID = 'kws_script_id';
  private static KHIPU_WEB_ROOT: 'khipu-web-root';
  private static KWS_TIMEOUT: 10_000

  private khipu: any;

  constructor() {
    super();
    this.addKws();
    this.addKhipuWebRoot();
  }

  async startOperation(options: StartOperationOptions): Promise<KhipuResult> {
    this.addKws();
    this.addKhipuWebRoot();
    await this.ensureKhipuIsSet();
    return this.startKhipu(options);
  }

  addKws(): void {
    if (!document.getElementById(KhipuWeb.KWS_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = KhipuWeb.KWS_SCRIPT_ID;
      script.type = 'text/javascript';
      script.src = 'https://js.khipu.com/v1/kws.js';
      document.head.appendChild(script);
    }
  }

  addKhipuWebRoot(): void {
    if (!document.getElementById(KhipuWeb.KHIPU_WEB_ROOT)) {
      const div = document.createElement('div');
      div.id = KhipuWeb.KHIPU_WEB_ROOT;
      document.body.appendChild(div);
    }
  }

  ensureKhipuIsSet(): Promise<any> {
    const start = Date.now();
    return new Promise(waitForKhipu); // set the promise object within the ensureFooIsSet object
    function waitForKhipu(resolve: (arg0: any) => void, reject: (arg0: Error) => void) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof Khipu !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        resolve(Khipu);
      } else if (KhipuWeb.KWS_TIMEOUT && (Date.now() - start) >= KhipuWeb.KWS_TIMEOUT)
        reject(new Error("timeout waiting for kws to inject Khipu"));
      else {
        setTimeout(() => {
          waitForKhipu(resolve, reject)
        }, 50);
      }
    }
  }

  async startKhipu(options: StartOperationOptions): Promise<any> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.khipu = new Khipu();

      let theme = options.options.theme ?? 'light'
      if (theme === 'system') {
        if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
          theme = 'dark'
        } else {
          theme = 'light'
        }
      }
      let primaryColor = undefined
      if (theme === 'light' && options.options.colors?.lightPrimary !== undefined) {
        primaryColor = options.options.colors?.lightPrimary
      } else if (theme === 'dark' && options.options.colors?.darkPrimary !== undefined) {
        primaryColor = options.options.colors?.darkPrimary
      }

      const khipuOptions = {
        mountElement: document.getElementById(KhipuWeb.KHIPU_WEB_ROOT), //Elemento ancla
        modal: true,
        options: {
          style: {
            ...(primaryColor !== undefined ? {primaryColor: primaryColor} : {}),
            theme: theme,
          },
          skipExitPage: options.options?.skipExitPage !== undefined ? options.options.skipExitPage : false,
        },
      }
      this.khipu.startOperation(options.operationId, (result: KhipuResult)=>{
        resolve(result)
      }, khipuOptions);
    })
  }
}
