# Status

**Last updated:** 2026-09-11 — `plugin-hardening` branch, Android SDK bumped to
`2.28.4`, local verification complete, CI pending a push.

This is the entry point for picking up plugin work without prior context. The design
and plan for a pass in progress are kept next to it while it is being worked, and are
not retained once it lands — this document, not those files, is the durable record.

## Plugin hardening pass (`plugin-hardening` branch, not yet pushed)

Twelve tasks changed TypeScript, Swift, Java, the three guard scripts, the podspec and CI.
What landed:

- **The contract is now optional and documented**: `KhipuOptions` fields that a merchant
  omits are treated deliberately rather than by accident, and the behaviour is written
  down rather than left to be discovered.
- **The README is held to the compiler**: `verify:readme` extracts every TypeScript
  block from `README.md` and compiles it against `src/index.ts` with
  `exactOptionalPropertyTypes`, so a README example that would not actually compile for
  a merchant fails the build instead of shipping.
- **The web layer loads on demand and always settles**: the Khipu web SDK script is
  fetched lazily rather than bundled, and the promise it returns resolves or rejects in
  every path, including the ones that previously left a caller hanging.
- **Android has a tested mapper and result reader**, and **refuses a concurrent
  operation** instead of leaving a second call to interfere with one already in flight.
- **The Android SDK moved to `2.28.3`, then to `2.28.4`** (`com.khipu:khipu-client-android`).
  `2.28.3` fixed a defect in `2.28.1`: the socket guard's terminal-type list omitted
  `OPERATION_WARNING`, even though `OPERATION_WARNING` has its own handler that finishes
  the operation exactly like the three types the guard did list; `2.28.3` adds it. That
  fix was about a *decodable* `OPERATION_WARNING` being tracked correctly — it did
  nothing for an *undecodable* message of any terminal type, which still left the call
  in flight indefinitely in `2.28.3` exactly as in `2.28.1`. This document briefly
  recorded that hang as closed by `2.28.3`; it was not, and the item was reopened once
  the SDK source made that clear. **`2.28.4` closes it for real**: on an undecodable
  terminal message the socket guard now calls `returnToApp()` instead of leaving it
  unhandled, and `buildResult` has a branch for the unprocessable case, so the
  `PluginCall` resolves instead of hanging — see the `IKW-1232` entry below for exactly
  what the merchant now receives. **The iOS SDK moved to `KhipuClientIOS 2.16.6`**, in
  sync across `Package.swift` and the podspec, fixing a socket frame that could kill the
  merchant's app and a terminal-message parse failure that left the payer with no exit
  while the merchant got no callback; it also pins Starscream, closing a CocoaPods/SPM
  resolution divergence that matters here because this plugin ships both managers.
  `KhipuClientIOS 2.17.0` is now published but not taken — see "Known pending".
- **The vocabulary guard (`verify:keys`) now covers the web surface and both platforms'
  return path**, not just the options each platform reads: it checks `src/web.ts`
  against `src/definitions.ts`, and checks the result fields both the iOS and Android
  plugins emit against the same contract.

**Local verification for this branch is complete; CI has not run on it.** `npm run
verify` passes end to end: 55 Vitest tests, the versions guard, the keys guard, the
readme guard, `xcodebuild build`, `./gradlew clean build test` (24 JUnit tests, all
passing), and `npm run build`.

`npm run lint` first **failed** at the `prettier --check` stage, on
`android/src/test/java/com/khipu/capacitor/KhipuOptionsMapperTest.java`, formatting
drift introduced in `d1c8c5d` (Task 8, round 4) that no later round of that task's
review caught because none of them re-ran `npm run lint` after the file's last edit, and
the pre-commit hook didn't catch it either. This was not cosmetic: CI's `web` job runs
`npm run prettier -- --check` directly, so the branch could not have merged without it
failing there. **Fixed** with `npm run prettier -- --write` on that one file — diff
confirmed to be whitespace/line-wrapping only, no assertion, value, or ordering changed
— and the 24 Android JUnit tests re-run clean afterward, `mapsTheTwelveColors` included.

With that fixed, `npm run lint` now **passes end to end**, including reaching the
SwiftLint stage for the first time in this pass — reaching it is not the same as it
having checked anything. `node-swiftlint` prints, verbatim:

```
!!! WARN: SwiftLint not found in PATH. You can install it with Homebrew:

    > brew install swiftlint
```

