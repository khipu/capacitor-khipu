# Plugin Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every `startOperation` call settle, make the published TypeScript contract usable and honest, and put the whole repo in English.

**Architecture:** Small extracted units with test seams — a Java options mapper and result reader mirroring the Swift ones, a web layer that declares what it does not support — plus three source-parsing guards that fail when the contract, the native versions, or the README drift from each other.

**Tech Stack:** TypeScript 5.9 + rollup, vitest (jsdom), Swift 5.9 + XCTest via SwiftPM, Java 21 + JUnit4/Mockito via Gradle, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-09-plugin-hardening-design.md`

## Global Constraints

- **English only.** Every comment, identifier, string, test name and document in the repo. This applies to code you write in every task, not only to Task 1.
- **Conventional commits.** commitlint runs on `commit-msg` via lefthook; `prettier` and `eslint` run on `pre-commit`. A commit that fails them is rejected.
- **Node 22 for any lockfile work:** `~/.nvm/versions/node/v22.23.2/bin/npm install`. The Homebrew Node builds a different tree and breaks `npm ci` in CI.
- **iOS SDK pin:** `KhipuClientIOS` exactly `2.16.5`, identical in `Package.swift` and `CapacitorKhipu.podspec`. `scripts/check-native-versions.mjs` enforces it.
- **Android SDK pin:** `com.khipu:khipu-client-android:2.28.0` after Task 7.
- **Do not publish.** The npm publish needs a human with 2FA. Prepare the command, never run it.
- **Do not touch `release/2.x`.**
- **Target versions:** `4.1.0` on `main`, `3.1.0` on `7.x`.

---

### Task 1: Put the repo in English

Mechanical translation, no behaviour change. It goes first so every later diff is logic
only, with no translation noise mixed in. The test suite must stay green throughout.

**Files:**
- Modify: `scripts/check-native-versions.mjs`, `scripts/check-native-versions.test.mjs`
- Modify: `scripts/check-option-keys.mjs`, `scripts/check-option-keys.test.mjs`
- Modify: `ios/Sources/KhipuPlugin/KhipuPlugin.swift`, `KhipuOptionsDraft.swift`, `KhipuOptionsMapper.swift`
- Modify: `ios/Tests/KhipuPluginTests/KhipuOptionsMapperTests.swift`, `KhipuPluginTests.swift`
- Modify: `src/web.test.ts`
- Modify: `.github/workflows/ci.yml`, `.gitignore`, `.prettierignore`, `.eslintignore`
- Modify: `example/src/index.html`, `example/src/js/{fields,example,payload,storage,ui}.js`, `example/src/js/{payload,storage,result}.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: the guard output strings every later task's tests assert on — `options`,
  `colors`, `fields`, `drifted`, `does not read/offer:`, `reads/offers extra:`,
  `out of sync`, `not found`, `This guard's parser is out of date`.

- [ ] **Step 1: Translate the two guards' user-visible strings**

`scripts/check-native-versions.mjs`, exact replacements:

| Spanish | English |
| --- | --- |
| `No se encontró la versión de KhipuClientIOS en ${path}` | `KhipuClientIOS version not found in ${path}` |
| `KhipuClientIOS desincronizado:` | `KhipuClientIOS out of sync:` |
| `KhipuClientIOS sincronizado en ${spm}` | `KhipuClientIOS in sync at ${spm}` |

`scripts/check-option-keys.mjs`, exact replacements:

| Spanish | English |
| --- | --- |
| `No se pudo extraer la interfaz ${nombre} de ${CONTRATO}. El parser de esta guarda quedó obsoleto.` | `Could not extract interface ${name} from ${CONTRACT}. This guard's parser is out of date.` |
| `No se pudo extraer el bloque \`call.resolve\` de ${PLUGIN}. El parser de esta guarda quedó obsoleto.` | `Could not extract the \`call.resolve\` block from ${PLUGIN}. This guard's parser is out of date.` |
| `La extracción del contrato devolvió ${a} opciones, ${b} colores y ${c} campos de resultado, muy pocas para ser real. El parser de esta guarda quedó obsoleto: arréglalo en vez de confiar en que las superficies coinciden.` | `Contract extraction returned ${a} options, ${b} colors and ${c} result fields — too few to be real. This guard's parser is out of date: fix it instead of trusting that the surfaces match.` |
| `${nombre} derivó del contrato de ${CONTRATO}:` | `${name} drifted from the contract in ${CONTRACT}:` |
| `  no lee/ofrece: ${falta}` | `  does not read/offer: ${missing}` |
| `  lee/ofrece de más: ${sobra}` | `  reads/offers extra: ${extra}` |
| `Vocabulario sincronizado en las cuatro superficies: ${a} opciones, ${b} colores, y en el resultado que arma iOS: ${c} campos` | `Vocabulary in sync across every surface: ${a} options, ${b} colors, and ${c} fields in the result iOS builds` |

Surface labels: `(opciones)` → `(options)`, `(colores)` → `(colors)`,
`(resultado)` → `(result)`.

Identifiers: `leer`→`read`, `claves`→`keys`, `sinColors`→`withoutColors`,
`interfaz`→`interfaceKeys`, `clavesDeResolve`→`resolveKeys`, `CONTRATO`→`CONTRACT`,
`contrato`→`contract`, `opciones`→`options`, `colores`→`colors`,
`resultado`→`result`, `tramos`→`sections`, `superficies`→`surfaces`, `nombre`→`name`,
`esperado`→`expected`, `real`→`actual`, `derivo`→`drifted`, `falta`→`missing`,
`sobra`→`extra`.

Translate the block comments too. Their value is the reasoning they carry — why the
guard exists, why regex parsing is acceptable here, why Android's result half cannot be
checked — so preserve the argument, not the phrasing.

- [ ] **Step 2: Translate both guards' tests in lockstep**

In `scripts/check-native-versions.test.mjs` and `scripts/check-option-keys.test.mjs`,
translate the `it(...)` names and update every `toContain` to the English strings from
Step 1. Identifiers: `escribir`→`write`, `OPCIONES`→`OPTIONS`, `COLORES`→`COLORS`,
`RESULTADO`→`RESULT`, `campos`→`fields`, `lecturas`→`reads`, `entradas`→`entries`,
`resuelve`→`resolves`, `derivado`→`drifted`, fixture option `contrato`→`contract`.

Example of the shape:

```js
it('passes when every surface matches', () => {
  const result = run(fixture());

  expect(result.code).toBe(0);
  expect(result.output).toContain('6 options');
  expect(result.output).toContain('8 colors');
  expect(result.output).toContain('6 fields');
});
```

- [ ] **Step 3: Run the JS suite**

Run: `npm test`
Expected: PASS, 30 tests. The guard fixture tests print their failure-path output to
stderr — that is the tests exercising the failure path, not a failure.

- [ ] **Step 4: Translate the Swift sources and test names**

Comments in `KhipuPlugin.swift`, `KhipuOptionsDraft.swift` and
`KhipuOptionsMapper.swift`: translate the prose, keep the arguments intact — the
`topMost` comment's point about not being a `UIViewController` extension, the draft's
point about `KhipuClientIOS`' internal properties, and the `apply(_:)` comment's
accepted test gap with its stated limit.

Test renames, exactly:

| Old | New |
| --- | --- |
| `testSinOpcionesElDraftQuedaVacio` | `testDraftIsEmptyWithoutOptions` |
| `testMapeaLosCamposDeTexto` | `testMapsTheTextFields` |
| `testMapeaLosCincoBooleanos` | `testMapsTheFiveBooleans` |
| `testUnBooleanoEnFalseSeDistingueDeUnBooleanoAusente` | `testFalseBooleanDiffersFromAbsentBoolean` |
| `testAceptaBooleanosEnvueltosEnNSNumber` | `testAcceptsBooleansWrappedInNSNumber` |
| `testMapeaLosTresTemas` | `testMapsTheThreeThemes` |
| `testIgnoraUnTemaDesconocido` | `testIgnoresAnUnknownTheme` |
| `testMapeaLosDoceColores` | `testMapsTheTwelveColors` |
| `testColorsAusenteDejaElDraftSinColores` | `testAbsentColorsLeavesTheDraftWithoutColors` |
| `testColorsVacioProduceUnDraftDeColoresVacio` | `testEmptyColorsProducesAnEmptyColorsDraft` |
| `testDescartaValoresDeTipoIncorrectoEnVezDeCrashear` | `testDiscardsWrongTypedValuesInsteadOfCrashing` |
| `testConstruyeLasOpcionesNativasSinCrashear` | `testBuildsTheNativeOptionsWithoutCrashing` |
| `testDeclaraLaIdentidadQueElPuenteDeCapacitorEspera` | `testDeclaresTheIdentityTheCapacitorBridgeExpects` |
| `testExponeSoloStartOperationComoPromesa` | `testExposesOnlyStartOperationAsAPromise` |
| `testTopMostDevuelveElMismoControladorCuandoNoHayNadaPresentado` | `testTopMostReturnsTheSameControllerWhenNothingIsPresented` |
| `testTopMostSigueLaCadenaHastaElUltimoPresentado` | `testTopMostFollowsTheChainToTheLastPresented` |

