# Plugin hardening — design

**Date:** 2026-09-09
**Lines in scope:** `main` (4.x, Capacitor 8) and `7.x` (3.x, Capacitor 7)
**Target versions:** `4.1.0` and `3.1.0` — minor, not major: every change is a widening or a fix.

## Why

A review of the plugin found seven problems. Two of them reach merchants in
production today, and one of those is not a hang but very likely a crash. The rest
are gaps in rigour that let the first two happen: the surface a merchant touches
first — the TypeScript contract and the README — is the least tested part of the
repo, and the Android side never got the treatment the iOS side did.

Two peer sessions working on the React Native and Flutter bridges over the same
native SDK sent warnings mid-design. Both were verified against source on this
machine before being folded in. See **Evidence**.

## Goals

1. A merchant can copy the README example into a TypeScript app and it compiles.
2. Every `startOperation` call settles. No path hangs the promise, no path crashes.
3. Android and iOS agree on what happens to malformed input.
4. The web layer sends what kws.js actually reads, and says what it does not.
5. The whole repo — code, comments, tests, docs — is in English.

## Non-goals

- **No codegen for the option vocabulary.** 22 keys across 6 places, changing about
  once a year. The existing sync guard is the right answer at this size; a generator
  is a second thing to maintain for no gain.
- **No `'CANCELED'` in the `result` union.** Merchants switch on it exhaustively;
  adding a member breaks their compile. Abandonment already arrives as
  `result: 'ERROR'` with `failureReason: 'USER_CANCELED'`.
- **No web mapping for options kws.js does not read.** `title`, `titleImageUrl`,
  `showFooter`, `showMerchantLogo`, `showPaymentDetails` and eleven of the twelve
  colours have no support in the loader. We document the gap rather than invent it.
  The one deliberate exception is `skipExitSuccessPage`, which stays in the payload
  because a later loader version will read it; it is marked as forward-looking in the
  JSDoc, not as working today.
- **No changes to `release/2.x`.** It is frozen and out of support.
- **No new manifest requirement for merchants.** The AAR declares `KhipuActivity`
  itself and the manifest merger injects it; nothing about the launch guard below
  should be documented as something a merchant has to add.
- **No `exactOptionalPropertyTypes` or other tsconfig tightening for merchants.** We
  only make our own declarations compatible with it.

## A. TypeScript contract

`KhipuOptions` and `KhipuColors` declare their fields as `field: T | undefined`. In
TypeScript that is a **required** property whose value may be `undefined` — the
merchant has to write all ten option keys and all twelve colour keys explicitly.
Verified: the README's own example fails with `TS2740`, in strict and non-strict mode
alike.

**Change:** every field of `KhipuOptions` and `KhipuColors` becomes
`field?: T | undefined`.

The `?` fixes the bug. The explicit `| undefined` is kept deliberately: without it, a
merchant compiling with `exactOptionalPropertyTypes: true` who today writes
`locale: undefined` would stop compiling. With both, every existing call site keeps
working. The change is a widening — nothing that compiles today stops compiling.

`KhipuResult` and `KhipuEvent` are **not** touched. They are outputs; `| undefined`
without `?` is the correct promise there: the key is always present, its value may be
absent.

## B. README compile guard

New guard, sibling to the two that exist: `scripts/check-readme-compiles.mjs`.

