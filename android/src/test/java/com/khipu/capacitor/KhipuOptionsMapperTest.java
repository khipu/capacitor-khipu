package com.khipu.capacitor;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

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
        KhipuOptions options = KhipuOptionsMapper.map(
            new JSObject("{\"title\":123,\"showFooter\":\"yes\",\"theme\":7,\"colors\":\"purple\"}")
        );

        assertNull(options.getTopBarTitle());
        assertNull(options.getColors());
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
    public void absentColorsLeavesTheOptionsWithoutColors() throws JSONException {
        assertNull(KhipuOptionsMapper.map(new JSObject("{}")).getColors());
    }

    @Test
    public void nullOptionsProducesUsableDefaults() {
        assertNull(KhipuOptionsMapper.map(null).getTopBarTitle());
    }
}
