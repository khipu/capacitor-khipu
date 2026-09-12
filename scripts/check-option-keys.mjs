#!/usr/bin/env node
/**
 * Fails if any of the six surfaces that carry this plugin's option and result
 * vocabulary stop matching the contract in `src/definitions.ts`.
 *
 * The contract between JS and native is made of strings: `src/definitions.ts` declares
 * it, the Swift mapper and the Java mapper read it, and the harness offers it. Renaming
 * a key on just one surface leaves the flag with no effect **silently** — no test on
 * either side can detect the other one drifting.
 *
 * `src/web.ts` is a fourth surface for the options vocabulary, and the one drift is
 * otherwise invisible on: no test compares it to the contract, and nothing else reads
 * it. Its options and colours must partition into exactly two sets — read by the web
 * layer, or declared in `WEB_UNSUPPORTED`/`WEB_UNSUPPORTED_COLORS` — never both, never
 * neither, so a new contract key forces someone to decide what web does with it instead
 * of letting it be silently dropped. The fifth and sixth surfaces are the result
 * direction, below.
 *
 * It also covers the way back (native → JS): the 8 keys with which each platform's
 * `KhipuResultReader` builds the object the merchant receives, checked against the
 * `KhipuResult` interface. Both are read with one pattern, `put(result, "<key>", ...)`,
 * because both now build the result through the same helper shape — Swift's differs
 * only by the `inout` ampersand. That is not a coincidence worth preserving by accident:
 * the two platforms disagreed about null keys for the whole life of the plugin, and
 * writing them the same way is what makes a future divergence visible here.
 *
 * Android used to be exempt from this half, delegating the result's shape to the SDK
 * (`khipuResult.asJson()`), which put the field names out of our source and out of this
 * guard's reach. iOS used to build a dictionary literal inline in the launch closure.
 *
 * On fragility: this parses source with regular expressions. The failure direction is
 * the right one (the check breaks and someone looks, instead of passing while the
 * protocol has drifted), but a broken parser could report "everything matches" with
 * zero keys everywhere. That's why there's a sanity floor: if contract extraction
 * returns fewer keys than it should, the parser is the problem and it says so.
 */
import { readFileSync } from 'node:fs';

// Accepts a base directory so this can be tested with fixtures, the same way the
// versions guard accepts paths via argv.
const BASE = process.argv[2] ?? '.';
const CONTRACT = `${BASE}/src/definitions.ts`;
const SWIFT = `${BASE}/ios/Sources/KhipuPlugin/KhipuOptionsMapper.swift`;
const MAPPER = `${BASE}/android/src/main/java/com/khipu/capacitor/KhipuOptionsMapper.java`;
const HARNESS = `${BASE}/example/src/js/fields.js`;
const IOS_READER = `${BASE}/ios/Sources/KhipuPlugin/KhipuResultReader.swift`;
const READER = `${BASE}/android/src/main/java/com/khipu/capacitor/KhipuResultReader.java`;
const WEB = `${BASE}/src/web.ts`;

const read = (path) => readFileSync(path, 'utf8');
const keys = (source, pattern) => new Set([...source.matchAll(pattern)].map((m) => m[1]));
const withoutColors = (set) => new Set([...set].filter((k) => k !== 'colors'));

function interfaceKeys(source, name) {
  const block = source.match(new RegExp(`export interface ${name} \\{(.*?)\\n\\}`, 's'));
  if (!block) {
    console.error(`Could not extract interface ${name} from ${CONTRACT}. This guard's parser is out of date.`);
    process.exit(1);
  }
  return keys(block[1], /^\s*(\w+)\s*[?:]/gm);
}

