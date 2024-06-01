package com.khipu.capacitor;

import static com.khipu.client.KhipuKt.getKhipuLauncherIntent;
import static com.khipu.client.KhipuKt.KHIPU_RESULT_EXTRA;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.khipu.client.KhipuColors;
import com.khipu.client.KhipuOptions;
import com.khipu.client.KhipuResult;

import org.json.JSONException;

import java.util.Objects;

@CapacitorPlugin(name = "Khipu")
public class KhipuPlugin extends Plugin {


@PluginMethod
    public void startOperation(PluginCall call) {
        String operationId = call.getString("operationId");
        if (operationId == null) {
            call.reject("Must provide operationId");
            return;
        }
        KhipuOptions.Builder optionsBuilder = new KhipuOptions.Builder();
        JSObject options = call.getObject("options", new JSObject());

        assert options != null;
        if(options.has("title")) {
            optionsBuilder.topBarTitle(Objects.requireNonNull(options.getString("title")));
        }
        if(options.has("skipExitPage")) {
            optionsBuilder.skipExitPage(Boolean.TRUE.equals(options.getBool("skipExitPage")));
        }
        if(options.has("locale")) {
            optionsBuilder.locale(Objects.requireNonNull(options.getString("locale")));
        }
        if(options.has("theme")) {
            String theme = options.getString("theme");
            if("light".equals(theme)) {
                optionsBuilder.theme(KhipuOptions.Theme.LIGHT);
            } else if ("dark".equals(theme)) {
                optionsBuilder.theme(KhipuOptions.Theme.DARK);
            } else if ("system".equals(theme)) {
                optionsBuilder.theme(KhipuOptions.Theme.SYSTEM);
            }
        }

        KhipuColors.Builder colorsBuilder = new KhipuColors.Builder();
        if(options.has("colors")){
            JSObject colors = options.getJSObject("colors");
            assert colors != null;
            if(colors.has("lightBackground")) {
                colorsBuilder.lightBackground(Objects.requireNonNull(colors.getString("lightBackground")));
            }
            if(colors.has("lightOnBackground")) {
                colorsBuilder.lightOnBackground(Objects.requireNonNull(colors.getString("lightOnBackground")));
            }
            if(colors.has("lightPrimary")) {
                colorsBuilder.lightPrimary(Objects.requireNonNull(colors.getString("lightPrimary")));
            }
            if(colors.has("lightOnPrimary")) {
                colorsBuilder.lightOnPrimary(Objects.requireNonNull(colors.getString("lightOnPrimary")));
            }
            if(colors.has("lightTopBarContainer")) {
                colorsBuilder.lightTopBarContainer(Objects.requireNonNull(colors.getString("lightTopBarContainer")));
            }
            if(colors.has("lightOnTopBarContainer")) {
                colorsBuilder.lightOnTopBarContainer(Objects.requireNonNull(colors.getString("lightOnTopBarContainer")));
            }
            if(colors.has("darkBackground")) {
                colorsBuilder.darkBackground(Objects.requireNonNull(colors.getString("darkBackground")));
            }
            if(colors.has("darkOnBackground")) {
                colorsBuilder.darkOnBackground(Objects.requireNonNull(colors.getString("darkOnBackground")));
            }
            if(colors.has("darkPrimary")) {
                colorsBuilder.darkPrimary(Objects.requireNonNull(colors.getString("darkPrimary")));
            }
            if(colors.has("darkOnPrimary")) {
                colorsBuilder.darkOnPrimary(Objects.requireNonNull(colors.getString("darkOnPrimary")));
            }
            if(colors.has("darkTopBarContainer")) {
                colorsBuilder.darkTopBarContainer(Objects.requireNonNull(colors.getString("darkTopBarContainer")));
            }
            if(colors.has("darkOnTopBarContainer")) {
                colorsBuilder.darkOnTopBarContainer(Objects.requireNonNull(colors.getString("darkOnTopBarContainer")));
            }
        }
        optionsBuilder.colors(colorsBuilder.build());
        startActivityForResult(call, getKhipuLauncherIntent(
                getContext(),
                operationId,
                optionsBuilder.build()
        ), "operationResult");
    }

    @ActivityCallback
    private void operationResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        JSObject toRet = new JSObject();
        try {
            assert result.getData() != null;
            KhipuResult khipuResult = (KhipuResult) Objects.requireNonNull(result.getData().getExtras()).getSerializable(KHIPU_RESULT_EXTRA);
            assert khipuResult != null;
            toRet = new JSObject(khipuResult.asJson());
        } catch (JSONException e) {
            call.reject("Error parsing the result");
        }
        call.resolve(toRet);
    }
}
