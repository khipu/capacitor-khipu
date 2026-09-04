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
}
