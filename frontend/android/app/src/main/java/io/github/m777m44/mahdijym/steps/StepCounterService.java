package io.github.m777m44.mahdijym.steps;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.speech.tts.TextToSpeech;

import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.Locale;

/**
 * Counts steps all day — app open, in the background, or with the phone locked in a pocket.
 *
 * A foreground service of type "health" holding a listener on the hardware step counter (and
 * the step detector, for an instant +1 per footfall where the phone has one). It keeps the
 * live notification ({@link StepNotifier}) and the home-screen widget ({@link StepWidget})
 * current, announces every 1,000 steps and the daily goal with a notification, a vibration and
 * optionally a spoken line, and hands every update to the web app while it is open
 * ({@link #listener}).
 *
 * Battery: the step sensors run in the phone's low-power sensor hub; with the screen off their
 * events are batched and arrive when the CPU next wakes. When the screen comes on we flush the
 * sensors at once, so the count on the lock screen is current the moment you look at it.
 */
public class StepCounterService extends Service implements SensorEventListener {
    static final String ACTION_START = "io.github.m777m44.mahdijym.steps.START";
    static final String ACTION_PAUSE = "io.github.m777m44.mahdijym.steps.PAUSE";
    static final String ACTION_RESUME = "io.github.m777m44.mahdijym.steps.RESUME";
    static final String ACTION_STOP = "io.github.m777m44.mahdijym.steps.STOP";
    static final String ACTION_REFRESH = "io.github.m777m44.mahdijym.steps.REFRESH";

    private static final long NOTIFY_EVERY_MS = 1000;   // the shade rate-limits faster updates
    private static final long WIDGET_EVERY_MS = 5000;
    private static final long EMIT_EVERY_MS = 250;
    private static final long MOVING_MS = 8000;         // a step within this window = walking

    interface Listener { void onState(JSONObject state); }

    static volatile Listener listener;
    static volatile boolean appVisible;
    static volatile StepCounterService instance;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ArrayDeque<long[]> samples = new ArrayDeque<>();   // {time, total}
    private StepStore store;
    private SensorManager sensors;
    private Sensor counter, detector;
    private boolean listening;
    private long lastNotify, lastWidget, lastEmit;
    private boolean notifyQueued;
    private TextToSpeech tts;
    private boolean ttsReady;
    private BroadcastReceiver screenReceiver;

