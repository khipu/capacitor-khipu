import Capacitor
import Foundation
import KhipuClientIOS

/// Traduce el diccionario de opciones que llega desde JS a las opciones nativas
/// del cliente de Khipu.
///
/// Descarta los valores de tipo incorrecto en vez de hacer crashear la app: el
/// mapeo anterior usaba `as!`, así que un `title: 123` enviado desde JS terminaba
/// en un crash en vez de en un valor ignorado.
enum KhipuOptionsMapper {

    static func map(_ options: JSObject?) -> KhipuOptions {
        apply(draft(from: options))
    }

    /// JS -> draft. Concentra toda la lógica y es el paso que cubren los tests.
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

    /// draft -> `KhipuOptions`. Mecánico: una línea por campo.
    ///
    /// **Hueco aceptado a propósito, documentado para que sea revisable.** Los tests
    /// cubren `draft(from:)`, no `apply(_:)`. Si alguien intercambiara `lightPrimary`
    /// por `lightOnPrimary` aquí, los tests seguirían pasando. Se acepta porque
    /// `apply(_:)` es una línea por campo, visualmente alineada, y la revisión de
    /// código lo cubre a ese tamaño. **El límite:** en el momento en que `apply(_:)`
    /// gane un condicional, una transformación o una rama, deja de ser defendible y
    /// necesita tests propios.
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

    /// Un booleano de JS puede llegar como `Bool` o envuelto en `NSNumber` según
    /// cómo lo serialice el puente, así que se aceptan ambos.
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
