package io.github.m777m44.mahdijym.steps;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.Set;

/**
 * MAHDI-JYM 10.0 — the date maths of "My schedule" reminders (PlanReminder), kept free of Android
 * classes so the JVM unit tests can check it (PlanMathTest). Weekdays are 0 = Sunday … 6 =
 * Saturday, like the app; times are local wall-clock times, so a clock change keeps the time.
 */
final class PlanMath {
    private PlanMath() { }

    /** 'yyyy-MM-dd' of a moment, in local time. */
    static String dayOf(long t) { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(t)); }

    /** Whether a block with weekdays `w` (empty or null = every day) runs on weekday `wd`. */
    static boolean runsOn(int[] w, int wd) {
        if (w == null || w.length == 0) return true;
        for (int x : w) if (x == wd) return true;
        return false;
    }

    /** The weekday of a 'yyyy-MM-dd' day, or -1 when it can't be read. */
    static int weekdayOf(String iso) {
        try {
            String[] p = iso.split("-");
            Calendar cal = Calendar.getInstance();
            cal.clear();
            cal.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]));
            return cal.get(Calendar.DAY_OF_WEEK) - 1;
        } catch (RuntimeException e) { return -1; }
    }

    /**
     * A block's next ring after `after`: { ring time, the block's start that day } — on a weekday it
     * runs, not on a day in `skip`, `leadMin` minutes before its start (`start`, minutes after
     * midnight). Null when there is none in the next ten days (no weekday at all).
     */
    static long[] nextRing(int start, int leadMin, int[] w, Set<String> skip, long after) {
        int st = Math.max(0, Math.min(1439, start));
        long lead = Math.max(0, leadMin) * 60_000L;
        Calendar day = Calendar.getInstance();
        day.setTimeInMillis(after);
        for (int d = 0; d < 10; d++) {
            Calendar blk = (Calendar) day.clone();
            blk.set(Calendar.HOUR_OF_DAY, st / 60);
            blk.set(Calendar.MINUTE, st % 60);
            blk.set(Calendar.SECOND, 0);
            blk.set(Calendar.MILLISECOND, 0);
            long when = blk.getTimeInMillis();
            if (runsOn(w, blk.get(Calendar.DAY_OF_WEEK) - 1) && (skip == null || !skip.contains(dayOf(when))) && when - lead > after) {
                return new long[] { when - lead, when };
            }
            day.add(Calendar.DAY_OF_YEAR, 1);
        }
        return null;
    }
}