Also in `KhipuPluginTests.swift`: `ControladorConPresentado` → `ControllerWithPresented`
and its `presentado` property → `presented`. In `KhipuOptionsMapperTests.swift`, the
fixture value `"showFooter": "sí"` → `"showFooter": "yes"`.

- [ ] **Step 5: Run the iOS tests**

Run: `xcodebuild test -scheme CapacitorKhipu -destination 'platform=iOS Simulator,name=iPhone 16'`
Expected: PASS, 16 tests.

- [ ] **Step 6: Translate the remaining files**

`.github/workflows/ci.yml` — the three explanatory comments (why `npm run lint` is not
used, why SwiftLint needs its own presence check, why the Gradle wrapper is validated,
why `npm ci` must run before Gradle). `.gitignore`, `.prettierignore`, `.eslintignore` —
one comment each. `example/src/index.html` — `Operación` → `Operation`,
`Iniciar operación` → `Start operation`, and the helper sentence about omitted keys.
`example/src/js/*.js` — block comments. `example/src/js/*.test.js` and `src/web.test.ts`
— every `it(...)` name.

- [ ] **Step 7: Verify nothing Spanish is left in tracked source**

Two greps, because one is not enough. The first catches accented text:

```bash
for f in $(git ls-files | grep -Ev '\.(png|jar|pbxproj|json|storyboard|plist|xml|md)$'); do
  grep -l '[áéíóúñÁÉÍÓÚÑ¿¡]' "$f" 2>/dev/null
done
```

The second catches Spanish **without** diacritics, which is where user-facing copy
hides — preset labels, section headings, button text, `lang="es"`:

```bash
grep -rinE '\b(opciones|colores|resultado|resultados|todo|todos|ninguno|modo|oscuro|claro|marca|activado|desactivado|defecto|iniciar|guardar|limpiar|enviar|enviado|copiar|incluir|incluido|campo|campos|clave|claves|valor|valores|pago|operacion|operaciones)\b' \
  --include='*.ts' --include='*.js' --include='*.mjs' --include='*.html' --include='*.swift' --include='*.java' --include='*.yml' \
  src/ scripts/ ios/ android/ example/src/ .github/
grep -rn 'lang="es"' example/
```

Expected: no output from the first; from the second, only English false positives
(`todo` in an English comment, a proper noun). Adjudicate each hit — do not silence one
by narrowing the pattern.

**Do not skip the second grep.** The first one alone passed on a tree that still had
`lang="es"`, three Spanish `<h2>` headings and four Spanish preset labels in it.

Markdown is excluded because `docs/` is Task 2's job. Option and colour keys in
`OPTION_FIELDS` and `COLOR_FIELDS` are protocol names, not copy: they stay, and
`npm run verify:keys` will tell you if one was touched.

- [ ] **Step 8: Run everything and commit**

Run: `npm test && npm run lint`
Expected: PASS.

```bash
git add -A
git commit -m "refactor: put code, comments and test names in English"
```

---

### Task 2: STATUS document

**Files:**
- Create: `docs/STATUS.md`
- Delete: `docs/superpowers/ESTADO.md`, `docs/superpowers/plans/2026-09-04-migracion-spm-capacitor-8.md`, `docs/superpowers/specs/2026-09-04-migracion-spm-capacitor-8-design.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `docs/STATUS.md`, where later tasks record outcomes.

- [ ] **Step 1: Write `docs/STATUS.md`**

Translate `ESTADO.md` into English, keeping: the three published lines and their
dist-tags, the defects fixed that reached merchants, what was verified on device, the
from-scratch doctest recipe, the Kotlin/AGP finding, and the `locale` default divergence
between the two native SDKs.

Drop the count of unreviewed Dependabot alerts. It is a public repository and that
number is a maintainer's view, not a merchant's.

Add a **Known pending** section carrying these items forward:

```markdown
## Known pending

- **Measure what Capacitor's iOS bridge does with `nil as Any`.** `KhipuPlugin.swift`
  resolves absent values that way. Android omits the key entirely. Until this is
  measured on a device we do not know whether the two platforms already agree, so the
  canonical shape of an absent result field is undecided. See section C5 of the
  hardening spec.
- **The AAR injects location permissions.** Its manifest declares `INTERNET`,
  `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`, and the merger puts all three
  into every merchant app. Merchants publishing to Play must declare location use in
  their data safety form. Documenting it in the README was considered and deliberately
  left out of the hardening pass; it wants a channel to the Android SDK team.
