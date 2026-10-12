package io.github.m777m44.mahdijym;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import io.github.m777m44.mahdijym.account.GoogleAccountPlugin;
import io.github.m777m44.mahdijym.steps.StepServicePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // In-app plugins must be registered before the bridge starts.
        registerPlugin(StepServicePlugin.class);
        registerPlugin(GoogleAccountPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
