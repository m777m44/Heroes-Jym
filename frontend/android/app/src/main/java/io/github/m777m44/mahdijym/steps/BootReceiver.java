package io.github.m777m44.mahdijym.steps;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Brings the step counter back after the phone is switched off and on again (or restarted),
 * and after an app update — whenever counting was on. Re-arms the reminders then, and when the
 * clock or the time zone is changed. Boot-completed receivers may start a
 * foreground service of type "health" on every Android version, including 15.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) {
        String a = intent == null ? null : intent.getAction();
        if (a == null) return;
        // 10.0: the clock or the time zone changed — the reminders worked out in local time are armed
        // again (an alarm is a fixed moment, so it would ring at the old local time) (review on PR #13)
        if (Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a)) {
            try { WaterReminder.schedule(c); } catch (RuntimeException ignored) { }
            try { PlanReminder.schedule(c); } catch (RuntimeException ignored) { }
            return;
        }
        if (!Intent.ACTION_BOOT_COMPLETED.equals(a) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                && !"android.intent.action.QUICKBOOT_POWERON".equals(a)
                && !"com.htc.intent.action.QUICKBOOT_POWERON".equals(a)) return;
        try {
            StepStore s = StepStore.get(c);
            if (s.running) {
                StepCounterService.send(c, StepCounterService.ACTION_START);   // refused → the watchdog retries
                Watchdog.schedule(c);
            }
            StepWidget.updateAll(c);
        } catch (RuntimeException ignored) { /* never crash at boot */ }
        try { WaterReminder.refreshPanel(c, true); } catch (RuntimeException ignored) { }
        try { WaterReminder.schedule(c); }   // alarms don't survive a reboot
        catch (RuntimeException ignored) { }
        try { WorkoutReminder.schedule(c); }
        catch (RuntimeException ignored) { }
        try { PlanReminder.schedule(c); }     // 10.0: "My schedule"
        catch (RuntimeException ignored) { }
    }
}
