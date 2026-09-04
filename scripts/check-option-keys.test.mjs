import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = 'scripts/check-option-keys.mjs';

// Seis opciones, ocho colores y seis campos de resultado: por encima del piso de
// cordura (5, 8 y 5), así que un fixture consistente pasa y deja espacio para probar
// la deriva sin disparar el piso.
const OPCIONES = ['title', 'locale', 'theme', 'showFooter', 'showMerchantLogo', 'showPaymentDetails'];
const COLORES = [
  'lightBackground',
  'lightOnBackground',
  'lightPrimary',
  'lightOnPrimary',
  'darkBackground',
  'darkOnBackground',
  'darkPrimary',
  'darkOnPrimary',
];
const RESULTADO = ['operationId', 'exitTitle', 'exitMessage', 'result', 'failureReason', 'events'];

function escribir(dir, relativo, contenido) {
  const destino = join(dir, relativo);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, contenido);
}

/** Arma las cinco superficies. Cada una se puede desviar por separado. */
function fixture({ contrato = OPCIONES, harness = OPCIONES, resolve = RESULTADO } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'khipu-keys-'));

  const campos = (claves) => claves.map((k) => `  ${k}: string | undefined;`).join('\n');
  escribir(
    dir,
    'src/definitions.ts',
    `export interface KhipuOptions {\n${campos(contrato)}\n  colors: KhipuColors | undefined;\n}\n\n` +
      `export interface KhipuColors {\n${campos(COLORES)}\n}\n\n` +
      `export interface KhipuResult {\n${campos(RESULTADO)}\n}\n`,
  );

  const lecturas = (claves, objeto) => claves.map((k) => `    _ = ${objeto}["${k}"]`).join('\n');
  escribir(
    dir,
    'ios/Sources/KhipuPlugin/KhipuOptionsMapper.swift',
    `func map() {\n${lecturas(OPCIONES, 'options')}\n    _ = options["colors"]\n${lecturas(COLORES, 'colors')}\n}\n`,
  );

  const has = (claves, objeto) => claves.map((k) => `    ${objeto}.has("${k}");`).join('\n');
  escribir(
    dir,
    'android/src/main/java/com/khipu/capacitor/KhipuPlugin.java',
    `class KhipuPlugin {\n${has(OPCIONES, 'options')}\n    options.has("colors");\n${has(COLORES, 'colors')}\n}\n`,
  );

  const entradas = (claves) => claves.map((k) => `  { key: '${k}' },`).join('\n');
  escribir(
    dir,
    'example/src/js/fields.js',
    `export const OPTION_FIELDS = [\n${entradas(harness)}\n];\n\n` +
      `export const COLOR_FIELDS = [\n${entradas(COLORES)}\n];\n\nexport const PRESETS = [];\n`,
  );

  const resuelve = (claves) => claves.map((k) => `      "${k}": result.${k},`).join('\n');
  escribir(
    dir,
    'ios/Sources/KhipuPlugin/KhipuPlugin.swift',
    `func startOperation() {\n    call.resolve([\n${resuelve(resolve)}\n    ])\n}\n`,
  );

  return dir;
}

function run(base) {
  try {
    const stdout = execFileSync('node', [SCRIPT, base], { encoding: 'utf8' });
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.status, output: `${error.stdout}${error.stderr}` };
  }
}

describe('check-option-keys', () => {
  it('pasa cuando las cinco superficies coinciden', () => {
    const result = run(fixture());

    expect(result.code).toBe(0);
    expect(result.output).toContain('6 opciones');
    expect(result.output).toContain('8 colores');
    expect(result.output).toContain('6 campos');
  });

  it('falla nombrando la clave que falta y la que sobra cuando una superficie deriva', () => {
    const derivado = OPCIONES.map((k) => (k === 'showFooter' ? 'showFooterX' : k));
    const result = run(fixture({ harness: derivado }));

    expect(result.code).toBe(1);
    expect(result.output).toContain('fields.js (opciones) derivó');
    expect(result.output).toContain('no lee/ofrece: showFooter');
    expect(result.output).toContain('lee/ofrece de más: showFooterX');
  });

  it('falla nombrando la clave que falta y la que sobra cuando el resultado de iOS deriva', () => {
    const derivado = RESULTADO.map((k) => (k === 'exitTitle' ? 'exitTitleX' : k));
    const result = run(fixture({ resolve: derivado }));

    expect(result.code).toBe(1);
    expect(result.output).toContain('KhipuPlugin.swift (resultado) derivó');
    expect(result.output).toContain('no lee/ofrece: exitTitle');
    expect(result.output).toContain('lee/ofrece de más: exitTitleX');
  });

  it('dispara el piso de cordura si el contrato se lee casi vacío', () => {
    const result = run(fixture({ contrato: ['title', 'locale'] }));

    expect(result.code).toBe(1);
    expect(result.output).toContain('El parser de esta guarda quedó obsoleto');
  });

  it('con los archivos reales del repo las cinco superficies coinciden', () => {
    const result = run('.');

    expect(result.code).toBe(0);
    expect(result.output).toContain('9 opciones');
    expect(result.output).toContain('12 colores');
    expect(result.output).toContain('8 campos');
  });
});
