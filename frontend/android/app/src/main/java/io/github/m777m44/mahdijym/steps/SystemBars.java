package io.github.m777m44.mahdijym.steps;

import android.animation.ArgbEvaluator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.os.Build;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

/**
 * 9.0 — the status bar and the navigation bar follow the app's theme: the background colour
 * glides to the new theme's (a 380 ms colour animation) and the icons switch between dark and
 * light so they always read. From Android 15 the app draws edge to edge behind the bars, so
 * there the colour comes from the page itself and only the icons are set here.
 */
final class SystemBars {
    private static ValueAnimator running;

    private SystemBars() { }

    static void apply(Activity a, Theme th) {
        if (a == null || th == null) return;
        try {
            Window w = a.getWindow();
            if (w == null) return;
            WindowInsetsControllerCompat ic = WindowCompat.getInsetsController(w, w.getDecorView());
            ic.setAppearanceLightStatusBars(th.light);
            ic.setAppearanceLightNavigationBars(th.light);
            if (Build.VERSION.SDK_INT >= 35) return;
            final int to = th.bg | 0xFF000000;
            final int from = w.getStatusBarColor();
            if (from == to) return;
            if (running != null) running.cancel();
            ValueAnimator an = ValueAnimator.ofObject(new ArgbEvaluator(), from, to);
            an.setDuration(380);
            an.addUpdateListener(x -> {
                int c = (int) x.getAnimatedValue();
                try { w.setStatusBarColor(c); w.setNavigationBarColor(c); } catch (RuntimeException ignored) { }
            });
            running = an;
            an.start();
        } catch (RuntimeException ignored) { /* a window without bars (picture-in-picture…) */ }
    }
}
