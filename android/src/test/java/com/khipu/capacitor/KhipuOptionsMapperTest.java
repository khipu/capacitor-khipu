package com.khipu.capacitor;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.getcapacitor.JSObject;
import com.khipu.client.KhipuColors;
import com.khipu.client.KhipuOptions;
import org.json.JSONException;
import org.junit.Test;

public class KhipuOptionsMapperTest {

    @Test
    public void mapsTheTextFields() throws JSONException {
        KhipuOptions options = KhipuOptionsMapper.map(
            new JSObject("{\"title\":\"Store\",\"titleImageUrl\":\"https://khipu.com/logo.png\",\"locale\":\"es_CL\"}")
        );

        assertEquals("Store", options.getTopBarTitle());
        assertEquals("https://khipu.com/logo.png", options.getTopBarImageUrl());
        assertEquals("es_CL", options.getLocale());
    }

    @Test
    public void mapsTheThreeThemes() throws JSONException {
        assertEquals(KhipuOptions.Theme.LIGHT, KhipuOptionsMapper.map(new JSObject("{\"theme\":\"light\"}")).getTheme());
        assertEquals(KhipuOptions.Theme.DARK, KhipuOptionsMapper.map(new JSObject("{\"theme\":\"dark\"}")).getTheme());
        assertEquals(KhipuOptions.Theme.SYSTEM, KhipuOptionsMapper.map(new JSObject("{\"theme\":\"system\"}")).getTheme());
    }

    @Test
    public void discardsWrongTypedValuesInsteadOfThrowing() throws JSONException {
        KhipuOptions options = KhipuOptionsMapper.map(new JSObject("{\"title\":123,\"colors\":\"purple\"}"));

        assertNull(options.getTopBarTitle());
        assertNull(options.getColors());
    }

    // showFooter and theme are asserted in their own tests below, not here: both of
    // their SDK defaults (true, and Theme.SYSTEM) are the exact value a discarded
    // malformed input leaves standing, so a single test that only ever sends malformed
    // input for those two fields cannot tell "correctly discarded" apart from "never
    // wired at all, always the default". Each dedicated test below pairs the malformed
    // case with a control that sends a valid, non-default value and checks it actually
    // takes effect.

    @Test
    public void readsAValidShowFooterButDiscardsAMalformedOne() throws JSONException {
        // Control: a real boolean actually flips the result away from the SDK's own
        // default (true). Without this, the assertion below could pass by accident on
        // a mapper that never reads showFooter at all.
        assertFalse(KhipuOptionsMapper.map(new JSObject("{\"showFooter\":false}")).getShowFooter());

        // A non-boolean value must be discarded, leaving the SDK's own default (true)
        // standing. Asserted against that default explicitly, not against "not false":
        // a loose assertion would also pass if `bool()` were ever swapped for a
        // coercive getter that parsed truthy strings.
        assertTrue(KhipuOptionsMapper.map(new JSObject("{\"showFooter\":\"yes\"}")).getShowFooter());
    }

    @Test
    public void discardsAMalformedThemeLeavingTheSdkDefault() throws JSONException {
        // theme:7 is not a valid theme string, so it must be discarded, leaving the
        // SDK's own default, Theme.SYSTEM, standing. The control for this field --
        // that valid theme strings actually take effect, rather than SYSTEM being
        // hardcoded regardless of input -- is mapsTheThreeThemes above, which maps
        // "light" and "dark" to non-default values.
        //
        // On its own, this can't tell "discarded, so the builder's own default stands"
        // apart from "theme() itself hardcodes a fallback of Theme.SYSTEM": both give
        // the identical, correct result here, since the SDK's default happens to also
        // be SYSTEM today. themeDiscardsMalformedInputInsteadOfHardcodingTheDefault
        // below asserts on the helper directly and does tell them apart.
        assertEquals(KhipuOptions.Theme.SYSTEM, KhipuOptionsMapper.map(new JSObject("{\"theme\":7}")).getTheme());
    }

    @Test
    public void themeDiscardsMalformedInputInsteadOfHardcodingTheDefault() throws JSONException {
        // theme() is package-private specifically so this can assert on it directly,
        // not through map()'s built KhipuOptions: discarding must produce null (letting
        // the SDK's own default apply and keep tracking it if it ever changes), not a
        // value frozen here that only happens to match today's default. A control --
        // "dark" isn't the default, so a hardcoded-fallback mutant would fail it too --
        // sits alongside the malformed case.
        assertNull(KhipuOptionsMapper.theme(new JSObject("{\"theme\":7}")));
        assertEquals(KhipuOptions.Theme.DARK, KhipuOptionsMapper.theme(new JSObject("{\"theme\":\"dark\"}")));
    }

