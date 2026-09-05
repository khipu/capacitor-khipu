# Estado de la migración a SPM — dónde quedó y qué falta

**Última actualización:** 2026-09-05 — las tres líneas están publicadas

Este documento es el punto de entrada para retomar el trabajo sin contexto previo.
El diseño está en `specs/2026-09-04-migracion-spm-capacitor-8-design.md` y el plan
paso a paso en `plans/2026-09-04-migracion-spm-capacitor-8.md`.

## Qué se hizo

Se migró el consumo del SDK de iOS de CocoaPods a Swift Package Manager, y el plugin
pasó de Capacitor 5 a tres líneas: dos mantenidas y una congelada.

| Línea | Branch | Capacitor | iOS mín. | dist-tag | Versión a publicar |
| --- | --- | --- | --- | --- | --- |
| 4.x | `main` | 8 | 15 | `latest` | `4.0.0` ✅ publicada |
| 3.x | `7.x` | 7 | 14 | `cap7` | `3.0.0` ✅ publicada |
| 2.x | `release/2.x` | 5 y 6 | 13 | `cap6` | `2.11.3` ✅ publicada |

**Las dos líneas mantenidas exponen `Package.swift` y `CapacitorKhipu.podspec`**, así
que un comercio puede instalar por SPM o por CocoaPods en cualquiera de las dos. La
línea `2.x` no lleva `Package.swift`: se queda solo en CocoaPods, porque el soporte SPM
de Capacitor 6 es experimental según su propia guía y el `capacitor-swift-pm` que haría
falta entra en conflicto de resolución. Entre las mantenidas, lo que difiere es qué
gestor demuestra la app de ejemplo de cada línea: `7.x` usa CocoaPods
(el default de Capacitor 7) y `main` usa SPM (el de Capacitor 8), de modo que entre las
dos quedan ambos caminos ejercitados con builds reales.

Las tres líneas están **publicadas en npm**, el 2026-09-05, con sus dist-tags:

```
{ latest: '4.0.0', cap6: '2.11.3', cap7: '3.0.0' }
```

Los tags `v2.11.2`, `v2.11.3`, `v3.0.0` y `v4.0.0` están en `origin`. `3.0.0` y `4.0.0`
tienen release de GitHub porque salieron con release-it; las dos de la línea congelada
no, porque salieron con `npm publish` directo.

### Defectos corregidos que afectaban a comercios en producción

1. **Crash por `as!`** en el mapeo de opciones de iOS: un `title: 123` enviado desde JS
   hacía crashear la app en medio de un pago. Ahora se descarta el valor de tipo
   incorrecto. Cubierto por `testDescartaValoresDeTipoIncorrectoEnVezDeCrashear`.
2. **El pago no aparecía** si el comercio tenía su propio modal en pantalla: UIKit
   rechaza presentar sobre un controlador que ya presenta. Se agregó
   `KhipuPlugin.topMost(from:)`, que recorre la cadena de presentación.
3. **El timeout de la capa web nunca disparaba**: `KWS_TIMEOUT` y `KHIPU_WEB_ROOT`
   estaban declaradas con `:` en vez de `=`, o sea anotaciones de tipo sin
   inicializador, y quedaban `undefined` en runtime.
4. **El README mentía en tres puntos**, todos con consecuencia real: decía que iOS no
   necesita configuración (sin `LSApplicationQueriesSchemes` el SDK se salta abrir la
   app del banco **sin emitir error**, así que la autorización 2FA no ocurre); pedía
   `kotlin-gradle-plugin:1.9.0` cuando el SDK de Android está compilado con Kotlin
   2.0.21 (un comercio con fuentes Kotlin propias no compila); y no tenía matriz de
   compatibilidad, así que tras publicar `4.0.0` un comercio en Capacitor 7 recibiría
   un `ERESOLVE` sin pista de que existe `@cap7`.
