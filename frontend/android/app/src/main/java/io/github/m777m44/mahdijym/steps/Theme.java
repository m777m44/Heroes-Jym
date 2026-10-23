package io.github.m777m44.mahdijym.steps;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.widget.RemoteViews;

import org.json.JSONException;
import org.json.JSONObject;

import io.github.m777m44.mahdijym.R;

/**
 * 9.0 — the app's theme outside the web view. The web app sends the colours of the theme on
 * screen (lib/nativeTheme.js → StepServicePlugin.setTheme): accent, background, surfaces and
 * text, light or dark. The notifications (live steps, water panel, reminders, celebrations) and
 * the status / navigation bars paint themselves with them; "Theme colours in notifications"
 * off (or nothing sent yet) keeps the classic green look.
 *
 * RemoteViews can tint text, icons and — on Android 12+ — progress bars and backgrounds, so on
 * older phones the rings keep their own colours and only text, icons and the accent follow.
 */
final class Theme {
    static final int GREEN = 0xFF30D158;
    private static final String PREFS = "mj_theme";
    private static volatile Theme cached;

    final boolean on;
    final int acc, acc2, bg, surface, surface2, ink, ink2;
    final boolean light;

    private Theme(JSONObject o) {
        boolean has = o != null && o.has("acc");
        on = has && o.optBoolean("notif", true);
        acc = color(o, "acc", GREEN);
        acc2 = color(o, "acc2", 0xFF248A3D);
        bg = color(o, "bg", 0xFF000000);
        surface = color(o, "surface", 0xFF1C1C1E);
        surface2 = color(o, "surface2", 0xFF2C2C2E);
        ink = color(o, "ink", 0xFFFFFFFF);
        ink2 = color(o, "ink2", 0xFFA1A1A6);
        light = o != null && o.optBoolean("light", false);
    }

    private static int color(JSONObject o, String k, int def) {
        if (o == null) return def;
        try { return Color.parseColor(o.optString(k, "")); } catch (RuntimeException e) { return def; }
    }

    static Theme get(Context c) {
        Theme t = cached;
        if (t != null) return t;
        SharedPreferences p = c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject o = null;
        try { o = new JSONObject(p.getString("theme", "{}")); } catch (JSONException ignored) { }
        t = new Theme(o);
        cached = t;
        return t;
    }

    static void set(Context c, JSONObject o) {
        if (o == null) return;
        c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("theme", o.toString()).apply();
        cached = new Theme(o);
    }

    // ---- colour maths ---------------------------------------------------------------------------
    static int mix(int a, int b, double k) {
        int r = (int) Math.round(Color.red(a) + (Color.red(b) - Color.red(a)) * k);
        int g = (int) Math.round(Color.green(a) + (Color.green(b) - Color.green(a)) * k);
        int bl = (int) Math.round(Color.blue(a) + (Color.blue(b) - Color.blue(a)) * k);
        return Color.rgb(r, g, bl);
    }

    static double lum(int c) {
        double[] v = { Color.red(c) / 255.0, Color.green(c) / 255.0, Color.blue(c) / 255.0 };
        for (int i = 0; i < 3; i++) v[i] = v[i] <= 0.03928 ? v[i] / 12.92 : Math.pow((v[i] + 0.055) / 1.055, 2.4);
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    }

    static int alpha(int c, int a) { return (c & 0x00FFFFFF) | (a << 24); }

    /** The accent for the small icon and app name (Android tints it itself). */
    int accent() { return on ? acc : GREEN; }

    /** The accent made readable on a dark card: dark accents (a light theme's) are lifted. */
    int onDark() {
        int a = accent();
        double l = lum(a);
        return l < 0.16 ? mix(a, 0xFFFFFFFF, 0.45) : l < 0.24 ? mix(a, 0xFFFFFFFF, 0.25) : a;
    }

    /** The accent readable on the system's notification background (light or dark per the phone). */
    int onSystem(Context c) {
        boolean night = (c.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int a = accent();
        double l = lum(a);
        if (night) return l < 0.16 ? mix(a, 0xFFFFFFFF, 0.4) : a;
        return l > 0.45 ? mix(a, 0xFF000000, 0.35) : a;
    }

    /**
     * The expanded notification's "mini screen": a deep version of the theme, so its light text
     * always reads — the theme's own background for dark themes, the accent sunk into near-black
     * for light ones.
     */
    int card() {
        if (!on) return 0xFF0C0E12;
        int base = light ? mix(acc, 0xFF0B0D11, 0.84) : mix(bg, acc, 0.10);
        if (lum(base) > 0.06) base = mix(base, 0xFF000000, 0.55);
        return base;
    }

    // ---- painting a notification ----------------------------------------------------------------
    /**
     * The live notification's steps parts in the accent, and (Android 12+) the rings, the bars and
     * the card behind the expanded layout. `big`: the expanded layout (dark card) or the collapsed
     * one (on the system background).
     */
    void paintLive(Context c, RemoteViews v, boolean big) {
        if (!on) return;
        int a = big ? onDark() : onSystem(c);
        try {
            v.setInt(R.id.n_ring_i, "setColorFilter", a);
            v.setTextColor(R.id.n_steps, a);
            if (big) { v.setTextColor(R.id.n_label, a); v.setTextColor(R.id.n_status, a); }
            if (Build.VERSION.SDK_INT >= 31) {
                v.setColorStateList(R.id.n_ring, "setProgressTintList", ColorStateList.valueOf(a));
                v.setColorStateList(R.id.n_ring, "setProgressBackgroundTintList", ColorStateList.valueOf(alpha(a, 0x44)));
                if (big) {
                    v.setColorStateList(R.id.n_root, "setBackgroundTintList", ColorStateList.valueOf(card()));
                    v.setColorStateList(R.id.n_card, "setBackgroundTintList", ColorStateList.valueOf(alpha(a, 0x2E)));
                    v.setColorStateList(R.id.n_status, "setBackgroundTintList", ColorStateList.valueOf(alpha(a, 0x33)));
                } else {
                    v.setColorStateList(R.id.ws_add, "setBackgroundTintList", ColorStateList.valueOf(a));
                }
            }
        } catch (RuntimeException ignored) { /* a view this layout doesn't have */ }
    }

    /** The water panel's card (Android 12+) — the water itself stays blue, the card follows the theme. */
    void paintCard(RemoteViews v, int rootId) {
        if (!on || Build.VERSION.SDK_INT < 31) return;
        try { v.setColorStateList(rootId, "setBackgroundTintList", ColorStateList.valueOf(card())); } catch (RuntimeException ignored) { }
    }
}
