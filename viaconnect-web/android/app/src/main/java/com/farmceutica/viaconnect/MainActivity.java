package com.farmceutica.viaconnect;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Compiled with com.google.ar:core:1.44.0. On-device depth behavior is
    // UNVERIFIED. See docs/store-launch/native-projects-fixes.md.
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FormaVisionDepthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
