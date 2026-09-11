/**
 * The plugin's single entry point: opens the Khipu payment flow and waits for it to
 * finish.
 */
export interface KhipuPlugin {
  /**
   * Opens the Khipu payment flow for an operation you already created through the
   * Khipu API, and resolves once the flow finishes.
   *
   * A user who abandons the payment still resolves this promise: it comes back as
   * `result: 'OK'`, `'ERROR'`, `'WARNING'` or `'CONTINUE'` in every case. See
   * `KhipuResult.result` for what abandonment looks like.
   *
   * Android refuses a second, concurrent call while the first is genuinely still in
   * flight, rejecting it with `'OPERATION_IN_PROGRESS'` instead of hanging or replacing
   * the first one — the first operation's screen is still on screen and will still
   * deliver a result to it, which could be a payment that went through. iOS and web do
   * not currently guard against this: a second call proceeds, opening another payment
   * flow on iOS or re-mounting into the same root on web.
   *
   * Error codes are Android-only, from `KhipuPlugin.java`, and only
   * `'OPERATION_IN_PROGRESS'` signals this concurrency rejection. The other three come
   * from unrelated paths: `'INVALID_OPTIONS'` from a missing `operationId` or an
   * unreadable `options` object, `'LAUNCH_FAILED'` from the native activity failing to
   * launch, and `'NO_RESULT'` from the activity returning with no result. iOS rejects
   * with no code, and web rejects a bare `Error`. Do not write
   * `e.code === 'OPERATION_IN_PROGRESS'` and expect it to work on every platform.
   */
  startOperation(options: StartOperationOptions): Promise<KhipuResult>;
}

export interface StartOperationOptions {
  /**
   * The operation id returned by the Khipu API when you created the payment.
   */
  operationId: string;
  /**
   * Presentation options. Every key is optional, and leaving one out is not the same
   * as sending it: an absent key lets the native SDK apply its own default.
   *
   * The whole object can be left out too; that is equivalent to sending an empty one.
   */
  // `| undefined` alongside `?` here too, same reason as every field of `KhipuOptions`
  // below: without it, `exactOptionalPropertyTypes` rejects `options: undefined` sent
  // explicitly, rather than omitted.
  options?: KhipuOptions | undefined;
}

// Every field below is typed `field?: T | undefined`, not just `field?: T`. The union
// looks redundant — `?` already makes the key optional — but it is not: dropping it
// changes what compiles under `exactOptionalPropertyTypes` (which `verify:readme`
// turns on for the README's own examples). With only `?`, that flag rejects a key
// that is *present* with the value `undefined` — it must be omitted entirely. A
// merchant building this object conditionally, e.g.
// `{ locale: useSpanish ? 'es_CL' : undefined }`, needs the key to be allowed to hold
// `undefined` explicitly. Keep the union, on every field, so that keeps compiling.
/**
 * Presentation options for the payment screen. Every field is optional, and an absent
 * field is not the same as sending one: leaving a key out lets the platform apply its
 * own default instead of overriding it.
 *
 * Web is more limited than the native SDKs: see each field below for whether web
 * reads it.
 */
export interface KhipuOptions {
  /**
   * BCP 47-ish locale for the payment screen, e.g. `es_CL`.
   *
   * The two native SDKs disagree on the default: iOS falls back to `es_CL` while
   * Android follows the phone's language. Send it explicitly if you need the same
   * language on both.
   */
  locale?: string | undefined;
  /**
   * Title shown on the payment screen in place of the SDK's own default.
   *
   * Native only. The web loader does not read this key.
   */
  title?: string | undefined;
  /**
   * URL of an image shown alongside the title.
   *
   * Native only. The web loader does not read this key.
   */
  titleImageUrl?: string | undefined;
  /**
   * Skips the exit page normally shown at the end of the flow, whatever the outcome.
   *
   * Honored on web as well as on both native platforms.
   */
  skipExitPage?: boolean | undefined;
  /**
   * Skips the success page at the end of the flow.
   *
   * Native only for now. The deployed web loader does not read this key yet; it is
   * sent so it starts working when a later version does.
   */
  skipExitSuccessPage?: boolean | undefined;
  /**
   * Color scheme for the payment screen.
   *
   * Leaving this out follows the device's own setting on all three platforms — the
   * same as sending `'system'` explicitly. Say so plainly because it was not always
   * true: web used to default to light regardless of the device, so the same payment
   * could render light on web and dark on the phone with nothing in the merchant's
   * code to explain it.
   *
   * On web, `'system'` is resolved locally via `prefers-color-scheme`, and the
   * result then picks between `colors.lightPrimary` and `colors.darkPrimary` — the
   * only two color overrides web applies. See `KhipuColors`.
   */
  theme?: 'light' | 'dark' | 'system' | undefined;
  /**
   * Color overrides for the payment screen, kept as separate light and dark
   * palettes.
   *
   * Web only reads `lightPrimary` and `darkPrimary`; the other ten fields reach both
   * native SDKs but have no effect on web.
   */
  colors?: KhipuColors | undefined;
  /**
   * Shows or hides the footer on the payment screen.
   *
   * Native only. The web loader does not read this key.
   */
  showFooter?: boolean | undefined;
  /**
   * Shows or hides the merchant logo on the payment screen.
   *
   * Native only. The web loader does not read this key.
   */
  showMerchantLogo?: boolean | undefined;
  /**
   * Shows or hides the payment details on the payment screen.
   *
   * Native only. The web loader does not read this key.
   */
  showPaymentDetails?: boolean | undefined;
}

