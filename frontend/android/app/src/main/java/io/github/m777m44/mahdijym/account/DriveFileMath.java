package io.github.m777m44.mahdijym.account;

/**
 * 8.0 — the pure parts of {@link DriveFilePlugin}, kept free of Android types so they run in a
 * plain JUnit test (DriveFileMathTest).
 */
public final class DriveFileMath {
    private DriveFileMath() { }

    /** Google Drive's documents provider ("com.google.android.apps.docs.storage" and friends). */
    public static final String DRIVE_PACKAGE = "com.google.android.apps.docs";

    /** Did the user pick a file in Google Drive (and not on the phone or in another app)? */
    public static boolean isGoogleDrive(String authority) {
        return authority != null && authority.startsWith(DRIVE_PACKAGE);
    }

    /**
     * A short, stable name for where the file lives, for the UI:
     * "drive" | "phone" (the phone's own storage / SD card / Downloads) | "other" (another app).
     */
    public static String placeOf(String authority) {
        if (authority == null) return "other";
        if (isGoogleDrive(authority)) return "drive";
        if (authority.equals("com.android.externalstorage.documents")
                || authority.equals("com.android.providers.downloads.documents")
                || authority.equals("com.android.providers.media.documents")) return "phone";
        return "other";
    }

    /**
     * When a provider can't truncate ("wt" refused, plain "w" used instead), the new content is
     * written over the old one from the start and anything past its end would be left behind.
     * JSON allows trailing whitespace, so the rest is blanked with spaces: returns how many.
     */
    public static long paddingFor(long newLength, long oldLength) {
        return oldLength > newLength ? oldLength - newLength : 0;
    }
}
