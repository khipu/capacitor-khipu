# Migración a SPM y soporte de Capacitor 7 y 8 — Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL REQUERIDA: usa
> superpowers:subagent-driven-development (recomendado) o
> superpowers:executing-plans para implementar este plan tarea por tarea. Los
> pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Goal:** Publicar `capacitor-khipu` con soporte de Swift Package Manager junto a
CocoaPods, en dos líneas mantenidas (3.x para Capacitor 7, 4.x para Capacitor 8),
con una app de prueba que permita ejercitar todos los flags del cliente.

**Architecture:** Branch por major de Capacitor, siguiendo el modelo de
`ionic-team/capacitor-plugins`. `main` sostiene la línea 4.x (Capacitor 8, iOS 15,
SPM en la app de ejemplo) y el branch `7.x` sostiene la línea 3.x (Capacitor 7,
iOS 14, CocoaPods en la app de ejemplo). Ambas líneas exponen `Package.swift` y
podspec. El trabajo común se hace en `main` antes de cortar `7.x`, y después se
porta con `git cherry-pick`.

**Tech Stack:** TypeScript + Rollup, Swift + Swift Package Manager + CocoaPods,
Java + Gradle, Vitest + jsdom, XCTest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-04-migracion-spm-capacitor-8-design.md`

## Global Constraints

- `KhipuClientIOS` se fija **exacto** en `2.16.5`, en `Package.swift` (`exact:`) y
  en el podspec (`s.dependency 'KhipuClientIOS', '2.16.5'`). Las versiones
  anteriores a `2.16.3` no tienen `Package.swift` y no se pueden consumir por SPM.
- `khipu-client-android` se queda en `2.27.0`, que ya es la última.
- Nombres SPM obligatorios: el `name:` del package **y** del product deben ser
  exactamente `CapacitorKhipu`; el target es `KhipuPlugin`. El CLI de Capacitor
  genera `.product(name: "CapacitorKhipu", package: "CapacitorKhipu")` y si no
  coinciden la resolución de `CapApp-SPM` falla.
- Línea `main` (4.x): Capacitor 8, `peerDependencies` `">=8.0.0"`, `Package.swift`
  con `platforms: [.iOS(.v15)]` y `capacitor-swift-pm` `from: "8.0.0"`, podspec
  `deployment_target = '15.0'`, Android compileSdk/targetSdk 36, minSdk 24, AGP
  8.13.0, Gradle wrapper 8.14.3, Java 21.
- Línea `7.x` (3.x): Capacitor 7, `peerDependencies` `">=7.0.0"`, `Package.swift`
  con `platforms: [.iOS(.v14)]` y `capacitor-swift-pm` `from: "7.0.0"`, podspec
  `deployment_target = '14.0'`, Android compileSdk/targetSdk 35, minSdk 23, AGP
  8.7.2, Gradle wrapper 8.11.1, Java 21.
- Paleta de marca Khipu para el harness: púrpura `#8347AD`, cian `#3CB4E5`.
- **Nunca** hacer cherry-pick de `example/ios/**`, `example/android/**` ni
  `example/package.json`: son específicos de cada branch. Solo se porta
  `example/src/**`.
- `2.11.2` se publica con `npm publish --tag cap6` explícito, para que `latest` no
  retroceda a una línea congelada.
- **Todo `npm publish` y todo `git push` requiere confirmación explícita del
  usuario antes de ejecutarse.** Son acciones hacia afuera e irreversibles.
- El tooling JS (Vitest, ESLint, Prettier, Rollup, TypeScript, docgen) se mantiene
  idéntico en ambos branches: es independiente del major de Capacitor.
- **Node ≥22 en las dos líneas.** `@capacitor/cli@8.5.1` declara
  `engines.node >= 22.0.0`, y Vitest 5 / jsdom 30 lo exigen en runtime. Se declara en
  `package.json` (`engines`) y en `.nvmrc`, y el CI usa `node-version: 22`. Para la
  línea de Capacitor 7 es más estricto de lo que Capacitor pide (`>=20.0.0`), pero se
  mantiene igual porque el tooling JS es compartido.

## Estructura de archivos

**Raíz del plugin**

| Archivo | Responsabilidad |
| --- | --- |
| `Package.swift` | manifest SPM: nombres, plataforma, dependencias, targets |
| `CapacitorKhipu.podspec` | manifest CocoaPods, espejo del anterior |
| `vitest.config.ts` | configuración de tests JS (entorno jsdom, qué archivos incluir) |
| `.nvmrc` | versión de Node del proyecto (`22`), espejo de `engines` |
| `scripts/check-native-versions.mjs` | guarda que impide que el podspec y `Package.swift` se desincronicen |
| `scripts/check-option-keys.mjs` | guarda que impide que el vocabulario de opciones derive entre sus cuatro superficies |
| `.github/workflows/ci.yml` | lint, tests, builds de iOS y Android, build de la app de ejemplo |

**iOS** (`ios/Sources/KhipuPlugin/`)

| Archivo | Responsabilidad |
| --- | --- |
| `KhipuPlugin.swift` | puente con Capacitor: valida la llamada, lanza el SDK, resuelve la promesa |
| `KhipuOptionsDraft.swift` | tipos intermedios inspeccionables (`KhipuOptionsDraft`, `KhipuColorsDraft`) |
| `KhipuOptionsMapper.swift` | traducción JS → draft → `KhipuOptions`, con casts seguros |

**Harness** (`example/src/`)

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | estructura de la página |
| `css/harness.css` | estilos, paleta Khipu, soporte de tema claro y oscuro |
| `js/fields.js` | esquema de los 21 campos, presets, construcción del estado inicial |
| `js/payload.js` | función pura estado → payload de `startOperation` |
| `js/storage.js` | persistencia en `localStorage`, tolerante a estados de versiones anteriores |
| `js/ui.js` | render del formulario desde el esquema y del payload |
| `js/result.js` | render del `KhipuResult` y de la tabla de eventos |
| `js/example.js` | punto de entrada: monta, escucha, llama al plugin |

---

# Fase 1 — Base común en `main`

No toca versiones de Capacitor. Al terminar, `main` sigue soportando lo mismo que
hoy pero con el harness completo y los defectos de la capa web corregidos.

## Task 1: Infraestructura de tests JS y corrección de las estáticas de `web.ts`

**Files:**
- Create: `vitest.config.ts`
- Create: `src/web.test.ts`
- Modify: `src/web.ts:8-10`
- Modify: `package.json` (devDependencies, scripts `test` y `verify`)

**Interfaces:**
- Consumes: nada.
- Produces: `npm test` corre `vitest run`. `KhipuWeb.KHIPU_WEB_ROOT` vale
  `'khipu-web-root'` y `KhipuWeb.KWS_TIMEOUT` vale `10000` en runtime.

**Contexto:** `src/web.ts:8-10` declara tres estáticas, pero dos usan `:` en vez de
`=`. En TypeScript eso es una anotación de tipo sin inicializador, así que
`KHIPU_WEB_ROOT` y `KWS_TIMEOUT` quedan `undefined` en runtime. La consecuencia es
que la guarda `KhipuWeb.KWS_TIMEOUT && ...` de `ensureKhipuIsSet` es siempre falsa
y el timeout de 10 segundos nunca se dispara: si `js.khipu.com/v1/kws.js` no carga,
la promesa nunca se resuelve ni se rechaza.

- [ ] **Step 1: Crear el branch de trabajo y commitear el spec y el plan**

```bash
git checkout -b feat/base-comun
git add docs/superpowers/specs docs/superpowers/plans
git commit -m "docs: agregar diseño y plan de la migración a SPM"
```

- [ ] **Step 2: Instalar Vitest y jsdom**

No se fijan versiones a mano; se deja que npm elija las últimas y queden
registradas en `package-lock.json`.

```bash
npm install --save-dev vitest jsdom
```

- [ ] **Step 3: Crear `vitest.config.ts`**

`environment: 'jsdom'` es necesario porque el constructor de `KhipuWeb` toca
`document`. El `include` cubre los tres lugares donde habrá tests a lo largo del
plan.

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'example/src/**/*.test.js', 'scripts/**/*.test.mjs'],
  },
});
```

- [ ] **Step 3b: Agregar `root: true` al `eslintConfig`**

Sin esto, ESLint sube por el árbol de directorios buscando configuración y, cuando
el checkout está anidado dentro de otro (por ejemplo un worktree en
`<repo>/.claude/worktrees/…`), encuentra el `package.json` del padre con el mismo
`eslintConfig` y carga `eslint-plugin-import` dos veces, abortando con
`ESLint couldn't determine the plugin "import" uniquely`. Un paquete autocontenido
no debe heredar configuración de arriba.

En `package.json`:

```json
  "eslintConfig": {
    "root": true,
    "extends": "@ionic/eslint-config/recommended"
  },
```

Verificar: `npx eslint . --ext ts` sale con código 0 y sin salida.

- [ ] **Step 4: Agregar los scripts a `package.json`**

En el objeto `scripts`, agregar `test` y sumarlo a `verify`:

```json
    "verify": "npm run test && npm run verify:ios && npm run verify:android && npm run verify:web",
    "test": "vitest run",
```

- [ ] **Step 5: Escribir el test que falla**

Los tests importan `describe`/`it`/`expect` explícitamente en vez de usar globales,
para no tener que tocar la configuración de ESLint.

Crear `src/web.test.ts`:

```ts
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
```

- [ ] **Step 6: Correr los tests y confirmar que fallan**

Run: `npm test`

Expected: los dos tests fallan. El primero con
`expected null not to be null`, porque el div se crea con `id="undefined"`. El
segundo con `Test timed out in 5000ms`, porque la promesa nunca se rechaza — que
es exactamente el defecto.

- [ ] **Step 7: Corregir las tres estáticas**

En `src/web.ts`, reemplazar:

```ts
  private static KWS_SCRIPT_ID = 'kws_script_id';
  private static KHIPU_WEB_ROOT: 'khipu-web-root';
  private static KWS_TIMEOUT: 10_000
```

por:

```ts
  private static KWS_SCRIPT_ID = 'kws_script_id';
  private static KHIPU_WEB_ROOT = 'khipu-web-root';
  private static KWS_TIMEOUT = 10_000;
```

- [ ] **Step 8: Correr los tests y confirmar que pasan**

Run: `npm test`

Expected: `2 passed`.

- [ ] **Step 9: Formatear, lintear y verificar que el build sigue en pie**

```bash
npm run fmt
npm run eslint
npm run verify:web
```

Expected: sin errores.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/web.ts src/web.test.ts
git commit -m "fix(web): asignar KHIPU_WEB_ROOT y KWS_TIMEOUT, que quedaban undefined"
```

---

## Task 2: Esquema de campos y constructor de payload

**Files:**
- Create: `example/src/js/fields.js`
- Create: `example/src/js/payload.js`
- Create: `example/src/js/payload.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `OPTION_FIELDS: Array<{ key, type, label, default, webSupported, options? }>` — 9 entradas.
  - `COLOR_FIELDS: Array<{ key, default, webSupported }>` — 12 entradas.
  - `PRESETS: Array<{ id, label, optionKeys, colorKeys, overrides? }>`.
  - `initialState(): { operationId: string, options: Record<string, {include, value}>, colors: { include: boolean, fields: Record<string, {include, value}> } }`.
  - `applyPreset(state, preset): State`.
  - `buildPayload(state): { operationId: string, options: object }`.

**Contexto:** el plugin distingue "clave ausente" de `false`. Ver
`options.has("showFooter")` en `android/src/main/java/com/khipu/capacitor/KhipuPlugin.java`
y `options!["showFooter"] != nil` en `ios/Sources/KhipuPlugin/KhipuPlugin.swift`.
Los valores por omisión del SDK iOS son `showFooter = true`,
`showMerchantLogo = true`, `showPaymentDetails = true`, `theme = .system`,
`locale = "es_CL"`, `skipExitPage = false`, `skipExitSuccessPage = false`. Si el
harness enviara siempre los cinco booleanos sería imposible probar ese
comportamiento por omisión, que es el que ve un comercio que no configura nada.

- [ ] **Step 1: Escribir el esquema de campos**

Crear `example/src/js/fields.js`:

