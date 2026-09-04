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

    func testTopMostSigueLaCadenaDePresentacion() {
        let root = UIViewController()
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = root
        window.makeKeyAndVisible()

        XCTAssertIdentical(KhipuPlugin.topMost(from: root), root)

        let modal = UIViewController()
        let presentado = expectation(description: "modal presentado")
        root.present(modal, animated: false) { presentado.fulfill() }
        wait(for: [presentado], timeout: 5)

        XCTAssertIdentical(KhipuPlugin.topMost(from: root), modal)
    }
}
