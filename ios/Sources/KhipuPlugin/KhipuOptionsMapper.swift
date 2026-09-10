import Capacitor
import Foundation
import KhipuClientIOS

/// Translates the options dictionary coming in from JS into the Khipu client's
/// native options.
///
/// Discards wrong-typed values instead of crashing the app: the previous mapping
/// used `as!`, so a `title: 123` sent from JS ended up crashing instead of being
/// ignored.
enum KhipuOptionsMapper {

    static func map(_ options: JSObject?) -> KhipuOptions {
        apply(draft(from: options))
    }

    /// JS -> draft. Concentrates all the logic and is the step the tests cover.
    static func draft(from options: JSObject?) -> KhipuOptionsDraft {
        var draft = KhipuOptionsDraft()
        guard let options else { return draft }

        draft.topBarTitle = string(options["title"])
        draft.topBarImageUrl = string(options["titleImageUrl"])
        draft.locale = string(options["locale"])
        draft.skipExitPage = bool(options["skipExitPage"])
        draft.skipExitSuccessPage = bool(options["skipExitSuccessPage"])
        draft.showFooter = bool(options["showFooter"])
        draft.showMerchantLogo = bool(options["showMerchantLogo"])
        draft.showPaymentDetails = bool(options["showPaymentDetails"])
        draft.theme = theme(options["theme"])

        if let colors = options["colors"] as? JSObject {
            draft.colors = colorsDraft(from: colors)
        }

        return draft
    }

    /// draft -> `KhipuOptions`. Mechanical: one line per field.
    ///
    /// **Gap accepted on purpose, documented so it is reviewable.** The tests cover
    /// `draft(from:)`, not `apply(_:)`. If someone swapped `lightPrimary` for
    /// `lightOnPrimary` here, the tests would still pass. It's accepted because
    /// `apply(_:)` is one line per field, visually aligned, and code review covers it
    /// at that size. **The limit:** the moment `apply(_:)` gains a conditional, a
    /// transformation, or a branch, it stops being defensible and needs its own tests.
    private static func apply(_ draft: KhipuOptionsDraft) -> KhipuOptions {
        var builder = KhipuOptions.Builder()

        if let value = draft.topBarTitle { builder = builder.topBarTitle(value) }
        if let value = draft.topBarImageUrl { builder = builder.topBarImageUrl(value) }
        if let value = draft.locale { builder = builder.locale(value) }
        if let value = draft.skipExitPage { builder = builder.skipExitPage(value) }
        if let value = draft.skipExitSuccessPage { builder = builder.skipExitSuccessPage(value) }
        if let value = draft.showFooter { builder = builder.showFooter(value) }
        if let value = draft.showMerchantLogo { builder = builder.showMerchantLogo(value) }
        if let value = draft.showPaymentDetails { builder = builder.showPaymentDetails(value) }
        if let value = draft.theme { builder = builder.theme(value) }
        if let colors = draft.colors { builder = builder.colors(apply(colors)) }

        return builder.build()
    }

    private static func apply(_ draft: KhipuColorsDraft) -> KhipuColors {
        var builder = KhipuColors.Builder()

        if let value = draft.lightBackground { builder = builder.lightBackground(value) }
        if let value = draft.lightOnBackground { builder = builder.lightOnBackground(value) }
        if let value = draft.lightPrimary { builder = builder.lightPrimary(value) }
        if let value = draft.lightOnPrimary { builder = builder.lightOnPrimary(value) }
        if let value = draft.lightTopBarContainer { builder = builder.lightTopBarContainer(value) }
        if let value = draft.lightOnTopBarContainer { builder = builder.lightOnTopBarContainer(value) }
        if let value = draft.darkBackground { builder = builder.darkBackground(value) }
        if let value = draft.darkOnBackground { builder = builder.darkOnBackground(value) }
        if let value = draft.darkPrimary { builder = builder.darkPrimary(value) }
        if let value = draft.darkOnPrimary { builder = builder.darkOnPrimary(value) }
        if let value = draft.darkTopBarContainer { builder = builder.darkTopBarContainer(value) }
        if let value = draft.darkOnTopBarContainer { builder = builder.darkOnTopBarContainer(value) }

        return builder.build()
    }

    private static func colorsDraft(from colors: JSObject) -> KhipuColorsDraft {
        KhipuColorsDraft(
            lightBackground: string(colors["lightBackground"]),
            lightOnBackground: string(colors["lightOnBackground"]),
            lightPrimary: string(colors["lightPrimary"]),
            lightOnPrimary: string(colors["lightOnPrimary"]),
            lightTopBarContainer: string(colors["lightTopBarContainer"]),
            lightOnTopBarContainer: string(colors["lightOnTopBarContainer"]),
            darkBackground: string(colors["darkBackground"]),
            darkOnBackground: string(colors["darkOnBackground"]),
            darkPrimary: string(colors["darkPrimary"]),
            darkOnPrimary: string(colors["darkOnPrimary"]),
            darkTopBarContainer: string(colors["darkTopBarContainer"]),
            darkOnTopBarContainer: string(colors["darkOnTopBarContainer"])
        )
    }

    private static func string(_ value: JSValue?) -> String? {
        value as? String
    }

    /// A boolean from JS can arrive as `Bool` or wrapped in `NSNumber` depending on
    /// how the bridge serializes it, so both are accepted.
    private static func bool(_ value: JSValue?) -> Bool? {
        if let value = value as? Bool { return value }
        if let value = value as? NSNumber { return value.boolValue }
        return nil
    }

    private static func theme(_ value: JSValue?) -> KhipuOptions.Theme? {
        guard let raw = value as? String else { return nil }
        return KhipuOptions.Theme(rawValue: raw)
    }
}