and exits 0 without linting a single line of Swift, because the binary is absent on
this machine — the exact failure mode `.github/workflows/ci.yml` documents and guards
against by checking for the binary separately in the `ios` job. **A green `npm run
lint` on this machine is not evidence the Swift is clean** — nothing has reviewed it.
Swift lint coverage for this branch comes from CI only.

**The version to publish is `4.1.0`.** Publishing is not done here: `npm publish` needs
a human with 2FA, and pushing the branch (or opening the PR, or merging) is the user's
call, not something run as part of this pass.

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
- **95 tests** where before there were zero for JS and two broken for iOS: 55 JS/TS and
  guard tests (Vitest), 24 Android (JUnit), 16 iOS (XCTest).
- **Three guards** in `scripts/`, protecting invariants nothing else watches: that
  `KhipuClientIOS` stays in sync between `Package.swift` and the podspec; that every
  TypeScript block in `README.md` still compiles against `src/index.ts`; and that the
  option and result vocabulary does not drift, checked as ten surface checks across
  seven files — `src/definitions.ts` against the Swift options mapper, against
  `KhipuOptionsMapper.java` (not `KhipuPlugin.java`, which holds no option key at all),
  against the harness catalogue, and against `src/web.ts`, plus the two result builders,
  `KhipuPlugin.swift` and `KhipuResultReader.java`, checked back against the same
  contract. All three guards have tests for their failure path, not only their success
  path.
- **CI on GitHub Actions**, the repository's first, running on `main` and `7.x`.

## CI operational notes

CI's first run, on 2026-09-05, failed on **both** maintained lines from the same cause:
`package.json` and `package-lock.json` were out of sync for the runner's npm. The lock
had been generated with npm 11.16 under Node 26, and CI runs Node 22, whose npm resolves
a different dependency tree; `npm ci` is strict about that mismatch and fails, while a
local `npm install` doesn't notice it.

**Rule: regenerate any lockfile in this repo with
`~/.nvm/versions/node/v22.23.2/bin/npm install`, not Homebrew's Node.** And do it per
line, not once — the fix is **not cherry-pickable** between lines: `main` and `7.x`
have different dependency trees, so each branch that touches its lockfile needs its own
regeneration with the Node 22 npm.

Separately, if the iOS job's simulator destination ever becomes ambiguous: pin the
runner's actual runtime version. `OS=latest` does not work — `xcodebuild` rejects it,
confirmed when this was investigated.

### Verifying a check, before trusting it

Six checks in this project reported green while measuring nothing, in a single day of
work across the four bridge repositories. Every one had the same shape: the method could
not distinguish "I found nothing" from "there is nothing". A grep for accented characters
that cannot see Spanish without diacritics. A SwiftLint step that exits 0 when the binary
is absent. A count of exception tables that is identical with and without the fix it was
looking for. A test double that satisfied both the correct and the broken mechanism. A
guard pointed at a file the keys had moved out of, which would have matched an empty set
against an empty set. And a `sed` that failed with the wrong flag syntax, printed its
error, and left the next command's green output looking like an answer.

Two habits catch these, and they catch different failures:

- **A positive control** — search for something you know is present, mutate the thing the
  check is supposed to notice — proves the instrument can see.
- **Confirm the experiment happened** — `git diff` after applying a mutation, before
  reading any result — proves there was something to see.

The second is the one usually skipped, and it covers the worse case: a healthy
instrument faithfully measuring an event that never occurred.

## Verified on device

**As of 2026-09-05**, before this branch moved the Android SDK to `2.28.4` (by way of
`2.28.3`) and the iOS SDK to `2.16.6` (see "Known pending" below — neither version has
been re-verified on a device since). Every row
was run against the SDK version named in the last row, on that date; a later dependency
bump invalidates only the rows measured against the version that changed, not the rows
above them.

|                                  | Line 7 (CocoaPods)             | Line 8 (SPM)            |
| -------------------------------- | ------------------------------ | ----------------------- |
| iOS: native install              | `pod install`, confirmed       | `CapApp-SPM`, confirmed |
| iOS: SDK resource bundle         | confirmed                      | confirmed               |
| iOS: `title` and brand colours   | confirmed                      | confirmed               |
| iOS: dark theme and `showFooter` | not tested                     | confirmed               |
| Android: builds and renders      | confirmed                      | confirmed               |
| SDK version this table measured  | iOS `2.16.5`, Android `2.27.0` | iOS `2.16.5`            |

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

