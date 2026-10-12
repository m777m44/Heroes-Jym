package io.github.m777m44.mahdijym.steps;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

/**
 * Water drunk per day, kept natively so the reminder's "Drank it" button works with the app
 * closed (prefs "mj_water"):
 *   days   { "YYYY-MM-DD": { ml, at } }     at = wall clock of the last change (merge key)
 *   config the settings + translated texts sent by the web app (configureWater)
 * The web app merges both ways — the later change of a day wins.
 */
final class WaterStore {
    private static final String PREFS = "mj_water";
    private static final int KEEP_DAYS = 62;
    private static WaterStore instance;

    interface Listener { void onWater(JSONObject snapshot); }
    static volatile Listener listener;

    private final SharedPreferences prefs;
    private JSONObject days;
    private JSONObject config;
    String celebratedDay;      // the day the water goal was last celebrated
    long snoozedAt;

    private WaterStore(Context c) {
        prefs = c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        days = parse(prefs.getString("days", null));
        config = parse(prefs.getString("config", null));
        celebratedDay = prefs.getString("celebratedDay", "");
        snoozedAt = prefs.getLong("snoozedAt", 0);
    }

    static synchronized WaterStore get(Context c) {
        if (instance == null) instance = new WaterStore(c);
        return instance;
    }

    private static JSONObject parse(String s) {
        if (s == null || s.isEmpty()) return new JSONObject();
        try { return new JSONObject(s); } catch (JSONException e) { return new JSONObject(); }
    }

    synchronized void save() {
        prefs.edit()
            .putString("days", days.toString())
            .putString("config", config.toString())
            .putString("celebratedDay", celebratedDay == null ? "" : celebratedDay)
            .putLong("snoozedAt", snoozedAt)
            .apply();
    }

    // ---- days --------------------------------------------------------------------------

    synchronized int ml(String day) {
        JSONObject d = days.optJSONObject(day);
        return d == null ? 0 : Math.max(0, d.optInt("ml", 0));
    }

    synchronized long at(String day) {
        JSONObject d = days.optJSONObject(day);
        return d == null ? 0 : d.optLong("at", 0);
    }

    synchronized int todayMl() { return ml(StepStore.today()); }

    /** Set a day's ml if `at` is newer than what we have (or force). Returns true when changed. */
    synchronized boolean set(String day, int ml, long at, boolean force) {
        if (day == null || !day.matches("\\d{4}-\\d\\d-\\d\\d")) return false;
        if (!force && at <= at(day)) return false;
        try {
            JSONObject d = new JSONObject();
            d.put("ml", WaterMath.clampMl(ml, 8000));
            d.put("at", at);
            days.put(day, d);
        } catch (JSONException e) { return false; }
        prune();
        save();
        return true;
    }

    /** Add to today (the "Drank it" button). Returns today's new total. */
    synchronized int add(int deltaMl) {
        String day = StepStore.today();
        set(day, ml(day) + deltaMl, System.currentTimeMillis(), true);
        return ml(day);
    }

    private void prune() {
        if (days.length() <= KEEP_DAYS) return;
        List<String> keys = new ArrayList<>();
        Iterator<String> it = days.keys();
        while (it.hasNext()) keys.add(it.next());
        Collections.sort(keys);
        for (int i = 0; i < keys.size() - KEEP_DAYS; i++) days.remove(keys.get(i));
    }

    synchronized JSONObject daysCopy() {
        try { return new JSONObject(days.toString()); } catch (JSONException e) { return new JSONObject(); }
    }

    synchronized JSONObject snapshot() {
        JSONObject o = new JSONObject();
        try {
            String day = StepStore.today();
            o.put("day", day);
            o.put("ml", ml(day));
            o.put("at", at(day));
            o.put("goal", goal());
        } catch (JSONException ignored) { }
        return o;
    }

    // ---- config ------------------------------------------------------------------------

    synchronized void setConfig(JSONObject c) {
        if (c != null) config = c;
        save();
    }

    synchronized boolean configured() { return config.length() > 0; }
    synchronized boolean trackerOn() { return configured() && config.optBoolean("on", true); }
    synchronized int goal() { int g = config.optInt("goalMl", 2000); return g >= 500 && g <= 6000 ? g : 2000; }
    synchronized int unitMl() { int u = config.optInt("unitMl", 250); return u >= 50 && u <= 2000 ? u : 250; }
    synchronized boolean pref(String key, boolean def) { return config.optBoolean(key, def); }

    private JSONObject remind() {
        JSONObject r = config.optJSONObject("remind");
        return r == null ? new JSONObject() : r;
    }
    synchronized boolean remindOn() { return trackerOn() && remind().optBoolean("on", false); }
    synchronized int every() { int e = remind().optInt("every", 90); return e >= 15 && e <= 600 ? e : 90; }
    synchronized int fromMin() { return WaterMath.minOf(remind().optString("from", "09:00"), 9 * 60); }
    synchronized int toMin() { return WaterMath.minOf(remind().optString("to", "22:00"), 22 * 60); }
    synchronized boolean moveOn() { return remind().optBoolean("move", true); }

    synchronized String str(String key, String def) {
        JSONObject s = config.optJSONObject("strings");
        String v = s == null ? null : s.optString(key, null);
        return v == null || v.isEmpty() ? def : v;
    }

    synchronized int moveCount() {
        JSONArray a = config.optJSONArray("moves");
        return a == null ? 0 : a.length();
    }

    synchronized String move(int i) {
        JSONArray a = config.optJSONArray("moves");
        if (a == null || a.length() == 0) return "10 squats";
        return a.optString(Math.abs(i) % a.length(), "10 squats");
    }

    synchronized String locale() { return config.optString("locale", ""); }

    synchronized NumberFormat numbers() {
        String tag = config.optString("locale", "");
        Locale l = tag.isEmpty() ? Locale.getDefault() : Locale.forLanguageTag(tag);
        return NumberFormat.getIntegerInstance(l);
    }

    /** The "{ml} / {goal}" placeholders filled with today's numbers. */
    synchronized String fill(String template, int ml) {
        NumberFormat nf = numbers();
        return template.replace("{ml}", nf.format(ml)).replace("{goal}", nf.format(goal()))
            .replace("{unit}", nf.format(unitMl()));
    }

    /** Tell the web app (when it is open) that a day changed natively. */
    void emit() {
        Listener l = listener;
        if (l != null) {
            try { l.onWater(snapshot()); } catch (RuntimeException ignored) { }
        }
    }
}
