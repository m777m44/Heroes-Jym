package io.github.m777m44.mahdijym.steps;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

import io.github.m777m44.mahdijym.R;

/**
 * MAHDI-JYM 10.0 — "My schedule" reminders, armed by the phone itself so they keep coming with
 * the app closed and come back after a reboot (BootReceiver).
 *
 * The app hands over one entry per block (lib/dayPlan.js planAlarms, already in the user's
 * language): its weekdays (empty = every day), its start (minutes after midnight), how many
 * minutes before it rings, the days it must stay quiet (done, skipped, a stopped day) and the
 * text — the time, the notes, the food and drinks with their calories. Each entry is one alarm:
 * it works out its next time, rings, and re-arms itself for the block's next day, so the whole
 * schedule reminds week after week however many blocks it has. The app replaces the list with
 * fresh text whenever it opens or the schedule changes (schedulePlanReminders()).
 *
 * The notification, in the block's colour, has two buttons that work without opening the app:
 *   "Done ✓"    remembers {day, block, at}; the app logs the planned food and marks the block done
 *               the next time it opens (takeActions()).
 *   "In 10 min" rings the same reminder again ten minutes later (its own alarm, identified by the
 *               occurrence, so it never disturbs the others).
 * Tapping it opens the schedule. Request codes: class base + id; notification ids 8200–8399.
 */
public class PlanReminder extends BroadcastReceiver {
    static final String ACTION_FIRE = "io.github.m777m44.mahdijym.plan.FIRE";
    static final String ACTION_AGAIN = "io.github.m777m44.mahdijym.plan.AGAIN";
    static final String ACTION_DONE = "io.github.m777m44.mahdijym.plan.DONE";
    static final String ACTION_LATER = "io.github.m777m44.mahdijym.plan.LATER";
    static final String CH = "mj_plan";
    static final String PREFS = "mj_plan";
    static final String GROUP = "mj_plan";
    /** Two short, soft taps. */
    static final long[] VIBRATION = { 0, 70, 110, 70 };
    static final long LATER_MS = 10 * 60_000L;
    private static final int REQ_ALARM = 31_000, REQ_OPEN = 32_000, REQ_DONE = 33_000, REQ_LATER = 34_000, REQ_AGAIN = 35_000;
    static final int NOTIF_BASE = 8200;
    private static final int NOTIF_SLOTS = 200;
    private static final int MAX_ACTIONS = 200;
    private static final int MAX_SNOOZED = 30;
    /** What a posted reminder is about (in its extras), to take it away when the plan changes. */
    private static final String X_BLOCK = "mj_block", X_DAY = "mj_day", X_LEAD = "mj_lead", X_SIG = "mj_sig";

    @Override public void onReceive(Context c, Intent intent) {
        String a = intent == null ? null : intent.getAction();
        if (a == null) return;
        try {
            if (ACTION_FIRE.equals(a)) {
                int id = intent.getIntExtra("id", -1);
                if (id >= 0) fire(c, id);
            }
            else if (ACTION_AGAIN.equals(a)) again(c, intent.getStringExtra("key"));
            else if (ACTION_DONE.equals(a)) done(c, payloadOf(intent));
            else if (ACTION_LATER.equals(a)) later(c, payloadOf(intent));
        } catch (RuntimeException ignored) { /* never crash in a receiver */ }
    }

    // ---- storage ----------------------------------------------------------------------------

    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private static JSONArray arr(Context c, String key) {
        try { return new JSONArray(prefs(c).getString(key, "[]")); } catch (JSONException e) { return new JSONArray(); }
    }

    private static JSONObject obj(Context c, String key) {
        try { return new JSONObject(prefs(c).getString(key, "{}")); } catch (JSONException e) { return new JSONObject(); }
    }

    private static JSONObject payloadOf(Intent i) {
        String p = i == null ? null : i.getStringExtra("p");
        if (p == null) return null;
        try { return new JSONObject(p); } catch (JSONException e) { return null; }
    }

    /** One occurrence: the block's day, the block and how many minutes before it rings. */
    private static String key(JSONObject o) { return o == null ? "" : o.optString("day", "") + "|" + o.optString("block", "") + "|" + o.optInt("lead", 0); }

    /** Replace the list (from the app) and arm it. Returns how many reminders are armed. */
    static int setPlan(Context c, JSONArray list, JSONObject strings) {
        cancelAll(c);
        retirePosted(c, list);
        prefs(c).edit()
            .putString("items", list == null ? "[]" : list.toString())
            .putString("strings", strings == null ? "{}" : strings.toString())
            .apply();
        reconcileSnoozes(c, list);
        if (list != null && list.length() > 0) createChannel(c, strings);
        return schedule(c);
    }

