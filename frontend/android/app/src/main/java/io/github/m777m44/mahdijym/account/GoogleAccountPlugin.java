package io.github.m777m44.mahdijym.account;

import android.accounts.Account;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

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
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Sign in with Google (2.6) — Google's own account chooser lists the Google accounts already
 * on the phone; pick one and you're in, no password. The app then keeps a copy of everything
 * in that account's Google Drive, in the private app-data folder only this app can see
 * (scope drive.appdata — not the user's files). The web layer (lib/cloud.js) does the Drive
 * calls with the access token this plugin hands out.
 *
 *   isAvailable()        { available }  Google Play services present and current
 *   current()            the signed-in account, or { signedIn: false }
 *   signIn()             the account chooser → the account
 *   getToken({ stale })  an OAuth access token for drive.appdata (`stale` is cleared first)
 *   signOut()            forget the account on this phone (the Drive copy stays)
 *   disconnect()         sign out and revoke this app's access to the account
 *
 * Errors carry Google's status code as the call's code: "12501" cancelled, "10" the app
 * isn't registered for this signing key yet (see docs/GOOGLE_SIGN_IN.md), "7" no network.
 *
 * Uses the GoogleSignIn client of play-services-auth: it needs only the package name and
 * the signing certificate registered in a Google Cloud project — no client id in the app.
 */
@SuppressWarnings("deprecation")
@CapacitorPlugin(name = "GoogleAccount")
public class GoogleAccountPlugin extends Plugin {
    static final String SCOPE_DRIVE = "https://www.googleapis.com/auth/drive.appdata";
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    private GoogleSignInClient client() {
        GoogleSignInOptions o = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestProfile()
            .requestScopes(new Scope(SCOPE_DRIVE))
            .build();
        return GoogleSignIn.getClient(getContext(), o);
    }

    private static JSObject accountJson(GoogleSignInAccount a) {
        JSObject o = new JSObject();
        if (a == null) { o.put("signedIn", false); return o; }
        o.put("signedIn", true);
        o.put("email", a.getEmail());
        o.put("name", a.getDisplayName());
        o.put("givenName", a.getGivenName());
        o.put("id", a.getId());
        Uri photo = a.getPhotoUrl();
        o.put("photo", photo == null ? null : photo.toString());
        o.put("drive", GoogleSignIn.hasPermissions(a, new Scope(SCOPE_DRIVE)));
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
    public void current(PluginCall call) {
        try { call.resolve(accountJson(GoogleSignIn.getLastSignedInAccount(getContext()))); }
        catch (RuntimeException e) { call.resolve(accountJson(null)); }
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        final GoogleSignInClient c;
        try { c = client(); }
        catch (RuntimeException e) { call.reject("Google Play services unavailable", "UNAVAILABLE"); return; }
        // Sign out of a cached account first, so the chooser always shows every account —
        // but never wait on it for long: the chooser opens after 1.5 s whatever happens.
        final AtomicBoolean opened = new AtomicBoolean(false);
        final Runnable open = () -> {
            if (!opened.compareAndSet(false, true)) return;
            try { startActivityForResult(call, c.getSignInIntent(), "onSignIn"); }
            catch (RuntimeException e) { call.reject("Could not open the account chooser", "UNAVAILABLE"); }
        };
        final Handler main = new Handler(Looper.getMainLooper());
        main.postDelayed(open, 1500);
        try { c.signOut().addOnCompleteListener(t -> main.post(open)); }
        catch (RuntimeException e) { main.post(open); }
    }

    @ActivityCallback
    private void onSignIn(PluginCall call, ActivityResult result) {
        if (call == null) return;
        try {
            Intent data = result.getData();
            // Back pressed in the chooser without an answer from Google: a plain cancel.
            if (data == null && result.getResultCode() != Activity.RESULT_OK) { call.reject("Sign-in cancelled", "12501"); return; }
            GoogleSignInAccount a = GoogleSignIn.getSignedInAccountFromIntent(data).getResult(ApiException.class);
            call.resolve(accountJson(a));
        } catch (ApiException e) {
            call.reject("Google sign-in failed (" + e.getStatusCode() + ")", String.valueOf(e.getStatusCode()));
        } catch (RuntimeException e) {
            call.reject("Google sign-in failed", "12500");
        }
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        GoogleSignInAccount a;
        try { a = GoogleSignIn.getLastSignedInAccount(getContext()); }
        catch (RuntimeException e) { a = null; }
        final Account acc = a == null ? null : a.getAccount();
        if (acc == null) { call.reject("Not signed in", "SIGNED_OUT"); return; }
        final String stale = call.getString("stale", null);
        io.execute(() -> fetchToken(call, acc, stale, true));
    }

    /** On the worker thread: a token, or the consent screen when Google asks for it. */
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
            call.reject(e.getMessage() == null ? "Google sign-in failed" : e.getMessage(), "AUTH");
        } catch (RuntimeException e) {
            call.reject("Google sign-in failed", "AUTH");
        }
    }

    @ActivityCallback
    private void onConsent(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) { call.reject("Access to Google Drive not granted", "CONSENT"); return; }
        GoogleSignInAccount a;
        try { a = GoogleSignIn.getLastSignedInAccount(getContext()); }
        catch (RuntimeException e) { a = null; }
        final Account acc = a == null ? null : a.getAccount();
        if (acc == null) { call.reject("Not signed in", "SIGNED_OUT"); return; }
        io.execute(() -> fetchToken(call, acc, null, false));
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        try {
            client().signOut().addOnCompleteListener(t -> call.resolve());
        } catch (RuntimeException e) { call.resolve(); }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        try {
            GoogleSignInClient c = client();
            c.revokeAccess().addOnCompleteListener(t -> c.signOut().addOnCompleteListener(t2 -> call.resolve()));
        } catch (RuntimeException e) { call.resolve(); }
    }

    @Override
    protected void handleOnDestroy() {
        io.shutdown();
        super.handleOnDestroy();
    }
}
