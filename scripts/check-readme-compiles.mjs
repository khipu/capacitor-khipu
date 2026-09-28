#!/usr/bin/env node
/**
 * Fails when a TypeScript block in the README does not compile against the plugin's
 * own declarations.
 *
 * The README is the first thing a merchant copies, and nothing made it answerable to
 * the compiler: the from-scratch test apps bundle with esbuild, which strips types
 * without checking them. That is how the published `KhipuOptions` came to require
 * every key while the prose right underneath said they were all optional.
 *
 * The `<docgen-api>` section is stripped before parsing. docgen emits method
 * signatures inside ```typescript fences (`startOperation(...) => Promise<...>`) and
 * those are not compilable TypeScript.
 *
 * Accepts a base directory so it can be tested with fixtures, like the other guards.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TSC = join(HERE, '..', 'node_modules', '.bin', 'tsc');

const BASE = resolve(process.argv[2] ?? '.');
const README = join(BASE, 'README.md');
const ENTRY = join(BASE, 'src', 'index.ts');

const source = readFileSync(README, 'utf8').replace(/<docgen-api>[\s\S]*?<\/docgen-api>/g, '');
const blocks = [...source.matchAll(/```typescript\n([\s\S]*?)```/g)].map((match) => match[1]);

if (blocks.length === 0) {
  console.error(
    `No \`\`\`typescript block found in ${README} outside <docgen-api>. ` +
      `This guard's parser is out of date.`,
  );
  process.exit(1);
}

// Imports have to stay at the top level; the rest goes inside an async function so a
// snippet can use `await` the way a merchant would.
const dir = mkdtempSync(join(tmpdir(), 'khipu-readme-'));
const files = blocks.map((block, index) => {
  const imports = [];
  const body = [];
  for (const line of block.split('\n')) {
    (line.startsWith('import ') ? imports : body).push(line);
  }
  const file = join(dir, `snippet-${index}.ts`);
  writeFileSync(
    file,
    `${imports.join('\n')}\nexport async function snippet${index}(): Promise<void> {\n${body.join('\n')}\n}\n`,
  );
  return file;
});

writeFileSync(
  join(dir, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        strict: true,
        exactOptionalPropertyTypes: true,
        noEmit: true,
        skipLibCheck: true,
        target: 'es2017',
        module: 'esnext',
        moduleResolution: 'bundler',
        lib: ['dom', 'es2017'],
        types: [],
        paths: { 'capacitor-khipu': [ENTRY] },
      },
      files,
    },
    null,
    2,
  ),
);

try {
  execFileSync(TSC, ['--project', join(dir, 'tsconfig.json')], { encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
  console.error(`The README's TypeScript does not compile against ${ENTRY}:`);
  console.error(`${error.stdout ?? ''}${error.stderr ?? ''}`.trim());
  process.exit(1);
}

console.log(
  `README TypeScript compiles: ${blocks.length} block(s), strict and exactOptionalPropertyTypes`,
);
