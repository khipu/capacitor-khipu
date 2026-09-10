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
  options?: KhipuOptions | undefined;
}

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
   * Title suggested for the screen you show once the flow ends.
   */
  exitTitle: string;
  /**
   * Message suggested for the screen you show once the flow ends.
   */
  exitMessage: string;
  /**
   * URL associated with the exit screen. Can come back empty on real payments, so
   * check it before using it.
   */
  exitUrl: string | undefined;
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
   */
  failureReason: string | undefined;
  /**
   * URL the native SDK provides to continue the operation in a further step, when
   * there is one.
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