// The way back (native → JS), for both platforms. Swift writes `put(&result, ...)` and
// Java `put(result, ...)`; the optional ampersand is the only difference. A reshaped
// reader yields zero keys here, which the surface check below reports as every field
// missing — loud, and in the right direction.
const RESULT_KEYS = /\bput\(&?result, "(\w+)"/g;

/** Keys inside an exported array literal, e.g. `export const WEB_UNSUPPORTED = [...]`. */
function listed(source, name) {
  const block = source.match(new RegExp(`export const ${name}[^=]*=\\s*\\[(.*?)\\]`, 's'));
  if (!block) {
    console.error(`Could not extract ${name} from ${WEB}. This guard's parser is out of date.`);
    process.exit(1);
  }
  return keys(block[1], /'(\w+)'/g);
}

const contract = read(CONTRACT);
const options = withoutColors(interfaceKeys(contract, 'KhipuOptions'));
const colors = interfaceKeys(contract, 'KhipuColors');
const result = interfaceKeys(contract, 'KhipuResult');

// Sanity floor: if the contract reads back nearly empty, the parser is broken, not the code.
if (options.size < 5 || colors.size < 8 || result.size < 5) {
  console.error(
    `Contract extraction returned ${options.size} options, ${colors.size} colors and ` +
      `${result.size} result fields — too few to be real. This guard's parser is out of ` +
      `date: fix it instead of trusting that the surfaces match.`,
  );
  process.exit(1);
}

const swift = read(SWIFT);
const mapper = read(MAPPER);
const sections = read(HARNESS).split('export const COLOR_FIELDS');

const web = read(WEB);
const webUnsupported = listed(web, 'WEB_UNSUPPORTED');
const webUnsupportedColors = listed(web, 'WEB_UNSUPPORTED_COLORS');
const webReads = withoutColors(keys(web, /\bopts\.(\w+)/g));
const webReadsColors = keys(web, /\bcolors\??\.(\w+)/g);

// Sanity floor: the same failure mode as the contract's above. `listed()` already exits
// loudly when it cannot find the array at all, but a reshaped array (different quoting,
// a different literal shape) can match the outer regex and still yield zero keys. That
// would make the partition below look "clean" — nothing read, nothing unsupported — for
// the wrong reason.
if (webUnsupported.size < 2 || webUnsupportedColors.size < 4) {
  console.error(
    `${WEB} extraction returned ${webUnsupported.size} unsupported options and ` +
      `${webUnsupportedColors.size} unsupported colors — too few to be real. This guard's ` +
      `parser is out of date: fix it instead of trusting that the surfaces match.`,
  );
  process.exit(1);
}

const surfaces = [
  { name: `${SWIFT} (options)`, expected: options, actual: withoutColors(keys(swift, /options\["(\w+)"\]/g)) },
  { name: `${SWIFT} (colors)`, expected: colors, actual: keys(swift, /colors\["(\w+)"\]/g) },
  {
    name: `${MAPPER} (options)`,
    expected: options,
    actual: withoutColors(keys(mapper, /\b(?:string|bool)\(options, "(\w+)"/g)),
  },
  { name: `${MAPPER} (colors)`, expected: colors, actual: keys(mapper, /\bstring\(colors, "(\w+)"/g) },
  { name: `${HARNESS} (options)`, expected: options, actual: keys(sections[0], /key: '(\w+)'/g) },
  {
    name: `${HARNESS} (colors)`,
    expected: colors,
    actual: keys(sections[1].split('export const PRESETS')[0], /key: '(\w+)'/g),
  },
  { name: `${IOS_READER} (result)`, expected: result, actual: keys(read(IOS_READER), RESULT_KEYS) },
  { name: `${READER} (result)`, expected: result, actual: keys(read(READER), RESULT_KEYS) },
  { name: `${WEB} (options)`, expected: options, actual: new Set([...webReads, ...webUnsupported]) },
  { name: `${WEB} (colors)`, expected: colors, actual: new Set([...webReadsColors, ...webUnsupportedColors]) },
];

let drifted = false;
for (const { name, expected, actual } of surfaces) {
  const missing = [...expected].filter((k) => !actual.has(k));
  const extra = [...actual].filter((k) => !expected.has(k));
  if (missing.length || extra.length) {
    drifted = true;
    console.error(`${name} drifted from the contract in ${CONTRACT}:`);
    if (missing.length) console.error(`  does not read/offer: ${missing.join(', ')}`);
    if (extra.length) console.error(`  reads/offers extra: ${extra.join(', ')}`);
  }
}

// An option must be in exactly one of "read" or "declared unsupported" — never both.
// Overlap is its own drift, distinct from the coverage check above: two sets can each
// pass that check (nothing missing, nothing extra in the union) while still double
// counting a key that both claim.
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

if (drifted) {
  process.exit(1);
}

console.log(
  `Vocabulary in sync across every surface: ${options.size} options, ${colors.size} colors, ` +
    `${result.size} fields in the result both iOS and Android build, and on web ` +
    `${webReads.size} options honoured with ${webUnsupported.size} declared unsupported`,
);
