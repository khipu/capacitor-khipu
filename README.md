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
> | 5 and 6 | 2.11.2 | `npm install capacitor-khipu@cap6` | end of support |
>
> The 3.x and 4.x lines support both CocoaPods and Swift Package Manager.

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
