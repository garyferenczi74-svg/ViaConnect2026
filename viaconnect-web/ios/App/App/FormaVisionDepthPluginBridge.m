// FormaVisionDepthPluginBridge.m
// Task 14 (Prompt 210c) - Objective-C bridge for Capacitor plugin auto-discovery.
//
// UNVERIFIED: Requires Xcode native build and LiDAR-capable device. Cannot be
// validated in the current web/Node environment.
//
// This file provides the CAP_PLUGIN macro registration so Capacitor 6 automatically
// discovers FormaVisionDepthPlugin from the Swift file. Both this .m file AND
// FormaVisionDepthPlugin.swift must be added to the Xcode App target.
//
// No import of the Swift header is needed here; Capacitor's bridge uses the
// @objc(FormaVisionDepthPlugin) annotation in Swift for Obj-C interop.
//
// If the app uses a Swift Package Manager plugin structure, remove this file
// and register via CAPBridgedPlugin protocol instead (see Capacitor 6 docs).

#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FormaVisionDepthPlugin, "FormaVisionDepth",
    CAP_PLUGIN_METHOD(isDepthAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(captureDepth, CAPPluginReturnPromise);
)