Three practical notes: use Node 22, since Homebrew's Node 26 builds a different
dependency tree; point `xcodebuild` at the simulator **by UDID**, not by name, which is
ambiguous once several runtimes are installed; and pin `typescript@5.9.3` when building
a Capacitor 7 test app — `typescript@7.x` breaks `@capacitor/cli@7.x`, which can no
longer parse `capacitor.config.ts`, so `cap init` fails before khipu is involved at all.
`@capacitor/cli@8.5.1` carries the fix; 7.x does not. This is not our defect and does
not belong in the merchant README — someone else's bug copied into our documentation
ages badly — but it will stop whoever repeats this exercise next.

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

### This round (`plugin-hardening`, pre-publish)

This branch has not been published, so the exercise above could not be repeated as
written: installing by dist-tag would have tested the old release, not this branch's
code. Instead, two apps were built from nothing, Capacitor 7 and Capacitor 8, each
installing the plugin from a **local `npm pack` tarball** rather than a dist-tag.
Packing also exercises the `files` array in `package.json` — the same place a package
can ship incomplete and nobody finds out until after publishing.

Both lines were built on **both** native platforms: Capacitor 8 via SPM (`CapApp-SPM`,
no Podfile), Capacitor 7 via CocoaPods (`pod install`, resolving `KhipuClientIOS 2.16.6`
and `Starscream 4.0.8`). The Starscream pin exists so the two package managers stop
resolving different dependency graphs, and this is the first time both paths were
exercised against it.

The README's usage snippets were copied literally into a **TypeScript strict** file, and
`tsc --noEmit` passed on both lines. This check is now part of the recipe because the
previous round bundled with esbuild alone, which strips types without checking them —
exactly how a contract requiring every option key shipped with a README example that did
not compile.

Kotlin-free Android builds succeeded on both lines, including Capacitor 7 at **AGP
8.7.2** — the precise boundary where the README's "you do not need Kotlin" claim starts
being true.

**Not verified: no real payment was run on either line.** There are no Khipu API
credentials in this environment, so there is no `operationId`, so nothing past the
plugin being wired in and callable was exercised.

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

- **Decide the canonical shape of an absent result field.** Measured, no longer open:
  Capacitor's iOS bridge serialises `nil as Any` to JSON `null`
  (`PluginCallResult.jsonRepresentation` → `JSONSerialization`), so iOS delivers
  `exitUrl`, `continueUrl` and `failureReason` as `null` while Android omits them. The
  published type is `string | undefined`, which `null` does not satisfy, so iOS is the
  side breaking the declared contract. Aligning on "omit" is type-correct but changes
  what existing iOS merchants receive, so it needs a decision rather than a patch.
  Android SDK ticket `IKW-1233` will make `asJson()` emit nulls to match iOS; since our
  reader omits nulls, that will not change the merchant-visible result and the
  divergence will persist by our choice.
- **Merchants need no manifest entry for `KhipuActivity`.** The AAR's own
  `AndroidManifest.xml` declares
  `<activity android:name="com.khipu.client.KhipuActivity" android:exported="false" …>`;
  this plugin's manifest is empty and the example app does not declare it either, yet
  the payment screen renders — the manifest merger injects it from the AAR. Recorded so
  nobody adds a phantom setup step to the README.
- **The AAR injects location permissions.** Its manifest declares `INTERNET`,
  `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`, and the merger puts all three
  into every merchant app. Merchants publishing to Play must declare location use in
  their data safety form. Documenting it in the README was considered and deliberately
  left out of the hardening pass; it wants a channel to the Android SDK team.
