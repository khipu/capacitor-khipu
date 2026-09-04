# Migración a SPM y soporte de Capacitor 7 y 8

**Fecha:** 2026-09-04
**Estado:** diseño aprobado, pendiente de plan de implementación

## Problema

`capacitor-khipu` consume `KhipuClientIOS` únicamente por CocoaPods y declara
soporte para Capacitor 5, 6 y 7 con dependencias de desarrollo fijadas en
Capacitor 5. Hoy `KhipuClientIOS` ya publica un `Package.swift`, y Capacitor 8
convirtió a Swift Package Manager en el gestor por defecto de iOS, dejando
CocoaPods en modo mantenimiento. El plugin no expone `Package.swift`, así que
ningún comercio que haya migrado su app a SPM puede instalarlo.

## Hechos verificados el 2026-09-04

| Dato | Valor | Cómo se verificó |
| --- | --- | --- |
| Soporte SPM en `KhipuClientIOS` | desde el tag **2.16.3** | `Package.swift` devuelve 404 en los tags 2.16.0 y 2.16.2, y 200 desde 2.16.3 |
| Último `KhipuClientIOS` | **2.16.5** | API de tags de `khipu/KhipuClientIOS` |
| Último `khipu-client-android` | **2.27.0** | `maven-metadata.xml` del nexus de Khipu; es lo que el plugin ya fija |
| Último Capacitor estable | **8.5.1** (v9 en alpha) | dist-tags de `@capacitor/core` en npm |
| Nombre SPM que exige el CLI | **`CapacitorKhipu`** | `cli/src/util/spm.ts` genera `.product(name: X, package: X)` con `X = fixName("capacitor-khipu")`; `fixName` verificado en `cli/src/plugin.ts` |
| Modelo de mantención de Ionic | branch por major | `ionic-team/capacitor-plugins` tiene branches `3.x` … `7.x` vivos, cada uno con podspec + `Package.swift` |
| iOS mínimo | Cap 6 → 13, Cap 7 → 14, Cap 8 → 15 | guías oficiales de migración de plugins + podspec y `Package.swift` de `@capacitor/splash-screen` en `7.x` y `main` |
| Mezclar gestores | imposible en un mismo proyecto iOS de Capacitor | documentación de Capacitor sobre SPM |

## Decisiones

1. **Dos líneas mantenidas**, más un cierre ordenado de la línea vieja.
2. **CocoaPods y SPM en paralelo** en ambas líneas mantenidas.
3. **Branch por major** (modelo Ionic), sin monorepo.
4. **Una app de ejemplo por línea, con gestores cruzados**: la línea de
   Capacitor 7 usa CocoaPods (su default) y la de Capacitor 8 usa SPM (su
   default), de modo que cada línea ejercita el gestor que sus comercios van a
   usar de verdad.
5. **El harness de prueba expone todos los flags del cliente**, con tri-estado
   por campo.
6. **Se arreglan tres defectos** encontrados en código que la migración toca de
   todas formas (ver "Defectos a corregir").

### Por qué la línea de Capacitor 7 no puede cubrir Capacitor 6

Se evaluó y se descartó por razones técnicas, no de preferencia:

- **SPM.** `capacitor-swift-pm` con `from: "7.0.0"` significa `>=7.0.0 <8.0.0`.
  Una app Capacitor 6 genera un `CapApp-SPM` que fija 6.x, lo que produce un
  conflicto de resolución. Usar el rango `"6.0.0"..<"8.0.0"` no resuelve el
  problema porque `platforms:` admite un solo valor y Capacitor 7 exige
  `.iOS(.v14)`; SPM rechaza que un paquete declare un mínimo de plataforma
  menor que el de sus dependencias, así que habría que imponer iOS 14 a apps
  Capacitor 6 que hoy pueden ir a 13. Además el soporte SPM de Capacitor 6 es
  explícitamente experimental según su propia guía de migración.
- **CocoaPods.** Un `deployment_target` de 14.0, junto al
  `assertDeploymentTarget(installer)` que Capacitor inyecta en el Podfile, hace
  fallar `pod install` en una app Capacitor 6 con target iOS 13.
- **Android sí sería viable.** El `android/build.gradle` del plugin lee
  `rootProject.ext.compileSdkVersion` con fallback, así que se adapta al SDK de
  la app. El único punto rígido es `sourceCompatibility`, que se podría dejar
  en 17. Pero como iOS es justamente lo que se está migrando, la flexibilidad
  de Android no alcanza para sostener la compatibilidad.

## Arquitectura

