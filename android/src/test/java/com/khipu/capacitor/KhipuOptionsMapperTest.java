package com.khipu.capacitor;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.getcapacitor.JSObject;
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
        // What this cannot tell apart, and no assertion on the built KhipuOptions can:
        // theme() returning null for malformed input (so the builder's own default
        // stands) versus theme() itself hardcoding a fallback of Theme.SYSTEM. Both
        // produce the identical, correct result for every malformed input, so they are
        // behaviorally indistinguishable from outside the mapper.
        assertEquals(KhipuOptions.Theme.SYSTEM, KhipuOptionsMapper.map(new JSObject("{\"theme\":7}")).getTheme());
    }

    @Test
    public void discardsAnExplicitNullInsteadOfThrowing() throws JSONException {
        assertNull(KhipuOptionsMapper.map(new JSObject("{\"title\":null}")).getTopBarTitle());
    }

    @Test
    public void mapsTheTwelveColors() throws JSONException {
        KhipuOptions options = KhipuOptionsMapper.map(
            new JSObject(
                "{\"colors\":{\"lightBackground\":\"#FFFFFF\",\"lightOnBackground\":\"#1A1A1A\"," +
                "\"lightPrimary\":\"#8347AD\",\"lightOnPrimary\":\"#FFFFFF\"," +
                "\"lightTopBarContainer\":\"#8347AD\",\"lightOnTopBarContainer\":\"#FFFFFF\"," +
                "\"darkBackground\":\"#121212\",\"darkOnBackground\":\"#EDEDED\"," +
                "\"darkPrimary\":\"#3CB4E5\",\"darkOnPrimary\":\"#0B0B0B\"," +
                "\"darkTopBarContainer\":\"#1E1E1E\",\"darkOnTopBarContainer\":\"#3CB4E5\"}}"
            )
        );

        assertEquals("#8347AD", options.getColors().getLightPrimary());
        assertEquals("#3CB4E5", options.getColors().getDarkPrimary());
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
