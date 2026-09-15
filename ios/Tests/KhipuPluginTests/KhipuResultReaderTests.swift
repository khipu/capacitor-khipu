import Capacitor
import KhipuClientIOS
import XCTest

@testable import KhipuPlugin

/// The SDK's `KhipuResult` has a public memberwise initialiser only inside its own
/// module, so these build one by decoding JSON instead. That is not a workaround worth
/// apologising for: it also lets a case distinguish an absent key from an explicit null
/// on the way in, which is the very distinction these tests are about on the way out.
final class KhipuResultReaderTests: XCTestCase {

    private func decode(_ json: String) throws -> KhipuResult {
        try JSONDecoder().decode(KhipuResult.self, from: Data(json.utf8))
    }

    private let required = """
        "operationId": "op-1", "exitTitle": "Paid", "exitMessage": "All good",
        "result": "OK", "events": []
        """

    /// The key set never varies with the outcome of the payment: all eight keys are
    /// always present, and the three optional ones carry `NSNull` when the SDK has no
    /// value. `NSNull` rather than a Swift nil because a `[String: Any]` drops a key
    /// assigned nil, and rather than `as Any` on the optional because that is an
    /// accident of casting that happens to serialise the same - this is meant to be a
    /// decision, and to read like one.
    ///
    /// Asserting the exact key set is what keeps this honest: a helper that silently
    /// went back to skipping nils would still pass every value assertion below.
    func testWritesTheThreeOptionalsAsNullWhenTheSdkLeavesThemNil() throws {
        let payload = KhipuResultReader.read(try decode("{\(required)}"))

        XCTAssertEqual(
            Set(payload.keys),
            ["operationId", "exitTitle", "exitMessage", "result", "events",
             "exitUrl", "continueUrl", "failureReason"])
        XCTAssertTrue(payload["exitUrl"] is NSNull)
        XCTAssertTrue(payload["continueUrl"] is NSNull)
        XCTAssertTrue(payload["failureReason"] is NSNull)
    }

    /// An absent key and an explicit JSON null arriving from the SDK are the same
    /// thing, and both leave as a present `null`.
    func testTreatsAnExplicitNullTheSameAsAnAbsentKey() throws {
        let payload = KhipuResultReader.read(try decode("""
            {\(required), "exitUrl": null, "continueUrl": null, "failureReason": null}
            """))

        XCTAssertEqual(Set(payload.keys).count, 8)
        XCTAssertTrue(payload["exitUrl"] is NSNull)
        XCTAssertTrue(payload["continueUrl"] is NSNull)
        XCTAssertTrue(payload["failureReason"] is NSNull)
    }

    func testWritesTheThreeOptionalsWhenTheSdkSuppliesThem() throws {
        let payload = KhipuResultReader.read(try decode("""
            {\(required), "exitUrl": "https://khipu.com/exit",
             "continueUrl": "https://khipu.com/continue", "failureReason": "USER_CANCELED"}
            """))

        XCTAssertEqual(payload["exitUrl"] as? String, "https://khipu.com/exit")
        XCTAssertEqual(payload["continueUrl"] as? String, "https://khipu.com/continue")
        XCTAssertEqual(payload["failureReason"] as? String, "USER_CANCELED")
    }

    func testCarriesTheRequiredFieldsThroughUnchanged() throws {
        let payload = KhipuResultReader.read(try decode("{\(required)}"))

        XCTAssertEqual(payload["operationId"] as? String, "op-1")
        XCTAssertEqual(payload["exitTitle"] as? String, "Paid")
        XCTAssertEqual(payload["exitMessage"] as? String, "All good")
        XCTAssertEqual(payload["result"] as? String, "OK")
    }

    /// An empty payment has no events, and the key still has to be there: `events` is
    /// declared non-optional, so omitting it would break the contract in the other
    /// direction.
    func testKeepsAnEmptyEventsArrayRatherThanOmittingIt() throws {
        let payload = KhipuResultReader.read(try decode("{\(required)}"))

        XCTAssertEqual((payload["events"] as? [[String: String]])?.isEmpty, true)
    }

    func testMapsEveryEventFieldInOrder() throws {
        let payload = KhipuResultReader.read(try decode("""
            {"operationId": "op-1", "exitTitle": "T", "exitMessage": "M", "result": "OK",
             "events": [
               {"name": "start", "timestamp": "1", "type": "info"},
               {"name": "end", "timestamp": "2", "type": "warn"}
             ]}
            """))

        let events = payload["events"] as? [[String: String]]
        XCTAssertEqual(events?.count, 2)
        XCTAssertEqual(events?[0], ["name": "start", "timestamp": "1", "type": "info"])
        XCTAssertEqual(events?[1], ["name": "end", "timestamp": "2", "type": "warn"])
    }
}