```js
/**
 * Única fuente de verdad de los campos que el harness puede enviar. Refleja la
 * interfaz `KhipuOptions` de `src/definitions.ts`.
 *
 * `webSupported: false` marca los campos que `src/web.ts` recibe pero ignora, de
 * modo que el harness pueda advertirlo en vez de dar la impresión de que el flag
 * está roto.
 */
export const OPTION_FIELDS = [
  { key: 'title', type: 'text', label: 'title', default: 'Demo Capacitor', webSupported: false },
  { key: 'titleImageUrl', type: 'text', label: 'titleImageUrl', default: '', webSupported: false },
  { key: 'locale', type: 'text', label: 'locale', default: 'es_CL', webSupported: false },
  {
    key: 'theme',
    type: 'select',
    label: 'theme',
    default: 'light',
    choices: ['light', 'dark', 'system'],
    webSupported: true,
  },
  { key: 'skipExitPage', type: 'bool', label: 'skipExitPage', default: false, webSupported: true },
  {
    key: 'skipExitSuccessPage',
    type: 'bool',
    label: 'skipExitSuccessPage',
    default: false,
    webSupported: true,
  },
  { key: 'showFooter', type: 'bool', label: 'showFooter', default: true, webSupported: false },
  {
    key: 'showMerchantLogo',
    type: 'bool',
    label: 'showMerchantLogo',
    default: false,
    webSupported: false,
  },
  {
    key: 'showPaymentDetails',
    type: 'bool',
    label: 'showPaymentDetails',
    default: true,
    webSupported: false,
  },
];

export const COLOR_FIELDS = [
  { key: 'lightBackground', default: '#FFFFFF', webSupported: false },
  { key: 'lightOnBackground', default: '#1A1A1A', webSupported: false },
  { key: 'lightPrimary', default: '#8347AD', webSupported: true },
  { key: 'lightOnPrimary', default: '#FFFFFF', webSupported: false },
  { key: 'lightTopBarContainer', default: '#8347AD', webSupported: false },
  { key: 'lightOnTopBarContainer', default: '#FFFFFF', webSupported: false },
  { key: 'darkBackground', default: '#121212', webSupported: false },
  { key: 'darkOnBackground', default: '#EDEDED', webSupported: false },
  { key: 'darkPrimary', default: '#3CB4E5', webSupported: true },
  { key: 'darkOnPrimary', default: '#0B0B0B', webSupported: false },
  { key: 'darkTopBarContainer', default: '#1E1E1E', webSupported: false },
  { key: 'darkOnTopBarContainer', default: '#3CB4E5', webSupported: false },
];

export const PRESETS = [
  { id: 'defaults', label: 'Todo por defecto', optionKeys: [], colorKeys: null },
  {
    id: 'khipu',
    label: 'Marca Khipu',
    optionKeys: ['title', 'theme'],
    colorKeys: [
      'lightPrimary',
      'lightOnPrimary',
      'lightTopBarContainer',
      'lightOnTopBarContainer',
      'darkPrimary',
      'darkOnPrimary',
    ],
  },
  {
    id: 'all',
    label: 'Todo activado',
    optionKeys: OPTION_FIELDS.map((field) => field.key),
    colorKeys: COLOR_FIELDS.map((field) => field.key),
  },
  {
    id: 'dark',
    label: 'Modo oscuro',
    optionKeys: ['theme'],
    colorKeys: [
      'darkBackground',
      'darkOnBackground',
      'darkPrimary',
      'darkOnPrimary',
      'darkTopBarContainer',
      'darkOnTopBarContainer',
    ],
    overrides: { theme: 'dark' },
  },
];

/** Estado inicial: ningún campo incluido, todos con su valor sugerido cargado. */
export function initialState() {
  const options = {};
  for (const field of OPTION_FIELDS) {
    options[field.key] = { include: false, value: field.default };
  }

  const fields = {};
  for (const field of COLOR_FIELDS) {
    fields[field.key] = { include: false, value: field.default };
  }

  return { operationId: '', options, colors: { include: false, fields } };
}

/** Un preset reemplaza qué se incluye, pero preserva el `operationId` tipeado. */
export function applyPreset(state, preset) {
  const next = initialState();
  next.operationId = state.operationId;

  for (const key of preset.optionKeys) {
    next.options[key].include = true;
  }

  for (const [key, value] of Object.entries(preset.overrides ?? {})) {
    next.options[key].value = value;
  }

  if (preset.colorKeys) {
    next.colors.include = true;
    for (const key of preset.colorKeys) {
      next.colors.fields[key].include = true;
    }
  }

  return next;
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `example/src/js/payload.test.js`:

```js
import { describe, expect, it } from 'vitest';

import { COLOR_FIELDS, OPTION_FIELDS, PRESETS, applyPreset, initialState } from './fields.js';
import { buildPayload } from './payload.js';

describe('buildPayload', () => {
  it('con el estado inicial envía solo el operationId', () => {
    const state = initialState();
    state.operationId = 'abc123';

    expect(buildPayload(state)).toEqual({ operationId: 'abc123', options: {} });
  });

  it('omite la clave de un campo no incluido', () => {
    const state = initialState();
    state.options.showFooter.include = false;
    state.options.showFooter.value = true;

    expect(buildPayload(state).options).not.toHaveProperty('showFooter');
  });

  it('envía false cuando el campo está incluido en false', () => {
    const state = initialState();
    state.options.showFooter.include = true;
    state.options.showFooter.value = false;

    expect(buildPayload(state).options.showFooter).toBe(false);
  });

  it('no envía la clave colors si el objeto no está incluido', () => {
    const state = initialState();
    state.colors.include = false;
    state.colors.fields.lightPrimary.include = true;

    expect(buildPayload(state).options).not.toHaveProperty('colors');
  });

  it('envía colors vacío si el objeto está incluido sin ningún color', () => {
    const state = initialState();
    state.colors.include = true;

    expect(buildPayload(state).options.colors).toEqual({});
  });

  it('envía solo los colores marcados', () => {
    const state = initialState();
    state.colors.include = true;
    state.colors.fields.lightPrimary.include = true;
    state.colors.fields.darkPrimary.include = true;

    expect(buildPayload(state).options.colors).toEqual({
      lightPrimary: '#8347AD',
      darkPrimary: '#3CB4E5',
    });
  });
});

describe('applyPreset', () => {
  it('el preset "all" incluye los 9 campos y los 12 colores', () => {
    const preset = PRESETS.find((item) => item.id === 'all');
    const payload = buildPayload(applyPreset(initialState(), preset));

    expect(Object.keys(payload.options)).toHaveLength(OPTION_FIELDS.length + 1);
    expect(Object.keys(payload.options.colors)).toHaveLength(COLOR_FIELDS.length);
  });

  it('el preset "defaults" no incluye nada', () => {
    const preset = PRESETS.find((item) => item.id === 'defaults');
    const payload = buildPayload(applyPreset(initialState(), preset));

    expect(payload.options).toEqual({});
  });

  it('el preset "dark" fuerza el valor del tema', () => {
    const preset = PRESETS.find((item) => item.id === 'dark');
    const payload = buildPayload(applyPreset(initialState(), preset));

    expect(payload.options.theme).toBe('dark');
  });

  it('preserva el operationId ya tipeado', () => {
    const state = initialState();
    state.operationId = 'no-me-borres';
    const preset = PRESETS.find((item) => item.id === 'khipu');

    expect(applyPreset(state, preset).operationId).toBe('no-me-borres');
  });
});
```

- [ ] **Step 3: Correr los tests y confirmar que fallan**

Run: `npx vitest run example/src/js/payload.test.js`

Expected: FAIL con `Failed to resolve import "./payload.js"`.

- [ ] **Step 4: Escribir el constructor de payload**

Crear `example/src/js/payload.js`:

```js
/**
 * Construye el payload de `Khipu.startOperation` a partir del estado del
 * formulario.
 *
 * El plugin distingue "clave ausente" de `false`, así que cada campo lleva su
 * propio `include` y aquí solo se agregan los marcados. Un campo sin marcar deja
 * que el SDK nativo aplique su valor por omisión.
 */
export function buildPayload(state) {
  const options = {};

  for (const [key, entry] of Object.entries(state.options)) {
    if (entry.include) {
      options[key] = entry.value;
    }
  }

  if (state.colors.include) {
    const colors = {};
    for (const [key, entry] of Object.entries(state.colors.fields)) {
      if (entry.include) {
        colors[key] = entry.value;
      }
    }
    options.colors = colors;
  }

  return { operationId: state.operationId, options };
}
```

- [ ] **Step 5: Correr los tests y confirmar que pasan**

Run: `npx vitest run example/src/js/payload.test.js`

Expected: `10 passed`.

- [ ] **Step 6: Commit**

```bash
npm run prettier -- --write "example/src/js/*.js"
git add example/src/js/fields.js example/src/js/payload.js example/src/js/payload.test.js
git commit -m "feat(example): esquema de campos y constructor de payload con tri-estado"
```

---

## Task 3: Persistencia, estructura de la página y render del formulario

**Files:**
- Create: `example/src/js/storage.js`
- Create: `example/src/js/storage.test.js`
- Create: `example/src/js/ui.js`
- Create: `example/src/css/harness.css`
- Modify: `example/src/index.html`

**Interfaces:**
- Consumes: `OPTION_FIELDS`, `COLOR_FIELDS`, `PRESETS`, `initialState` de `fields.js`.
- Produces:
  - `loadState(fallback): State` y `saveState(state): void` de `storage.js`.
  - `renderOptions(container, state, onChange): void`, `renderColors(container, state, onChange): void`,
    `renderPresets(container, onSelect): void`, `renderPayload(container, payload): void` de `ui.js`.
- Los ids del DOM que `ui.js` y `example.js` esperan encontrar en `index.html`:
  `operationId`, `presets`, `options`, `colors-include`, `colors`, `payload`,
  `start`, `result`, `platform-note`.

- [ ] **Step 1: Escribir el test de persistencia que falla**

El caso que importa es el de compatibilidad: un estado guardado por una versión
anterior del harness, con menos campos, no debe dejar el formulario roto.

Crear `example/src/js/storage.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';

import { initialState } from './fields.js';
import { loadState, saveState } from './storage.js';

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sin nada guardado devuelve el fallback', () => {
    expect(loadState(initialState())).toEqual(initialState());
  });

  it('recupera lo que se guardó', () => {
    const state = initialState();
    state.operationId = 'abc123';
    state.options.showFooter.include = true;
    saveState(state);

    expect(loadState(initialState())).toEqual(state);
  });

  it('ignora un estado guardado corrupto', () => {
    window.localStorage.setItem('capacitor-khipu-harness', '{no es json');

    expect(loadState(initialState())).toEqual(initialState());
  });

  it('completa los campos que faltan en un estado de una versión anterior', () => {
    window.localStorage.setItem(
      'capacitor-khipu-harness',
      JSON.stringify({ operationId: 'abc123', options: { showFooter: { include: true, value: false } } }),
    );

    const state = loadState(initialState());

    expect(state.operationId).toBe('abc123');
    expect(state.options.showFooter).toEqual({ include: true, value: false });
    expect(state.options.showMerchantLogo).toEqual({ include: false, value: false });
    expect(state.colors.include).toBe(false);
  });

  it('descarta claves guardadas que ya no existen en el esquema', () => {
    window.localStorage.setItem(
      'capacitor-khipu-harness',
      JSON.stringify({ operationId: '', options: { flagQueYaNoExiste: { include: true, value: 1 } } }),
    );

    expect(loadState(initialState()).options).not.toHaveProperty('flagQueYaNoExiste');
  });
});
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx vitest run example/src/js/storage.test.js`

Expected: FAIL con `Failed to resolve import "./storage.js"`.

- [ ] **Step 3: Escribir la persistencia**

Crear `example/src/js/storage.js`:

```js
const STORAGE_KEY = 'capacitor-khipu-harness';

/**
 * El estado guardado puede venir de una versión anterior del harness, con menos
 * campos o con campos que ya no existen. Se toma la forma de `fallback` como
 * autoridad y solo se copian los valores de claves conocidas, para que agregar un
 * flag no rompa la sesión guardada.
 */
function merge(fallback, stored) {
  const state = JSON.parse(JSON.stringify(fallback));

  if (typeof stored?.operationId === 'string') {
    state.operationId = stored.operationId;
  }

  for (const key of Object.keys(state.options)) {
    const entry = stored?.options?.[key];
    if (entry) {
      state.options[key] = {
        include: Boolean(entry.include),
        value: entry.value ?? state.options[key].value,
      };
    }
  }

  if (stored?.colors) {
    state.colors.include = Boolean(stored.colors.include);
    for (const key of Object.keys(state.colors.fields)) {
      const entry = stored.colors.fields?.[key];
      if (entry) {
        state.colors.fields[key] = {
          include: Boolean(entry.include),
          value: entry.value ?? state.colors.fields[key].value,
        };
      }
    }
  }

  return state;
}

export function loadState(fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? merge(fallback, JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sin persistencia el harness sigue funcionando; no vale la pena interrumpir.
  }
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx vitest run example/src/js/storage.test.js`

Expected: `5 passed`.

- [ ] **Step 5: Escribir el render del formulario**

Crear `example/src/js/ui.js`:

```js
import { COLOR_FIELDS, OPTION_FIELDS, PRESETS } from './fields.js';

/**
 * Cada fila lleva la casilla `incluir` más el control del valor. El control queda
 * deshabilitado mientras el campo no esté incluido, para que se vea de un golpe
 * qué se va a enviar de verdad.
 */
function row(field, entry, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'row';

  const include = document.createElement('input');
  include.type = 'checkbox';
  include.checked = entry.include;
  include.id = `include-${field.key}`;
  include.addEventListener('change', () => onChange({ include: include.checked, value: entry.value }));

  const label = document.createElement('label');
  label.htmlFor = `include-${field.key}`;
  label.textContent = field.label ?? field.key;
  if (!field.webSupported) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.title = 'src/web.ts ignora este campo; solo tiene efecto en iOS y Android';
    badge.textContent = 'sin web';
    label.appendChild(badge);
  }

  wrapper.append(include, label, control(field, entry, onChange));
  return wrapper;
}

function control(field, entry, onChange) {
  const emit = (value) => onChange({ include: entry.include, value });

  if (field.type === 'select') {
    const select = document.createElement('select');
    select.disabled = !entry.include;
    for (const choice of field.choices) {
      const option = document.createElement('option');
      option.value = choice;
      option.textContent = choice;
      option.selected = choice === entry.value;
      select.appendChild(option);
    }
    select.addEventListener('change', () => emit(select.value));
    return select;
  }

  const input = document.createElement('input');
  input.disabled = !entry.include;

  if (field.type === 'bool') {
    input.type = 'checkbox';
    input.className = 'value-bool';
    input.checked = Boolean(entry.value);
    input.addEventListener('change', () => emit(input.checked));
    return input;
  }

  if (field.type === 'color') {
    input.type = 'color';
    input.value = entry.value;
    input.addEventListener('input', () => emit(input.value.toUpperCase()));
    return input;
  }

  input.type = 'text';
  input.value = entry.value ?? '';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.addEventListener('input', () => emit(input.value));
  return input;
}

export function renderOptions(container, state, onChange) {
  container.replaceChildren(
    ...OPTION_FIELDS.map((field) =>
      row(field, state.options[field.key], (entry) => onChange(field.key, entry)),
    ),
  );
}

export function renderColors(container, state, onChange) {
  container.replaceChildren(
    ...COLOR_FIELDS.map((field) =>
      row({ ...field, type: 'color' }, state.colors.fields[field.key], (entry) =>
        onChange(field.key, entry),
      ),
    ),
  );
}

export function renderPresets(container, onSelect) {
  container.replaceChildren(
    ...PRESETS.map((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = preset.label;
      button.addEventListener('click', () => onSelect(preset));
      return button;
    }),
  );
}

