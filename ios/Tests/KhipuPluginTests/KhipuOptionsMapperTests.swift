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

    // Each of the twelve is a distinct value, on purpose: the option-keys guard already
    // protects against a renamed key, but it can't see a swap of two correct keys to
    // the wrong builder assignment, e.g. `lightOnBackground` assigned `lightBackground`'s
    // value. Distinct values make that swap show up as a wrong value here instead of
    // passing by coincidence, which repeated hex strings (the previous fixture reused
    // "#FFFFFF", "#8347AD" and "#3CB4E5" across unrelated fields) would let slip through
    // undetected. Mirrors `KhipuOptionsMapperTest.java`'s `mapsTheTwelveColors`.
    func testMapsTheTwelveColors() {
        let colors: JSObject = [
            "lightBackground": "#111111",
            "lightOnBackground": "#222222",
            "lightPrimary": "#333333",
            "lightOnPrimary": "#444444",
            "lightTopBarContainer": "#555555",
            "lightOnTopBarContainer": "#666666",
            "darkBackground": "#777777",
            "darkOnBackground": "#888888",
            "darkPrimary": "#999999",
            "darkOnPrimary": "#AAAAAA",
            "darkTopBarContainer": "#BBBBBB",
            "darkOnTopBarContainer": "#CCCCCC"
        ]

        let draft = KhipuOptionsMapper.draft(from: ["colors": colors])

        XCTAssertEqual(
            draft.colors,
            KhipuColorsDraft(
                lightBackground: "#111111",
                lightOnBackground: "#222222",
                lightPrimary: "#333333",
                lightOnPrimary: "#444444",
                lightTopBarContainer: "#555555",
                lightOnTopBarContainer: "#666666",
                darkBackground: "#777777",
                darkOnBackground: "#888888",
                darkPrimary: "#999999",
                darkOnPrimary: "#AAAAAA",
                darkTopBarContainer: "#BBBBBB",
                darkOnTopBarContainer: "#CCCCCC"
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