```
main          → capacitor-khipu 4.x   Capacitor 8   iOS 15   dist-tag: latest
branch 7.x    → capacitor-khipu 3.x   Capacitor 7   iOS 14   dist-tag: cap7
2.11.2        → release final para Cap 5/6, solo CocoaPods, luego congelado   dist-tag: cap6
```

`2.11.2` se publica con `npm publish --tag cap6` explícito. Si se publicara sin
dist-tag, al ser la versión más alta del registro en ese momento se convertiría
en `latest` y `latest` retrocedería a una línea que acabamos de congelar. Con
`cap6`, `latest` se queda en `2.11.1` hasta que se publique `4.0.0`. Un comercio
en Capacitor 5 o 6 instala `capacitor-khipu@cap6`.

El branch `7.x` se corta desde `main` **después** de que el trabajo común esté
listo y `main` haya llegado a Capacitor 7, para que el diff entre branches sea
mínimo. Mantención posterior: se arregla en `main` y se hace `git cherry-pick`
hacia `7.x`.

Un comercio en Capacitor 7 instala `capacitor-khipu@cap7`; uno en Capacitor 8
instala `capacitor-khipu`. Los tags de git (`v${version}`) conviven sin colisión
porque los rangos de versión no se solapan.

### Configuración por branch

| | `main` | `7.x` |
| --- | --- | --- |
| `version` | `4.0.0` | `3.0.0` |
| `peerDependencies["@capacitor/core"]` | `>=8.0.0` | `>=7.0.0` |
| devDependencies `@capacitor/*` | `^8.0.0` | `^7.0.0` |
| `release-it.npm.tag` | ausente (queda `latest`) | `cap7` |
| `release-it.git.requireBranch` | `main` | `7.x` |
| `Package.swift` → `platforms` | `.iOS(.v15)` | `.iOS(.v14)` |
| `Package.swift` → `capacitor-swift-pm` | `from: "8.0.0"` | `from: "7.0.0"` |
| podspec `ios.deployment_target` | `15.0` | `14.0` |
| app de ejemplo | Capacitor 8 + SPM | Capacitor 7 + CocoaPods |

El resto del tooling JS (eslint, prettier, rollup, typescript, docgen) se
mantiene **idéntico en ambos branches**: es independiente del major de
Capacitor y unificarlo reduce la divergencia que hay que portar.

## iOS

### `Package.swift` de `main`

