package io.github.m777m44.mahdijym.account;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 8.0 — "Google Drive, no setup": your data in ONE file in your own Google Drive.
 *
 * The Drive API needs the app's signing key registered in a Google Cloud project; this needs
 * nothing. Android's own file picker (the Storage Access Framework) lets the user choose where
 * the file goes — Google Drive, or any other place: the phone, an SD card, another cloud app.
 * The app then keeps the right to rewrite that one file (a persisted URI permission, which
 * survives restarts and reboots), and Google Drive's app uploads every new version itself.
 *
 *   pick({ mode: 'create' | 'open', name })  the system picker → the file, now linked
 *   info()                                   { linked, name, size, modified, drive, place, canWrite, … }
 *   write({ data })                          replace the file's content → { savedAt, bytes, modified }
 *   read()                                   { data, …info }
 *   unlink()                                 forget the file (it stays where it is)
 *   driveApp()                               { installed } — is the Google Drive app on the phone?
 *
 * Error codes: CANCELLED (picker closed), NOT_LINKED, REVOKED (the permission is gone — e.g.
 * the app was reinstalled), MISSING (the file was deleted), IO (anything else), UNAVAILABLE.
 */
@CapacitorPlugin(name = "DriveFile")
public class DriveFilePlugin extends Plugin {
    private static final String PREFS = "mj_drivefile";
    private static final long MAX_READ = 48L * 1024 * 1024;
    private static final int RW = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private Uri linkedUri() {
        String s = prefs().getString("uri", null);
        return s == null || s.isEmpty() ? null : Uri.parse(s);
    }

