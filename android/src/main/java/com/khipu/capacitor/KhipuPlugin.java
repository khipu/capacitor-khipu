package com.khipu.capacitor;

import static com.khipu.client.KhipuKt.KHIPU_RESULT_EXTRA;
import static com.khipu.client.KhipuKt.getKhipuLauncherIntent;

import android.content.Intent;
import android.os.Bundle;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.khipu.client.KhipuOptions;
import java.io.Serializable;

@CapacitorPlugin(name = "Khipu")
public class KhipuPlugin extends Plugin {

    private final PendingCall pending = new PendingCall();

    @PluginMethod
    public void startOperation(PluginCall call) {
        String operationId = call.getString("operationId");
        if (operationId == null) {
            call.reject("Must provide operationId", "INVALID_OPTIONS");
            return;
        }

        KhipuOptions options;
        try {
            // Backstop: Task 8 proved this mapper cannot throw on any merchant input
            // against the current SDK version, but it calls a third-party Kotlin
            // builder we do not control across versions. If it ever does throw here,
            // uncaught, Capacitor rethrows it as a RuntimeException on the task
            // handler and the promise never settles - the app very likely dies. This
            // catch is cheap insurance against that, kept even though it is
            // unreachable today.
            options = KhipuOptionsMapper.map(call.getObject("options", new JSObject()));
        } catch (RuntimeException e) {
            call.reject("Could not read the options object", "INVALID_OPTIONS", e);
            return;
        }

        if (pending.isLive(getBridge())) {
            call.reject("An operation is already in progress", "OPERATION_IN_PROGRESS");
            return;
        }
        pending.clear();

        pending.set(call);
        try {
            startActivityForResult(call, getKhipuLauncherIntent(getContext(), operationId, options), "operationResult");
        } catch (RuntimeException e) {
            pending.clear();
            call.reject("Could not launch the Khipu activity", "LAUNCH_FAILED", e);
        }
    }

    @ActivityCallback
    private void operationResult(PluginCall call, ActivityResult result) {
        pending.clear();
        if (call == null) {
            return;
        }

        JSObject payload = KhipuResultReader.read(extra(result));
        if (payload == null) {
            call.reject("The operation returned no result", "NO_RESULT");
            return;
        }

        call.resolve(payload);
    }

    @SuppressWarnings("deprecation")
    private static Serializable extra(ActivityResult result) {
        Intent data = result.getData();
        if (data == null) {
            return null;
        }
        Bundle extras = data.getExtras();
        if (extras == null) {
            return null;
        }
        return extras.getSerializable(KHIPU_RESULT_EXTRA);
    }
}
