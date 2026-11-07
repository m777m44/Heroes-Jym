package io.github.m777m44.mahdijym.update;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class UpdateMathTest {
    private static final String H = "3f2a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a";

    @Test public void hexIsLowerCaseAndPadded() {
        assertEquals("00ff10ab", UpdateMath.hex(new byte[] { 0x00, (byte) 0xff, 0x10, (byte) 0xab }));
        assertEquals("", UpdateMath.hex(new byte[0]));
        assertEquals("", UpdateMath.hex(null));
    }

    @Test public void readsGithubDigests() {
        assertEquals(H, UpdateMath.digestHex("sha256:" + H));
        assertEquals(H, UpdateMath.digestHex("  SHA256:" + H.toUpperCase() + " "));
        assertEquals(H, UpdateMath.digestHex(H));
        assertNull(UpdateMath.digestHex("sha1:abc"));
        assertNull(UpdateMath.digestHex("sha256:" + H.substring(1)));
        assertNull(UpdateMath.digestHex("sha256:" + H.substring(1) + "g"));
        assertNull(UpdateMath.digestHex(null));
    }

    @Test public void namesTheDownload() {
        assertEquals("MAHDI-JYM-17.0.0.apk", UpdateMath.apkName("17.0.0", "io.github.m777m44.mahdijym"));
        assertEquals("MAHDI-JYM-17.0.0-online.apk", UpdateMath.apkName("17.0.0", "io.github.m777m44.mahdijym.online"));
        assertEquals("MAHDI-JYM-.._.._x.apk", UpdateMath.apkName("../../x", "io.github.m777m44.mahdijym"));
        assertEquals("MAHDI-JYM-update.apk", UpdateMath.apkName("", null));
        assertEquals("MAHDI-JYM-update.apk", UpdateMath.apkName(null, null));
    }

    @Test public void progressEventsAreThrottledButTheLastAlwaysGoes() {
        assertFalse(UpdateMath.shouldEmit(1000, 1050, 10, 100));
        assertTrue(UpdateMath.shouldEmit(1000, 1000 + UpdateMath.EMIT_MS, 10, 100));
        assertTrue(UpdateMath.shouldEmit(1000, 1001, 100, 100));
        assertTrue(UpdateMath.shouldEmit(0, 500, 5, -1));
    }

    @Test public void redirects() {
        assertTrue(UpdateMath.isRedirect(302));
        assertTrue(UpdateMath.isRedirect(301));
        assertTrue(UpdateMath.isRedirect(307));
        assertTrue(UpdateMath.isRedirect(308));
        assertFalse(UpdateMath.isRedirect(200));
        assertFalse(UpdateMath.isRedirect(206));
        assertFalse(UpdateMath.isRedirect(404));
    }

    @Test public void totalsAndResuming() {
        assertEquals(1000, UpdateMath.totalOf(1000, true, 400, 600));
        assertEquals(1000, UpdateMath.totalOf(0, true, 400, 600));
        assertEquals(600, UpdateMath.totalOf(0, false, 400, 600));
        assertEquals(-1, UpdateMath.totalOf(0, false, 0, -1));
        assertEquals(400, UpdateMath.resumeFrom(400, 1000));
        assertEquals(0, UpdateMath.resumeFrom(1200, 1000));
        assertEquals(0, UpdateMath.resumeFrom(0, 1000));
        assertEquals(300, UpdateMath.resumeFrom(300, 0));
    }

    @Test public void keepsSomeSpaceFree() {
        long mb = 1024L * 1024;
        assertTrue(UpdateMath.enoughSpace(100 * mb, 70 * mb));
        assertFalse(UpdateMath.enoughSpace(75 * mb, 70 * mb));
        assertTrue(UpdateMath.enoughSpace(0, 0));
    }
}
