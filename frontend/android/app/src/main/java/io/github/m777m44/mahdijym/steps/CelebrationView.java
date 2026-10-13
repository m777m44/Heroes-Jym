package io.github.m777m44.mahdijym.steps;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.view.MotionEvent;
import android.view.View;

import java.util.Random;

/**
 * Everything the full-screen celebration draws, frame by frame on a Canvas:
 * a dark backdrop lit by the goal's colour, expanding rings, falling confetti (gravity, drift,
 * spin, flutter), the emoji easing in (no bounce), the number counting up, the message, an
 * "Open app" button and a thin bar showing when it closes by itself.
 */
@SuppressLint("ViewConstructor")
final class CelebrationView extends View {
    private static final int N = 170;

    private final Runnable onOpen, onClose;
    private Celebration.Spec sp;
    private long t0, lastFrame;
    private boolean running = true;

    // confetti
    private final float[] x = new float[N], y = new float[N], vx = new float[N], vy = new float[N];
    private final float[] rot = new float[N], vr = new float[N], sz = new float[N], ph = new float[N];
    private final int[] col = new int[N], shape = new int[N];
    private final Random rnd = new Random();

    // 2.10: fireworks — FB bursts of FS sparks each, launched one after another
    private static final int FB = 5, FS = 44;
    private static final float[] BURST_AT = { 0.15f, 0.75f, 1.3f, 1.95f, 2.7f };
    private final float[] bx = new float[FB], by = new float[FB];
    private final float[] fx = new float[FB * FS], fy = new float[FB * FS], fvx = new float[FB * FS], fvy = new float[FB * FS], flife = new float[FB * FS];
    private final int[] fcol = new int[FB * FS];
    private final RectF rays = new RectF();

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final TextPaint text = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    private final Paint emoji = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF button = new RectF();
    private final RectF tmp = new RectF();
    private Shader backdrop, glow;
    private StaticLayout subLayout;
    private final float dp;

    CelebrationView(Context c, Celebration.Spec spec, Runnable onOpen, Runnable onClose) {
        super(c);
        this.onOpen = onOpen;
        this.onClose = onClose;
        this.dp = c.getResources().getDisplayMetrics().density;
        ring.setStyle(Paint.Style.STROKE);
        text.setTextAlign(Paint.Align.CENTER);
        emoji.setTextAlign(Paint.Align.CENTER);
        setFocusable(true);
        restart(spec);
    }

    void restart(Celebration.Spec spec) {
        sp = spec;
        t0 = SystemClock.uptimeMillis();
        lastFrame = t0;
        running = true;
        setContentDescription(spec.kicker + " " + CelebrationArt.number(spec, spec.value) + " " + spec.unit + ". " + spec.sub);
        if (getWidth() > 0) layoutFor(getWidth(), getHeight());
        invalidate();
    }

    void stop() { running = false; }