It extracts every ` ```typescript ` block from `README.md`, writes them to a temporary
directory with an import rewritten to `src/definitions.ts`, and type-checks them with
`tsc --noEmit --strict --exactOptionalPropertyTypes`. It fails if any block does not
compile.

This closes the exact hole the bug came through. The from-scratch doctest apps did not
catch it because they bundle with esbuild, which strips types without checking them.
A guard that compiles the documentation is the only thing that makes the README
answerable to the compiler.

Like the other two guards it takes a base directory argument so it can be tested with
fixtures, and it gets tests for its failure path, not just its success path.

## C. Android

### C1. Extract and test the option mapper

`KhipuPlugin.java` inlines nineteen `if (options.has(...))` blocks in the plugin
method, and the only Android tests in the repo are the template stubs. iOS has a
mapper with a test seam and a documented rationale; Android has neither.

**Change:** extract `KhipuOptionsMapper` (package-private) with
`static KhipuOptions map(JSObject options)`, shaped like the Swift one. `KhipuPlugin`
keeps the flow only: validate, map, launch.

Unit tests run on the JVM with `testImplementation 'org.json:json:20250517'` and
`org.mockito:mockito-core:5.20.0` — the exact versions Capacitor itself uses to test
the same classes, so we are not inventing a test stack.

**Open point with a stated fallback:** if `KhipuOptions`' properties turn out not to
be readable from the test (the way `KhipuClientIOS`' are not, which is why the Swift
side needs `KhipuOptionsDraft`), replicate the draft pattern on the Java side. Decided
when the first test is written, not before. If this requires inspecting the AAR, use
`grep -a` — BSD grep silently skips binary files and reports zero matches — and
validate the search with a control pattern known to be present.

### C2. Tolerant reads

The mapper reads with `Objects.requireNonNull(options.getString(key))` guarded by
`assert options != null`. Two problems, both verified:

- Java assertions are disabled at runtime on Android. Every `assert` in this file is a
  no-op.
- `JSObject.getString` returns `null` when the key holds JSON `null`
  (`JSObject.java:50-58`), so `{title: null}` reaches `Objects.requireNonNull` and
  throws.

That NPE does not become a rejection. `Bridge.callPluginMethod` catches it at
`Bridge.java:854-857`, logs `"Serious error executing plugin"` and **rethrows it as a
`RuntimeException`** inside the task handler. The `catch` that does call
`call.errorCallback` (`Bridge.java:861-864`) wraps only the *posting* of the task, not
its execution. The promise never settles, and an uncaught `RuntimeException` on that
thread very likely takes the app down.

**Change:** absent, null, or wrongly-typed values are skipped, exactly as
`KhipuOptionsMapper.swift` already does. This aligns the two platforms on malformed
input and removes the crash.

### C3. Result reader

`operationResult` casts the activity payload with
`(KhipuResult) Objects.requireNonNull(result.getData().getExtras().getSerializable(...))`.
If the activity returns without data, the NPE escapes the `catch (JSONException)`. It
is then swallowed by `Plugin.triggerActivityCallback`, which invokes the callback
reflectively and catches `InvocationTargetException` with nothing but
`e.printStackTrace()` (`Plugin.java:153-158`). Nothing resolves, nothing rejects, the
merchant's `await` hangs forever.

The same method also rejects and then falls through to `call.resolve(toRet)` — there
is no `return` in the catch.

**Change:** `operationResult` unwraps `Intent → Bundle → Serializable` with null-safe
steps and hands the extra to a pure `KhipuResultReader.read(Serializable)`:

- payload present → resolve with it;
- payload absent or of the wrong type → reject with a clear message;
- `return` after every terminal branch.

`read` takes a `Serializable`, not an `Intent`, so it is unit-testable with zero
Android mocks.

**The reader never sees `resultCode`, and that is the point.** Both of the SDK's exits
carry a complete `KhipuResult`, so branching on the result code would make the same
outcome — the user abandoned the payment — arrive in two different shapes depending on
an invisible timing detail. The current code already does not branch on it; this
change makes that property structural instead of incidental. See **Evidence**.

### C4. Call lifecycle: one operation at a time, with a liveness check

Capacitor keys the activity callback off a single field: `startActivityForResult`
stores `lastPluginCallId = call.getCallbackId()` (`Plugin.java:180`) and
`triggerActivityCallback` reads the saved call back from it (`Plugin.java:148`). Two
overlapping `startOperation` calls mean the second overwrites the first, both results
are delivered to the second, and the first promise hangs.

Two fixes were considered and one was reversed during design, so both are recorded.

**Rejected: supersede.** Settle the pending call and let the new one take over. It
cannot strand the plugin, but a peer session pointed out the physical problem: while
the first operation is in flight the SDK activity is *on screen* and will deliver its
result. Superseding throws that result away — and it may be a payment that actually
went through.

**Chosen: reject the second call while a first is genuinely in flight.** The in-flight
operation keeps the slot and its result is delivered correctly. No real outcome is
discarded.

The usual objection to a lock is that one hung call leaves the plugin refusing every
operation forever — a peer shipped exactly that and paid for it. Capacitor gives us a
way out that does not depend on our own bookkeeping being perfect: when a call is
resolved or rejected, `MessageHandler.sendResponseMessage` calls `call.release(bridge)`
(`MessageHandler.java:135-137`), and `PluginCall.release` removes it from the bridge's
saved calls (`PluginCall.java:360-364`). So

```
bridge.getSavedCall(pendingId) != null
```

is an authoritative "still in flight" test. The guard rejects a second call **only when
the bridge still holds the first**; a stale pending call is detected and cleared, and
the new call proceeds. The lock cannot become permanent because it is never the sole
source of truth.

That last property is worth more than it looks. The React Native bridge, which has no
equivalent registry — `Promise` exposes only `resolve` and `reject`, with nothing to
query — found it has to close the host-Activity-recreation case by hand, through a
lifecycle listener, because there a surviving module field is the only bookkeeping.
Asking the bridge instead of trusting our own field covers that case for free.

**Ordering rule, adopted from the peer reports:** store the call as late as possible,
and put everything that can throw either before the point of no return or inside a
`try` that answers.

1. Validate `operationId` → reject.
2. Map options inside a `try` → reject with `INVALID_OPTIONS`.
3. If a pending call is still live in the bridge → reject the new call with
   `OPERATION_IN_PROGRESS`. Otherwise clear the stale pending.
4. Record the pending call and launch inside a `try` that clears state and rejects
   with `LAUNCH_FAILED`.

Step 4 covers the gap inside Capacitor's own helper, which saves at `Plugin.java:181`
and launches at `:182`. If `launch()` throws, the call is already saved and would
otherwise never be answered — and the reason to guard it is not any particular
exception but the shape of the failure: **if the activity does not start, no result
will ever arrive, which is exactly the condition that strands the call.** The cost of
the `try` is nothing and the class of failure it covers is the worst one.

### C5. Build the result explicitly, and let the guard see it

`operationResult` hands the SDK's own serialisation straight to JS:
`new JSObject(khipuResult.asJson())`. `KhipuResult.asJson()` is `Gson().toJson(this)`
(`KhipuResult.kt:30-32`), and Gson omits nulls by default. `exitUrl`, `continueUrl`
and `failureReason` are all `String?`, so on a cancelled operation **those keys are not
empty — they are absent**, while iOS sends them through `call.resolve` as `nil as Any`.

This is precisely the half of the contract `check-option-keys.mjs` documents that it
cannot check, because Android's result keys are not in our source to extract.

**Change:** Android builds the result object key by key, the way iOS already does. Two
things follow. The platforms stop diverging, and the keys become extractable — so the
vocabulary guard can finally cover the return path on **both** platforms instead of one.

**Left open on purpose:** which shape is canonical. The declared type is
`exitUrl: string | undefined`; an absent key reads as `undefined` and satisfies it,
while `null` does not. That points at "omit" as the canon, which would mean changing
iOS — but what Capacitor's iOS bridge actually does with `nil as Any` has not been
measured, and it may already omit the key. Until someone measures it on a device,
Android keeps the shape it has today (absent), which is the one the published type
promises. The measurement is recorded as a pending item in `docs/STATUS.md`.

## D. Web layer

Verified against the deployed `https://js.khipu.com/v1/kws.js` (24 KB, unminified).
`startOperation(descriptor, callback, settings)` reads `mountElement`, `modal`,
`locale` **at the root of settings**, `modalOptions`, `options.style` (forwarded whole
to the iframe), `options.skipExitPage`, `options.messages`, `options.autoHeight`.