5. **`npm run verify:android` nunca pudo funcionar**: el `android/build.gradle` del
   plugin no declaraba el repo maven donde vive `com.khipu:khipu-client-android`, que
   no está en Maven Central.

### Lo que se construyó

- **Harness de pruebas** en `example/`, con los 21 campos de `KhipuOptions`
  ejercitables y **tri-estado por campo**: marcar «incluir» distingue «clave no
  enviada» de «clave enviada con valor», que es lo que el SDK nativo distingue. Sin
  eso es imposible probar el comportamiento por omisión.
- **46 tests** donde antes había cero para JS y dos rotos para iOS: 30 de
  JS/TS y guardas (vitest), 16 de iOS (XCTest).
- **Dos guardas de sincronía** en `scripts/`, que protegen invariantes que nada más
  vigila: que `KhipuClientIOS` no se desincronice entre `Package.swift` y el podspec, y
  que el vocabulario de opciones no derive entre sus cuatro superficies
  (`src/definitions.ts`, el mapper de Swift, el plugin de Java y el catálogo del
  harness). Las dos tienen tests de su camino de fallo, no solo del de éxito.
- **CI en GitHub Actions**, el primero del repo, corriendo en `main` y `7.x`.

### El CI, verde en las dos líneas mantenidas

Corrió por primera vez el 2026-09-05 y falló en las dos, por la misma causa:
`package.json` y `package-lock.json` desincronizados para el npm del runner. El lock se
había generado con **npm 11.16 (Node 26)** y el CI usa **Node 22**, cuyo npm arma un
árbol distinto; `npm ci` es estricto y falla, mientras `npm install` local no lo nota.
Faltaban tres paquetes, todos peers opcionales que cuelgan de `git-semver-tags` bajo
`release-it`: `conventional-commits-filter@5.0.0`, `conventional-commits-parser@6.4.0`
y `@simple-libs/stream-utils@1.2.0`.

Corregido en `ffb69ed` (`main`) y `55383fb` (`7.x`). **El fix no es cherry-pickeable
entre líneas**: los árboles de dependencias difieren, así que cada branch necesita su
propia regeneración.

**Regla que se desprende, y que conviene respetar:** regenerar el lock con
`~/.nvm/versions/node/v22.23.2/bin/npm install`, no con el Node de Homebrew.

Los cuatro jobs pasan en ambas líneas. Los dos puntos que el plan anticipaba como
posibles ajustes del runner **no se materializaron**: el destino del simulador sin `OS=`
no fue ambiguo, y `xcodebuild` autocreó el esquema del ejemplo en el checkout limpio. No
hay que tocar nada, pero si alguna vez se quejan, la salida sigue siendo fijar la
versión de runtime que el runner tenga — **`OS=latest` no sirve**, `xcodebuild` lo
rechaza, comprobado.

## Verificado en dispositivo

| | Línea 7 (CocoaPods) | Línea 8 (SPM) |
| --- | --- | --- |
| iOS: instalación nativa | `pod install` ✅ | `CapApp-SPM` ✅ |
| iOS: bundle de recursos del SDK | ✅ | ✅ |
| iOS: `title` y colores de marca | ✅ | ✅ |
| iOS: tema oscuro y `showFooter` | — | ✅ |
| Android: compila y renderiza | ✅ | ✅ |
| SDK confirmado en runtime | iOS `2.16.5`, Android `2.27.0` | iOS `2.16.5` |

El riesgo que más preocupaba —que los recursos del SDK cargaran construidos por SPM en
vez de CocoaPods— **está resuelto**: el bundle cambia de nombre y ubicación según el
gestor (`KhipuClientIOS.bundle` dentro del framework en CocoaPods,
`KhipuClientIOS_KhipuClientIOS.bundle` en la raíz de la app en SPM), y aun así el
logotipo y las fuentes cargan. Detalle en el spec.

### Verificación con apps construidas desde cero

