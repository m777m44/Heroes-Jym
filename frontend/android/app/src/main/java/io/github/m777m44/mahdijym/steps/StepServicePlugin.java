package io.github.m777m44.mahdijym.steps;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * JS bridge for the native step counter (frontend/src/lib/stepService.js).
 *
 *   isAvailable()                 → { stepCounter, stepDetector }
 *   getPermissionStatus()         → { activityRecognition, notifications }  ('granted' | 'denied' | 'prompt')
 *   requestPermissions()          → same, after asking
 *   start({ config, attach })     starts the foreground service with the given settings
 *                                 (attach: reconnecting on launch — keeps a pause in place)
 *   configure({ config })         updates goal, stride, texts, switches — live
 *   pause() / resume() / stop()
 *   getState()                    → today's snapshot (steps, activeMs, speed, hourly, …)
 *   getHistory()                  → { days: { 'YYYY-MM-DD': { n, ms, h[24] } } }
 *   resetDay({ day })             today (default) back to 0 and counting on from now, or a past day removed
 *   getBatteryStatus()            → { ignoring }   battery-optimisation exemption
 *   requestBatteryExemption()     opens the system dialog
 *   openNotificationSettings()
 *   getLaunchRoute()              → { route } when opened from the notification / widget
 *   getDeviceInfo()               → { manufacturer, model, sdk, autostart, exactAlarms }
 *   openAutostartSettings()       → { opened } — the maker's "autostart" screen (Xiaomi, Huawei…)
 *   openAppSettings()             → { opened } — the app's page in Settings (permissions)
 *
 * Water & celebrations (2.5):
 *   configureWater({ config })    tracker, goal, container, reminder hours, texts → re-arms the alarm
 *   getWater()                    → { days: { 'YYYY-MM-DD': { ml, at } }, day, ml, goal }
 *   setWater({ day, ml, at, celebrated })  a change made in the app (the later `at` wins)
 *   testWaterReminder()           posts a reminder now
 *   getCelebrationStatus()        → { fullScreen, overlay, sdk }
 *   openFullScreenSettings() / openOverlaySettings()
 *   previewCelebration({ spec, mode: 'screen' | 'notification' })
 * Events: 'steps' (snapshot, up to 4×/s while the app is open), 'open' ({ route }),
 *         'water' ({ day, ml, at, goal } after a notification button changed it).
 */
