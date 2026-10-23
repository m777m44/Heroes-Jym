package io.github.m777m44.mahdijym.account;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class DriveFileMathTest {
    @Test
    public void recognisesGoogleDrive() {
        assertTrue(DriveFileMath.isGoogleDrive("com.google.android.apps.docs.storage"));
        assertTrue(DriveFileMath.isGoogleDrive("com.google.android.apps.docs.storage.legacy"));
        assertFalse(DriveFileMath.isGoogleDrive("com.android.externalstorage.documents"));
        assertFalse(DriveFileMath.isGoogleDrive(null));
    }

    @Test
    public void namesThePlace() {
        assertEquals("drive", DriveFileMath.placeOf("com.google.android.apps.docs.storage"));
        assertEquals("phone", DriveFileMath.placeOf("com.android.externalstorage.documents"));
        assertEquals("phone", DriveFileMath.placeOf("com.android.providers.downloads.documents"));
        assertEquals("other", DriveFileMath.placeOf("com.dropbox.android.FileCache"));
        assertEquals("other", DriveFileMath.placeOf(null));
    }

    @Test
    public void padsOnlyWhenTheFileShrinks() {
        assertEquals(0, DriveFileMath.paddingFor(100, 0));
        assertEquals(0, DriveFileMath.paddingFor(100, 100));
        assertEquals(0, DriveFileMath.paddingFor(120, 100));
        assertEquals(30, DriveFileMath.paddingFor(70, 100));
    }
}