Después de publicar se armaron tres apps vacías, una por major, se instaló el plugin
con el comando que dice cada README y se siguió **solo** la documentación, sin usar
nada sabido por el repo. Las seis combinaciones llegaron a la pantalla de pago con un
`operationId` real.

| | iOS | Android |
| --- | --- | --- |
| Cap 6 (`@cap6`) | `v2.16.5`, CocoaPods | `v2.27.0`, **requiere Kotlin** |
| Cap 7 (`@cap7`) | `v2.16.5`, CocoaPods | `v2.27.0`, sin Kotlin |
| Cap 8 (`latest`) | `v2.16.5`, **SPM** | `v2.27.0`, sin Kotlin |

Las apps se borraron una vez terminado el ejercicio. Para repetirlo en el próximo
release, con `<N>` el major de Capacitor:

```bash
mkdir doctest-cap<N> && cd doctest-cap<N>
npm init -y
npm i @capacitor/core@^<N> && npm i -D @capacitor/cli@^<N> esbuild
npx cap init "Doctest Cap<N>" com.khipu.doctest.cap<N> --web-dir=www
npm i @capacitor/ios@^<N> @capacitor/android@^<N>
npm install capacitor-khipu@<dist-tag>     # el comando que dice el README, tal cual
npx cap add ios && npx cap add android
```

Después una página mínima que llame a `Khipu.startOperation({operationId, options})`,
empaquetada con esbuild porque el import no funciona sin bundler, y **solo** los pasos
de setup que el README indique: los `LSApplicationQueriesSchemes` en el `Info.plist` y
el repo maven de khenshin en `allprojects`. Todo lo que haya que hacer y no esté
escrito, es el hallazgo.

Dos notas prácticas: usar Node 22, porque el 26 de Homebrew arma árboles distintos; y
apuntar `xcodebuild` al simulador **por UDID**, no por nombre, que con varios runtimes
instalados es ambiguo.

Los tres comandos documentados resuelven a lo que deben, comprobado contra el registro:
`@cap6`→`2.11.3`, `@cap7`→`3.0.0`, pelado→`4.0.0`. Y la advertencia del README de `7.x`
es cierta: el comando pelado en una app Capacitor 7 falla con
`ERESOLVE ... peer @capacitor/core@">=8.0.0" from capacitor-khipu@4.0.0`.

**El hallazgo que esto destapó, y que ninguna prueba del repo podía destapar:** el
plugin de Kotlin **sí hace falta en Capacitor 6**. El README decía que no, y esa
afirmación se había escrito mirando las apps de ejemplo del repo, que son Capacitor 7 y
8. Medido en la app Cap 6 desde cero:

| AGP | Plugin de Kotlin | Resultado |
| --- | --- | --- |
| 8.2.1 (default de Cap 6) | ninguno | falla: cientos de `Duplicate class androidx.compose.ui.*` |
| 8.2.1 | 1.9.0 (lo que decía docs.khipu.com) | falla: `Unknown Kotlin JVM target: 21` |
| 8.2.1 | 2.0.21 | compila |
| 8.7.2 | ninguno | compila |

`androidx.compose.ui:ui` es multiplataforma: alguien tiene que pedir el atributo
`org.jetbrains.kotlin.platform.type` o Gradle resuelve la variante `jvmstubs` y choca
con `ui-android`. El plugin de Kotlin lo pide; AGP 8.7 en adelante también. **El eje es
AGP, no el major de Capacitor**, y Capacitor 6 trae AGP 8.2.1 mientras 7 trae 8.7.2 y 8
trae 8.13.0. Corregido en los README de las tres líneas, y `2.11.3` se publicó
justamente para eso.

También se reprodujo, ya fuera del harness, la divergencia de `locale`: la misma
operación sin `locale` salió en español en iOS y en inglés en Android.

Lo que **no** se pudo verificar: las nueve `LSApplicationQueriesSchemes` siguen
comprobadas solo como declaración. Las seis corridas fueron en simulador y emulador,
donde no hay apps de banco instaladas, así que `canOpenURL` nunca se ejerció de verdad.
Hace falta un dispositivo físico con al menos una app bancaria.