Changes:

- **Constructor stops having side effects.** It injects `kws.js` and a `<div>` on
  construction, before anyone calls `startOperation`, which already does both. Loading
  a third-party script on every page view of the merchant's app is a cost nobody
  asked for. Injection moves to first use.
- **Send `locale`**, at the root of settings. It is supported and today it is dropped.
- **Keep sending `skipExitSuccessPage`.** The deployed loader does not read it, but a
  later version will; the JSDoc says so rather than pretending it works today.
- **Type the global.** `declare global { interface Window { Khipu?: ... } }` removes
  three `@ts-ignore`s and the `any`s.
- **`script.onload` / `script.onerror`** instead of polling every 50 ms, keeping the
  timeout as a backstop for "loaded but never defined `Khipu`". The three failures
  report differently: never loaded, loaded but empty, and timed out.
- **A reject path.** kws throws on an invalid descriptor; today the promise would hang.
- Drop the unused `private khipu` field and the leftover `ensureFooIsSet` comment.
- Internal methods become private except what the tests need.

We keep creating our own mount element rather than letting kws create it. kws creates
a div with the identical id (`khipu-web-root`) and forces `modal = true` when
`mountElement` is absent, so relying on that would work — but it is an internal detail
of a script we do not version, and depending on it buys nothing.

