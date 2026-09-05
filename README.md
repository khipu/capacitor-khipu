# capacitor-khipu

Capacitor plugin for Khipu

## Compatibilidad

| Capacitor | Plugin | Se instala con | iOS mínimo | minSdk | Estado |
| --- | --- | --- | --- | --- | --- |
| 8 | 4.x | `npm install capacitor-khipu` | 15 | 24 | mantenida |
| 7 | 3.x | `npm install capacitor-khipu@cap7` | 14 | 23 | mantenida |
| 5 y 6 | 2.11.2 | `npm install capacitor-khipu@cap6` | 13 | 22 | fin de soporte |

Las líneas 3.x y 4.x soportan **CocoaPods y Swift Package Manager**. No hace falta
ningún paso extra: el CLI de Capacitor usa el `Package.swift` o el
`CapacitorKhipu.podspec` según el gestor que use tu app. Los dos gestores no pueden
coexistir en un mismo proyecto iOS.

## Install

```bash
npm install capacitor-khipu
npx cap sync
```

## iOS setup

The Khipu SDK opens the user's bank app to complete two-factor authorization. iOS
only allows an app to check whether it can open another app's URL scheme
(`canOpenURL`) if that scheme is declared in advance. Without this, `canOpenURL`
returns `false`, the SDK silently skips opening the bank app **without raising any
error**, and the two-factor authorization step simply never happens.

Add `LSApplicationQueriesSchemes` to your app's `Info.plist`:

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

This is already applied as a reference in `example/ios/App/App/Info.plist`.

## Android setup

### Main Khipu repository

For Android to be able to locate the khenshin aar you need to add the maven repository of khenshin to the allproyects section of the android/build.gradle file.

Something like:

```
allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url 'https://dev.khipu.com/nexus/content/repositories/khenshin' }
    }
}
```

Note that google() and mavenCentral() repos are usually already added.

### Kotlin

**You do not need to add Kotlin to your app for Khipu.** The Android SDK ships its
Jetpack Compose UI already compiled inside the AAR, and the Compose runtime arrives as
a transitive dependency, so a plain Java Capacitor app consumes it without applying the
Kotlin Gradle plugin.

Verified on the example app in this repo, which has no Kotlin plugin: it assembles and
the payment screen renders on both Capacitor 7 and Capacitor 8.

**If your app already uses Kotlin** for its own reasons, use **2.0.21 or newer**.
`khipu-client-android` is compiled with Kotlin 2.0.21, and a Kotlin 1.9 compiler cannot
read 2.0 metadata — your build will fail with a version error when your own Kotlin
sources resolve against the SDK's classpath.

## API

<docgen-index>

* [`startOperation(...)`](#startoperation)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### startOperation(...)

```typescript
startOperation(options: StartOperationOptions) => Promise<KhipuResult>
```

| Param         | Type                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| **`options`** | <code><a href="#startoperationoptions">StartOperationOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#khipuresult">KhipuResult</a>&gt;</code>

--------------------


### Interfaces


#### KhipuResult

| Prop                | Type                                                    |
| ------------------- | ------------------------------------------------------- |
| **`operationId`**   | <code>string</code>                                     |
| **`exitTitle`**     | <code>string</code>                                     |
| **`exitMessage`**   | <code>string</code>                                     |
| **`exitUrl`**       | <code>string</code>                                     |
| **`result`**        | <code>'OK' \| 'ERROR' \| 'WARNING' \| 'CONTINUE'</code> |
| **`failureReason`** | <code>string</code>                                     |
| **`continueUrl`**   | <code>string</code>                                     |
| **`events`**        | <code>KhipuEvent[]</code>                               |


#### KhipuEvent

| Prop            | Type                |
| --------------- | ------------------- |
| **`name`**      | <code>string</code> |
| **`timestamp`** | <code>string</code> |
| **`type`**      | <code>string</code> |


#### StartOperationOptions

| Prop              | Type                                                  |
| ----------------- | ----------------------------------------------------- |
| **`operationId`** | <code>string</code>                                   |
| **`options`**     | <code><a href="#khipuoptions">KhipuOptions</a></code> |


#### KhipuOptions

| Prop                      | Type                                                |
| ------------------------- | --------------------------------------------------- |
| **`locale`**              | <code>string</code>                                 |
| **`title`**               | <code>string</code>                                 |
| **`titleImageUrl`**       | <code>string</code>                                 |
| **`skipExitPage`**        | <code>boolean</code>                                |
| **`skipExitSuccessPage`** | <code>boolean</code>                                |
| **`theme`**               | <code>'light' \| 'dark' \| 'system'</code>          |
| **`colors`**              | <code><a href="#khipucolors">KhipuColors</a></code> |
| **`showFooter`**          | <code>boolean</code>                                |
| **`showMerchantLogo`**    | <code>boolean</code>                                |
| **`showPaymentDetails`**  | <code>boolean</code>                                |


#### KhipuColors

| Prop                         | Type                |
| ---------------------------- | ------------------- |
| **`lightBackground`**        | <code>string</code> |
| **`lightOnBackground`**      | <code>string</code> |
| **`lightPrimary`**           | <code>string</code> |
| **`lightOnPrimary`**         | <code>string</code> |
| **`lightTopBarContainer`**   | <code>string</code> |
| **`lightOnTopBarContainer`** | <code>string</code> |
| **`darkBackground`**         | <code>string</code> |
| **`darkOnBackground`**       | <code>string</code> |
| **`darkPrimary`**            | <code>string</code> |
| **`darkOnPrimary`**          | <code>string</code> |
| **`darkTopBarContainer`**    | <code>string</code> |
| **`darkOnTopBarContainer`**  | <code>string</code> |

</docgen-api>
