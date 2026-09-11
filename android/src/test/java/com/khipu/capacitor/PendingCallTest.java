package com.khipu.capacitor;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.getcapacitor.Bridge;
import com.getcapacitor.PluginCall;
import org.junit.Test;

public class PendingCallTest {

    @Test
    public void nothingIsLiveBeforeAnyCall() {
        assertFalse(new PendingCall().isLive(mock(Bridge.class)));
    }

    @Test
    public void aCallTheBridgeStillHoldsIsLive() {
        Bridge bridge = mock(Bridge.class);
        PluginCall call = mock(PluginCall.class);
        when(call.getCallbackId()).thenReturn("call-1");
        when(bridge.getSavedCall("call-1")).thenReturn(call);

        PendingCall pending = new PendingCall();
        pending.set(call);

        assertTrue(pending.isLive(bridge));
    }

    @Test
    public void aCallTheBridgeHasReleasedIsNotLive() {
        Bridge bridge = mock(Bridge.class);
        PluginCall call = mock(PluginCall.class);
        when(call.getCallbackId()).thenReturn("call-1");
        when(bridge.getSavedCall("call-1")).thenReturn(null);

        PendingCall pending = new PendingCall();
        pending.set(call);

        // The bridge releases a call as soon as it is answered, so a pending call it no
        // longer holds is stale. Trusting our own field instead would let one stuck
        // call block every operation that follows, forever.
        assertFalse(pending.isLive(bridge));
    }

    @Test
    public void clearingMakesItNotLive() {
        Bridge bridge = mock(Bridge.class);
        PluginCall call = mock(PluginCall.class);
        when(call.getCallbackId()).thenReturn("call-1");
        when(bridge.getSavedCall("call-1")).thenReturn(call);

        PendingCall pending = new PendingCall();
        pending.set(call);
        pending.clear();

        assertFalse(pending.isLive(bridge));
    }
}
