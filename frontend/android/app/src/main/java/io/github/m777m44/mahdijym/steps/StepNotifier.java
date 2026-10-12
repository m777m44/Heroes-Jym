package io.github.m777m44.mahdijym.steps;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

import java.text.NumberFormat;
import java.util.Locale;

import io.github.m777m44.mahdijym.MainActivity;
import io.github.m777m44.mahdijym.R;

/**
 * Builds the live step notification — a small dark "screen" that sits in the shade and on
 * the lock screen: today's steps against the goal, a progress bar, distance, calories,
 * speed, walking time (a Chronometer that ticks on its own while you move), the time and
 * date (TextClocks that tick every second in the chosen time zone — Baghdad by default) and
 * a countdown to midnight. Clocks and timers are rendered by the system, so they keep moving
 * on the lock screen without the app waking up every second.
 */
final class StepNotifier {
    static final int LIVE_ID = 7001;
    static final int ALERT_ID = 7002;
    static final String CH_LIVE = "mj_steps_live";
    static final String CH_ALERT = "mj_steps_alert";
    static final String CH_ALERT_QUIET = "mj_steps_alert_quiet";

    private StepNotifier() { }

    static void createChannels(Context c, StepStore s) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        // DEFAULT importance without a sound: never makes a noise, but unlike a LOW channel
        // it is not filed under "silent" — so it stays visible on the lock screen.
        NotificationChannel live = new NotificationChannel(CH_LIVE, s.str("channelLive", "Live step counter"), NotificationManager.IMPORTANCE_DEFAULT);
        live.setDescription(s.str("channelLiveDesc", "Your steps today, updated as you walk — also on the lock screen."));
        live.setSound(null, null);
        live.enableVibration(false);
        live.enableLights(false);
        live.setShowBadge(false);
        live.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(live);

        NotificationChannel alert = new NotificationChannel(CH_ALERT, s.str("channelAlert", "Step milestones"), NotificationManager.IMPORTANCE_HIGH);
        alert.setDescription(s.str("channelAlertDesc", "Every 1,000 steps and your daily goal, with a sound."));
        alert.enableVibration(false);   // vibration is played by the service, per its own switch
        alert.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(alert);

        NotificationChannel quiet = new NotificationChannel(CH_ALERT_QUIET, s.str("channelAlertQuiet", "Step milestones (silent)"), NotificationManager.IMPORTANCE_HIGH);
        quiet.setSound(null, null);
        quiet.enableVibration(false);
        quiet.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(quiet);

