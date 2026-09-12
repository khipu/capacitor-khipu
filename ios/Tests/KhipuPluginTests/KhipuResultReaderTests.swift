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

    /// The regression this file exists for. `result.exitUrl as Any` on a nil optional
    /// does not produce nil - it produces an `Any` wrapping an empty optional, so the
    /// key was written and the bridge serialised it as JSON null. Android omits these
    /// keys, and `KhipuResult` declares them `string | undefined`, which an explicit
    /// null does not satisfy. Asserting the exact key set is what kills that mutant:
    /// `XCTAssertNil(payload["exitUrl"])` would pass on the boxed-optional value.
    func testOmitsTheThreeOptionalsWhenTheSdkLeavesThemNil() throws {
        let payload = KhipuResultReader.read(try decode("{\(required)}"))

        XCTAssertEqual(
            Set(payload.keys),
            ["operationId", "exitTitle", "exitMessage", "result", "events"])
    }

    /// An explicit JSON null from the SDK has to be treated exactly like an absent key.
    func testTreatsAnExplicitNullTheSameAsAnAbsentKey() throws {
        let payload = KhipuResultReader.read(try decode("""
            {\(required), "exitUrl": null, "continueUrl": null, "failureReason": null}
            """))

        XCTAssertEqual(
            Set(payload.keys),
            ["operationId", "exitTitle", "exitMessage", "result", "events"])
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
