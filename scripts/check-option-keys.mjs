#!/usr/bin/env node
/**
 * Falla si las cuatro superficies que declaran el vocabulario de opciones dejan de
 * coincidir.
 *
 * El contrato entre JS y el nativo es de strings: `src/definitions.ts` lo declara, el
 * mapper de Swift y el plugin de Java lo leen, y el harness lo ofrece. Renombrar una
 * clave en una sola superficie deja el flag sin efecto **en silencio** — ningún test de
 * un lado puede detectar una deriva del otro.
 *
 * Sobre la fragilidad: esto parsea fuente con expresiones regulares. La dirección del
 * fallo es la correcta (el chequeo se rompe y alguien mira, en vez de pasar mientras el
 * protocolo derivó), pero un parser roto podría reportar «todas coinciden» con cero
 * claves en todas. Por eso hay un piso de cordura: si la extracción del contrato
 * devuelve menos claves de las que debería, el problema es el parser y se dice así.
 */
import { readFileSync } from 'node:fs';

// Acepta un directorio base para poder testear con fixtures, igual que la guarda de
// versiones acepta rutas por argv.
const BASE = process.argv[2] ?? '.';
const CONTRATO = `${BASE}/src/definitions.ts`;
const SWIFT = `${BASE}/ios/Sources/KhipuPlugin/KhipuOptionsMapper.swift`;
const JAVA = `${BASE}/android/src/main/java/com/khipu/capacitor/KhipuPlugin.java`;
const HARNESS = `${BASE}/example/src/js/fields.js`;

const leer = (path) => readFileSync(path, 'utf8');
const claves = (fuente, patron) => new Set([...fuente.matchAll(patron)].map((m) => m[1]));
const sinColors = (conjunto) => new Set([...conjunto].filter((k) => k !== 'colors'));

function interfaz(fuente, nombre) {
  const bloque = fuente.match(new RegExp(`export interface ${nombre} \\{(.*?)\\n\\}`, 's'));
  if (!bloque) {
    console.error(
      `No se pudo extraer la interfaz ${nombre} de ${CONTRATO}. El parser de esta guarda quedó obsoleto.`,
    );
    process.exit(1);
  }
  return claves(bloque[1], /^\s*(\w+)\s*[?:]/gm);
}

const contrato = leer(CONTRATO);
const opciones = sinColors(interfaz(contrato, 'KhipuOptions'));
const colores = interfaz(contrato, 'KhipuColors');

// Piso de cordura: si el contrato se lee casi vacío, lo roto es el parser, no el código.
if (opciones.size < 5 || colores.size < 8) {
  console.error(
    `La extracción del contrato devolvió ${opciones.size} opciones y ${colores.size} colores, ` +
      `muy pocas para ser real. El parser de esta guarda quedó obsoleto: arréglalo en vez de ` +
      `confiar en que las superficies coinciden.`,
  );
  process.exit(1);
}

const swift = leer(SWIFT);
const java = leer(JAVA);
const tramos = leer(HARNESS).split('export const COLOR_FIELDS');

const superficies = [
  { nombre: `${SWIFT} (opciones)`, esperado: opciones, real: sinColors(claves(swift, /options\["(\w+)"\]/g)) },
  { nombre: `${SWIFT} (colores)`, esperado: colores, real: claves(swift, /colors\["(\w+)"\]/g) },
  { nombre: `${JAVA} (opciones)`, esperado: opciones, real: sinColors(claves(java, /options\.\w+\("(\w+)"/g)) },
  { nombre: `${JAVA} (colores)`, esperado: colores, real: claves(java, /colors\.\w+\("(\w+)"/g) },
  { nombre: `${HARNESS} (opciones)`, esperado: opciones, real: claves(tramos[0], /key: '(\w+)'/g) },
  {
    nombre: `${HARNESS} (colores)`,
    esperado: colores,
    real: claves(tramos[1].split('export const PRESETS')[0], /key: '(\w+)'/g),
  },
];

let derivo = false;
for (const { nombre, esperado, real } of superficies) {
  const falta = [...esperado].filter((k) => !real.has(k));
  const sobra = [...real].filter((k) => !esperado.has(k));
  if (falta.length || sobra.length) {
    derivo = true;
    console.error(`${nombre} derivó del contrato de ${CONTRATO}:`);
    if (falta.length) console.error(`  no lee/ofrece: ${falta.join(', ')}`);
    if (sobra.length) console.error(`  lee/ofrece de más: ${sobra.join(', ')}`);
  }
}

if (derivo) {
  process.exit(1);
}

console.log(
  `Vocabulario sincronizado en las cuatro superficies: ${opciones.size} opciones, ${colores.size} colores`,
);