@CapacitorPlugin(
    name = "StepService",
    permissions = {
        @Permission(alias = "activityRecognition", strings = { Manifest.permission.ACTIVITY_RECOGNITION }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class StepServicePlugin extends Plugin {
    static final String EXTRA_ROUTE = "mj_route";
    private String launchRoute;

    @Override public void load() {
        StepCounterService.appVisible = true;
        StepCounterService.listener = state -> {
            try { notifyListeners("steps", JSObject.fromJSONObject(state)); } catch (JSONException ignored) { }
        };
        WaterStore.listener = snap -> {
            try { notifyListeners("water", JSObject.fromJSONObject(snap)); } catch (JSONException ignored) { }
        };
        if (getActivity() != null) launchRoute = routeOf(getActivity().getIntent());
        try { Watchdog.ensureRunning(ctx()); }   // opening the app always revives a killed counter
        catch (RuntimeException ignored) { }
    }

    private static String routeOf(Intent i) {
        if (i == null) return null;
        String r = i.getStringExtra(EXTRA_ROUTE);
        return r != null && r.startsWith("/") ? r : null;
    }

    @Override protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String r = routeOf(intent);
        if (r != null) {
            JSObject o = new JSObject();
            o.put("route", r);
            notifyListeners("open", o, true);
        }
    }

    @Override protected void handleOnResume() {
        super.handleOnResume();
        StepCounterService.appVisible = true;
    }

    @Override protected void handleOnPause() {
        super.handleOnPause();
        StepCounterService.appVisible = false;
    }

    @Override protected void handleOnDestroy() {
        StepCounterService.appVisible = false;
        StepCounterService.listener = null;
        WaterStore.listener = null;
        super.handleOnDestroy();
    }

    private Context ctx() { return getContext().getApplicationContext(); }

    // ---- availability & permissions ----------------------------------------------------

    @PluginMethod
    public void isAvailable(PluginCall call) {
        SensorManager sm = (SensorManager) ctx().getSystemService(Context.SENSOR_SERVICE);
        JSObject r = new JSObject();
        r.put("stepCounter", sm != null && sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null);
        r.put("stepDetector", sm != null && sm.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR) != null);
        call.resolve(r);
    }

    private String state(String alias) {
        PermissionState s = getPermissionState(alias);
        if (s == PermissionState.GRANTED) return "granted";
        if (s == PermissionState.DENIED) return "denied";
        return "prompt";
    }

    private JSObject permissionStatus() {
        JSObject r = new JSObject();
        r.put("activityRecognition", Build.VERSION.SDK_INT < 29 ? "granted" : state("activityRecognition"));
        if (Build.VERSION.SDK_INT < 33) {
            r.put("notifications", NotificationManagerCompat.from(ctx()).areNotificationsEnabled() ? "granted" : "denied");
        } else {
            r.put("notifications", state("notifications"));
        }
        return r;
    }

    @PluginMethod
    public void getPermissionStatus(PluginCall call) { call.resolve(permissionStatus()); }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        List<String> need = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 29 && getPermissionState("activityRecognition") != PermissionState.GRANTED) need.add("activityRecognition");
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) need.add("notifications");
        if (need.isEmpty()) { call.resolve(permissionStatus()); return; }
        requestPermissionForAliases(need.toArray(new String[0]), call, "permissionsDone");
    }

    @PermissionCallback
    private void permissionsDone(PluginCall call) { call.resolve(permissionStatus()); }

    // ---- service control ---------------------------------------------------------------

    private void saveConfig(PluginCall call) {
        JSObject cfg = call.getObject("config");
        if (cfg != null) StepStore.get(ctx()).setConfig(cfg);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!StepCounterService.canCount(ctx())) {
            call.reject("Physical activity permission is required", "denied");
            return;
        }
        saveConfig(call);
        StepStore s = StepStore.get(ctx());
        // attach: the app reconnecting on launch — a pause set from the notification stays a
        // pause. Only a tap on Start (attach false) switches counting back on.
        boolean attach = Boolean.TRUE.equals(call.getBoolean("attach", false)) && s.running;
        s.running = true;
        if (!attach && s.paused) {
            s.paused = false;
            s.resetBaseline();             // steps taken while paused are not counted
        }
        s.save();
        if (!StepCounterService.send(ctx(), StepCounterService.ACTION_START)) {
            s.running = false;
            s.save();
            call.reject("Could not start the step counter", "error");
            return;
        }
        Watchdog.schedule(ctx());
        call.resolve(snapshot());
    }

    @PluginMethod
    public void configure(PluginCall call) {
        saveConfig(call);
        StepCounterService svc = StepCounterService.instance;
        if (svc != null) svc.applyConfig();
        StepWidget.updateAll(ctx());
        call.resolve(snapshot());
    }

    @PluginMethod
    public void pause(PluginCall call) {
        StepStore s = StepStore.get(ctx());
        if (s.running) { s.paused = true; s.save(); }
        if (StepCounterService.instance != null) StepCounterService.send(ctx(), StepCounterService.ACTION_PAUSE);
        call.resolve(snapshot());
    }

    @PluginMethod
    public void resume(PluginCall call) {
        if (!StepCounterService.canCount(ctx())) { call.reject("Physical activity permission is required", "denied"); return; }
        if (!StepCounterService.send(ctx(), StepCounterService.ACTION_RESUME)) { call.reject("Could not resume the step counter", "error"); return; }
        call.resolve(snapshot());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        StepStore s = StepStore.get(ctx());
        s.running = false;
        s.paused = false;
        s.resetBaseline();
        s.save();
        StepCounterService svc = StepCounterService.instance;
        if (svc != null) {
            if (!StepCounterService.send(ctx(), StepCounterService.ACTION_STOP)) {
                try { ctx().stopService(new Intent(ctx(), StepCounterService.class)); } catch (RuntimeException ignored) { }
            }
        }
        Watchdog.cancel(ctx());
        NotificationManagerCompat.from(ctx()).cancel(StepNotifier.LIVE_ID);
        StepWidget.updateAll(ctx());
        call.resolve(snapshot());
    }

    /** "Reset and start again": { day } — today (default) back to 0, or a past day removed. */
    @PluginMethod
    public void resetDay(PluginCall call) {
        String day = call.getString("day", null);
        StepStore.get(ctx()).resetDay(day);
        StepCounterService svc = StepCounterService.instance;
        if (svc != null) svc.afterReset();
        StepWidget.updateAll(ctx());
        call.resolve(snapshot());
    }

    private JSObject snapshot() {
        StepCounterService svc = StepCounterService.instance;
        JSONObject o = svc != null ? svc.snapshot() : StepStore.get(ctx()).snapshot(0, false);
        try { return JSObject.fromJSONObject(o); } catch (JSONException e) { return new JSObject(); }
    }

    @PluginMethod
    public void getState(PluginCall call) {
        StepStore.get(ctx()).rollIfNeeded();
        JSObject r = snapshot();
        r.put("serviceAlive", StepCounterService.instance != null);
        call.resolve(r);
    }

    @PluginMethod
    public void getHistory(PluginCall call) {
        JSObject r = new JSObject();
        try { r.put("days", JSObject.fromJSONObject(StepStore.get(ctx()).historyWithToday())); } catch (JSONException e) { r.put("days", new JSObject()); }
        call.resolve(r);
    }

    // ---- battery & settings ------------------------------------------------------------

    @PluginMethod
    public void getBatteryStatus(PluginCall call) {
        PowerManager pm = (PowerManager) ctx().getSystemService(Context.POWER_SERVICE);
        JSObject r = new JSObject();
        r.put("ignoring", pm != null && pm.isIgnoringBatteryOptimizations(ctx().getPackageName()));
        call.resolve(r);
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + ctx().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx().startActivity(i);
        } catch (RuntimeException e) {
            try {
                Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx().startActivity(i);
            } catch (RuntimeException ignored) { }
        }
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent i;
            if (Build.VERSION.SDK_INT >= 26) {
                i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx().getPackageName());
            } else {
                i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx().getPackageName()));
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx().startActivity(i);
        } catch (RuntimeException ignored) { }
        call.resolve();
    }

    // ---- phone makers' own background limits -------------------------------------------

    // Settings screens where Xiaomi, Huawei, Oppo, Vivo… let the user allow an app to start
    // by itself / run in the background. Tried in order; the first that opens wins.
    private static final String[][] AUTOSTART = {
        { "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity" },
        { "com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity" },
        { "com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" },
        { "com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity" },
        { "com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity" },
        { "com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity" },
        { "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
        { "com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity" },
        { "com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity" },
        { "com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity" },
        { "com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity" },
        { "com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager" },
        { "com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity" },
        { "com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity" },
        { "com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity" },
        { "com.asus.mobilemanager", "com.asus.mobilemanager.autostart.AutoStartActivity" },
        { "com.asus.mobilemanager", "com.asus.mobilemanager.MainActivity" },
    };
    private static final String[] AUTOSTART_MAKERS = { "xiaomi", "redmi", "poco", "letv", "huawei", "honor", "oppo", "realme", "oneplus", "vivo", "iqoo", "samsung", "asus" };

    private static boolean hasAutostartManager() {
        String m = (Build.MANUFACTURER + " " + Build.BRAND).toLowerCase(java.util.Locale.ROOT);
        for (String k : AUTOSTART_MAKERS) if (m.contains(k)) return true;
        return false;
    }

    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        JSObject r = new JSObject();
        r.put("manufacturer", Build.MANUFACTURER);
        r.put("model", Build.MODEL);
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("autostart", hasAutostartManager());
        android.app.AlarmManager am = (android.app.AlarmManager) ctx().getSystemService(Context.ALARM_SERVICE);
        r.put("exactAlarms", Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms()));
        call.resolve(r);
    }

    @PluginMethod
    public void openAutostartSettings(PluginCall call) {
        boolean opened = false;
        for (String[] c : AUTOSTART) {
            try {
                Intent i = new Intent().setComponent(new android.content.ComponentName(c[0], c[1]));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx().startActivity(i);
                opened = true;
                break;
            } catch (RuntimeException ignored) { /* not this phone */ }
        }
        if (!opened) {
            try {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx().getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx().startActivity(i);
            } catch (RuntimeException ignored) { }
        }
        JSObject r = new JSObject();
        r.put("opened", opened);
        call.resolve(r);
    }

    /** The app's page in the system settings — where "Physical activity" can be allowed again. */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        boolean opened = false;
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx().startActivity(i);
            opened = true;
        } catch (RuntimeException ignored) { }
        JSObject r = new JSObject();
        r.put("opened", opened);
        call.resolve(r);
    }

    // ---- water (2.5) ---------------------------------------------------------------------

    @PluginMethod
    public void configureWater(PluginCall call) {
        JSObject cfg = call.getObject("config");
        WaterStore w = WaterStore.get(ctx());
        if (cfg != null) w.setConfig(cfg);
        try { WaterReminder.createChannels(ctx(), w); } catch (RuntimeException ignored) { }
        WaterReminder.schedule(ctx());
        StepCounterService svc = StepCounterService.instance;
        if (svc != null) svc.refreshNotification();
        StepWidget.updateAll(ctx());
        call.resolve(waterResult(false));
    }

    private JSObject waterResult(boolean withDays) {
        WaterStore w = WaterStore.get(ctx());
        JSObject r;
        try { r = JSObject.fromJSONObject(w.snapshot()); } catch (JSONException e) { r = new JSObject(); }
        if (withDays) {
            try { r.put("days", JSObject.fromJSONObject(w.daysCopy())); } catch (JSONException e) { r.put("days", new JSObject()); }
        }
        return r;
    }

    @PluginMethod
    public void getWater(PluginCall call) { call.resolve(waterResult(true)); }

    @PluginMethod
    public void setWater(PluginCall call) {
        String day = call.getString("day", StepStore.today());
        Integer ml = call.getInt("ml", 0);
        Double at = call.getDouble("at", (double) System.currentTimeMillis());
        WaterStore w = WaterStore.get(ctx());
        boolean changed = w.set(day, ml == null ? 0 : ml, at == null ? System.currentTimeMillis() : at.longValue(), false);
        if (Boolean.TRUE.equals(call.getBoolean("celebrated", false))) { w.celebratedDay = day; w.save(); }
        if (changed) {
            StepCounterService svc = StepCounterService.instance;
            if (svc != null) svc.refreshNotification();
            StepWidget.updateAll(ctx());
            // the goal was met in the app → no reminder for the rest of the day
            if (StepStore.today().equals(day) && w.ml(day) >= w.goal()) {
                NotificationManagerCompat.from(ctx()).cancel(WaterReminder.NOTIF_ID);
            }
        }
        call.resolve(waterResult(false));
    }

    @PluginMethod
    public void testWaterReminder(PluginCall call) {
        WaterReminder.post(ctx(), true);
        call.resolve();
    }

    // ---- celebrations (2.5) --------------------------------------------------------------

    @PluginMethod
    public void getCelebrationStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("fullScreen", Celebration.fullScreenAllowed(ctx()));
        r.put("overlay", Celebration.overlayAllowed(ctx()));
        r.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(r);
    }

    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        boolean opened = false;
        try { ctx().startActivity(Celebration.fullScreenSettings(ctx())); opened = true; }
        catch (RuntimeException e) {
            try {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx().getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx().startActivity(i);
                opened = true;
            } catch (RuntimeException ignored) { }
        }
        JSObject r = new JSObject();
        r.put("opened", opened);
        call.resolve(r);
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        boolean opened = false;
        try { ctx().startActivity(Celebration.overlaySettings(ctx())); opened = true; }
        catch (RuntimeException ignored) { }
        JSObject r = new JSObject();
        r.put("opened", opened);
        call.resolve(r);
    }

    /** The settings screen's "Preview": the full-screen cheer now, or the notification. */
    @PluginMethod
    public void previewCelebration(PluginCall call) {
        JSObject o = call.getObject("spec");
        Celebration.Spec sp = new Celebration.Spec();
        if (o != null) {
            sp.kind = o.optString("kind", Celebration.KIND_GOAL);
            sp.value = o.optInt("value", 10000);
            sp.kicker = o.optString("kicker", "");
            sp.sub = o.optString("sub", "");
            sp.unit = o.optString("unit", "");
            sp.open = o.optString("open", "Open app");
            sp.hint = o.optString("hint", "");
            sp.locale = o.optString("locale", "");
            sp.channel = o.optString("channel", "Celebrations");
            sp.sound = o.optBoolean("sound", true);
            sp.vibrate = o.optBoolean("vibrate", true);
        }
        if ("notification".equals(call.getString("mode", "screen"))) {
            Celebration.show(ctx(), sp, true);
        } else {
            try {
                if (getActivity() != null) getActivity().startActivity(Celebration.activityIntent(ctx(), sp));
                else ctx().startActivity(Celebration.activityIntent(ctx(), sp));
            } catch (RuntimeException ignored) { }
            if (sp.sound) Fanfare.play(ctx(), sp.kind);
            if (sp.vibrate) Celebration.vibrate(ctx());
        }
        call.resolve();
    }

    @PluginMethod
    public void getLaunchRoute(PluginCall call) {
        JSObject r = new JSObject();
        r.put("route", launchRoute);
        launchRoute = null;
        call.resolve(r);
    }
}