- **An unknown enum value from the protocol can crash the whole process** — tracked as
  `IKW-1232`, the single ticket all four bridge repositories reference. On a failure
  event the SDK threw
  `JsonMappingException: Cannot deserialize FailureReasonType` inside
  `com.khipu.khenshin.protocol.Converter`, on socket.io's `EventThread`, uncaught: the
  process died, and a dead process cannot resolve or reject anything.

  Status, in three parts, because they resolve at different speeds:
  - _The value that was hit_ is covered. Protocol `1.0.60` adds `USER_DISCONNECTED` and
    `forValue` recognises it.
  - _The mechanism_ is fixed under IKW-1232, which wraps the SDK's 23 socket listeners
    so a throwing handler never reaches the event thread. Expected as a patch release
    after `2.28.0`. That stops the crash — it does not, on its own, stop a terminal
    message that fails to parse from hanging the call. See the next part for that hang
    and how `2.28.4` closes it.
  - _A terminal message that fails to deserialise_ used to leave the call in flight
    indefinitely instead of ending it, the same symptom as a non-terminal failure like
    `FORM_REQUEST`. Verified directly against `khipu-client-android 2.28.3` source:
    `operationFinished` (`KhipuActivity.kt:307`, `:588`) only gated the socket
    connection and a snackbar, never a return to the host app; `buildResult(...)` ran
    exactly once (`:318`), inside `if (khipuUiState.returnToApp)`; and every
    `returnToApp()` call site was either a payer action (the cancel dialog at `:232`,
    the manual-transfer path at `:328`) or sat inside `operationSuccess?.let`,
    `operationFailure?.let` or `operationWarning?.let` (`:445`, `:458`, `:491`) — all
    null, and so skipped, when deserialisation failed. There was no inactivity timer, in
    `2.28.3` exactly as in `2.28.1`. The only recoveries were the payer pressing back and
    confirming the cancel dialog, or this plugin's bridge clearing `savedCalls` on a
    WebView navigation.

    **This document previously recorded this hang as closed by `2.28.3`. It was not.**
    `2.28.1`/`2.28.3` fixed the *decodable* `OPERATION_WARNING` case (see the "Plugin
    hardening pass" section above) and stopped the crash described in the mechanism
    above — going from "kills the app" to "the call hangs" is a real improvement, just
    not the one this document used to claim. An *undecodable* message of any terminal
    type still hung exactly as before, and the item was reopened once the `2.28.3`
    source made that clear.

    **`2.28.4` closes it.** `javap -c -p` on `SocketMessageGuardKt` shows the
    discriminator directly, reproduced against both jars (292 classes in each, so the
    method reads the same thing both times): `2.28.3`'s guard calls only
    `disconnectClient` and `setOperationFinished` on an undecodable terminal message;
    `2.28.4` additionally calls `returnToApp` and `setUnprocessableMessage`. Reading
    `KhipuActivityKt.buildResult` bytecode confirms what that produces: it branches on
    `KhipuUiState.getUnprocessableMessageType() != null`, reads the operation ID, and
    constructs the result with `exitTitle`, `exitMessage` and `exitUrl` as empty-string
    literals, `continueUrl` and `failureReason` as `null`, `result` as the literal
    `"ERROR"`, and an empty `events` array — so the `PluginCall` resolves instead of
    hanging. What the merchant now receives:

    | field | value |
    | --- | --- |
    | `operationId` | populated |
    | `result` | `"ERROR"` |
    | `failureReason` | `null` |
    | `exitTitle`, `exitMessage`, `exitUrl` | `""` |
    | `continueUrl` | `null` |
    | `events` | empty |

    **This interacts with the boundary decision above.** `failureReason` arrives as an
    explicit `null`, not absent and not `"USER_CANCELED"`. Our Android reader omits null
    keys — the same reduction recorded in "Decide the canonical shape of an absent
    result field" — so the merchant still sees the key absent rather than `null`. That
    remains our deliberate choice, but it now reduces an explicit `null` rather than
    standing in for a wrong label. A genuine cancellation still reports
    `failureReason: "USER_CANCELED"`.
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
- **`khipu-client-android 2.28.4` has never been exercised at runtime here.** "Verified
  on device" above is against `2.27.0`; the evidence for `2.28.4` is a clean Gradle
  build (`./gradlew clean build test --rerun-tasks`, forced, no `UP-TO-DATE` false
  green) resolving `com.khipu:khipu-client-android:2.28.4` on
  `releaseRuntimeClasspath`, plus the jar's own bytecode markers, not a device run.
  Re-verify on device before trusting that table for `2.28.4`, and before trusting the
  merchant-visible fields recorded above for the undecodable-terminal-message case.
- **`KhipuClientIOS 2.16.6` has never been exercised at runtime here either.** "Verified
  on device" above is against `2.16.5`; the evidence for `2.16.6` is a clean
  `xcodebuild build` plus the package's own version pin, not a device run. Re-verify on
  device before trusting that table for `2.16.6`.
- **Staying on `KhipuClientIOS 2.16.6`, not moving to `2.17.0`, is a decision to
  revisit — not a permanent position.** `2.17.0` is published and fixes two real
  defects: denying the location permission used to end the operation and return to the
  merchant's app, where now the payment continues instead, matching Android; and any
  CoreLocation failure used to leave the payment stuck on a spinner with no way out. But
  `2.17.0` **introduces a known defect**: an unreadable terminal message makes the
  merchant receive `failureReason: "USER_CANCELED"` when the SDK simply could not read
  it — a wrong label, not a missing one. It is fixed in `IKW-1245`, merged and **not
  released**. Taking `2.17.0` today would trade a hang the payer can see for a wrong
  label the merchant's code will act on — logging a cancellation that never happened.
  We wait for the release carrying `IKW-1245`.
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
