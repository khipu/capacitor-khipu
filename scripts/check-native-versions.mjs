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
