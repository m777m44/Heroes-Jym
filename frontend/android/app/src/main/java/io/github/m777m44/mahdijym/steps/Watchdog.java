package io.github.m777m44.mahdijym.steps;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;

/**
 * Keeps the step counter alive.
 *
 * The service is already sticky (the OS recreates it after killing it for memory) and is
 * restarted after a reboot by {@link BootReceiver}. On top of that, some phones (Xiaomi,
 * Huawei, Oppo, Vivo, Samsung "deep sleep"…) stop background apps outright — swiping the app
 * away from recents, a "cleaner", or the battery manager — and nothing brings them back until
 * the app is opened again. The watchdog closes that gap:
 *
 *   - an alarm every 30 minutes checks that the service is running whenever counting is
 *     switched on, and restarts it if not. 9.0: it no longer wakes the phone for that (it was
 *     ~96 wake-ups a day) — it is delivered the next time the phone is awake anyway (the screen
 *     comes on, a Doze maintenance window), which is when a stopped counter matters. It is still
 *     an exact allow-while-idle alarm, which keeps Android 12+'s foreground-service exemption;
 *   - a short one-off alarm after the task is swiped away or the service is destroyed
 *     without being switched off, so the counter is back within seconds.
 *
 * Android 12+ only lets an app start a foreground service from the background in some
 * situations; being exempt from battery optimisation (asked on first launch) is one of them,
 * an exact alarm is another. When the OS still refuses, the next check — or opening the app —
 * restarts it.
 */
public class Watchdog extends BroadcastReceiver {
    static final String ACTION_CHECK = "io.github.m777m44.mahdijym.steps.WATCHDOG";
    private static final long EVERY_MS = 30 * 60 * 1000L;
    private static final int REQ_PERIODIC = 41, REQ_KICK = 42;

    @Override public void onReceive(Context c, Intent intent) {
        try {
            StepStore s = StepStore.get(c);
            if (!s.running) { cancel(c); return; }
            ensureRunning(c);
            schedule(c);                      // keep the chain going
        } catch (RuntimeException ignored) { /* never crash from an alarm */ }
    }

    /** Starts the service if counting is on and it isn't running. Safe to call any time. */
    static void ensureRunning(Context c) {
        StepStore s = StepStore.get(c);
        if (!s.running || StepCounterService.instance != null) return;
        // Refuses (without crashing) while "Physical activity" is not allowed, and when
        // Android 12+ won't let a background app start a foreground service: next check.
        StepCounterService.send(c, StepCounterService.ACTION_START);
    }

    private static PendingIntent pi(Context c, int req) {
        Intent i = new Intent(c, Watchdog.class).setAction(ACTION_CHECK);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(c, req, i, flags);
    }

    private static boolean exactAllowed(AlarmManager am) {
        return Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
    }

    private static void at(Context c, int req, long delayMs, boolean wake) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long when = SystemClock.elapsedRealtime() + delayMs;
        int type = wake ? AlarmManager.ELAPSED_REALTIME_WAKEUP : AlarmManager.ELAPSED_REALTIME;
        PendingIntent p = pi(c, req);
        try {
            if (Build.VERSION.SDK_INT >= 23) {
                if (exactAllowed(am)) am.setExactAndAllowWhileIdle(type, when, p);
                else am.setAndAllowWhileIdle(type, when, p);
            } else {
                am.setExact(type, when, p);
            }
        } catch (RuntimeException e) {
            try { am.set(type, when, p); } catch (RuntimeException ignored) { }
        }
    }

    /** The periodic check, 30 minutes from now (replaces any pending one) — without waking the phone. */
    static void schedule(Context c) { at(c, REQ_PERIODIC, EVERY_MS, false); }

    /** A one-off check soon — after the app is swiped away or the service is killed (this one wakes). */
    static void kick(Context c, long delayMs) { at(c, REQ_KICK, delayMs, true); }

    /** Counting switched off: no more checks. */
    static void cancel(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        try { am.cancel(pi(c, REQ_PERIODIC)); am.cancel(pi(c, REQ_KICK)); } catch (RuntimeException ignored) { }
    }
}
