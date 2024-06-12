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

        var optionsBuilder = KhipuOptions.Builder()

        let options = call.getObject("options")
        if(options != nil) {
            if (options!["title"] != nil) {
                optionsBuilder = optionsBuilder.topBarTitle(options!["title"]! as! String)
            }

            if (options!["titleImageUrl"] != nil) {
                optionsBuilder = optionsBuilder.topBarImageUrl(options!["titleImageUrl"]! as! String)
            }

            if (options!["skipExitPage"] != nil) {
                optionsBuilder = optionsBuilder.skipExitPage(options!["skipExitPage"]! as! Bool)
            }

            if (options!["locale"] != nil) {
                optionsBuilder = optionsBuilder.locale(options!["locale"]! as! String)
            }

            if (options!["theme"] != nil) {
                let theme = options!["theme"]! as! String
                if(theme == "light") {
                    optionsBuilder = optionsBuilder.theme(.light)
                } else if (theme == "dark") {
                    optionsBuilder = optionsBuilder.theme(.dark)
                } else if (theme == "system") {
                    optionsBuilder = optionsBuilder.theme(.system)
                }
            }

            if (options!["colors"] != nil) {
                let colors = options!["colors"]! as! [String: JSValue]

                var colorsBuilder = KhipuColors.Builder()

                if (colors["lightBackground"] != nil) {
                    colorsBuilder = colorsBuilder.lightBackground(colors["lightBackground"]! as! String)
                }
                if (colors["lightOnBackground"] != nil) {
                    colorsBuilder = colorsBuilder.lightOnBackground(colors["lightOnBackground"]! as! String)
                }
                if (colors["lightPrimary"] != nil) {
                    colorsBuilder = colorsBuilder.lightPrimary(colors["lightPrimary"]! as! String)
                }
                if (colors["lightOnPrimary"] != nil) {
                    colorsBuilder = colorsBuilder.lightOnPrimary(colors["lightOnPrimary"]! as! String)
                }
                if (colors["lightTopBarContainer"] != nil) {
                    colorsBuilder = colorsBuilder.lightTopBarContainer(colors["lightTopBarContainer"]! as! String)
                }
                if (colors["lightOnTopBarContainer"] != nil) {
                    colorsBuilder = colorsBuilder.lightOnTopBarContainer(colors["lightOnTopBarContainer"]! as! String)
                }
                if (colors["darkBackground"] != nil) {
                    colorsBuilder = colorsBuilder.darkBackground(colors["darkBackground"]! as! String)
                }
                if (colors["darkOnBackground"] != nil) {
                    colorsBuilder = colorsBuilder.darkOnBackground(colors["darkOnBackground"]! as! String)
                }
                if (colors["darkPrimary"] != nil) {
                    colorsBuilder = colorsBuilder.darkPrimary(colors["darkPrimary"]! as! String)
                }
                if (colors["darkOnPrimary"] != nil) {
                    colorsBuilder = colorsBuilder.darkOnPrimary(colors["darkOnPrimary"]! as! String)
                }
                if (colors["darkTopBarContainer"] != nil) {
                    colorsBuilder = colorsBuilder.darkTopBarContainer(colors["darkTopBarContainer"]! as! String)
                }
                if (colors["darkOnTopBarContainer"] != nil) {
                    colorsBuilder = colorsBuilder.darkOnTopBarContainer(colors["darkOnTopBarContainer"]! as! String)
                }


                optionsBuilder = optionsBuilder.colors(colorsBuilder.build())
            }
        }



        guard let presenter = self.bridge?.viewController else {
            handleError(call, "new viewController in the bridge.")
            return
        }
        DispatchQueue.main.async {
            KhipuLauncher.launch(presenter: presenter,
                                 operationId: operationId,
                                 options: optionsBuilder.build()) { result in

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