export function renderPayload(container, payload) {
  container.textContent = JSON.stringify(payload, null, 2);
}
```

- [ ] **Step 6: Escribir la estructura de la página**

Reemplazar `example/src/index.html` por:

```html
<!doctype html>
<html lang="es" dir="ltr">
  <head>
    <meta charset="UTF-8" />
    <title>Harness capacitor-khipu</title>
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0" />
    <meta name="format-detection" content="telephone=no" />
    <link rel="stylesheet" href="./css/harness.css" />
  </head>
  <body>
    <header>
      <h1>Harness <code>capacitor-khipu</code></h1>
      <p id="platform-note" class="note"></p>
    </header>

    <main>
      <section>
        <h2>Operación</h2>
        <label for="operationId">operationId</label>
        <input id="operationId" type="text" autocomplete="off" spellcheck="false" />
      </section>

      <section>
        <h2>Presets</h2>
        <div id="presets" class="presets"></div>
      </section>

      <section>
        <h2>Opciones</h2>
        <p class="hint">
          Marca <strong>incluir</strong> para enviar la clave. Sin marcar, la clave no va en el
          payload y el SDK nativo aplica su valor por omisión.
        </p>
        <div id="options"></div>
      </section>

      <section>
        <h2>Colores</h2>
        <label class="row">
          <input id="colors-include" type="checkbox" />
          enviar el objeto <code>colors</code>
        </label>
        <div id="colors"></div>
      </section>

      <section>
        <h2>Payload</h2>
        <pre id="payload"></pre>
        <button id="start" type="button" class="primary">Iniciar operación</button>
      </section>

      <section>
        <h2>Resultado</h2>
        <div id="result"></div>
      </section>
    </main>

    <script src="./js/example.js" type="module"></script>
  </body>
</html>
```

- [ ] **Step 7: Escribir los estilos**

Crear `example/src/css/harness.css`:

```css
:root {
  color-scheme: light dark;
  --khipu-purple: #8347ad;
  --khipu-cyan: #3cb4e5;
  --bg: #ffffff;
  --surface: #f6f4f9;
  --text: #1a1a1a;
  --muted: #5c5c66;
  --border: #dcd7e3;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #141218;
    --surface: #1e1b23;
    --text: #ededf2;
    --muted: #a09aa8;
    --border: #322c3a;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: env(safe-area-inset-top) 1rem 2rem;
  background: var(--bg);
  color: var(--text);
  font: 15px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  font-size: 1.25rem;
  margin: 1rem 0 0.25rem;
}

h1 code {
  color: var(--khipu-purple);
}

h2 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin: 0 0 0.75rem;
}

section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.note,
.hint {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
}

.row {
  display: grid;
  grid-template-columns: auto 1fr minmax(6rem, 10rem);
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--border);
}

.row:last-child {
  border-bottom: none;
}

.row label {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
}

.badge {
  margin-left: 0.4rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: var(--border);
  color: var(--muted);
  font-family: inherit;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

input[type='text'],
select {
  width: 100%;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
}

input[type='color'] {
  width: 100%;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
}

input[type='checkbox'] {
  accent-color: var(--khipu-purple);
  width: 1.1rem;
  height: 1.1rem;
}

input:disabled,
select:disabled {
  opacity: 0.45;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--khipu-purple);
  border-radius: 999px;
  background: transparent;
  color: var(--khipu-purple);
  font: inherit;
  cursor: pointer;
}

button.primary {
  width: 100%;
  margin-top: 0.75rem;
  border-color: transparent;
  background: var(--khipu-purple);
  color: #ffffff;
  font-weight: 600;
}

