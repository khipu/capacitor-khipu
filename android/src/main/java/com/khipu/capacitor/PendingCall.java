package com.khipu.capacitor;

import com.getcapacitor.Bridge;
import com.getcapacitor.PluginCall;

/**
 * Tracks the operation currently in flight, so a second one can be refused instead of
 * silently stealing the first one's callback.
 *
 * Capacitor keys the activity callback off a single field (Plugin.lastPluginCallId), so
 * two overlapping calls mean both results go to the newest and the first promise hangs.
 *
 * Liveness is asked of the bridge, never assumed from this field alone. A call that has
 * been answered is released from the bridge's saved calls
 * (MessageHandler.sendResponseMessage -> PluginCall.release), so a pending call the
 * bridge no longer holds is stale and must not block anything. Without that check a
 * single stuck call would turn this guard into a permanent outage.
 */
final class PendingCall {

    private String callbackId;

    void set(PluginCall call) {
        callbackId = call.getCallbackId();
    }

    void clear() {
        callbackId = null;
    }

    boolean isLive(Bridge bridge) {
        return callbackId != null && bridge.getSavedCall(callbackId) != null;
    }
}