## Qué falta

### Pendientes menores, ninguno bloqueante

- **Verificar en Android que el modo oscuro mapea bien.** El camino de colores de
  Android es código Java distinto al de Swift, y solo se probó el claro.
- **Comparar los campos del `KhipuResult` entre iOS y Android** corriendo la misma
  operación en ambas. Es lo único que ninguna guarda estática puede cubrir: iOS arma el
  resultado a mano con literales y Android lo delega al SDK con `khipuResult.asJson()`,
  así que las claves de Android no están en nuestro fuente.
- **El warning de `@typescript-eslint`** parseando TypeScript 5.9.3 fuera de su rango
  soportado (`<5.2.0`). Se aceptó porque es exactamente el stack de los plugins
  oficiales de Capacitor 8: `@ionic/eslint-config@0.4.0` es la última versión y fija
  `^5.58`. Salirse implica mantener config propia de eslint.
- **`merge()` en `example/src/js/storage.js`**: la guarda de `colors` es a nivel del
  objeto completo, así que un `stored.colors = {}` pisaría `colors.include` con `false`.
  Latente, sin impacto bajo el uso real, y solo afecta al harness.
- **Ejercitar `canOpenURL` en un dispositivo físico** con al menos una app de banco
  instalada. Es lo único que las apps desde cero no pudieron cubrir, y hasta que se
  haga, las nueve `LSApplicationQueriesSchemes` siguen verificadas solo como
  declaración. Lo mismo vale para los otros tres plugins, según el equipo de docs.
- **`exitUrl` salió mal tipado en `2.11.2`** (`string` en vez de `string | undefined`).
  En `2.11.3` sigue igual porque corregirlo rompería la compilación de los comercios que
  ya lo leen sin guarda, y la línea está congelada. Las dos líneas mantenidas lo tienen
  correcto desde `48aabf7`.
- **Los releases de GitHub de `2.11.2` y `2.11.3` no existen**, porque esa línea salió
  con `npm publish` directo en vez de release-it. Se crean con `gh release create` si
  alguien los echa de menos.
- **30 alertas de Dependabot** en el branch por defecto (2 críticas, 17 altas). Son
  dependencias de desarrollo, no llegan al comercio, y nadie las revisó todavía.

## Hallazgo pendiente de reportar a otros equipos

**Los dos SDK nativos difieren en el valor por omisión de `locale`.** Cuando el comercio
no envía la clave:

```
iOS      KhipuOptions.swift:70   var _locale: String = "es_CL"
Android  KhipuOptions.kt:39      var locale: String? = null
```

O sea que iOS fuerza español de Chile y Android sigue el idioma del teléfono. Se observó
con la misma operación y el mismo payload: la pantalla salió en español en iOS y en
inglés en Android, con el emulador en inglés. No es un defecto del plugin —el mapper
omite la clave correctamente— sino una inconsistencia entre los SDK, y vale reportarla a
esos equipos.

Apareció **gracias al tri-estado del harness**: si el ejemplo enviara siempre `es_CL`,
como hacía el anterior con todo hardcodeado, los dos lados se verían iguales y la
diferencia habría quedado escondida hasta que un comercio la reportara.

## Worktrees de trabajo

Ya no hay ninguno: los dos se borraron el 2026-09-05, una vez publicadas las tres
líneas. Los branches `7.x` y `release/2.x` siguen intactos en local y en `origin`; lo
que se borró son solo los directorios de trabajo.

Si hace falta volver a tocar una línea que no es `main`:

```
git worktree add .claude/worktrees/<nombre> <branch>
```

`.claude/` está en el `.gitignore` (commit `d3f2a54`) porque los worktrees viven ahí, o
sea dentro del repo, y sin eso prettier y eslint escanean una copia completa del
proyecto y fallan sobre archivos generados.
