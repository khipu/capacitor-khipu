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

Add `LSApplicationQueriesSchemes` to your app's `Info.plist`, at `ios/App/App/Info.plist`
in a standard Capacitor project. It is a top-level key inside the root `<dict>`,
alongside the keys Capacitor already put there:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
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
  <!-- ...the rest of Capacitor's own keys (CFBundleName, UILaunchStoryboardName, etc.)... -->
</dict>
</plist>
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

The plugin exports a single object, `Khipu`. The only thing you have to pass is the
operation id:

```typescript
import { Khipu } from 'capacitor-khipu';

const result = await Khipu.startOperation({ operationId: '<the operation id>' });
```

To customize the presentation, pass `options`:

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

## Behaviour changes in 5.0.0

- **Breaking, iOS only: `exitUrl`, `continueUrl` and `failureReason` are now omitted
  when the SDK has no value for them, instead of arriving as JSON `null`.** Android
  already omitted them, and `KhipuResult` has always declared the three as
  `string | undefined` — which `null` does not satisfy — so iOS was the side that
  disagreed with both the other platform and the published type. The cause was a
  `result.exitUrl as Any` cast: an empty Swift optional cast to `Any` is not nil, so
  the key got written and the bridge serialised it as `null`. That cast had been there
  since the plugin's first release.

  What breaks: `'continueUrl' in result`, `result.continueUrl === null`,
  `Object.keys(result)` and `JSON.stringify(result)` all change on iOS. **TypeScript
  will not find these for you** — `=== null` compiles cleanly against
  `string | undefined` — so grep for them rather than trusting a green build.

  What starts working: `const { continueUrl = fallback } = result` applies the default
  on iOS now. Defaults only fire on `undefined`, so the `null` silently defeated them
  while Android honoured them.

  Reading with truthiness (`if (result.continueUrl)`) or `??` was correct before and is
  correct now, on all platforms.

- **Android now refuses a second, concurrent `startOperation` call instead of hanging
  forever**, rejecting it with `'OPERATION_IN_PROGRESS'`. **iOS and web do not currently
  guard against this: a second call proceeds** — iOS opens another payment flow, and web
  re-mounts into the same root. If your app could call `startOperation` twice before the
  first call resolves, add handling for the Android rejection, and on iOS and web avoid
  triggering the second call from your own code until this is addressed. Error codes are
  Android-only (`'INVALID_OPTIONS'`, `'OPERATION_IN_PROGRESS'`, `'LAUNCH_FAILED'`,
  `'NO_RESULT'`), and only `'OPERATION_IN_PROGRESS'` signals this concurrency rejection —
  the other three come from unrelated failures (bad options, the native activity failing
  to launch, or returning with no result). iOS rejects without a code and web rejects a
  bare `Error`, so don't branch on `error.code` cross-platform.
- **An absent `theme` on web now follows the device's own setting**, matching iOS and
  Android, instead of always falling back to light. If your web users are on a device
  set to dark mode and you did not send `theme` explicitly, the payment screen now
  renders differently than it did before.
- **On iOS, a payer who denies the location permission no longer has the operation
  ended and returned to your app.** The payment now continues instead, matching
  Android's existing behaviour. If you relied on that denial ending the flow early on
  iOS — for example treating "returned unexpectedly" as an implicit cancellation — that
  no longer happens: expect the operation to keep running to a normal result instead of
  an early return.
- **An absent `failureReason` is no longer a rare edge.** Both native SDKs now reach it
  on the same ordinary path: a terminal protocol message neither can decode, which
  Android `2.28.4` and iOS `2.17.1` each stop mislabeling and instead leave unset. With
  the iOS change above, "unset" finally means the same thing on both — the key is
  absent, and `result.failureReason` is `undefined`. Expect to hit it, and read it with
  truthiness or `??`.

## API

<docgen-index>

