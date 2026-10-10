package io.github.m777m44.mahdijym.steps;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * The step counter's memory: today's count, active time and hourly buckets, a rolling history
 * of past days, the hardware counter baseline and the configuration sent from the web app.
 *
 * One instance per process, every method synchronized — the sensor callbacks (main thread),
 * the Capacitor plugin (its own thread) and the widget all read and write it. Persisted to
 * SharedPreferences with apply(), which is asynchronous and cheap enough to call per step.
 *
 * Counting model: Android's TYPE_STEP_COUNTER is a cumulative count since boot that keeps
 * running in the sensor hub while the app is asleep. We keep the last value we saw
 * ({@link #lastCounter}); each new reading adds the difference. A reading lower than the
 * baseline means the phone rebooted — then the reading itself is the steps since boot. The
 * baseline survives process death (so steps walked while Android had killed the service are
 * recovered on restart) but is cleared when the user stops counting, so steps walked while
 * the counter was switched off are never added.
 */
final class StepStore {
    static final int HISTORY_DAYS = 62;
    private static final String PREFS = "mj_step_service";
    private static StepStore instance;

    private final SharedPreferences prefs;

    String day;
    int steps;              // confirmed by the step counter
    int provisional;        // step-detector events not yet confirmed by a counter reading
    long activeMs;
    long lastStepAt;        // wall clock of the last step
    float lastCounter = -1f;
    int[] hourly = new int[24];
    int lastMilestone;      // highest multiple of 1 000 already announced today
    String goalDay = "";    // the day the goal was last celebrated
    boolean running;
    boolean paused;
    JSONObject history = new JSONObject();
    JSONObject config = new JSONObject();

    static synchronized StepStore get(Context c) {
        if (instance == null) instance = new StepStore(c.getApplicationContext());
        return instance;
    }

    private StepStore(Context c) {
        prefs = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        day = prefs.getString("day", today());
        steps = prefs.getInt("steps", 0);
        activeMs = prefs.getLong("activeMs", 0);
        lastStepAt = prefs.getLong("lastStepAt", 0);
        lastCounter = prefs.getFloat("lastCounter", -1f);
        lastMilestone = prefs.getInt("lastMilestone", 0);
        goalDay = prefs.getString("goalDay", "");
        running = prefs.getBoolean("running", false);
        paused = prefs.getBoolean("paused", false);
        hourly = parseHourly(prefs.getString("hourly", ""));
        history = parse(prefs.getString("history", "{}"));
        config = parse(prefs.getString("config", "{}"));
        rollIfNeeded();
    }

    // ---- persistence -------------------------------------------------------------------

    synchronized void save() {
        prefs.edit()
            .putString("day", day)
            .putInt("steps", steps)
            .putLong("activeMs", activeMs)
            .putLong("lastStepAt", lastStepAt)
            .putFloat("lastCounter", lastCounter)
            .putInt("lastMilestone", lastMilestone)
            .putString("goalDay", goalDay)
            .putBoolean("running", running)
            .putBoolean("paused", paused)
            .putString("hourly", joinHourly(hourly))
            .putString("history", history.toString())
            .putString("config", config.toString())
            .apply();
    }

    private static JSONObject parse(String s) {
        try { return new JSONObject(s == null || s.isEmpty() ? "{}" : s); } catch (JSONException e) { return new JSONObject(); }
    }

    private static int[] parseHourly(String s) {
        int[] h = new int[24];
        if (s == null || s.isEmpty()) return h;
        String[] parts = s.split(",");
        for (int i = 0; i < 24 && i < parts.length; i++) {
            try { h[i] = Integer.parseInt(parts[i].trim()); } catch (NumberFormatException ignored) { h[i] = 0; }
        }
        return h;
    }

    private static String joinHourly(int[] h) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < h.length; i++) { if (i > 0) b.append(','); b.append(h[i]); }
        return b.toString();
    }

    // ---- calendar ----------------------------------------------------------------------

    /** Today in the phone's own time zone — the same calendar the web app files steps under. */
    static String today() {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(TimeZone.getDefault());
        return f.format(new Date());
    }

    static int hourNow() {
        return Calendar.getInstance(TimeZone.getDefault()).get(Calendar.HOUR_OF_DAY);
    }

    /** Milliseconds until the next local midnight. */
    static long msToMidnight() {
        Calendar c = Calendar.getInstance(TimeZone.getDefault());
        long now = c.getTimeInMillis();
        c.add(Calendar.DAY_OF_YEAR, 1);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return Math.max(0, c.getTimeInMillis() - now);
    }

    /** Close the day at midnight: archive it into the history and start from zero. */
    synchronized boolean rollIfNeeded() {
        String t = today();
        if (t.equals(day)) return false;
        archive(day, steps + provisional, activeMs, hourly);
        day = t;
        steps = 0;
        provisional = 0;
        activeMs = 0;
        hourly = new int[24];
        lastMilestone = 0;
        save();
        return true;
    }

    private void archive(String d, int n, long ms, int[] h) {
        if (d == null || (n <= 0 && ms <= 0)) return;
        try {
            JSONObject o = new JSONObject();
            o.put("n", n);
            o.put("ms", ms);
            JSONArray a = new JSONArray();
            for (int v : h) a.put(v);
            o.put("h", a);
            history.put(d, o);
            // keep the newest HISTORY_DAYS days
            List<String> keys = new ArrayList<>();
            Iterator<String> it = history.keys();
            while (it.hasNext()) keys.add(it.next());
            Collections.sort(keys);
            for (int i = 0; i < keys.size() - HISTORY_DAYS; i++) history.remove(keys.get(i));
        } catch (JSONException ignored) { /* history is best-effort */ }
    }

    // ---- counting ----------------------------------------------------------------------

    /** A TYPE_STEP_COUNTER reading. Returns the number of steps it added. */
    synchronized int onCounter(float value, long now) {
        rollIfNeeded();
        if (lastCounter < 0) {            // first reading since counting was switched on
            lastCounter = value;
            provisional = 0;
            save();
            return 0;
        }
        float d = value - lastCounter;
        if (d < 0) d = value;             // the phone rebooted: the counter restarted at 0
        lastCounter = value;
        int delta = Math.round(d);
        if (delta > 150000) delta = 0;    // nonsense reading — never invent a marathon
        provisional = 0;
        return addSteps(delta, now);
    }

    /** A TYPE_STEP_DETECTOR event: shown immediately, confirmed by the next counter reading. */
    synchronized void onDetector(boolean hasCounter, long now) {
        rollIfNeeded();
        if (hasCounter) {
            if (provisional < 200) provisional++;
            lastStepAt = now;
        } else {
            addSteps(1, now);
        }
    }

    private int addSteps(int delta, long now) {
        if (delta <= 0) { save(); return 0; }
        if (lastStepAt > 0) {
            // A batch of steps delivered after the screen was off spans the whole gap; count
            // at most ~0.6 s per step of it as walking, so a short walk after a long sit
            // doesn't credit the sitting.
            long gap = Math.max(0, now - lastStepAt);
            activeMs += Math.min(gap, delta * 600L);
        }
        steps += delta;
        int h = hourNow();
        hourly[h] += delta;
        lastStepAt = now;
        save();
        return delta;
    }

    synchronized int total() { return steps + provisional; }

    /** Forget the counter baseline — used when the user switches counting off. */
    synchronized void resetBaseline() {
        lastCounter = -1f;
        provisional = 0;
        save();
    }

    // ---- configuration -----------------------------------------------------------------

    synchronized void setConfig(JSONObject c) {
        if (c != null) config = c;
        save();
    }

    synchronized int goal() {
        int g = config.optInt("goal", 10000);
        return g > 0 ? g : 10000;
    }

    synchronized double strideM() {
        double s = config.optDouble("strideM", 0.75);
        return s >= 0.3 && s <= 1.5 ? s : 0.75;
    }

    synchronized double weightKg() {
        double w = config.optDouble("weightKg", 70);
        return w > 20 && w < 400 ? w : 70;
    }

    synchronized boolean pref(String key, boolean def) { return config.optBoolean(key, def); }

    synchronized String str(String key, String def) {
        JSONObject s = config.optJSONObject("strings");
        String v = s == null ? null : s.optString(key, null);
        return v == null || v.isEmpty() ? def : v;
    }

    synchronized String message(String key, int index, String def) {
        JSONObject s = config.optJSONObject("strings");
        JSONArray a = s == null ? null : s.optJSONArray(key);
        if (a == null || a.length() == 0) return def;
        String v = a.optString(Math.abs(index) % a.length(), def);
        return v == null || v.isEmpty() ? def : v;
    }

    synchronized String locale() { return config.optString("locale", ""); }

    synchronized String clockZone() {
        String z = config.optString("clockZone", "");
        return z == null || z.isEmpty() ? TimeZone.getDefault().getID() : z;
    }

    // ---- snapshots for JS / widget -----------------------------------------------------

    synchronized double km() { return total() * strideM() / 1000.0; }

    synchronized int kcal() { return (int) Math.round(km() * weightKg() * 0.53); }

    synchronized JSONObject snapshot(double speed, boolean moving) {
        JSONObject o = new JSONObject();
        try {
            o.put("running", running);
            o.put("paused", paused);
            o.put("day", day);
            o.put("steps", total());
            o.put("activeMs", activeMs);
            o.put("lastStepAt", lastStepAt);
            o.put("speed", Math.round(speed * 10) / 10.0);
            o.put("moving", moving);
            o.put("goal", goal());
            o.put("km", Math.round(km() * 100) / 100.0);
            o.put("kcal", kcal());
            JSONArray h = new JSONArray();
            for (int v : hourly) h.put(v);
            o.put("hourly", h);
        } catch (JSONException ignored) { }
        return o;
    }

    synchronized JSONObject historyWithToday() {
        JSONObject out = new JSONObject();
        try {
            Iterator<String> it = history.keys();
            while (it.hasNext()) { String k = it.next(); out.put(k, history.get(k)); }
            JSONObject t = new JSONObject();
            t.put("n", total());
            t.put("ms", activeMs);
            JSONArray a = new JSONArray();
            for (int v : hourly) a.put(v);
            t.put("h", a);
            out.put(day, t);
        } catch (JSONException ignored) { }
        return out;
    }
}