    /** Do we still hold a persisted permission for this file? */
    private boolean holds(Uri uri, boolean write) {
        try {
            for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
                if (p.getUri().equals(uri) && (write ? p.isWritePermission() : p.isReadPermission())) return true;
            }
        } catch (RuntimeException ignored) { /* treat as not held */ }
        return false;
    }

    private void release(Uri uri) {
        ContentResolver cr = getContext().getContentResolver();
        try { cr.releasePersistableUriPermission(uri, RW); }
        catch (RuntimeException e) {
            try { cr.releasePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); }
            catch (RuntimeException ignored) { /* nothing held */ }
        }
    }

    /** Name, size and last change of the linked file, plus where it lives. Never throws. */
    private JSObject describe(Uri uri) {
        JSObject o = new JSObject();
        o.put("linked", uri != null);
        if (uri == null) return o;
        String authority = uri.getAuthority();
        o.put("uri", uri.toString());
        o.put("authority", authority == null ? "" : authority);
        o.put("drive", DriveFileMath.isGoogleDrive(authority));
        o.put("place", DriveFileMath.placeOf(authority));
        o.put("canWrite", holds(uri, true));
        o.put("canRead", holds(uri, false));
        String name = prefs().getString("name", null);
        long size = -1, modified = 0;
        boolean exists = true;
        Cursor c = null;
        try {
            // null projection: not every provider knows COLUMN_LAST_MODIFIED, and asking a
            // provider for a column it doesn't have throws on some of them
            c = getContext().getContentResolver().query(uri, null, null, null, null);
            if (c == null || !c.moveToFirst()) exists = false;
            else {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0 && !c.isNull(i)) name = c.getString(i);
                i = c.getColumnIndex(OpenableColumns.SIZE);
                if (i >= 0 && !c.isNull(i)) size = c.getLong(i);
                i = c.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED);
                if (i >= 0 && !c.isNull(i)) modified = c.getLong(i);
            }
        } catch (SecurityException e) {
            o.put("canRead", false);
            o.put("canWrite", false);
        } catch (RuntimeException e) {
            exists = false;
        } finally {
            if (c != null) c.close();
        }
        if (name != null) {
            o.put("name", name);
            prefs().edit().putString("name", name).apply();
        }
        o.put("exists", exists);
        o.put("size", size);
        o.put("modified", modified);
        o.put("savedAt", prefs().getLong("at", 0));
        return o;
    }

    private long lastModified(Uri uri) {
        Cursor c = null;
        try {
            c = getContext().getContentResolver().query(uri, null, null, null, null);
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED);
                if (i >= 0 && !c.isNull(i)) return c.getLong(i);
            }
        } catch (RuntimeException ignored) { /* unknown */ }
        finally { if (c != null) c.close(); }
        return 0;
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject o = new JSObject();
        o.put("available", true);   // the system picker exists on every supported Android (6+)
        call.resolve(o);
    }

    @PluginMethod
    public void driveApp(PluginCall call) {
        boolean installed;
        try {
            getContext().getPackageManager().getPackageInfo(DriveFileMath.DRIVE_PACKAGE, 0);
            installed = true;
        } catch (PackageManager.NameNotFoundException | RuntimeException e) {
            installed = false;
        }
        JSObject o = new JSObject();
        o.put("installed", installed);
        call.resolve(o);
    }

    @PluginMethod
    public void pick(PluginCall call) {
        String mode = call.getString("mode", "create");
        String name = call.getString("name", "MAHDI-JYM-backup.json");
        Intent i;
        if ("open".equals(mode)) {
            i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            i.putExtra(Intent.EXTRA_MIME_TYPES, new String[] { "application/json", "text/plain", "text/json", "application/octet-stream" });
        } else {
            i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("application/json");
            i.putExtra(Intent.EXTRA_TITLE, name);
        }
        i.addFlags(RW | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            startActivityForResult(call, i, "onPicked");
        } catch (ActivityNotFoundException e) {
            call.reject("No file picker on this phone", "UNAVAILABLE");
        }
    }

    @ActivityCallback
    private void onPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.reject("cancelled", "CANCELLED");
            return;
        }
        ContentResolver cr = getContext().getContentResolver();
        int granted = data.getFlags() & RW;
        boolean persisted = false;
        try {
            cr.takePersistableUriPermission(uri, granted != 0 ? granted : RW);
            persisted = true;
        } catch (SecurityException e) {
            try {
                cr.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                persisted = true;
            } catch (SecurityException ignored) { /* this run only */ }
        }
        Uri old = linkedUri();
        if (old != null && !old.equals(uri)) release(old);
        prefs().edit().putString("uri", uri.toString()).remove("name").putLong("size", 0).putLong("at", 0).apply();
        final boolean kept = persisted;
        io.execute(() -> {
            JSObject o = describe(uri);
            o.put("persisted", kept);
            call.resolve(o);
        });
    }

    @PluginMethod
    public void info(PluginCall call) {
        final Uri uri = linkedUri();
        if (uri == null) {
            JSObject o = new JSObject();
            o.put("linked", false);
            call.resolve(o);
            return;
        }
        io.execute(() -> call.resolve(describe(uri)));
    }

    @PluginMethod
    public void write(PluginCall call) {
        final String data = call.getString("data", null);
        if (data == null) { call.reject("No data", "IO"); return; }
        final Uri uri = linkedUri();
        if (uri == null) { call.reject("No file linked", "NOT_LINKED"); return; }
        io.execute(() -> {
            byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
            ContentResolver cr = getContext().getContentResolver();
            long prev = prefs().getLong("size", 0);
            OutputStream os = null;
            try {
                boolean truncates = true;
                try { os = cr.openOutputStream(uri, "wt"); }
                catch (FileNotFoundException | IllegalArgumentException | UnsupportedOperationException e) { os = null; }
                if (os == null) {
                    // Some providers refuse "wt": plain "w" writes from the start without
                    // truncating, so whatever is past the new end is blanked (JSON allows it).
                    truncates = false;
                    os = cr.openOutputStream(uri, "w");
                }
                if (os == null) throw new FileNotFoundException("no output stream");
                os.write(bytes);
                long size = bytes.length;
                long pad = truncates ? 0 : DriveFileMath.paddingFor(bytes.length, prev);
                if (pad > 0) {
                    byte[] sp = new byte[(int) Math.min(pad, 65536)];
                    Arrays.fill(sp, (byte) ' ');
                    long left = pad;
                    while (left > 0) {
                        int n = (int) Math.min(left, sp.length);
                        os.write(sp, 0, n);
                        left -= n;
                    }
                    size += pad;
                }
                os.flush();
                os.close();
                os = null;
                long now = System.currentTimeMillis();
                prefs().edit().putLong("size", size).putLong("at", now).apply();
                JSObject o = new JSObject();
                o.put("savedAt", now);
                o.put("bytes", bytes.length);
                o.put("modified", lastModified(uri));
                call.resolve(o);
            } catch (SecurityException e) {
                call.reject("The permission to this file is gone", "REVOKED");
            } catch (FileNotFoundException e) {
                call.reject("The file is gone", "MISSING");
            } catch (IOException | RuntimeException e) {
                call.reject(e.getMessage() == null ? "Could not write the file" : e.getMessage(), "IO");
            } finally {
                if (os != null) { try { os.close(); } catch (IOException ignored) { /* already failed */ } }
            }
        });
    }

    @PluginMethod
    public void read(PluginCall call) {
        final Uri uri = linkedUri();
        if (uri == null) { call.reject("No file linked", "NOT_LINKED"); return; }
        io.execute(() -> {
            InputStream in = null;
            try {
                in = getContext().getContentResolver().openInputStream(uri);
                if (in == null) throw new FileNotFoundException("no input stream");
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                byte[] b = new byte[65536];
                long total = 0;
                int n;
                while ((n = in.read(b)) > 0) {
                    total += n;
                    if (total > MAX_READ) throw new IOException("The file is too big");
                    buf.write(b, 0, n);
                }
                JSObject o = describe(uri);
                o.put("data", new String(buf.toByteArray(), StandardCharsets.UTF_8));
                call.resolve(o);
            } catch (SecurityException e) {
                call.reject("The permission to this file is gone", "REVOKED");
            } catch (FileNotFoundException e) {
                call.reject("The file is gone", "MISSING");
            } catch (IOException | RuntimeException e) {
                call.reject(e.getMessage() == null ? "Could not read the file" : e.getMessage(), "IO");
            } finally {
                if (in != null) { try { in.close(); } catch (IOException ignored) { /* read already done */ } }
            }
        });
    }

    @PluginMethod
    public void unlink(PluginCall call) {
        Uri uri = linkedUri();
        prefs().edit().clear().apply();
        if (uri != null) release(uri);
        call.resolve();
    }
}