* [`startOperation(...)`](#startoperation)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

The plugin's single entry point: opens the Khipu payment flow and waits for it to
finish.

### startOperation(...)

```typescript
startOperation(options: StartOperationOptions) => Promise<KhipuResult>
```

Opens the Khipu payment flow for an operation you already created through the
Khipu API, and resolves once the flow finishes.

A user who abandons the payment still resolves this promise: it comes back as
`result: 'OK'`, `'ERROR'`, `'WARNING'` or `'CONTINUE'` in every case. See
`KhipuResult.result` for what abandonment looks like.

Android refuses a second, concurrent call while the first is genuinely still in
flight, rejecting it with `'OPERATION_IN_PROGRESS'` instead of hanging or replacing
the first one — the first operation's screen is still on screen and will still
deliver a result to it, which could be a payment that went through. iOS and web do
not currently guard against this: a second call proceeds, opening another payment
flow on iOS or re-mounting into the same root on web.

Error codes are Android-only, from `KhipuPlugin.java`, and only
`'OPERATION_IN_PROGRESS'` signals this concurrency rejection. The other three come
from unrelated paths: `'INVALID_OPTIONS'` from a missing `operationId` or an
unreadable `options` object, `'LAUNCH_FAILED'` from the native activity failing to
launch, and `'NO_RESULT'` from the activity returning with no result. iOS rejects
with no code, and web rejects a bare `Error`. Do not write
`e.code === 'OPERATION_IN_PROGRESS'` and expect it to work on every platform.

| Param         | Type                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| **`options`** | <code><a href="#startoperationoptions">StartOperationOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#khipuresult">KhipuResult</a>&gt;</code>

--------------------


### Interfaces


#### KhipuResult

| Prop                | Type                                                    | Description                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`operationId`**   | <code>string</code>                                     | The operation id that was passed to `startOperation`.                                                                                                                                                                                                                                                                                                                                                              |
| **`exitTitle`**     | <code>string</code>                                     | Title of the closing screen the SDK already showed the payer (success, failure, warning, or continue). Confirmed on iOS, Android and web: all three set it from the same title the SDK's own screen displayed. Reuse it if you render your own screen instead of the SDK's.                                                                                                                                        |
| **`exitMessage`**   | <code>string</code>                                     | Body text of the closing screen the SDK already showed the payer, paired with `exitTitle`. Confirmed on iOS, Android and web. Reuse it if you render your own screen instead of the SDK's.                                                                                                                                                                                                                         |
| **`exitUrl`**       | <code>string</code>                                     | URL associated with the exit screen. Can come back empty on real payments, so check it before using it. When there is none, both native platforms omit the key, so it reads as `undefined`. Until 5.0.0 iOS sent an explicit JSON `null` instead — see the breaking change in the README.                                                                                                                          |
| **`result`**        | <code>'OK' \| 'ERROR' \| 'WARNING' \| 'CONTINUE'</code> | Outcome of the operation. A user who abandons the payment arrives here as `'ERROR'` with `failureReason: 'USER_CANCELED'` — not as a rejected promise.                                                                                                                                                                                                                                                             |
| **`failureReason`** | <code>string</code>                                     | Machine-readable reason behind the current `result`, straight from the Khipu protocol. Treat it as an open-ended string, not a fixed list: the protocol adds values over time — `USER_DISCONNECTED` is a recent one — and a hardcoded list here would go stale silently. When there is none, both native platforms omit the key, so it reads as `undefined`. Until 5.0.0 iOS sent an explicit JSON `null` instead. |
| **`continueUrl`**   | <code>string</code>                                     | URL to send the payer to so they can finish the operation. Present when, and only when, `result` is `'CONTINUE'` — confirmed on iOS, Android and web, where every other outcome branch leaves it `undefined`/`nil`. Undefined for every other `result` value. When there is none, both native platforms omit the key, so it reads as `undefined`. Until 5.0.0 iOS sent an explicit JSON `null` instead.            |
| **`events`**        | <code>KhipuEvent[]</code>                               | Events recorded during the operation, in the order the SDK reported them.                                                                                                                                                                                                                                                                                                                                          |


#### KhipuEvent

| Prop            | Type                | Description                                             |
| --------------- | ------------------- | ------------------------------------------------------- |
| **`name`**      | <code>string</code> | Name of the event, as reported by the native SDK.       |
| **`timestamp`** | <code>string</code> | When the event occurred, as reported by the native SDK. |
| **`type`**      | <code>string</code> | Category of the event, as reported by the native SDK.   |


#### StartOperationOptions

| Prop              | Type                                                  | Description                                                                                                                                                                                                                                |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`operationId`** | <code>string</code>                                   | The operation id returned by the Khipu API when you created the payment.                                                                                                                                                                   |
| **`options`**     | <code><a href="#khipuoptions">KhipuOptions</a></code> | Presentation options. Every key is optional, and leaving one out is not the same as sending it: an absent key lets the native SDK apply its own default. The whole object can be left out too; that is equivalent to sending an empty one. |


#### KhipuOptions

Presentation options for the payment screen. Every field is optional, and an absent
field is not the same as sending one: leaving a key out lets the platform apply its
own default instead of overriding it.

Web is more limited than the native SDKs: see each field below for whether web
reads it.

| Prop                      | Type                                                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`locale`**              | <code>string</code>                                 | BCP 47-ish locale for the payment screen, e.g. `es_CL`. The two native SDKs disagree on the default: iOS falls back to `es_CL` while Android follows the phone's language. Send it explicitly if you need the same language on both.                                                                                                                                                                                                                                                                                                                                                                                                  |
| **`title`**               | <code>string</code>                                 | Title shown on the payment screen in place of the SDK's own default. Native only. The web loader does not read this key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`titleImageUrl`**       | <code>string</code>                                 | URL of an image shown alongside the title. Native only. The web loader does not read this key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **`skipExitPage`**        | <code>boolean</code>                                | Skips the exit page normally shown at the end of the flow, whatever the outcome. Honored on web as well as on both native platforms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **`skipExitSuccessPage`** | <code>boolean</code>                                | Skips the success page at the end of the flow. Native only for now. The deployed web loader does not read this key yet; it is sent so it starts working when a later version does.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **`theme`**               | <code>'light' \| 'dark' \| 'system'</code>          | Color scheme for the payment screen. Leaving this out follows the device's own setting on all three platforms — the same as sending `'system'` explicitly. Say so plainly because it was not always true: web used to default to light regardless of the device, so the same payment could render light on web and dark on the phone with nothing in the merchant's code to explain it. On web, `'system'` is resolved locally via `prefers-color-scheme`, and the result then picks between `colors.lightPrimary` and `colors.darkPrimary` — the only two color overrides web applies. See <a href="#khipucolors">`KhipuColors`</a>. |
| **`colors`**              | <code><a href="#khipucolors">KhipuColors</a></code> | Color overrides for the payment screen, kept as separate light and dark palettes. Web only reads `lightPrimary` and `darkPrimary`; the other ten fields reach both native SDKs but have no effect on web.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **`showFooter`**          | <code>boolean</code>                                | Shows or hides the footer on the payment screen. Native only. The web loader does not read this key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **`showMerchantLogo`**    | <code>boolean</code>                                | Shows or hides the merchant logo on the payment screen. Native only. The web loader does not read this key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **`showPaymentDetails`**  | <code>boolean</code>                                | Shows or hides the payment details on the payment screen. Native only. The web loader does not read this key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |


#### KhipuColors

Color overrides for the payment screen, as two parallel palettes: `light*` fields
apply in light mode, `dark*` fields in dark mode. Each value is a color understood
by the native SDK you are targeting.

Web only reads `lightPrimary` and `darkPrimary` — see <a href="#khipuoptions">`KhipuOptions.theme`</a> for how
it picks between them. The other ten fields reach the native SDKs but have no
effect on web.

| Prop                         | Type                | Description                                                                                                                                          |
| ---------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`lightBackground`**        | <code>string</code> | Background color in light mode. Native only. The web loader does not read this key.                                                                  |
| **`lightOnBackground`**      | <code>string</code> | Color for content drawn over `lightBackground`. Native only. The web loader does not read this key.                                                  |
| **`lightPrimary`**           | <code>string</code> | Primary/accent color in light mode. Honored on web: applied when the resolved theme (see <a href="#khipuoptions">`KhipuOptions.theme`</a>) is light. |
| **`lightOnPrimary`**         | <code>string</code> | Color for content drawn over `lightPrimary`. Native only. The web loader does not read this key.                                                     |
| **`lightTopBarContainer`**   | <code>string</code> | Top bar background color in light mode. Native only. The web loader does not read this key.                                                          |
| **`lightOnTopBarContainer`** | <code>string</code> | Color for content drawn over `lightTopBarContainer`. Native only. The web loader does not read this key.                                             |
| **`darkBackground`**         | <code>string</code> | Background color in dark mode. Native only. The web loader does not read this key.                                                                   |
| **`darkOnBackground`**       | <code>string</code> | Color for content drawn over `darkBackground`. Native only. The web loader does not read this key.                                                   |
| **`darkPrimary`**            | <code>string</code> | Primary/accent color in dark mode. Honored on web: applied when the resolved theme (see <a href="#khipuoptions">`KhipuOptions.theme`</a>) is dark.   |
| **`darkOnPrimary`**          | <code>string</code> | Color for content drawn over `darkPrimary`. Native only. The web loader does not read this key.                                                      |
| **`darkTopBarContainer`**    | <code>string</code> | Top bar background color in dark mode. Native only. The web loader does not read this key.                                                           |
| **`darkOnTopBarContainer`**  | <code>string</code> | Color for content drawn over `darkTopBarContainer`. Native only. The web loader does not read this key.                                              |

</docgen-api>
