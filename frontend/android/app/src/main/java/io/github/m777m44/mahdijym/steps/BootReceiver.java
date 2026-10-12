package io.github.m777m44.mahdijym.steps;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Brings the step counter back after the phone is switched off and on again (or restarted),
 * and after an app update — whenever counting was on. Boot-completed receivers may start a
 * foreground service of type "health" on every Android version, including 15.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) {
        String a = intent == null ? null : intent.getAction();
        if (a == null) return;
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
        try { WaterReminder.schedule(c); }   // alarms don't survive a reboot
        catch (RuntimeException ignored) { }
    }
}
