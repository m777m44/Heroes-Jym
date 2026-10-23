package io.github.m777m44.mahdijym;

import android.os.Bundle;
import android.os.SystemClock;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

import io.github.m777m44.mahdijym.account.DriveFilePlugin;
import io.github.m777m44.mahdijym.account.GoogleAccountPlugin;
import io.github.m777m44.mahdijym.lock.AppLockPlugin;
import io.github.m777m44.mahdijym.steps.StepServicePlugin;

public class MainActivity extends BridgeActivity {
    /** Two presses of Back within this time leave the app. */
    private static final long EXIT_WINDOW_MS = 2000;
    private long lastBack = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // In-app plugins must be registered before the bridge starts.
        registerPlugin(StepServicePlugin.class);
        registerPlugin(GoogleAccountPlugin.class);
        registerPlugin(DriveFilePlugin.class);       // 8.0: Google Drive with no setup
        registerPlugin(AppLockPlugin.class);
        super.onCreate(savedInstanceState);

        // 2.7.0 — Back no longer closes the app at once. The web app decides first (close a
        // sheet, go back a screen, go Home); on Home the first press shows "Press back again
        // to exit" and only a second press within 2 s leaves. See lib/backButton.js.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { onBack(); }
        });
    }

    private void onBack() {
        WebView wv = bridge == null ? null : bridge.getWebView();
        if (wv == null) { pressTwice(); return; }
        try {
            wv.evaluateJavascript("(function(){try{return window.mjBack?window.mjBack():'none'}catch(e){return 'none'}})()",
                value -> {
                    String r = value == null ? "" : value.replace("\"", "");
                    if ("handled".equals(r) || "armed".equals(r)) return;
                    if ("exit".equals(r)) { leave(); return; }
                    // No answer from the page (still loading): the same rule, natively.
                    if (wv.canGoBack()) { wv.goBack(); return; }
                    pressTwice();
                });
        } catch (RuntimeException e) { pressTwice(); }
    }

    private void pressTwice() {
        long now = SystemClock.uptimeMillis();
        if (now - lastBack < EXIT_WINDOW_MS) { leave(); return; }
        lastBack = now;
        Toast.makeText(this, R.string.back_again, Toast.LENGTH_SHORT).show();
    }

    /** Leave the app. The step counter is a foreground service and keeps running. */
    private void leave() {
        lastBack = 0;
        finish();
    }
}
