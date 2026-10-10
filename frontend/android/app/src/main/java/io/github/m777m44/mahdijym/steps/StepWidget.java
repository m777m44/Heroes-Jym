package io.github.m777m44.mahdijym.steps;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.widget.RemoteViews;

import java.text.NumberFormat;

import io.github.m777m44.mahdijym.R;

/**
 * Home-screen widget: the same dark mini screen as the expanded notification (it reuses that
 * layout), so steps, progress, distance, calories, walking time, a seconds-ticking clock and
 * the countdown to midnight are on the home screen too. Updated by the step service while it
 * runs (every few seconds at most) and by the launcher otherwise. Tapping it opens Walking.
 */
public class StepWidget extends AppWidgetProvider {

    @Override public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
        render(c, mgr, ids);
    }

    static void updateAll(Context c) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(c);
            if (mgr == null) return;
            int[] ids = mgr.getAppWidgetIds(new ComponentName(c, StepWidget.class));
            if (ids != null && ids.length > 0) render(c, mgr, ids);
        } catch (RuntimeException ignored) { /* no launcher / widget host */ }
    }

    private static void render(Context c, AppWidgetManager mgr, int[] ids) {
        StepStore s = StepStore.get(c);
        s.rollIfNeeded();
        int steps = s.total();
        int goal = s.goal();
        int pct = goal > 0 ? (int) Math.min(999, (long) steps * 100 / goal) : 0;
        NumberFormat nf = StepNotifier.numbers(s);
        boolean moving = s.running && !s.paused && s.lastStepAt > 0 && System.currentTimeMillis() - s.lastStepAt < 8000;
        for (int id : ids) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.notif_steps_big);
            StepNotifier.fillBig(c, v, s, 0, moving, nf, steps, goal, pct, s.clockZone());
            if (!s.running) v.setTextViewText(R.id.n_status, s.str("off", "Off — tap to start"));
            v.setOnClickPendingIntent(R.id.n_root, StepNotifier.openApp(c, 20 + (id % 1000)));
            mgr.updateAppWidget(id, v);
        }
    }
}
