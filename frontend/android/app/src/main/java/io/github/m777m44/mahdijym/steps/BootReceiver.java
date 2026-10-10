package io.github.m777m44.mahdijym.steps;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

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
        StepStore s = StepStore.get(c);
        if (!s.running) { StepWidget.updateAll(c); return; }
        try {
            ContextCompat.startForegroundService(c, new Intent(c, StepCounterService.class).setAction(StepCounterService.ACTION_START));
        } catch (RuntimeException ignored) { /* refused for now — the watchdog retries */ }
        Watchdog.schedule(c);
        StepWidget.updateAll(c);
    }
}
