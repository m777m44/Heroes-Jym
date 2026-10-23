package io.github.m777m44.mahdijym.steps;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import io.github.m777m44.mahdijym.R;

/**
 * MAHDI-JYM 2.10 — the workout reminders (gym days and the no-equipment home workout of the
 * daily plan), scheduled natively so they show up on screen as a heads-up banner with a light,
 * short vibration — also on the lock screen and with the app closed.
 *
 * The app plans them (lib/dailyReminder.js: concrete dates for the next two weeks, already in
 * the user's language) and hands the list over with scheduleWorkoutReminders(); it is kept in
 * prefs so the alarms come back after a reboot (BootReceiver). Capacitor's LocalNotifications
 * can only switch vibration on or off — hence this small native part.
 */
public class WorkoutReminder extends BroadcastReceiver {
    static final String ACTION_FIRE = "io.github.m777m44.mahdijym.workout.FIRE";
    static final String ACTION_LATER = "io.github.m777m44.mahdijym.workout.LATER";
    // 4.2: the burn plan's per-exercise reminders also have "Skip" (just dismisses it)
    static final String ACTION_SKIP = "io.github.m777m44.mahdijym.workout.SKIP";
    static final String CH = "mj_workout";
    static final String PREFS = "mj_workout";
    /** Light: two short taps. */
    static final long[] VIBRATION = { 0, 60, 90, 60 };
    static final long LATER_MS = 30 * 60_000L;
    private static final int REQ_ALARM = 21_000, REQ_START = 22_000, REQ_LATER = 23_000, REQ_OPEN = 24_000, REQ_SKIP = 25_000;
    private static final int NOTIF_BASE = 7300;

    @Override public void onReceive(Context c, Intent intent) {
        String a = intent == null ? null : intent.getAction();
        int id = intent == null ? -1 : intent.getIntExtra("id", -1);
        if (id < 0) return;
        try {
            if (ACTION_FIRE.equals(a)) post(c, id);
            else if (ACTION_LATER.equals(a)) later(c, id);
            else if (ACTION_SKIP.equals(a)) NotificationManagerCompat.from(c).cancel(slot(item(c, id), id));
        } catch (RuntimeException ignored) { /* never crash in a receiver */ }
    }

    // ---- storage ----------------------------------------------------------------------------

    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private static JSONArray items(Context c) {
        try { return new JSONArray(prefs(c).getString("items", "[]")); } catch (JSONException e) { return new JSONArray(); }
    }

    private static JSONObject strings(Context c) {
        try { return new JSONObject(prefs(c).getString("strings", "{}")); } catch (JSONException e) { return new JSONObject(); }
    }

    private static JSONObject item(Context c, int id) {
        JSONArray a = items(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && o.optInt("id", -1) == id) return o;
        }
        return null;
    }

    /** Replace the plan (from the app) and arm it. */
    static int setPlan(Context c, JSONArray list, JSONObject strings) {
        cancelAll(c);
        prefs(c).edit()
            .putString("items", list == null ? "[]" : list.toString())
            .putString("strings", strings == null ? "{}" : strings.toString())
            .apply();
        createChannel(c, strings);
        return schedule(c);
    }

    // ---- alarms -----------------------------------------------------------------------------

    private static PendingIntent fire(Context c, int id, int flags) {
        Intent i = new Intent(c, WorkoutReminder.class).setAction(ACTION_FIRE).putExtra("id", id);
        return PendingIntent.getBroadcast(c, REQ_ALARM + id % 1000, i, PendingIntent.FLAG_IMMUTABLE | flags);
    }

    private static void arm(Context c, int id, long when) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent p = fire(c, id, PendingIntent.FLAG_UPDATE_CURRENT);
        try {
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, p);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, p);
        } catch (SecurityException e) {
            try { am.set(AlarmManager.RTC_WAKEUP, when, p); } catch (RuntimeException ignored) { }
        }
    }

    /** Arm every reminder still to come. Returns how many. */
    static int schedule(Context c) {
        JSONArray a = items(c);
        long now = System.currentTimeMillis();
        int n = 0;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            long at = o.optLong("at", 0);
            int id = o.optInt("id", -1);
            if (id < 0 || at <= now) continue;
            arm(c, id, at);
            n++;
        }
        return n;
    }

    private static void cancelAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        JSONArray a = items(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            int id = o.optInt("id", -1);
            if (id < 0) continue;
            PendingIntent p = fire(c, id, PendingIntent.FLAG_NO_CREATE);
            if (p != null && am != null) { am.cancel(p); p.cancel(); }
        }
    }

    /** 4.2: an item may bring its own notification slot ("nid"); else 7300 + id % 100. */
    private static int slot(JSONObject o, int id) { return o != null && o.has("nid") ? o.optInt("nid", NOTIF_BASE + id % 100) : NOTIF_BASE + id % 100; }

    private static void later(Context c, int id) {
        JSONObject o = item(c, id);
        NotificationManagerCompat.from(c).cancel(slot(o, id));
        // 4.2: an item may bring its own snooze ("later", minutes) — the burn plan uses 10
        long ms = o != null && o.optInt("later", 0) > 0 ? o.optInt("later", 30) * 60_000L : LATER_MS;
        arm(c, id, System.currentTimeMillis() + ms);
    }

    // ---- the notification -------------------------------------------------------------------

    static void createChannel(Context c, JSONObject s) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        String name = s == null ? "Workout reminders" : s.optString("channel", "Workout reminders");
        NotificationChannel ch = new NotificationChannel(CH, name, NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(s == null ? "" : s.optString("channelDesc", ""));
        ch.setSound(null, null);                    // on screen with a light vibration, no ringing
        ch.enableVibration(true);
        ch.setVibrationPattern(VIBRATION);
        ch.enableLights(true);
        ch.setLightColor(0xFF30D158);
        ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    private static PendingIntent open(Context c, int req, String route) { return Celebration.openApp(c, req, route); }

    private static void post(Context c, int id) {
        JSONObject o = item(c, id);
        if (o == null) return;
        JSONObject s = strings(c);
        createChannel(c, s);
        String route = o.optString("route", "/home");
        String startRoute = o.optString("start", route);
        String title = o.optString("title", "Workout time");
        String body = o.optString("body", "");
        Intent li = new Intent(c, WorkoutReminder.class).setAction(ACTION_LATER).putExtra("id", id);
        PendingIntent laterPi = PendingIntent.getBroadcast(c, REQ_LATER + id % 1000, li,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(o.optString("big", body)).setBigContentTitle(title))
            .setColor(Theme.get(c).accent())
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)       // heads-up on Android 7 and older
            .setVibrate(VIBRATION)
            .setSound(null)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(true)
            .setWhen(System.currentTimeMillis())
            .setAutoCancel(true)
            .setTimeoutAfter(3 * 60 * 60_000L)
            .setContentIntent(open(c, REQ_OPEN + id % 1000, route))
            .addAction(0, s.optString("start", "Start"), open(c, REQ_START + id % 1000, startRoute))
            .addAction(0, o.optString("laterLabel", s.optString("later", "In 30 min")), laterPi)
            .setLocalOnly(true);
        String skip = o.optString("skip", "");
        if (!skip.isEmpty()) {
            Intent si = new Intent(c, WorkoutReminder.class).setAction(ACTION_SKIP).putExtra("id", id);
            b.addAction(0, skip, PendingIntent.getBroadcast(c, REQ_SKIP + id % 1000, si,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        }
        try { NotificationManagerCompat.from(c).notify(slot(o, id), b.build()); }
        catch (SecurityException ignored) { /* notifications not allowed */ }
    }
}