## E. Fifth surface in the vocabulary guard

`check-option-keys.mjs` checks four surfaces and leaves out `src/web.ts` — the one
place where drift is invisible, because nothing else reads it and no test compares it
to the contract. That is how `skipExitSuccessPage` came to be sent to a loader that
never read it.

**Change:** add `src/web.ts` with the rule

```
contract == keys web reads ∪ WEB_UNSUPPORTED
```

where `WEB_UNSUPPORTED` is a constant declared in `web.ts` listing the options the web
layer deliberately does not support. Adding an option to the contract then forces a
decision about web instead of allowing a silent omission.

Colours are checked the same way and separately, as the existing surfaces already are:
`KhipuColors == colour keys web reads ∪ WEB_UNSUPPORTED_COLORS`. Today the web layer
reads `lightPrimary` and `darkPrimary` — it picks one as the iframe's `primaryColor`
according to the resolved theme — and the other ten go in the unsupported list.

## F. JSDoc and docgen

`definitions.ts` has no doc comments, so the generated API section of the README is a
bare type table. Add JSDoc per field covering: what `operationId` is, that every option
key is optional, the `locale` default divergence between platforms, what the web layer
honours, and that an abandoned payment arrives as `result: 'ERROR'` with
`failureReason: 'USER_CANCELED'` rather than as a rejected promise. `npm run docgen`
regenerates the README section.

## G. English only

Comments, identifiers, error messages and test names across: the five Swift files, both
scripts in `scripts/` (including Spanish identifiers such as `claves` → `keys`,
`contrato` → `contract`), `.github/workflows/ci.yml`, `.gitignore`, `.prettierignore`,
`.eslintignore`, the `example/` harness and `example/src/index.html`.

Test names go with them, e.g. `testDescartaValoresDeTipoIncorrectoEnVezDeCrashear` →
`testDiscardsWrongTypedValuesInsteadOfCrashing`.

`docs/superpowers/ESTADO.md` becomes `docs/STATUS.md`, in English and sanitised — the
count of unreviewed Dependabot alerts does not belong in a public repository. The SPM
migration's spec and plan are deleted from the tree; that migration is finished and git
keeps both in history.

**The same rule applies to this spec and its plan**: they live in `docs/superpowers/`
while the work is in flight and are archived the same way when it lands, with the
outcome recorded in `docs/STATUS.md`.

## H. Minor

- Podspec `s.swift_version` `5.1` → `5.9`, matching `swift-tools-version: 5.9`.
- CI `example` job builds Android as well as iOS.

## I. Android SDK bump

`com.khipu:khipu-client-android` `2.27.0` → `2.28.0`. Verified against the khenshin
repository: `2.28.0` is the current release and it brings
`com.khipu.khenshin:protocol` from `1.0.59` to `1.0.60`, which is the version iOS is
already on.

