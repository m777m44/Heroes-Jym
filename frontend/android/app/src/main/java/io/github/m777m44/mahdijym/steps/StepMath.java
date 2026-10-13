package io.github.m777m44.mahdijym.steps;

/**
 * The step counter's arithmetic, free of Android classes so it is unit-tested on the JVM
 * (app/src/test/.../StepMathTest.java, run by CI before every APK build).
 *
 * Android's TYPE_STEP_COUNTER reports the steps since the phone was switched on — often tens
 * of thousands. Each reading is compared with the previous one (the baseline); only the
 * difference is walking. A bad baseline therefore shows up as a huge jump (seen in 2.2: 70
 * steps became 24,303 when a phone briefly reported a low value and the next real reading was
 * credited in full). The rules here make such a jump impossible:
 *
 *   1. A reboot is detected for real — Android's boot counter changed, or the uptime went
 *      backwards — never guessed from "the value went down". After a reboot the reading is the
 *      steps since the boot; they count only if the boot happened today.
 *   2. A lower value on the same boot is a sensor hiccup: nothing is credited.
 *   3. Every delta must be humanly possible in the time since the previous reading
 *      (≤ {@link #MAX_STEPS_PER_SEC} steps/s plus {@link #STEP_SLACK}); a larger one is a
 *      baseline jump and is refused.
 */
final class StepMath {
    private StepMath() { }

    /** Faster than an all-out sprint (~3.5 steps/s): a higher rate is not walking. */
    static final double MAX_STEPS_PER_SEC = 4.0;
    /** Allowance for a delayed or batched reading. */
    static final int STEP_SLACK = 40;
    /** No day holds more steps than this (an ultramarathon is ~100,000). */
    static final int MAX_STEPS_PER_DAY = 150_000;
    /** {@link #delta} result for an implausible jump: move the baseline, add nothing. */
    static final long REJECT = -1;

    /** Most steps a person can take in {@code ms} milliseconds. */
    static long plausible(long ms) {
        double s = Math.max(0, ms) / 1000.0 * MAX_STEPS_PER_SEC;
        return STEP_SLACK + (long) Math.min(MAX_STEPS_PER_DAY, s);
    }

    /** true when the phone restarted between two readings. Boot ids < 0 mean "unknown". */
    static boolean rebooted(long up, long lastUp, int boot, int lastBoot) {
        return (boot >= 0 && lastBoot >= 0 && boot != lastBoot) || up < lastUp;
    }

    /**
     * Steps a new counter reading adds (≥ 0), or {@link #REJECT}.
     *
     * @param value      the new raw reading
     * @param last       the previous raw reading (the baseline, ≥ 0)
     * @param up         uptime now (SystemClock.elapsedRealtime)
     * @param lastUp     uptime at the previous reading
     * @param boot       boot counter now (-1 unknown)
     * @param lastBoot   boot counter at the previous reading (-1 unknown)
     * @param now        wall clock now
     * @param todayStart wall clock of today's local midnight
     * @param stepsToday steps already counted today
     */
    static long delta(float value, float last, long up, long lastUp, int boot, int lastBoot,
                      long now, long todayStart, int stepsToday) {
        if (Float.isNaN(value) || Float.isInfinite(value) || value < 0) return 0;
        long d;
        long window;
        if (rebooted(up, lastUp, boot, lastBoot)) {
            boolean bootToday = now - up >= todayStart;
            d = bootToday ? Math.round((double) value) : 0;
            window = up;                      // the steps were walked since the boot
        } else if (value < last) {
            return 0;                         // sensor hiccup / HAL reset: follow, credit nothing
        } else {
            d = Math.round((double) value - (double) last);
            window = up - lastUp;
        }
        if (d <= 0) return 0;
        if (d > plausible(window) || (long) stepsToday + d > MAX_STEPS_PER_DAY) return REJECT;
        return d;
    }

    // ---- 2.10: the live (provisional) steps -------------------------------------------------
    // The step detector fires on every step at once; the step counter — the authority — lags a
    // few steps behind. Detector steps are shown as "provisional" on top of the confirmed total.
    // 2.x cleared them on every counter reading, so the number shown could step BACK (7,412 →
    // 7,409 → 7,413). Now a counter reading of d new steps uses up d provisional ones: the shown
    // total never goes down while walking and never counts a step twice.

    /** Provisional steps left after the counter confirmed {@code confirmed} new ones. */
    static int provisionalAfter(int provisional, long confirmed) {
        if (provisional <= 0) return 0;
        if (confirmed <= 0) return provisional;
        return (int) Math.max(0, provisional - confirmed);
    }

    /** Most provisional steps shown before the counter has to confirm them. */
    static final int MAX_PROVISIONAL = 200;
}
