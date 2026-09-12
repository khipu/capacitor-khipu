import KhipuClientIOS

/// Turns the SDK's result into the object handed back to JS.
///
/// This used to be a dictionary literal inside the launch closure, and it built the
/// three optional keys with `result.exitUrl as Any`. That cast is the reason iOS and
/// Android disagreed for the whole life of the plugin: `Optional<String>.none as Any`
/// is not nil, it is an `Any` wrapping an empty optional, so the key was written and
/// the bridge serialised it as JSON null. Android omitted the same keys, and
/// `KhipuResult` declares them `string | undefined` - which an explicit null does not
/// satisfy. Both platforms now omit, and the contract is the thing they agree on.
///
/// Extracted from the closure so it can be unit tested at all, mirroring
/// `KhipuResultReader.java` on the other side.
enum KhipuResultReader {

    static func read(_ source: KhipuResult) -> [String: Any] {
        var result: [String: Any] = [:]
        put(&result, "operationId", source.operationId)
        put(&result, "exitTitle", source.exitTitle)
        put(&result, "exitMessage", source.exitMessage)
        put(&result, "result", source.result)
        put(&result, "exitUrl", source.exitUrl)
        put(&result, "continueUrl", source.continueUrl)
        put(&result, "failureReason", source.failureReason)
        put(&result, "events", events(source.events))
        return result
    }

    /// Every key goes through here, in one call shape, for the same two reasons as the
    /// Java counterpart.
    ///
    /// A nil value is skipped rather than written, so the key is absent and reads as
    /// `undefined` in JS, which is what `string | undefined` promises.
    ///
    /// And one uniform shape is what `check-option-keys.mjs` greps for; a second
    /// spelling would hide those keys from the guard.
    ///
    /// The parameter is generic rather than `Any?` deliberately. Passing a `String?`
    /// into an `Any?` parameter re-opens the very boxing question that caused the bug
    /// above; with `T?` there is no `Any` for an empty optional to hide inside.
    private static func put<T>(_ target: inout [String: Any], _ key: String, _ value: T?) {
        guard let value else {
            return
        }
        target[key] = value
    }

    private static func events(_ events: [KhipuEvent]) -> [[String: String]] {
        events.map { ["name": $0.name, "timestamp": $0.timestamp, "type": $0.type] }
    }
}
