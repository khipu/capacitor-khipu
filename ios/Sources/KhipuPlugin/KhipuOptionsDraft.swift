import Foundation
import KhipuClientIOS

/// Representación intermedia e inspeccionable de las opciones que llegan desde JS.
///
/// Existe por una restricción del SDK: las propiedades de `KhipuOptions` y de
/// `KhipuColors` son internas a `KhipuClientIOS`, así que desde este módulo no se
/// pueden leer y no habría forma de testear el mapeo asertando sobre el objeto ya
/// construido.
struct KhipuOptionsDraft: Equatable {
    var topBarTitle: String?
    var topBarImageUrl: String?
    var locale: String?
    var skipExitPage: Bool?
    var skipExitSuccessPage: Bool?
    var showFooter: Bool?
    var showMerchantLogo: Bool?
    var showPaymentDetails: Bool?
    var theme: KhipuOptions.Theme?
    var colors: KhipuColorsDraft?
}

struct KhipuColorsDraft: Equatable {
    var lightBackground: String?
    var lightOnBackground: String?
    var lightPrimary: String?
    var lightOnPrimary: String?
    var lightTopBarContainer: String?
    var lightOnTopBarContainer: String?
    var darkBackground: String?
    var darkOnBackground: String?
    var darkPrimary: String?
    var darkOnPrimary: String?
    var darkTopBarContainer: String?
    var darkOnTopBarContainer: String?
}
