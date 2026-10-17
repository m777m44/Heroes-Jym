package io.github.m777m44.mahdijym.steps;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import io.github.m777m44.mahdijym.MainActivity;

/**
 * The full-screen celebration (2.5) — shown over the lock screen and other apps when a goal is
 * reached with MAHDI-JYM closed. Confetti, a glowing ring, the number counting up; it closes
 * itself after 8 seconds or on a tap, and "Open app" goes to the matching screen.
 * A separate task with no recents entry, so closing it returns to whatever was there before.
 */
public class CelebrationActivity extends Activity {
    static final long SHOW_MS = 8000;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private CelebrationView view;
    private Celebration.Spec spec;
    private boolean closing;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            w.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            w.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        spec = Celebration.Spec.from(getIntent());
        view = new CelebrationView(this, spec, this::openApp, this::close);
        setContentView(view);
        immersive();
        handler.postDelayed(this::close, SHOW_MS);
    }

    @SuppressWarnings("deprecation")
    private void immersive() {
        view.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        spec = Celebration.Spec.from(intent);
        closing = false;
        view.animate().cancel();
        view.setAlpha(1f);
        view.restart(spec);
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(this::close, SHOW_MS);
    }

    private void openApp() {
        try {
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            i.putExtra(StepServicePlugin.EXTRA_ROUTE, spec.route());
            startActivity(i);
        } catch (RuntimeException ignored) { }
        finish();
    }

    /** Fade out, then go. */
    private void close() {
        if (closing || isFinishing()) return;
        closing = true;
        handler.removeCallbacksAndMessages(null);
        view.animate().alpha(0f).setDuration(320).withEndAction(this::finish).start();
    }

    @Override public void finish() {
        super.finish();
        overridePendingTransition(0, android.R.anim.fade_out);
    }

    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (view != null) view.stop();
        super.onDestroy();
    }
}
