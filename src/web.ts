import { WebPlugin } from '@capacitor/core';

import type { KhipuPlugin } from './definitions';

export class KhipuWeb extends WebPlugin implements KhipuPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
