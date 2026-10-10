package io.github.m777m44.mahdijym.steps;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** JVM tests for the step counter arithmetic — run by CI before every APK build. */
public class StepMathTest {
    private static final long MIN = 60_000L;
    private static final long HOUR = 60 * MIN;
    // A fixed "now": 15:00 on some day; today started 15 h ago.
    private static final long NOW = 1_800_000_000_000L;
    private static final long TODAY = NOW - 15 * HOUR;

    /** Same boot, `secs` seconds after a reading of `last`. */
    private static long sameBoot(float last, float value, long secs, int stepsToday) {
        long lastUp = 10 * HOUR;
        return StepMath.delta(value, last, lastUp + secs * 1000, lastUp, 7, 7, NOW, TODAY, stepsToday);
    }

    @Test public void normalWalkingIsCounted() {
        assertEquals(12, sameBoot(24_233f, 24_245f, 10, 70));
        assertEquals(0, sameBoot(24_233f, 24_233f, 10, 70));
    }

    @Test public void theReported70To24303JumpIsRefused() {
        // 2.2: a transient 0 moved the baseline to 0; the next real reading (24,233 since
        // boot) was then credited in full: 70 + 24,233 = 24,303.
        assertEquals(0, sameBoot(24_233f, 0f, 1, 70));                       // the hiccup: nothing
        assertEquals(StepMath.REJECT, sameBoot(0f, 24_233f, 2, 70));         // the jump: refused
    }

    @Test public void lowerValueOnTheSameBootNeverCredits() {
        assertEquals(0, sameBoot(5_000f, 4_990f, 30, 100));
        assertEquals(0, sameBoot(5_000f, 12f, 30, 100));
    }

    @Test public void deltaMustBeHumanlyPossible() {
        // 10 s → at most 40 + 40 = 80 steps
        assertEquals(80, sameBoot(1_000f, 1_080f, 10, 0));
        assertEquals(StepMath.REJECT, sameBoot(1_000f, 1_081f, 10, 0));
        // a real recovery after the service was killed for 2 h: 9,000 steps is fine
        assertEquals(9_000, sameBoot(1_000f, 10_000f, 2 * 3600, 500));
    }

    @Test public void dailyCapIsEnforced() {
        assertEquals(StepMath.REJECT, sameBoot(0f, 1_000f, 24 * 3600, 149_500));
    }

    @Test public void rebootTodayCreditsTheStepsSinceBoot() {
        // boot counter changed; up = 30 min since boot, boot happened today
        long up = 30 * MIN;
        assertEquals(1_200, StepMath.delta(1_200f, 24_000f, up, 9 * HOUR, 8, 7, NOW, TODAY, 70));
    }

    @Test public void rebootOnAnEarlierDayCreditsNothing() {
        // up = 20 h: the phone was switched on yesterday — those steps span two days
        long up = 20 * HOUR;
        assertEquals(0, StepMath.delta(30_000f, 2_000f, up, 25 * HOUR, 8, 7, NOW, TODAY, 70));
    }

    @Test public void rebootIsAlsoDetectedByUptimeGoingBackwards() {
        assertTrue(StepMath.rebooted(5 * MIN, 9 * HOUR, -1, -1));
        assertFalse(StepMath.rebooted(9 * HOUR + 1, 9 * HOUR, -1, -1));
        assertFalse(StepMath.rebooted(9 * HOUR + 1, 9 * HOUR, 7, 7));
        assertTrue(StepMath.rebooted(9 * HOUR + 1, 9 * HOUR, 8, 7));
    }

    @Test public void rebootWithAnImplausibleValueIsRefused() {
        // 5 minutes since boot can't hold 24,000 steps
        assertEquals(StepMath.REJECT, StepMath.delta(24_000f, 50f, 5 * MIN, 9 * HOUR, 8, 7, NOW, TODAY, 0));
    }

    @Test public void badValuesAreIgnored() {
        assertEquals(0, sameBoot(100f, Float.NaN, 10, 0));
        assertEquals(0, sameBoot(100f, Float.POSITIVE_INFINITY, 10, 0));
        assertEquals(0, sameBoot(100f, -5f, 10, 0));
    }

    @Test public void plausibleGrowsWithTime() {
        assertEquals(40, StepMath.plausible(0));
        assertEquals(40, StepMath.plausible(-1000));
        assertEquals(280, StepMath.plausible(60_000));
    }
}
