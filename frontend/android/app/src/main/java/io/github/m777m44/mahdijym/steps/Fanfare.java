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
        if (now - lastPlay < 1500) return;   // never stack two jingles
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

    static short[] synth(String kind) {
        boolean water = Celebration.KIND_WATER.equals(kind);
        double len = 2.2;
        double[] buf = new double[(int) (len * RATE)];
        // C major for the steps, G major (softer, lower decay) for water.
        int[] arp = water ? new int[] { -2, 2, 5, 10 } : new int[] { 3, 7, 10, 15 };
        double step = water ? 0.11 : 0.095;
        for (int i = 0; i < arp.length; i++) tone(buf, note(arp[i]), i * step, 0.5, 0.20, water ? 5 : 6);
        double chordAt = arp.length * step + 0.02;
        int[] chord = water ? new int[] { -2, 2, 5, 10 } : new int[] { 3, 7, 10, 15, 19 };
        for (int s : chord) tone(buf, note(s), chordAt, len - chordAt, 0.13, water ? 1.9 : 1.6);
        // Sparkles
        int[] sparks = { 22, 27, 31, 34, 29 };
        for (int i = 0; i < sparks.length; i++) tone(buf, note(sparks[i]), chordAt + 0.08 + i * 0.13, 0.25, 0.05, 14);
        // Normalise to 70 % of full scale, with a short fade-out.
        double peak = 1e-9;
        for (double v : buf) peak = Math.max(peak, Math.abs(v));
        short[] pcm = new short[buf.length];
        int fade = RATE / 10;
        for (int i = 0; i < buf.length; i++) {
            double g = i > buf.length - fade ? (buf.length - i) / (double) fade : 1;
            pcm[i] = (short) Math.round(buf[i] / peak * 0.7 * 32767 * g);
        }
        return pcm;
    }
}
