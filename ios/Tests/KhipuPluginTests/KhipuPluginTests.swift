import UIKit
import XCTest

@testable import KhipuPlugin

final class KhipuPluginTests: XCTestCase {

    func testDeclaraLaIdentidadQueElPuenteDeCapacitorEspera() {
        let plugin = KhipuPlugin()

        XCTAssertEqual(plugin.identifier, "KhipuPlugin")
        XCTAssertEqual(plugin.jsName, "Khipu")
    }

    func testExponeSoloStartOperationComoPromesa() {
        let plugin = KhipuPlugin()

        XCTAssertEqual(plugin.pluginMethods.count, 1)
        XCTAssertEqual(plugin.pluginMethods.first?.name, "startOperation")
        XCTAssertEqual(plugin.pluginMethods.first?.returnType, "promise")
    }

    /// Doble que permite armar una cadena de presentación sin presentar nada.
    ///
    /// `present(_:animated:)` no es fiable en un test target de SwiftPM sin app
    /// anfitriona: falla por timeout. En vez de crear la condición real, se
    /// sobreescribe la propiedad que `topMost` consulta. Lo que se testea es nuestro
    /// recorrido de la cadena, no el comportamiento de UIKit.
    private final class ControladorConPresentado: UIViewController {
        var presentado: UIViewController?
        override var presentedViewController: UIViewController? { presentado }
    }

    func testTopMostDevuelveElMismoControladorCuandoNoHayNadaPresentado() {
        let solo = ControladorConPresentado()

        XCTAssertIdentical(KhipuPlugin.topMost(from: solo), solo)
    }

    func testTopMostSigueLaCadenaHastaElUltimoPresentado() {
        let raiz = ControladorConPresentado()
        let intermedio = ControladorConPresentado()
        let ultimo = UIViewController()

        raiz.presentado = intermedio
        intermedio.presentado = ultimo

        XCTAssertIdentical(KhipuPlugin.topMost(from: raiz), ultimo)
    }
}
