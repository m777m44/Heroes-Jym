package io.github.m777m44.mahdijym.steps;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import java.text.NumberFormat;
import java.util.TimeZone;

import io.github.m777m44.mahdijym.R;

/**
 * Water reminders that work with the app closed (2.5).
 *
 *  REMIND  (alarm)                 posts the reminder — today's water against the goal with a
 *                                  progress bar, today's steps, and a short exercise picked from
 *                                  the day so far (a walk after sitting still or when behind the
 *                                  step pace, else a rotating mini-workout) — then arms the next
 *  DRINK   ("Drank it" / "+ cup")  adds one container natively, refreshes the live step
 *                                  notification and the widget, celebrates when the goal is hit
 *  SNOOZE  ("In 15 min")           asks again in 15 minutes
 *
 * Reminders only fire inside the active hours and are skipped once the goal is reached.
 * Re-armed after a reboot (BootReceiver) and whenever the settings change (configureWater).
 */
public class WaterReminder extends BroadcastReceiver {
    static final String ACTION_REMIND = "io.github.m777m44.mahdijym.water.REMIND";
    static final String ACTION_DRINK = "io.github.m777m44.mahdijym.water.DRINK";
    static final String ACTION_SNOOZE = "io.github.m777m44.mahdijym.water.SNOOZE";
    static final int NOTIF_ID = 7101, ADDED_ID = 7102;
    static final String CH = "mj_water", CH_QUIET = "mj_water_quiet";
    private static final int REQ_ALARM = 51, REQ_DRINK = 52, REQ_SNOOZE = 53, REQ_OPEN = 54, REQ_LIVE_DRINK = 55;

    @Override public void onReceive(Context ctx, Intent intent) {
        String a = intent == null ? null : intent.getAction();
        if (a == null) return;
        Context c = ctx.getApplicationContext();
        try {
            if (ACTION_REMIND.equals(a)) remind(c);
            else if (ACTION_DRINK.equals(a)) drink(c);
            else if (ACTION_SNOOZE.equals(a)) snooze(c);
        } catch (RuntimeException ignored) { /* a receiver must never crash */ }
    }

    // ---- actions -------------------------------------------------------------------------

    private static void remind(Context c) {
        WaterStore w = WaterStore.get(c);
        long now = System.currentTimeMillis();
        if (w.remindOn() && w.todayMl() < w.goal()
                && WaterMath.withinHours(now, w.fromMin(), w.toMin(), TimeZone.getDefault())) {
            post(c, false);
        }
        schedule(c);
    }

    static void drink(Context c) {
        WaterStore w = WaterStore.get(c);
        int goal = w.goal();
        int before = w.todayMl();
        int after = w.add(w.unitMl());
        cancel(c, NOTIF_ID);
        w.emit();
        StepCounterService svc = StepCounterService.instance;
        if (svc != null) svc.refreshNotification();
        try { StepWidget.updateAll(c); } catch (RuntimeException ignored) { }

        String today = StepStore.today();
        if (before < goal && after >= goal && !today.equals(w.celebratedDay)) {
            w.celebratedDay = today;
            w.save();
            if (!StepCounterService.appVisible) Celebration.water(c, w, after);
        } else if (svc == null) {
            // No live notification to show the new total — a brief confirmation instead.
            confirm(c, w, after);
        }
    }

    private static void snooze(Context c) {
        cancel(c, NOTIF_ID);
        WaterStore w = WaterStore.get(c);
        w.snoozedAt = System.currentTimeMillis();
        w.save();
        arm(c, System.currentTimeMillis() + 15 * 60_000L);
    }

    // ---- scheduling ----------------------------------------------------------------------

    private static PendingIntent alarmIntent(Context c) {
        Intent i = new Intent(c, WaterReminder.class).setAction(ACTION_REMIND);
        return PendingIntent.getBroadcast(c, REQ_ALARM, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static PendingIntent action(Context c, String action, int req) {
        Intent i = new Intent(c, WaterReminder.class).setAction(action);
        return PendingIntent.getBroadcast(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** The "+ cup" button on the live step notification. */
    static PendingIntent liveDrink(Context c) { return action(c, ACTION_DRINK, REQ_LIVE_DRINK); }

    /** Arm the next reminder (or clear it when reminders are off). */
    static void schedule(Context c) {
        WaterStore w = WaterStore.get(c);
        if (!w.remindOn()) { disarm(c); cancel(c, NOTIF_ID); return; }
        arm(c, WaterMath.nextSlot(System.currentTimeMillis(), w.fromMin(), w.toMin(), w.every(), TimeZone.getDefault()));
    }

    private static void arm(Context c, long when) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent p = alarmIntent(c);
        try {
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, p);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, p);
        } catch (RuntimeException e) {
            try { am.set(AlarmManager.RTC_WAKEUP, when, p); } catch (RuntimeException ignored) { }
        }
    }

    static void disarm(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            try { am.cancel(alarmIntent(c)); } catch (RuntimeException ignored) { }
        }
    }

