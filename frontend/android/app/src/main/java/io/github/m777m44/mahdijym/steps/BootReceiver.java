package io.github.m777m44.mahdijym.steps;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

/** Brings the step counter back after a reboot or an app update, if it was running. */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) {
        String a = intent == null ? null : intent.getAction();
        if (a == null) return;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(a) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                && !"android.intent.action.QUICKBOOT_POWERON".equals(a)) return;
        StepStore s = StepStore.get(c);
        if (!s.running) return;
        try {
            ContextCompat.startForegroundService(c, new Intent(c, StepCounterService.class).setAction(StepCounterService.ACTION_START));
        } catch (RuntimeException ignored) { /* the OS refused a background start — the app restarts it when opened */ }
        StepWidget.updateAll(c);
    }
}
