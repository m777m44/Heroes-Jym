package io.github.m777m44.mahdijym.update;

import java.util.Locale;

/**
 * 17.0 — the plain arithmetic of the in-app APK update (AppUpdatePlugin), kept free of Android so the
 * JVM unit tests can check it: the file name a download gets, how a GitHub digest reads, when a
 * progress event is worth sending, redirects, sizes and free space.
 */
public final class UpdateMath {
    private UpdateMath() {}

    /** At most one progress event per this many milliseconds (the last one always goes). */
    public static final long EMIT_MS = 120;
    /** Space left over after a download, so the phone isn't filled to the last byte. */
    public static final long SPARE_BYTES = 8L * 1024 * 1024;
    /** Redirects followed by hand (github.com → its file servers) before giving up. */
    public static final int MAX_REDIRECTS = 6;

    private static final char[] HEX = "0123456789abcdef".toCharArray();

    /** Bytes → lower-case hex. */
    public static String hex(byte[] b) {
        if (b == null) return "";
        char[] out = new char[b.length * 2];
        for (int i = 0; i < b.length; i++) {
            int v = b[i] & 0xff;
            out[i * 2] = HEX[v >>> 4];
            out[i * 2 + 1] = HEX[v & 0x0f];
        }
        return new String(out);
    }

    /**
     * A SHA-256 as GitHub gives it ("sha256:3f…") or plain hex → 64 lower-case hex characters, or
     * null when it isn't one (then only the size is checked; Android still checks the signature).
     */
    public static String digestHex(String digest) {
        if (digest == null) return null;
        String d = digest.trim().toLowerCase(Locale.ROOT);
        if (d.startsWith("sha256:")) d = d.substring(7);
        if (d.length() != 64) return null;
        for (int i = 0; i < d.length(); i++) {
            char c = d.charAt(i);
            if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))) return null;
        }
        return d;
    }

    /** The name a downloaded APK is kept under: MAHDI-JYM-17.0.0.apk (…-online.apk for the online app). */
    public static String apkName(String version, String packageName) {
        StringBuilder v = new StringBuilder();
        String s = version == null ? "" : version.trim();
        for (int i = 0; i < s.length() && v.length() < 32; i++) {
            char c = s.charAt(i);
            v.append((c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '.' || c == '-' ? c : '_');
        }
        if (v.length() == 0) v.append("update");
        boolean online = packageName != null && packageName.endsWith(".online");
        return "MAHDI-JYM-" + v + (online ? "-online" : "") + ".apk";
    }

    /** Send a progress event now? Every EMIT_MS at most — and always the last one. */
    public static boolean shouldEmit(long lastMs, long nowMs, long done, long total) {
        if (total > 0 && done >= total) return true;
        return nowMs - lastMs >= EMIT_MS;
    }

    public static boolean isRedirect(int code) {
        return code == 301 || code == 302 || code == 303 || code == 307 || code == 308;
    }

    /**
     * The whole size of the file: the size GitHub said when known, else what the server says — the
     * rest of the file on a resumed (206) download, plus what is already here.
     */
    public static long totalOf(long expected, boolean resumed, long have, long contentLength) {
        if (expected > 0) return expected;
        if (contentLength < 0) return -1;
        return resumed ? have + contentLength : contentLength;
    }

    /** Is there room for `need` more bytes (keeping SPARE_BYTES free)? An unknown size always fits. */
    public static boolean enoughSpace(long usable, long need) {
        if (need <= 0) return true;
        return usable >= need + SPARE_BYTES;
    }

    /** A partial download can go on from where it stopped only if it isn't bigger than the file. */
    public static long resumeFrom(long partLength, long expected) {
        if (partLength <= 0) return 0;
        if (expected > 0 && partLength > expected) return 0;
        return partLength;
    }
}