    private static void cancel(Context c, int id) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(id);
    }

    // ---- the notification ----------------------------------------------------------------

    static void createChannels(Context c, WaterStore w) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CH, w.str("channel", "Water reminders"), NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(w.str("channelDesc", "A reminder to drink, with a short exercise."));
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
        NotificationChannel q = new NotificationChannel(CH_QUIET, w.str("channelQuiet", "Water reminders (silent)"), NotificationManager.IMPORTANCE_HIGH);
        q.setSound(null, null);
        q.enableVibration(false);
        q.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(q);
    }

    /** The exercise line: a walk when sitting still / behind on steps, else a mini-workout. */
    static String moveLine(WaterStore w, StepStore s, long now) {
        if (!w.moveOn()) return null;
        int steps = s.total();
        int[] sg = WaterMath.suggest(now, steps, s.goal(), s.lastStepAt, w.fromMin(), w.toMin(),
            (int) (now / (w.every() * 60_000L)), w.moveCount(), TimeZone.getDefault());
        NumberFormat nf = w.numbers();
        if (sg[0] == WaterMath.WALK) {
            return w.str("walk", "\uD83D\uDEB6 Walk {n} steps — about {min} min")
                .replace("{n}", nf.format(sg[1])).replace("{min}", nf.format(sg[2]));
        }
        return w.str("move", "\uD83C\uDFCB Quick move: {move}").replace("{move}", w.move(sg[1]));
    }

    /** Post the reminder now (`test`: from the settings screen, even outside the hours). */
    static void post(Context c, boolean test) {
        WaterStore w = WaterStore.get(c);
        StepStore s = StepStore.get(c);
        s.rollIfNeeded();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try { createChannels(c, w); } catch (RuntimeException ignored) { }
        long now = System.currentTimeMillis();
        int ml = w.todayMl(), goal = w.goal();
        NumberFormat nf = w.numbers();

        String title = w.str("title", "\uD83D\uDCA7 Time for water");
        String line1 = w.fill(w.str("body", "{ml} / {goal} ml today"), ml)
            + " · " + w.str("stepsLine", "{steps} steps").replace("{steps}", nf.format(s.total()));
        String move = moveLine(w, s, now);
        String big = move == null ? line1 : line1 + "\n" + move;

        boolean sound = w.pref("sound", true);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, sound ? CH : CH_QUIET)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setContentTitle(title)
            .setContentText(move == null ? line1 : move)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(big))
            .setProgress(Math.max(1, goal), Math.min(ml, goal), false)
            .setSubText(Math.min(999, ml * 100 / Math.max(1, goal)) + "%")
            .setColor(0xFF0A84FF)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setContentIntent(Celebration.openApp(c, REQ_OPEN, "/water"))
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setTimeoutAfter(Math.max(15, w.every() - 5) * 60_000L)
            .addAction(0, w.str("drink", "Drank it"), action(c, ACTION_DRINK, REQ_DRINK))
            .addAction(0, w.str("snooze", "In 15 min"), action(c, ACTION_SNOOZE, REQ_SNOOZE));
        if (!sound) b.setSilent(true);
        if (test) b.setWhen(now);
        try { nm.notify(NOTIF_ID, b.build()); } catch (SecurityException ignored) { /* notifications off */ }
    }

    /** "+250 ml · 1,250 / 2,000 ml" for a few seconds. */
    private static void confirm(Context c, WaterStore w, int ml) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try { createChannels(c, w); } catch (RuntimeException ignored) { }
        String text = w.fill(w.str("added", "+{unit} ml · {ml} / {goal} ml"), ml);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH_QUIET)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setContentTitle("\uD83D\uDCA7 " + text)
            .setProgress(Math.max(1, w.goal()), Math.min(ml, w.goal()), false)
            .setColor(0xFF0A84FF)
            .setSilent(true)
            .setAutoCancel(true)
            .setContentIntent(Celebration.openApp(c, REQ_OPEN, "/water"))
            .setTimeoutAfter(6000);
        try { nm.notify(ADDED_ID, b.build()); } catch (SecurityException ignored) { }
    }
}