/**
 * Color overrides for the payment screen, as two parallel palettes: `light*` fields
 * apply in light mode, `dark*` fields in dark mode. Each value is a color understood
 * by the native SDK you are targeting.
 *
 * Web only reads `lightPrimary` and `darkPrimary` — see `KhipuOptions.theme` for how
 * it picks between them. The other ten fields reach the native SDKs but have no
 * effect on web.
 */
export interface KhipuColors {
  /**
   * Background color in light mode.
   *
   * Native only. The web loader does not read this key.
   */
  lightBackground?: string | undefined;
  /**
   * Color for content drawn over `lightBackground`.
   *
   * Native only. The web loader does not read this key.
   */
  lightOnBackground?: string | undefined;
  /**
   * Primary/accent color in light mode.
   *
   * Honored on web: applied when the resolved theme (see `KhipuOptions.theme`) is
   * light.
   */
  lightPrimary?: string | undefined;
  /**
   * Color for content drawn over `lightPrimary`.
   *
   * Native only. The web loader does not read this key.
   */
  lightOnPrimary?: string | undefined;
  /**
   * Top bar background color in light mode.
   *
   * Native only. The web loader does not read this key.
   */
  lightTopBarContainer?: string | undefined;
  /**
   * Color for content drawn over `lightTopBarContainer`.
   *
   * Native only. The web loader does not read this key.
   */
  lightOnTopBarContainer?: string | undefined;
  /**
   * Background color in dark mode.
   *
   * Native only. The web loader does not read this key.
   */
  darkBackground?: string | undefined;
  /**
   * Color for content drawn over `darkBackground`.
   *
   * Native only. The web loader does not read this key.
   */
  darkOnBackground?: string | undefined;
  /**
   * Primary/accent color in dark mode.
   *
   * Honored on web: applied when the resolved theme (see `KhipuOptions.theme`) is
   * dark.
   */
  darkPrimary?: string | undefined;
  /**
   * Color for content drawn over `darkPrimary`.
   *
   * Native only. The web loader does not read this key.
   */
  darkOnPrimary?: string | undefined;
  /**
   * Top bar background color in dark mode.
   *
   * Native only. The web loader does not read this key.
   */
  darkTopBarContainer?: string | undefined;
  /**
   * Color for content drawn over `darkTopBarContainer`.
   *
   * Native only. The web loader does not read this key.
   */
  darkOnTopBarContainer?: string | undefined;
}

export interface KhipuResult {
  /**
   * The operation id that was passed to `startOperation`.
   */
  operationId: string;
  /**
   * Title of the closing screen the SDK already showed the payer (success, failure,
   * warning, or continue). Confirmed on iOS, Android and web: all three set it from
   * the same title the SDK's own screen displayed. Reuse it if you render your own
   * screen instead of the SDK's.
   */
  exitTitle: string;
  /**
   * Body text of the closing screen the SDK already showed the payer, paired with
   * `exitTitle`. Confirmed on iOS, Android and web. Reuse it if you render your own
   * screen instead of the SDK's.
   */
  exitMessage: string;
  /**
   * URL associated with the exit screen. Can come back empty on real payments, so
   * check it before using it.
   *
   * When absent, iOS sends it as JSON `null` while Android omits the key entirely —
   * both are valid under how each platform's bridge serialises a nil/absent optional.
   * Aligning the two is under consideration, not decided: it would most likely mean
   * changing iOS to omit the key like Android, which is a breaking change for existing
   * iOS merchants and would need a major version (see `docs/STATUS.md`,
   * "Known pending"). Compare with truthiness or `??`, not `=== undefined`, so it
   * reads the same either way today.
   */
  exitUrl: string | undefined;
  // Never add 'CANCELED' (or any other value) to this union without a major version
  // bump. Merchants switch on `result` exhaustively, so a new member breaks their
  // compile the moment they upgrade even a minor release. A user who cancels is
  // folded into 'ERROR' below for exactly this reason: it needs no new member.
  /**
   * Outcome of the operation. A user who abandons the payment arrives here as
   * `'ERROR'` with `failureReason: 'USER_CANCELED'` — not as a rejected promise.
   */
  result: 'OK' | 'ERROR' | 'WARNING' | 'CONTINUE';
  /**
   * Machine-readable reason behind the current `result`, straight from the Khipu
   * protocol. Treat it as an open-ended string, not a fixed list: the protocol adds
   * values over time — `USER_DISCONNECTED` is a recent one — and a hardcoded list
   * here would go stale silently.
   *
   * When absent, iOS sends it as JSON `null` while Android omits the key entirely.
   * Compare with truthiness or `??`, not `=== undefined`.
   */
  failureReason: string | undefined;
  /**
   * URL to send the payer to so they can finish the operation. Present when, and
   * only when, `result` is `'CONTINUE'` — confirmed on iOS, Android and web, where
   * every other outcome branch leaves it `undefined`/`nil`. Undefined for every
   * other `result` value.
   *
   * When absent, iOS sends it as JSON `null` while Android omits the key entirely.
   * Compare with truthiness or `??`, not `=== undefined`.
   */
  continueUrl: string | undefined;
  /**
   * Events recorded during the operation, in the order the SDK reported them.
   */
  events: KhipuEvent[];
}

export interface KhipuEvent {
  /**
   * Name of the event, as reported by the native SDK.
   */
  name: string;
  /**
   * When the event occurred, as reported by the native SDK.
   */
  timestamp: string;
  /**
   * Category of the event, as reported by the native SDK.
   */
  type: string;
}
