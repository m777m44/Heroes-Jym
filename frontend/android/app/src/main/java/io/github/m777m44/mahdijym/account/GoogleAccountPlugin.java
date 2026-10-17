package io.github.m777m44.mahdijym.account;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.app.backup.BackupManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The Google account (2.8). Signing in uses ANDROID'S OWN account chooser: it lists the Google
 * accounts already on the phone; pick one, no password. That works on every install and needs
 * no Google Cloud project, so signing in itself can no longer fail with "not set up".
 *
 * Saving goes two ways:
 *   1. Android Backup (always, no setup): a copy of the data in files/mj-backup.json, backed up
 *      by Android's backup service to the phone's Google account (MjBackupAgent) and restored
 *      automatically when MAHDI-JYM is installed again or on a new phone.
 *   2. Google Drive (when the app's signing key is registered — docs/GOOGLE_SIGN_IN.md): the
 *      private app-data folder, synced within seconds. lib/cloud.js retries it now and then and
 *      switches over by itself once it works.
 *
 *   isAvailable()             { available }  Google Play services present and current
 *   current()                 the chosen account, or { signedIn: false }
 *   signIn()                  the account chooser → { signedIn, email }
 *   getToken({ stale, ask, email })  a drive.appdata token; ask=false never shows a screen
 *   signOut() / disconnect()  forget the account here (disconnect also drops the token)
 *   saveBackup({ data })      write the backup copy and tell Android it changed
 *   readBackup()              { data, savedAt } — data is null when there is none
 *   clearBackup()             delete the backup copy
 *
 * Error codes: "12501" cancelled, "10" Drive isn't registered for this signing key,
 * "7" no network, "CONSENT" Drive access declined, "AUTH" anything else from Google.
 */
@SuppressWarnings("deprecation")
@CapacitorPlugin(name = "GoogleAccount")
public class GoogleAccountPlugin extends Plugin {
    static final String SCOPE_DRIVE = "https://www.googleapis.com/auth/drive.appdata";
    static final String BACKUP_FILE = "mj-backup.json";
    private static final String PREFS = "mj_account";
    private static final String TYPE_GOOGLE = "com.google";
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    private SharedPreferences prefs() { return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private Account chosen() {
        String name = prefs().getString("email", null);
        return name == null || name.isEmpty() ? null : new Account(name, TYPE_GOOGLE);
    }

    private static JSObject accountJson(Account a) {
        JSObject o = new JSObject();
        o.put("signedIn", a != null);
        if (a != null) {
            o.put("email", a.name);
            int at = a.name.indexOf('@');
            o.put("name", at > 0 ? a.name.substring(0, at) : a.name);
        }
        return o;
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject o = new JSObject();
        int r;
        try { r = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(getContext()); }
        catch (RuntimeException e) { r = ConnectionResult.SERVICE_MISSING; }
        o.put("available", r == ConnectionResult.SUCCESS);
        o.put("status", r);
        call.resolve(o);
    }

    @PluginMethod
    public void current(PluginCall call) { call.resolve(accountJson(chosen())); }

    /**
     * 4.1 — what Google Cloud has to match, read from THIS installed app: the package name and the
     * SHA-1 of the certificate the APK was signed with (the value for the Android OAuth client),
     * plus Google Play services and the chosen account. Settings → Backups → Google check.
     */
    @PluginMethod
    public void diagnostics(PluginCall call) {
        JSObject o = new JSObject();
        Context c = getContext();
        o.put("package", c.getPackageName());
        o.put("sha1", signingSha1(c));
        int r;
        try { r = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(c); }
        catch (RuntimeException e) { r = ConnectionResult.SERVICE_MISSING; }
        o.put("play", r);
        o.put("playOk", r == ConnectionResult.SUCCESS);
        Account a = chosen();
        if (a != null) o.put("email", a.name);
        call.resolve(o);
    }

    @SuppressWarnings("deprecation")
    private static String signingSha1(Context c) {
        try {
            PackageManager pm = c.getPackageManager();
            Signature[] sigs;
            if (Build.VERSION.SDK_INT >= 28) {
                PackageInfo pi = pm.getPackageInfo(c.getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
                SigningInfo si = pi.signingInfo;
                if (si == null) return "";
                sigs = si.hasMultipleSigners() ? si.getApkContentsSigners() : si.getSigningCertificateHistory();
            } else {
                PackageInfo pi = pm.getPackageInfo(c.getPackageName(), PackageManager.GET_SIGNATURES);
                sigs = pi.signatures;
            }
            if (sigs == null || sigs.length == 0) return "";
            // with key rotation the history runs oldest → current; without it there is just one
            byte[] d = MessageDigest.getInstance("SHA-1").digest(sigs[sigs.length - 1].toByteArray());
            StringBuilder b = new StringBuilder();
            for (int i = 0; i < d.length; i++) {
                if (i > 0) b.append(':');
                b.append(String.format(Locale.US, "%02X", d[i] & 0xff));
            }
            return b.toString();
        } catch (Exception e) {
            return "";
        }
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        Intent pick;
        try {
            pick = AccountManager.newChooseAccountIntent(null, null, new String[] { TYPE_GOOGLE },
                null, null, null, null);
        } catch (RuntimeException e) { call.reject("Could not open the account chooser", "UNAVAILABLE"); return; }
        try { startActivityForResult(call, pick, "onPicked"); }
        catch (RuntimeException e) { call.reject("Could not open the account chooser", "UNAVAILABLE"); }
    }

    @ActivityCallback
    private void onPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        String name = data == null ? null : data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
        if (result.getResultCode() != Activity.RESULT_OK || name == null || name.isEmpty()) {
            call.reject("Sign-in cancelled", "12501");
            return;
        }
        prefs().edit().putString("email", name).apply();
        call.resolve(accountJson(new Account(name, TYPE_GOOGLE)));
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        // After a reinstall the app's own memory of the account is gone but the restored data
        // still names it: the web layer passes the email along.
        Account acc = chosen();
        String email = call.getString("email", null);
        if (acc == null && email != null && !email.isEmpty()) {
            acc = new Account(email, TYPE_GOOGLE);
            prefs().edit().putString("email", email).apply();
        }
        if (acc == null) { call.reject("Not signed in", "SIGNED_OUT"); return; }
        final Account account = acc;
        final String stale = call.getString("stale", null);
        final boolean ask = Boolean.TRUE.equals(call.getBoolean("ask", true));
        io.execute(() -> fetchToken(call, account, stale, ask));
    }

    /** On the worker thread: a token, or (ask) the consent screen when Google wants one. */
    private void fetchToken(PluginCall call, Account acc, String stale, boolean mayAsk) {
        try {
            if (stale != null && !stale.isEmpty()) {
                try { GoogleAuthUtil.clearToken(getContext(), stale); } catch (Exception ignored) { }
            }
            String token = GoogleAuthUtil.getToken(getContext(), acc, "oauth2:" + SCOPE_DRIVE);
            JSObject o = new JSObject();
            o.put("token", token);
            o.put("email", acc.name);
            call.resolve(o);
        } catch (UserRecoverableAuthException e) {
            Intent fix = e.getIntent();
            Activity act = getActivity();
            if (!mayAsk || fix == null || act == null) { call.reject("Access to Google Drive not granted", "CONSENT"); return; }
            act.runOnUiThread(() -> {
                try { startActivityForResult(call, fix, "onConsent"); }
                catch (RuntimeException ex) { call.reject("Access to Google Drive not granted", "CONSENT"); }
            });
        } catch (IOException e) {
            call.reject("No connection to Google", "7");
        } catch (GoogleAuthException e) {
            // An unregistered package / signing key comes back as e.g. UNREGISTERED_ON_API_CONSOLE.
            String m = e.getMessage() == null ? "" : e.getMessage();
            boolean setup = m.contains("UNREGISTERED") || m.contains("INVALID") || m.contains("DEVELOPER") || m.contains("API_CONSOLE");
            call.reject(m.isEmpty() ? "Google refused the token" : m, setup ? "10" : "AUTH");
        } catch (RuntimeException e) {
            call.reject("Google sign-in failed", "AUTH");
        }
    }

    @ActivityCallback
    private void onConsent(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) { call.reject("Access to Google Drive not granted", "CONSENT"); return; }
        final Account acc = chosen();
        if (acc == null) { call.reject("Not signed in", "SIGNED_OUT"); return; }
        io.execute(() -> fetchToken(call, acc, null, false));
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        prefs().edit().remove("email").apply();
        call.resolve();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        final Account acc = chosen();
        prefs().edit().remove("email").apply();
        if (acc == null) { call.resolve(); return; }
        io.execute(() -> {
            // Drop the cached Drive token too; a token we can't get is simply not there.
            try {
                String tok = GoogleAuthUtil.getToken(getContext(), acc, "oauth2:" + SCOPE_DRIVE);
                GoogleAuthUtil.clearToken(getContext(), tok);
            } catch (Exception ignored) { }
            call.resolve();
        });
    }

    // ---- the Android Backup copy ------------------------------------------------------------

    @PluginMethod
    public void saveBackup(PluginCall call) {
        final String data = call.getString("data", null);
        if (data == null) { call.reject("No data"); return; }
        io.execute(() -> {
            Context c = getContext();
            File dir = c.getFilesDir();
            File tmp = new File(dir, BACKUP_FILE + ".tmp");
            File out = new File(dir, BACKUP_FILE);
            try (FileOutputStream f = new FileOutputStream(tmp)) {
                f.write(data.getBytes(StandardCharsets.UTF_8));
                f.getFD().sync();
            } catch (IOException e) { call.reject("Could not write the backup", "IO"); return; }
            synchronized (MjBackupAgent.LOCK) {
                if (!tmp.renameTo(out)) { tmp.delete(); call.reject("Could not write the backup", "IO"); return; }
            }
            try { new BackupManager(c).dataChanged(); } catch (RuntimeException ignored) { }
            JSObject o = new JSObject();
            o.put("savedAt", out.lastModified());
            o.put("bytes", out.length());
            call.resolve(o);
        });
    }

    @PluginMethod
    public void readBackup(PluginCall call) {
        io.execute(() -> {
            File f = new File(getContext().getFilesDir(), BACKUP_FILE);
            JSObject o = new JSObject();
            if (!f.isFile()) { o.put("data", null); call.resolve(o); return; }
            try (InputStream in = new FileInputStream(f)) {
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                byte[] b = new byte[16384];
                int n;
                while ((n = in.read(b)) > 0) buf.write(b, 0, n);
                o.put("data", new String(buf.toByteArray(), StandardCharsets.UTF_8));
                o.put("savedAt", f.lastModified());
                call.resolve(o);
            } catch (IOException e) { o.put("data", null); call.resolve(o); }
        });
    }

    @PluginMethod
    public void clearBackup(PluginCall call) {
        io.execute(() -> {
            synchronized (MjBackupAgent.LOCK) { new File(getContext().getFilesDir(), BACKUP_FILE).delete(); }
            try { new BackupManager(getContext()).dataChanged(); } catch (RuntimeException ignored) { }
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        io.shutdown();
        super.handleOnDestroy();
    }
}
