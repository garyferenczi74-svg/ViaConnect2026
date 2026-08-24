// Task 14 (Prompt 210c) - Capacitor JS plugin interface for native ARKit/ARCore depth.
//
// Registers the FormaVisionDepth Capacitor plugin and exposes a capability probe
// that returns false on web, SSR, no-plugin, or any bridge error.
//
// GRACEFUL DEGRADATION (Section 6.3 / 2.1): probeDepthCapability() NEVER throws.
// A false return means the caller falls back to the two-view silhouette breadth
// path, which is byte-identical to the pre-Task-14 behavior. Depth NEVER blocks
// the pipeline.
//
// Native implementations (written but UNVERIFIED - require a device build):
//   ios/App/App/FormaVisionDepthPlugin.swift
//   ios/App/App/FormaVisionDepthPluginBridge.m
//   android/app/src/main/java/com/farmceutica/viaconnect/FormaVisionDepthPlugin.kt
//
// No em-dashes. No en-dashes. No `any`. SSR-safe (window check before all calls).

import { registerPlugin } from '@capacitor/core';
import type { DepthFrame } from '../accuracy/depthScale';

// ---- Capacitor plugin interface ----

/**
 * JS-side interface for the FormaVisionDepth native Capacitor plugin.
 *
 * isDepthAvailable: reports whether the device has ARKit scene depth (iOS LiDAR)
 *   or ARCore Depth API (Android). Returns {available:false} on unsupported devices.
 *   Never throws.
 *
 * captureDepth: samples metric depth at the requested normalized Y levels
 *   (levelNorms, [0..1] each). Returns a DepthFrame with one DepthSample per
 *   requested level plus camera intrinsics. May reject if the AR session cannot
 *   start, permissions are denied, or the sensor is unavailable.
 */
export interface FormaVisionDepthPlugin {
  isDepthAvailable(): Promise<{ available: boolean }>;
  captureDepth(options: { levelNorms: number[] }): Promise<DepthFrame>;
}

// ---- Module-level plugin registration ----

// The registerPlugin call is safe in any JS environment; only bridge method
// calls can fail. We wrap it in try/catch so a stubbed test environment cannot
// crash the module at import time.
let _depthPlugin: FormaVisionDepthPlugin | null = null;
try {
  _depthPlugin = registerPlugin<FormaVisionDepthPlugin>('FormaVisionDepth');
} catch {
  // registerPlugin threw unexpectedly (e.g., in a deeply stubbed test env).
  // _depthPlugin stays null; all public functions degrade gracefully.
  _depthPlugin = null;
}

/**
 * The registered plugin instance. Exported for test mocking and direct access.
 * Callers should use probeDepthCapability + captureDepthFrame rather than
 * accessing this directly.
 */
export const depthPlugin: FormaVisionDepthPlugin | null = _depthPlugin;

// ---- Public API ----

/**
 * Probe whether metric depth capture is available on this device.
 *
 * Returns false (never throws) when:
 *   - running in SSR (window undefined, e.g. Node test environment)
 *   - no Capacitor native bridge (plain web browser)
 *   - device lacks LiDAR (iOS) or ARCore Depth API (Android)
 *   - plugin is absent from the native bundle
 *   - any bridge error
 *
 * This is the SINGLE GATE for all depth-booster code. A false return means
 * the caller uses the two-view silhouette breadth path unchanged.
 *
 * @returns true when native metric depth is confirmed available, false otherwise.
 */
export async function probeDepthCapability(): Promise<boolean> {
  // SSR guard: window is undefined in server-side rendering and Node test env.
  if (typeof window === 'undefined') return false;
  // Plugin registration failed or is not present in the native bundle.
  if (_depthPlugin === null) return false;
  try {
    const result = await _depthPlugin.isDepthAvailable();
    return result.available === true;
  } catch {
    // Bridge error, PluginNotImplementedException, or web platform stub.
    return false;
  }
}

/**
 * Capture metric depth at the specified normalized Y levels.
 *
 * Wraps the native captureDepth call with a timeout guard per the resilience
 * requirement (Section 0 Global Constraints: Promise.race 3-5 second timeout,
 * try/catch fail-open). Returns null on any error or timeout.
 *
 * RULE 9: returns null (never throws) when depth is unavailable. The caller
 * falls back to the silhouette-derived side depth for all affected levels.
 *
 * @param levelNorms - Normalized Y positions [0..1] at which to sample depth.
 * @param timeoutMs - Maximum wait in milliseconds before giving up (default 3000).
 * @returns DepthFrame on success, null on any failure.
 */
export async function captureDepthFrame(
  levelNorms: number[],
  timeoutMs = 3000,
): Promise<DepthFrame | null> {
  if (typeof window === 'undefined') return null;
  if (_depthPlugin === null) return null;
  try {
    const frame = await Promise.race<DepthFrame>([
      _depthPlugin.captureDepth({ levelNorms }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('depth capture timeout')), timeoutMs)
      ),
    ]);
    return frame;
  } catch {
    // Timeout, bridge error, or plugin rejection - graceful degradation.
    return null;
  }
}