Los nombres no son decorativos. El CLI de Capacitor genera
`.product(name: "CapacitorKhipu", package: "CapacitorKhipu")` dentro de
`CapApp-SPM`, así que el `name:` del package y el del product tienen que ser
exactamente `CapacitorKhipu` o la resolución falla. El target, en cambio, sigue
la ruta del código y se llama `KhipuPlugin`.

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorKhipu",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "CapacitorKhipu", targets: ["KhipuPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/khipu/KhipuClientIOS.git", exact: "2.16.5")
    ],
    targets: [
        .target(
            name: "KhipuPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "KhipuClientIOS", package: "KhipuClientIOS")
            ],
            path: "ios/Sources/KhipuPlugin"),
        .testTarget(
            name: "KhipuPluginTests",
            dependencies: ["KhipuPlugin"],
            path: "ios/Tests/KhipuPluginTests")
    ]
)
```

En `7.x` cambian dos líneas: `.iOS(.v14)` y `capacitor-swift-pm` con
`from: "7.0.0"`.

### Fijación de `KhipuClientIOS`

Se usa `exact:` en SPM y la versión exacta en el podspec, no rangos, para acercar
todo lo posible el grafo nativo que resuelve un comercio por CocoaPods al que
resuelve otro por SPM **de la misma versión del plugin**. Es la misma decisión que
tomó el equipo de `KhipuClientIOS` en su propio `Package.swift`, donde las
dependencias están fijadas con `.exact` con un comentario que dice exactamente
eso.

**Corrección: fijar `KhipuClientIOS` exacto no hace idénticos los dos grafos, y no
hay que prometerlo.** `Starscream` no es dependencia declarada de
`KhipuClientIOS`: llega por vía transitiva a través de `socket.io-client-swift`,
que en su `Package.swift` de la versión 16.1.1 la declara como
`.upToNextMajor(from: "4.0.8")`, o sea `>=4.0.8 <5.0.0`. Por CocoaPods el mismo
pod la declara como `~> 4.0.8`, o sea `>=4.0.8 <4.1.0`. Verificado en el
`Package.swift` del tag `v16.1.1` de `socketio/socket.io-client-swift` y en el
`Podfile.lock` de la app de ejemplo. El fijado exacto de `2.16.5` estrecha la
diferencia a las tres dependencias que `KhipuClientIOS` declara, pero no la cierra.

Contrapartida aceptada: si la app del comercio declara además `KhipuClientIOS`
en otra versión, SPM falla con un conflicto duro en vez de negociar una versión
compatible.

### Sincronía entre los dos manifests

Mantener ambos gestores implica que la versión de `KhipuClientIOS` vive en dos
archivos (`Package.swift` y `CapacitorKhipu.podspec`). Se agrega un script de
verificación al CI que **falla si las dos versiones difieren**, en lugar de
confiar en la disciplina manual.

El script vive en `scripts/check-native-versions.mjs` y se expone como
`npm run verify:versions`, de modo que también se pueda correr en local y no
solo en CI.

El bump de `2.16.2` a `2.16.5` es obligatorio: `2.16.2` no tiene `Package.swift`
y por lo tanto no puede consumirse por SPM.

## Android

El módulo Android del plugin es Java puro, sin Kotlin, así que los requisitos de
Kotlin de Capacitor solo afectan las instrucciones del README para los
comercios, no el build del plugin.

| | `main` (Cap 8) | `7.x` (Cap 7) | actual |
| --- | --- | --- | --- |
| compileSdk / targetSdk | 36 | 35 | 34 |
| minSdk | 24 | 23 | 22 |
| Android Gradle Plugin | 8.13.0 | 8.7.2 | 8.2.1 |
| Gradle wrapper | 8.14.3 | 8.11.1 | 8.2.1 |
| Java source/target | 21 | 21 | 17 |
| `khipu-client-android` | 2.27.0 | 2.27.0 | 2.27.0 |
| Kotlin (solo README) | 2.2.20 | 1.9.25 | 1.9.0 |

Los cambios se aplican con las herramientas oficiales
(`@capacitor/plugin-migration-v6-to-v7@0.0.7`, luego
`@capacitor/plugin-migration-v7-to-v8@0.0.1`) y **se revisa el diff a mano**; no
se aceptan cambios de las herramientas sin leerlos.

Arrastra dos cambios de tooling JS: Prettier 3 con `prettier-plugin-java` 2
requiere pasar `--plugin=prettier-plugin-java` explícitamente en el script, y
Rollup 4 requiere renombrar `rollup.config.js` a `rollup.config.mjs`.

## Harness de las apps de prueba

Hoy `example/src/js/example.js` es un botón con el `operationId` y las opciones
hardcodeadas y los colores comentados. Se reemplaza por un harness que permite
ejercitar **todos** los campos de `KhipuOptions`.

Se mantiene HTML + JS plano, sin framework, en un solo par de archivos
(`example/src/index.html` y `example/src/js/example.js`), para que el
cherry-pick hacia `7.x` sea un commit limpio.

### Tri-estado por campo

Es el requisito central del harness. El plugin distingue "clave ausente" de
`false` — ver `options.has("showFooter")` en `KhipuPlugin.java` y
`options!["showFooter"] != nil` en `KhipuPlugin.swift` — y el SDK nativo aplica
sus propios valores por omisión. Si el harness enviara siempre los cinco
booleanos, sería imposible probar el comportamiento por defecto, que es el que
ve un comercio que no configura nada.

Por eso cada fila del formulario tiene una casilla **"incluir"** además de su
control. Sin marcar, la clave no se agrega al payload.

### Campos

- `operationId`: texto, obligatorio.
- `title`, `titleImageUrl`, `locale`: texto.
- `theme`: selector `light` / `dark` / `system`.
- `skipExitPage`, `skipExitSuccessPage`, `showFooter`, `showMerchantLogo`,
  `showPaymentDetails`: interruptores.
- `colors`: los 12 campos (`light`/`dark` × `Background`, `OnBackground`,
  `Primary`, `OnPrimary`, `TopBarContainer`, `OnTopBarContainer`) como
  selectores de color. El objeto `colors` completo también se puede omitir.

### Otras características

- **Preview del JSON exacto** que se va a enviar, visible antes de disparar la
  operación.
- **Persistencia en `localStorage`**: al probar en dispositivo se recarga mucho
  y retipear el `operationId` cada vez es fricción real.
- **Presets**: *todo por defecto* (solo `operationId`), *marca Khipu* (púrpura
  `#8347AD`, cian `#3CB4E5`), *todo activado*, *modo oscuro*.
- **Resultado formateado**: los campos de `KhipuResult` más una tabla de
  eventos, en vez del `JSON.stringify` plano actual.
