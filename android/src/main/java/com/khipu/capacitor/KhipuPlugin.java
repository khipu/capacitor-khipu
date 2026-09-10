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

    @PluginMethod
    public void startOperation(PluginCall call) {
        String operationId = call.getString("operationId");
        if (operationId == null) {
            call.reject("Must provide operationId");
            return;
        }
        KhipuOptions options = KhipuOptionsMapper.map(call.getObject("options", new JSObject()));
        startActivityForResult(call, getKhipuLauncherIntent(getContext(), operationId, options), "operationResult");
    }

    @ActivityCallback
    private void operationResult(PluginCall call, ActivityResult result) {
        // TODO(Task 10): pending.clear() belongs here once `pending` is introduced.
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
