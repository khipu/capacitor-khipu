import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = 'scripts/check-readme-compiles.mjs';

function write(dir, relative, contents) {
  const target = join(dir, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

/** A base directory with a tiny contract and a README block to check against it. */
function fixture(block) {
  const dir = mkdtempSync(join(tmpdir(), 'khipu-readme-'));

  write(
    dir,
    'src/definitions.ts',
    'export interface Options {\n  title?: string | undefined;\n}\n' +
      'export declare const Khipu: {\n' +
      '  startOperation(call: { operationId: string; options: Options }): Promise<void>;\n' +
      '};\n',
  );
  write(dir, 'src/index.ts', "export * from './definitions';\n");
  write(dir, 'README.md', `# Fixture\n\n\`\`\`typescript\n${block}\`\`\`\n`);

  return dir;
}

function run(base) {
  try {
    return { code: 0, output: execFileSync('node', [SCRIPT, base], { encoding: 'utf8' }) };
  } catch (error) {
    return { code: error.status, output: `${error.stdout}${error.stderr}` };
  }
}

describe('check-readme-compiles', () => {
  it('passes when the block compiles against the contract', () => {
    const result = run(
      fixture(
        "import { Khipu } from 'capacitor-khipu';\n" +
          "await Khipu.startOperation({ operationId: 'abc', options: { title: 'Store' } });\n",
      ),
    );

    expect(result.code).toBe(0);
    expect(result.output).toContain('1 block(s)');
  });

  it('fails when the block omits a required property', () => {
    const result = run(
      fixture(
        "import { Khipu } from 'capacitor-khipu';\n" +
          "await Khipu.startOperation({ options: { title: 'Store' } });\n",
      ),
    );

    expect(result.code).toBe(1);
    expect(result.output).toContain('does not compile');
    expect(result.output).toContain('operationId');
  });

  it('fails when there is no typescript block to check', () => {
    const dir = fixture('');
    writeFileSync(join(dir, 'README.md'), '# Fixture\n\nNo code here.\n');

    const result = run(dir);

    expect(result.code).toBe(1);
    expect(result.output).toContain("This guard's parser is out of date");
  });

  it("ignores the docgen section, whose typescript blocks are signatures", () => {
    const dir = fixture("import { Khipu } from 'capacitor-khipu';\nvoid Khipu;\n");
    const readme = join(dir, 'README.md');
    writeFileSync(
      readme,
      `${readFileSync(readme, 'utf8')}\n<docgen-api>\n\n\`\`\`typescript\nstartOperation(options: Options) => Promise<void>\n\`\`\`\n\n</docgen-api>\n`,
    );

    expect(run(dir).code).toBe(0);
  });

  it('the real README compiles against the real contract', () => {
    expect(run('.').code).toBe(0);
  });
});