    @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
        super.onSizeChanged(w, h, ow, oh);
        layoutFor(w, h);
    }

    private void layoutFor(int w, int h) {
        backdrop = new RadialGradient(w / 2f, h * 0.38f, Math.max(w, h) * 0.85f,
            new int[] { CelebrationArt.alpha(sp.c1(), 0x70), 0xF00A0A14, 0xFA040408 }, new float[] { 0f, 0.5f, 1f }, Shader.TileMode.CLAMP);
        glow = new RadialGradient(0, 0, Math.min(w, h) * 0.32f,
            new int[] { CelebrationArt.alpha(sp.c1(), 0xAA), CelebrationArt.alpha(sp.c2(), 0x33), 0x00000000 }, new float[] { 0f, 0.5f, 1f }, Shader.TileMode.CLAMP);
        float cx = w / 2f, cy = h * 0.36f;
        for (int i = 0; i < N; i++) {
            boolean burst = i < N * 0.55f;
            if (burst) {      // fired from behind the emoji, then falling
                double a = rnd.nextDouble() * Math.PI * 2;
                float sp0 = (0.35f + rnd.nextFloat() * 0.9f) * Math.min(w, h);
                x[i] = cx; y[i] = cy;
                vx[i] = (float) Math.cos(a) * sp0;
                vy[i] = (float) Math.sin(a) * sp0 - 0.35f * h;
            } else {          // a curtain from above, staggered
                x[i] = rnd.nextFloat() * w;
                y[i] = -rnd.nextFloat() * h * 0.9f - 20 * dp;
                vx[i] = (rnd.nextFloat() - 0.5f) * 60 * dp;
                vy[i] = (60 + rnd.nextFloat() * 90) * dp;
            }
            rot[i] = rnd.nextFloat() * 360;
            vr[i] = (rnd.nextFloat() - 0.5f) * 720;
            sz[i] = (5 + rnd.nextFloat() * 7) * dp;
            ph[i] = rnd.nextFloat() * 6.28f;
            col[i] = CelebrationArt.CONFETTI[rnd.nextInt(CelebrationArt.CONFETTI.length)];
            shape[i] = rnd.nextInt(5);   // 0 = circle, 1 = ribbon, else rectangle
        }
        for (int b = 0; b < FB; b++) {
            bx[b] = w * (0.18f + rnd.nextFloat() * 0.64f);
            by[b] = h * (0.1f + rnd.nextFloat() * 0.28f);
            for (int j = 0; j < FS; j++) {
                int i = b * FS + j;
                double a = j / (double) FS * Math.PI * 2 + rnd.nextDouble() * 0.2;
                float v = (90 + rnd.nextFloat() * 150) * dp;
                fx[i] = bx[b]; fy[i] = by[b];
                fvx[i] = (float) Math.cos(a) * v; fvy[i] = (float) Math.sin(a) * v;
                flife[i] = 1f + rnd.nextFloat() * 0.6f;
                fcol[i] = j % 3 == 0 ? 0xFFFFFFFF : (j % 3 == 1 ? sp.c1() : sp.c2());
            }
        }
        text.setTextSize(17 * dp);
        text.setTypeface(Typeface.DEFAULT);
        int width = (int) Math.max(1, w - 64 * dp);
        subLayout = StaticLayout.Builder.obtain(sp.sub, 0, sp.sub.length(), new TextPaint(text), width)
            .setAlignment(Layout.Alignment.ALIGN_CENTER).setMaxLines(4).build();
    }

    private static float easeOut(float t) { t = Math.max(0, Math.min(1, t)); return 1 - (1 - t) * (1 - t) * (1 - t); }

    @Override protected void onDraw(Canvas cv) {
        int w = getWidth(), h = getHeight();
        long now = SystemClock.uptimeMillis();
        float t = (now - t0) / 1000f;
        float dt = Math.min(0.05f, (now - lastFrame) / 1000f);
        lastFrame = now;
        float cx = w / 2f, cy = h * 0.36f, m = Math.min(w, h);

        // backdrop, fading in
        paint.setShader(backdrop);
        paint.setAlpha((int) (255 * easeOut(t / 0.35f)));
        cv.drawRect(0, 0, w, h, paint);
        paint.setShader(null);
        paint.setAlpha(255);

        // rings
        for (int k = 0; k < 3; k++) {
            float p = (t - k * 0.35f) / 1.6f;
            if (p <= 0 || p >= 1) continue;
            ring.setStrokeWidth((1 - p) * 6 * dp + dp);
            ring.setColor(CelebrationArt.alpha(k == 1 ? sp.c2() : sp.c1(), (int) (200 * (1 - p))));
            cv.drawCircle(cx, cy, easeOut(p) * m * 0.62f, ring);
        }

        // 2.10: light rays turning slowly behind the badge
        float rf = easeOut((t - 0.15f) / 0.9f);
        if (rf > 0) {
            float rr = m * 0.75f;
            rays.set(cx - rr, cy - rr, cx + rr, cy + rr);
            paint.setColor(CelebrationArt.alpha(sp.c1(), (int) (40 * rf)));
            for (int k = 0; k < 16; k++) cv.drawArc(rays, k * 22.5f + t * 16f, 7f, true, paint);
        }

        // glow (a slow, gentle breathing — not a bounce)
        cv.save();
        cv.translate(cx, cy);
        float breathe = 1 + 0.04f * (float) Math.sin(t * 2.4);
        cv.scale(breathe * easeOut(t / 0.6f), breathe * easeOut(t / 0.6f));
        paint.setShader(glow);
        cv.drawCircle(0, 0, m * 0.32f, paint);
        paint.setShader(null);
        cv.restore();

        // confetti
        float g = 520 * dp;
        for (int i = 0; i < N; i++) {
            if (y[i] > h + 30 * dp) continue;
            vy[i] += g * dt * (vy[i] > 260 * dp ? 0.1f : 1f);    // terminal velocity, like paper
            vx[i] *= (1 - 0.9f * dt);
            x[i] += (vx[i] + (float) Math.sin(t * 3 + ph[i]) * 28 * dp) * dt;
            y[i] += vy[i] * dt;
            rot[i] += vr[i] * dt;
            float flutter = Math.abs((float) Math.cos(t * 5 + ph[i]));
            paint.setColor(col[i]);
            cv.save();
            cv.translate(x[i], y[i]);
            cv.rotate(rot[i]);
            float s = sz[i];
            if (shape[i] == 0) cv.drawCircle(0, 0, s * 0.45f, paint);
            else if (shape[i] == 1) { tmp.set(-s * 0.25f, -s * 1.1f * flutter, s * 0.25f, s * 1.1f * flutter); cv.drawRoundRect(tmp, s * 0.2f, s * 0.2f, paint); }
            else { tmp.set(-s / 2, -s * 0.32f * flutter - 1, s / 2, s * 0.32f * flutter + 1); cv.drawRect(tmp, paint); }
            cv.restore();
        }

        // 2.10: fireworks
        for (int b = 0; b < FB; b++) {
            float age = t - BURST_AT[b];
            if (age <= 0) continue;
            for (int j = 0; j < FS; j++) {
                int i = b * FS + j;
                if (age >= flife[i]) continue;
                fvx[i] *= (1 - 1.6f * dt);
                fvy[i] = fvy[i] * (1 - 1.6f * dt) + 70 * dp * dt;
                fx[i] += fvx[i] * dt;
                fy[i] += fvy[i] * dt;
                float al = 1 - age / flife[i];
                paint.setColor(CelebrationArt.alpha(fcol[i], (int) (60 * al)));
                cv.drawCircle(fx[i], fy[i], (5 * al + 1) * dp, paint);
                paint.setColor(CelebrationArt.alpha(fcol[i], (int) (255 * al)));
                cv.drawCircle(fx[i], fy[i], (1.2f + 1.6f * al) * dp, paint);
            }
        }

        // emoji
        float e = easeOut((t - 0.05f) / 0.55f);
        emoji.setTextSize(m * 0.24f * (0.6f + 0.4f * e));
        emoji.setAlpha((int) (255 * e));
        cv.drawText(sp.emoji(), cx, cy + m * 0.085f, emoji);

        // kicker
        float k1 = easeOut((t - 0.25f) / 0.5f);
        text.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        text.setTextSize(20 * dp);
        text.setShader(null);
        text.setColor(CelebrationArt.alpha(sp.c1() == 0xFFFFD60A ? 0xFFFFE680 : sp.c2(), (int) (255 * k1)));
        float ky = cy + m * 0.30f + (1 - k1) * 16 * dp;
        cv.drawText(CelebrationArt.fit(text, sp.kicker, w - 48 * dp), cx, ky, text);

        // number, counting up
        float k2 = easeOut((t - 0.35f) / 1.4f);
        String num = CelebrationArt.number(sp, Math.round(sp.value * k2));
        text.setTextSize(64 * dp);
        float tw = text.measureText(CelebrationArt.number(sp, sp.value));
        if (tw > w - 48 * dp) text.setTextSize(64 * dp * (w - 48 * dp) / tw);
        float ny = ky + 74 * dp;
        text.setShader(new LinearGradient(0, ny - 56 * dp, 0, ny, 0xFFFFFFFF, sp.c2(), Shader.TileMode.CLAMP));
        text.setAlpha((int) (255 * Math.min(1, (t - 0.3f) / 0.3f > 0 ? (t - 0.3f) / 0.3f : 0)));
        cv.drawText(num, cx, ny, text);
        text.setShader(null);

        // unit + message
        float k3 = easeOut((t - 0.6f) / 0.5f);
        text.setTypeface(Typeface.DEFAULT);
        text.setTextSize(17 * dp);
        text.setColor(CelebrationArt.alpha(0xFFFFFFFF, (int) (200 * k3)));
        cv.drawText(sp.unit, cx, ny + 30 * dp, text);
        if (subLayout != null) {
            subLayout.getPaint().setColor(CelebrationArt.alpha(0xFFFFFFFF, (int) (235 * k3)));
            cv.save();
            cv.translate(cx - subLayout.getWidth() / 2f, ny + 52 * dp);
            subLayout.draw(cv);
            cv.restore();
        }

        // "Open app" button + hint
        float k4 = easeOut((t - 0.9f) / 0.5f);
        float bw = Math.min(w - 64 * dp, 260 * dp), bh = 52 * dp, by = h - 120 * dp;
        button.set(cx - bw / 2, by, cx + bw / 2, by + bh);
        paint.setShader(new LinearGradient(button.left, 0, button.right, 0, sp.c1(), sp.c2(), Shader.TileMode.CLAMP));
        paint.setAlpha((int) (255 * k4));
        cv.drawRoundRect(button, bh / 2, bh / 2, paint);
        paint.setShader(null);
        paint.setAlpha(255);
        text.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        text.setTextSize(17 * dp);
        text.setColor(CelebrationArt.alpha(0xFF0B0B14, (int) (255 * k4)));
        cv.drawText(CelebrationArt.fit(text, sp.open, bw - 24 * dp), cx, by + bh / 2 + 6 * dp, text);
        if (sp.hint != null && !sp.hint.isEmpty()) {
            text.setTypeface(Typeface.DEFAULT);
            text.setTextSize(13 * dp);
            text.setColor(CelebrationArt.alpha(0xFFFFFFFF, (int) (140 * k4)));
            cv.drawText(sp.hint, cx, by + bh + 30 * dp, text);
        }

        // time left until it closes on its own
        float left = 1 - Math.min(1, (now - t0) / (float) CelebrationActivity.SHOW_MS);
        paint.setColor(CelebrationArt.alpha(sp.c1(), 0xB0));
        cv.drawRect(cx - w * 0.3f * left, h - 4 * dp, cx + w * 0.3f * left, h - 2 * dp, paint);

        if (running) postInvalidateOnAnimation();
    }

    @SuppressLint("ClickableViewAccessibility")
    @Override public boolean onTouchEvent(MotionEvent ev) {
        if (ev.getActionMasked() == MotionEvent.ACTION_UP) {
            if (button.contains(ev.getX(), ev.getY())) onOpen.run();
            else onClose.run();
            performClick();
            return true;
        }
        return true;
    }

    @Override public boolean performClick() { return super.performClick(); }
}