The bump is as low-risk as a dependency bump gets, and it was measured rather than
assumed. The client's public API is unchanged between the two versions and so is its
manifest; the only real change is the protocol pin. The protocol change is purely
additive: both jars carry 95 classes, and the single addition is
`FailureReasonType.USER_DISCONNECTED`, which `forValue(String)` recognises rather than
declaring and ignoring.

That addition is what the crash in **Known limitations** was hitting. Nothing in this
plan depends on it: the plugin passes `failureReason` through as a string and has no
enum of its own, so a new value needs no code change on our side — which is also why
the `failureReason` JSDoc must not enumerate the possible values.

## Testing

Test-driven for everything with behaviour — the README guard, the Android mapper and
result reader, the web layer, the fifth surface — writing the failing test first.

New Android coverage:

- mapper: every key mapped; absent, null and wrongly-typed values skipped.
- result reader: payload present → result; payload absent or wrong type → null; and a
  regression test asserting a `RESULT_CANCELED` payload is still delivered.
- call lifecycle: a superseded call is rejected, not left pending.

Closing verification: `npm run verify` locally, which includes `xcodebuild` and
`gradlew`, plus green CI on both lines.

## Release

`main` first, to green, then port to `7.x` in a worktree. Not a cherry-pick — the
dependency trees differ, which is why the CI lockfile fix could not be shared either —
but the source changes are near-identical.

Publishing is left prepared, not executed: the npm publish needs a human with 2FA.

## Evidence

Everything below was verified on this machine during design, not assumed.

**kws.js** (deployed, unminified): settings shape as described in D; `locale` read at
the root (`renderIframe` params); no occurrence of `skipExitSuccessPage`; kws creates
its own `khipu-web-root` div and forces `modal = true` when `mountElement` is absent;
the result callback's shape conforms to `KhipuResult`.

**`khipu-client-android` at tag `2.27.0`**, the version this plugin declares:

- `KhipuActivity.kt:320` — `setResult(RESULT_OK, resultIntent)` with `buildResult()`
  (`:521`). The normal exit.
- `KhipuActivity.kt:119` — the only `setResult(RESULT_CANCELED, …)`, and it also
  carries a full `KhipuResult`: `result = "ERROR"`,
  `failureReason = "USER_CANCELED"`, the real `operationId`. Fires in `onCreate` when
  the activity was destroyed for longer than `DESTROYED_TOLERANCE_MS = 3 * 60_000`.
- `KhipuActivity.kt:249` — `BackHandler { showAppAlertDialog.value = true }`. The back
  button opens a dialog; it does not set a result. Cancelling leaves through
  `returnToApp` and therefore through `RESULT_OK`.

Which is why the result code carries no information worth branching on.

The AAR's own `AndroidManifest.xml`, read out of the Gradle cache, declares
`<activity android:name="com.khipu.client.KhipuActivity" android:exported="false" …>`.
Our plugin's manifest is empty and the example app does not declare it either, yet the
payment screen renders — the merger injects it. Merchants do not need to declare it.

**Capacitor 8 Android runtime:**

- `Plugin.java:173-183` — `startActivityForResult` saves at `:181` and launches at
  `:182`; `lastPluginCallId` at `:180` is a single field.
- `Plugin.java:148` — `triggerActivityCallback` resolves the call from that field.
- `Plugin.java:153-158` — invokes reflectively and catches `InvocationTargetException`
  with only `e.printStackTrace()`.
- `Bridge.java:854-857` — an exception from a plugin method is logged and rethrown as
  `RuntimeException` inside the task handler; the `errorCallback` path at `:861-864`
  covers only task posting.
- `JSObject.java:50-58` — `getString` returns the default (`null`) when the key holds
  JSON `null`.
- `capacitor/build.gradle:91-92` — `org.json:json:20250517` and
  `mockito-core:5.20.0` for JVM unit tests.

