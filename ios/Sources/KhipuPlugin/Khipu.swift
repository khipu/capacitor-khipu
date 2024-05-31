import Foundation

@objc public class Khipu: NSObject {
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
}
