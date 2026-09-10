# Status

**Last updated:** 2026-09-05 — all three lines are published to npm.

This is the entry point for picking up plugin work without prior context. The design
and plan for work currently in progress live under `docs/superpowers/`.

## Published lines

The iOS SDK moved from CocoaPods to Swift Package Manager, and the plugin split from a
single Capacitor 5 target into three lines: two maintained, one frozen.

| Line | Branch        | Capacitor | iOS min | dist-tag | Version  |
| ---- | ------------- | --------- | ------- | -------- | -------- |
| 4.x  | `main`        | 8         | 15      | `latest` | `4.0.0`  |
| 3.x  | `7.x`         | 7         | 14      | `cap7`   | `3.0.0`  |
| 2.x  | `release/2.x` | 5 and 6   | 13      | `cap6`   | `2.11.3` |

**Both maintained lines expose `Package.swift` and `CapacitorKhipu.podspec`**, so a
merchant can install via SPM or CocoaPods on either one. The `2.x` line ships no
`Package.swift`: it stays CocoaPods-only, because Capacitor 6's own guide calls its SPM
support experimental, and the `capacitor-swift-pm` package that would be required
conflicts on resolution. Between the two maintained lines, what differs is which package
manager each line's example app demonstrates: `7.x` uses CocoaPods (Capacitor 7's
default) and `main` uses SPM (Capacitor 8's default), so together they exercise both
paths against real builds.

All three lines are published to npm, as of 2026-09-05, with these dist-tags:

```
{ latest: '4.0.0', cap6: '2.11.3', cap7: '3.0.0' }
```

## Defects fixed that reached merchants in production

1. **Crash from `as!`** in iOS option mapping: a `title: 123` sent from JS crashed the
   app mid-payment. The wrong-typed value is now discarded instead of crashing. Covered
   by `testDiscardsWrongTypedValuesInsteadOfCrashing`.
2. **The payment screen never appeared** when the merchant already had its own modal on
   screen: UIKit refuses to present over a controller that is already presenting. Added
   `KhipuPlugin.topMost(from:)`, which walks the presentation chain.
3. **The web layer's timeout never fired**: `KWS_TIMEOUT` and `KHIPU_WEB_ROOT` were
   declared with `:` instead of `=` — type annotations with no initializer — so they
   were `undefined` at runtime.
4. **The README was wrong on three points**, each with a real consequence: it said iOS
   needs no configuration (without `LSApplicationQueriesSchemes` the SDK silently skips
   opening the bank app, **with no error**, so 2FA never happens); it asked for
   `kotlin-gradle-plugin:1.9.0` when the Android SDK is built with Kotlin 2.0.21 (a
   merchant with their own Kotlin sources fails to compile); and it carried no
   compatibility matrix, so after `4.0.0` shipped, a merchant on Capacitor 7 would hit
   an unexplained `ERESOLVE` with no hint that `@cap7` exists.
5. **`npm run verify:android` could never work**: the plugin's `android/build.gradle`
   did not declare the Maven repository that hosts `com.khipu:khipu-client-android`,
   which is not on Maven Central.

## What was built

- A **test harness** in `example/`, exercising all 21 `KhipuOptions` fields with
  **per-field tri-state**: an "include" toggle distinguishes "key not sent" from "key
  sent with a value" — the same distinction the native SDKs make, and without it their
  default behaviour cannot be tested.
- **46 tests** where before there were zero for JS and two broken for iOS: 30 JS/TS and
  guard tests (Vitest), 16 iOS (XCTest).
- **Two synchronisation guards** in `scripts/`, protecting invariants nothing else
  watches: that `KhipuClientIOS` stays in sync between `Package.swift` and the podspec,
  and that the option vocabulary does not drift across its four surfaces
  (`src/definitions.ts`, the Swift mapper, the Java plugin, and the harness catalogue).
  Both guards have tests for their failure path, not only their success path.
- **CI on GitHub Actions**, the repository's first, running on `main` and `7.x`.

## Verified on device

|                                  | Line 7 (CocoaPods)             | Line 8 (SPM)            |
| -------------------------------- | ------------------------------ | ----------------------- |
| iOS: native install              | `pod install`, confirmed       | `CapApp-SPM`, confirmed |
| iOS: SDK resource bundle         | confirmed                      | confirmed               |
| iOS: `title` and brand colours   | confirmed                      | confirmed               |
| iOS: dark theme and `showFooter` | not tested                     | confirmed               |
| Android: builds and renders      | confirmed                      | confirmed               |
| SDK confirmed at runtime         | iOS `2.16.5`, Android `2.27.0` | iOS `2.16.5`            |

The biggest risk going in — that SDK resources would fail to load when built by SPM
instead of CocoaPods — **is resolved**: the bundle changes name and location depending
on the package manager (`KhipuClientIOS.bundle` inside the framework under CocoaPods,
`KhipuClientIOS_KhipuClientIOS.bundle` at the app root under SPM), and the logo and
fonts load correctly either way.

## Verification with apps built from scratch

After publishing, three empty apps were built, one per major version. Each installed
the plugin using the command its own README gives, following **only** the published
documentation — nothing known from inside the repo. All six combinations reached the
payment screen with a real `operationId`.

|                  | iOS                  | Android                     |
| ---------------- | -------------------- | --------------------------- |
| Cap 6 (`@cap6`)  | `v2.16.5`, CocoaPods | `v2.27.0`, **needs Kotlin** |
| Cap 7 (`@cap7`)  | `v2.16.5`, CocoaPods | `v2.27.0`, no Kotlin needed |
| Cap 8 (`latest`) | `v2.16.5`, **SPM**   | `v2.27.0`, no Kotlin needed |

The apps were deleted once the exercise was done. To repeat it for the next release,
with `<N>` the Capacitor major version:

```bash
mkdir doctest-cap<N> && cd doctest-cap<N>
npm init -y
npm i @capacitor/core@^<N> && npm i -D @capacitor/cli@^<N> esbuild
npx cap init "Doctest Cap<N>" com.khipu.doctest.cap<N> --web-dir=www
npm i @capacitor/ios@^<N> @capacitor/android@^<N>
npm install capacitor-khipu@<dist-tag>     # exactly the command the README gives
npx cap add ios && npx cap add android
```

Then a minimal page calling `Khipu.startOperation({operationId, options})`, bundled
with esbuild because the import does not work without a bundler, and **only** the setup
steps the README calls for: the `LSApplicationQueriesSchemes` in `Info.plist` and the
khenshin Maven repository in `allprojects`. Anything that turns out to be needed and is
not written down is the finding.

Two practical notes: use Node 22, since Homebrew's Node 26 builds a different
dependency tree; and point `xcodebuild` at the simulator **by UDID**, not by name, which
is ambiguous once several runtimes are installed.

All three documented install commands resolved correctly, checked against the
registry: `@cap6` to `2.11.3`, `@cap7` to `3.0.0`, bare to `4.0.0`. And the `7.x`
README's warning holds up: the bare install command in a Capacitor 7 app fails with
`ERESOLVE ... peer @capacitor/core@">=8.0.0" from capacitor-khipu@4.0.0`.

**The finding this exercise uncovered, that no test in the repo could have uncovered:**
the Kotlin plugin **is** required on Capacitor 6. The README said it was not, and that
claim had been written by looking at the repo's own example apps, which are Capacitor 7
and 8. Measured on the from-scratch Cap 6 app:

| AGP                   | Kotlin plugin                    | Result                                                     |
| --------------------- | -------------------------------- | ---------------------------------------------------------- |
| 8.2.1 (Cap 6 default) | none                             | fails: hundreds of `Duplicate class androidx.compose.ui.*` |
| 8.2.1                 | 1.9.0 (what docs.khipu.com said) | fails: `Unknown Kotlin JVM target: 21`                     |
| 8.2.1                 | 2.0.21                           | builds                                                     |
| 8.7.2                 | none                             | builds                                                     |

`androidx.compose.ui:ui` is multiplatform: something has to request the
`org.jetbrains.kotlin.platform.type` attribute, or Gradle resolves the `jvmstubs`
variant and it collides with `ui-android`. The Kotlin plugin requests it; so does AGP
8.7 and later. **The axis is AGP, not the Capacitor major version** — Capacitor 6 ships
AGP 8.2.1, while 7 ships 8.7.2 and 8 ships 8.13.0. Fixed in all three lines' READMEs,
and `2.11.3` was published specifically for this.

The exercise also reproduced, outside the harness, the `locale` divergence: the same
operation with no `locale` came up in Spanish on iOS and in English on Android.

## Cross-SDK finding to report upstream

**The two native SDKs disagree on the `locale` default.** When the merchant does not
send the key:

```
iOS      KhipuOptions.swift:70   var _locale: String = "es_CL"
Android  KhipuOptions.kt:39      var locale: String? = null
```

So iOS forces Chilean Spanish, while Android follows the phone's language. This was
observed with the same operation and the same payload: the screen came up in Spanish on
iOS and in English on Android, with the emulator set to English. This is not a plugin
defect — the mapper omits the key correctly — but an inconsistency between the SDKs, and
it is worth reporting to those teams.

It surfaced **thanks to the harness's tri-state fields**: if the example always sent
`es_CL`, as the previous one did with everything hardcoded, both sides would have
looked the same and the difference would have stayed hidden until a merchant reported
it.

## Known pending

- **Measure what Capacitor's iOS bridge does with `nil as Any`.** `KhipuPlugin.swift`
  resolves absent values that way. Android omits the key entirely. Until this is
  measured on a device we do not know whether the two platforms already agree, so the
  canonical shape of an absent result field is undecided. See section C5 of the
  hardening spec.
- **The AAR injects location permissions.** Its manifest declares `INTERNET`,
  `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`, and the merger puts all three
  into every merchant app. Merchants publishing to Play must declare location use in
  their data safety form. Documenting it in the README was considered and deliberately
  left out of the hardening pass; it wants a channel to the Android SDK team.
- **An unknown enum value from the protocol can crash the whole process** — tracked as
  [IKW-1232](https://khipucom.atlassian.net/browse/IKW-1232), the single ticket all four
  bridge repositories reference. On a failure event the SDK threw
  `JsonMappingException: Cannot deserialize FailureReasonType` inside
  `com.khipu.khenshin.protocol.Converter`, on socket.io's `EventThread`, uncaught: the
  process died, and a dead process cannot resolve or reject anything.

  Status, in three parts, because they resolve at different speeds:
  - _The value that was hit_ is covered. Protocol `1.0.60` adds `USER_DISCONNECTED` and
    `forValue` recognises it.
  - _The mechanism_ is fixed under IKW-1232, which wraps the SDK's 23 socket listeners
    so a throwing handler never reaches the event thread. Expected as a patch release
    after `2.28.0`. Two consequences reach us and both are already handled: a terminal
    message that fails to parse ends the operation with no `failureReason` (our result
    reader omits null keys, and a test asserts it), and a non-terminal failure leaves
    the operation genuinely in flight with the payer's only exit being to cancel.
  - _The deserialisation itself_ is not hardened. Verified against protocol `1.0.60`:
    `forValue` declares `throws IOException`, there is `@JsonValue` and `@JsonCreator`
    but no `@JsonEnumDefaultValue`, the converter configures only
    `FAIL_ON_UNKNOWN_PROPERTIES`, and it is 8 of 8 enums with that pattern. Making
    unknown values degrade instead of throwing is a proposal in the ticket, in another
    repository, neither decided nor prioritised. **Assume it never arrives.**

  A bridge reading only the middle bullet may conclude it needs its own timeout. It does
  not: a timeout over a payment operation that is still alive is worse than the problem.

- **Verify dark mode colour mapping on Android**, and **compare `KhipuResult` fields
  between iOS and Android** on the same operation.
- **Exercise `canOpenURL` on a physical device** with a bank app installed. The nine
  `LSApplicationQueriesSchemes` are still verified only as a declaration.
- **`exitUrl` shipped mistyped in `2.11.2` and `2.11.3`** (`string` instead of
  `string | undefined`). It stays that way **on purpose**: fixing it would break
  compilation for merchants who already read the field without a guard, and that line
  is frozen. Both maintained lines have had the correct type since `48aabf7`. Without
  this reason on record, someone "fixes" it in a year and breaks merchants in
  production.
- **The `@typescript-eslint` warning** about parsing TypeScript 5.9.3 outside its
  officially supported range (`<5.2.0`). Accepted on purpose: it is exactly the stack
  the official Capacitor 8 plugins run on — `@ionic/eslint-config@0.4.0` is the latest
  release and pins `^5.58` — and stepping off it means maintaining a custom eslint
  config. Without the reason on record, someone reopens this from scratch.
- **A latent `merge()` bug in `example/src/js/storage.js`**: the `colors` guard
  operates on the whole object, so a `stored.colors = {}` would overwrite
  `colors.include` with `false`. Latent, no impact under real-world use, and it only
  affects the harness. A known defect nobody has fixed yet, and those get recorded.
