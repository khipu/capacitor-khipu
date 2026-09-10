package com.khipu.capacitor;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.khipu.client.KhipuEvent;
import com.khipu.client.KhipuResult;
import java.io.Serializable;

/**
 * Turns the activity's payload into the object handed back to JS, or null when there is
 * no usable payload.
 *
 * Takes the extra rather than the Intent so it can be unit tested without Android, and
 * so it cannot see the activity's result code. That is deliberate: both of the SDK's
 * exits carry a complete KhipuResult — the normal one at KhipuActivity.kt:320 and the
 * destroyed-too-long abort at :119, which reports USER_CANCELED. Branching on the code
 * would make the same outcome, the user abandoning the payment, arrive in two different
 * shapes depending on an invisible timing detail.
 *
 * The object is built key by key rather than through KhipuResult.asJson(), which is
 * Gson with nulls dropped: it silently omits exitUrl, continueUrl and failureReason,
 * and it puts the field names out of reach of the vocabulary guard.
 */
final class KhipuResultReader {

    private KhipuResultReader() {}

    static JSObject read(Serializable extra) {
        if (!(extra instanceof KhipuResult)) {
            return null;
        }

        KhipuResult source = (KhipuResult) extra;
        JSObject result = new JSObject();
        put(result, "operationId", source.getOperationId());
        put(result, "exitTitle", source.getExitTitle());
        put(result, "exitMessage", source.getExitMessage());
        put(result, "result", source.getResult());
        put(result, "exitUrl", source.getExitUrl());
        put(result, "continueUrl", source.getContinueUrl());
        put(result, "failureReason", source.getFailureReason());
        put(result, "events", events(source.getEvents()));
        return result;
    }

    /**
     * Every key goes through here, in one call shape, for two reasons.
     *
     * A null value is skipped rather than written: an absent key reads as `undefined`
     * in JS, which is what `string | undefined` promises, while an explicit null would
     * not satisfy that type. `events` is never null, so it is always written.
     *
     * And one uniform shape is what `check-option-keys.mjs` greps for. A second
     * spelling would hide those keys from the guard — which is exactly how the old
     * `asJson()` call kept the whole result out of its reach.
     */
    private static void put(JSObject target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    private static JSArray events(KhipuEvent[] events) {
        JSArray array = new JSArray();
        if (events == null) {
            return array;
        }
        for (KhipuEvent event : events) {
            JSObject item = new JSObject();
            item.put("name", event.getName());
            item.put("timestamp", event.getTimestamp());
            item.put("type", event.getType());
            array.put(item);
        }
        return array;
    }
}
