import UIKit
import XCTest

@testable import KhipuPlugin

final class KhipuPluginTests: XCTestCase {

    func testDeclaresTheIdentityTheCapacitorBridgeExpects() {
        let plugin = KhipuPlugin()

        XCTAssertEqual(plugin.identifier, "KhipuPlugin")
        XCTAssertEqual(plugin.jsName, "Khipu")
    }

    func testExposesOnlyStartOperationAsAPromise() {
        let plugin = KhipuPlugin()

        XCTAssertEqual(plugin.pluginMethods.count, 1)
        XCTAssertEqual(plugin.pluginMethods.first?.name, "startOperation")
        XCTAssertEqual(plugin.pluginMethods.first?.returnType, "promise")
    }

    /// Test double that lets us build a presentation chain without presenting anything.
    ///
    /// `present(_:animated:)` is not reliable in a SwiftPM test target without a host
    /// app: it fails by timing out. Instead of creating the real condition, we
    /// override the property that `topMost` reads. What's under test is our chain
    /// traversal, not UIKit's behavior.
    private final class ControllerWithPresented: UIViewController {
        var presented: UIViewController?
        override var presentedViewController: UIViewController? { presented }
    }

    func testTopMostReturnsTheSameControllerWhenNothingIsPresented() {
        let alone = ControllerWithPresented()

        XCTAssertIdentical(KhipuPlugin.topMost(from: alone), alone)
    }

    func testTopMostFollowsTheChainToTheLastPresented() {
        let root = ControllerWithPresented()
        let middle = ControllerWithPresented()
        let last = UIViewController()

        root.presented = middle
        middle.presented = last

        XCTAssertIdentical(KhipuPlugin.topMost(from: root), last)
    }
}