- **Aviso de plataforma.** `src/web.ts` ignora en silencio `locale`, `title`,
  `titleImageUrl`, `showFooter`, `showMerchantLogo`, `showPaymentDetails` y 10
  de los 12 colores; solo implementa `theme`, `lightPrimary`/`darkPrimary`,
  `skipExitPage` y `skipExitSuccessPage`. El harness marca esos campos como
  ignorados por el fallback web, para que nadie concluya que un flag está roto
  cuando en realidad nunca se implementó en web.

### `LSApplicationQueriesSchemes` en el `Info.plist` del ejemplo

`example/ios/App/App/Info.plist` es el template pelado de Capacitor y **no declara
`LSApplicationQueriesSchemes`**, así que `canOpenURL` falla para las nueve apps
bancarias chilenas y `openApp` no puede abrir ninguna. Como un ejemplo existe para
ser copiado, cualquier comercio que use su plist como referencia hereda el
problema. Esto importa acá porque las tareas de migración **regeneran** `example/ios`
con `npx cap add ios`, que vuelve a producir el template sin la llave.

Los nueve schemes, verificados contra la página de integración de Capacitor de la
documentación de Khipu:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>bancochilemipass2</string>
  <string>BciPassApp</string>
  <string>BICEPassApp</string>
  <string>scotiabankgo</string>
  <string>SantanderPassApp</string>
  <string>tupass</string>
  <string>bancoestado</string>
  <string>itau.cl</string>
  <string>SecurityPass</string>
