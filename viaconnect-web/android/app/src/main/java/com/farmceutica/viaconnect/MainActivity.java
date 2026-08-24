package com.farmceutica.viaconnect;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Task 14 (Prompt 210c): register the ARCore depth plugin so Capacitor
    // auto-discovers it alongside the existing community plugins.
    // UNVERIFIED: requires a native Android build with ARCore dependency.
    // If the ARCore dependency (com.google.ar:core) is not yet added to
    // android/app/build.gradle, this registration line will fail to compile.
    // See FormaVisionDepthPlugin.kt for the full build.gradle requirement.
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FormaVisionDepthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
