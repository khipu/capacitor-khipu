import Foundation
import Capacitor
import KhipuClientIOS

@objc(KhipuPlugin)
public class KhipuPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KhipuPlugin"
    public let jsName = "Khipu"

    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startOperation", returnType: CAPPluginReturnPromise)
    ]

    @objc func startOperation(_ call: CAPPluginCall) {
        guard let operationId = call.getString("operationId") else {
            handleError(call, "operationId must be provided and must be a string.")
            return
        }

        let options = KhipuOptionsMapper.map(call.getObject("options"))

        guard let bridgeController = self.bridge?.viewController else {
            handleError(call, "no viewController in the bridge.")
            return
        }

        DispatchQueue.main.async {
            let presenter = Self.topMost(from: bridgeController)
            KhipuLauncher.launch(presenter: presenter,
                                 operationId: operationId,
                                 options: options) { result in
                call.resolve(KhipuResultReader.read(result))
            }
        }


    }

    /// Returns the controller that is actually on top, following the presentation chain
    /// from the one the bridge gives us.
    ///
    /// UIKit refuses to present over a controller that is already presenting, so
    /// without this the payment sheet does not show up when the merchant has their own
    /// modal on screen.
    ///
    /// Deliberately NOT a `UIViewController` extension: the plugin links statically
    /// into the merchant's app, and a name like `topMostViewController` injected there
    /// could collide with theirs.
    static func topMost(from controller: UIViewController) -> UIViewController {
        var top = controller
        while let presented = top.presentedViewController {
            top = presented
        }
        return top
    }

    private func handleError(_ call: CAPPluginCall, _ message: String, _ error: Error? = nil) {
        call.reject(message, nil, error)
    }
}
