package io.github.m777m44.mahdijym.steps;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

/**
 * A short celebration jingle synthesized on the phone — no audio files in the APK. A rising
 * arpeggio into a held chord with a few high sparkles; brighter for the step goal, a softer
 * bell for water. Played on the notification stream, so silent/vibrate mode silences it.
 */
final class Fanfare {
    private static final int RATE = 22050;
    private static volatile long lastPlay;

    private Fanfare() { }

    static void play(Context c, String kind) {
        long now = System.currentTimeMillis();
        if (now - lastPlay < 2500) return;   // never stack two jingles
        lastPlay = now;
        new Thread(() -> {
            AudioTrack track = null;
            try {
                short[] pcm = synth(kind);
                track = new AudioTrack.Builder()
                    .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                    .setAudioFormat(new AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                    .setBufferSizeInBytes(pcm.length * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build();
                track.write(pcm, 0, pcm.length);
                track.play();
                Thread.sleep(pcm.length * 1000L / RATE + 150);
            } catch (Throwable ignored) {
                /* no audio — the celebration is still on screen */
            } finally {
                if (track != null) {
                    try { track.stop(); } catch (Throwable ignored) { }
                    track.release();
                }
            }
        }, "mj-fanfare").start();
    }

    private static double note(int semitonesFromA4) { return 440.0 * Math.pow(2, semitonesFromA4 / 12.0); }

    /** Adds a bell-like tone (fundamental + soft harmonics, fast attack, exponential decay). */
    private static void tone(double[] out, double freq, double startS, double lenS, double amp, double decay) {
        int a = (int) (startS * RATE), n = (int) (lenS * RATE);
        for (int i = 0; i < n && a + i < out.length; i++) {
            double t = i / (double) RATE;
            double env = Math.min(1, t / 0.008) * Math.exp(-t * decay);
            double w = 2 * Math.PI * freq * t;
            out[a + i] += amp * env * (Math.sin(w) + 0.32 * Math.sin(2 * w) + 0.12 * Math.sin(3 * w) + 0.05 * Math.sin(5 * w));
        }
    }

    /** 2.10: a brass-like note — many harmonics (a saw) whose top opens on the attack, vibrato when held. */
    private static void brass(double[] out, double freq, double startS, double lenS, double amp) {
        int a = (int) (startS * RATE), n = (int) (lenS * RATE);
        for (int i = 0; i < n && a + i < out.length; i++) {
            double t = i / (double) RATE;
            double env = Math.min(1, t / 0.03) * (t > lenS * 0.7 ? Math.max(0, (lenS - t) / (lenS * 0.3)) : 1);
            double bright = 0.35 + 0.65 * Math.min(1, t / 0.06) * Math.exp(-t * 1.5);
            double vib = t > 0.35 ? Math.sin(2 * Math.PI * 5.5 * t) * 0.004 * Math.min(1, (t - 0.35) / 0.3) : 0;
            double w = 2 * Math.PI * freq * (1 + vib) * t;
            double v = 0;
            for (int h = 1; h <= 6; h++) v += Math.sin(h * w) / h * Math.pow(bright, h - 1);
            out[a + i] += amp * env * v;
        }
    }

    private static void kick(double[] out, double startS, double amp) {
        int a = (int) (startS * RATE), n = (int) (0.4 * RATE);
        double ph = 0;
        for (int i = 0; i < n && a + i < out.length; i++) {
            double t = i / (double) RATE;
            double f = 42 + 98 * Math.exp(-t * 14);
            ph += 2 * Math.PI * f / RATE;
            out[a + i] += amp * Math.exp(-t * 9) * Math.sin(ph);
        }
    }

    /** Noise with a one-pole filter: hp = true → hiss / cymbal, else a dull clap. */
    private static void noise(double[] out, java.util.Random r, double startS, double lenS, double amp, double decay, boolean hp) {
        int a = (int) (startS * RATE), n = (int) (lenS * RATE);
        double lp = 0;
        for (int i = 0; i < n && a + i < out.length; i++) {
            double t = i / (double) RATE;
            double x = r.nextDouble() * 2 - 1;
            lp += 0.35 * (x - lp);
            double v = hp ? x - lp : lp;
            out[a + i] += amp * Math.min(1, t / 0.003) * Math.exp(-t * decay) * v;
        }
    }

    static short[] synth(String kind) {
        boolean water = Celebration.KIND_WATER.equals(kind);
        boolean big = !water && !"milestone".equals(kind);
        java.util.Random r = new java.util.Random(7);
        double len = water ? 2.4 : big ? 3.4 : 2.6;
        double[] buf = new double[(int) (len * RATE)];
        if (water) {
            // bubbles rising into a soft chime chord
            for (int i = 0; i < 4; i++) {
                int a = (int) ((i * 0.085) * RATE), n = (int) (0.14 * RATE);
                double ph = 0;
                for (int j = 0; j < n && a + j < buf.length; j++) {
                    double t = j / (double) RATE;
                    double f = (300 + i * 90) * Math.pow((900 + i * 160) / (300.0 + i * 90), Math.min(1, t / 0.09));
                    ph += 2 * Math.PI * f / RATE;
                    buf[a + j] += 0.22 * Math.min(1, t / 0.01) * Math.exp(-t * 22) * Math.sin(ph);
                }
            }
            int[] chord = { -2, 2, 5, 10 };
            for (int i = 0; i < chord.length; i++) tone(buf, note(chord[i] + 12), 0.36 + i * 0.07, len - 0.4, 0.10, 2.0);
            int[] sparks = { 34, 39, 43 };
            for (int i = 0; i < sparks.length; i++) tone(buf, note(sparks[i]), 0.75 + i * 0.06, 0.6, 0.04, 9);
        } else {
            // pickup G-G-G-C (ta-ta-ta-taaa), the chord on a kick, a snare roll into a crash
            double[][] pick = big ? new double[][] { { -2, 0 }, { -2, 0.12 }, { -2, 0.24 }, { 3, 0.36 } } : new double[][] { { -2, 0 }, { 3, 0.12 } };
            for (double[] pn : pick) brass(buf, note((int) pn[0]), pn[1], 0.16, 0.09);
            double hit = big ? 0.5 : 0.26;
            int[] chord = big ? new int[] { -9, -2, 3, 7, 10, 15 } : new int[] { -2, 3, 7, 10 };
            for (int sx : chord) brass(buf, note(sx), hit, big ? 1.8 : 1.15, 0.06);
            if (big) for (int i = 0; i < 9; i++) noise(buf, r, 0.05 + i * 0.05, 0.06, 0.05 + i * 0.02, 40, false);
            kick(buf, hit, big ? 0.6 : 0.45);
            if (big) kick(buf, hit + 0.75, 0.3);
            noise(buf, r, hit, big ? 2.4 : 1.3, big ? 0.16 : 0.1, 2.2, true);       // crash
            int[] sparks = big ? new int[] { 22, 27, 31, 34, 39 } : new int[] { 27, 31, 34 };
            for (int i = 0; i < sparks.length; i++) tone(buf, note(sparks[i]), hit + 0.18 + i * 0.07, 0.5, 0.045, 10);
            // applause: short claps at random moments, swelling and fading
            double ap = big ? 2.4 : 1.5;
            int claps = (int) (ap * 38);
            for (int i = 0; i < claps; i++) {
                double x = r.nextDouble();
                double env = Math.sin(Math.PI * Math.min(1, x * 1.15));
                noise(buf, r, hit + 0.15 + x * ap, 0.06, 0.05 * (0.4 + env), 60, r.nextBoolean());
            }
        }
        // a small room: three feedback delays
        double[] wet = new double[buf.length];
        int[] d = { (int) (0.0297 * RATE), (int) (0.0371 * RATE), (int) (0.0411 * RATE) };
        for (int k = 0; k < d.length; k++) {
            double[] line = new double[buf.length];
            for (int i = 0; i < buf.length; i++) {
                line[i] = buf[i] + (i >= d[k] ? line[i - d[k]] * 0.72 : 0);
                wet[i] += line[i] / d.length;
            }
        }
        for (int i = 0; i < buf.length; i++) buf[i] += wet[i] * 0.18;
        // Normalise to 75 % of full scale, with a short fade-out.
        double peak = 1e-9;
        for (double v : buf) peak = Math.max(peak, Math.abs(v));
        short[] pcm = new short[buf.length];
        int fade = RATE / 6;
        for (int i = 0; i < buf.length; i++) {
            double g = i > buf.length - fade ? (buf.length - i) / (double) fade : 1;
            pcm[i] = (short) Math.round(buf[i] / peak * 0.75 * 32767 * g);
        }
        return pcm;
    }
}