- `MessageHandler.java:135-137` — a call that is not kept alive is released as soon as
  it is answered; `PluginCall.java:360-364` — `release` removes it from the bridge's
  saved calls. Together these make `bridge.getSavedCall(id) != null` an authoritative
  liveness test.

**`KhipuResult.kt:30-32`** — `asJson()` is `Gson().toJson(this)`, and Gson omits nulls
by default; `exitUrl`, `continueUrl` and `failureReason` are declared `String?`.

**khenshin repository:** `khipu-client-android` `2.28.0` is the current release;
its POM depends on `com.khipu.khenshin:protocol:1.0.60`, where `2.27.0` depends on
`1.0.59`.

**The AAR's manifest** (read from the Gradle cache with `unzip -p` + `grep -a` and a
control pattern) declares `INTERNET`, `ACCESS_FINE_LOCATION` and
`ACCESS_COARSE_LOCATION`.

**TypeScript:** the README example fails with `TS2740` under both `--strict` and
default settings.

## Known limitations

Neither is fixable in this plugin. Both are recorded in `docs/STATUS.md` so they are
not rediscovered from scratch, and both want a channel to the Android SDK team.

**An unknown `FailureReasonType` crashes the whole process.** Reported by the React
Native bridge session, reproduced once by them while measuring something else and not
reproduced since. On a failure event the SDK throws
`JsonMappingException: Cannot deserialize FailureReasonType` inside
`com.khipu.khenshin.protocol.Converter`, on socket.io's `EventThread`. It is
uncaught on a thread no bridge controls, so the process dies — and a dead process
cannot resolve or reject anything. **No callback-lifecycle work in this plan covers
it**, including C4.

It was forward incompatibility, and the `2.28.0` bump closes the case that was hit:
`USER_DISCONNECTED` is the one value protocol `1.0.60` adds, and `forValue` recognises
it. Measured by the React Native bridge session and re-verified here against both jars.

**The mechanism is being fixed in the SDK, under `IKW-1232`** — the single ticket all
four bridge repositories reference. Its 23 socket listeners are wrapped so a handler
throwing no longer reaches socket.io's `EventThread`. As of this writing the fix is on
a branch and neither merged nor released; it is expected as a patch bump, `2.28.1`, with
no date. Nothing in this plan waits for it.

Two consequences of that fix reach this plugin, and both are behaviour we must already
be correct about:

- **A terminal message that fails to deserialise now ends the operation**, so the
  launcher callback fires and the promise settles — but the `KhipuResult` may arrive
  with no `failureReason`, precisely because the detail is what failed to parse. Section
  C5's reader already handles this: it skips null values, so the key is simply absent
  and reads as `undefined`, which is what `failureReason: string | undefined` promises.
  A test asserts it rather than leaving it to inference.
- **A non-terminal message that fails is logged and ignored**, and the operation
  continues. If the message was a `FORM_REQUEST`, the payer waits for a form that will
  never render: no crash, no exit. For us that means the activity stays up and the
  `PluginCall` stays genuinely in flight, so C4's liveness check reports it live and a
  second `startOperation` is refused — which is correct, because the first really is
  still running. The escape is the payer cancelling, which the SDK routes through its
  back dialog to a normal `RESULT_OK`. Worth knowing when a merchant reports a payment
  that "hangs" with no error.

The protocol generator itself is untouched, so hardening the deserialisation remains
open on the SDK side.

**The AAR injects location permissions.** Its manifest declares `INTERNET`,
`ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`, and the manifest merger puts all
three into every merchant app. Merchants publishing to Play have to declare location
use in their data safety form. Documenting it in the README was considered for this
pass and deliberately left out; it is recorded as pending instead.

## Risks

- **`KhipuOptions` readability from JVM tests** — fallback stated in C1.
- **Porting to `7.x`** touches a line whose CI went green once; the port needs its own
  full verification rather than trust in the diff.
- **Superseding changes observable behaviour** for a merchant who today calls
  `startOperation` twice and waits on both promises: the first now rejects instead of
  hanging. That is the intended fix, and it is documented in the JSDoc.
