package io.github.m777m44.mahdijym.account;

import android.app.backup.BackupAgentHelper;
import android.app.backup.BackupDataInput;
import android.app.backup.BackupDataOutput;
import android.app.backup.FileBackupHelper;
import android.os.ParcelFileDescriptor;

import java.io.IOException;

/**
 * Android Backup for MAHDI-JYM (2.8): backs up files/mj-backup.json — the copy of your data
 * that lib/cloud.js writes while you're signed in with Google — to the phone's Google account
 * through Android's own backup service, and puts it back when the app is installed again or
 * on a new phone. Needs no Google Cloud project and no key.
 *
 * Only this one file is backed up (not the WebView storage, not the step-counter state), and
 * it's restored only into an empty app: the web layer reads it on first launch.
 */
public class MjBackupAgent extends BackupAgentHelper {
    /** Held while the file is replaced or backed up, so a backup never reads half a file. */
    static final Object LOCK = new Object();
    private static final String KEY = "mj_data";

    @Override
    public void onCreate() {
        addHelper(KEY, new FileBackupHelper(this, GoogleAccountPlugin.BACKUP_FILE));
    }

    @Override
    public void onBackup(ParcelFileDescriptor oldState, BackupDataOutput data, ParcelFileDescriptor newState) throws IOException {
        synchronized (LOCK) { super.onBackup(oldState, data, newState); }
    }

    @Override
    public void onRestore(BackupDataInput data, int appVersionCode, ParcelFileDescriptor newState) throws IOException {
        synchronized (LOCK) { super.onRestore(data, appVersionCode, newState); }
    }
}
