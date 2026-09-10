#!/usr/bin/env node
/**
 * Fails if the four surfaces that declare the options vocabulary stop matching.
 *
 * The contract between JS and native is made of strings: `src/definitions.ts` declares
 * it, the Swift mapper and the Java plugin read it, and the harness offers it. Renaming
 * a key on just one surface leaves the flag with no effect **silently** — no test on
 * either side can detect the other one drifting.
 *
 * It also covers the way back (native → JS): the 8 keys with which `KhipuPlugin.swift`
 * builds the promise via `call.resolve([...])`, against the `KhipuResult` interface.
 * Android is left out of this half: `KhipuPlugin.java` delegates the entire shape of
 * the result to the SDK (`khipuResult.asJson()`), so its keys are not in our source and
 * cannot be extracted. That half is verified by hand, comparing the fields the harness
 * shows when running the same operation on iOS and on Android.
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
const JAVA = `${BASE}/android/src/main/java/com/khipu/capacitor/KhipuPlugin.java`;
const HARNESS = `${BASE}/example/src/js/fields.js`;
const PLUGIN = `${BASE}/ios/Sources/KhipuPlugin/KhipuPlugin.swift`;

const read = (path) => readFileSync(path, 'utf8');
const keys = (source, pattern) => new Set([...source.matchAll(pattern)].map((m) => m[1]));
const withoutColors = (set) => new Set([...set].filter((k) => k !== 'colors'));

function interfaceKeys(source, name) {
  const block = source.match(new RegExp(`export interface ${name} \\{(.*?)\\n\\}`, 's'));
  if (!block) {
    console.error(
      `Could not extract interface ${name} from ${CONTRACT}. This guard's parser is out of date.`,
    );
    process.exit(1);
  }
  return keys(block[1], /^\s*(\w+)\s*[?:]/gm);
}

// The way back (native → JS): the keys with which iOS builds the promise the merchant
// receives. Android cannot be verified the same way because it delegates the entire
// shape of the result to the SDK (`khipuResult.asJson()`), so that half is covered by
// hand, comparing the harness on both platforms.
function resolveKeys(source) {
  const block = source.match(/call\.resolve\(\[(.*?)\]\)/s);
  if (!block) {
    console.error(
      `Could not extract the \`call.resolve\` block from ${PLUGIN}. This guard's parser is out of date.`,
    );
    process.exit(1);
  }
  return keys(block[1], /"(\w+)":/g);
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
const java = read(JAVA);
const sections = read(HARNESS).split('export const COLOR_FIELDS');

const surfaces = [
  { name: `${SWIFT} (options)`, expected: options, actual: withoutColors(keys(swift, /options\["(\w+)"\]/g)) },
  { name: `${SWIFT} (colors)`, expected: colors, actual: keys(swift, /colors\["(\w+)"\]/g) },
  { name: `${JAVA} (options)`, expected: options, actual: withoutColors(keys(java, /options\.\w+\("(\w+)"/g)) },
  { name: `${JAVA} (colors)`, expected: colors, actual: keys(java, /colors\.\w+\("(\w+)"/g) },
  { name: `${HARNESS} (options)`, expected: options, actual: keys(sections[0], /key: '(\w+)'/g) },
  {
    name: `${HARNESS} (colors)`,
    expected: colors,
    actual: keys(sections[1].split('export const PRESETS')[0], /key: '(\w+)'/g),
  },
  { name: `${PLUGIN} (result)`, expected: result, actual: resolveKeys(read(PLUGIN)) },
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

if (drifted) {
  process.exit(1);
}

console.log(
  `Vocabulary in sync across every surface: ${options.size} options, ${colors.size} colors, ` +
    `and ${result.size} fields in the result iOS builds`,
);
