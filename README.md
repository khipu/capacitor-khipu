# capacitor-khipu

Capacitor plugin for Khipu

## Compatibility

| Capacitor | Plugin | Install with | Minimum iOS | minSdk | Status |
| --- | --- | --- | --- | --- | --- |
| 8 | 4.x | `npm install capacitor-khipu` | 15 | 24 | maintained |
| 7 | 3.x | `npm install capacitor-khipu@cap7` | 14 | 23 | maintained |
| 5 and 6 | 2.11.3 | `npm install capacitor-khipu@cap6` | 13 | 22 | end of support |

The 3.x and 4.x lines support **both CocoaPods and Swift Package Manager**, with no
extra steps on your side: the Capacitor CLI picks the `Package.swift` or the
`CapacitorKhipu.podspec` depending on which manager your app uses. The two managers
cannot coexist in the same iOS project.

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
Kotlin Gradle plugin. Verified on a Capacitor 8 app built from scratch: AGP 8.13.0
with no Kotlin plugin assembles, and the payment screen renders.

What decides this is the Android Gradle Plugin, not Capacitor. `androidx.compose.ui:ui`
is a multiplatform module, and something has to request the
`org.jetbrains.kotlin.platform.type` attribute or Gradle resolves its `jvmstubs`
variant and collides with the `ui-android` one that other paths pull, leaving you with
hundreds of `Duplicate class androidx.compose.ui.*` errors. AGP 8.7 and newer request
that attribute on their own; AGP 8.2 does not. Capacitor 8 defaults to AGP 8.13.0.

**If you have pinned an older AGP**, add the Kotlin Gradle plugin to
`android/build.gradle`:

```gradle
buildscript {
    dependencies {
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21'
    }
}
```

and apply it in `android/app/build.gradle`:

```gradle
apply plugin: 'org.jetbrains.kotlin.android'
```

That is exactly what a Capacitor 6 app needs on AGP 8.2.1, and it is the same fix here.

**Use Kotlin 2.0.21 or newer**, whether you are adding the plugin for the reason above
or because your app already uses Kotlin. `khipu-client-android` is compiled with
2.0.21: a 1.9 compiler cannot read 2.0 metadata, and under JDK 21 Kotlin 1.9.0 does not
even configure, failing with `Unknown Kotlin JVM target: 21`.

## Usage

The plugin exports a single object, `Khipu`:

```typescript
import { Khipu } from 'capacitor-khipu';
import type { KhipuResult } from 'capacitor-khipu';

const result: KhipuResult = await Khipu.startOperation({
  operationId: '<the operation id you got from the Khipu API>',
  options: {
    title: 'My store',
    theme: 'system',
  },
});

if (result.result === 'OK') {
  // payment completed
}
```

Every key inside `options` is optional, and leaving one out is not the same as sending
it: when the key is absent the native SDK applies its own default. Only send what you
actually want to override — and note that the defaults are not identical across
platforms. `locale` is the one to watch: iOS falls back to `es_CL` while Android
follows the phone's language, so the same payment can come up in different languages
unless you send `locale` explicitly.

`result.exitUrl` can come back empty on real payments, so check it before using it.

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
