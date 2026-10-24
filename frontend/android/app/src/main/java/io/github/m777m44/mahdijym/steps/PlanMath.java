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

    /** Whether a block with weekdays `w` and quiet days `skip` still rings on the day `iso`. */
    static boolean ringsOn(int[] w, Set<String> skip, String iso) { return ringsOn(w, skip, null, iso); }

    /**
     * The same for an entry that may be for one day only (`only`, 'yyyy-MM-dd': a day's own time
     * after +10) — then no other day, whatever its weekday (review on PR #13).
     */
    static boolean ringsOn(int[] w, Set<String> skip, String only, String iso) {
        if (iso == null || (only != null && !only.isEmpty() && !only.equals(iso))) return false;
        int wd = weekdayOf(iso);
        return wd >= 0 && runsOn(w, wd) && (skip == null || !skip.contains(iso));
    }

    /** What a reminder says, in short — the same text gives the same value. */
    static String textSig(String title, String body, String big) {
        return Integer.toHexString((title + '\u0001' + body + '\u0001' + big).hashCode());
    }

    static long[] nextRing(int start, int leadMin, int[] w, Set<String> skip, long after) {
        return nextRing(start, leadMin, w, skip, null, after);
    }

    /**
     * A block's next ring after `after`: { ring time, the block's start that day } — on a weekday it
     * runs, not on a day in `skip` (and only on `only` when that is set), `leadMin` minutes before
     * its start (`start`, minutes after midnight). Weekdays and quiet days are the block's own
     * date, also when the lead makes it ring the evening before (a 00:15 block, an hour early).
     * Null when there is none in the next ten days.
     */
    static long[] nextRing(int start, int leadMin, int[] w, Set<String> skip, String only, long after) {
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
            long blockAt = blk.getTimeInMillis();
            if (blockAt - lead > after && ringsOn(w, skip, only, dayOf(blockAt))) return new long[] { blockAt - lead, blockAt };
            day.add(Calendar.DAY_OF_YEAR, 1);
        }
        return null;
    }
}
