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
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

import java.text.NumberFormat;
import java.util.TimeZone;

import io.github.m777m44.mahdijym.R;

/**
 * Water in the notifications — reminders and the water panel, all working with the app closed.
 *
 *  The panel (2.6)  one notification with today's water against the goal, a bar, where the
 *                   goal comes from (automatic: base + walking + training), the four
 *                   containers — glass, cup, can, bottle, each with its own shape — that add
 *                   themselves when tapped, Undo and Edit. Kept up to date quietly; the step
 *                   service refreshes it when the numbers change (live steps move the goal).
 *  REMIND (alarm)   the same notification posted loudly, with the exercise line — a walk
 *                   after sitting still / when behind the step pace, else a mini-workout — and
 *                   "In 15 min"; then the next alarm is armed
 *  ADD              adds the tapped container (DRINK: the usual one — "Drank it", "+ water")
 *  UNDO             takes the last drink of today back
 *  SNOOZE           asks again in 15 minutes
 *
 * 2.7.0 — one bar: while the step counter runs, the panel is part of the step notification
 * (StepNotifier.fillLive) and is not posted on its own. A reminder still has to be heard, so
 * it pops up separately for a moment — and goes away by itself when you drink, tap
 * "In 15 min", or after 15 minutes.
 *
 * Reminders only fire inside the active hours and are skipped once the goal is reached.
 * Re-armed after a reboot (BootReceiver) and whenever the settings change (configureWater).
 */
public class WaterReminder extends BroadcastReceiver {
    static final String ACTION_REMIND = "io.github.m777m44.mahdijym.water.REMIND";
    static final String ACTION_DRINK = "io.github.m777m44.mahdijym.water.DRINK";
    static final String ACTION_ADD = "io.github.m777m44.mahdijym.water.ADD";
    static final String ACTION_UNDO = "io.github.m777m44.mahdijym.water.UNDO";
    static final String ACTION_SNOOZE = "io.github.m777m44.mahdijym.water.SNOOZE";
    static final int NOTIF_ID = 7101, ADDED_ID = 7102;
    static final String CH = "mj_water", CH_QUIET = "mj_water_quiet", CH_PANEL = "mj_water_panel";
    /** 2.9 — channels can't change after creation, so vibration lives in two new ones. */
    static final String CH_VIB = "mj_water_vib", CH_QUIET_VIB = "mj_water_quiet_vib";
    /** "drip, drip, drop" */
    static final long[] VIBRATION = { 0, 180, 120, 180, 120, 420 };
    private static final int REQ_ALARM = 51, REQ_DRINK = 52, REQ_SNOOZE = 53, REQ_OPEN = 54, REQ_LIVE_DRINK = 55;
    private static final int REQ_ADD0 = 60, REQ_UNDO = 64, REQ_EDIT = 65, REQ_SMALL_ADD = 66, REQ_SMALL_UNDO = 67;

    private static final int[] CHIP = { R.id.w_c0, R.id.w_c1, R.id.w_c2, R.id.w_c3 };
    private static final int[] CHIP_ICON = { R.id.w_i0, R.id.w_i1, R.id.w_i2, R.id.w_i3 };
    private static final int[] CHIP_NAME = { R.id.w_n0, R.id.w_n1, R.id.w_n2, R.id.w_n3 };
    private static final int[] CHIP_ML = { R.id.w_m0, R.id.w_m1, R.id.w_m2, R.id.w_m3 };
    private static final int[] SHAPE = { R.drawable.ic_w_glass, R.drawable.ic_w_cup, R.drawable.ic_w_can, R.drawable.ic_w_bottle };
    private static final String[] KEYS = { "glass", "cup", "can", "bottle" };

    /** What the panel last showed — it is only re-posted when this changes. */
    private static volatile String panelSig = null;
    /** While a reminder is up next to the step notification (merged mode), until when. */
    private static volatile long alertUntil = 0;
    private static final long MERGED_ALERT_MS = 15 * 60_000L;

