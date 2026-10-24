package io.github.m777m44.mahdijym.steps;

import android.app.NotificationChannel;
import android.app.NotificationChannelGroup;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import org.json.JSONObject;

import java.util.List;

/**
 * MAHDI-JYM 10.0 — tidy notification settings: every channel of the app sits in a named group
 * (Steps & activity · Water · Schedule & meals · Workouts · Health), so the phone's notification
 * settings read like the app instead of one long list. The group names come from the app in the
 * user's language (organizeChannels). A channel only joins a group while it has none — Android
 * does not move a channel between groups — and nothing else about a channel is touched.
 */
final class Channels {
    private Channels() { }

    /** group id → its channels */
    private static final String[][] MAP = {
        { "g_activity", "mj_steps_live", "mj_steps_alert", "mj_steps_alert_quiet", "mj_celebrate" },
        { "g_water", "mj_water", "mj_water_quiet", "mj_water_vib", "mj_water_quiet_vib", "mj_water_panel" },
        { "g_plan", "mj_plan", "mj_day" },
        { "g_train", "mj_workout", "default" },
        { "g_health", "mj_meds" },
    };

    private static String groupOf(String channel) {
        for (String[] g : MAP) for (int i = 1; i < g.length; i++) if (g[i].equals(channel)) return g[0];
        return null;
    }

    /** Create / rename the groups and put every existing channel without a group into its own. */
    static int organize(Context c, JSONObject names) {
        if (Build.VERSION.SDK_INT < 26 || names == null) return 0;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return 0;
        int moved = 0;
        for (String[] g : MAP) {
            String name = names.optString(g[0], "");
            if (name.isEmpty()) continue;
            try { nm.createNotificationChannelGroup(new NotificationChannelGroup(g[0], name)); }
            catch (RuntimeException e) { continue; }
            for (int i = 1; i < g.length; i++) {
                try {
                    NotificationChannel ch = nm.getNotificationChannel(g[i]);
                    if (ch == null || ch.getGroup() != null) continue;
                    ch.setGroup(g[0]);
                    nm.createNotificationChannel(ch);
                    moved++;
                } catch (RuntimeException ignored) { }
            }
        }
        return moved;
    }

    /** A channel created after organize() joins its group if that group already exists. */
    static void adopt(Context c, String channel) {
        if (Build.VERSION.SDK_INT < 26) return;
        String gid = groupOf(channel);
        if (gid == null) return;
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            boolean exists = false;
            List<NotificationChannelGroup> groups = nm.getNotificationChannelGroups();
            if (groups != null) for (NotificationChannelGroup g : groups) if (gid.equals(g.getId())) { exists = true; break; }
            if (!exists) return;
            NotificationChannel ch = nm.getNotificationChannel(channel);
            if (ch == null || ch.getGroup() != null) return;
            ch.setGroup(gid);
            nm.createNotificationChannel(ch);
        } catch (RuntimeException ignored) { }
    }
}
