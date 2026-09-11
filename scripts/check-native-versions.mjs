#!/usr/bin/env node
/**
 * Fails if the KhipuClientIOS version declared in `Package.swift` does not match the
 * one in the podspec.
 *
 * Keeping CocoaPods and SPM in parallel means the native SDK version lives in two
 * files. A merchant who installs via CocoaPods and one who installs via SPM, both on
 * the same plugin version, have to resolve the same native graph.
 *
 * Accepts both paths as arguments so this can be tested with fixtures.
 */
import { readFileSync } from 'node:fs';

const [packageSwiftPath = 'Package.swift', podspecPath = 'CapacitorKhipu.podspec'] =
  process.argv.slice(2);

function extract(path, pattern) {
  const match = readFileSync(path, 'utf8').match(pattern);
  if (!match) {
    console.error(`KhipuClientIOS version not found in ${path}`);
    process.exit(1);
  }
  return match[1];
}

const spm = extract(packageSwiftPath, /KhipuClientIOS\.git",\s*exact:\s*"([^"]+)"/);
const pod = extract(podspecPath, /s\.dependency\s+'KhipuClientIOS',\s*'([^']+)'/);

if (spm !== pod) {
  console.error(
    `KhipuClientIOS out of sync:\n  ${packageSwiftPath}: ${spm}\n  ${podspecPath}: ${pod}`,
  );
  process.exit(1);
}

console.log(`KhipuClientIOS in sync at ${spm}`);
