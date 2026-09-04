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

                var events: [[String:String]] = []

                for event in result.events {
                    events.append([
                        "name": event.name,
                        "timestamp": event.timestamp,
                        "type": event.type
                    ])
                }

                call.resolve([
                    "operationId": result.operationId,
                    "exitTitle": result.exitTitle,
                    "exitMessage": result.exitMessage,
                    "exitUrl": result.exitUrl as Any,
                    "result": result.result,
                    "failureReason": result.failureReason as Any,
                    "continueUrl": result.continueUrl as Any,
                    "events": events
                ])
            }
        }


    }

    /// Devuelve el controlador que está efectivamente arriba, siguiendo la cadena de
    /// presentación desde el que da el puente.
    ///
    /// UIKit rechaza presentar sobre un controlador que ya está presentando, así que
    /// sin esto el pago no aparece cuando el comercio tiene su propio modal en
    /// pantalla.
    ///
    /// Deliberadamente NO es una extensión de `UIViewController`: el plugin se enlaza
    /// estáticamente en la app del comercio, y un nombre como `topMostViewController`
    /// inyectado ahí puede chocar con el suyo.
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
