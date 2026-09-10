package com.khipu.capacitor;

import static com.khipu.client.KhipuKt.KHIPU_RESULT_EXTRA;
import static com.khipu.client.KhipuKt.getKhipuLauncherIntent;

import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.khipu.client.KhipuOptions;
import com.khipu.client.KhipuResult;
import java.util.Objects;
import org.json.JSONException;

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
        if (call == null) {
            return;
        }

        JSObject toRet = new JSObject();
        try {
            assert result.getData() != null;
            KhipuResult khipuResult = (KhipuResult) Objects.requireNonNull(result.getData().getExtras()).getSerializable(
                KHIPU_RESULT_EXTRA
            );
            assert khipuResult != null;
            toRet = new JSObject(khipuResult.asJson());
        } catch (JSONException e) {
            call.reject("Error parsing the result");
        }
        call.resolve(toRet);
    }
}
