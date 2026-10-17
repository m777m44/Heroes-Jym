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
    private final Context app;
    private JSONObject days;
    private JSONArray undo;    // 2.6: today's drinks, newest last — [{ day, ml }], what "Undo" takes back
    private JSONObject config;
    String celebratedDay;      // the day the water goal was last celebrated
    long snoozedAt;

    private WaterStore(Context c) {
        app = c.getApplicationContext();
        prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        days = parse(prefs.getString("days", null));
        undo = parseArray(prefs.getString("undo", null));
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

    private static JSONArray parseArray(String s) {
        if (s == null || s.isEmpty()) return new JSONArray();
        try { return new JSONArray(s); } catch (JSONException e) { return new JSONArray(); }
    }

    synchronized void save() {
        prefs.edit()
            .putString("days", days.toString())
            .putString("undo", undo.toString())
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
        int before = ml(day);
        try {
            JSONObject d = new JSONObject();
            d.put("ml", WaterMath.clampMl(ml, 8000));
            d.put("at", at);
            days.put(day, d);
        } catch (JSONException e) { return false; }
        track(day, ml(day) - before);
        prune();
        save();
        return true;
    }

    /**
     * Keeps the undo stack in step with today's total: a rise is one more drink (from a
     * notification button or the app), a fall takes drinks back off the top.
     */
    private void track(String day, int delta) {
        String today = StepStore.today();
        // drop entries from earlier days
        JSONArray keep = new JSONArray();
        for (int i = 0; i < undo.length(); i++) {
            JSONObject e = undo.optJSONObject(i);
            if (e != null && today.equals(e.optString("day"))) keep.put(e);
        }
        undo = keep;
        if (!today.equals(day) || delta == 0) return;
        if (delta > 0) {
            try { undo.put(new JSONObject().put("day", day).put("ml", delta)); } catch (JSONException ignored) { }
            while (undo.length() > 30) undo.remove(0);
            return;
        }
        int left = -delta;
        while (left > 0 && undo.length() > 0) {
            int last = undo.length() - 1;
            JSONObject e = undo.optJSONObject(last);
            int v = e == null ? 0 : e.optInt("ml", 0);
            if (v <= left) { undo.remove(last); left -= v; }
            else {
                try { e.put("ml", v - left); } catch (JSONException ignored) { }
                left = 0;
            }
        }
    }

    /** Takes back the last drink of today. Returns the ml removed (0 when there is none). */
    synchronized int undoLast() {
        String day = StepStore.today();
        track(day, 0);                         // forget other days first
        if (undo.length() == 0) return 0;
        JSONObject e = undo.optJSONObject(undo.length() - 1);
        int v = Math.min(e == null ? 0 : e.optInt("ml", 0), ml(day));
        if (v <= 0) { undo.remove(undo.length() - 1); save(); return 0; }
        set(day, ml(day) - v, System.currentTimeMillis(), true);   // track() pops the entry
        return v;
    }

    synchronized boolean canUndo() {
        String today = StepStore.today();
        for (int i = 0; i < undo.length(); i++) {
            JSONObject e = undo.optJSONObject(i);
            if (e != null && today.equals(e.optString("day")) && e.optInt("ml", 0) > 0) return true;
        }
        return false;
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

    JSONObject snapshot() {
        int goal = goal();
        JSONObject o = new JSONObject();
        synchronized (this) {
            try {
                String day = StepStore.today();
                o.put("day", day);
                o.put("ml", ml(day));
                o.put("at", at(day));
                o.put("goal", goal);
                o.put("canUndo", canUndo());
            } catch (JSONException ignored) { }
        }
        return o;
    }

    // ---- config ------------------------------------------------------------------------

    synchronized void setConfig(JSONObject c) {
        if (c != null) config = c;
        save();
    }

    synchronized boolean configured() { return config.length() > 0; }
    synchronized boolean trackerOn() { return configured() && config.optBoolean("on", true); }
    private synchronized int fixedGoal() { int g = config.optInt("goalMl", 2000); return g >= 500 && g <= 6000 ? g : 2000; }
    synchronized boolean autoGoal() { return config.optBoolean("auto", false); }
    synchronized int baseMl() { int b = config.optInt("baseMl", 2000); return b >= 500 && b <= 6000 ? b : 2000; }
    /** Today's training part (ml) — sent by the app with the day it belongs to. */
    synchronized int workoutMl() {
        return StepStore.today().equals(config.optString("workoutDay", "")) ? Math.max(0, config.optInt("workoutMl", 0)) : 0;
    }
    /** Today's walking part (ml), from the live step count. */
    int walkMl() { return WaterMath.stepBonus(stepsToday()); }
    private int stepsToday() {
        try { return StepStore.get(app).totalOn(StepStore.today()); } catch (RuntimeException e) { return 0; }
    }

    /**
     * Today's goal. With the automatic goal on (2.6): the base from body weight + the walking
     * part from today's live steps + the training part — the same sum as lib/water.js.
     * Not synchronized around the step store, so the two locks are never held together.
     */
    int goal() {
        if (!autoGoal()) return fixedGoal();
        int base = baseMl(), train = workoutMl();
        return WaterMath.autoGoal(base, stepsToday(), train);
    }
    synchronized int unitMl() { int u = config.optInt("unitMl", 250); return u >= 50 && u <= 2000 ? u : 250; }
    synchronized boolean pref(String key, boolean def) { return config.optBoolean(key, def); }
    /** The water panel in the notifications (2.6) — on unless the app switched it off. */
    synchronized boolean panelOn() { return trackerOn() && config.optBoolean("panel", true); }

    /** The containers as sent by the app: key, ml, translated name (defaults when missing). */
    synchronized int containerMl(int i) {
        JSONArray a = config.optJSONArray("containers");
        JSONObject o = a == null ? null : a.optJSONObject(i);
        int def = i == 0 ? 200 : i == 1 ? 250 : i == 2 ? 330 : 500;
        int v = o == null ? def : o.optInt("ml", def);
        return v >= 50 && v <= 2000 ? v : def;
    }
    synchronized String containerName(int i) {
        JSONArray a = config.optJSONArray("containers");
        JSONObject o = a == null ? null : a.optJSONObject(i);
        String def = i == 0 ? "Glass" : i == 1 ? "Cup" : i == 2 ? "Can" : "Bottle";
        String v = o == null ? null : o.optString("name", null);
        return v == null || v.isEmpty() ? def : v;
    }
    synchronized String unitKey() { return config.optString("unit", "cup"); }

    private JSONObject remind() {
        JSONObject r = config.optJSONObject("remind");
        return r == null ? new JSONObject() : r;
    }
    synchronized boolean remindOn() { return trackerOn() && remind().optBoolean("on", false); }
    synchronized int every() { int e = remind().optInt("every", 90); return e >= 15 && e <= 600 ? e : 90; }
    synchronized int fromMin() { return WaterMath.minOf(remind().optString("from", "09:00"), 9 * 60); }
    synchronized int toMin() { return WaterMath.minOf(remind().optString("to", "22:00"), 22 * 60); }
    synchronized boolean moveOn() { return remind().optBoolean("move", true); }
    /** 2.9 — reminders vibrate ("drip, drip, drop"); on unless switched off on the Water screen. */
    synchronized boolean remindVibrate() { return remind().optBoolean("vibrate", true); }

    synchronized String str(String key, String def) {
        JSONObject s = config.optJSONObject("strings");
        String v = s == null ? null : s.optString(key, null);
        return v == null || v.isEmpty() ? def : v;
    }

    /** 2.10: today's moves (each weekday follows its workout — "movesByDay"), else the general list. */
    private JSONArray moves() {
        JSONObject byDay = config.optJSONObject("movesByDay");
        if (byDay != null) {
            int dow = java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_WEEK) - 1;   // = JS getDay()
            JSONArray d = byDay.optJSONArray(String.valueOf(dow));
            if (d != null && d.length() > 0) return d;
        }
        return config.optJSONArray("moves");
    }

    synchronized int moveCount() {
        JSONArray a = moves();
        return a == null ? 0 : a.length();
    }

    synchronized String move(int i) {
        JSONArray a = moves();
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
    String fill(String template, int ml) {
        int goal = goal();
        NumberFormat nf = numbers();
        return template.replace("{ml}", nf.format(ml)).replace("{goal}", nf.format(goal))
            .replace("{unit}", nf.format(unitMl()))
            .replace("{left}", nf.format(Math.max(0, goal - ml)));
    }

    /** Tell the web app (when it is open) that a day changed natively. */
    void emit() {
        Listener l = listener;
        if (l != null) {
            try { l.onWater(snapshot()); } catch (RuntimeException ignored) { }
        }
    }
}
