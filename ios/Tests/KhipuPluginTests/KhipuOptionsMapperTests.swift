import Capacitor
import KhipuClientIOS
import XCTest

@testable import KhipuPlugin

final class KhipuOptionsMapperTests: XCTestCase {

    func testSinOpcionesElDraftQuedaVacio() {
        XCTAssertEqual(KhipuOptionsMapper.draft(from: nil), KhipuOptionsDraft())
        XCTAssertEqual(KhipuOptionsMapper.draft(from: JSObject()), KhipuOptionsDraft())
    }

    func testMapeaLosCamposDeTexto() {
        let draft = KhipuOptionsMapper.draft(from: [
            "title": "Demo Capacitor",
            "titleImageUrl": "https://khipu.com/logo.png",
            "locale": "es_CL"
        ])

        XCTAssertEqual(draft.topBarTitle, "Demo Capacitor")
        XCTAssertEqual(draft.topBarImageUrl, "https://khipu.com/logo.png")
        XCTAssertEqual(draft.locale, "es_CL")
    }

    func testMapeaLosCincoBooleanos() {
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

    func testUnBooleanoEnFalseSeDistingueDeUnBooleanoAusente() {
        let presente = KhipuOptionsMapper.draft(from: ["showFooter": false])
        let ausente = KhipuOptionsMapper.draft(from: JSObject())

        XCTAssertEqual(presente.showFooter, false)
        XCTAssertNil(ausente.showFooter)
    }

    func testAceptaBooleanosEnvueltosEnNSNumber() {
        let draft = KhipuOptionsMapper.draft(from: ["showFooter": NSNumber(value: true)])

        XCTAssertEqual(draft.showFooter, true)
    }

    func testMapeaLosTresTemas() {
        XCTAssertEqual(KhipuOptionsMapper.draft(from: ["theme": "light"]).theme, .light)
        XCTAssertEqual(KhipuOptionsMapper.draft(from: ["theme": "dark"]).theme, .dark)
        XCTAssertEqual(KhipuOptionsMapper.draft(from: ["theme": "system"]).theme, .system)
    }

    func testIgnoraUnTemaDesconocido() {
        XCTAssertNil(KhipuOptionsMapper.draft(from: ["theme": "neon"]).theme)
    }

    func testMapeaLosDoceColores() {
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

    func testColorsAusenteDejaElDraftSinColores() {
        XCTAssertNil(KhipuOptionsMapper.draft(from: JSObject()).colors)
    }

    func testColorsVacioProduceUnDraftDeColoresVacio() {
        let draft = KhipuOptionsMapper.draft(from: ["colors": JSObject()])

        XCTAssertEqual(draft.colors, KhipuColorsDraft())
    }

    func testDescartaValoresDeTipoIncorrectoEnVezDeCrashear() {
        let draft = KhipuOptionsMapper.draft(from: [
            "title": 123,
            "titleImageUrl": true,
            "showFooter": "sí",
            "theme": 7,
            "colors": "morado"
        ])

        XCTAssertEqual(draft, KhipuOptionsDraft())
    }

    func testConstruyeLasOpcionesNativasSinCrashear() {
        XCTAssertNotNil(KhipuOptionsMapper.map(["title": "Demo", "theme": "dark"]))
    }
}
