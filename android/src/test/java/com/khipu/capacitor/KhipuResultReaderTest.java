package com.khipu.capacitor;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.getcapacitor.JSObject;
import com.khipu.client.KhipuEvent;
import com.khipu.client.KhipuResult;
import org.junit.Test;

public class KhipuResultReaderTest {

    private static KhipuResult canceled() {
        return new KhipuResult("op-1", "", "", null, null, "ERROR", new KhipuEvent[0], "USER_CANCELED");
    }

    @Test
    public void readsEveryContractField() {
        JSObject result = KhipuResultReader.read(canceled());

        assertEquals("op-1", result.getString("operationId"));
        assertEquals("ERROR", result.getString("result"));
        assertEquals("USER_CANCELED", result.getString("failureReason"));
    }

    @Test
    public void omitsTheKeysThatHaveNoValue() {
        JSObject result = KhipuResultReader.read(canceled());

        assertFalse(result.has("exitUrl"));
        assertFalse(result.has("continueUrl"));
    }

    @Test
    public void omitsFailureReasonWhenTheSdkCouldNotDetermineOne() {
        // Not hypothetical. Under IKW-1232 the SDK ends the operation when a terminal
        // message fails to deserialise, and the reason is exactly the part that failed
        // to parse, so it arrives null.
        KhipuResult withoutReason = new KhipuResult("op-1", "", "", null, null, "ERROR", new KhipuEvent[0], null);

        JSObject result = KhipuResultReader.read(withoutReason);

        assertEquals("ERROR", result.getString("result"));
        assertFalse(result.has("failureReason"));
    }

    @Test
    public void alwaysCarriesTheEventsArray() {
        assertTrue(KhipuResultReader.read(canceled()).has("events"));
    }

    @Test
    public void aResultCodeIsNotPartOfTheDecision() {
        // The reader never sees one. Both of the SDK's exits carry a full KhipuResult:
        // RESULT_OK from the normal path, RESULT_CANCELED from the destroyed-too-long
        // abort at KhipuActivity.kt:119. Branching on the code would make the same
        // outcome arrive in two shapes.
        assertEquals("op-1", KhipuResultReader.read(canceled()).getString("operationId"));
    }

    @Test
    public void returnsNullWhenThereIsNoPayload() {
        assertNull(KhipuResultReader.read(null));
    }

    @Test
    public void returnsNullWhenThePayloadIsSomethingElse() {
        assertNull(KhipuResultReader.read("not a result"));
    }
}