pre {
  max-height: 14rem;
  overflow: auto;
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

th,
td {
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.result-field {
  display: grid;
  grid-template-columns: minmax(7rem, auto) 1fr;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.85rem;
}

.result-field dt {
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.result-OK {
  color: #1a7f4b;
}

.result-ERROR {
  color: #b3261e;
}

.result-WARNING,
.result-CONTINUE {
  color: var(--khipu-cyan);
}
```

- [ ] **Step 8: Correr toda la batería de tests**

Run: `npm test`

Expected: `17 passed` (2 de `web.test.ts`, 10 de `payload.test.js`, 5 de `storage.test.js`).

- [ ] **Step 9: Commit**

```bash
npm run prettier -- --write "example/src/**/*.{js,css,html}"
git add example/src/index.html example/src/css example/src/js/storage.js example/src/js/storage.test.js example/src/js/ui.js
git commit -m "feat(example): estructura del harness, persistencia y render del formulario"
```

---

## Task 4: Punto de entrada, envío de la operación y render del resultado

**Files:**
- Create: `example/src/js/result.js`
- Create: `example/src/js/result.test.js`
- Modify: `example/src/js/example.js`

**Interfaces:**
- Consumes: `buildPayload` de `payload.js`; `initialState`, `applyPreset` de `fields.js`;
  `loadState`, `saveState` de `storage.js`; `renderOptions`, `renderColors`,
  `renderPresets`, `renderPayload` de `ui.js`; `Khipu` de `capacitor-khipu`.
- Produces: `renderResult(container, result): void` y `renderError(container, error): void` de `result.js`.

- [ ] **Step 1: Escribir el test del render de resultado que falla**

Crear `example/src/js/result.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';

import { renderError, renderResult } from './result.js';

describe('renderResult', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('muestra los campos del resultado', () => {
    renderResult(container, {
      operationId: 'abc123',
      exitTitle: 'Listo',
      exitMessage: 'Pago realizado',
      result: 'OK',
      events: [],
    });

    expect(container.textContent).toContain('abc123');
    expect(container.textContent).toContain('Pago realizado');
    expect(container.querySelector('.result-OK')).not.toBeNull();
  });

  it('lista los eventos en una tabla', () => {
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

  it('no rompe si faltan campos opcionales', () => {
    renderResult(container, { operationId: 'abc123', result: 'ERROR' });

    expect(container.textContent).toContain('abc123');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });

  it('renderError muestra el mensaje', () => {
    renderError(container, new Error('el puente no respondió'));

    expect(container.textContent).toContain('el puente no respondió');
  });
});
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx vitest run example/src/js/result.test.js`

Expected: FAIL con `Failed to resolve import "./result.js"`.

- [ ] **Step 3: Escribir el render de resultado**

Crear `example/src/js/result.js`:

```js
const FIELDS = [
  'operationId',
  'result',
  'exitTitle',
  'exitMessage',
  'exitUrl',
  'failureReason',
  'continueUrl',
];

function field(key, value, result) {
  const dt = document.createElement('dt');
  dt.textContent = key;

  const dd = document.createElement('dd');
  dd.textContent = String(value);
  if (key === 'result') {
    dd.className = `result-${result}`;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'result-field';
  wrapper.append(dt, dd);
  return wrapper;
}

function eventsTable(events) {
  const table = document.createElement('table');

  const head = table.createTHead().insertRow();
  for (const label of ['name', 'timestamp', 'type']) {
    const th = document.createElement('th');
    th.textContent = label;
    head.appendChild(th);
  }

  const body = table.createTBody();
  for (const event of events) {
    const tr = body.insertRow();
    for (const key of ['name', 'timestamp', 'type']) {
      tr.insertCell().textContent = event[key] ?? '';
    }
  }

  return table;
}

/** Los campos opcionales del `KhipuResult` pueden no venir; se omiten en silencio. */
export function renderResult(container, result) {
  const dl = document.createElement('dl');
  for (const key of FIELDS) {
    if (result[key] !== undefined && result[key] !== null) {
      dl.appendChild(field(key, result[key], result.result));
    }
  }

  container.replaceChildren(dl, eventsTable(result.events ?? []));
}

export function renderError(container, error) {
  const p = document.createElement('p');
  p.className = 'result-ERROR';
  p.textContent = error?.message ?? String(error);
  container.replaceChildren(p);
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx vitest run example/src/js/result.test.js`

Expected: `4 passed`.

- [ ] **Step 5: Escribir el punto de entrada**

Reemplazar `example/src/js/example.js` por:

```js
import { Capacitor } from '@capacitor/core';
import { Khipu } from 'capacitor-khipu';

import { COLOR_FIELDS, OPTION_FIELDS, applyPreset, initialState } from './fields.js';
import { buildPayload } from './payload.js';
import { renderError, renderResult } from './result.js';
import { loadState, saveState } from './storage.js';
import { renderColors, renderOptions, renderPayload, renderPresets } from './ui.js';

const dom = {
  operationId: document.getElementById('operationId'),
  presets: document.getElementById('presets'),
  options: document.getElementById('options'),
  colorsInclude: document.getElementById('colors-include'),
  colors: document.getElementById('colors'),
  payload: document.getElementById('payload'),
  start: document.getElementById('start'),
  result: document.getElementById('result'),
  platformNote: document.getElementById('platform-note'),
};

let state = loadState(initialState());

function render() {
  dom.operationId.value = state.operationId;
  dom.colorsInclude.checked = state.colors.include;
  renderOptions(dom.options, state, (key, entry) => apply(state.options, key, entry));
  renderColors(dom.colors, state, (key, entry) => apply(state.colors.fields, key, entry));
  renderPayload(dom.payload, buildPayload(state));
}

/**
 * Re-dibuja el formulario completo solo cuando cambia `include`, que es lo único
 * que altera el `disabled` del control y el aspecto de la fila. Para un cambio de
 * valor basta refrescar el preview.
 *
 * La distinción no es cosmética: `renderOptions` y `renderColors` usan
 * `replaceChildren`, así que un re-render destruye el input y le quita el foco a
 * quien esté tipeando. Sin esto, escribir en `title`, `titleImageUrl` o `locale`
 * pierde el foco en cada carácter.
 *
 * De paso cierra el riesgo del closure de `ui.js`: los handlers capturan `entry`
 * en el momento del render, y como todo cambio de `include` fuerza un re-render,
 * el `include` capturado nunca queda viejo.
 */
function apply(bag, key, entry) {
  const toggled = bag[key].include !== entry.include;
  bag[key] = entry;
  saveState(state);

  if (toggled) {
    render();
  } else {
    renderPayload(dom.payload, buildPayload(state));
  }
}

function commit() {
  saveState(state);
  render();
}

/**
 * En web, `src/web.ts` recibe el payload completo pero solo implementa `theme`,
 * `lightPrimary`/`darkPrimary`, `skipExitPage` y `skipExitSuccessPage`. Se avisa
 * arriba para que no se lea como un flag roto del plugin.
 */
function platformNote() {
  if (Capacitor.getPlatform() !== 'web') {
    return `Plataforma ${Capacitor.getPlatform()}: todos los campos tienen efecto.`;
  }

  const ignored = [...OPTION_FIELDS, ...COLOR_FIELDS]
    .filter((entry) => !entry.webSupported)
    .map((entry) => entry.key);

  return `Plataforma web: el fallback de src/web.ts ignora ${ignored.length} campos (${ignored.join(', ')}). Prueba en iOS o Android para ejercitarlos.`;
}

dom.platformNote.textContent = platformNote();

dom.operationId.addEventListener('input', () => {
  state.operationId = dom.operationId.value;
  saveState(state);
  renderPayload(dom.payload, buildPayload(state));
});

dom.colorsInclude.addEventListener('change', () => {
  state.colors.include = dom.colorsInclude.checked;
  commit();
});

renderPresets(dom.presets, (preset) => {
  state = applyPreset(state, preset);
  commit();
});

dom.start.addEventListener('click', async () => {
  dom.start.disabled = true;
  try {
    renderResult(dom.result, await Khipu.startOperation(buildPayload(state)));
  } catch (error) {
    renderError(dom.result, error);
  } finally {
    dom.start.disabled = false;
  }
});

render();
```

- [ ] **Step 6: Verificar el harness en el navegador**

```bash
cd example && npm install && npm start
```

Abrir la URL que imprime Vite y comprobar a mano:
- el aviso de plataforma web lista los campos ignorados;
- marcar `incluir` habilita el control y agrega la clave al payload;
- desmarcar la quita del payload;
- **escribir una palabra completa en `title` sin perder el foco** — esto verifica que
  un cambio de valor no re-dibuja el formulario;
- un booleano incluido en `false` aparece como `false` en el payload;
- los cuatro presets cambian el payload;
- recargar la página conserva el `operationId` y las casillas.

- [ ] **Step 7: Correr toda la batería y commitear**

Run: `npm test` (desde la raíz del plugin)

Expected: `21 passed`.

```bash
npm run prettier -- --write "example/src/js/*.js"
git add example/src/js/example.js example/src/js/result.js example/src/js/result.test.js
git commit -m "feat(example): harness con todos los flags del cliente"
```

- [ ] **Step 8: Integrar la Fase 1 a `main`**

Requiere confirmación del usuario antes del push.

```bash
git checkout main
git merge --no-ff feat/base-comun
```

---

# Fase 2 — Cierre de la línea 2.x

Se hace desde el tag `v2.11.1`, sin ninguno de los cambios de la Fase 1, para que
el último release de esta línea sea mínimo y de bajo riesgo.

## Task 5: Publicar `2.11.2` y congelar Capacitor 5 y 6

**Files:**
- Modify: `CapacitorKhipu.podspec` (en el branch `release/2.x`)
- Modify: `README.md` (en el branch `release/2.x`)
- Modify: `package.json` (versión)

**Interfaces:**
- Consumes: nada.
- Produces: `capacitor-khipu@2.11.2` en npm con dist-tag `cap6`.

- [ ] **Step 1: Crear el branch desde el tag**

```bash
git checkout -b release/2.x v2.11.1
```

- [ ] **Step 2: Subir `KhipuClientIOS` en el podspec**

En `CapacitorKhipu.podspec`, reemplazar:

```ruby
  s.dependency 'KhipuClientIOS', '2.16.2'
```

por:

```ruby
  s.dependency 'KhipuClientIOS', '2.16.5'
```

- [ ] **Step 3: Agregar la nota de fin de soporte al README**

Insertar justo después del título `# capacitor-khipu` en `README.md`:

```markdown
> **Fin de soporte.** Esta línea (`2.x`) es la última que soporta Capacitor 5 y 6,
> y ya no recibirá más cambios. Se instala con `npm install capacitor-khipu@cap6`.
>
> - Para Capacitor 7: `npm install capacitor-khipu@cap7`
> - Para Capacitor 8: `npm install capacitor-khipu`
>
> Ambas líneas soportan CocoaPods y Swift Package Manager.
```

Y en la sección *Jetpack compose and Kotlin* del mismo README, subir la recomendación
de `org.jetbrains.kotlin:kotlin-gradle-plugin` de `1.9.0` a `2.0.21`, que es la versión
con la que está compilado el `khipu-client-android 2.27.0` que esta línea empaqueta.
Recomendar 1.9.0 deja al comercio un major de Kotlin por detrás de la biblioteca que
consume.

- [ ] **Step 4: Fijar la versión y verificar**

```bash
npm version 2.11.2 --no-git-tag-version
npm run verify:web
```

Expected: el build pasa.

- [ ] **Step 5: Commit y tag**

```bash
git add CapacitorKhipu.podspec README.md package.json
git commit -m "chore: release 2.11.2 con KhipuClientIOS 2.16.5 y aviso de fin de soporte"
git tag v2.11.2
```

- [ ] **Step 6: Publicar**

**Requiere confirmación explícita del usuario antes de ejecutar.** El `--tag cap6`
no es opcional: sin él, `2.11.2` pasaría a ser `latest` en npm y `latest`
retrocedería a una línea congelada.

```bash
npm publish --tag cap6
git push origin release/2.x --tags
```

- [ ] **Step 7: Comprobar los dist-tags en npm**

Run: `npm view capacitor-khipu dist-tags`

Expected: `cap6: '2.11.2'` y `latest: '2.11.1'`.

---

# Fase 3 — `main` a Capacitor 7 y nacimiento de SPM

## Task 6: Subir el tooling y el build a Capacitor 7

**Files:**
- Modify: `package.json` (devDependencies, peerDependencies, scripts)
- Modify: `android/build.gradle`
- Modify: `android/gradle/wrapper/gradle-wrapper.properties`
- Rename: `rollup.config.js` → `rollup.config.mjs`

**Interfaces:**
- Consumes: nada.
- Produces: el plugin compila contra Capacitor 7; `npm run verify:android` pasa con Java 21.

- [ ] **Step 1: Crear el branch de trabajo**

```bash
git checkout main
git checkout -b feat/capacitor-7
```

- [ ] **Step 2: Alinear las devDependencies de Capacitor en 6 antes de migrar**

La herramienta de migración asume un plugin en Capacitor 6. El código ya está en
forma de Capacitor 6 (usa `CAPBridgedPlugin` y el layout `ios/Sources`), pero las
devDependencies siguen en 5; se alinean primero para que la herramienta parta de
un estado consistente.

```bash
npm install --save-dev @capacitor/core@^6 @capacitor/ios@^6 @capacitor/android@^6
npm run verify:web
```

Expected: el build pasa.

- [ ] **Step 3: Correr la herramienta oficial de migración**

```bash
npx @capacitor/plugin-migration-v6-to-v7@latest
```

- [ ] **Step 4: Revisar el diff completo a mano**

Run: `git diff`

No se acepta ningún cambio sin leerlo. Confirmar contra la guía oficial que quedó:
`compileSdk`/`targetSdkVersion` en 35, `minSdkVersion` en 23, el classpath de AGP
en `8.7.2`, `sourceCompatibility` y `targetCompatibility` en `VERSION_21`, y el
`distributionUrl` del wrapper en `gradle-8.11.1-all.zip`. Corregir a mano lo que
la herramienta no haya tocado o haya tocado de más.

- [ ] **Step 5: Ajustar `package.json` a mano**

Fijar el rango de Capacitor y las devDependencies del tooling JS. En
`peerDependencies`:

```json
  "peerDependencies": {
    "@capacitor/core": ">=7.0.0"
  },
```

Y actualizar el tooling JS, que es independiente del major de Capacitor:

```bash
npm install --save-dev @capacitor/core@^7 @capacitor/ios@^7 @capacitor/android@^7 @capacitor/cli@^7
npm install --save-dev @capacitor/docgen@latest typescript@^5 rollup@^4 prettier@^3 prettier-plugin-java@^2 eslint@^8 rimraf@^6 @ionic/eslint-config@latest @ionic/prettier-config@latest @ionic/swiftlint-config@latest swiftlint@^2
```

- [ ] **Step 6: Adaptar los scripts a Prettier 3 y Rollup 4**

Prettier 3 ya no carga los plugins de forma implícita y Rollup 4 requiere que la
configuración sea un módulo ESM.

```bash
git mv rollup.config.js rollup.config.mjs
```

En `package.json`, cambiar estas dos entradas de `scripts`:

```json
    "prettier": "prettier \"**/*.{css,html,ts,js,java}\" --plugin=prettier-plugin-java",
    "build": "npm run clean && npm run docgen && tsc && rollup -c rollup.config.mjs",
```

- [ ] **Step 7: Verificar los tres frentes**

```bash
npm run verify:web
npm test
npm run lint
cd android && ./gradlew clean build test && cd ..
```

Expected: los cuatro pasan. Si el build de Android falla por la versión de JDK,
confirmar que `java -version` reporta 21.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: soportar Capacitor 7 y actualizar el tooling"
```

---

## Task 7: Crear `Package.swift` y escribir tests de iOS reales

**Files:**
- Create: `Package.swift`
- Modify: `CapacitorKhipu.podspec`
- Modify: `ios/Tests/KhipuPluginTests/KhipuPluginTests.swift` (reescritura completa)
- Modify: `package.json` (script `verify:ios`)

**Interfaces:**
- Consumes: nada.
- Produces: los schemes `CapacitorKhipu` (build) y `CapacitorKhipu` (tests).

**Contexto:** `ios/Tests/KhipuPluginTests/KhipuPluginTests.swift` instancia `Khipu()`
y llama `.echo()`; ninguno de los dos existe — es boilerplate del template. Hoy no
falla porque sin `Package.swift` no hay target de tests. Al crear el manifest, el
build de tests lo va a rechazar, así que hay que reescribirlo en la misma tarea.

`CAPPluginMethod` expone `name` y `returnType` como propiedades públicas
(verificado en `ios/Capacitor/Capacitor/CAPPluginMethod.h` del repo de Capacitor),
así que se pueden asertar.

- [ ] **Step 1: Escribir `Package.swift`**

El target de tests necesita su propia dependencia explícita a `Capacitor`: los
tests del mapper usan `JSObject` y en SPM las dependencias de un target no son
transitivas para el `import`.

Crear `Package.swift`:

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorKhipu",
    platforms: [.iOS(.v14)],
    products: [
        .library(name: "CapacitorKhipu", targets: ["KhipuPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0"),
        .package(url: "https://github.com/khipu/KhipuClientIOS.git", exact: "2.16.5")
    ],
    targets: [
        .target(
            name: "KhipuPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "KhipuClientIOS", package: "KhipuClientIOS")
            ],
            path: "ios/Sources/KhipuPlugin"),
        .testTarget(
            name: "KhipuPluginTests",
            dependencies: [
                "KhipuPlugin",
                .product(name: "Capacitor", package: "capacitor-swift-pm")
            ],
            path: "ios/Tests/KhipuPluginTests")
    ]
)
```

- [ ] **Step 2: Subir `KhipuClientIOS` en el podspec y el deployment target**

En `CapacitorKhipu.podspec`, reemplazar estas dos líneas:

```ruby
  s.ios.deployment_target  = '13.0'
  s.dependency 'Capacitor'
  s.dependency 'KhipuClientIOS', '2.16.2'
```

por:

```ruby
  s.ios.deployment_target  = '14.0'
  s.dependency 'Capacitor'
  s.dependency 'KhipuClientIOS', '2.16.5'
```

- [ ] **Step 3: Corregir el script `verify:ios`**

Le falta el subcomando `build`. En `package.json`:

```json
    "verify:ios": "xcodebuild build -scheme CapacitorKhipu -destination generic/platform=iOS",
```

- [ ] **Step 4: Confirmar que el build de tests falla con el test roto**

Run: `xcodebuild build-for-testing -scheme CapacitorKhipu -destination 'platform=iOS Simulator,name=iPhone 16'`

Expected: FAIL con `cannot find 'Khipu' in scope` en `KhipuPluginTests.swift`. Esto
confirma el defecto (a) del spec.

- [ ] **Step 5: Reescribir el test**

Reemplazar el contenido de `ios/Tests/KhipuPluginTests/KhipuPluginTests.swift` por:

```swift
import XCTest

@testable import KhipuPlugin

final class KhipuPluginTests: XCTestCase {

    func testDeclaraLaIdentidadQueElPuenteDeCapacitorEspera() {
        let plugin = KhipuPlugin()

        XCTAssertEqual(plugin.identifier, "KhipuPlugin")
        XCTAssertEqual(plugin.jsName, "Khipu")
    }

    func testExponeSoloStartOperationComoPromesa() {
        let plugin = KhipuPlugin()

        XCTAssertEqual(plugin.pluginMethods.count, 1)
        XCTAssertEqual(plugin.pluginMethods.first?.name, "startOperation")
        XCTAssertEqual(plugin.pluginMethods.first?.returnType, "promise")
    }
}
```

- [ ] **Step 6: Correr build y tests**

```bash
npm run verify:ios
xcodebuild test -scheme CapacitorKhipu -destination 'platform=iOS Simulator,name=iPhone 16'
```

Expected: el build pasa y los 2 tests pasan. La primera resolución de SPM descarga
los xcframeworks de `capacitor-swift-pm`, así que puede tardar.

- [ ] **Step 7: Commit**

```bash
git add Package.swift CapacitorKhipu.podspec package.json ios/Tests/KhipuPluginTests/KhipuPluginTests.swift
git commit -m "feat(ios): add Package.swift for SPM consumption"
```

### Nombres verificados, para las tareas que siguen

- **El único scheme es `CapacitorKhipu`.** Confirmado con `xcodebuild -list`: no existe
  un `CapacitorKhipu-Package`. Ese sufijo aparece cuando un paquete se abre dentro de un
  workspace de Xcode, no cuando `xcodebuild` construye el paquete directamente. El
  scheme `CapacitorKhipu` incluye el test target, así que `xcodebuild test -scheme
  CapacitorKhipu` corre los tests.
- **La destination por nombre de dispositivo puede ser ambigua en una máquina de
  desarrollo.** `iPhone 16` existe bajo más de un runtime instalado (acá, iOS 18.1 y
  18.5), y en ese caso hay que añadir `,OS=<versión>`. **`OS=latest` no sirve**:
  `xcodebuild` lo rechaza, comprobado. En los runners de CI normalmente hay un solo
  runtime, así que la forma sin `OS=` alcanza; si el CI se queja de ambigüedad, fijar la
  versión que el runner tenga.

---

## Task 8: `KhipuOptionsMapper` con casts seguros

**Files:**
- Create: `ios/Sources/KhipuPlugin/KhipuOptionsDraft.swift`
- Create: `ios/Sources/KhipuPlugin/KhipuOptionsMapper.swift`
- Create: `ios/Tests/KhipuPluginTests/KhipuOptionsMapperTests.swift`
- Modify: `ios/Sources/KhipuPlugin/KhipuPlugin.swift`

**Interfaces:**
- Consumes: los schemes de la Task 7.
- Produces:
  - `struct KhipuOptionsDraft: Equatable` con `topBarTitle`, `topBarImageUrl`, `locale`,
    `skipExitPage`, `skipExitSuccessPage`, `showFooter`, `showMerchantLogo`,
    `showPaymentDetails`, `theme`, `colors`, todos opcionales.
  - `struct KhipuColorsDraft: Equatable` con los 12 colores opcionales.
  - `KhipuOptionsMapper.draft(from: JSObject?) -> KhipuOptionsDraft`
  - `KhipuOptionsMapper.map(_ options: JSObject?) -> KhipuOptions`
  - `KhipuPlugin.topMost(from: UIViewController) -> UIViewController`

**Contexto:** `KhipuPlugin.swift` mapea las opciones con `as!` en unos veinte
lugares, así que un `title: 123` enviado desde JS hace crashear la app en vez de
producir un rechazo de la llamada.

El mapeo se parte en dos por una restricción real del SDK: en
`KhipuClientIOS 2.16.5`, las propiedades de `KhipuOptions` y de `KhipuColors` se
declaran sin modificador de acceso, o sea `internal` al módulo del SDK, y
`KhipuOptions` no es `Codable`. Desde nuestro módulo **no se pueden leer**, así que
un test no puede asertar contra el objeto ya construido. `draft(from:)` concentra
toda la lógica y es lo que se testea; `apply(_:)` es mecánico, una línea por campo.

**Hueco aceptado a propósito, documentado para que sea revisable.** Los tests cubren
`draft(from:)`, no `apply(_:)`. Si alguien intercambiara `lightPrimary` por
`lightOnPrimary` en el paso mecánico, los tests seguirían pasando. Se acepta porque
`apply(_:)` es una línea por campo, visualmente alineada, y la revisión de código lo
cubre a ese tamaño. **El límite:** en el momento en que `apply(_:)` gane un
condicional, una transformación o una rama, deja de ser defendible y necesita tests
propios. Dejar esta nota como comentario en `KhipuOptionsMapper.swift`, sobre
`apply(_:)`, no solo en este plan.

- [ ] **Step 1: Escribir los tipos intermedios**

Crear `ios/Sources/KhipuPlugin/KhipuOptionsDraft.swift`:

```swift
import Foundation
import KhipuClientIOS

/// Representación intermedia e inspeccionable de las opciones que llegan desde JS.
///
/// Existe por una restricción del SDK: las propiedades de `KhipuOptions` y de
/// `KhipuColors` son internas a `KhipuClientIOS`, así que desde este módulo no se
/// pueden leer y no habría forma de testear el mapeo asertando sobre el objeto ya
/// construido.
struct KhipuOptionsDraft: Equatable {
    var topBarTitle: String?
    var topBarImageUrl: String?
    var locale: String?
    var skipExitPage: Bool?
    var skipExitSuccessPage: Bool?
    var showFooter: Bool?
    var showMerchantLogo: Bool?
    var showPaymentDetails: Bool?
    var theme: KhipuOptions.Theme?
    var colors: KhipuColorsDraft?
}

struct KhipuColorsDraft: Equatable {
    var lightBackground: String?
    var lightOnBackground: String?
    var lightPrimary: String?
    var lightOnPrimary: String?
    var lightTopBarContainer: String?
    var lightOnTopBarContainer: String?
    var darkBackground: String?
    var darkOnBackground: String?
    var darkPrimary: String?
    var darkOnPrimary: String?
    var darkTopBarContainer: String?
    var darkOnTopBarContainer: String?
}
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `ios/Tests/KhipuPluginTests/KhipuOptionsMapperTests.swift`:

```swift
import Capacitor
import KhipuClientIOS
import XCTest

@testable import KhipuPlugin

final class KhipuOptionsMapperTests: XCTestCase {

    func testSinOpcionesElDraftQuedaVacio() {
        XCTAssertEqual(KhipuOptionsMapper.draft(from: nil), KhipuOptionsDraft())
        XCTAssertEqual(KhipuOptionsMapper.draft(from: JSObject()), KhipuOptionsDraft())
    }

    func testMapeaLosCamposDeTexto() {
        let draft = KhipuOptionsMapper.draft(from: [
            "title": "Demo Capacitor",
            "titleImageUrl": "https://khipu.com/logo.png",
            "locale": "es_CL"
        ])

        XCTAssertEqual(draft.topBarTitle, "Demo Capacitor")
        XCTAssertEqual(draft.topBarImageUrl, "https://khipu.com/logo.png")
        XCTAssertEqual(draft.locale, "es_CL")
    }

    func testMapeaLosCincoBooleanos() {
        let draft = KhipuOptionsMapper.draft(from: [
            "skipExitPage": true,
            "skipExitSuccessPage": true,
            "showFooter": true,
            "showMerchantLogo": true,
            "showPaymentDetails": true
        ])

        XCTAssertEqual(draft.skipExitPage, true)
        XCTAssertEqual(draft.skipExitSuccessPage, true)
        XCTAssertEqual(draft.showFooter, true)
        XCTAssertEqual(draft.showMerchantLogo, true)
        XCTAssertEqual(draft.showPaymentDetails, true)
    }

    func testUnBooleanoEnFalseSeDistingueDeUnBooleanoAusente() {
        let presente = KhipuOptionsMapper.draft(from: ["showFooter": false])
        let ausente = KhipuOptionsMapper.draft(from: JSObject())

        XCTAssertEqual(presente.showFooter, false)
        XCTAssertNil(ausente.showFooter)
    }

    func testAceptaBooleanosEnvueltosEnNSNumber() {
        let draft = KhipuOptionsMapper.draft(from: ["showFooter": NSNumber(value: true)])

        XCTAssertEqual(draft.showFooter, true)
    }

    func testMapeaLosTresTemas() {
        XCTAssertEqual(KhipuOptionsMapper.draft(from: ["theme": "light"]).theme, .light)
        XCTAssertEqual(KhipuOptionsMapper.draft(from: ["theme": "dark"]).theme, .dark)
        XCTAssertEqual(KhipuOptionsMapper.draft(from: ["theme": "system"]).theme, .system)
    }

    func testIgnoraUnTemaDesconocido() {
        XCTAssertNil(KhipuOptionsMapper.draft(from: ["theme": "neon"]).theme)
    }

    func testMapeaLosDoceColores() {
        let colors: JSObject = [
            "lightBackground": "#FFFFFF",
            "lightOnBackground": "#1A1A1A",
            "lightPrimary": "#8347AD",
            "lightOnPrimary": "#FFFFFF",
            "lightTopBarContainer": "#8347AD",
            "lightOnTopBarContainer": "#FFFFFF",
            "darkBackground": "#121212",
            "darkOnBackground": "#EDEDED",
            "darkPrimary": "#3CB4E5",
            "darkOnPrimary": "#0B0B0B",
            "darkTopBarContainer": "#1E1E1E",
            "darkOnTopBarContainer": "#3CB4E5"
        ]

        let draft = KhipuOptionsMapper.draft(from: ["colors": colors])

        XCTAssertEqual(
            draft.colors,
            KhipuColorsDraft(
                lightBackground: "#FFFFFF",
                lightOnBackground: "#1A1A1A",
                lightPrimary: "#8347AD",
                lightOnPrimary: "#FFFFFF",
                lightTopBarContainer: "#8347AD",
                lightOnTopBarContainer: "#FFFFFF",
                darkBackground: "#121212",
                darkOnBackground: "#EDEDED",
                darkPrimary: "#3CB4E5",
                darkOnPrimary: "#0B0B0B",
                darkTopBarContainer: "#1E1E1E",
                darkOnTopBarContainer: "#3CB4E5"
            )
        )
    }

    func testColorsAusenteDejaElDraftSinColores() {
        XCTAssertNil(KhipuOptionsMapper.draft(from: JSObject()).colors)
    }

    func testColorsVacioProduceUnDraftDeColoresVacio() {
        let draft = KhipuOptionsMapper.draft(from: ["colors": JSObject()])

        XCTAssertEqual(draft.colors, KhipuColorsDraft())
    }

    func testDescartaValoresDeTipoIncorrectoEnVezDeCrashear() {
        let draft = KhipuOptionsMapper.draft(from: [
            "title": 123,
            "titleImageUrl": true,
            "showFooter": "sí",
            "theme": 7,
            "colors": "morado"
        ])

        XCTAssertEqual(draft, KhipuOptionsDraft())
    }

    func testConstruyeLasOpcionesNativasSinCrashear() {
        XCTAssertNotNil(KhipuOptionsMapper.map(["title": "Demo", "theme": "dark"]))
    }
}
```

- [ ] **Step 3: Correr y confirmar que falla**

Run: `xcodebuild test -scheme CapacitorKhipu -destination 'platform=iOS Simulator,name=iPhone 16'`

Expected: FAIL con `cannot find 'KhipuOptionsMapper' in scope`.

- [ ] **Step 4: Escribir el mapper**

Crear `ios/Sources/KhipuPlugin/KhipuOptionsMapper.swift`:

```swift
import Capacitor
import Foundation
import KhipuClientIOS

/// Traduce el diccionario de opciones que llega desde JS a las opciones nativas
/// del cliente de Khipu.
///
/// Descarta los valores de tipo incorrecto en vez de hacer crashear la app: el
/// mapeo anterior usaba `as!`, así que un `title: 123` enviado desde JS terminaba
/// en un crash en vez de en un valor ignorado.
enum KhipuOptionsMapper {

    static func map(_ options: JSObject?) -> KhipuOptions {
        apply(draft(from: options))
    }

    /// JS -> draft. Concentra toda la lógica y es el paso que cubren los tests.
    static func draft(from options: JSObject?) -> KhipuOptionsDraft {
        var draft = KhipuOptionsDraft()
        guard let options else { return draft }

        draft.topBarTitle = string(options["title"])
        draft.topBarImageUrl = string(options["titleImageUrl"])
        draft.locale = string(options["locale"])
        draft.skipExitPage = bool(options["skipExitPage"])
        draft.skipExitSuccessPage = bool(options["skipExitSuccessPage"])
        draft.showFooter = bool(options["showFooter"])
        draft.showMerchantLogo = bool(options["showMerchantLogo"])
        draft.showPaymentDetails = bool(options["showPaymentDetails"])
        draft.theme = theme(options["theme"])

        if let colors = options["colors"] as? JSObject {
            draft.colors = colorsDraft(from: colors)
        }

        return draft
    }

    /// draft -> `KhipuOptions`. Mecánico: una línea por campo.
    private static func apply(_ draft: KhipuOptionsDraft) -> KhipuOptions {
        var builder = KhipuOptions.Builder()

        if let value = draft.topBarTitle { builder = builder.topBarTitle(value) }
        if let value = draft.topBarImageUrl { builder = builder.topBarImageUrl(value) }
        if let value = draft.locale { builder = builder.locale(value) }
        if let value = draft.skipExitPage { builder = builder.skipExitPage(value) }
        if let value = draft.skipExitSuccessPage { builder = builder.skipExitSuccessPage(value) }
        if let value = draft.showFooter { builder = builder.showFooter(value) }
        if let value = draft.showMerchantLogo { builder = builder.showMerchantLogo(value) }
        if let value = draft.showPaymentDetails { builder = builder.showPaymentDetails(value) }
        if let value = draft.theme { builder = builder.theme(value) }
        if let colors = draft.colors { builder = builder.colors(apply(colors)) }

        return builder.build()
    }

    private static func apply(_ draft: KhipuColorsDraft) -> KhipuColors {
        var builder = KhipuColors.Builder()

        if let value = draft.lightBackground { builder = builder.lightBackground(value) }
        if let value = draft.lightOnBackground { builder = builder.lightOnBackground(value) }
        if let value = draft.lightPrimary { builder = builder.lightPrimary(value) }
        if let value = draft.lightOnPrimary { builder = builder.lightOnPrimary(value) }
        if let value = draft.lightTopBarContainer { builder = builder.lightTopBarContainer(value) }
        if let value = draft.lightOnTopBarContainer { builder = builder.lightOnTopBarContainer(value) }
        if let value = draft.darkBackground { builder = builder.darkBackground(value) }
        if let value = draft.darkOnBackground { builder = builder.darkOnBackground(value) }
        if let value = draft.darkPrimary { builder = builder.darkPrimary(value) }
        if let value = draft.darkOnPrimary { builder = builder.darkOnPrimary(value) }
        if let value = draft.darkTopBarContainer { builder = builder.darkTopBarContainer(value) }
        if let value = draft.darkOnTopBarContainer { builder = builder.darkOnTopBarContainer(value) }

        return builder.build()
    }

    private static func colorsDraft(from colors: JSObject) -> KhipuColorsDraft {
        KhipuColorsDraft(
            lightBackground: string(colors["lightBackground"]),
            lightOnBackground: string(colors["lightOnBackground"]),
            lightPrimary: string(colors["lightPrimary"]),
            lightOnPrimary: string(colors["lightOnPrimary"]),
            lightTopBarContainer: string(colors["lightTopBarContainer"]),
            lightOnTopBarContainer: string(colors["lightOnTopBarContainer"]),
            darkBackground: string(colors["darkBackground"]),
            darkOnBackground: string(colors["darkOnBackground"]),
            darkPrimary: string(colors["darkPrimary"]),
            darkOnPrimary: string(colors["darkOnPrimary"]),
            darkTopBarContainer: string(colors["darkTopBarContainer"]),
            darkOnTopBarContainer: string(colors["darkOnTopBarContainer"])
        )
    }

    private static func string(_ value: JSValue?) -> String? {
        value as? String
    }

    /// Un booleano de JS puede llegar como `Bool` o envuelto en `NSNumber` según
    /// cómo lo serialice el puente, así que se aceptan ambos.
    private static func bool(_ value: JSValue?) -> Bool? {
        if let value = value as? Bool { return value }
        if let value = value as? NSNumber { return value.boolValue }
        return nil
    }

    private static func theme(_ value: JSValue?) -> KhipuOptions.Theme? {
        guard let raw = value as? String else { return nil }
        return KhipuOptions.Theme(rawValue: raw)
    }
}
```

- [ ] **Step 5: Correr y confirmar que pasan**

Run: `xcodebuild test -scheme CapacitorKhipu -destination 'platform=iOS Simulator,name=iPhone 16'`

Expected: 14 tests pasan (12 del mapper y 2 del plugin).

- [ ] **Step 5b: Presentar sobre el controlador que está arriba, no sobre el del puente**

Defecto aparte del mapeo, en el mismo método. Hoy `startOperation` hace:

```swift
guard let presenter = self.bridge?.viewController else {
    handleError(call, "new viewController in the bridge.")
    return
}
```

y `KhipuLauncher.launch` termina en `presenter.present(view, animated: true)`. UIKit
**rechaza presentar sobre un controlador que ya está presentando algo**. Así que un
comercio que llame al plugin mientras tiene su propio modal en pantalla no obtiene
nada: ni hoja de pago, ni un error sobre el que pueda actuar. El
`bridge.viewController` no salva de esto — si es él el que tiene el modal encima, la
presentación se rechaza igual.

Agregar a `KhipuPlugin.swift`, dentro del tipo:

```swift
    /// Devuelve el controlador que está efectivamente arriba, siguiendo la cadena de
    /// presentación desde el que da el puente.
    ///
    /// UIKit rechaza presentar sobre un controlador que ya está presentando, así que
    /// sin esto el pago no aparece cuando el comercio tiene su propio modal en
    /// pantalla.
    ///
    /// Deliberadamente NO es una extensión de `UIViewController`: el plugin se enlaza
    /// estáticamente en la app del comercio, y un nombre como `topMostViewController`
    /// inyectado ahí puede chocar con el suyo.
    static func topMost(from controller: UIViewController) -> UIViewController {
        var top = controller
        while let presented = top.presentedViewController {
            top = presented
        }
        return top
    }
```

Y corregir el mensaje de error, que hoy dice «new viewController» por un typo de «no
viewController» y llega al comercio a través de `call.reject`.

- [ ] **Step 5c: Test de la cadena de presentación**

Agregar a `ios/Tests/KhipuPluginTests/KhipuPluginTests.swift`:

```swift
    func testTopMostSigueLaCadenaDePresentacion() {
        let root = UIViewController()
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = root
        window.makeKeyAndVisible()

        XCTAssertIdentical(KhipuPlugin.topMost(from: root), root)

        let modal = UIViewController()
        let presentado = expectation(description: "modal presentado")
        root.present(modal, animated: false) { presentado.fulfill() }
        wait(for: [presentado], timeout: 5)

        XCTAssertIdentical(KhipuPlugin.topMost(from: root), modal)
    }
```

La primera aserción es tan importante como la segunda: verifica que el arreglo no
altera el caso en que no hay nada presentado.

**Si este test resulta inestable en el target de tests de SPM** (que corre sin app
anfitriona, y `present` puede ser poco fiable ahí): **no lo borres y no borres el
arreglo.** Repórtalo con la salida y lo decido yo.

- [ ] **Step 6: Usar el mapper en el plugin**

En `ios/Sources/KhipuPlugin/KhipuPlugin.swift`, reemplazar todo el bloque que va
desde `var optionsBuilder = KhipuOptions.Builder()` hasta el cierre del `if` de
`colors` (unas cien líneas) por una sola línea, dejando `startOperation` así:

```swift
    @objc func startOperation(_ call: CAPPluginCall) {
        guard let operationId = call.getString("operationId") else {
            handleError(call, "operationId must be provided and must be a string.")
            return
        }

        let options = KhipuOptionsMapper.map(call.getObject("options"))

        guard let bridgeController = self.bridge?.viewController else {
            handleError(call, "no viewController in the bridge.")
            return
        }

        DispatchQueue.main.async {
            let presenter = Self.topMost(from: bridgeController)
            KhipuLauncher.launch(presenter: presenter,
                                 operationId: operationId,
                                 options: options) { result in

                var events: [[String: String]] = []

                for event in result.events {
                    events.append([
                        "name": event.name,
                        "timestamp": event.timestamp,
                        "type": event.type
                    ])
                }

                call.resolve([
                    "operationId": result.operationId,
                    "exitTitle": result.exitTitle,
                    "exitMessage": result.exitMessage,
                    "exitUrl": result.exitUrl as Any,
                    "result": result.result,
                    "failureReason": result.failureReason as Any,
                    "continueUrl": result.continueUrl as Any,
                    "events": events
                ])
            }
        }
    }
```

El `import KhipuClientIOS` se mantiene porque `KhipuLauncher` sigue usándose.

- [ ] **Step 7: Verificar build, tests y lint de Swift**

```bash
npm run verify:ios
xcodebuild test -scheme CapacitorKhipu -destination 'platform=iOS Simulator,name=iPhone 16'
npm run swiftlint -- lint
```

Expected: los tres pasan.

- [ ] **Step 8: Commit**

```bash
git add ios/Sources/KhipuPlugin ios/Tests/KhipuPluginTests/KhipuOptionsMapperTests.swift
git commit -m "fix(ios): mapear las opciones con casts seguros en vez de as!"
```

---

## Task 9: Guarda de sincronía entre `Package.swift` y el podspec

**Files:**
- Create: `scripts/check-native-versions.mjs`
- Create: `scripts/check-native-versions.test.mjs`
- Modify: `package.json` (script `verify:versions`, sumarlo a `verify`)

**Interfaces:**
- Consumes: `Package.swift` y `CapacitorKhipu.podspec` de las Tasks 6 y 7.
- Produces: `npm run verify:versions`, que sale con código 1 si las versiones difieren.

**Contexto:** mantener CocoaPods y SPM en paralelo implica que la versión de
`KhipuClientIOS` vive en dos archivos. Esta guarda existe para que la
desincronización la detecte el CI y no un comercio.

- [ ] **Step 1: Escribir el test que falla**

El script acepta las dos rutas por argv para poder testearlo con fixtures.

Crear `scripts/check-native-versions.test.mjs`:

```js
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = 'scripts/check-native-versions.mjs';

function fixtures(spmVersion, podVersion) {
  const dir = mkdtempSync(join(tmpdir(), 'khipu-versions-'));
  const packageSwift = join(dir, 'Package.swift');
  const podspec = join(dir, 'CapacitorKhipu.podspec');

  writeFileSync(
    packageSwift,
    `.package(url: "https://github.com/khipu/KhipuClientIOS.git", exact: "${spmVersion}")\n`,
  );
  writeFileSync(podspec, `  s.dependency 'KhipuClientIOS', '${podVersion}'\n`);

  return [packageSwift, podspec];
}

function run(args) {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.status, output: `${error.stdout}${error.stderr}` };
  }
}

describe('check-native-versions', () => {
  it('pasa cuando las dos versiones coinciden', () => {
    const result = run(fixtures('2.16.5', '2.16.5'));

    expect(result.code).toBe(0);
    expect(result.output).toContain('2.16.5');
  });

  it('falla cuando las versiones difieren', () => {
    const result = run(fixtures('2.16.5', '2.16.2'));

    expect(result.code).toBe(1);
    expect(result.output).toContain('desincronizado');
  });

  it('falla cuando no encuentra la versión en Package.swift', () => {
    const [, podspec] = fixtures('2.16.5', '2.16.5');
    const dir = mkdtempSync(join(tmpdir(), 'khipu-versions-'));
    const packageSwift = join(dir, 'Package.swift');
    writeFileSync(packageSwift, 'let package = Package(name: "CapacitorKhipu")\n');

    const result = run([packageSwift, podspec]);

    expect(result.code).toBe(1);
    expect(result.output).toContain('No se encontró');
  });

  it('con los archivos reales del repo las versiones están sincronizadas', () => {
    expect(run([]).code).toBe(0);
  });
});
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx vitest run scripts/check-native-versions.test.mjs`

Expected: los 4 tests fallan con `Cannot find module` sobre el script.

- [ ] **Step 3: Escribir el script**

Crear `scripts/check-native-versions.mjs`:

```js
#!/usr/bin/env node
/**
 * Falla si la versión de KhipuClientIOS declarada en `Package.swift` no coincide
 * con la del podspec.
 *
 * Mantener CocoaPods y SPM en paralelo implica que la versión del SDK nativo vive
 * en dos archivos. Un comercio que instala por CocoaPods y otro que instala por
 * SPM de la misma versión del plugin tienen que resolver el mismo grafo nativo.
 *
 * Acepta las dos rutas por argumento para poder testearlo con fixtures.
 */
import { readFileSync } from 'node:fs';

const [packageSwiftPath = 'Package.swift', podspecPath = 'CapacitorKhipu.podspec'] =
  process.argv.slice(2);

function extract(path, pattern) {
  const match = readFileSync(path, 'utf8').match(pattern);
  if (!match) {
    console.error(`No se encontró la versión de KhipuClientIOS en ${path}`);
    process.exit(1);
  }
  return match[1];
}

const spm = extract(packageSwiftPath, /KhipuClientIOS\.git",\s*exact:\s*"([^"]+)"/);
const pod = extract(podspecPath, /s\.dependency\s+'KhipuClientIOS',\s*'([^']+)'/);

if (spm !== pod) {
  console.error(
    `KhipuClientIOS desincronizado:\n  ${packageSwiftPath}: ${spm}\n  ${podspecPath}: ${pod}`,
  );
  process.exit(1);
}

console.log(`KhipuClientIOS sincronizado en ${spm}`);
```

- [ ] **Step 4: Enchufarlo a los scripts de npm**

En `package.json`:

```json
    "verify": "npm run test && npm run verify:versions && npm run verify:ios && npm run verify:android && npm run verify:web",
    "verify:versions": "node scripts/check-native-versions.mjs",
```

- [ ] **Step 5: Correr y confirmar que pasa**

```bash
npx vitest run scripts/check-native-versions.test.mjs
npm run verify:versions
```

Expected: `4 passed` y `KhipuClientIOS sincronizado en 2.16.5`.

- [ ] **Step 6: Comprobar a mano que la guarda muerde**

```bash
sed -i '' "s/'KhipuClientIOS', '2.16.5'/'KhipuClientIOS', '2.16.2'/" CapacitorKhipu.podspec
npm run verify:versions || echo "la guarda funcionó"
git checkout CapacitorKhipu.podspec
```

Expected: imprime el mensaje de desincronizado y después `la guarda funcionó`.

- [ ] **Step 7: Escribir el test de la guarda de claves**

Segunda guarda, del mismo tipo y por la misma razón: hay un invariante que nada
asegura. El contrato entre JS y el código nativo es de strings, y el mismo conjunto de
claves vive en **cuatro** superficies. Si alguien renombra una clave en una sola, el
flag deja de funcionar **en silencio**: los tests de JS asertan sobre el payload y los
de Swift sobre el mapeo, pero ninguno verifica que ambos lados hablen del mismo
vocabulario.

Verificado antes de escribir esta tarea: hoy las cuatro coinciden, 9 claves de opciones
y 12 de colores. La guarda previene deriva futura, no arregla algo roto.

Crear `scripts/check-option-keys.test.mjs`:

```js
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = 'scripts/check-option-keys.mjs';

function run() {
  try {
    return { code: 0, output: execFileSync('node', [SCRIPT], { encoding: 'utf8' }) };
  } catch (error) {
    return { code: error.status, output: `${error.stdout}${error.stderr}` };
  }
}

describe('check-option-keys', () => {
  it('las cuatro superficies declaran el mismo vocabulario', () => {
    const result = run();

    expect(result.output).toContain('9 opciones');
    expect(result.output).toContain('12 colores');
    expect(result.code).toBe(0);
  });
});
```

- [ ] **Step 8: Escribir la guarda de claves**

Crear `scripts/check-option-keys.mjs`:

```js
#!/usr/bin/env node
/**
 * Falla si las cuatro superficies que declaran el vocabulario de opciones dejan de
 * coincidir.
 *
 * El contrato entre JS y el nativo es de strings: `src/definitions.ts` lo declara, el
 * mapper de Swift y el plugin de Java lo leen, y el harness lo ofrece. Renombrar una
 * clave en una sola superficie deja el flag sin efecto **en silencio** — ningún test de
 * un lado puede detectar una deriva del otro.
 *
 * Sobre la fragilidad: esto parsea fuente con expresiones regulares. La dirección del
 * fallo es la correcta (el chequeo se rompe y alguien mira, en vez de pasar mientras el
 * protocolo derivó), pero un parser roto podría reportar «todas coinciden» con cero
 * claves en todas. Por eso hay un piso de cordura: si la extracción del contrato
 * devuelve menos claves de las que debería, el problema es el parser y se dice así.
 */
import { readFileSync } from 'node:fs';

const CONTRATO = 'src/definitions.ts';
const SWIFT = 'ios/Sources/KhipuPlugin/KhipuOptionsMapper.swift';
const JAVA = 'android/src/main/java/com/khipu/capacitor/KhipuPlugin.java';
const HARNESS = 'example/src/js/fields.js';

const leer = (path) => readFileSync(path, 'utf8');
const claves = (fuente, patron) => new Set([...fuente.matchAll(patron)].map((m) => m[1]));
const sinColors = (conjunto) => new Set([...conjunto].filter((k) => k !== 'colors'));

function interfaz(fuente, nombre) {
  const bloque = fuente.match(new RegExp(`export interface ${nombre} \\{(.*?)\\n\\}`, 's'));
  if (!bloque) {
    console.error(
      `No se pudo extraer la interfaz ${nombre} de ${CONTRATO}. El parser de esta guarda quedó obsoleto.`,
    );
    process.exit(1);
  }
  return claves(bloque[1], /^\s*(\w+)\s*[?:]/gm);
}

const contrato = leer(CONTRATO);
const opciones = sinColors(interfaz(contrato, 'KhipuOptions'));
const colores = interfaz(contrato, 'KhipuColors');

// Piso de cordura: si el contrato se lee casi vacío, lo roto es el parser, no el código.
if (opciones.size < 5 || colores.size < 8) {
  console.error(
    `La extracción del contrato devolvió ${opciones.size} opciones y ${colores.size} colores, ` +
      `muy pocas para ser real. El parser de esta guarda quedó obsoleto: arréglalo en vez de ` +
      `confiar en que las superficies coinciden.`,
  );
  process.exit(1);
}

const swift = leer(SWIFT);
const java = leer(JAVA);
const tramos = leer(HARNESS).split('export const COLOR_FIELDS');

const superficies = [
  { nombre: `${SWIFT} (opciones)`, esperado: opciones, real: sinColors(claves(swift, /options\["(\w+)"\]/g)) },
  { nombre: `${SWIFT} (colores)`, esperado: colores, real: claves(swift, /colors\["(\w+)"\]/g) },
  { nombre: `${JAVA} (opciones)`, esperado: opciones, real: sinColors(claves(java, /options\.\w+\("(\w+)"/g)) },
  { nombre: `${JAVA} (colores)`, esperado: colores, real: claves(java, /colors\.\w+\("(\w+)"/g) },
  { nombre: `${HARNESS} (opciones)`, esperado: opciones, real: claves(tramos[0], /key: '(\w+)'/g) },
  {
    nombre: `${HARNESS} (colores)`,
    esperado: colores,
    real: claves(tramos[1].split('export const PRESETS')[0], /key: '(\w+)'/g),
  },
];

let derivo = false;
for (const { nombre, esperado, real } of superficies) {
  const falta = [...esperado].filter((k) => !real.has(k));
  const sobra = [...real].filter((k) => !esperado.has(k));
  if (falta.length || sobra.length) {
    derivo = true;
    console.error(`${nombre} derivó del contrato de ${CONTRATO}:`);
    if (falta.length) console.error(`  no lee/ofrece: ${falta.join(', ')}`);
    if (sobra.length) console.error(`  lee/ofrece de más: ${sobra.join(', ')}`);
  }
}

if (derivo) {
  process.exit(1);
}

console.log(
  `Vocabulario sincronizado en las cuatro superficies: ${opciones.size} opciones, ${colores.size} colores`,
);
```

- [ ] **Step 9: Enchufar las dos guardas a los scripts de npm**

En `package.json`:

```json
    "verify": "npm run test && npm run verify:versions && npm run verify:keys && npm run verify:ios && npm run verify:android && npm run verify:web",
    "verify:versions": "node scripts/check-native-versions.mjs",
    "verify:keys": "node scripts/check-option-keys.mjs",
```

- [ ] **Step 10: Correr las dos guardas y sus tests**

```bash
npm run verify:versions
npm run verify:keys
```

Expected: `KhipuClientIOS sincronizado en 2.16.5` y
`Vocabulario sincronizado en las cuatro superficies: 9 opciones, 12 colores`.

Run: `PATH="/opt/homebrew/bin:$PATH" npx vitest run scripts/`

Expected: los tests de las dos guardas pasan.

- [ ] **Step 11: Comprobar a mano que las dos guardas muerden**

Una guarda que no se probó fallando es una guarda sin verificar.

```bash
sed -i '' "s/'KhipuClientIOS', '2.16.5'/'KhipuClientIOS', '2.16.2'/" CapacitorKhipu.podspec
npm run verify:versions
git checkout CapacitorKhipu.podspec
```

Expected: imprime el mensaje de desincronizado y sale con código 1.

```bash
sed -i '' "s/key: 'showFooter'/key: 'showFooterX'/" example/src/js/fields.js
npm run verify:keys
git checkout example/src/js/fields.js
```

Expected: reporta que el harness derivó, nombrando `showFooter` como no ofrecido y
`showFooterX` como de más, y sale con código 1.

Confirmar con `git status --short` que el working tree quedó limpio después de los dos
`git checkout`.

- [ ] **Step 12: Commit**

```bash
git add scripts package.json
git commit -m "chore: guard the KhipuClientIOS version and the option key contract"
```

### Extensión pendiente: la dirección de vuelta

La guarda de arriba cubre el camino de **ida** (JS → nativo). El camino de **vuelta**
—las 8 claves del `KhipuResult` que el nativo devuelve a JS— tiene el mismo problema y
una asimetría que lo hace peor:

| | Cómo arma el resultado | ¿Verificable desde nuestro código? |
| --- | --- | --- |
| iOS | `call.resolve([...])` con las 8 claves como literales, en `KhipuPlugin.swift` | **Sí** |
| Android | `new JSObject(khipuResult.asJson())` en `KhipuPlugin.java:126` — delega la forma entera al SDK | **No**: las claves no están en nuestro fuente |

Por qué importa: si alguien renombra una clave del diccionario de `call.resolve`, el
comercio recibe `undefined` en ese campo. **No hay ninguna alarma**: los tipos de
TypeScript se borran en runtime, así que nada falla, nada se queja, y el campo
simplemente no llega. Y como Android obtiene su forma del SDK y iOS la construye a
mano, las dos plataformas pueden discrepar sobre la forma del resultado sin que nada en
este repo lo note.

**Lo que se hace:** extender `scripts/check-option-keys.mjs` para comparar también las
claves de `call.resolve` de `KhipuPlugin.swift` contra la interfaz `KhipuResult` de
`src/definitions.ts`. Cubre la mitad verificable.

**Lo que no se puede hacer, y por qué:** el lado Android no es comprobable
estáticamente. Esa mitad se cubre a mano, y sale casi gratis porque el harness **ya
muestra** los campos del resultado: basta correr la misma operación en iOS y en Android
y comparar qué campos aparecen. Está agregado a la verificación manual de las Tasks 10
y 15.


---

## Task 10: App de ejemplo a Capacitor 7 con CocoaPods

**Files:**
- Modify: `example/package.json`
- Recreate: `example/ios/**` y `example/android/**`

**Interfaces:**
- Consumes: el harness de las Tasks 2 a 4.
- Produces: una app Capacitor 7 con CocoaPods que ejercita el plugin en un dispositivo.

- [ ] **Step 1: Subir las dependencias del ejemplo a Capacitor 7**

```bash
cd example
npm install @capacitor/core@^7 @capacitor/ios@^7 @capacitor/android@^7 @capacitor/splash-screen@^7
npm install --save-dev @capacitor/cli@^7 vite@latest
```

El `vite` del ejemplo está pinneado en `^2.9.13`, cuatro majors atrás, y su build de
producción **ya está roto** antes de esta migración: el `dist/esm/index.js` del plugin
hace `import('./web')` dinámico, Vite inyecta un helper de module-preload para eso, y
`vite@2.9.18` no resuelve su propio `./preload-helper` bajo la resolución de exports
más estricta de Node moderno. El servidor de desarrollo (`npm start`) sí funciona; solo
`vite build` falla. Hay que subirlo en esta tarea o el step de build del CI no puede
pasar.

Verificar antes de seguir:

```bash
npm run build
```

Expected: `vite build` completa sin errores y escribe `dist/`. Si falla en algo que no
sea el `preload-helper`, detenerse: significa que hay un import roto en el harness.

- [ ] **Step 2: Regenerar las plataformas nativas**

**Requiere confirmación explícita del usuario:** borra los proyectos nativos
commiteados. En Capacitor 7 `cap add ios` usa CocoaPods por defecto, que es lo que
esta línea debe ejercitar.

```bash
cd /Users/edavis/git/capacitor-khipu/example
git rm -r --cached ios android
rm -rf ios android
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

- [ ] **Step 3: Confirmar que el Podfile referencia el plugin**

Run: `grep CapacitorKhipu ios/App/Podfile`

Expected: `pod 'CapacitorKhipu', :path => '../../..'`.

- [ ] **Step 3b: Declarar `LSApplicationQueriesSchemes` en el plist regenerado**

`npx cap add ios` produce el `Info.plist` pelado del template, sin esta llave. Sin
ella `canOpenURL` falla para las nueve apps bancarias chilenas y `openApp` no puede
abrir ninguna. Un ejemplo existe para ser copiado, así que el hueco se propaga a
todo comercio que lo use de referencia.

En `example/ios/App/App/Info.plist`, agregar dentro del `<dict>` raíz:

```xml
  <key>LSApplicationQueriesSchemes</key>
  <array>
    <string>bancochilemipass2</string>
    <string>BciPassApp</string>
    <string>BICEPassApp</string>
    <string>scotiabankgo</string>
    <string>SantanderPassApp</string>
    <string>tupass</string>
    <string>bancoestado</string>
    <string>itau.cl</string>
    <string>SecurityPass</string>
  </array>
```

Los nueve valores y su orden vienen de la página de integración de Capacitor de la
documentación de Khipu. **No copiarlos de otro repo de ejemplo:** hay copias con
`bancochilemipass` y `keypass`, que están obsoletos; los vigentes son
`bancochilemipass2` y `scotiabankgo`.

Verificar: `plutil -lint example/ios/App/App/Info.plist` y
`grep -c bancochilemipass2 example/ios/App/App/Info.plist` (debe dar 1).

- [ ] **Step 4: Correr el harness en un simulador de iOS**

```bash
npx cap run ios
```

**Usar un build normal, no `--no-codesign` ni `CODE_SIGNING_ALLOWED=NO`.** Un build
sin firmar recibe una firma ad-hoc *linker-signed*, que deja al proceso sin acceso
al Keychain: todas las llamadas `SecItem*` devuelven `-34018`
(`errSecMissingEntitlement`) y el pago aborta a mitad de camino. Es un fallo que
parece un bug del SDK y no lo es. Los builds sin firma quedan solo para el CI, que
compila sin ejecutar.

Comprobar a mano, con un `operationId` válido:
- el aviso de plataforma dice `ios` y ya no lista campos ignorados;
- el preset *Marca Khipu* aplica el púrpura `#8347AD` a la barra superior;
- `showFooter` incluido en `false` oculta el footer, y sin incluir lo deja visible;
- `skipExitSuccessPage` en `true` salta la página de salida;
- al terminar, el resultado se renderiza con sus campos y la tabla de eventos;
- comparar los campos del resultado con la corrida de la otra plataforma: deben
  aparecer los mismos. Es la única forma de detectar que iOS y Android discrepen sobre
  la forma del `KhipuResult`, porque iOS la construye a mano y Android la delega al SDK,
  así que ninguna guarda estática puede compararlas;

- [ ] **Step 5: Correr el harness en un emulador de Android**

```bash
npx cap run android
```

Comprobar los mismos cinco puntos.

- [ ] **Step 6: Commit**

```bash
cd /Users/edavis/git/capacitor-khipu
git add example
git commit -m "chore(example): app de ejemplo en Capacitor 7 con CocoaPods"
```

---

## Task 11: CI en GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: los scripts `test`, `lint`, `verify:versions`, `verify:web`, `verify:ios`,
  `verify:android` de las tareas anteriores.
- Produces: verificación automática en `main` y en `7.x`.

**Contexto:** el repositorio no tiene `.github/` hoy. Este workflow es la pieza que
hace sostenible mantener dos líneas en paralelo. `android/settings.gradle` incluye
`:capacitor-android` desde `../node_modules/@capacitor/android/capacitor`, así que
el job de Android necesita `npm ci` antes del build. `capacitor-swift-pm` se
distribuye como binary targets, así que la resolución de SPM descarga xcframeworks
y conviene cachearla.

El `node-version: 22` no es arbitrario: `@capacitor/cli@8.5.1` declara
`"engines": { "node": ">=22.0.0" }`, y el tooling de test (Vitest 5, jsdom 30)
también lo exige en runtime. La Task 1 deja `engines` y `.nvmrc` declarándolo.

Los dos steps previos al lint de Swift no son ceremonia: `npx node-swiftlint lint`
**sale con código 0 y solo imprime un warning** cuando SwiftLint no está en el PATH
(verificado en local). Sin ellos, el step pasaría en verde sin lintear una sola línea
de Swift — un chequeo que no chequea nada. El `swiftlint version` falla ruidosamente si
falta, que es el comportamiento que se quiere.

Por la misma razón, el `npm run lint` del job web **no** cubre Swift: ese script
encadena `eslint && prettier --check && swiftlint lint`, y su tercer tramo es el que
puede no-opear. El job web corre solo los dos primeros por separado (ver R2 del
ledger), y Swift se lintea acá.

**Nota realista:** es esperable que el primer run necesite ajustes (nombres de
simulador disponibles en el runner, versiones del Android SDK). Iterar sobre el
workflow hasta que pase es parte de la tarea, no una señal de que el diseño esté mal.

- [ ] **Step 1: Escribir el workflow**

Crear `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, 7.x]
  pull_request:
    branches: [main, 7.x]

jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run eslint
      - run: npm run prettier -- --check
      - run: npm test
      - run: npm run verify:versions
      - run: npm run verify:keys
      - run: npm run verify:web

  ios:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Cachear la resolución de SPM
        uses: actions/cache@v4
        with:
          path: .build
          key: spm-${{ runner.os }}-${{ hashFiles('Package.swift') }}
      - name: Build del paquete
        run: xcodebuild build -scheme CapacitorKhipu -destination generic/platform=iOS
      - name: Tests del paquete
        run: xcodebuild test -scheme CapacitorKhipu -destination 'platform=iOS Simulator,name=iPhone 16'
      - name: Instalar SwiftLint
        run: brew list swiftlint || brew install swiftlint
      - name: Confirmar que SwiftLint existe
        run: swiftlint version
      - name: Lint de Swift
        run: npm run swiftlint -- lint
      - name: Lint del podspec
        run: pod lib lint --allow-warnings

  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - name: Validar el wrapper de Gradle
        uses: gradle/actions/wrapper-validation@v4
      - uses: android-actions/setup-android@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: ./gradlew clean build test
        working-directory: android

  example:
    if: github.event_name == 'push'
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Instalar la app de ejemplo
        run: npm install
        working-directory: example
      - name: Sincronizar y construir iOS
        run: |
          npm run build
          npx cap sync ios
          xcodebuild build -workspace ios/App/App.xcworkspace -scheme App -destination generic/platform=iOS CODE_SIGNING_ALLOWED=NO
        working-directory: example
```

- [ ] **Step 2: Commitear y empujar para ver el primer run**

Requiere confirmación del usuario antes del push.

```bash
git add .github/workflows/ci.yml
git commit -m "ci: agregar workflow de verificación para main y 7.x"
```

- [ ] **Step 3: Iterar hasta que los cuatro jobs pasen**

Run: `gh run watch`

Ajustar el workflow según lo que falle y commitear cada corrección con
`ci: <qué se ajustó>`.

- [ ] **Step 4: Integrar la Fase 3 a `main`**

```bash
git checkout main
git merge --no-ff feat/capacitor-7
```

---

## Task 12: Cortar el branch `7.x` y publicar `3.0.0`

**Files:**
- Modify: `package.json` (en el branch `7.x`: versión, `release-it`)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `capacitor-khipu@3.0.0` en npm con dist-tag `cap7`, y el branch `7.x`
  como línea de mantención de Capacitor 7.

- [ ] **Step 1: Cortar el branch desde `main`**

`main` está exactamente en el estado de Capacitor 7, así que este es el punto de
corte.

```bash
git checkout main
git checkout -b 7.x
```

- [ ] **Step 2: Anclar `release-it` al branch y al dist-tag**

En `package.json`, dentro del objeto `release-it`, reemplazar el bloque `git` y
`npm`:

```json
    "git": {
      "commitMessage": "chore: release ${version}",
      "tagName": "v${version}",
      "requireBranch": "7.x"
    },
    "npm": {
      "publish": true,
      "tag": "cap7"
    },
```

- [ ] **Step 3: Verificar todo antes de publicar**

```bash
npm run verify
```

Expected: tests, sincronía de versiones, build de iOS, build de Android y build web,
todos pasando.

- [ ] **Step 4: Commitear el anclaje**

```bash
git add package.json
git commit -m "chore: anclar la línea 3.x a Capacitor 7 y al dist-tag cap7"
```

- [ ] **Step 5: Publicar `3.0.0`**

**Requiere confirmación explícita del usuario.** Se pasa la versión de forma
explícita en vez de dejar que la infiera el changelog, porque el salto de `2.11.x`
a `3.0.0` no se deduce de los commits.

```bash
npx release-it 3.0.0
git push origin 7.x --tags
```

- [ ] **Step 6: Comprobar los dist-tags**

Run: `npm view capacitor-khipu dist-tags`

Expected: `cap6: '2.11.2'`, `cap7: '3.0.0'`, `latest: '2.11.1'`.

---

# Fase 4 — `main` a Capacitor 8

## Task 13: Subir el tooling y el build a Capacitor 8

**Files:**
- Modify: `package.json`
- Modify: `android/build.gradle` (reescritura)
- Modify: `android/gradle/wrapper/gradle-wrapper.properties`

**Interfaces:**
- Consumes: el estado de `main` al final de la Fase 3.
- Produces: el plugin compila contra Capacitor 8 con Gradle en sintaxis de asignación.

**Contexto:** Gradle 8 exige el operador `=` en la asignación de propiedades, así
que el `android/build.gradle` cambia de forma sistemática y conviene reescribirlo
completo en vez de parchearlo línea por línea. `lintOptions` está obsoleto y se
reemplaza por `lint`.

- [ ] **Step 1: Crear el branch de trabajo**

```bash
git checkout main
git checkout -b feat/capacitor-8
```

- [ ] **Step 2: Correr la herramienta oficial de migración**

```bash
npx @capacitor/plugin-migration-v7-to-v8@latest
```

- [ ] **Step 3: Revisar el diff a mano**

Run: `git diff`

- [ ] **Step 4: Dejar `android/build.gradle` en su forma final**

Reemplazar el contenido completo por:

```groovy
ext {
    junitVersion = project.hasProperty('junitVersion') ? rootProject.ext.junitVersion : '4.13.2'
    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.7.1'
    androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion : '1.2.1'
    androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion : '3.6.1'
}

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.13.0'
    }
}

apply plugin: 'com.android.library'

android {
    namespace = "com.khipu.capacitor"
    compileSdk = project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36
    defaultConfig {
        minSdk = project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
        targetSdk = project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled = false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
    lint {
        abortOnError = false
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation project(':capacitor-android')
    implementation 'com.khipu:khipu-client-android:2.27.0'
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
}
```

- [ ] **Step 5: Subir el wrapper de Gradle**

En `android/gradle/wrapper/gradle-wrapper.properties`:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-all.zip
```

- [ ] **Step 6: Subir las dependencias de Capacitor y el rango de peer**

```bash
npm install --save-dev @capacitor/core@^8 @capacitor/ios@^8 @capacitor/android@^8 @capacitor/cli@^8
```

En `package.json`:

```json
  "peerDependencies": {
    "@capacitor/core": ">=8.0.0"
  },
```

- [ ] **Step 7: Verificar web y Android**

```bash
npm run verify:web
npm test
npm run lint
cd android && ./gradlew clean build test && cd ..
```

Expected: los cuatro pasan.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: soportar Capacitor 8"
```

---

## Task 14: Subir `Package.swift` y el podspec a Capacitor 8 e iOS 15

**Files:**
- Modify: `Package.swift`
- Modify: `CapacitorKhipu.podspec`

**Interfaces:**
- Consumes: el `Package.swift` de la Task 7.
- Produces: el paquete resuelve contra `capacitor-swift-pm` 8.x con iOS 15 como mínimo.

- [ ] **Step 1: Subir la plataforma y la dependencia en `Package.swift`**

Reemplazar:

```swift
    platforms: [.iOS(.v14)],
```

por:

```swift
    platforms: [.iOS(.v15)],
```

Y reemplazar:

```swift
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0"),
```

por:

```swift
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
```

El resto del manifest no cambia. `KhipuClientIOS` sigue en `exact: "2.16.5"` y los
nombres siguen siendo `CapacitorKhipu` para el package y el product.

- [ ] **Step 2: Subir el deployment target del podspec**

En `CapacitorKhipu.podspec`:

```ruby
  s.ios.deployment_target  = '15.0'
```

- [ ] **Step 3: Verificar build, tests y sincronía**

```bash
npm run verify:versions
npm run verify:ios
xcodebuild test -scheme CapacitorKhipu -destination 'platform=iOS Simulator,name=iPhone 16'
npm run swiftlint -- lint
```

Expected: los cuatro pasan. Si la resolución de SPM falla por conflicto de
plataforma, confirmar que `platforms` dice `.v15` y no `.v14`.

- [ ] **Step 4: Commit**

```bash
git add Package.swift CapacitorKhipu.podspec
git commit -m "feat(ios): subir a capacitor-swift-pm 8 e iOS 15"
```

---

## Task 15: App de ejemplo a Capacitor 8 con SPM

**Files:**
- Modify: `example/package.json`
- Recreate: `example/ios/**` y `example/android/**`

**Interfaces:**
- Consumes: el `Package.swift` de la Task 14 y el harness de las Tasks 2 a 4.
- Produces: una app Capacitor 8 con SPM que ejercita el plugin en un dispositivo.

**Contexto:** CocoaPods y SPM no pueden coexistir en un mismo proyecto iOS de
Capacitor, así que hay que regenerar la plataforma. En Capacitor 8 `cap add ios`
usa SPM por defecto, pero se pasa `--packagemanager SPM` de forma explícita para
que la intención quede escrita. Esta tarea es la única que verifica de verdad los
dos riesgos abiertos del spec: la carga del resource bundle de `KhipuClientIOS`
bajo SPM, y si nos afecta el issue `ionic-team/capacitor#8325`.

- [ ] **Step 1: Subir las dependencias del ejemplo a Capacitor 8**

```bash
cd example
npm install @capacitor/core@^8 @capacitor/ios@^8 @capacitor/android@^8 @capacitor/splash-screen@^8
npm install --save-dev @capacitor/cli@^8 vite@latest
npm run build
```

Expected: `vite build` completa sin errores. Si la Task 10 ya subió `vite`, acá solo se
confirma; si no, ver la nota de esa tarea sobre el `preload-helper` de `vite@2`.

- [ ] **Step 2: Regenerar las plataformas nativas con SPM**

**Requiere confirmación explícita del usuario:** borra los proyectos nativos
commiteados.

```bash
cd /Users/edavis/git/capacitor-khipu/example
git rm -r --cached ios android
rm -rf ios android
npm run build
npx cap add ios --packagemanager SPM
npx cap add android
npx cap sync
```

- [ ] **Step 3: Confirmar que el plugin quedó expuesto en `CapApp-SPM`**

Run: `grep -r CapacitorKhipu ios/App/CapApp-SPM/Package.swift`

Expected: aparece dos veces, como `.package(name: "CapacitorKhipu", path: ...)` y
como `.product(name: "CapacitorKhipu", package: "CapacitorKhipu")`. Si no aparece,
revisar el issue `ionic-team/capacitor#8325` antes de seguir.

- [ ] **Step 4: Confirmar que no quedó nada de CocoaPods**

Run: `ls ios/App`

Expected: no hay `Podfile` ni `App.xcworkspace`; el proyecto es `App.xcodeproj`.

- [ ] **Step 4b: Declarar `LSApplicationQueriesSchemes` en el plist regenerado**

Igual que en la Task 10: `npx cap add ios --packagemanager SPM` vuelve a generar el
`Info.plist` del template, sin la llave. En `example/ios/App/App/Info.plist`,
agregar dentro del `<dict>` raíz:

```xml
  <key>LSApplicationQueriesSchemes</key>
  <array>
    <string>bancochilemipass2</string>
    <string>BciPassApp</string>
    <string>BICEPassApp</string>
    <string>scotiabankgo</string>
    <string>SantanderPassApp</string>
    <string>tupass</string>
    <string>bancoestado</string>
    <string>itau.cl</string>
    <string>SecurityPass</string>
  </array>
```

Verificar: `plutil -lint example/ios/App/App/Info.plist` y
`grep -c bancochilemipass2 example/ios/App/App/Info.plist` (debe dar 1).

- [ ] **Step 5: Correr el harness en un simulador de iOS**

```bash
npx cap run ios
```

**Usar un build normal, no `--no-codesign` ni `CODE_SIGNING_ALLOWED=NO`** (misma
razón que en la Task 10: la firma ad-hoc linker-signed deja el Keychain
inaccesible y `SecItem*` devuelve `-34018`, lo que aborta el pago y parece un bug
del SDK).

Comprobar a mano, con un `operationId` válido:
- la operación arranca y la UI del SDK se muestra completa, **con sus imágenes e
  iconos** — esto es lo que verifica la carga del resource bundle bajo SPM;
- el preset *Marca Khipu* aplica el púrpura `#8347AD`;
- `showFooter` incluido en `false` oculta el footer, sin incluir lo deja visible;
- el resultado se renderiza con sus campos y la tabla de eventos;
- comparar los campos del resultado con la corrida de la otra plataforma: deben
  aparecer los mismos. Es la única forma de detectar que iOS y Android discrepen sobre
  la forma del `KhipuResult`, porque iOS la construye a mano y Android la delega al SDK,
  así que ninguna guarda estática puede compararlas;

- [ ] **Step 6: Compuerta bloqueante — Kotlin 2.2.20 contra `khipu-client-android`**

Esto era el riesgo bloqueante del spec y **ya está resuelto en el papel**: se
verificó en el código fuente de `khipu-client-android` en el tag `2.27.0` que el SDK
está en **Kotlin 2.0.21**, no en 1.9, y que usa el plugin
`org.jetbrains.kotlin.plugin.compose` versionado con Kotlin, o sea sin
`kotlinCompilerExtensionVersion` que desalinear. Su `jvmTarget` es 17, consumible
desde una app en Java 21. Un compilador Kotlin 2.2.20 lee metadata de 2.0.21 sin
problema, que es la dirección compatible.

Lo que queda es la confirmación empírica de rutina:

```bash
cd /Users/edavis/git/capacitor-khipu/example
grep -r "kotlin-gradle-plugin" android/build.gradle
cd android && ./gradlew clean assembleDebug && cd ..
```

Expected: el build pasa y `kotlin-gradle-plugin` reporta 2.2.20.

**Si falla con un error del compilador de Compose o de metadata de Kotlin**, es un
hallazgo inesperado que contradice la evidencia del código fuente: registrarlo con la
salida completa y escalarlo al equipo del SDK de Android antes de seguir. Dado lo
verificado, el fallo más probable no sería de Kotlin sino de AGP o del SDK de
Android, así que revisar primero esas versiones.

- [ ] **Step 7: Correr el harness en un emulador de Android**

```bash
npx cap run android
```

Comprobar los mismos puntos que en iOS, menos el del resource bundle.

- [ ] **Step 8: Commit**

```bash
cd /Users/edavis/git/capacitor-khipu
git add example
git commit -m "chore(example): app de ejemplo en Capacitor 8 con SPM"
```

---

## Task 16: Documentar la matriz de compatibilidad y publicar `4.0.0`

**Files:**
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json` (versión)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `capacitor-khipu@4.0.0` en npm como `latest`.

- [ ] **Step 1: Ajustar el job del ejemplo en el CI**

En `main` la app de ejemplo ya no usa workspace de CocoaPods. En
`.github/workflows/ci.yml`, reemplazar el último paso del job `example`:

```yaml
      - name: Sincronizar y construir iOS
        run: |
          npm run build
          npx cap sync ios
          xcodebuild build -project ios/App/App.xcodeproj -scheme App -destination generic/platform=iOS CODE_SIGNING_ALLOWED=NO
        working-directory: example
```

- [ ] **Step 2: Agregar la matriz de compatibilidad al README**

Insertar justo después del título `# capacitor-khipu`:

```markdown
## Compatibilidad

| Capacitor | Plugin | Se instala con | iOS mínimo | minSdk | Estado |
| --- | --- | --- | --- | --- | --- |
| 8 | 4.x | `npm install capacitor-khipu` | 15 | 24 | mantenida |
| 7 | 3.x | `npm install capacitor-khipu@cap7` | 14 | 23 | mantenida |
| 5 y 6 | 2.11.2 | `npm install capacitor-khipu@cap6` | 13 | 22 | fin de soporte |

Las líneas 3.x y 4.x soportan **CocoaPods y Swift Package Manager**. No hace falta
ningún paso extra: el CLI de Capacitor usa el `Package.swift` o el
`CapacitorKhipu.podspec` según el gestor que use tu app. Los dos gestores no pueden
coexistir en un mismo proyecto iOS.
```

- [ ] **Step 2b: Corregir la sección de setup de iOS del README**

Hoy dice «No need for aditional steps», lo que contradice a la documentación
oficial de Khipu. Reemplazar el cuerpo de `## iOS setup` por una explicación de la
llave `LSApplicationQueriesSchemes`, con los mismos nueve schemes de la Task 15
step 4b, y una línea diciendo que en `example/ios/App/App/Info.plist` está
aplicado como referencia.

- [ ] **Step 3: Actualizar las instrucciones de Android del README**

En la sección *Jetpack compose and Kotlin*, subir la versión del plugin de Kotlin
que se le pide al comercio, que en Capacitor 8 es 2.2.20:

```
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.20'
```

**Y arreglar un defecto del estado publicado hoy, que no es de esta migración:** el
README recomienda `1.9.0`, mientras que `khipu-client-android 2.27.0` está compilado
con **Kotlin 2.0.21** (verificado en `gradle/libs.versions.toml` de su tag). Un
comercio que siga el README al pie de la letra queda un major de Kotlin por detrás de
la biblioteca que consume, que es la dirección incompatible. La corrección aplica a
**las tres líneas**, así que la línea 2.x (Task 5) y la 3.x (branch `7.x`) también
deben subir su recomendación a al menos `2.0.21`.

- [ ] **Step 3b: Anclar `release-it` a `main`**

Las Global Constraints piden `requireBranch` en las dos líneas, pero solo la Task 12
lo fija, y únicamente para `7.x`. En `package.json`, dentro de `release-it`:

```json
    "git": {
      "commitMessage": "chore: release ${version}",
      "tagName": "v${version}",
      "requireBranch": "main"
    },
```

Sin esto, un `release-it` corrido por error desde otro branch publicaría como
`latest`, que es justo el accidente que las constraints buscan evitar.

- [ ] **Step 4: Regenerar la documentación de la API y verificar todo**

```bash
npm run docgen
npm run verify
```

Expected: todo pasa. `docgen` no debería cambiar el bloque `docgen-api`, porque la
interfaz TypeScript no se tocó en este plan.

- [ ] **Step 5: Dos commits, separando lo portable de lo que no lo es**

`ci.yml` es específico de `main` (apunta a `App.xcodeproj`/SPM, mientras `7.x`
necesita `App.xcworkspace`/CocoaPods), así que no puede viajar en el mismo commit
que el README, que sí es portable a `7.x`.

```bash
git add .github/workflows/ci.yml
git commit -m "ci: construir la app de ejemplo por xcodeproj en la línea SPM"
git add README.md package.json dist/docs.json
git commit -m "docs: matriz de compatibilidad de Capacitor 5 a 8 y setup de iOS"
```

- [ ] **Step 6: Integrar a `main`**

```bash
git checkout main
git merge --no-ff feat/capacitor-8
npm run verify
```

- [ ] **Step 7: Publicar `4.0.0`**

**Requiere confirmación explícita del usuario.** Este publish mueve `latest` de
`2.11.1` a `4.0.0`.

```bash
npx release-it 4.0.0
git push origin main --tags
```

- [ ] **Step 8: Comprobar el estado final de los dist-tags**

Run: `npm view capacitor-khipu dist-tags`

Expected: `latest: '4.0.0'`, `cap7: '3.0.0'`, `cap6: '2.11.2'`.

- [ ] **Step 9: Portar el harness y los fixes a `7.x`**

Los commits de la Fase 1 y de las Tasks 8 y 9 son comunes a las dos líneas y ya
están en `7.x` porque se cortó después. Solo hay que portar lo que se haya arreglado
en `main` durante la Fase 4 y que no sea específico de Capacitor 8. Revisar commit
por commit:

```bash
git log --oneline 7.x..main
```

Para cada commit común, `git cherry-pick <sha>` sobre `7.x`, **saltando** cualquiera
que toque `example/ios/**`, `example/android/**`, `example/package.json`,
`Package.swift`, `CapacitorKhipu.podspec`, `android/build.gradle` o
`.github/workflows/ci.yml`.

`ci.yml` está en la lista porque la versión de `main` construye la app de ejemplo
por `App.xcodeproj` (SPM) y `7.x` la construye por `App.xcworkspace` (CocoaPods).
El `README.md` y el `package.json` de esos commits sí son portables.