</array>
```

Además, el README dice hoy «iOS setup: No need for aditional steps», lo que
contradice a la documentación oficial. Se corrige.

### Divergencia entre branches

`example/src/**` es común y se porta por cherry-pick. `example/ios/**`,
`example/android/**` y `example/package.json` son propios de cada branch y
**nunca** se cherry-pickean. En `main` hay que borrar y regenerar
`example/ios` con `npx cap add ios --packagemanager SPM`, porque hoy está
commiteado como proyecto CocoaPods y los dos gestores no pueden coexistir.

## Defectos a corregir

### a) El test de iOS no compila

`ios/Tests/KhipuPluginTests/KhipuPluginTests.swift` instancia `Khipu()` y llama
`.echo()`; ninguno de los dos existe. Es boilerplate del template de plugin que
quedó sin editar. Hoy no se nota porque sin `Package.swift` no existe el target
de tests; al crearlo, el build falla. Se reemplaza por tests reales.

### b) Dos estáticas de `src/web.ts` nunca se asignan

`KHIPU_WEB_ROOT` y `KWS_TIMEOUT` están declaradas con `:` en vez de `=`, así que
son anotaciones de tipo sin inicializador y quedan `undefined` en runtime.
Verificado en el build: `dist/esm/web.js` asigna únicamente `KWS_SCRIPT_ID`.

Consecuencia real: la guarda `KhipuWeb.KWS_TIMEOUT && ...` es siempre falsa, así
que el timeout de 10 segundos nunca se dispara y `ensureKhipuIsSet` puede quedar
haciendo polling indefinido si `js.khipu.com/v1/kws.js` no carga. Compila limpio
porque `strictPropertyInitialization` no aplica a propiedades estáticas.

Se corrigen ambas a asignación.

### c) `KhipuPlugin.swift` usa `as!` en el mapeo de opciones

El mapeo de `KhipuOptions` fuerza el cast con `as!` en alrededor de veinte
lugares. Si un comercio envía `title: 123`, la app **crashea** en vez de recibir
un `call.reject`.

Se extrae el mapeo a un `KhipuOptionsMapper` con una función pura y casts
seguros (`as?`), y se cubre con tests unitarios que verifican que los veinte
campos mapean correctamente. Esto es la contraparte del harness: si la app de
prueba puede enviar todos los flags, los tests garantizan que ninguno se pierda
en silencio.

Nota: `KhipuPlugin.java` tiene un patrón análogo con `Objects.requireNonNull` y
`assert`. Queda fuera de alcance en este trabajo y se anota como pendiente.

## Verificación y CI

El repositorio no tiene `.github/` hoy. Se agrega un workflow de GitHub Actions
que corre en `main` y en `7.x`. Es la pieza que hace sostenible mantener dos
líneas en paralelo.

| Job | Comando |
| --- | --- |
| lint | `eslint` + `prettier --check` en el job de Linux; `swiftlint` en el de macOS |
| web | `npm run build` |
| iOS build | `xcodebuild build -scheme CapacitorKhipu -destination generic/platform=iOS` |
| iOS tests | `xcodebuild test -scheme CapacitorKhipu-Package` en simulador |
| Android | `cd android && ./gradlew clean build test` |
| sync de versión | script que falla si `KhipuClientIOS` difiere entre `Package.swift` y el podspec |
| podspec | `pod lib lint --allow-warnings` |
| app de ejemplo | build completo, solo en push a `main` y `7.x` |

El build de la app de ejemplo se deja fuera de los PR por ser lento; es lo único
que prueba de verdad la integración del gestor de paquetes de punta a punta.

Además hay que corregir `verify:ios` en `package.json`: hoy dice
`xcodebuild -scheme CapacitorKhipu -destination generic/platform=iOS`, sin el
subcomando `build` y sin que exista el scheme.

## Orden de trabajo

`main` camina 5 → 6 → 7 → 8, y el branch `7.x` se corta en la parada de
Capacitor 7.

Cada paso numerado es una fase independientemente liberable y verificable, y el
plan de implementación se estructura en esas mismas fases. Ninguna fase deja el
repositorio en un estado que no compile.

1. **`main`, trabajo común.** Harness, `KhipuOptionsMapper` con sus tests, fix
   de `web.ts`, tests de iOS reales, README reestructurado. Sin tocar versiones
   de Capacitor.
2. **`2.11.2`, desde el tag `v2.11.1`.** Solo el bump del podspec a
   `KhipuClientIOS 2.16.5` y la nota de fin de soporte para Capacitor 5/6 en el
   README. Mínimo y de bajo riesgo. Publicar y congelar la línea.
3. **`main` a Capacitor 7.** Correr `plugin-migration-v6-to-v7`, revisar el
   diff, crear `Package.swift` con `.iOS(.v14)`, actualizar el podspec, mover la
   app de ejemplo a Capacitor 7 con CocoaPods. Verificar. **Cortar el branch
   `7.x`** desde ahí y publicar `3.0.0` con dist-tag `cap7`.
4. **`main` a Capacitor 8.** Correr `plugin-migration-v7-to-v8`, subir
   `Package.swift` a `.iOS(.v15)` y `capacitor-swift-pm` a `from: "8.0.0"`,
   actualizar el podspec a `15.0`, regenerar `example/ios` con
   `npx cap add ios --packagemanager SPM`. Verificar. Publicar `4.0.0`.
5. **CI en ambos branches.**

## Riesgos

- **Compatibilidad de `khipu-client-android 2.27.0` con Kotlin 2.2.20.**
  Capacitor 8 pide Kotlin 2.2.20 en la app del comercio, y
  `khipu-client-android` usa Jetpack Compose, cuyo compilador va atado a la
  versión de Kotlin. **No pude verificar si 2.27.0 es compatible con Kotlin
  2.2.20.** Hay que confirmarlo con el equipo del SDK de Android antes de
  publicar `4.0.0`; si no lo es, la línea de Capacitor 8 queda bloqueada
  esperando un release de `khipu-client-android`.
- **Recursos de `KhipuClientIOS` bajo SPM.** Su `Package.swift` declara
  `resources: [.process("Assets")]`, lo que genera un resource bundle. La carga
  de esos recursos dentro de una app de Capacitor construida con SPM solo se
  puede verificar corriendo la app de ejemplo en un dispositivo o simulador, no
  con un build a secas.
- **Bug abierto de Capacitor 8 con SPM.** El issue
  `ionic-team/capacitor#8325` reporta que `CapApp-SPM` se genera pero los
  productos de los plugins no quedan expuestos en Xcode. Hay que revisar si nos
  afecta durante la implementación.
- **Fijación exacta de `KhipuClientIOS`.** Produce un conflicto duro de
  resolución si la app del comercio declara la misma dependencia en otra
  versión. Es una consecuencia aceptada de mantener CocoaPods y SPM alineados.
- **Divergencia entre branches.** Dos líneas sin CI serían insostenibles; por
  eso el CI es parte del alcance y no un extra.

## Fuera de alcance

- Implementar en `src/web.ts` los flags que hoy ignora. Se documenta, no se
  arregla: requiere verificar antes qué soporta realmente `kws.js` y es un
  proyecto propio.
- Publicar el podspec en el trunk de CocoaPods. El plugin se consume por
  `:path` desde el CLI de Capacitor, no desde el trunk.
- Capacitor 9, que sigue en alpha (`9.0.0-alpha.6`).
- Subir `khipu-client-android`: ya está en la última versión, 2.27.0.
- Limpiar el patrón `Objects.requireNonNull` / `assert` de `KhipuPlugin.java`.
