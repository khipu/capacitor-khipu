import Capacitor
import KhipuClientIOS
import XCTest

@testable import KhipuPlugin

final class KhipuOptionsMapperTests: XCTestCase {

    func testDraftIsEmptyWithoutOptions() {
        XCTAssertEqual(KhipuOptionsMapper.draft(from: nil), KhipuOptionsDraft())
        XCTAssertEqual(KhipuOptionsMapper.draft(from: JSObject()), KhipuOptionsDraft())
    }

    func testMapsTheTextFields() {
        let draft = KhipuOptionsMapper.draft(from: [
            "title": "Demo Capacitor",
            "titleImageUrl": "https://khipu.com/logo.png",
            "locale": "es_CL"
        ])

        XCTAssertEqual(draft.topBarTitle, "Demo Capacitor")
        XCTAssertEqual(draft.topBarImageUrl, "https://khipu.com/logo.png")
        XCTAssertEqual(draft.locale, "es_CL")
    }

    func testMapsTheFiveBooleans() {
        let draft = KhipuOptionsMapper.draft(from: [
            "skipExitPage": true,
            "skipExitSuccessPage": true,
            "showFooter": true,
            "showMerchantLogo": true,
            "showPaymentDetails": true
        ])

        XCTAssertEqual(draft.skipExitPage, true)
        XCTAssertEqual(draft.skipExitSuccessPage, true)
        XCTAssertEqual(draft.showFooter, true)
        XCTAssertEqual(draft.showMerchantLogo, true)
        XCTAssertEqual(draft.showPaymentDetails, true)
    }

    func testFalseBooleanDiffersFromAbsentBoolean() {
        let present = KhipuOptionsMapper.draft(from: ["showFooter": false])
        let absent = KhipuOptionsMapper.draft(from: JSObject())

        XCTAssertEqual(present.showFooter, false)
        XCTAssertNil(absent.showFooter)
    }

    func testAcceptsBooleansWrappedInNSNumber() {
        let draft = KhipuOptionsMapper.draft(from: ["showFooter": NSNumber(value: true)])

        XCTAssertEqual(draft.showFooter, true)
    }

    func testMapsTheThreeThemes() {
        XCTAssertEqual(KhipuOptionsMapper.draft(from: ["theme": "light"]).theme, .light)
        XCTAssertEqual(KhipuOptionsMapper.draft(from: ["theme": "dark"]).theme, .dark)
        XCTAssertEqual(KhipuOptionsMapper.draft(from: ["theme": "system"]).theme, .system)
    }

    func testIgnoresAnUnknownTheme() {
        XCTAssertNil(KhipuOptionsMapper.draft(from: ["theme": "neon"]).theme)
    }

    func testMapsTheTwelveColors() {
        let colors: JSObject = [
            "lightBackground": "#FFFFFF",
            "lightOnBackground": "#1A1A1A",
            "lightPrimary": "#8347AD",
            "lightOnPrimary": "#FFFFFF",
            "lightTopBarContainer": "#8347AD",
            "lightOnTopBarContainer": "#FFFFFF",
            "darkBackground": "#121212",
            "darkOnBackground": "#EDEDED",
            "darkPrimary": "#3CB4E5",
            "darkOnPrimary": "#0B0B0B",
            "darkTopBarContainer": "#1E1E1E",
            "darkOnTopBarContainer": "#3CB4E5"
        ]

        let draft = KhipuOptionsMapper.draft(from: ["colors": colors])

        XCTAssertEqual(
            draft.colors,
            KhipuColorsDraft(
                lightBackground: "#FFFFFF",
                lightOnBackground: "#1A1A1A",
                lightPrimary: "#8347AD",
                lightOnPrimary: "#FFFFFF",
                lightTopBarContainer: "#8347AD",
                lightOnTopBarContainer: "#FFFFFF",
                darkBackground: "#121212",
                darkOnBackground: "#EDEDED",
                darkPrimary: "#3CB4E5",
                darkOnPrimary: "#0B0B0B",
                darkTopBarContainer: "#1E1E1E",
                darkOnTopBarContainer: "#3CB4E5"
            )
        )
    }

    func testAbsentColorsLeavesTheDraftWithoutColors() {
        XCTAssertNil(KhipuOptionsMapper.draft(from: JSObject()).colors)
    }

    func testEmptyColorsProducesAnEmptyColorsDraft() {
        let draft = KhipuOptionsMapper.draft(from: ["colors": JSObject()])

        XCTAssertEqual(draft.colors, KhipuColorsDraft())
    }

    func testDiscardsWrongTypedValuesInsteadOfCrashing() {
        let draft = KhipuOptionsMapper.draft(from: [
            "title": 123,
            "titleImageUrl": true,
            "showFooter": "yes",
            "theme": 7,
            "colors": "purple"
        ])

        XCTAssertEqual(draft, KhipuOptionsDraft())
    }

    func testBuildsTheNativeOptionsWithoutCrashing() {
        XCTAssertNotNil(KhipuOptionsMapper.map(["title": "Demo", "theme": "dark"]))
    }
}
