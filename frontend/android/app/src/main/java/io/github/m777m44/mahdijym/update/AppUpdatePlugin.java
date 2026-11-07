package io.github.m777m44.mahdijym.update;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 17.0 — the in-app update of the APK (lib/apkUpdate.js): the new release downloads inside the app,
 * with its progress, is checked, and Android's own installer opens over it — the same signature, so
 * it installs as an update and all the data stays.
 *
 *   download({ url, version, size, sha256 })  resolves { path, size, sha256 } — the APK in the app's
 *                       cache (cache/updates/). "progress" events { done, total } on the way (every
 *                       120 ms). GitHub's redirect to its file servers is followed; a download that
 *                       stopped goes on from where it was (HTTP Range). Checked against the size and,
 *                       when GitHub gives it, the SHA-256. Rejects with code CANCELLED, NETWORK,
 *                       HTTP_<n>, SIZE, CHECKSUM or SPACE.
 *   cancel()           stops a download (the part already downloaded stays for next time)
 *   canInstall()       { allowed } — "Install unknown apps" is on for this app (always on before Android 8)
 *   openInstallSettings()  that switch, in the phone's settings
 *   install({ path })  opens the installer with the APK
 *   cleanup({ keep })  removes the downloaded APKs (all but `keep`, a file name)
 *   info()             { versionName, versionCode, packageName, sdk }
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private volatile boolean cancelled = false;
    private volatile HttpURLConnection current = null;
    private volatile boolean busy = false;

    private File updatesDir() {
        File d = new File(getContext().getCacheDir(), "updates");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    @PluginMethod
    public void download(PluginCall call) {
        final String url = call.getString("url", "");
        final String version = call.getString("version", "");
        final long size = call.getData().optLong("size", 0);
        final String sha = UpdateMath.digestHex(call.getString("sha256", null));
        if (url == null || !url.startsWith("https://")) { call.reject("Not an https address", "BAD_URL"); return; }
        if (busy) { call.reject("A download is already running", "BUSY"); return; }
        busy = true;
        cancelled = false;
        worker.execute(() -> {
            try {
                File out = run(url, version, size, sha);
                JSObject o = new JSObject();
                o.put("path", out.getAbsolutePath());
                o.put("size", out.length());
                o.put("sha256", sha == null ? sha256Of(out) : sha);
                call.resolve(o);
            } catch (Fail f) {
                call.reject(f.getMessage(), f.code);
            } catch (Exception e) {
                call.reject(cancelled ? "Cancelled" : String.valueOf(e.getMessage()), cancelled ? "CANCELLED" : "NETWORK");
            } finally {
                busy = false;
                current = null;
            }
        });
    }

    /** A failure with its code for the web side. */
    private static final class Fail extends Exception {
        final String code;
        Fail(String code, String msg) { super(msg); this.code = code; }
    }

    private File run(String url, String version, long size, String sha) throws Exception {
        Context ctx = getContext();
        File dir = updatesDir();
        String name = UpdateMath.apkName(version, ctx.getPackageName());
        File out = new File(dir, name);
        File part = new File(dir, name + ".part");
        // downloaded before and still whole: nothing to fetch
        if (out.exists() && (size <= 0 || out.length() == size) && (sha == null || sha.equals(sha256Of(out)))) {
            emit(out.length(), out.length());
            return out;
        }
        if (out.exists()) out.delete();
        long have = UpdateMath.resumeFrom(part.exists() ? part.length() : 0, size);
        if (have == 0 && part.exists()) part.delete();
        if (!UpdateMath.enoughSpace(dir.getUsableSpace(), size > 0 ? size - have : 0)) throw new Fail("SPACE", "Not enough space");

        HttpURLConnection c = open(url, have);
        int code = c.getResponseCode();
        if (code == 416 && have > 0) {           // nothing left to send: the part may be the whole file
            c.disconnect();
            if (size > 0 && have == size) return finish(part, out, size, sha);
            part.delete();
            have = 0;
            c = open(url, 0);
            code = c.getResponseCode();
        }
        if (code != 200 && code != 206) { c.disconnect(); throw new Fail("HTTP_" + code, "HTTP " + code); }
        boolean resumed = code == 206 && have > 0;
        if (!resumed) have = 0;
        long total = UpdateMath.totalOf(size, resumed, have, lengthOf(c));

        MessageDigest md = MessageDigest.getInstance("SHA-256");
        if (resumed) feed(md, part);
        long done = have;
        long last = 0;
        emit(done, total);
        try (InputStream in = new BufferedInputStream(c.getInputStream(), 64 * 1024);
             OutputStream fo = new FileOutputStream(part, resumed)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) != -1) {
                if (cancelled) throw new Fail("CANCELLED", "Cancelled");
                fo.write(buf, 0, n);
                md.update(buf, 0, n);
                done += n;
                long now = SystemClock.uptimeMillis();
                if (UpdateMath.shouldEmit(last, now, done, total)) { emit(done, total); last = now; }
            }
        } catch (IOException e) {
            if (cancelled) throw new Fail("CANCELLED", "Cancelled");
            throw new Fail("NETWORK", String.valueOf(e.getMessage()));
        } finally {
            c.disconnect();
        }
        if (cancelled) throw new Fail("CANCELLED", "Cancelled");
        emit(done, total > 0 ? total : done);
        if (size > 0 && part.length() != size) {
            if (part.length() > size) part.delete();
            throw new Fail("SIZE", "The file is " + part.length() + " bytes, not " + size);
        }
        String got = UpdateMath.hex(md.digest());
        if (sha != null && !sha.equals(got)) { part.delete(); throw new Fail("CHECKSUM", "The file is not the one GitHub published"); }
        if (!part.renameTo(out)) throw new Fail("SPACE", "Could not keep the file");
        return out;
    }

    private File finish(File part, File out, long size, String sha) throws Exception {
        if (sha != null && !sha.equals(sha256Of(part))) { part.delete(); throw new Fail("CHECKSUM", "The file is not the one GitHub published"); }
        if (!part.renameTo(out)) throw new Fail("SPACE", "Could not keep the file");
        emit(size, size);
        return out;
    }

    /** GET with redirects followed by hand (github.com → its file servers), from byte `from`. */
    private HttpURLConnection open(String url, long from) throws Exception {
        String at = url;
        for (int i = 0; i <= UpdateMath.MAX_REDIRECTS; i++) {
            if (cancelled) throw new Fail("CANCELLED", "Cancelled");
            HttpURLConnection c = (HttpURLConnection) new URL(at).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(20000);
            c.setReadTimeout(30000);
            c.setRequestProperty("User-Agent", "MAHDI-JYM-Android");
            c.setRequestProperty("Accept", "application/octet-stream");
            c.setRequestProperty("Accept-Encoding", "identity");
            if (from > 0) c.setRequestProperty("Range", "bytes=" + from + "-");
            current = c;
            int code = c.getResponseCode();
            if (UpdateMath.isRedirect(code)) {
                String next = c.getHeaderField("Location");
                c.disconnect();
                if (next == null) throw new Fail("NETWORK", "Redirect without a place");
                at = new URL(new URL(at), next).toString();
                if (!at.startsWith("https://")) throw new Fail("BAD_URL", "Redirected away from https");
                continue;
            }
            return c;
        }
        throw new Fail("NETWORK", "Too many redirects");
    }

    /** Content-Length (getContentLengthLong needs Android 7; the app runs from 6). */
    private static long lengthOf(HttpURLConnection c) {
        try {
            String h = c.getHeaderField("Content-Length");
            return h == null ? -1 : Long.parseLong(h.trim());
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private void emit(long done, long total) {
        JSObject o = new JSObject();
        o.put("done", done);
        o.put("total", total);
        notifyListeners("progress", o);
    }

    private static void feed(MessageDigest md, File f) throws IOException {
        try (InputStream in = new FileInputStream(f)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) != -1) md.update(buf, 0, n);
        }
    }

    private static String sha256Of(File f) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            feed(md, f);
            return UpdateMath.hex(md.digest());
        } catch (IOException | NoSuchAlgorithmException e) {
            return "";
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        cancelled = true;
        HttpURLConnection c = current;
        if (c != null) {
            // disconnect off the main thread: it may wait on the network
            new Thread(() -> { try { c.disconnect(); } catch (RuntimeException ignored) { } }).start();
        }
        call.resolve();
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean ok = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try { ok = getContext().getPackageManager().canRequestPackageInstalls(); } catch (RuntimeException e) { ok = false; }
        }
        JSObject o = new JSObject();
        o.put("allowed", ok);
        call.resolve(o);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        Activity act = getActivity();
        if (act == null) { call.reject("No screen", "UNAVAILABLE"); return; }
        try {
            Intent i = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + act.getPackageName()))
                    : new Intent(Settings.ACTION_SECURITY_SETTINGS);
            act.startActivity(i);
            call.resolve();
        } catch (RuntimeException e) {
            try { act.startActivity(new Intent(Settings.ACTION_SETTINGS)); call.resolve(); }
            catch (RuntimeException e2) { call.reject("Could not open the settings", "UNAVAILABLE"); }
        }
    }

    @PluginMethod
    public void install(PluginCall call) {
        Activity act = getActivity();
        String path = call.getString("path", "");
        if (act == null) { call.reject("No screen", "UNAVAILABLE"); return; }
        File f = path == null ? null : new File(path);
        File dir = updatesDir();
        if (f == null || !f.exists() || !dir.equals(f.getParentFile())) { call.reject("The update is not downloaded", "MISSING"); return; }
        try {
            Uri uri;
            Intent i = new Intent(Intent.ACTION_VIEW);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                uri = FileProvider.getUriForFile(act, act.getPackageName() + ".fileprovider", f);
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                // Android 6: the installer can't read the app's cache — hand it a readable copy
                File ext = act.getExternalFilesDir(null);
                if (ext == null) { call.reject("No storage for the installer", "UNAVAILABLE"); return; }
                File copy = new File(ext, f.getName());
                copyFile(f, copy);
                copy.setReadable(true, false);
                uri = Uri.fromFile(copy);
            }
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            act.startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the installer", "INSTALL");
        }
    }

    private static void copyFile(File from, File to) throws IOException {
        try (InputStream in = new FileInputStream(from); OutputStream out = new FileOutputStream(to)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
        }
    }

    @PluginMethod
    public void cleanup(PluginCall call) {
        String keep = call.getString("keep", "");
        int removed = 0;
        if (!busy) {
            File[] files = updatesDir().listFiles();
            if (files != null) for (File f : files) {
                if (keep != null && !keep.isEmpty() && f.getName().equals(keep)) continue;
                if (f.delete()) removed++;
            }
            File ext = getContext().getExternalFilesDir(null);
            File[] old = ext == null ? null : ext.listFiles((d, n) -> n.startsWith("MAHDI-JYM-") && n.endsWith(".apk"));
            if (old != null) for (File f : old) if (f.delete()) removed++;
        }
        JSObject o = new JSObject();
        o.put("removed", removed);
        call.resolve(o);
    }

    @PluginMethod
    public void info(PluginCall call) {
        JSObject o = new JSObject();
        Context ctx = getContext();
        o.put("packageName", ctx.getPackageName());
        o.put("sdk", Build.VERSION.SDK_INT);
        try {
            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            o.put("versionName", pi.versionName);
            o.put("versionCode", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? pi.getLongVersionCode() : (long) pi.versionCode);
        } catch (Exception e) {
            o.put("versionName", "");
            o.put("versionCode", 0);
        }
        call.resolve(o);
    }
}