    /** What was pressed on the notifications since the last call: [{ d, b, a, at }] — and forget it. */
    static JSONArray takeActions(Context c) {
        JSONArray a = arr(c, "actions");
        prefs(c).edit().putString("actions", "[]").apply();
        return a;
    }

    // ---- when (the maths is in PlanMath, unit-tested) -----------------------------------------

    private static String dayOf(long t) { return PlanMath.dayOf(t); }

    private static int[] ints(JSONArray a) {
        if (a == null) return new int[0];
        int[] out = new int[a.length()];
        for (int i = 0; i < out.length; i++) out[i] = a.optInt(i, -1);
        return out;
    }

    private static Set<String> strs(JSONArray a) {
        Set<String> out = new HashSet<>();
        if (a != null) for (int i = 0; i < a.length(); i++) { String v = a.optString(i, null); if (v != null) out.add(v); }
        return out;
    }

    /** The entry of `list` that still rings for this block, lead and day (null when none does). */
    private static JSONObject entryFor(JSONArray list, String block, int lead, String day) {
        if (list == null || block == null || day == null) return null;
        for (int i = 0; i < list.length(); i++) {
            JSONObject o = list.optJSONObject(i);
            if (o == null || !block.equals(o.optString("block", "")) || o.optInt("lead", 0) != lead) continue;
            if (PlanMath.ringsOn(ints(o.optJSONArray("w")), strs(o.optJSONArray("skip")), o.optString("once", null), day)) return o;
        }
        return null;
    }

    private static String sigOf(JSONObject o) {
        String body = o.optString("body", "");
        return PlanMath.textSig(o.optString("title", ""), body, o.optString("big", body));
    }

    /** A block's next ring after `after`: { ring time, the block's start that day }, or null. */
    static long[] nextRing(JSONObject o, long after) {
        if (o == null || !o.has("start")) return null;
        return PlanMath.nextRing(o.optInt("start", 0), o.optInt("lead", 0), ints(o.optJSONArray("w")), strs(o.optJSONArray("skip")), o.optString("once", null), after);
    }

    // ---- alarms -----------------------------------------------------------------------------

    private static PendingIntent firePi(Context c, int id, int flags) {
        Intent i = new Intent(c, PlanReminder.class).setAction(ACTION_FIRE).putExtra("id", id);
        return PendingIntent.getBroadcast(c, REQ_ALARM + id % 1000, i, PendingIntent.FLAG_IMMUTABLE | flags);
    }

    /** A snooze is identified by its occurrence (in the intent's data), so two can never collide. */
    private static PendingIntent againPi(Context c, String key, int flags) {
        Intent i = new Intent(c, PlanReminder.class).setAction(ACTION_AGAIN)
            .setData(Uri.parse("mahdijym://plan/snooze/" + Uri.encode(key)))
            .putExtra("key", key);
        return PendingIntent.getBroadcast(c, REQ_AGAIN, i, PendingIntent.FLAG_IMMUTABLE | flags);
    }

