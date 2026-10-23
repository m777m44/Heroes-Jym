package io.github.m777m44.mahdijym.steps;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import io.github.m777m44.mahdijym.R;

/**
 * 7.0 — the "Today" home-screen widget: three rings (steps · water · food) with big numbers
 * and one-tap water buttons (glass / cup / bottle) plus Undo. The buttons send the same
 * broadcast as the notification's water chips, so the app, the notification and both widgets
 * stay in step. Refreshed from StepWidget.updateAll(), which every step / water change calls.
 */
public class TodayWidget extends AppWidgetProvider {

    private static final int[] BTN = { R.id.tw_b0, R.id.tw_b1, R.id.tw_b2 };
    private static final int[] BTN_ICON = { R.id.tw_bi0, R.id.tw_bi1, R.id.tw_bi2 };
    private static final int[] BTN_TEXT = { R.id.tw_bt0, R.id.tw_bt1, R.id.tw_bt2 };
    private static final String[] BTN_KEY = { "glass", "cup", "bottle" };
    private static final int[] BTN_ML = { 200, 250, 500 };
    // request codes 90–99: clear of the notification (21–23, 51–67) and the step widget (20+)
    private static final int REQ_ADD0 = 90, REQ_UNDO = 94, REQ_STEPS = 95, REQ_WATER = 96, REQ_FOOD = 97, REQ_OPEN = 98;

    @Override public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
        render(c, mgr, ids);
    }

    static void updateAll(Context c) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(c);
            if (mgr == null) return;
            int[] ids = mgr.getAppWidgetIds(new ComponentName(c, TodayWidget.class));
            if (ids != null && ids.length > 0) render(c, mgr, ids);
        } catch (RuntimeException ignored) { /* no launcher / widget host */ }
    }

    private static PendingIntent add(Context c, int ml, int req) {
        Intent i = new Intent(c, WaterReminder.class).setAction(WaterReminder.ACTION_ADD).putExtra("ml", ml);
        return PendingIntent.getBroadcast(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static int level(long have, long goal) {
        return goal > 0 ? (int) Math.max(0, Math.min(1000, have * 1000 / goal)) : 0;
    }

    private static void render(Context c, AppWidgetManager mgr, int[] ids) {
        StepStore s = StepStore.get(c);
        s.rollIfNeeded();
        WaterStore w = WaterStore.get(c);
        NumberFormat nf = StepNotifier.numbers(s);
        String tag = s.locale();
        Locale loc = tag == null || tag.isEmpty() ? Locale.getDefault() : Locale.forLanguageTag(tag);

        int steps = s.total(), goal = s.goal();
        int ml = w.todayMl(), mlGoal = w.goal();
        int[] food = s.foodCard();
        String date;
        try { date = new SimpleDateFormat("EEE d MMM", loc).format(new Date()); } catch (RuntimeException e) { date = ""; }

        for (int id : ids) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_today);
            v.setTextViewText(R.id.tw_title, "MAHDI-JYM · " + s.str("wToday", "Today"));
            v.setTextViewText(R.id.tw_date, date);

            // steps
            v.setProgressBar(R.id.tw_s_ring, 1000, level(steps, goal), false);
            v.setTextViewText(R.id.tw_s_num, nf.format(steps));
            v.setTextViewText(R.id.tw_s_sub, steps >= goal && goal > 0 ? s.str("stepsDone", "Goal reached!") : "/ " + nf.format(goal));
            v.setTextColor(R.id.tw_s_num, steps >= goal && goal > 0 ? 0xFFFFD60A : 0xFFF2F2F7);

            // water
            v.setProgressBar(R.id.tw_w_ring, 1000, level(ml, mlGoal), false);
            v.setTextViewText(R.id.tw_w_num, nf.format(ml));
            v.setTextViewText(R.id.tw_w_sub, "/ " + nf.format(mlGoal) + " " + s.str("wMl", "ml"));
            v.setTextColor(R.id.tw_w_num, ml >= mlGoal && mlGoal > 0 ? 0xFF64D2FF : 0xFFF2F2F7);

            // food — hidden ring, a dash and a hint when the food log is off
            if (food != null) {
                int eaten = food[0], fg = food[1];
                boolean over = fg > 0 && eaten > fg;
                v.setProgressBar(R.id.tw_f_ring, 1000, level(eaten, fg), false);
                v.setTextViewText(R.id.tw_f_num, nf.format(eaten));
                v.setTextColor(R.id.tw_f_num, over ? 0xFFFF9F0A : 0xFFF2F2F7);
                v.setTextViewText(R.id.tw_f_sub, fg > 0
                    ? (over ? s.str("foodOver", "{n} kcal over").replace("{n}", nf.format(eaten - fg))
                            : s.str("foodLeft", "{n} kcal left").replace("{n}", nf.format(fg - eaten)))
                    : s.str("kcal", "kcal"));
            } else {
                v.setProgressBar(R.id.tw_f_ring, 1000, 0, false);
                v.setTextViewText(R.id.tw_f_num, "—");
                v.setTextColor(R.id.tw_f_num, 0xFF8E8E93);
                v.setTextViewText(R.id.tw_f_sub, s.str("wOff", "Food log off"));
            }

            // quick water
            boolean waterOn = w.trackerOn() || !w.configured();
            for (int i = 0; i < 3; i++) {
                v.setImageViewResource(BTN_ICON[i], WaterReminder.shapeOf(BTN_KEY[i]));
                v.setTextViewText(BTN_TEXT[i], "+" + nf.format(BTN_ML[i]));
                v.setOnClickPendingIntent(BTN[i], add(c, BTN_ML[i], REQ_ADD0 + i));
                v.setViewVisibility(BTN[i], waterOn ? View.VISIBLE : View.GONE);
            }
            v.setImageViewResource(R.id.tw_undo, w.canUndo() ? R.drawable.ic_w_undo : R.drawable.ic_w_undo_off);
            v.setOnClickPendingIntent(R.id.tw_undo, WaterReminder.action(c, WaterReminder.ACTION_UNDO, REQ_UNDO));
            v.setViewVisibility(R.id.tw_undo, waterOn ? View.VISIBLE : View.GONE);

            // taps on a ring open its screen; anywhere else opens the app
            v.setOnClickPendingIntent(R.id.tw_s_col, StepNotifier.openRoute(c, REQ_STEPS, "/walk"));
            v.setOnClickPendingIntent(R.id.tw_w_col, StepNotifier.openRoute(c, REQ_WATER, "/water"));
            v.setOnClickPendingIntent(R.id.tw_f_col, StepNotifier.openRoute(c, REQ_FOOD, "/food"));
            v.setOnClickPendingIntent(R.id.tw_root, StepNotifier.openApp(c, REQ_OPEN));
            mgr.updateAppWidget(id, v);
        }
    }
}