    private final Runnable notifyRunnable = () -> { notifyQueued = false; publish(true); };
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            boolean rolled = store.rollIfNeeded();
            publish(rolled);
            main.postDelayed(this, 30_000);
        }
    };
    private final Runnable idleCheck = () -> publish(true);   // stops the walking timer

    @Override public void onCreate() {
        super.onCreate();
        instance = this;
        store = StepStore.get(this);
        StepNotifier.createChannels(this, store);
        sensors = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensors != null) {
            counter = sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            detector = sensors.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
        }
        screenReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) {
                if (Intent.ACTION_SCREEN_ON.equals(i.getAction()) || Intent.ACTION_USER_PRESENT.equals(i.getAction())) {
                    if (sensors != null && listening) sensors.flush(StepCounterService.this);
                    store.rollIfNeeded();
                    main.postDelayed(() -> publish(true), 400);
                } else if (Intent.ACTION_DATE_CHANGED.equals(i.getAction()) || Intent.ACTION_TIMEZONE_CHANGED.equals(i.getAction())
                        || Intent.ACTION_TIME_CHANGED.equals(i.getAction())) {
                    store.rollIfNeeded();
                    publish(true);
                }
            }
        };
        IntentFilter f = new IntentFilter();
        f.addAction(Intent.ACTION_SCREEN_ON);
        f.addAction(Intent.ACTION_USER_PRESENT);
        f.addAction(Intent.ACTION_DATE_CHANGED);
        f.addAction(Intent.ACTION_TIME_CHANGED);
        f.addAction(Intent.ACTION_TIMEZONE_CHANGED);
        registerReceiver(screenReceiver, f);   // system broadcasts: no export flag needed
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null && intent.getAction() != null ? intent.getAction() : ACTION_START;

        // Every start must reach startForeground() quickly, whatever the action.
        if (!goForeground()) {
            if (store.running) Watchdog.schedule(this);   // the OS refused for now — retry later
            stopSelf();
            return START_NOT_STICKY;
        }

        switch (action) {
            case ACTION_STOP:
                shutdown();
                return START_NOT_STICKY;
            case ACTION_PAUSE:
                store.paused = true;
                store.save();
                stopListening();
                break;
            case ACTION_RESUME:
                store.paused = false;
                store.running = true;
                store.resetBaseline();      // steps taken while paused are not counted
                store.save();
                startListening();
                break;
            default:                        // START, REFRESH, or a restart by the system
                store.running = true;
                store.save();
                if (!store.paused) startListening();
        }
        main.removeCallbacks(tick);
        main.postDelayed(tick, 30_000);
        publish(true);
        Watchdog.schedule(this);            // restarts the counter if anything ever kills it
        return START_STICKY;
    }

    private boolean goForeground() {
        Notification n = StepNotifier.build(this, store, 0, false);
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(StepNotifier.LIVE_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
            } else {
                startForeground(StepNotifier.LIVE_ID, n);
            }
            return true;
        } catch (RuntimeException e) {
            // Missing ACTIVITY_RECOGNITION on Android 14+, or a background start the OS refused.
            return false;
        }
    }

    private void startListening() {
        if (listening || sensors == null) return;
        boolean ok = false;
        if (counter != null) ok = sensors.registerListener(this, counter, SensorManager.SENSOR_DELAY_UI, 0);
        if (detector != null) ok |= sensors.registerListener(this, detector, SensorManager.SENSOR_DELAY_FASTEST, 0);
        listening = ok;
    }

    private void stopListening() {
        if (sensors != null) sensors.unregisterListener(this);
        listening = false;
        samples.clear();
    }

    private void shutdown() {
        Watchdog.cancel(this);
        stopListening();
        store.running = false;
        store.paused = false;
        store.resetBaseline();
        store.save();
        main.removeCallbacksAndMessages(null);
        emit(0, false);
        StepWidget.updateAll(this);
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        stopSelf();
    }

    void applyConfig() {
        main.post(() -> {
            StepNotifier.createChannels(this, store);
            if (!store.pref("voice", false) && tts != null) { tts.shutdown(); tts = null; ttsReady = false; }
            if (tts != null && ttsReady) setTtsLanguage();
            publish(true);
        });
    }

    // ---- sensor events -----------------------------------------------------------------

    @Override public void onSensorChanged(SensorEvent e) {
        long now = System.currentTimeMillis();
        int before = store.total();
        if (e.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            store.onCounter(e.values[0], now);
        } else if (e.sensor.getType() == Sensor.TYPE_STEP_DETECTOR) {
            store.onDetector(counter != null, now);
        } else {
            return;
        }
        int after = store.total();
        if (after != before) {
            samples.addLast(new long[] { now, after });
            while (samples.size() > 2 && samples.peekFirst()[0] < now - 20_000) samples.pollFirst();
            if (after > before) milestones(before, after);
            main.removeCallbacks(idleCheck);
            main.postDelayed(idleCheck, MOVING_MS + 500);
        }
        publish(false);
    }

    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    private boolean moving() {
        return !store.paused && store.lastStepAt > 0 && System.currentTimeMillis() - store.lastStepAt < MOVING_MS;
    }

    /** km/h from the last ~20 s of step timing, 0 when standing still. */
    private double speed() {
        if (!moving() || samples.size() < 2) return 0;
        long[] first = samples.peekFirst(), last = samples.peekLast();
        double dt = (last[0] - first[0]) / 1000.0;
        if (dt < 3) return 0;
        double v = (last[1] - first[1]) * store.strideM() / dt * 3.6;
        return Math.max(0, Math.min(25, v));
    }

    // ---- milestones: notification + vibration + voice ----------------------------------

    private void milestones(int prev, int next) {
        int goal = store.goal();
        boolean goalNow = prev < goal && next >= goal && !store.day.equals(store.goalDay);
        int m = (next / 1000) * 1000;
        boolean thousand = m > prev && m > 0 && m > store.lastMilestone;
        if (!goalNow && !thousand) return;
        if (thousand) store.lastMilestone = m;
        if (goalNow) store.goalDay = store.day;
        store.save();

        java.text.NumberFormat nf = StepNotifier.numbers(store);
        String title, body, say;
        if (goalNow) {
            title = store.str("goalTitle", "Daily goal reached! 🎉");
            body = store.message("goalBody", next / 1000, "{steps} steps today — well done!").replace("{steps}", nf.format(next));
            say = store.str("goalSay", "Goal reached. Well done!");
        } else {
            title = store.str("milestoneTitle", "{steps} steps!").replace("{steps}", nf.format(m));
            int left = Math.max(0, goal - next);
            String line = next >= goal
                ? store.message("mottoDone", m / 1000, "Every extra step is a bonus!")
                : store.message("milestoneBody", m / 1000, "Keep going — {left} steps to your goal.");
            body = line.replace("{left}", nf.format(left)).replace("{steps}", nf.format(m));
            say = store.str("milestoneSay", "{steps} steps").replace("{steps}", nf.format(m)) + ". " + body;
        }
        if (store.pref("vibrate", true)) vibrate(goalNow);
        if (!appVisible && store.pref("alerts", true)) StepNotifier.alert(this, store, title, body);
        if (store.pref("voice", false)) speak(goalNow ? say + " " + body : say);
    }

    private void vibrate(boolean big) {
        long[] pattern = big ? new long[] { 0, 220, 120, 220, 120, 520 } : new long[] { 0, 90, 70, 90 };
        try {
            Vibrator v;
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                v = vm == null ? null : vm.getDefaultVibrator();
            } else {
                v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (v == null || !v.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(pattern, -1));
            else v.vibrate(pattern, -1);
        } catch (Exception ignored) { }
    }

    private void speak(String text) {
        if (tts == null) {
            final String pending = text;
            tts = new TextToSpeech(getApplicationContext(), status -> {
                ttsReady = status == TextToSpeech.SUCCESS;
                if (ttsReady) { setTtsLanguage(); say(pending); }
            });
            return;
        }
        if (ttsReady) say(text);
    }

    private void setTtsLanguage() {
        if (tts == null) return;
        String tag = store.locale();
        Locale l = tag == null || tag.isEmpty() ? Locale.getDefault() : Locale.forLanguageTag(tag.replace("-u-nu-latn", ""));
        int r = tts.setLanguage(l);
        if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) tts.setLanguage(Locale.getDefault());
    }

    private void say(String text) {
        if (tts == null || text == null) return;
        tts.setAudioAttributes(new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mj-steps");
    }

    // ---- publishing: notification, widget, web app ---------------------------------------

    /** Refresh everything; notification updates are throttled to one per second. */
    private void publish(boolean force) {
        long now = System.currentTimeMillis();
        double sp = speed();
        boolean mv = moving();
        if (now - lastEmit >= EMIT_EVERY_MS || force) { lastEmit = now; emit(sp, mv); }
        if (force || now - lastNotify >= NOTIFY_EVERY_MS) {
            main.removeCallbacks(notifyRunnable);
            notifyQueued = false;
            lastNotify = now;
            postNotification(sp, mv);
        } else if (!notifyQueued) {
            notifyQueued = true;
            main.postDelayed(notifyRunnable, NOTIFY_EVERY_MS - (now - lastNotify));
        }
        if (force || now - lastWidget >= WIDGET_EVERY_MS) { lastWidget = now; StepWidget.updateAll(this); }
    }

    private void postNotification(double sp, boolean mv) {
        if (!store.running) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try { nm.notify(StepNotifier.LIVE_ID, StepNotifier.build(this, store, sp, mv)); } catch (RuntimeException ignored) { }
    }

    private void emit(double sp, boolean mv) {
        Listener l = listener;
        if (l != null) { try { l.onState(store.snapshot(sp, mv)); } catch (Exception ignored) { } }
    }

    JSONObject snapshot() { return store.snapshot(speed(), moving()); }

    @Override public void onDestroy() {
        stopListening();
        main.removeCallbacksAndMessages(null);
        try { unregisterReceiver(screenReceiver); } catch (Exception ignored) { }
        if (tts != null) { tts.shutdown(); tts = null; }
        if (instance == this) instance = null;
        // Destroyed while counting is still on (killed by the system or a cleaner, not
        // switched off): come back in a few seconds.
        if (store != null && store.running) Watchdog.kick(this, 5_000);
        super.onDestroy();
    }

    @Override public void onTaskRemoved(Intent rootIntent) {
        // Swiping the app away from recents must not stop the counter. Most phones leave the
        // foreground service alone; some kill the whole process with the task — the kick
        // brings it back.
        if (store != null && store.running) Watchdog.kick(this, 2_000);
        super.onTaskRemoved(rootIntent);
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