    /** The step notification is up and carries the water too (one bar instead of two). */
    static boolean merged() {
        StepCounterService svc = StepCounterService.instance;
        return svc != null && svc.live();
    }

    private static boolean alertUp() { return System.currentTimeMillis() < alertUntil; }

    /** The step service went live: the water now shows in its notification — drop the panel. */
    static void mergeIntoLive(Context c) {
        if (!alertUp()) cancel(c, NOTIF_ID);
    }

    static int shapeOf(String key) {
        for (int i = 0; i < 4; i++) if (KEYS[i].equals(key)) return SHAPE[i];
        return SHAPE[1];
    }

    @Override public void onReceive(Context ctx, Intent intent) {
        String a = intent == null ? null : intent.getAction();
        if (a == null) return;
        Context c = ctx.getApplicationContext();
        try {
            if (ACTION_REMIND.equals(a)) remind(c);
            else if (ACTION_DRINK.equals(a)) drink(c);
            else if (ACTION_ADD.equals(a)) add(c, intent.getIntExtra("ml", 0));
            else if (ACTION_UNDO.equals(a)) undo(c);
            else if (ACTION_SNOOZE.equals(a)) snooze(c);
        } catch (RuntimeException ignored) { /* a receiver must never crash */ }
    }

    // ---- actions -------------------------------------------------------------------------

    private static void remind(Context c) {
        WaterStore w = WaterStore.get(c);
        long now = System.currentTimeMillis();
        if (w.remindOn() && w.todayMl() < w.goal()
                && WaterMath.withinHours(now, w.fromMin(), w.toMin(), TimeZone.getDefault())) {
            show(c, true, false);
        } else {
            refreshPanel(c, true);           // a new day, or a goal that moved — keep the panel true
        }
        schedule(c);
    }

    /** One of the usual container ("Drank it", "+ water"). */
    static void drink(Context c) { add(c, WaterStore.get(c).unitMl()); }

    static void add(Context c, int ml) {
        WaterStore w = WaterStore.get(c);
        if (ml < 50 || ml > 2000) ml = w.unitMl();
        int before = w.todayMl();
        int goalBefore = w.goal();
        int after = w.add(ml);
        afterChange(c, w);

        String today = StepStore.today();
        if (before < goalBefore && after >= w.goal() && !today.equals(w.celebratedDay)) {
            w.celebratedDay = today;
            w.save();
            if (!StepCounterService.appVisible) Celebration.water(c, w, after);
        } else if (!w.panelOn() && StepCounterService.instance == null) {
            // No panel and no live notification to show the new total — a brief confirmation.
            confirm(c, w, after, "+" + w.numbers().format(ml));
        }
    }

    static void undo(Context c) {
        WaterStore w = WaterStore.get(c);
        int removed = w.undoLast();
        afterChange(c, w);
        if (removed > 0 && !w.panelOn()) confirm(c, w, w.todayMl(), "\u2212" + w.numbers().format(removed));
    }

    /** Tell the app, refresh the live step notification, the widget and the panel. */
    private static void afterChange(Context c, WaterStore w) {
        w.emit();
        StepCounterService svc = StepCounterService.instance;
        if (svc != null) svc.refreshNotification();
        try { StepWidget.updateAll(c); } catch (RuntimeException ignored) { }
        if (merged()) { alertUntil = 0; cancel(c, NOTIF_ID); }   // drank → the reminder has done its job
        else if (w.panelOn()) refreshPanel(c, true);
        else cancel(c, NOTIF_ID);
    }

