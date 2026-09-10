import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = 'scripts/check-option-keys.mjs';

// Six options, eight colors and six result fields: above the sanity floor (5, 8 and
// 5), so a consistent fixture passes and leaves room to test drift without tripping
// the floor.
const OPTIONS = ['title', 'locale', 'theme', 'showFooter', 'showMerchantLogo', 'showPaymentDetails'];
const COLORS = [
  'lightBackground',
  'lightOnBackground',
  'lightPrimary',
  'lightOnPrimary',
  'darkBackground',
  'darkOnBackground',
  'darkPrimary',
  'darkOnPrimary',
];
const RESULT = ['operationId', 'exitTitle', 'exitMessage', 'result', 'failureReason', 'events'];

function write(dir, relative, content) {
  const destination = join(dir, relative);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function webSource({
  reads = ['title', 'locale', 'theme'],
  unsupported = ['showFooter', 'showMerchantLogo', 'showPaymentDetails'],
} = {}) {
  const body = reads.map((key) => `  void opts.${key};`).join('\n');
  const list = unsupported.map((key) => `  '${key}',`).join('\n');
  const colors = COLORS.slice(0, 2)
    .map((key) => `  void colors?.${key};`)
    .join('\n');
  const unsupportedColors = COLORS.slice(2)
    .map((key) => `  '${key}',`)
    .join('\n');

  return (
    `export const WEB_UNSUPPORTED = [\n${list}\n];\n\n` +
    `export const WEB_UNSUPPORTED_COLORS = [\n${unsupportedColors}\n];\n\n` +
    `function run(opts, colors) {\n${body}\n  void opts.colors;\n${colors}\n}\n`
  );
}

/** Builds the six surfaces. Each one can drift independently. */
function fixture({ contract = OPTIONS, harness = OPTIONS, resolve = RESULT, web = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'khipu-keys-'));

  const fields = (keys) => keys.map((k) => `  ${k}: string | undefined;`).join('\n');
  write(
    dir,
    'src/definitions.ts',
    `export interface KhipuOptions {\n${fields(contract)}\n  colors: KhipuColors | undefined;\n}\n\n` +
      `export interface KhipuColors {\n${fields(COLORS)}\n}\n\n` +
      `export interface KhipuResult {\n${fields(RESULT)}\n}\n`,
  );

  const reads = (keys, object) => keys.map((k) => `    _ = ${object}["${k}"]`).join('\n');
  write(
    dir,
    'ios/Sources/KhipuPlugin/KhipuOptionsMapper.swift',
    `func map() {\n${reads(OPTIONS, 'options')}\n    _ = options["colors"]\n${reads(COLORS, 'colors')}\n}\n`,
  );

  // Mirrors KhipuOptionsMapper.java's real call shape: `string(options, "key")` /
  // `bool(options, "key")` for options, `string(colors, "key")` for colors. The
  // `colors` container itself is read via `options.getJSObject("colors")`, which
  // matches neither pattern — kept here so a stray "colors" key never sneaks into the
  // options set (that's what `withoutColors` guards against downstream).
  const mapperCalls = (keys, object) => keys.map((k) => `    string(${object}, "${k}");`).join('\n');
  write(
    dir,
    'android/src/main/java/com/khipu/capacitor/KhipuOptionsMapper.java',
    `class KhipuOptionsMapper {\n${mapperCalls(OPTIONS, 'options')}\n    options.getJSObject("colors");\n${mapperCalls(COLORS, 'colors')}\n}\n`,
  );

  const entries = (keys) => keys.map((k) => `  { key: '${k}' },`).join('\n');
  write(
    dir,
    'example/src/js/fields.js',
    `export const OPTION_FIELDS = [\n${entries(harness)}\n];\n\n` +
      `export const COLOR_FIELDS = [\n${entries(COLORS)}\n];\n\nexport const PRESETS = [];\n`,
  );

  const resolves = (keys) => keys.map((k) => `      "${k}": result.${k},`).join('\n');
  write(
    dir,
    'ios/Sources/KhipuPlugin/KhipuPlugin.swift',
    `func startOperation() {\n    call.resolve([\n${resolves(resolve)}\n    ])\n}\n`,
  );

  write(dir, 'src/web.ts', webSource(web));

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
  it('passes when all six surfaces match', () => {
    const result = run(fixture());

    expect(result.code).toBe(0);
    expect(result.output).toContain('6 options');
    expect(result.output).toContain('8 colors');
    expect(result.output).toContain('6 fields');
  });

  it('fails naming the missing key and the extra one when a surface drifts', () => {
    const drifted = OPTIONS.map((k) => (k === 'showFooter' ? 'showFooterX' : k));
    const result = run(fixture({ harness: drifted }));

    expect(result.code).toBe(1);
    expect(result.output).toContain('fields.js (options) drifted');
    expect(result.output).toContain('does not read/offer: showFooter');
    expect(result.output).toContain('reads/offers extra: showFooterX');
  });

  it("fails naming the missing key and the extra one when iOS's result drifts", () => {
    const drifted = RESULT.map((k) => (k === 'exitTitle' ? 'exitTitleX' : k));
    const result = run(fixture({ resolve: drifted }));

    expect(result.code).toBe(1);
    expect(result.output).toContain('KhipuPlugin.swift (result) drifted');
    expect(result.output).toContain('does not read/offer: exitTitle');
    expect(result.output).toContain('reads/offers extra: exitTitleX');
  });

  it('trips the sanity floor when the contract reads back nearly empty', () => {
    const result = run(fixture({ contract: ['title', 'locale'] }));

    expect(result.code).toBe(1);
    expect(result.output).toContain("This guard's parser is out of date");
  });

  it('fails when an option is neither read by web nor listed as unsupported', () => {
    const result = run(
      fixture({
        web: { reads: ['title', 'locale'], unsupported: ['showFooter', 'showMerchantLogo', 'showPaymentDetails'] },
      }),
    );

    expect(result.code).toBe(1);
    expect(result.output).toContain('web.ts (options) drifted');
    expect(result.output).toContain('does not read/offer: theme');
  });

  it('fails when an option is both read by web and listed as unsupported', () => {
    const result = run(
      fixture({
        web: {
          reads: ['title', 'locale', 'theme'],
          unsupported: ['theme', 'showFooter', 'showMerchantLogo', 'showPaymentDetails'],
        },
      }),
    );

    expect(result.code).toBe(1);
    expect(result.output).toContain('both read and listed as unsupported: theme');
  });

  it("with the repo's real files every surface matches, including web", () => {
    const result = run('.');

    expect(result.code).toBe(0);
    expect(result.output).toContain('9 options');
    expect(result.output).toContain('12 colors');
    expect(result.output).toContain('8 fields');
    expect(result.output).toContain('4 options honoured with 5 declared unsupported');
  });
});
