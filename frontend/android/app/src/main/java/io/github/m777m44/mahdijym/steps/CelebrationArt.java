package io.github.m777m44.mahdijym.steps;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;

import java.text.NumberFormat;
import java.util.Locale;
import java.util.Random;

/**
 * Draws the picture of the celebration notification on the phone (nothing is downloaded):
 * a deep gradient card, a soft glow, confetti, the emoji and the number. Small on purpose
 * (512×256) — notification bitmaps travel through a size-limited binder transaction.
 */
final class CelebrationArt {
    static final int W = 512, H = 256;
    static final int[] CONFETTI = { 0xFFFFD60A, 0xFFFF375F, 0xFF64D2FF, 0xFF30D158, 0xFFBF5AF2, 0xFFFF9F0A, 0xFFFFFFFF };

    private CelebrationArt() { }

    static String number(Celebration.Spec sp, int v) {
        Locale l = sp.locale == null || sp.locale.isEmpty() ? Locale.getDefault() : Locale.forLanguageTag(sp.locale);
        return NumberFormat.getIntegerInstance(l).format(v);
    }

    static int alpha(int color, int a) { return (color & 0x00FFFFFF) | (a << 24); }

    static Bitmap render(Celebration.Spec sp) {
        Bitmap bmp = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);

        // Card: near-black with the kind's colour glowing from the middle.
        p.setShader(new LinearGradient(0, 0, W, H, 0xFF0B0B14, 0xFF161628, Shader.TileMode.CLAMP));
        cv.drawRect(0, 0, W, H, p);
        p.setShader(new RadialGradient(W / 2f, H * 0.55f, W * 0.55f,
            new int[] { alpha(sp.c1(), 0x90), alpha(sp.c2(), 0x30), 0x00000000 }, new float[] { 0f, 0.55f, 1f }, Shader.TileMode.CLAMP));
        cv.drawRect(0, 0, W, H, p);
        p.setShader(null);

        // Confetti — seeded by the value, so the same milestone always looks the same.
        Random r = new Random(sp.value * 31L + sp.kind.hashCode());
        for (int i = 0; i < 70; i++) {
            float x = r.nextFloat() * W, y = r.nextFloat() * H;
            float w = 4 + r.nextFloat() * 7, h = w * (0.4f + r.nextFloat() * 0.6f);
            p.setColor(alpha(CONFETTI[r.nextInt(CONFETTI.length)], 140 + r.nextInt(115)));
            cv.save();
            cv.rotate(r.nextFloat() * 360, x, y);
            if (r.nextInt(4) == 0) cv.drawCircle(x, y, w / 2, p);
            else cv.drawRoundRect(new RectF(x - w / 2, y - h / 2, x + w / 2, y + h / 2), 1.5f, 1.5f, p);
            cv.restore();
        }

        // Kicker
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setTextAlign(Paint.Align.CENTER);
        t.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        t.setColor(sp.c1() == 0xFFFFD60A ? 0xFFFFE680 : alpha(sp.c2(), 0xFF));
        t.setTextSize(24);
        cv.drawText(fit(t, sp.kicker, W - 40), W / 2f, 52, t);

        // Emoji either side of the number
        Paint e = new Paint(Paint.ANTI_ALIAS_FLAG);
        e.setTextAlign(Paint.Align.CENTER);
        e.setTextSize(54);
        String num = number(sp, sp.value);
        t.setTextSize(86);
        t.setColor(0xFFFFFFFF);
        t.setShader(new LinearGradient(0, 90, 0, 175, 0xFFFFFFFF, sp.c2(), Shader.TileMode.CLAMP));
        float nw = Math.min(W - 150, t.measureText(num));
        if (t.measureText(num) > W - 150) t.setTextSize(86 * (W - 150) / t.measureText(num));
        cv.drawText(num, W / 2f, 165, t);
        cv.drawText(sp.emoji(), W / 2f - nw / 2 - 42, 158, e);
        cv.drawText(sp.emoji(), W / 2f + nw / 2 + 42, 158, e);
        t.setShader(null);

        // Unit + a thin bar in the kind's colours
        t.setTypeface(Typeface.DEFAULT);
        t.setTextSize(22);
        t.setColor(0xCCFFFFFF);
        cv.drawText(fit(t, sp.unit, W - 40), W / 2f, 200, t);
        p.setShader(new LinearGradient(W * 0.3f, 0, W * 0.7f, 0, sp.c1(), sp.c2(), Shader.TileMode.CLAMP));
        cv.drawRoundRect(new RectF(W * 0.3f, 222, W * 0.7f, 228), 3, 3, p);
        p.setShader(null);
        return bmp;
    }

    /** Round badge for the notification's large icon. */
    static Bitmap badge(Celebration.Spec sp) {
        int s = 128;
        Bitmap bmp = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setShader(new LinearGradient(0, 0, s, s, sp.c1(), sp.c2(), Shader.TileMode.CLAMP));
        cv.drawCircle(s / 2f, s / 2f, s / 2f, p);
        Paint e = new Paint(Paint.ANTI_ALIAS_FLAG);
        e.setTextAlign(Paint.Align.CENTER);
        e.setTextSize(64);
        cv.drawText(sp.emoji(), s / 2f, s / 2f + 22, e);
        return bmp;
    }

    /** Ellipsize a single line to `max` pixels. */
    static String fit(Paint p, String s, float max) {
        if (s == null) return "";
        if (p.measureText(s) <= max) return s;
        String x = s;
        while (x.length() > 1 && p.measureText(x + "…") > max) x = x.substring(0, x.length() - 1);
        return x + "…";
    }
}
