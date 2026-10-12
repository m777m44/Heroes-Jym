package io.github.m777m44.mahdijym.steps;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.util.Calendar;
import java.util.TimeZone;

/** JVM tests for the water reminder rules — the same cases as frontend water tests. */
public class WaterMathTest {
    private static final TimeZone TZ = TimeZone.getTimeZone("Asia/Baghdad");
    private static final long MIN = 60_000L;

    /** 2026-10-12 hh:mm in Baghdad. */
    private static long at(int hh, int mm) {
        Calendar c = Calendar.getInstance(TZ);
        c.clear();
        c.set(2026, Calendar.OCTOBER, 12, hh, mm, 0);
        return c.getTimeInMillis();
    }

    @Test public void parsesTimes() {
        assertEquals(9 * 60, WaterMath.minOf("09:00", -1));
        assertEquals(22 * 60 + 30, WaterMath.minOf("22:30", -1));
        assertEquals(-1, WaterMath.minOf("25:00", -1));
        assertEquals(-1, WaterMath.minOf("9:00", -1));
        assertEquals(-1, WaterMath.minOf(null, -1));
    }

    @Test public void nextSlotIsTheNextOneToday() {
        // from 09:00 every 90 min: 09:00, 10:30, 12:00, …
        assertEquals(at(10, 30), WaterMath.nextSlot(at(9, 10), 540, 1320, 90, TZ));
        assertEquals(at(9, 0), WaterMath.nextSlot(at(7, 0), 540, 1320, 90, TZ));
        // exactly on a slot → the following one
        assertEquals(at(12, 0), WaterMath.nextSlot(at(10, 30), 540, 1320, 90, TZ));
    }

    @Test public void afterTheLastSlotItIsTomorrowMorning() {
        long next = WaterMath.nextSlot(at(21, 50), 540, 1320, 90, TZ);   // last slot 21:00
        assertEquals(at(9, 0) + 24 * 60 * MIN, next);
    }

    @Test public void activeHours() {
        assertTrue(WaterMath.withinHours(at(12, 0), 540, 1320, TZ));
        assertFalse(WaterMath.withinHours(at(23, 30), 540, 1320, TZ));
        assertFalse(WaterMath.withinHours(at(6, 0), 540, 1320, TZ));
    }

    @Test public void sittingStillSuggestsAWalk() {
        long now = at(15, 0);
        int[] s = WaterMath.suggest(now, 9000, 10000, now - 70 * MIN, 540, 1320, 3, 12, TZ);
        assertEquals(WaterMath.WALK, s[0]);
        assertEquals(500, s[1]);     // not behind → a 500-step walk
        assertEquals(5, s[2]);
    }

    @Test public void farBehindThePaceSuggestsALongerWalk() {
        long now = at(18, 0);        // 70 % of 09–22 → expect 7,000 of 10,000
        int[] s = WaterMath.suggest(now, 2000, 10000, now - 5 * MIN, 540, 1320, 0, 12, TZ);
        assertEquals(WaterMath.WALK, s[0]);
        assertEquals(1000, s[1]);    // capped at 1,000 steps
        assertEquals(10, s[2]);
    }

    @Test public void onPaceRotatesTheExercises() {
        long now = at(12, 0);
        int[] a = WaterMath.suggest(now, 4000, 10000, now - 5 * MIN, 540, 1320, 13, 12, TZ);
        assertEquals(WaterMath.MOVE, a[0]);
        assertEquals(1, a[1]);
        int[] done = WaterMath.suggest(now, 12000, 10000, now - 120 * MIN, 540, 1320, 2, 12, TZ);
        assertEquals(WaterMath.MOVE, done[0]);   // goal met → no walking nag
        assertEquals(2, done[1]);
    }
}
