package com.khipu.capacitor;

import com.getcapacitor.JSObject;
import com.khipu.client.KhipuColors;
import com.khipu.client.KhipuOptions;

/**
 * Translates the options object coming from JS into the native client's options.
 *
 * Reads the raw value and checks its type rather than using the coercing getters, so a
 * wrongly typed or null value is skipped instead of reaching the builder. That is not
 * tidiness: an exception thrown here does not become a rejected promise. Capacitor
 * logs it and rethrows it as a RuntimeException on the task handler
 * (Bridge.callPluginMethod), so the merchant's await never settles and the app very
 * likely goes down with it.
 *
 * The policy matches KhipuOptionsMapper.swift, so both platforms treat malformed input
 * the same way.
 */
final class KhipuOptionsMapper {

    private KhipuOptionsMapper() {}

    static KhipuOptions map(JSObject options) {
        KhipuOptions.Builder builder = new KhipuOptions.Builder();
        if (options == null) {
            return builder.build();
        }

        String title = string(options, "title");
        if (title != null) builder.topBarTitle(title);

        String titleImageUrl = string(options, "titleImageUrl");
        if (titleImageUrl != null) builder.topBarImageUrl(titleImageUrl);

        String locale = string(options, "locale");
        if (locale != null) builder.locale(locale);

        Boolean skipExitPage = bool(options, "skipExitPage");
        if (skipExitPage != null) builder.skipExitPage(skipExitPage);

        Boolean skipExitSuccessPage = bool(options, "skipExitSuccessPage");
        if (skipExitSuccessPage != null) builder.skipExitSuccessPage(skipExitSuccessPage);

        Boolean showFooter = bool(options, "showFooter");
        if (showFooter != null) builder.showFooter(showFooter);

        Boolean showMerchantLogo = bool(options, "showMerchantLogo");
        if (showMerchantLogo != null) builder.showMerchantLogo(showMerchantLogo);

        Boolean showPaymentDetails = bool(options, "showPaymentDetails");
        if (showPaymentDetails != null) builder.showPaymentDetails(showPaymentDetails);

        KhipuOptions.Theme theme = theme(options);
        if (theme != null) builder.theme(theme);

        JSObject colors = options.getJSObject("colors");
        if (colors != null) builder.colors(colors(colors));

        return builder.build();
    }

    private static KhipuColors colors(JSObject colors) {
        KhipuColors.Builder builder = new KhipuColors.Builder();

        String lightBackground = string(colors, "lightBackground");
        if (lightBackground != null) builder.lightBackground(lightBackground);

        String lightOnBackground = string(colors, "lightOnBackground");
        if (lightOnBackground != null) builder.lightOnBackground(lightOnBackground);

        String lightPrimary = string(colors, "lightPrimary");
        if (lightPrimary != null) builder.lightPrimary(lightPrimary);

        String lightOnPrimary = string(colors, "lightOnPrimary");
        if (lightOnPrimary != null) builder.lightOnPrimary(lightOnPrimary);

        String lightTopBarContainer = string(colors, "lightTopBarContainer");
        if (lightTopBarContainer != null) builder.lightTopBarContainer(lightTopBarContainer);

        String lightOnTopBarContainer = string(colors, "lightOnTopBarContainer");
        if (lightOnTopBarContainer != null) builder.lightOnTopBarContainer(lightOnTopBarContainer);

        String darkBackground = string(colors, "darkBackground");
        if (darkBackground != null) builder.darkBackground(darkBackground);

        String darkOnBackground = string(colors, "darkOnBackground");
        if (darkOnBackground != null) builder.darkOnBackground(darkOnBackground);

        String darkPrimary = string(colors, "darkPrimary");
        if (darkPrimary != null) builder.darkPrimary(darkPrimary);

        String darkOnPrimary = string(colors, "darkOnPrimary");
        if (darkOnPrimary != null) builder.darkOnPrimary(darkOnPrimary);

        String darkTopBarContainer = string(colors, "darkTopBarContainer");
        if (darkTopBarContainer != null) builder.darkTopBarContainer(darkTopBarContainer);

        String darkOnTopBarContainer = string(colors, "darkOnTopBarContainer");
        if (darkOnTopBarContainer != null) builder.darkOnTopBarContainer(darkOnTopBarContainer);

        return builder.build();
    }

    /** Only an actual JSON string counts, matching `value as? String` on iOS. */
    private static String string(JSObject source, String key) {
        Object value = source.opt(key);
        return value instanceof String ? (String) value : null;
    }

    /**
     * Package-private, not private, for the same reason as {@link #theme}: the test
     * can assert directly on it. This one is shared by five boolean fields with mixed
     * SDK defaults ({@code skipExitPage}/{@code skipExitSuccessPage} default
     * {@code false}; {@code showFooter}/{@code showMerchantLogo}/
     * {@code showPaymentDetails} default {@code true}) -- a discarded/non-boolean
     * value must come back as {@code null}, not a hardcoded {@code true} or
     * {@code false} that would coincide with whichever of those five a test happens
     * to exercise.
     */
    static Boolean bool(JSObject source, String key) {
        Object value = source.opt(key);
        return value instanceof Boolean ? (Boolean) value : null;
    }

    /**
     * Package-private, not private, so the test can assert directly on it: a
     * discarded/absent theme must come back as {@code null}, not a hardcoded
     * {@code Theme.SYSTEM}, even though the two are behaviorally identical through
     * {@link #map} today (the builder's own default happens to also be
     * {@code Theme.SYSTEM}). Returning {@code null} lets the SDK's own default apply,
     * so this mapper keeps tracking it if it ever changes; hardcoding it here would
     * freeze today's value instead.
     */
    static KhipuOptions.Theme theme(JSObject options) {
        String value = string(options, "theme");
        if ("light".equals(value)) return KhipuOptions.Theme.LIGHT;
        if ("dark".equals(value)) return KhipuOptions.Theme.DARK;
        if ("system".equals(value)) return KhipuOptions.Theme.SYSTEM;
        return null;
    }
}
