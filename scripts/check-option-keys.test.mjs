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
