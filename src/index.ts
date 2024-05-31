import { registerPlugin } from '@capacitor/core';

import type { KhipuPlugin } from './definitions';

const Khipu = registerPlugin<KhipuPlugin>('Khipu', {
  web: () => import('./web').then(m => new m.KhipuWeb()),
});

export * from './definitions';
export { Khipu };
