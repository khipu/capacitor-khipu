import Foundation
import KhipuClientIOS

/// Turns the SDK's result into the object handed back to JS.
///
/// **The key set never varies with the outcome of the payment.** All eight keys are
/// always present; the three the SDK declares optional — `exitUrl`, `continueUrl` and
/// `failureReason` — carry an explicit `null` when it has no value for them. That is
/// what `cordova-khipu` and `react-native-khipu` do, and what the Android SDK's own
/// `asJson()` does (it builds its `Gson` with `serializeNulls`).
///
/// This file has now held both encodings, so the history is worth keeping. It began as
/// `result.exitUrl as Any` inside the launch closure: an empty Swift optional cast to
/// `Any` is not nil, it is an `Any` wrapping the empty optional, so the key was written
/// and the bridge serialised it as null — the right wire format by accident, while
/// Android omitted the same keys. `8.0.0` aligned them on omitting, reasoning that
/// `KhipuResult` declared `string | undefined` and null did not satisfy it. That
/// reasoning was weaker than it looked: `tsc --strict` flags neither `=== null` against
/// `string | undefined` nor `=== undefined` against `string | null`, so the declaration
/// was as unreviewed an artefact as the cast, and treating it as ground truth begged the
/// question. The family had meanwhile settled on present-as-null, so that is where this
/// lands — this time as a decision rather than a property of a cast.
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
    /// An empty value is written as `NSNull`, not skipped: assigning nil to a
    /// `[String: Any]` subscript *removes* the key, which is the very behaviour this no
    /// longer wants. `NSNull` is what Capacitor's bridge serialises to JSON `null`.
    ///
    /// And one uniform shape is what `check-option-keys.mjs` greps for; a second
    /// spelling would hide those keys from the guard.
    ///
    /// The parameter is generic rather than `Any?` deliberately. Passing a `String?`
    /// into an `Any?` parameter re-opens the boxing question that produced the original
    /// defect; with `T?` there is no `Any` for an empty optional to hide inside.
    private static func put<T>(_ target: inout [String: Any], _ key: String, _ value: T?) {
        if let value {
            target[key] = value
        } else {
            target[key] = NSNull()
        }
    }

    private static func events(_ events: [KhipuEvent]) -> [[String: String]] {
        events.map { ["name": $0.name, "timestamp": $0.timestamp, "type": $0.type] }
    }
}
