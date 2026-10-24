package io.github.m777m44.mahdijym.steps;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Calendar;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.junit.Test;

/** 10.0 — "My schedule" reminders: the next ring of a block on its weekdays (PlanMath). */
public class PlanMathTest {
    /** 2026-10-19 is a Monday. */
    private static long at(int day, int h, int m) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(2026, Calendar.OCTOBER, day, h, m, 0);
        return c.getTimeInMillis();
    }

    private static final int[] SCHOOL = { 0, 1, 2, 3, 4 };      // Sunday to Thursday
    private static final int SCHOOL_START = 7 * 60 + 30;        // 07:30

    @Test public void readsWeekdays() {
        assertEquals(1, PlanMath.weekdayOf("2026-10-19"));
        assertEquals(6, PlanMath.weekdayOf("2026-10-24"));
        assertEquals(-1, PlanMath.weekdayOf("nope"));
        assertTrue(PlanMath.runsOn(new int[0], 5));
        assertTrue(PlanMath.runsOn(SCHOOL, 4));
        assertFalse(PlanMath.runsOn(SCHOOL, 5));
        assertEquals("2026-10-19", PlanMath.dayOf(at(19, 23, 59)));
    }

    @Test public void ringsTenMinutesBeforeSchoolOnTheNextSchoolDay() {
        // Monday 08:00 → Tuesday 07:20 (for Tuesday 07:30)
        assertArrayEquals(new long[] { at(20, 7, 20), at(20, 7, 30) }, PlanMath.nextRing(SCHOOL_START, 10, SCHOOL, null, at(19, 8, 0)));
        // Monday 07:10 → still today
        assertArrayEquals(new long[] { at(19, 7, 20), at(19, 7, 30) }, PlanMath.nextRing(SCHOOL_START, 10, SCHOOL, null, at(19, 7, 10)));
        // Thursday 08:00 → Sunday (Friday and Saturday have no school)
        assertArrayEquals(new long[] { at(25, 7, 20), at(25, 7, 30) }, PlanMath.nextRing(SCHOOL_START, 10, SCHOOL, null, at(22, 8, 0)));
    }

    @Test public void staysQuietOnSkippedDays() {
        Set<String> skip = new HashSet<>(Collections.singletonList("2026-10-19"));
        assertArrayEquals(new long[] { at(20, 7, 20), at(20, 7, 30) }, PlanMath.nextRing(SCHOOL_START, 10, SCHOOL, skip, at(19, 6, 0)));
    }

    @Test public void ringsTheEveningBeforeABlockJustAfterMidnight() {
        // a block at 00:05 every day, 10 minutes before → 23:55 the evening before
        assertArrayEquals(new long[] { at(19, 23, 55), at(20, 0, 5) }, PlanMath.nextRing(5, 10, null, null, at(19, 23, 0)));
    }

    @Test public void everyDayAtTheStart() {
        assertArrayEquals(new long[] { at(19, 13, 0), at(19, 13, 0) }, PlanMath.nextRing(13 * 60, 0, new int[0], null, at(19, 12, 0)));
        assertArrayEquals(new long[] { at(20, 13, 0), at(20, 13, 0) }, PlanMath.nextRing(13 * 60, 0, new int[0], null, at(19, 13, 0)));
    }

    @Test public void noWeekdayNoRing() {
        assertNull(PlanMath.nextRing(600, 0, new int[] { 9 }, null, at(19, 8, 0)));
    }
}
