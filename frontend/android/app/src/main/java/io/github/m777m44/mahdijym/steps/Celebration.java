package io.github.m777m44.mahdijym.steps;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;

import io.github.m777m44.mahdijym.MainActivity;
import io.github.m777m44.mahdijym.R;

/**
 * The celebration outside the app (2.5): when the step goal (optionally every 1,000 steps)
 * or the water goal is reached while the app is closed —
 *   · a high-priority notification with a picture drawn on the phone (CelebrationArt),
 *   · its full-screen intent opens CelebrationActivity over the lock screen when the screen
 *     is off or locked (Android decides; 14+ lets the user switch it off per app),
 *   · with "Display over other apps" allowed, the full-screen cheer also opens directly on
 *     top of whatever is on screen,
 *   · a short synthesized fanfare (Fanfare) and a vibration, each behind its own switch.
 * Tapping the notification replays the full-screen cheer.
 */
final class Celebration {
    static final String CH = "mj_celebrate";
    static final int NOTIF_ID = 7201;

    static final String KIND_GOAL = "goal", KIND_MILESTONE = "milestone", KIND_WATER = "water";

    private Celebration() { }

    /** Everything one celebration shows; travels to the activity as intent extras. */
    static final class Spec {
        String kind = KIND_GOAL;
        int value;
        String kicker = "";   // "Daily goal reached!"
        String sub = "";      // "10,000 steps today — well done."
        String unit = "";     // "steps" / "ml"
        String open = "Open app";
        String hint = "Tap anywhere to close";
        String locale = "";
        String channel = "Celebrations";
        boolean sound = true;
        boolean vibrate = true;

        String route() { return KIND_WATER.equals(kind) ? "/water" : "/walk"; }

        String emoji() {
            return KIND_WATER.equals(kind) ? "\uD83D\uDCA7" : KIND_MILESTONE.equals(kind) ? "\uD83C\uDF89" : "\uD83C\uDFC6";
        }

        /** Main colour, second colour of the gradient. */
        int c1() { return KIND_WATER.equals(kind) ? 0xFF0A84FF : KIND_MILESTONE.equals(kind) ? 0xFF30D158 : 0xFFFFD60A; }
        int c2() { return KIND_WATER.equals(kind) ? 0xFF64D2FF : KIND_MILESTONE.equals(kind) ? 0xFF64D2FF : 0xFFFF9F0A; }

        Intent into(Intent i) {
            return i.putExtra("kind", kind).putExtra("value", value).putExtra("kicker", kicker)
                .putExtra("sub", sub).putExtra("unit", unit).putExtra("open", open).putExtra("hint", hint)
                .putExtra("locale", locale);
        }

        static Spec from(Intent i) {
            Spec s = new Spec();
            if (i == null) return s;
            s.kind = orDef(i.getStringExtra("kind"), KIND_GOAL);
            s.value = i.getIntExtra("value", 0);
            s.kicker = orDef(i.getStringExtra("kicker"), "");
            s.sub = orDef(i.getStringExtra("sub"), "");
            s.unit = orDef(i.getStringExtra("unit"), "");
            s.open = orDef(i.getStringExtra("open"), "Open app");
            s.hint = orDef(i.getStringExtra("hint"), "");
            s.locale = orDef(i.getStringExtra("locale"), "");
            return s;
        }

        private static String orDef(String v, String def) { return v == null ? def : v; }
    }

    // ---- what the system allows -----------------------------------------------------------

    /** Android 14+: full-screen intents can be switched off per app. */
    static boolean fullScreenAllowed(Context c) {
        if (Build.VERSION.SDK_INT < 34) return true;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        try { return nm != null && nm.canUseFullScreenIntent(); } catch (RuntimeException e) { return false; }
    }

    /** "Display over other apps" — lets the cheer open on top of whatever is on screen. */
    static boolean overlayAllowed(Context c) {
        try { return Settings.canDrawOverlays(c); } catch (RuntimeException e) { return false; }
    }

