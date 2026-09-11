import Foundation
import KhipuClientIOS

/// Intermediate, inspectable representation of the options coming in from JS.
///
/// It exists because of an SDK constraint: the properties of `KhipuOptions` and
/// `KhipuColors` are internal to `KhipuClientIOS`, so they cannot be read from this
/// module, and there would be no way to test the mapping by asserting on the
/// already-built object.
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
