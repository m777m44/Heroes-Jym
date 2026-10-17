package io.github.m777m44.mahdijym.lock;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 4.0 — lock the app with the phone's own screen lock: fingerprint / face, or the PIN, pattern
 * or password as the fallback (BIOMETRIC_WEAK | DEVICE_CREDENTIAL, supported by androidx.biometric
 * on every Android version the app runs on). Because the phone's PIN always works, nobody can be
 * locked out of their own data. The app never sees or stores any of it.
 *
 *   available()                    { available, biometric, status }
 *   authenticate({ title, subtitle })  resolves { ok: true }; rejects with the BiometricPrompt
 *                                  error code as `code` (10 / 5 cancelled, 7 / 9 lockout,
 *                                  11 / 12 / 14 nothing to unlock with, …)
 */
@CapacitorPlugin(name = "AppLock")
public class AppLockPlugin extends Plugin {
    private static final int AUTH = BiometricManager.Authenticators.BIOMETRIC_WEAK
            | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject o = new JSObject();
        try {
            BiometricManager bm = BiometricManager.from(getContext());
            int r = bm.canAuthenticate(AUTH);
            int bio = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
            o.put("available", r == BiometricManager.BIOMETRIC_SUCCESS);
            o.put("biometric", bio == BiometricManager.BIOMETRIC_SUCCESS);
            o.put("status", r);
        } catch (RuntimeException e) {
            o.put("available", false);
            o.put("biometric", false);
            o.put("status", -1);
        }
        call.resolve(o);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        final FragmentActivity act = getActivity();
        if (act == null || act.isFinishing()) { call.reject("No screen to show the lock on", "UNAVAILABLE"); return; }
        final String title = call.getString("title", "MAHDI-JYM");
        final String subtitle = call.getString("subtitle", null);
        act.runOnUiThread(() -> {
            try {
                BiometricPrompt.PromptInfo.Builder b = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setAllowedAuthenticators(AUTH);    // with DEVICE_CREDENTIAL: no negative button
                if (subtitle != null && !subtitle.isEmpty()) b.setSubtitle(subtitle);
                BiometricPrompt prompt = new BiometricPrompt(act, ContextCompat.getMainExecutor(getContext()),
                        new BiometricPrompt.AuthenticationCallback() {
                            private boolean done = false;
                            @Override public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                if (done) return;
                                done = true;
                                JSObject o = new JSObject();
                                o.put("ok", true);
                                call.resolve(o);
                            }
                            @Override public void onAuthenticationError(int code, @NonNull CharSequence msg) {
                                if (done) return;
                                done = true;
                                call.reject(String.valueOf(msg), String.valueOf(code));
                            }
                            // onAuthenticationFailed = one finger not recognised; the prompt stays open
                        });
                prompt.authenticate(b.build());
            } catch (RuntimeException e) {
                call.reject("Could not open the lock screen", "UNAVAILABLE");
            }
        });
    }
}