    static Intent fullScreenSettings(Context c) {
        Intent i;
        if (Build.VERSION.SDK_INT >= 34) {
            i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + c.getPackageName()));
        } else if (Build.VERSION.SDK_INT >= 26) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName());
        } else {
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()));
        }
        return i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }

    static Intent overlaySettings(Context c) {
        return new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + c.getPackageName()))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }

    private static boolean screenOn(Context c) {
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isInteractive();
    }

    // ---- showing it ----------------------------------------------------------------------

    private static void ensureChannel(Context c, NotificationManager nm, String name) {
        if (Build.VERSION.SDK_INT < 26) return;
        // Silent at the channel level: the fanfare is played by the app itself (and only when the
        // Sounds switch is on), so it never doubles up with a notification tone.
        NotificationChannel ch = new NotificationChannel(CH, name, NotificationManager.IMPORTANCE_HIGH);
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    static Intent activityIntent(Context c, Spec sp) {
        return sp.into(new Intent(c, CelebrationActivity.class))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    static PendingIntent openApp(Context c, int req, String route) {
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        i.putExtra(StepServicePlugin.EXTRA_ROUTE, route);
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /**
     * Celebrate. `fullScreen` asks for the full-screen cheer (lock screen / over other apps);
     * without it only the picture notification is posted.
     */
    static void show(Context ctx, Spec sp, boolean fullScreen) {
        Context c = ctx.getApplicationContext();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            try { ensureChannel(c, nm, sp.channel); } catch (RuntimeException ignored) { }
            PendingIntent replay = PendingIntent.getActivity(c, 61, activityIntent(c, sp),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            String title = sp.emoji() + " " + sp.kicker;
            NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH)
                .setSmallIcon(R.drawable.ic_stat_steps)
                .setContentTitle(title)
                .setContentText(sp.sub)
                .setColor(sp.c1())
                .setColorized(false)
                .setAutoCancel(true)
                .setContentIntent(replay)
                .setCategory(NotificationCompat.CATEGORY_EVENT)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .addAction(0, sp.open, openApp(c, 62, sp.route()));
            if (fullScreen && fullScreenAllowed(c)) b.setFullScreenIntent(replay, true);

            Bitmap art = null;
            try { art = CelebrationArt.render(sp); } catch (Throwable ignored) { /* OOM on a tiny phone: text only */ }
            if (art != null) {
                b.setLargeIcon(CelebrationArt.badge(sp));
                b.setStyle(new NotificationCompat.BigPictureStyle().bigPicture(art).setSummaryText(sp.sub));
            } else {
                b.setStyle(new NotificationCompat.BigTextStyle().bigText(sp.sub));
            }
            try {
                nm.notify(NOTIF_ID, b.build());
            } catch (SecurityException ignored) {
                /* notifications off */
            } catch (RuntimeException e) {
                // A picture too large for the binder on some builds — retry without it.
                try {
                    b.setStyle(new NotificationCompat.BigTextStyle().bigText(sp.sub)).setLargeIcon((Bitmap) null);
                    nm.notify(NOTIF_ID, b.build());
                } catch (RuntimeException ignored) { }
            }
        }

        if (sp.sound) Fanfare.play(c, sp.kind);
        if (sp.vibrate) vibrate(c);

        // With "Display over other apps" the cheer may open straight away on an unlocked screen
        // (a background start Android allows for such apps); a locked or dark screen is served
        // by the full-screen intent above.
        if (fullScreen && overlayAllowed(c) && screenOn(c)) {
            try { c.startActivity(activityIntent(c, sp)); } catch (RuntimeException ignored) { }
        }
    }

    static void vibrate(Context c) {
        long[] pattern = { 0, 120, 80, 120, 80, 120, 160, 420 };
        try {
            Vibrator v;
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager vm = (VibratorManager) c.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                v = vm == null ? null : vm.getDefaultVibrator();
            } else {
                v = (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (v == null || !v.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(pattern, -1));
            else v.vibrate(pattern, -1);
        } catch (Exception ignored) { }
    }

    // ---- the two sources -----------------------------------------------------------------

    /** Step goal / milestone, texts from the step service config. */
    static void steps(Context c, StepStore s, boolean goal, int value, String sub) {
        Spec sp = new Spec();
        sp.kind = goal ? KIND_GOAL : KIND_MILESTONE;
        sp.value = value;
        sp.kicker = goal ? s.str("goalKicker", "Daily goal reached!") : s.str("milestoneKicker", "Milestone!");
        sp.sub = sub;
        sp.unit = s.str("stepsUnit", "steps");
        sp.open = s.str("celebrateOpen", "Open app");
        sp.hint = s.str("celebrateHint", "Tap anywhere to close");
        sp.channel = s.str("channelCelebrate", "Celebrations");
        sp.locale = s.locale();
        sp.sound = s.pref("sound", true);
        sp.vibrate = false;   // the step service vibrates on its own switch
        boolean full = goal ? s.pref("fullCelebrate", true) : s.pref("fullMilestones", false);
        show(c, sp, full);
    }

    /** Water goal reached, texts from the water config. */
    static void water(Context c, WaterStore w, int ml) {
        Spec sp = new Spec();
        sp.kind = KIND_WATER;
        sp.value = ml;
        sp.kicker = w.str("goalTitle", "Water goal reached!");
        sp.sub = w.fill(w.str("goalBody", "{ml} ml today — well done."), ml);
        sp.unit = w.str("mlUnit", "ml");
        sp.open = w.str("open", "Open app");
        sp.hint = w.str("tapClose", "Tap anywhere to close");
        sp.channel = w.str("channelCelebrate", "Celebrations");
        sp.locale = w.locale();
        sp.sound = w.pref("sound", true);
        sp.vibrate = w.pref("vibrate", true);
        show(c, sp, w.pref("fullCelebrate", true));
    }
}