    private static void arm(Context c, PendingIntent p, long when) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null || p == null) return;
        try {
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, p);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, p);
        } catch (SecurityException e) {
            try { am.set(AlarmManager.RTC_WAKEUP, when, p); } catch (RuntimeException ignored) { }
        }
    }

    private static void cancel(Context c, PendingIntent p) {
        if (p == null) return;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(p);
        p.cancel();
    }

    /** Work out and arm every block's next ring, and the snoozed ones. Returns how many blocks. */
    static int schedule(Context c) {
        JSONArray a = arr(c, "items");
        long now = System.currentTimeMillis();
        int n = 0;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            int id = o.optInt("id", -1);
            long[] r = nextRing(o, now);
            if (id < 0) continue;
            if (r == null) { cancel(c, firePi(c, id, PendingIntent.FLAG_NO_CREATE)); continue; }   // e.g. a day's own entry, gone by
            try {
                o.put("at", r[0]);
                o.put("when", r[1]);
                o.put("day", dayOf(r[1]));
            } catch (JSONException e) { continue; }
            arm(c, firePi(c, id, PendingIntent.FLAG_UPDATE_CURRENT), r[0]);
            n++;
        }
        prefs(c).edit().putString("items", a.toString()).apply();
        // snoozed ones (after a reboot their alarms are gone); the ones whose time has passed are dropped
        JSONObject snz = obj(c, "snooze");
        boolean changed = false;
        List<String> keys = new ArrayList<>();
        for (Iterator<String> it = snz.keys(); it.hasNext(); ) keys.add(it.next());
        for (String k : keys) {
            JSONObject p = snz.optJSONObject(k);
            long again = p == null ? 0 : p.optLong("again", 0);
            if (again > now) arm(c, againPi(c, k, PendingIntent.FLAG_UPDATE_CURRENT), again);
            else { snz.remove(k); changed = true; }
        }
        if (changed) prefs(c).edit().putString("snooze", snz.toString()).apply();
        return n;
    }

    private static void cancelAll(Context c) {
        JSONArray a = arr(c, "items");
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            int id = o.optInt("id", -1);
            if (id >= 0) cancel(c, firePi(c, id, PendingIntent.FLAG_NO_CREATE));
        }
    }

    /**
     * A snoozed reminder only rings again while its block still runs, with a reminder, on that day
     * — and then with the block's current text (notes, food). The others are cancelled: reminders
     * switched off, the block deleted or moved to other weekdays (review on PR #13).
     */
    private static void reconcileSnoozes(Context c, JSONArray list) {
        JSONObject snz = obj(c, "snooze");
        if (snz.length() == 0) return;
        List<String> keys = new ArrayList<>();
        for (Iterator<String> it = snz.keys(); it.hasNext(); ) keys.add(it.next());
        for (String k : keys) {
            JSONObject p = snz.optJSONObject(k);
            JSONObject fresh = p == null ? null : entryFor(list, p.optString("block", ""), p.optInt("lead", 0), p.optString("day", ""));
            if (fresh == null) {
                snz.remove(k);
                cancel(c, againPi(c, k, PendingIntent.FLAG_NO_CREATE));
                continue;
            }
            try {
                for (String f : new String[] { "title", "body", "big", "color", "route" }) if (fresh.has(f)) p.put(f, fresh.get(f));
            } catch (JSONException ignored) { }
        }
        prefs(c).edit().putString("snooze", snz.toString()).apply();
    }

    private static int slot(int id) { return NOTIF_BASE + Math.abs(id) % NOTIF_SLOTS; }

    /**
     * Reminders already in the shade that the new list no longer stands behind are taken away, so
     * no stale details or buttons stay: the block deleted, its reminder or all reminders switched
     * off, done or skipped that day, the day stopped, moved (+10) or its text changed (review on
     * PR #13). The others stay where they are.
     */
    private static void retirePosted(Context c, JSONArray list) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        StatusBarNotification[] shown;
        try { shown = nm.getActiveNotifications(); } catch (RuntimeException e) { return; }
        if (shown == null) return;
        for (StatusBarNotification sb : shown) {
            int n = sb.getId();
            if (n < NOTIF_BASE || n >= NOTIF_BASE + NOTIF_SLOTS || sb.getTag() != null) continue;
            Bundle x = sb.getNotification() == null ? null : sb.getNotification().extras;
            String block = x == null ? null : x.getString(X_BLOCK);
            JSONObject fresh = block == null ? null : entryFor(list, block, x.getInt(X_LEAD, 0), x.getString(X_DAY));
            if (fresh == null || !sigOf(fresh).equals(x.getString(X_SIG))) {
                try { nm.cancel(n); } catch (RuntimeException ignored) { }
            }
        }
    }

    /** A block's reminder rang: show it, then work out its next day and arm that. */
    private static void fire(Context c, int id) {
        JSONArray a = arr(c, "items");
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null || o.optInt("id", -1) != id) continue;
            long rang = o.optLong("at", 0), when = o.optLong("when", 0), now = System.currentTimeMillis();
            // the clock or the time zone moved before it could be armed again (review on PR #13): a ring
            // far too early, or long after its block began, is not shown — the next one counts from now
            boolean early = rang > now + 5 * 60_000L;
            boolean stale = when > 0 && now > when + Math.max(15 * 60_000L, o.optLong("ttl", 2 * 60 * 60_000L));
            if (!early && !stale) {
                try { post(c, new JSONObject(o.toString())); } catch (JSONException ignored) { }
            }
            long[] r = nextRing(o, early ? now : Math.max(now, rang) + 60_000L);
            if (r == null) return;
            try {
                o.put("at", r[0]);
                o.put("when", r[1]);
                o.put("day", dayOf(r[1]));
                prefs(c).edit().putString("items", a.toString()).apply();
                arm(c, firePi(c, id, PendingIntent.FLAG_UPDATE_CURRENT), r[0]);
            } catch (JSONException ignored) { }
            return;
        }
    }

    private static void done(Context c, JSONObject p) {
        if (p == null) return;
        NotificationManagerCompat.from(c).cancel(slot(p.optInt("id", 0)));
        try {
            JSONArray acts = arr(c, "actions");
            JSONObject x = new JSONObject();
            x.put("d", p.optString("day", ""));
            x.put("b", p.optString("block", ""));
            x.put("a", "done");
            x.put("at", System.currentTimeMillis());
            acts.put(x);
            while (acts.length() > MAX_ACTIONS) acts.remove(0);
            JSONObject snz = obj(c, "snooze");
            String k = key(p);
            if (snz.has(k)) { snz.remove(k); cancel(c, againPi(c, k, PendingIntent.FLAG_NO_CREATE)); }
            prefs(c).edit().putString("actions", acts.toString()).putString("snooze", snz.toString()).apply();
        } catch (JSONException ignored) { }
    }

    private static void later(Context c, JSONObject p) {
        if (p == null) return;
        NotificationManagerCompat.from(c).cancel(slot(p.optInt("id", 0)));
        long when = System.currentTimeMillis() + LATER_MS;
        String k = key(p);
        try {
            JSONObject snz = obj(c, "snooze");
            p.put("again", when);
            snz.put(k, p);
            // keep the list short: the oldest go first
            while (snz.length() > MAX_SNOOZED) {
                String oldest = null;
                long t = Long.MAX_VALUE;
                for (Iterator<String> it = snz.keys(); it.hasNext(); ) {
                    String x = it.next();
                    JSONObject y = snz.optJSONObject(x);
                    long v = y == null ? 0 : y.optLong("again", 0);
                    if (v < t) { t = v; oldest = x; }
                }
                if (oldest == null) break;
                snz.remove(oldest);
                cancel(c, againPi(c, oldest, PendingIntent.FLAG_NO_CREATE));
            }
            prefs(c).edit().putString("snooze", snz.toString()).apply();
        } catch (JSONException ignored) { }
        arm(c, againPi(c, k, PendingIntent.FLAG_UPDATE_CURRENT), when);
    }

    /** A snoozed reminder rings again (with the time it rings now). */
    private static void again(Context c, String k) {
        if (k == null) return;
        JSONObject snz = obj(c, "snooze");
        JSONObject p = snz.optJSONObject(k);
        if (p == null) return;
        snz.remove(k);
        prefs(c).edit().putString("snooze", snz.toString()).apply();
        try {
            p.remove("again");
            p.put("when", System.currentTimeMillis());
        } catch (JSONException ignored) { }
        post(c, p);
    }

    // ---- the notification -------------------------------------------------------------------

    static void createChannel(Context c, JSONObject s) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        String name = s == null ? "My schedule" : s.optString("channel", "My schedule");
        NotificationChannel ch = new NotificationChannel(CH, name, NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(s == null ? "" : s.optString("channelDesc", ""));
        ch.enableVibration(true);
        ch.setVibrationPattern(VIBRATION);
        ch.enableLights(true);
        ch.setLightColor(0xFF5E5CE6);
        ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
        Channels.adopt(c, CH);
    }

    private static int colorOf(JSONObject o, Context c) {
        String col = o.optString("color", "");
        if (!col.isEmpty()) {
            try { return Color.parseColor(col); } catch (IllegalArgumentException ignored) { }
        }
        return Theme.get(c).accent();
    }

    private static void post(Context c, JSONObject p) {
        JSONObject s = obj(c, "strings");
        createChannel(c, s);
        int id = p.optInt("id", 0);
        int n = slot(id);
        String title = p.optString("title", "My schedule");
        String body = p.optString("body", "");
        String big = p.optString("big", body);
        String route = p.optString("route", "/dayplan");
        String json = p.toString();
        Intent di = new Intent(c, PlanReminder.class).setAction(ACTION_DONE).putExtra("p", json);
        PendingIntent donePi = PendingIntent.getBroadcast(c, REQ_DONE + n % 1000, di, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Intent li = new Intent(c, PlanReminder.class).setAction(ACTION_LATER).putExtra("p", json);
        PendingIntent laterPi = PendingIntent.getBroadcast(c, REQ_LATER + n % 1000, li, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        long when = p.optLong("when", System.currentTimeMillis());
        long ttl = p.optLong("ttl", 2 * 60 * 60_000L);
        Bundle about = new Bundle();
        about.putString(X_BLOCK, p.optString("block", ""));
        about.putString(X_DAY, p.optString("day", ""));
        about.putInt(X_LEAD, p.optInt("lead", 0));
        about.putString(X_SIG, sigOf(p));
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(big).setBigContentTitle(title).setSummaryText(s.optString("sub", "")))
            .setColor(colorOf(p, c))
            .setColorized(false)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)       // heads-up on Android 7 and older
            .setVibrate(VIBRATION)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(true)
            .setWhen(when)
            .setAutoCancel(true)
            .setGroup(GROUP)
            .setTimeoutAfter(Math.max(15 * 60_000L, Math.min(ttl, 12 * 60 * 60_000L)))
            .setContentIntent(Celebration.openApp(c, REQ_OPEN + n % 1000, route))
            .addAction(0, s.optString("done", "Done ✓"), donePi)
            .addAction(0, s.optString("later", "In 10 min"), laterPi)
            .addExtras(about)
            .setLocalOnly(true);
        try { NotificationManagerCompat.from(c).notify(n, b.build()); }
        catch (SecurityException ignored) { /* notifications not allowed */ }
    }
}