    private static void snooze(Context c) {
        WaterStore w = WaterStore.get(c);
        w.snoozedAt = System.currentTimeMillis();
        w.save();
        arm(c, System.currentTimeMillis() + 15 * 60_000L);
        if (merged()) { alertUntil = 0; cancel(c, NOTIF_ID); }
        else if (w.panelOn()) refreshPanel(c, true);
        else cancel(c, NOTIF_ID);
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

    private static PendingIntent addIntent(Context c, int ml, int req) {
        Intent i = new Intent(c, WaterReminder.class).setAction(ACTION_ADD).putExtra("ml", ml);
        return PendingIntent.getBroadcast(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** The "+ water" button on the live step notification. */
    static PendingIntent liveDrink(Context c) { return action(c, ACTION_DRINK, REQ_LIVE_DRINK); }
    static PendingIntent undoIntent(Context c) { return action(c, ACTION_UNDO, REQ_UNDO); }
    static PendingIntent editIntent(Context c) { return Celebration.openApp(c, REQ_EDIT, "/water"); }

    /** Arm the next reminder (or clear it when reminders are off). */
    static void schedule(Context c) {
        WaterStore w = WaterStore.get(c);
        if (!w.remindOn()) {
            disarm(c);
            if (w.panelOn()) refreshPanel(c, false); else cancel(c, NOTIF_ID);
            return;
        }
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
        if (id == NOTIF_ID) panelSig = null;
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
        NotificationChannel v = new NotificationChannel(CH_VIB, w.str("channelVib", "Water reminders (vibrate)"), NotificationManager.IMPORTANCE_HIGH);
        v.setDescription(w.str("channelDesc", "A reminder to drink, with a short exercise."));
        v.enableVibration(true);
        v.setVibrationPattern(VIBRATION);
        v.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(v);
        NotificationChannel qv = new NotificationChannel(CH_QUIET_VIB, w.str("channelQuietVib", "Water reminders (vibrate only)"), NotificationManager.IMPORTANCE_HIGH);
        qv.setSound(null, null);
        qv.enableVibration(true);
        qv.setVibrationPattern(VIBRATION);
        qv.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(qv);
        // The quiet panel: no sound, no pop-up, still on the lock screen.
        NotificationChannel p = new NotificationChannel(CH_PANEL, w.str("channelPanel", "Water in the notifications"), NotificationManager.IMPORTANCE_LOW);
        p.setSound(null, null);
        p.enableVibration(false);
        p.setShowBadge(false);
        p.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(p);
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
    static void post(Context c, boolean test) { show(c, true, test); }

    /** Re-post the quiet panel when what it shows has changed (or `force`). */
    static void refreshPanel(Context c, boolean force) {
        WaterStore w = WaterStore.get(c);
        if (!w.panelOn()) return;
        if (merged()) {                       // the step notification shows the water
            if (!alertUp() && panelSig != null) cancel(c, NOTIF_ID);
            return;
        }
        String sig = signature(w);
        if (!force && sig.equals(panelSig)) return;
        show(c, false, false);
    }

    private static String signature(WaterStore w) {
        return StepStore.today() + "|" + w.todayMl() + "|" + w.goal() + "|" + w.canUndo() + "|" + w.unitMl() + "|" + w.locale();
    }

    /** "1,250 / 2,650 ml" */
    private static String amount(WaterStore w, NumberFormat nf, int ml, int goal) {
        return nf.format(ml) + " / " + nf.format(goal) + " " + w.str("mlUnit", "ml");
    }

    /** "1,400 ml to go · Auto goal: 2,000 + 350 walking + 300 training" */
    private static String subLine(WaterStore w, NumberFormat nf, int ml, int goal) {
        String head = ml >= goal ? w.str("panelDone", "Goal reached — well done!")
            : w.fill(w.str("panelLeft", "{left} ml to go"), ml);
        if (!w.autoGoal()) return head;
        String auto = w.str("panelAuto", "Auto goal: {base} + {walk} walking + {train} training")
            .replace("{base}", nf.format(w.baseMl()))
            .replace("{walk}", nf.format(w.walkMl()))
            .replace("{train}", nf.format(w.workoutMl()));
        return head + " · " + auto;
    }

    /**
     * The water notification. `alert`: a reminder (heads-up, sound per settings, exercise line,
     * "In 15 min"); otherwise the quiet panel.
     */
    static void show(Context c, boolean alert, boolean test) {
        boolean inLive = merged();
        if (!alert && inLive) {               // one bar: refresh the step notification instead
            StepCounterService svc = StepCounterService.instance;
            if (svc != null) svc.refreshNotification();
            return;
        }
        WaterStore w = WaterStore.get(c);
        StepStore s = StepStore.get(c);
        s.rollIfNeeded();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try { createChannels(c, w); } catch (RuntimeException ignored) { }
        long now = System.currentTimeMillis();
        int ml = w.todayMl(), goal = w.goal();
        int pct = (int) Math.min(999, (long) ml * 100 / Math.max(1, goal));
        NumberFormat nf = w.numbers();
        boolean panel = w.panelOn() && !inLive;   // a standalone panel stays after the reminder
        String move = alert ? moveLine(w, s, now) : null;
        String amountTxt = amount(w, nf, ml, goal);
        String sub = subLine(w, nf, ml, goal);

        RemoteViews big = new RemoteViews(c.getPackageName(), R.layout.notif_water);
        fill(c, w, big, nf, amountTxt, pct, ml, goal, sub, move, alert);
        RemoteViews small = new RemoteViews(c.getPackageName(), R.layout.notif_water_small);
        fillSmall(c, w, small, nf, amountTxt, pct, ml, goal);

        String title = alert ? w.str("title", "\uD83D\uDCA7 Time for water")
            : "\uD83D\uDCA7 " + w.str("panelTitle", "Water today") + " · " + amountTxt;
        String text = alert
            ? (move == null ? amountTxt : move)
            : sub;

        boolean sound = w.pref("sound", true);
        boolean vib = w.remindVibrate();
        String channel = !alert ? CH_PANEL : sound ? (vib ? CH_VIB : CH) : (vib ? CH_QUIET_VIB : CH_QUIET);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, channel)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setContentTitle(title)
            .setContentText(text)
            .setSubText(pct + "%")
            .setCustomContentView(small)
            .setCustomBigContentView(big)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setColor(0xFF0A84FF)
            .setContentIntent(Celebration.openApp(c, REQ_OPEN, "/water"))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setLocalOnly(true);
        if (alert) {
            b.setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setOnlyAlertOnce(false)
                .setShowWhen(true)
                .setWhen(now)
                .setAutoCancel(!panel)
                .setOngoing(false)
                .addAction(0, w.str("drink", "Drank it"), action(c, ACTION_DRINK, REQ_DRINK))
                .addAction(0, w.str("snooze", "In 15 min"), action(c, ACTION_SNOOZE, REQ_SNOOZE));
            if (inLive) b.setTimeoutAfter(MERGED_ALERT_MS);
            else if (!panel) b.setTimeoutAfter(Math.max(15, w.every() - 5) * 60_000L);
            if (vib) b.setVibrate(VIBRATION);                 // Android 7 and older (no channels)
            if (!sound && !vib) b.setSilent(true);
            else if (!sound) b.setSound(null);
        } else {
            b.setCategory(NotificationCompat.CATEGORY_STATUS)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setShowWhen(false)
                .setOngoing(true);
        }
        try {
            nm.notify(NOTIF_ID, b.build());
            panelSig = signature(w);
            if (alert && inLive) alertUntil = now + MERGED_ALERT_MS;
        } catch (RuntimeException ignored) { /* notifications off, or a layout the system refused */ }
    }

    /** The expanded panel: amounts, bar, where the goal comes from, the containers, actions. */
    private static void fill(Context c, WaterStore w, RemoteViews v, NumberFormat nf, String amountTxt, int pct,
                             int ml, int goal, String sub, String move, boolean alert) {
        v.setTextViewText(R.id.w_amount, amountTxt);
        v.setTextViewText(R.id.w_pct, pct + "%");
        v.setTextColor(R.id.w_pct, ml >= goal ? 0xFF30D158 : 0xFF64D2FF);
        v.setProgressBar(R.id.w_bar, Math.max(1, goal), Math.min(ml, goal), false);
        v.setTextViewText(R.id.w_sub, sub);
        if (move != null) {
            v.setViewVisibility(R.id.w_move, View.VISIBLE);
            v.setTextViewText(R.id.w_move, move);
        } else {
            v.setViewVisibility(R.id.w_move, View.GONE);
        }
        fillChips(c, w, v, nf);
        v.setTextViewText(R.id.w_undo_t, w.str("undo", "Undo"));
        v.setOnClickPendingIntent(R.id.w_undo, action(c, ACTION_UNDO, REQ_UNDO));
        // Only setters RemoteViews is known to allow: a dimmed label when there is nothing to undo.
        v.setTextColor(R.id.w_undo_t, w.canUndo() ? 0xFFF2F2F7 : 0x66F2F2F7);
        v.setTextViewText(R.id.w_edit_t, w.str("edit", "Edit"));
        v.setOnClickPendingIntent(R.id.w_edit, Celebration.openApp(c, REQ_EDIT, "/water"));
        if (alert) {
            v.setViewVisibility(R.id.w_snooze, View.VISIBLE);
            v.setTextViewText(R.id.w_snooze_t, w.str("snooze", "In 15 min"));
            v.setOnClickPendingIntent(R.id.w_snooze, action(c, ACTION_SNOOZE, REQ_SNOOZE));
        } else {
            v.setViewVisibility(R.id.w_snooze, View.GONE);
        }
    }

    /** The four containers (shape, name, +ml; your usual one outlined), each adding itself. */
    static void fillChips(Context c, WaterStore w, RemoteViews v, NumberFormat nf) {
        String unit = w.unitKey();
        for (int i = 0; i < 4; i++) {
            int cml = w.containerMl(i);
            v.setImageViewResource(CHIP_ICON[i], SHAPE[i]);
            v.setTextViewText(CHIP_NAME[i], w.containerName(i));
            v.setTextViewText(CHIP_ML[i], "+" + nf.format(cml));
            v.setInt(CHIP[i], "setBackgroundResource", KEYS[i].equals(unit) ? R.drawable.notif_chip_sel : R.drawable.notif_chip);
            v.setOnClickPendingIntent(CHIP[i], addIntent(c, cml, REQ_ADD0 + i));
        }
    }

    /** The collapsed row: amount + bar, "+" the usual container, Undo. */
    private static void fillSmall(Context c, WaterStore w, RemoteViews v, NumberFormat nf, String amountTxt, int pct,
                                  int ml, int goal) {
        v.setTextViewText(R.id.ws_amount, amountTxt + " · " + pct + "%");
        v.setProgressBar(R.id.ws_bar, Math.max(1, goal), Math.min(ml, goal), false);
        String unit = w.unitKey();
        int idx = 1;
        for (int i = 0; i < 4; i++) if (KEYS[i].equals(unit)) idx = i;
        v.setImageViewResource(R.id.ws_icon, SHAPE[idx]);
        v.setTextViewText(R.id.ws_add_t, "+" + nf.format(w.unitMl()));
        v.setOnClickPendingIntent(R.id.ws_add, addIntent(c, w.unitMl(), REQ_SMALL_ADD));
        v.setOnClickPendingIntent(R.id.ws_undo, action(c, ACTION_UNDO, REQ_SMALL_UNDO));
        v.setViewVisibility(R.id.ws_undo, w.canUndo() ? View.VISIBLE : View.GONE);
    }

    /** "+250 ml · 1,250 / 2,000 ml" for a few seconds (when the panel is switched off). */
    private static void confirm(Context c, WaterStore w, int ml, String delta) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try { createChannels(c, w); } catch (RuntimeException ignored) { }
        int goal = w.goal();
        NumberFormat nf = w.numbers();
        String text = delta + " " + w.str("mlUnit", "ml") + " · " + amount(w, nf, ml, goal);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH_QUIET)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setContentTitle("\uD83D\uDCA7 " + text)
            .setProgress(Math.max(1, goal), Math.min(ml, goal), false)
            .setColor(0xFF0A84FF)
            .setSilent(true)
            .setAutoCancel(true)
            .setContentIntent(Celebration.openApp(c, REQ_OPEN, "/water"))
            .setTimeoutAfter(6000);
        try { nm.notify(ADDED_ID, b.build()); } catch (SecurityException ignored) { }
    }
}