- **An unknown enum value from the protocol can crash the whole process** — tracked as
  [IKW-1232](https://khipucom.atlassian.net/browse/IKW-1232), the single ticket all four
  bridge repositories reference. On a failure event the SDK threw
  `JsonMappingException: Cannot deserialize FailureReasonType` inside
  `com.khipu.khenshin.protocol.Converter`, on socket.io's `EventThread`, uncaught: the
  process died, and a dead process cannot resolve or reject anything.

  Status, in three parts, because they resolve at different speeds:
  - *The value that was hit* is covered. Protocol `1.0.60` adds `USER_DISCONNECTED` and
    `forValue` recognises it.
  - *The mechanism* is fixed under IKW-1232, which wraps the SDK's 23 socket listeners
    so a throwing handler never reaches the event thread. Expected as a patch release
    after `2.28.0`. Two consequences reach us and both are already handled: a terminal
    message that fails to parse ends the operation with no `failureReason` (our result
    reader omits null keys, and a test asserts it), and a non-terminal failure leaves
    the operation genuinely in flight with the payer's only exit being to cancel.
  - *The deserialisation itself* is not hardened. Verified against protocol `1.0.60`:
    `forValue` declares `throws IOException`, there is `@JsonValue` and `@JsonCreator`
    but no `@JsonEnumDefaultValue`, the converter configures only
    `FAIL_ON_UNKNOWN_PROPERTIES`, and it is 8 of 8 enums with that pattern. Making
    unknown values degrade instead of throwing is a proposal in the ticket, in another
    repository, neither decided nor prioritised. **Assume it never arrives.**

  A bridge reading only the middle bullet may conclude it needs its own timeout. It does
  not: a timeout over a payment operation that is still alive is worse than the problem.
- **Verify dark mode colour mapping on Android**, and **compare `KhipuResult` fields
  between iOS and Android** on the same operation.
- **Exercise `canOpenURL` on a physical device** with a bank app installed. The nine
  `LSApplicationQueriesSchemes` are still verified only as a declaration.
```

- [ ] **Step 2: Delete the finished migration's documents**

```bash
git rm docs/superpowers/ESTADO.md \
       docs/superpowers/plans/2026-09-04-migracion-spm-capacitor-8.md \
       docs/superpowers/specs/2026-09-04-migracion-spm-capacitor-8-design.md
```

That migration is done and git keeps both documents in history. This plan and its spec
stay until the work lands, then get archived the same way.

- [ ] **Step 3: Commit**

```bash
git add docs/STATUS.md
git commit -m "docs: replace the migration notes with an English status document"
```

---

### Task 3: README compile guard, and make the options optional

The guard is the failing test. Write it first, watch it fail against the real README,
then fix the declarations and watch it pass.

**Files:**
- Create: `scripts/check-readme-compiles.mjs`, `scripts/check-readme-compiles.test.mjs`
- Modify: `src/definitions.ts`, `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run verify:readme`; `KhipuOptions` and `KhipuColors` with every field
  declared `field?: T | undefined`.

- [ ] **Step 1: Write the guard**

Create `scripts/check-readme-compiles.mjs`:

```js
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
        moduleResolution: 'node',
        lib: ['dom', 'es2017'],
        types: [],
        baseUrl: dir,
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node scripts/check-readme-compiles.mjs`
Expected: FAIL, exit 1, with
`error TS2740: Type '{ title: string; theme: "system"; }' is missing the following properties from type 'KhipuOptions'`.

That is the bug reproduced by a test.

- [ ] **Step 3: Make the input options optional**

In `src/definitions.ts`, every field of `KhipuOptions` and `KhipuColors` becomes
`field?: T | undefined`. The `?` fixes it; the explicit `| undefined` keeps working for
a merchant on `exactOptionalPropertyTypes` who writes `locale: undefined` today.

```ts
export interface KhipuOptions {
  locale?: string | undefined;
  title?: string | undefined;
  titleImageUrl?: string | undefined;
  skipExitPage?: boolean | undefined;
  skipExitSuccessPage?: boolean | undefined;
  theme?: 'light' | 'dark' | 'system' | undefined;
  colors?: KhipuColors | undefined;
  showFooter?: boolean | undefined;
  showMerchantLogo?: boolean | undefined;
  showPaymentDetails?: boolean | undefined;
}
```

Do the same for all twelve fields of `KhipuColors`. **Do not touch `KhipuResult` or
`KhipuEvent`** — they are outputs, where `| undefined` without `?` is the right promise.

- [ ] **Step 4: Run the guard again**

Run: `node scripts/check-readme-compiles.mjs`
Expected: PASS — `README TypeScript compiles: 1 block(s), strict and exactOptionalPropertyTypes`.

- [ ] **Step 5: Write the guard's own tests**

Create `scripts/check-readme-compiles.test.mjs`, in the style of the other two:

```js
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
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
```

Add `readFileSync` to the `node:fs` import at the top of that file.

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: PASS, 35 tests.

- [ ] **Step 7: Wire it into verify and CI**

In `package.json`, add the script and put it in the chain:

```json
"verify": "npm run test && npm run verify:versions && npm run verify:keys && npm run verify:readme && npm run verify:ios && npm run verify:android && npm run verify:web",
"verify:readme": "node scripts/check-readme-compiles.mjs",
```

In `.github/workflows/ci.yml`, in the `web` job, after `- run: npm run verify:keys`:

```yaml
      - run: npm run verify:readme
```

- [ ] **Step 8: Commit**

```bash
git add scripts/check-readme-compiles.mjs scripts/check-readme-compiles.test.mjs src/definitions.ts package.json .github/workflows/ci.yml
git commit -m "fix: make every option optional, and hold the README to the compiler"
```

---

### Task 4: Document the contract, regenerate the README

**Files:**
- Modify: `src/definitions.ts`, `README.md` (generated section)

**Interfaces:**
- Consumes: the optional fields from Task 3.
- Produces: a `<docgen-api>` section carrying the field documentation.

- [ ] **Step 1: Add JSDoc to every declaration**

Write one JSDoc per field. Cover, at minimum:

```ts
export interface StartOperationOptions {
  /**
   * The operation id returned by the Khipu API when you created the payment.
   */
  operationId: string;
  /**
   * Presentation options. Every key is optional, and leaving one out is not the same
   * as sending it: an absent key lets the native SDK apply its own default.
   */
  options?: KhipuOptions | undefined;
}
```

On `locale`, state the divergence:

```ts
  /**
   * BCP 47-ish locale for the payment screen, e.g. `es_CL`.
   *
   * The two native SDKs disagree on the default: iOS falls back to `es_CL` while
   * Android follows the phone's language. Send it explicitly if you need the same
   * language on both.
   */
  locale?: string | undefined;
```

On `skipExitSuccessPage`, be honest about the web:

```ts
  /**
   * Skips the success page at the end of the flow.
   *
   * Native only for now. The deployed web loader does not read this key yet; it is
   * sent so it starts working when a later version does.
   */
  skipExitSuccessPage?: boolean | undefined;
```

On `KhipuResult.result` and `failureReason`, record what abandonment looks like:

```ts
  /**
   * Outcome of the operation. A user who abandons the payment arrives here as
   * `'ERROR'` with `failureReason: 'USER_CANCELED'` — not as a rejected promise.
   */
  result: 'OK' | 'ERROR' | 'WARNING' | 'CONTINUE';
```

Document `title`, `titleImageUrl`, `theme`, `colors`, `showFooter`,
`showMerchantLogo`, `showPaymentDetails`, `skipExitPage`, every field of `KhipuResult`
and `KhipuEvent`, and name on each of the web-unsupported options that web ignores it.

- [ ] **Step 2: Regenerate**

Run: `npm run build`
Expected: the `<docgen-api>` block in `README.md` now shows a Description column.

- [ ] **Step 3: Confirm the guards still pass**

Run: `npm test && npm run verify:readme && npm run verify:keys`
Expected: PASS. The README guard must still ignore the regenerated docgen section.

- [ ] **Step 4: Commit**

```bash
git add src/definitions.ts README.md
git commit -m "docs: document the option and result contract in the type declarations"
```

---

### Task 5: Rework the web layer

**Files:**
- Modify: `src/web.ts`, `src/web.test.ts`

**Interfaces:**
- Consumes: `KhipuOptions`, `KhipuResult`, `StartOperationOptions` from `./definitions`.
- Produces: `WEB_UNSUPPORTED: readonly (keyof KhipuOptions)[]` and
  `WEB_UNSUPPORTED_COLORS: readonly (keyof KhipuColors)[]`, both exported from
  `src/web.ts`, which Task 6's guard parses. The options the layer reads are written as
  `opts.<key>` and the colours as `colors?.<key>`, which is the shape that guard greps
  for.

- [ ] **Step 1: Write the failing tests**

Replace `src/web.test.ts` with:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KhipuWeb } from './web';

interface StartedCall {
  descriptor: string;
  settings: Record<string, any>;
}

/** Installs a fake `window.Khipu` and records what the plugin asks it to start. */
function fakeWidget(calls: StartedCall[], result: unknown = { result: 'OK' }) {
  (window as any).Khipu = function FakeKhipu() {
    return {
      startOperation(descriptor: string, callback: (value: unknown) => void, settings: any) {
        calls.push({ descriptor, settings });
        callback(result);
      },
    };
  };
}

describe('KhipuWeb', () => {
  let calls: StartedCall[];

  beforeEach(() => {
    calls = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).Khipu;
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('does not touch the page when it is merely constructed', () => {
    new KhipuWeb();

    expect(document.getElementById('kws_script_id')).toBeNull();
    expect(document.getElementById('khipu-web-root')).toBeNull();
  });

  it('mounts the container on the first operation', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    expect(document.getElementById('khipu-web-root')).not.toBeNull();
  });

  it('resolves with what the widget hands back', async () => {
    fakeWidget(calls, { operationId: 'abc', result: 'OK' });

    const result = await new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    expect(result).toEqual({ operationId: 'abc', result: 'OK' });
    expect(calls[0].descriptor).toBe('abc');
  });

  it('sends locale at the root of the settings, where kws.js reads it', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: { locale: 'es_CL' } });

    expect(calls[0].settings.locale).toBe('es_CL');
  });

  it('omits locale when the merchant did not send one', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    expect('locale' in calls[0].settings).toBe(false);
  });

  it('picks the primary colour that matches the resolved theme', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({
      operationId: 'abc',
      options: { theme: 'dark', colors: { lightPrimary: '#8347AD', darkPrimary: '#3CB4E5' } },
    });

    expect(calls[0].settings.options.style).toEqual({ theme: 'dark', primaryColor: '#3CB4E5' });
  });

  it('omits primaryColor when no colours were given', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: { theme: 'light' } });

    expect(calls[0].settings.options.style).toEqual({ theme: 'light' });
  });

  it('resolves the system theme against the media query', async () => {
    fakeWidget(calls);
    (window as any).matchMedia = () => ({ matches: true });

    await new KhipuWeb().startOperation({ operationId: 'abc', options: { theme: 'system' } });

    expect(calls[0].settings.options.style.theme).toBe('dark');
    delete (window as any).matchMedia;
  });

  it('defaults both skip flags to false', async () => {
    fakeWidget(calls);

    await new KhipuWeb().startOperation({ operationId: 'abc', options: {} });

    expect(calls[0].settings.options.skipExitPage).toBe(false);
    expect(calls[0].settings.options.skipExitSuccessPage).toBe(false);
  });

  it('rejects instead of hanging when the widget throws', async () => {
    (window as any).Khipu = function FakeKhipu() {
      return {
        startOperation() {
          throw new Error('descriptor must be defined');
        },
      };
    };

    await expect(
      new KhipuWeb().startOperation({ operationId: '', options: {} }),
    ).rejects.toThrow('descriptor must be defined');
  });

  it('rejects when kws.js fails to load', async () => {
    const pending = new KhipuWeb().startOperation({ operationId: 'abc', options: {} });
    const assertion = expect(pending).rejects.toThrow('kws.js failed to load');

    document.getElementById('kws_script_id')?.dispatchEvent(new Event('error'));

    await assertion;
  });

  it('rejects when kws.js loads but never defines Khipu', async () => {
    const pending = new KhipuWeb().startOperation({ operationId: 'abc', options: {} });
    const assertion = expect(pending).rejects.toThrow('kws.js loaded but never defined Khipu');

    document.getElementById('kws_script_id')?.dispatchEvent(new Event('load'));

    await assertion;
  });

  it('rejects when kws.js never fires either event', async () => {
    const pending = new KhipuWeb().startOperation({ operationId: 'abc', options: {} });
    const assertion = expect(pending).rejects.toThrow('timed out waiting for kws.js');

    await vi.advanceTimersByTimeAsync(10_050);

    await assertion;
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/web.test.ts`
Expected: FAIL — the constructor test fails because the current constructor injects the
script, and the locale/reject tests fail because that behaviour does not exist yet.

- [ ] **Step 3: Rewrite `src/web.ts`**

```ts
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

  private loading?: Promise<KwsWidget>;

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
      const timer = setTimeout(
        () => reject(new Error('timed out waiting for kws.js')),
        KhipuWeb.LOAD_TIMEOUT_MS,
      );

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

  private static theme(theme: KhipuOptions['theme']): 'light' | 'dark' {
    if (theme === 'dark') {
      return 'dark';
    }
    if (theme === 'system') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
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
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/web.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Run everything and commit**

Run: `npm test && npm run lint && npm run verify:web`
Expected: PASS.

```bash
git add src/web.ts src/web.test.ts
git commit -m "fix: send locale on web, load kws.js on demand, and never hang"
```

---

### Task 6: Teach the vocabulary guard about the web surface

**Files:**
- Modify: `scripts/check-option-keys.mjs`, `scripts/check-option-keys.test.mjs`

**Interfaces:**
- Consumes: `WEB_UNSUPPORTED` and `WEB_UNSUPPORTED_COLORS` from Task 5.
- Produces: a guard that fails when a contract option is neither read by `src/web.ts`
  nor listed as unsupported.

- [ ] **Step 1: Write the failing test**

Add to `scripts/check-option-keys.test.mjs`. Extend `fixture()` to also write a
`src/web.ts`, defaulting to a consistent one:

```js
function webSource({ reads = ['title', 'locale', 'theme'], unsupported = ['showFooter', 'showMerchantLogo', 'showPaymentDetails'] } = {}) {
  const body = reads.map((key) => `  void opts.${key};`).join('\n');
  const list = unsupported.map((key) => `  '${key}',`).join('\n');
  const colors = COLORS.slice(0, 2).map((key) => `  void colors?.${key};`).join('\n');
  const unsupportedColors = COLORS.slice(2).map((key) => `  '${key}',`).join('\n');

  return (
    `export const WEB_UNSUPPORTED = [\n${list}\n];\n\n` +
    `export const WEB_UNSUPPORTED_COLORS = [\n${unsupportedColors}\n];\n\n` +
    `function run(opts, colors) {\n${body}\n  void opts.colors;\n${colors}\n}\n`
  );
}
```

and write it with `write(dir, 'src/web.ts', webSource(web))`.

Then the two new cases:

```js
it('fails when an option is neither read by web nor listed as unsupported', () => {
  const result = run(fixture({ web: { reads: ['title', 'locale'], unsupported: ['showFooter', 'showMerchantLogo', 'showPaymentDetails'] } }));

  expect(result.code).toBe(1);
  expect(result.output).toContain('web.ts (options) drifted');
  expect(result.output).toContain('does not read/offer: theme');
});

it('fails when an option is both read by web and listed as unsupported', () => {
  const result = run(fixture({ web: { reads: ['title', 'locale', 'theme'], unsupported: ['theme', 'showFooter', 'showMerchantLogo', 'showPaymentDetails'] } }));

  expect(result.code).toBe(1);
  expect(result.output).toContain('both read and listed as unsupported: theme');
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run scripts/check-option-keys.test.mjs`
Expected: FAIL — the guard does not look at `src/web.ts` yet.

- [ ] **Step 3: Add the surface**

In `scripts/check-option-keys.mjs`, add the path and the parsing:

```js
const WEB = `${BASE}/src/web.ts`;

/** Keys inside an exported array literal, e.g. `export const WEB_UNSUPPORTED = [...]`. */
function listed(source, name) {
  const block = source.match(new RegExp(`export const ${name}[^=]*=\\s*\\[(.*?)\\]`, 's'));
  if (!block) {
    console.error(`Could not extract ${name} from ${WEB}. This guard's parser is out of date.`);
    process.exit(1);
  }
  return keys(block[1], /'(\w+)'/g);
}

const web = read(WEB);
const webUnsupported = listed(web, 'WEB_UNSUPPORTED');
const webUnsupportedColors = listed(web, 'WEB_UNSUPPORTED_COLORS');
const webReads = withoutColors(keys(web, /\bopts\.(\w+)/g));
const webReadsColors = keys(web, /\bcolors\??\.(\w+)/g);
```

An option must be in exactly one of the two sets, so overlap is its own error:

```js
for (const [label, reads, unsupported] of [
  [`${WEB} (options)`, webReads, webUnsupported],
  [`${WEB} (colors)`, webReadsColors, webUnsupportedColors],
]) {
  const both = [...reads].filter((k) => unsupported.has(k));
  if (both.length) {
    drifted = true;
    console.error(`${label}: both read and listed as unsupported: ${both.join(', ')}`);
  }
}
```

and add the two union surfaces to the `surfaces` array:

```js
  { name: `${WEB} (options)`, expected: options, actual: new Set([...webReads, ...webUnsupported]) },
  { name: `${WEB} (colors)`, expected: colors, actual: new Set([...webReadsColors, ...webUnsupportedColors]) },
```

Note the overlap check must run before the exit, and `drifted` is the same flag the
existing loop sets.

Update the success line to say how the web surface was split:

```js
console.log(
  `Vocabulary in sync across every surface: ${options.size} options, ${colors.size} colors, ` +
    `${result.size} fields in the result iOS builds, and on web ${webReads.size} options ` +
    `honoured with ${webUnsupported.size} declared unsupported`,
);
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run scripts/check-option-keys.test.mjs`
Expected: PASS. Update the existing "real repo" assertion to the new success wording.

- [ ] **Step 5: Run the guard against the repo**

Run: `npm run verify:keys`
Expected: PASS, reporting 4 options honoured on web with 5 declared unsupported.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-option-keys.mjs scripts/check-option-keys.test.mjs
git commit -m "test: hold src/web.ts to the option contract too"
```

---

### Task 7: Bump the Android SDK to the current release

**Files:**
- Modify: `android/build.gradle`

**Interfaces:**
- Consumes: nothing.
- Produces: the bumped `com.khipu:khipu-client-android` coordinate for Tasks 8-11, and
  a ledger note saying which version landed and whether it carries the socket guard.

**Do not hardcode a version from this plan.** At the time of writing, `2.28.0` was the
current release and `2.28.1` — carrying the `IKW-1232` socket guard — was being merged
with no publication date. Resolve what is actually published when you run this, and
verify what it contains. The number is decided by what enters the merge; go by the
markers, not by the number.

- [ ] **Step 1: Find the current release**

Run:
```bash
curl -sS "https://dev.khipu.com/nexus/content/repositories/khenshin/com/khipu/khipu-client-android/maven-metadata.xml" | grep -E '<release>|<latest>'
```
Take the `<release>` value. Call it `V`. If `V` is `2.28.0`, that is fine — use it and
say so in your report; nothing in this plan depends on the newer one.

- [ ] **Step 2: Confirm the protocol pin**

Run:
```bash
curl -sS "https://dev.khipu.com/nexus/content/repositories/khenshin/com/khipu/khipu-client-android/$V/khipu-client-android-$V.pom" | grep -A2 '<artifactId>protocol</artifactId>'
```
Expected: `1.0.60` or newer. `1.0.60` is the version iOS is already on and the one that
adds `FailureReasonType.USER_DISCONNECTED`. If it reads `1.0.59`, stop and report — that
would mean the release went backwards.

- [ ] **Step 3: Change the dependency**

In `android/build.gradle`, in `dependencies`:

```gradle
    implementation 'com.khipu:khipu-client-android:V'
```

with `V` substituted.

- [ ] **Step 4: Build against it**

Run: `cd android && ./gradlew clean build test && cd ..`
Expected: PASS. The artifact resolves from the khenshin repository already declared in
`repositories`.

Expect no behaviour change from the client between `2.27.0` and `2.28.0`: their public
API and manifests are identical, and the protocol change is purely additive — both jars
hold 95 classes and the one addition is `FailureReasonType.USER_DISCONNECTED`, which
`forValue(String)` recognises. If the build turns up more than a version string moving,
stop and find out why before continuing.

- [ ] **Step 5: Record whether the socket guard is in the artifact**

Only meaningful if `V` is past `2.28.0`. **Do not check this by counting exception
tables in `KhipuSocketIOClient`** — that count stays at 1 with the fix in place, because
the new `try`/`catch` lives in a different class. The two real markers, per the SDK
team who wrote it:

```bash
aar=$(find ~/.gradle/caches -name "khipu-client-android-$V.aar" | head -1)
mkdir -p /tmp/khipu-aar && unzip -p "$aar" classes.jar > /tmp/khipu-aar/classes.jar
unzip -o -q /tmp/khipu-aar/classes.jar -d /tmp/khipu-aar/classes
javap -p /tmp/khipu-aar/classes/com/khipu/client/socket/SocketMessageGuardKt.class
javap -p /tmp/khipu-aar/classes/com/khipu/client/socket/KhipuSocketIOClient.class | grep onMessage
```

Expected when the guard is present: `SocketMessageGuardKt` exists at all — it does not
in `2.28.0` — and declares
`public static final void runGuarded(String, KhipuViewModel, Function0<Unit>)`; and
`KhipuSocketIOClient` declares
`private final void onMessage(String, Function1<? super Object[], Unit>)`.

Report which markers you found. This does not gate the task: the bump is worth doing
either way, and no code in this plan calls either symbol.

- [ ] **Step 6: Confirm the resolved version**

Run: `cd android && ./gradlew dependencies --configuration releaseRuntimeClasspath | grep -E 'khipu-client-android|protocol' && cd ..`
Expected: `com.khipu:khipu-client-android:V` and `com.khipu.khenshin:protocol:1.0.60`
or newer.

- [ ] **Step 7: Commit**

```bash
git add android/build.gradle
git commit -m "feat: update khipu-client-android to V"
```

with `V` substituted in the message.

---

### Task 8: Extract and test the Android options mapper

**Files:**
- Create: `android/src/main/java/com/khipu/capacitor/KhipuOptionsMapper.java`
- Create: `android/src/test/java/com/khipu/capacitor/KhipuOptionsMapperTest.java`
- Modify: `android/src/main/java/com/khipu/capacitor/KhipuPlugin.java`, `android/build.gradle`
- Delete: `android/src/test/java/com/getcapacitor/ExampleUnitTest.java`

**Interfaces:**
- Consumes: `com.khipu.client.KhipuOptions`, `KhipuColors`; `com.getcapacitor.JSObject`.
- Produces: `static KhipuOptions KhipuOptionsMapper.map(JSObject options)` —
  package-private, null-tolerant, never throws on merchant input.

- [ ] **Step 1: Add the JVM test dependencies**

In `android/build.gradle`, in `dependencies`, next to the existing `testImplementation`:

```gradle
    testImplementation 'org.json:json:20250517'
    testImplementation 'org.mockito:mockito-core:5.20.0'
```

These are the exact versions Capacitor uses to unit-test the same classes. Without the
real `org.json`, the stubbed `android.jar` makes every `JSONObject` call throw
"not mocked".

- [ ] **Step 2: Write the failing test**

Create `android/src/test/java/com/khipu/capacitor/KhipuOptionsMapperTest.java`:

```java
package com.khipu.capacitor;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import com.getcapacitor.JSObject;
import com.khipu.client.KhipuOptions;
import org.json.JSONException;
import org.junit.Test;

public class KhipuOptionsMapperTest {

    @Test
    public void mapsTheTextFields() throws JSONException {
        KhipuOptions options = KhipuOptionsMapper.map(
            new JSObject("{\"title\":\"Store\",\"titleImageUrl\":\"https://khipu.com/logo.png\",\"locale\":\"es_CL\"}")
        );

        assertEquals("Store", options.getTopBarTitle());
        assertEquals("https://khipu.com/logo.png", options.getTopBarImageUrl());
        assertEquals("es_CL", options.getLocale());
    }

    @Test
    public void mapsTheThreeThemes() throws JSONException {
        assertEquals(KhipuOptions.Theme.LIGHT, KhipuOptionsMapper.map(new JSObject("{\"theme\":\"light\"}")).getTheme());
        assertEquals(KhipuOptions.Theme.DARK, KhipuOptionsMapper.map(new JSObject("{\"theme\":\"dark\"}")).getTheme());
        assertEquals(KhipuOptions.Theme.SYSTEM, KhipuOptionsMapper.map(new JSObject("{\"theme\":\"system\"}")).getTheme());
    }

    @Test
    public void discardsWrongTypedValuesInsteadOfThrowing() throws JSONException {
        KhipuOptions options = KhipuOptionsMapper.map(
            new JSObject("{\"title\":123,\"showFooter\":\"yes\",\"theme\":7,\"colors\":\"purple\"}")
        );

        assertNull(options.getTopBarTitle());
        assertNull(options.getColors());
    }

    @Test
    public void discardsAnExplicitNullInsteadOfThrowing() throws JSONException {
        assertNull(KhipuOptionsMapper.map(new JSObject("{\"title\":null}")).getTopBarTitle());
    }

    @Test
    public void mapsTheTwelveColors() throws JSONException {
        KhipuOptions options = KhipuOptionsMapper.map(
            new JSObject(
                "{\"colors\":{\"lightBackground\":\"#FFFFFF\",\"lightOnBackground\":\"#1A1A1A\"," +
                "\"lightPrimary\":\"#8347AD\",\"lightOnPrimary\":\"#FFFFFF\"," +
                "\"lightTopBarContainer\":\"#8347AD\",\"lightOnTopBarContainer\":\"#FFFFFF\"," +
                "\"darkBackground\":\"#121212\",\"darkOnBackground\":\"#EDEDED\"," +
                "\"darkPrimary\":\"#3CB4E5\",\"darkOnPrimary\":\"#0B0B0B\"," +
                "\"darkTopBarContainer\":\"#1E1E1E\",\"darkOnTopBarContainer\":\"#3CB4E5\"}}"
            )
        );

        assertEquals("#8347AD", options.getColors().getLightPrimary());
        assertEquals("#3CB4E5", options.getColors().getDarkPrimary());
    }

    @Test
    public void absentColorsLeavesTheOptionsWithoutColors() throws JSONException {
        assertNull(KhipuOptionsMapper.map(new JSObject("{}")).getColors());
    }

    @Test
    public void nullOptionsProducesUsableDefaults() {
        assertNull(KhipuOptionsMapper.map(null).getTopBarTitle());
    }
}
```

**Fallback if the getters do not exist.** `KhipuOptions` is a Kotlin class whose
properties read as `val` in the source, so `getTopBarTitle()` and friends should be
generated. If they are not accessible from Java, replicate the iOS approach: add a
`KhipuOptionsDraft` value class in `com.khipu.capacitor`, have the mapper expose
`static KhipuOptionsDraft draft(JSObject)` plus `static KhipuOptions map(JSObject)`, and
assert on the draft. Decide this by compiling the test, not by guessing.

- [ ] **Step 3: Run it and watch it fail**

Run: `cd android && ./gradlew test && cd ..`
Expected: FAIL — `KhipuOptionsMapper` does not exist.

- [ ] **Step 4: Write the mapper**

Create `android/src/main/java/com/khipu/capacitor/KhipuOptionsMapper.java`:

```java
package com.khipu.capacitor;

import com.getcapacitor.JSObject;
import com.khipu.client.KhipuColors;
import com.khipu.client.KhipuOptions;

/**
 * Translates the options object coming from JS into the native client's options.
 *
 * Reads the raw value and checks its type rather than using the coercing getters, so a
 * wrongly typed or null value is skipped instead of reaching the builder. That is not
 * tidiness: an exception thrown here does not become a rejected promise. Capacitor
 * logs it and rethrows it as a RuntimeException on the task handler
 * (Bridge.callPluginMethod), so the merchant's await never settles and the app very
 * likely goes down with it.
 *
 * The policy matches KhipuOptionsMapper.swift, so both platforms treat malformed input
 * the same way.
 */
final class KhipuOptionsMapper {

    private KhipuOptionsMapper() {}

    static KhipuOptions map(JSObject options) {
        KhipuOptions.Builder builder = new KhipuOptions.Builder();
        if (options == null) {
            return builder.build();
        }

        String title = string(options, "title");
        if (title != null) builder.topBarTitle(title);

        String titleImageUrl = string(options, "titleImageUrl");
        if (titleImageUrl != null) builder.topBarImageUrl(titleImageUrl);

        String locale = string(options, "locale");
        if (locale != null) builder.locale(locale);

        Boolean skipExitPage = bool(options, "skipExitPage");
        if (skipExitPage != null) builder.skipExitPage(skipExitPage);

        Boolean skipExitSuccessPage = bool(options, "skipExitSuccessPage");
        if (skipExitSuccessPage != null) builder.skipExitSuccessPage(skipExitSuccessPage);

        Boolean showFooter = bool(options, "showFooter");
        if (showFooter != null) builder.showFooter(showFooter);

        Boolean showMerchantLogo = bool(options, "showMerchantLogo");
        if (showMerchantLogo != null) builder.showMerchantLogo(showMerchantLogo);

        Boolean showPaymentDetails = bool(options, "showPaymentDetails");
        if (showPaymentDetails != null) builder.showPaymentDetails(showPaymentDetails);

        KhipuOptions.Theme theme = theme(options);
        if (theme != null) builder.theme(theme);

        JSObject colors = options.getJSObject("colors");
        if (colors != null) builder.colors(colors(colors));

        return builder.build();
    }

    private static KhipuColors colors(JSObject colors) {
        KhipuColors.Builder builder = new KhipuColors.Builder();

        String lightBackground = string(colors, "lightBackground");
        if (lightBackground != null) builder.lightBackground(lightBackground);

        String lightOnBackground = string(colors, "lightOnBackground");
        if (lightOnBackground != null) builder.lightOnBackground(lightOnBackground);

        String lightPrimary = string(colors, "lightPrimary");
        if (lightPrimary != null) builder.lightPrimary(lightPrimary);

        String lightOnPrimary = string(colors, "lightOnPrimary");
        if (lightOnPrimary != null) builder.lightOnPrimary(lightOnPrimary);

        String lightTopBarContainer = string(colors, "lightTopBarContainer");
        if (lightTopBarContainer != null) builder.lightTopBarContainer(lightTopBarContainer);

        String lightOnTopBarContainer = string(colors, "lightOnTopBarContainer");
        if (lightOnTopBarContainer != null) builder.lightOnTopBarContainer(lightOnTopBarContainer);

        String darkBackground = string(colors, "darkBackground");
        if (darkBackground != null) builder.darkBackground(darkBackground);

        String darkOnBackground = string(colors, "darkOnBackground");
        if (darkOnBackground != null) builder.darkOnBackground(darkOnBackground);

        String darkPrimary = string(colors, "darkPrimary");
        if (darkPrimary != null) builder.darkPrimary(darkPrimary);

        String darkOnPrimary = string(colors, "darkOnPrimary");
        if (darkOnPrimary != null) builder.darkOnPrimary(darkOnPrimary);

        String darkTopBarContainer = string(colors, "darkTopBarContainer");
        if (darkTopBarContainer != null) builder.darkTopBarContainer(darkTopBarContainer);

        String darkOnTopBarContainer = string(colors, "darkOnTopBarContainer");
        if (darkOnTopBarContainer != null) builder.darkOnTopBarContainer(darkOnTopBarContainer);

        return builder.build();
    }

    /** Only an actual JSON string counts, matching `value as? String` on iOS. */
    private static String string(JSObject source, String key) {
        Object value = source.opt(key);
        return value instanceof String ? (String) value : null;
    }

    /** Only an actual JSON boolean counts, matching `value as? Bool` on iOS. */
    private static Boolean bool(JSObject source, String key) {
        Object value = source.opt(key);
        return value instanceof Boolean ? (Boolean) value : null;
    }

    private static KhipuOptions.Theme theme(JSObject options) {
        String value = string(options, "theme");
        if ("light".equals(value)) return KhipuOptions.Theme.LIGHT;
        if ("dark".equals(value)) return KhipuOptions.Theme.DARK;
        if ("system".equals(value)) return KhipuOptions.Theme.SYSTEM;
        return null;
    }
}
```

Note the behaviour change worth calling out in review: the old code called
`optionsBuilder.colors(colorsBuilder.build())` unconditionally, handing the SDK an empty
`KhipuColors` even when the merchant sent none. `KhipuOptions.Builder` defaults
`colors` to `null` (`KhipuOptions.kt:38`), so only setting it when the key is present
restores the SDK's own default and matches iOS.

- [ ] **Step 5: Run the test**

Run: `cd android && ./gradlew test && cd ..`
Expected: PASS, 7 tests.

- [ ] **Step 6: Use the mapper from the plugin**

In `KhipuPlugin.java`, delete the nineteen inline `if (options.has(...))` blocks, the
`Objects` and `KhipuColors` imports, and replace the body with a call to
`KhipuOptionsMapper.map(call.getObject("options", new JSObject()))`. Leave the rest of
`startOperation` alone for now; Task 10 restructures it.

- [ ] **Step 7: Delete the template stub**

```bash
git rm android/src/test/java/com/getcapacitor/ExampleUnitTest.java
```

It asserts `4 == 2 + 2`.

- [ ] **Step 8: Build and commit**

Run: `cd android && ./gradlew clean build test && cd ..`
Expected: PASS.

```bash
git add android/
git commit -m "fix: skip malformed option values on Android instead of crashing"
```

---

### Task 9: Read and build the Android result explicitly

**Files:**
- Create: `android/src/main/java/com/khipu/capacitor/KhipuResultReader.java`
- Create: `android/src/test/java/com/khipu/capacitor/KhipuResultReaderTest.java`
- Modify: `android/src/main/java/com/khipu/capacitor/KhipuPlugin.java`

**Interfaces:**
- Consumes: `com.khipu.client.KhipuResult`, `KhipuEvent`.
- Produces: `static JSObject KhipuResultReader.read(Serializable extra)` — returns
  `null` when there is no usable payload, never throws on a wrong type.

- [ ] **Step 1: Write the failing test**

Create `android/src/test/java/com/khipu/capacitor/KhipuResultReaderTest.java`:

```java
package com.khipu.capacitor;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.getcapacitor.JSObject;
import com.khipu.client.KhipuEvent;
import com.khipu.client.KhipuResult;
import org.junit.Test;

public class KhipuResultReaderTest {

    private static KhipuResult canceled() {
        return new KhipuResult("op-1", "", "", null, null, "ERROR", new KhipuEvent[0], "USER_CANCELED");
    }

    @Test
    public void readsEveryContractField() {
        JSObject result = KhipuResultReader.read(canceled());

        assertEquals("op-1", result.getString("operationId"));
        assertEquals("ERROR", result.getString("result"));
        assertEquals("USER_CANCELED", result.getString("failureReason"));
    }

    @Test
    public void omitsTheKeysThatHaveNoValue() {
        JSObject result = KhipuResultReader.read(canceled());

        assertFalse(result.has("exitUrl"));
        assertFalse(result.has("continueUrl"));
    }

    @Test
    public void omitsFailureReasonWhenTheSdkCouldNotDetermineOne() {
        // Not hypothetical. Under IKW-1232 the SDK ends the operation when a terminal
        // message fails to deserialise, and the reason is exactly the part that failed
        // to parse, so it arrives null.
        KhipuResult withoutReason = new KhipuResult("op-1", "", "", null, null, "ERROR", new KhipuEvent[0], null);

        JSObject result = KhipuResultReader.read(withoutReason);

        assertEquals("ERROR", result.getString("result"));
        assertFalse(result.has("failureReason"));
    }

    @Test
    public void alwaysCarriesTheEventsArray() {
        assertTrue(KhipuResultReader.read(canceled()).has("events"));
    }

    @Test
    public void aResultCodeIsNotPartOfTheDecision() {
        // The reader never sees one. Both of the SDK's exits carry a full KhipuResult:
        // RESULT_OK from the normal path, RESULT_CANCELED from the destroyed-too-long
        // abort at KhipuActivity.kt:119. Branching on the code would make the same
        // outcome arrive in two shapes.
        assertEquals("op-1", KhipuResultReader.read(canceled()).getString("operationId"));
    }

    @Test
    public void returnsNullWhenThereIsNoPayload() {
        assertNull(KhipuResultReader.read(null));
    }

    @Test
    public void returnsNullWhenThePayloadIsSomethingElse() {
        assertNull(KhipuResultReader.read("not a result"));
    }
}
```

If the `KhipuResult` constructor's parameter order differs from the one above, read it
from `KhipuResult.kt` and fix the test — the declared order is `operationId`,
`exitTitle`, `exitMessage`, `exitUrl`, `continueUrl`, `result`, `events`,
`failureReason`.

- [ ] **Step 2: Run and watch it fail**

Run: `cd android && ./gradlew test && cd ..`
Expected: FAIL — `KhipuResultReader` does not exist.

- [ ] **Step 3: Write the reader**

Create `android/src/main/java/com/khipu/capacitor/KhipuResultReader.java`:

```java
package com.khipu.capacitor;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.khipu.client.KhipuEvent;
import com.khipu.client.KhipuResult;
import java.io.Serializable;

/**
 * Turns the activity's payload into the object handed back to JS, or null when there is
 * no usable payload.
 *
 * Takes the extra rather than the Intent so it can be unit tested without Android, and
 * so it cannot see the activity's result code. That is deliberate: both of the SDK's
 * exits carry a complete KhipuResult — the normal one at KhipuActivity.kt:320 and the
 * destroyed-too-long abort at :119, which reports USER_CANCELED. Branching on the code
 * would make the same outcome, the user abandoning the payment, arrive in two different
 * shapes depending on an invisible timing detail.
 *
 * The object is built key by key rather than through KhipuResult.asJson(), which is
 * Gson with nulls dropped: it silently omits exitUrl, continueUrl and failureReason,
 * and it puts the field names out of reach of the vocabulary guard.
 */
final class KhipuResultReader {

    private KhipuResultReader() {}

    static JSObject read(Serializable extra) {
        if (!(extra instanceof KhipuResult)) {
            return null;
        }

        KhipuResult source = (KhipuResult) extra;
        JSObject result = new JSObject();
        put(result, "operationId", source.getOperationId());
        put(result, "exitTitle", source.getExitTitle());
        put(result, "exitMessage", source.getExitMessage());
        put(result, "result", source.getResult());
        put(result, "exitUrl", source.getExitUrl());
        put(result, "continueUrl", source.getContinueUrl());
        put(result, "failureReason", source.getFailureReason());
        put(result, "events", events(source.getEvents()));
        return result;
    }

    /**
     * Every key goes through here, in one call shape, for two reasons.
     *
     * A null value is skipped rather than written: an absent key reads as `undefined`
     * in JS, which is what `string | undefined` promises, while an explicit null would
     * not satisfy that type. `events` is never null, so it is always written.
     *
     * And one uniform shape is what `check-option-keys.mjs` greps for. A second
     * spelling would hide those keys from the guard — which is exactly how the old
     * `asJson()` call kept the whole result out of its reach.
     */
    private static void put(JSObject target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    private static JSArray events(KhipuEvent[] events) {
        JSArray array = new JSArray();
        if (events == null) {
            return array;
        }
        for (KhipuEvent event : events) {
            JSObject item = new JSObject();
            item.put("name", event.getName());
            item.put("timestamp", event.getTimestamp());
            item.put("type", event.getType());
            array.put(item);
        }
        return array;
    }
}
```

Read `KhipuEvent.kt` for its accessor names before writing this; adjust if they differ.

- [ ] **Step 4: Run the test**

Run: `cd android && ./gradlew test && cd ..`
Expected: PASS, 7 new tests.

- [ ] **Step 5: Use it from `operationResult`**

In `KhipuPlugin.java`:

```java
    @ActivityCallback
    private void operationResult(PluginCall call, ActivityResult result) {
        pending.clear();
        if (call == null) {
            return;
        }

        JSObject payload = KhipuResultReader.read(extra(result));
        if (payload == null) {
            call.reject("The operation returned no result", "NO_RESULT");
            return;
        }

        call.resolve(payload);
    }

    @SuppressWarnings("deprecation")
    private static Serializable extra(ActivityResult result) {
        Intent data = result.getData();
        if (data == null) {
            return null;
        }
        Bundle extras = data.getExtras();
        if (extras == null) {
            return null;
        }
        return extras.getSerializable(KHIPU_RESULT_EXTRA);
    }
```

`pending` arrives in Task 10; until then, drop that first line and add it there.

Every branch returns. The old code rejected on `JSONException` and then fell through to
`call.resolve(toRet)` anyway.

- [ ] **Step 6: Build and commit**

Run: `cd android && ./gradlew clean build test && cd ..`
Expected: PASS.

```bash
git add android/
git commit -m "fix: build the Android result explicitly so no field is silently dropped"
```

---

### Task 10: One operation at a time, with a liveness check

**Files:**
- Create: `android/src/main/java/com/khipu/capacitor/PendingCall.java`
- Create: `android/src/test/java/com/khipu/capacitor/PendingCallTest.java`
- Modify: `android/src/main/java/com/khipu/capacitor/KhipuPlugin.java`

**Interfaces:**
- Consumes: `com.getcapacitor.PluginCall`, `com.getcapacitor.Bridge`.
- Produces: `PendingCall` with `void set(PluginCall)`, `void clear()` and
  `boolean isLive(Bridge)`.

- [ ] **Step 1: Write the failing test**

Create `android/src/test/java/com/khipu/capacitor/PendingCallTest.java`:

```java
package com.khipu.capacitor;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.getcapacitor.Bridge;
import com.getcapacitor.PluginCall;
import org.junit.Test;

public class PendingCallTest {

    @Test
    public void nothingIsLiveBeforeAnyCall() {
        assertFalse(new PendingCall().isLive(mock(Bridge.class)));
    }

    @Test
    public void aCallTheBridgeStillHoldsIsLive() {
        Bridge bridge = mock(Bridge.class);
        PluginCall call = mock(PluginCall.class);
        when(call.getCallbackId()).thenReturn("call-1");
        when(bridge.getSavedCall("call-1")).thenReturn(call);

        PendingCall pending = new PendingCall();
        pending.set(call);

        assertTrue(pending.isLive(bridge));
    }

    @Test
    public void aCallTheBridgeHasReleasedIsNotLive() {
        Bridge bridge = mock(Bridge.class);
        PluginCall call = mock(PluginCall.class);
        when(call.getCallbackId()).thenReturn("call-1");
        when(bridge.getSavedCall("call-1")).thenReturn(null);

        PendingCall pending = new PendingCall();
        pending.set(call);

        // The bridge releases a call as soon as it is answered, so a pending call it no
        // longer holds is stale. Trusting our own field instead would let one stuck
        // call block every operation that follows, forever.
        assertFalse(pending.isLive(bridge));
    }

    @Test
    public void clearingMakesItNotLive() {
        Bridge bridge = mock(Bridge.class);
        PluginCall call = mock(PluginCall.class);
        when(call.getCallbackId()).thenReturn("call-1");
        when(bridge.getSavedCall("call-1")).thenReturn(call);

        PendingCall pending = new PendingCall();
        pending.set(call);
        pending.clear();

        assertFalse(pending.isLive(bridge));
    }
}
```

- [ ] **Step 2: Run and watch it fail**

Run: `cd android && ./gradlew test && cd ..`
Expected: FAIL — `PendingCall` does not exist.

- [ ] **Step 3: Write it**

Create `android/src/main/java/com/khipu/capacitor/PendingCall.java`:

```java
package com.khipu.capacitor;

import com.getcapacitor.Bridge;
import com.getcapacitor.PluginCall;

/**
 * Tracks the operation currently in flight, so a second one can be refused instead of
 * silently stealing the first one's callback.
 *
 * Capacitor keys the activity callback off a single field (Plugin.lastPluginCallId), so
 * two overlapping calls mean both results go to the newest and the first promise hangs.
 *
 * Liveness is asked of the bridge, never assumed from this field alone. A call that has
 * been answered is released from the bridge's saved calls
 * (MessageHandler.sendResponseMessage -> PluginCall.release), so a pending call the
 * bridge no longer holds is stale and must not block anything. Without that check a
 * single stuck call would turn this guard into a permanent outage.
 */
final class PendingCall {

    private String callbackId;

    void set(PluginCall call) {
        callbackId = call.getCallbackId();
    }

    void clear() {
        callbackId = null;
    }

    boolean isLive(Bridge bridge) {
        return callbackId != null && bridge.getSavedCall(callbackId) != null;
    }
}
```

- [ ] **Step 4: Run the test**

Run: `cd android && ./gradlew test && cd ..`
Expected: PASS, 4 new tests.

- [ ] **Step 5: Restructure `startOperation`**

In `KhipuPlugin.java`. Everything that can throw happens before the call is recorded,
and the launch is wrapped so a failure to start answers instead of stranding:

```java
    private final PendingCall pending = new PendingCall();

    @PluginMethod
    public void startOperation(PluginCall call) {
        String operationId = call.getString("operationId");
        if (operationId == null) {
            call.reject("Must provide operationId", "INVALID_OPTIONS");
            return;
        }

        KhipuOptions options;
        try {
            options = KhipuOptionsMapper.map(call.getObject("options", new JSObject()));
        } catch (RuntimeException e) {
            call.reject("Could not read the options object", "INVALID_OPTIONS", e);
            return;
        }

        if (pending.isLive(getBridge())) {
            call.reject("An operation is already in progress", "OPERATION_IN_PROGRESS");
            return;
        }
        pending.clear();

        pending.set(call);
        try {
            startActivityForResult(call, getKhipuLauncherIntent(getContext(), operationId, options), "operationResult");
        } catch (RuntimeException e) {
            pending.clear();
            call.reject("Could not launch the Khipu activity", "LAUNCH_FAILED", e);
        }
    }
```

Add `pending.clear();` as the first line of `operationResult`, as Task 9 noted.

- [ ] **Step 6: Build and commit**

Run: `cd android && ./gradlew clean build test && cd ..`
Expected: PASS.

```bash
git add android/
git commit -m "fix: refuse a second concurrent operation without ever locking up"
```

---

### Task 11: Let the guard check Android's result too

Task 9 made Android's result keys extractable. The guard's own comment says this half
was verified by hand; it does not have to be any more.

**Files:**
- Modify: `scripts/check-option-keys.mjs`, `scripts/check-option-keys.test.mjs`

**Interfaces:**
- Consumes: the `result.put("<key>", ...)` calls in `KhipuResultReader.java`.
- Produces: a sixth surface checked against `KhipuResult`.

- [ ] **Step 1: Write the failing test**

In `scripts/check-option-keys.test.mjs`, add a `KhipuResultReader.java` to the fixture:

```js
  const puts = (keys) => keys.map((k) => `        put(result, "${k}", source.get());`).join('\n');
  write(
    dir,
    'android/src/main/java/com/khipu/capacitor/KhipuResultReader.java',
    `class KhipuResultReader {\n    static JSObject read() {\n${puts(androidResult)}\n    }\n}\n`,
  );
```

with `androidResult = RESULT` by default, and the case:

```js
it('fails when the Android result drifts from the contract', () => {
  const drifted = RESULT.map((k) => (k === 'exitMessage' ? 'exitMessageX' : k));
  const result = run(fixture({ androidResult: drifted }));

  expect(result.code).toBe(1);
  expect(result.output).toContain('KhipuResultReader.java (result) drifted');
  expect(result.output).toContain('does not read/offer: exitMessage');
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run scripts/check-option-keys.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the surface**

In `scripts/check-option-keys.mjs`:

```js
const READER = `${BASE}/android/src/main/java/com/khipu/capacitor/KhipuResultReader.java`;
```

and in the `surfaces` array:

```js
  { name: `${READER} (result)`, expected: result, actual: keys(read(READER), /\bput\(result, "(\w+)"/g) },
```

Then rewrite the comment at the top of the file: the return path is no longer
half-covered, and the reason Android used to be exempt — that `asJson()` put the field
names out of reach — no longer applies.

- [ ] **Step 4: Run everything**

Run: `npm test && npm run verify:keys`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/
git commit -m "test: hold Android's result to the contract, not just iOS's"
```

---

### Task 12: The two small ones

**Files:**
- Modify: `CapacitorKhipu.podspec`, `.github/workflows/ci.yml`

- [ ] **Step 1: Align the podspec's Swift version**

In `CapacitorKhipu.podspec`:

```ruby
  s.swift_version = '5.9'
```

`Package.swift` declares `swift-tools-version: 5.9`; the podspec claiming 5.1 is a
leftover.

- [ ] **Step 2: Build the example's Android app in CI**

In `.github/workflows/ci.yml`, in the `example` job, after the iOS step:

```yaml
      - name: Sync and build Android
        run: |
          npx cap sync android
          ./gradlew assembleDebug
        working-directory: example/android
```

Note `npx cap sync android` runs from `example`, and the Gradle build from
`example/android`; split them into two steps with the right `working-directory` if the
combined form fights you.

- [ ] **Step 3: Verify locally what can be verified**

Run: `pod lib lint --allow-warnings`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add CapacitorKhipu.podspec .github/workflows/ci.yml
git commit -m "chore: align the podspec Swift version and build the example on Android"
```

---

### Task 13: Full verification on `main`

**Files:** none.

- [ ] **Step 1: Run the whole chain**

Run: `npm run verify`
Expected: PASS through test, versions, keys, readme, ios, android, web.

- [ ] **Step 2: Run the linters**

Run: `npm run lint`
Expected: PASS, including SwiftLint.

- [ ] **Step 3: Push and watch CI**

```bash
git push origin main
gh run watch
```
Expected: the four jobs green.

- [ ] **Step 4: Record the outcome**

Update `docs/STATUS.md` with what landed, what is still pending, and the fact that the
version to publish is `4.1.0`.

```bash
git add docs/STATUS.md
git commit -m "docs: record the hardening pass"
```

---

### Task 14: Port to `7.x`

Not a cherry-pick. The dependency trees differ between the lines, which is why the CI
lockfile fix could not be shared either, but the source changes are near-identical.

**Files:** the same set, on the `7.x` branch.

- [ ] **Step 1: Get a worktree**

```bash
git worktree add .claude/worktrees/7x 7.x
```

`.claude/` is gitignored precisely so worktrees can live inside the repo without
prettier and eslint scanning a second copy.

- [ ] **Step 2: Apply the source changes**

Port Tasks 1 through 12, file by file. What differs on this line:
- Capacitor 7, so re-read `node_modules/@capacitor/android/.../Plugin.java` and
  `Bridge.java` before assuming line numbers in comments; the *behaviour* those comments
  describe should be re-verified, not copied on faith.
- iOS minimum is 14 and `minSdk` is 23. Do not change either.
- The example app uses CocoaPods, not SPM.
- The compatibility table in that README carries the `@cap7` install command and the
  warning about the bare command failing with `ERESOLVE`. Keep both.

- [ ] **Step 3: Verify independently**

Run, inside the worktree: `npm run verify && npm run lint`
Expected: PASS. Do not trust the diff — this line's CI has only ever been green once.

- [ ] **Step 4: Push and watch CI**

```bash
git push origin 7.x
gh run watch
```

- [ ] **Step 5: Clean up**

```bash
git worktree remove .claude/worktrees/7x
```

- [ ] **Step 6: Leave the release prepared, do not run it**

Write the two commands into `docs/STATUS.md` for a human with 2FA:

```bash
# on main, for 4.1.0
npx release-it minor

# on 7.x, for 3.1.0 — the cap7 dist-tag must be set explicitly
npx release-it minor --npm.tag=cap7
```

Confirm the dist-tags afterwards with `npm view capacitor-khipu dist-tags`; the expected
result is `{ latest: '4.1.0', cap6: '2.11.3', cap7: '3.1.0' }`.

---

## Archiving

When the work has landed on both lines, delete this plan and its spec from the tree the
same way Task 2 deleted the SPM migration's pair, leaving the outcome in
`docs/STATUS.md`. Git keeps both.
