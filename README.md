# capacitor-khipu

Capacitor plugin for Khipu

> **End of support.** This line (`2.x`) is the last one supporting Capacitor 5 and 6,
> and will not receive further changes. Install it with
> `npm install capacitor-khipu@cap6`.
>
> | Capacitor | Plugin | Install with | Status |
> | --- | --- | --- | --- |
> | 8 | 4.x | `npm install capacitor-khipu` | maintained |
> | 7 | 3.x | `npm install capacitor-khipu@cap7` | maintained |
> | 5 and 6 | 2.11.3 | `npm install capacitor-khipu@cap6` | end of support |
>
> The 3.x and 4.x lines support both CocoaPods and Swift Package Manager.

## Install

```bash
npm install capacitor-khipu@cap6
npx cap sync
```

The `@cap6` tag is not optional. `npm install capacitor-khipu` resolves to `latest`,
which is the Capacitor 8 line and will fail to install next to Capacitor 5 or 6 with an
`ERESOLVE` error.

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

**On this line you do need the Kotlin Gradle plugin**, even if your app is plain Java.
Add it to `android/build.gradle`:

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

**Use 2.0.21 or newer.** Kotlin 1.9.0 fails outright under JDK 21 with
`Unknown Kotlin JVM target: 21`, and even where it configures it cannot read the 2.0
metadata that `khipu-client-android` is compiled with.

Without the plugin your build fails with hundreds of `Duplicate class
androidx.compose.ui.*` errors. The reason is that `androidx.compose.ui:ui` is a
multiplatform module: nothing requests the `org.jetbrains.kotlin.platform.type`
attribute unless the Kotlin plugin is applied, so Gradle resolves the `jvmstubs`
variant while other paths pull `ui-android`, and the two collide.

This is really about the Android Gradle Plugin, not about Capacitor. AGP 8.7 and newer
request that attribute on their own, and Capacitor 6 defaults to AGP 8.2.1. If you have
already moved your app to AGP 8.7 or newer you can skip the Kotlin plugin. Both paths
are verified on a Capacitor 6 app built from scratch:

| AGP | Kotlin plugin | Result |
| --- | --- | --- |
| 8.2.1 (Capacitor 6 default) | none | fails, duplicate Compose classes |
| 8.2.1 | 1.9.0 | fails, `Unknown Kotlin JVM target: 21` |
| 8.2.1 | 2.0.21 | builds |
| 8.7.2 | none | builds |

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
actually want to override.

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