        // The JS-driven channel from MAHDI-JYM 2.0.0 is superseded by CH_LIVE.
        try { nm.deleteNotificationChannel("pedometer"); } catch (Exception ignored) { }
    }

    static NumberFormat numbers(StepStore s) {
        String tag = s.locale();
        Locale l = tag == null || tag.isEmpty() ? Locale.getDefault() : Locale.forLanguageTag(tag);
        return NumberFormat.getIntegerInstance(l);
    }

    static String oneDecimal(StepStore s, double v) {
        String tag = s.locale();
        Locale l = tag == null || tag.isEmpty() ? Locale.getDefault() : Locale.forLanguageTag(tag);
        NumberFormat f = NumberFormat.getNumberInstance(l);
        f.setMinimumFractionDigits(1);
        f.setMaximumFractionDigits(1);
        return f.format(v);
    }

    static String twoDecimals(StepStore s, double v) {
        String tag = s.locale();
        Locale l = tag == null || tag.isEmpty() ? Locale.getDefault() : Locale.forLanguageTag(tag);
        NumberFormat f = NumberFormat.getNumberInstance(l);
        f.setMinimumFractionDigits(2);
        f.setMaximumFractionDigits(2);
        return f.format(v);
    }

    static PendingIntent openApp(Context c, int req) {
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        i.putExtra(StepServicePlugin.EXTRA_ROUTE, "/walk");
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static PendingIntent serviceAction(Context c, String action, int req) {
        Intent i = new Intent(c, StepCounterService.class).setAction(action);
        return PendingIntent.getService(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Motivation that follows the day's progress (5 tiers + done), texts from the web app. */
    static String motto(StepStore s, int steps, int goal) {
        if (s.paused) return s.str("pausedLine", "Paused — tap Resume to keep counting.");
        if (steps >= goal) return s.message("mottoDone", steps / 1000, "Goal reached — every extra step is a bonus!");
        int pct = goal > 0 ? steps * 100 / goal : 0;
        String key = pct < 10 ? "motto0" : pct < 40 ? "motto1" : pct < 70 ? "motto2" : pct < 90 ? "motto3" : "motto4";
        String def = pct < 10 ? "Every journey starts with one step." : pct < 40 ? "Good start — keep moving!"
            : pct < 70 ? "Halfway there — you've got this." : pct < 90 ? "Almost there — push on!" : "Just a few more steps!";
        String line = s.message(key, steps / 500, def);
        int left = Math.max(0, goal - steps);
        return line.replace("{left}", numbers(s).format(left));
    }

    /**
     * A bare notification for the brief moment the service must be in the foreground even
     * though it is about to stop (permission revoked, or the full layout failed to build).
     */
    static Notification minimal(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CH_LIVE) == null) {
                try { nm.createNotificationChannel(new NotificationChannel(CH_LIVE, "Steps", NotificationManager.IMPORTANCE_LOW)); }
                catch (RuntimeException ignored) { }
            }
        }
        return new NotificationCompat.Builder(c, CH_LIVE)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setContentTitle("MAHDI-JYM")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .setOngoing(true)
            .build();
    }

    /**
     * 2.7.0 — the ONE notification: steps and water together (the separate water panel only
     * shows while the step counter is off). Collapsed: steps | water side by side and "+" your
     * usual container. Expanded: date · status · clock · pause, the steps and water cards,
     * km · kcal · km/h · walking time, the four containers with Undo and Edit, the motto and
     * the countdown to midnight. Water is left out when the tracker or "Water in the
     * notifications" is off — the steps card then spans the width.
     */
    static Notification build(Context c, StepStore s, double speed, boolean moving) {
        int steps = s.total();
        int goal = s.goal();
        NumberFormat nf = numbers(s);
        int pct = goal > 0 ? (int) Math.min(999, (long) steps * 100 / goal) : 0;
        String stepsTxt = nf.format(steps);
        String goalTxt = "/ " + nf.format(goal);
        String zone = s.clockZone();
        WaterStore w = WaterStore.get(c);
        boolean water = w.panelOn();

        RemoteViews small = new RemoteViews(c.getPackageName(), R.layout.notif_live_small);
        fillLiveSmall(c, small, s, w, water, nf, steps, goal, pct, zone);
        RemoteViews big = new RemoteViews(c.getPackageName(), R.layout.notif_live_big);
        fillLive(c, big, s, w, water, speed, moving, nf, steps, goal, pct, zone);

        String title = s.str("todayTitle", "Steps today") + " · " + stepsTxt + " " + goalTxt;
        String text = twoDecimals(s, s.km()) + " " + s.str("km", "km") + " · " + nf.format(s.kcal()) + " " + s.str("kcal", "kcal")
            + " · " + oneDecimal(s, speed) + " " + s.str("kmh", "km/h");
        String wl = waterLine(c);
        if (wl != null) text = text + " · " + wl;

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH_LIVE)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setContentTitle(title)
            .setContentText(text)
            .setCustomContentView(small)
            .setCustomBigContentView(big)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setContentIntent(openApp(c, 1))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setLocalOnly(true)
            .setColor(0xFF30D158)
            .setCategory("workout")   // Notification.CATEGORY_WORKOUT (API 31); a plain string on older releases
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        // Pause / Resume, the containers, Undo and Edit live inside the layout; no action row,
        // which would cost the expanded view ~48dp.
        return b.build();
    }

    /** Collapsed: steps | water, "+" the usual container (or the clock when water is off). */
    static void fillLiveSmall(Context c, RemoteViews v, StepStore s, WaterStore w, boolean water,
                              NumberFormat nf, int steps, int goal, int pct, String zone) {
        v.setTextViewText(R.id.n_steps, nf.format(steps));
        v.setTextColor(R.id.n_steps, steps >= goal ? 0xFFFFD60A : 0xFF30D158);
        v.setTextViewText(R.id.n_pct, s.paused ? s.str("paused", "Paused") : "/ " + nf.format(goal) + " · " + pct + "%");
        v.setTextColor(R.id.n_pct, s.paused ? 0xFFFF9F0A : 0xFF8E8E93);
        v.setProgressBar(R.id.n_progress, Math.max(1, goal), Math.min(steps, goal), false);
        v.setString(R.id.n_clock, "setTimeZone", zone);
        if (water) {
            int ml = w.todayMl(), wg = w.goal();
            int wp = (int) Math.min(999, (long) ml * 100 / Math.max(1, wg));
            v.setViewVisibility(R.id.ws_box, View.VISIBLE);
            v.setViewVisibility(R.id.ws_add, View.VISIBLE);
            v.setViewVisibility(R.id.n_clock, View.GONE);
            v.setTextViewText(R.id.ws_ml, nf.format(ml));
            v.setTextColor(R.id.ws_ml, ml >= wg ? 0xFF30D158 : 0xFF64D2FF);
            v.setTextViewText(R.id.ws_pct, "/ " + nf.format(wg) + " · " + wp + "%");
            v.setProgressBar(R.id.ws_bar, Math.max(1, wg), Math.min(ml, wg), false);
            v.setImageViewResource(R.id.ws_icon, WaterReminder.shapeOf(w.unitKey()));
            v.setOnClickPendingIntent(R.id.ws_add, WaterReminder.liveDrink(c));
        } else {
            v.setViewVisibility(R.id.ws_box, View.GONE);
            v.setViewVisibility(R.id.ws_add, View.GONE);
            v.setViewVisibility(R.id.n_clock, View.VISIBLE);
        }
    }

    /** Expanded: the whole dashboard. */
    static void fillLive(Context c, RemoteViews v, StepStore s, WaterStore w, boolean water, double speed, boolean moving,
                         NumberFormat nf, int steps, int goal, int pct, String zone) {
        // header
        v.setString(R.id.n_date, "setTimeZone", zone);
        v.setString(R.id.n_clock, "setTimeZone", zone);
        String zl = s.str("zoneLabel", "");
        v.setTextViewText(R.id.n_status, (s.paused ? s.str("paused", "Paused") : moving ? s.str("walking", "Walking") : s.str("live", "Live"))
            + (zl.isEmpty() ? "" : " · " + zl));
        v.setTextColor(R.id.n_status, s.paused ? 0xFFFF9F0A : moving ? 0xFF30D158 : 0xFF8E8E93);
        v.setImageViewResource(R.id.n_pause_i, s.paused ? R.drawable.ic_n_play : R.drawable.ic_n_pause);
        v.setOnClickPendingIntent(R.id.n_pause, s.paused
            ? serviceAction(c, StepCounterService.ACTION_RESUME, 11)
            : serviceAction(c, StepCounterService.ACTION_PAUSE, 12));

        // steps card
        v.setTextViewText(R.id.n_label, s.str("stepsLabel", "Steps"));
        v.setTextViewText(R.id.n_pct, pct + "%");
        v.setTextViewText(R.id.n_steps, nf.format(steps));
        v.setTextColor(R.id.n_steps, steps >= goal ? 0xFFFFD60A : 0xFF30D158);
        v.setTextViewText(R.id.n_goal, "/ " + nf.format(goal));
        v.setProgressBar(R.id.n_progress, Math.max(1, goal), Math.min(steps, goal), false);
        v.setTextViewText(R.id.n_togo, steps >= goal ? "\u2713 " + s.str("stepsDone", "Goal reached!")
            : s.str("stepsLeft", "{left} steps to go").replace("{left}", nf.format(goal - steps)));
        v.setTextColor(R.id.n_togo, steps >= goal ? 0xFFFFD60A : 0xFFC7C7CC);

        // water card + containers
        if (water) {
            int ml = w.todayMl(), wg = w.goal();
            int wp = (int) Math.min(999, (long) ml * 100 / Math.max(1, wg));
            v.setViewVisibility(R.id.w_card, View.VISIBLE);
            v.setViewVisibility(R.id.w_row, View.VISIBLE);
            v.setTextViewText(R.id.w_label, w.str("label", "Water"));
            v.setTextViewText(R.id.w_pct, wp + "%");
            v.setTextViewText(R.id.w_ml, nf.format(ml));
            v.setTextColor(R.id.w_ml, ml >= wg ? 0xFF30D158 : 0xFF64D2FF);
            v.setTextViewText(R.id.w_goal, "/ " + nf.format(wg) + " " + w.str("mlUnit", "ml"));
            v.setProgressBar(R.id.w_bar, Math.max(1, wg), Math.min(ml, wg), false);
            v.setTextViewText(R.id.w_togo, ml >= wg ? "\u2713 " + w.str("panelDone", "Goal reached — well done!")
                : w.fill(w.str("panelLeft", "{left} ml to go"), ml));
            v.setTextColor(R.id.w_togo, ml >= wg ? 0xFF30D158 : 0xFFC7C7CC);
            WaterReminder.fillChips(c, w, v, nf);
            v.setImageViewResource(R.id.w_undo_i, w.canUndo() ? R.drawable.ic_w_undo : R.drawable.ic_w_undo_off);
            v.setOnClickPendingIntent(R.id.w_undo, WaterReminder.undoIntent(c));
            v.setOnClickPendingIntent(R.id.w_edit, WaterReminder.editIntent(c));
        } else {
            v.setViewVisibility(R.id.w_card, View.GONE);
            v.setViewVisibility(R.id.w_row, View.GONE);
        }

        // stats
        v.setTextViewText(R.id.n_km, twoDecimals(s, s.km()));
        v.setTextViewText(R.id.n_kcal, nf.format(s.kcal()));
        v.setTextViewText(R.id.n_speed, oneDecimal(s, moving ? speed : 0));
        v.setTextViewText(R.id.l_km, s.str("km", "km"));
        v.setTextViewText(R.id.l_kcal, s.str("kcal", "kcal"));
        v.setTextViewText(R.id.l_speed, s.str("kmh", "km/h"));
        v.setTextViewText(R.id.l_active, s.str("active", "active"));
        v.setChronometer(R.id.n_active, SystemClock.elapsedRealtime() - s.activeMs, null, moving && !s.paused);

        // footer
        v.setTextViewText(R.id.n_motto, motto(s, steps, goal));
        if (Build.VERSION.SDK_INT >= 24) {
            v.setViewVisibility(R.id.n_left_box, View.VISIBLE);
            v.setTextViewText(R.id.l_left, s.str("dayLeft", "Day ends in"));
            v.setChronometer(R.id.n_left, SystemClock.elapsedRealtime() + StepStore.msToMidnight(), null, true);
            v.setChronometerCountDown(R.id.n_left, true);
        } else {
            v.setViewVisibility(R.id.n_left_box, View.GONE);
        }
    }

    /** "💧 1,250 / 2,000 ml" — null when the water tracker is off. */
    static String waterLine(Context c) {
        WaterStore w = WaterStore.get(c);
        if (!w.trackerOn()) return null;
        return w.fill(w.str("liveRow", "\uD83D\uDCA7 {ml} / {goal} ml"), w.todayMl());
    }

    /** Fills the big layout; also used for the home-screen widget, which shares the ids. */
    static void fillBig(Context c, RemoteViews v, StepStore s, double speed, boolean moving,
                        NumberFormat nf, int steps, int goal, int pct, String zone) {
        v.setTextViewText(R.id.n_title, s.str("todayTitle", "Steps today"));
        v.setTextViewText(R.id.n_status, s.paused ? s.str("paused", "Paused") : moving ? s.str("walking", "Walking") : s.str("live", "Live"));
        v.setTextColor(R.id.n_status, s.paused ? 0xFFFF9F0A : moving ? 0xFF30D158 : 0xFF8E8E93);
        v.setTextViewText(R.id.n_steps, nf.format(steps));
        v.setTextViewText(R.id.n_goal, "/ " + nf.format(goal));
        v.setTextViewText(R.id.n_pct, pct + "%");
        v.setTextColor(R.id.n_steps, steps >= goal ? 0xFFFFD60A : 0xFF30D158);
        v.setProgressBar(R.id.n_progress, Math.max(1, goal), Math.min(steps, goal), false);

        v.setTextViewText(R.id.n_km, twoDecimals(s, s.km()));
        v.setTextViewText(R.id.n_kcal, nf.format(s.kcal()));
        v.setTextViewText(R.id.n_speed, oneDecimal(s, moving ? speed : 0));
        v.setTextViewText(R.id.l_km, s.str("km", "km"));
        v.setTextViewText(R.id.l_kcal, s.str("kcal", "kcal"));
        v.setTextViewText(R.id.l_speed, s.str("kmh", "km/h"));
        v.setTextViewText(R.id.l_active, s.str("active", "active"));

        // Walking time: a Chronometer that the system ticks while we're moving.
        v.setChronometer(R.id.n_active, SystemClock.elapsedRealtime() - s.activeMs, null, moving && !s.paused);

        v.setString(R.id.n_clock, "setTimeZone", zone);
        v.setString(R.id.n_date, "setTimeZone", zone);
        v.setTextViewText(R.id.n_zone, s.str("zoneLabel", ""));

        // Countdown to midnight ("the day ends in 05:12:33").
        if (Build.VERSION.SDK_INT >= 24) {
            v.setViewVisibility(R.id.n_left_box, View.VISIBLE);
            v.setTextViewText(R.id.l_left, s.str("dayLeft", "Day ends in"));
            v.setChronometer(R.id.n_left, SystemClock.elapsedRealtime() + StepStore.msToMidnight(), null, true);
            v.setChronometerCountDown(R.id.n_left, true);
        } else {
            v.setViewVisibility(R.id.n_left_box, View.GONE);
        }

        v.setTextViewText(R.id.n_motto, motto(s, steps, goal));

        WaterStore w = WaterStore.get(c);
        String water = waterLine(c);
        if (water != null) {
            int ml = w.todayMl(), wg = w.goal();
            v.setViewVisibility(R.id.n_water_box, View.VISIBLE);
            v.setTextViewText(R.id.n_water, water);
            v.setProgressBar(R.id.n_water_bar, Math.max(1, wg), Math.min(ml, wg), false);
        } else {
            v.setViewVisibility(R.id.n_water_box, View.GONE);
        }
    }

    /** One-off milestone / goal alert — audible unless sounds are switched off. */
    static void alert(Context c, StepStore s, String title, String body) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        boolean sound = s.pref("sound", true);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, sound ? CH_ALERT : CH_ALERT_QUIET)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(openApp(c, 2))
            .setAutoCancel(true)
            .setColor(0xFF30D158)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setTimeoutAfter(60_000);
        if (!sound) b.setSilent(true);
        try { nm.notify(ALERT_ID, b.build()); } catch (SecurityException ignored) { /* notifications off */ }
    }
}
