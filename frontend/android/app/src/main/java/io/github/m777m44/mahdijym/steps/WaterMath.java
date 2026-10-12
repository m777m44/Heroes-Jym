package io.github.m777m44.mahdijym.steps;

import java.util.Calendar;
import java.util.TimeZone;

/**
 * Pure arithmetic for the water reminders (no Android types, so it runs in JVM unit tests).
 * Mirrors frontend/src/lib/water.js — nextReminder() and suggestMove() — rule for rule.
 */
final class WaterMath {
    static final int WALK = 0, MOVE = 1;

    private WaterMath() { }

    /** "HH:mm" → minutes after midnight, or `def` when it isn't a valid time. */
    static int minOf(String hhmm, int def) {
        if (hhmm == null || hhmm.length() != 5 || hhmm.charAt(2) != ':') return def;
        try {
            int h = Integer.parseInt(hhmm.substring(0, 2));
            int m = Integer.parseInt(hhmm.substring(3, 5));
            if (h < 0 || h > 23 || m < 0 || m > 59) return def;
            return h * 60 + m;
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private static long at(Calendar day, int minutes) {
        Calendar c = (Calendar) day.clone();
        c.set(Calendar.HOUR_OF_DAY, minutes / 60);
        c.set(Calendar.MINUTE, minutes % 60);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    /**
     * The next reminder strictly after `nowMs` (30 s of slack): from, from + every, … ≤ to
     * today, else tomorrow's first slot.
     */
    static long nextSlot(long nowMs, int fromMin, int toMin, int every, TimeZone tz) {
        if (every < 15) every = 15;
        if (toMin <= fromMin) { fromMin = 9 * 60; toMin = 22 * 60; }
        Calendar day = Calendar.getInstance(tz);
        day.setTimeInMillis(nowMs);
        for (int m = fromMin; m <= toMin; m += every) {
            long t = at(day, m);
            if (t > nowMs + 30_000L) return t;
        }
        day.add(Calendar.DAY_OF_YEAR, 1);
        return at(day, fromMin);
    }

    static boolean withinHours(long nowMs, int fromMin, int toMin, TimeZone tz) {
        Calendar c = Calendar.getInstance(tz);
        c.setTimeInMillis(nowMs);
        int m = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
        return m >= fromMin - 1 && m <= toMin + 1;
    }

    /**
     * What a reminder suggests: { WALK, steps, minutes } when the walker has sat still for an
     * hour or is ≥ 1,500 steps behind the pace for this time of day; else { MOVE, index, 0 },
     * rotating through `moves` exercises with the slot number.
     */
    static int[] suggest(long nowMs, int steps, int goal, long lastStepAt, int fromMin, int toMin,
                         int slot, int moves, TimeZone tz) {
        Calendar c = Calendar.getInstance(tz);
        c.setTimeInMillis(nowMs);
        int mins = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
        int span = Math.max(60, toMin - fromMin);
        double frac = Math.max(0, Math.min(1, (mins - fromMin) / (double) span));
        int behind = (int) Math.round(goal * frac) - steps;
        boolean sitting = lastStepAt > 0 && nowMs - lastStepAt >= 60 * 60_000L;
        if (steps < goal && (sitting || behind >= 1500)) {
            int base = behind > 0 ? behind : 500;
            int n = (int) Math.max(300, Math.min(1000, Math.round(base / 100.0) * 100));
            return new int[] { WALK, n, (n + 99) / 100 };
        }
        int i = moves > 0 ? ((slot % moves) + moves) % moves : 0;
        return new int[] { MOVE, i, 0 };
    }

    /** `v` clamped to 0…max (an int for progress bars). */
    static int clampMl(long v, int max) { return (int) Math.max(0, Math.min(max, v)); }
}
