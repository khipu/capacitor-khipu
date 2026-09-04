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

        guard let presenter = self.bridge?.viewController else {
            handleError(call, "new viewController in the bridge.")
            return
        }
        DispatchQueue.main.async {
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

    private func handleError(_ call: CAPPluginCall, _ message: String, _ error: Error? = nil) {
        call.reject(message, nil, error)
    }
}