    @Test
    public void mapsTheRemainingBooleanFields() throws JSONException {
        // Builder defaults: skipExitPage=false, skipExitSuccessPage=false,
        // showMerchantLogo=true, showPaymentDetails=true. Each value sent here is the
        // opposite of its own default, so a mapper that never wired one of these four
        // fields at all -- distinct from showFooter, which is exercised above -- would
        // leave the default standing and fail here, rather than only looking covered
        // by inheriting showFooter's already-tested wiring.
        KhipuOptions options = KhipuOptionsMapper.map(
            new JSObject(
                "{\"skipExitPage\":true,\"skipExitSuccessPage\":true," +
                "\"showMerchantLogo\":false,\"showPaymentDetails\":false}"
            )
        );

        assertTrue(options.getSkipExitPage());
        assertTrue(options.getSkipExitSuccessPage());
        assertFalse(options.getShowMerchantLogo());
        assertFalse(options.getShowPaymentDetails());
    }

    @Test
    public void boolDiscardsMalformedInputInsteadOfHardcodingATruthValue() throws JSONException {
        // bool() is package-private for the same reason as theme(): asserting on it
        // directly, rather than only through one of the five fields that call it via
        // map(), tells apart "discarded, so the SDK's own default stands" from "this
        // helper itself hardcodes a truth value". A hardcoded `return true;` or
        // `return false;` in its discard branch would fail this immediately, no matter
        // which of the five boolean fields a map()-level test happens to exercise.
        assertNull(KhipuOptionsMapper.bool(new JSObject("{\"showFooter\":\"yes\"}"), "showFooter"));
        assertEquals(Boolean.TRUE, KhipuOptionsMapper.bool(new JSObject("{\"showFooter\":true}"), "showFooter"));
        assertEquals(Boolean.FALSE, KhipuOptionsMapper.bool(new JSObject("{\"showFooter\":false}"), "showFooter"));
    }

    @Test
    public void discardsAnExplicitNullInsteadOfThrowing() throws JSONException {
        assertNull(KhipuOptionsMapper.map(new JSObject("{\"title\":null}")).getTopBarTitle());
    }

    @Test
    public void mapsTheTwelveColors() throws JSONException {
        // Each of the twelve is a distinct value, on purpose: the option-keys guard
        // already protects against a renamed key (verified separately -- renaming
        // "darkTopBarContainer" in the mapper makes verify:keys fail, naming both the
        // missing and the extra key), but it can't see a swap of two correct keys to
        // the wrong builder method, e.g. `builder.lightOnBackground(lightBackground)`.
        // Distinct values make that swap show up as a wrong value here instead of
        // passing by coincidence, which repeated hex strings (the previous fixture
        // reused "#FFFFFF", "#8347AD" and "#3CB4E5" across unrelated fields) would let
        // slip through undetected.
        KhipuOptions options = KhipuOptionsMapper.map(
            new JSObject(
                "{\"colors\":{\"lightBackground\":\"#111111\",\"lightOnBackground\":\"#222222\"," +
                "\"lightPrimary\":\"#333333\",\"lightOnPrimary\":\"#444444\"," +
                "\"lightTopBarContainer\":\"#555555\",\"lightOnTopBarContainer\":\"#666666\"," +
                "\"darkBackground\":\"#777777\",\"darkOnBackground\":\"#888888\"," +
                "\"darkPrimary\":\"#999999\",\"darkOnPrimary\":\"#AAAAAA\"," +
                "\"darkTopBarContainer\":\"#BBBBBB\",\"darkOnTopBarContainer\":\"#CCCCCC\"}}"
            )
        );

        KhipuColors colors = options.getColors();
        assertEquals("#111111", colors.getLightBackground());
        assertEquals("#222222", colors.getLightOnBackground());
        assertEquals("#333333", colors.getLightPrimary());
        assertEquals("#444444", colors.getLightOnPrimary());
        assertEquals("#555555", colors.getLightTopBarContainer());
        assertEquals("#666666", colors.getLightOnTopBarContainer());
        assertEquals("#777777", colors.getDarkBackground());
        assertEquals("#888888", colors.getDarkOnBackground());
        assertEquals("#999999", colors.getDarkPrimary());
        assertEquals("#AAAAAA", colors.getDarkOnPrimary());
        assertEquals("#BBBBBB", colors.getDarkTopBarContainer());
        assertEquals("#CCCCCC", colors.getDarkOnTopBarContainer());
    }

    @Test
    public void discardsMalformedColorValuesButStillBuildsColors() throws JSONException {
        KhipuOptions options = KhipuOptionsMapper.map(
            new JSObject("{\"colors\":{\"lightPrimary\":123,\"darkPrimary\":true}}")
        );

        assertNotNull(options.getColors());
        assertNull(options.getColors().getLightPrimary());
        assertNull(options.getColors().getDarkPrimary());
    }

    @Test
    public void absentColorsLeavesTheOptionsWithoutColors() throws JSONException {
        assertNull(KhipuOptionsMapper.map(new JSObject("{}")).getColors());
    }

    @Test
    public void nullOptionsProducesUsableDefaults() {
        assertNull(KhipuOptionsMapper.map(null).getTopBarTitle());
    }
}
