# Gate C: Native Depth Plugins Engineering Runbook

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect (Via Cura consumer brand). Owner agent: Arnold, orchestration Jeffery.
Status: ENGINEERING RUNBOOK, drafted 2026-05-31. This is the design and the executable steps to close Gate C from the FormaVision Phase 2 plan. The native plugin code itself is NOT built in this document: native iOS Swift and Android Kotlin require Xcode and Android Studio, real LiDAR and ARCore hardware to test, and App Store and Play Store review, none of which exist in the web environment Phase 1 was built in. This runbook makes the native build turnkey for whoever holds the native toolchain, and it surfaces the one architectural decision that must be made first.

Gate C closure criteria (from Prompt 169e Section 4.3): the iOS BodyScanDepth and Android BodyScanDepth Capacitor plugins built, tested, App Store and Play Store approved, live in production, and functioning on the target device matrix without critical bugs.

## 0. Honest boundary and dependency note

- What this runbook is: the API surface, the per-platform bridge design, the Capacitor registration, the architectural resolution, the device matrix, the permissions, the web-side contract, the test plan, and the store steps.
- What this runbook is not: compiled or device-tested native code. Treat all API and SDK specifics here as a design to validate against the live ARKit and ARCore SDK versions at build time.
- Dependency reality: even after Gate C closes, the features that CONSUME the depth stream (the continuous-rotation Tier 2 and Tier 3 capture, depth-fused measurement and segmental extraction, the segmental composition model) are Phase 2 Stage 2 and Stage 3 and are gated on Gate A (the parametric mesh) and Gate B (the trained models). Gate C closes the prerequisite; the depth is not consumed until A and B also close. Build the plugin so it degrades cleanly to Tier 1 until the consumers exist.

## 1. The architectural decision to make first (blocks plugin design)

The current Capacitor config (viaconnect-web/capacitor.config.ts) is a HOSTED-WEB SHELL: `server.url` is https://viaconnectapp.com with `webDir: public` as a minimum offline fallback. The native app loads the remote site in the WebView. This is fine for a normal web app, but a depth plugin streams large binary frames (point cloud plus confidence map plus RGB keyframe plus intrinsics) from native into the WebView, and a continuous rotation capture produces many such frames.

Two viable designs. Pick one before writing the plugin:

- Design 1, bridge-to-web. The native plugin streams or batches depth frames over the Capacitor bridge to the remote-loaded web page, which then uploads them to the body-scan-analyze edge function for server-side fitting. Pro: keeps the existing hosted-web shell. Con: the Capacitor bridge is not built for high-bandwidth binary streaming; large per-frame payloads crossing the JS bridge to a remote page is the weak point. Mitigation: do NOT stream raw per-frame point clouds across the bridge; have the plugin accumulate and downsample natively and hand back a compact result, or write frames to a native temp file and pass only file references.
- Design 2, native-capture-then-upload. The native plugin captures the depth session, persists the frames natively (device storage), and uploads them directly from native to Supabase Storage or the edge function, signaling the web layer only with a session id and progress. The web page never receives the raw depth. Pro: avoids the bridge bandwidth problem entirely and fits the server-side fitting model from Prompt 169 Section 5.2. Con: more native code; the upload auth token must be passed from the web session into the plugin.

Recommendation: Design 2 for the continuous-rotation depth path, with Design 1 acceptable only for the small fixed-frame Tier 2 discrete capture. This decision is Gary plus the native lead. It determines the plugin method surface below.

## 2. Plugin API surface (per Prompt 169 Section 5.1 and 169a Section 4.1)

A single Capacitor plugin name BodyScanDepth, identical method surface on both platforms, with a normalized JSON frame schema so the web layer is platform-agnostic.

Methods:
- isDepthSupported(): { supported: boolean, sensor: 'lidar' | 'arcore_depth' | 'truedepth' | 'none' }
- getCameraIntrinsics(): { focalLengthPx, principalPoint, sensorWidthMm, sensorHeightMm }
- startDepthSession(config): void  (config carries the chosen design's upload target or bridge mode, plus a session id and, for Design 2, the auth token)
- captureDepthFrame(): DepthFrameRef  (one frame; for the Tier 2 fixed-frame path)
- captureDepthSequence(durationMs): { sessionRef }  (the continuous rotation path; under Design 2 this drives native accumulation and upload)
- stopDepthSession(): { frameCount, uploadedRef }

DepthFrame normalized schema (whichever subset crosses the boundary): { timestampMs, intrinsics, depthRef (file uri or compact buffer), confidenceRef, rgbKeyframeRef, imu: { pitch, roll, yaw } }. Raw point clouds are referenced by uri, never inlined, per Section 1.

## 3. iOS plugin design (ios/App/App/Plugins/BodyScanDepth.swift)

- Framework: ARKit. Use ARSession with ARWorldTrackingConfiguration and sceneDepth (smoothedSceneDepth) for LiDAR devices; expose ARDepthData (depthMap plus confidenceMap). TrueDepth front via AVCaptureDepthDataOutput only if a selfie capture variant is added later.
- Camera intrinsics from ARFrame.camera.intrinsics. IMU pitch and roll from the ARFrame transform or CoreMotion.
- Capacitor 6 plugin: subclass CAPPlugin, register methods with CAP_PLUGIN_METHOD, expose via the @objc bridge. Confirm the Capacitor 6 Swift plugin template against the installed @capacitor/ios version.
- Permissions in Info.plist: NSCameraUsageDescription (body scanning copy), NSMotionUsageDescription. No microphone.
- Device matrix: iPhone 12 Pro and newer Pro line, iPad Pro 11 inch 2nd gen and later, iPad Pro 12.9 inch 4th gen and later. Devices without LiDAR return isDepthSupported supported false and the app stays Tier 1.

## 4. Android plugin design (android/app/src/main/java/com/farmceutica/viaconnect/plugins/BodyScanDepth.kt)

- Framework: ARCore Depth API. Use Session with Config depth mode AUTOMATIC; acquire Frame.acquireDepthImage16Bits (smooth depth) and, where a ToF sensor is present, the raw depth image. Camera intrinsics from Frame camera intrinsics. IMU from the device RotationVector sensor.
- Capacitor 6 plugin: subclass Plugin, annotate methods with @PluginMethod, register via @CapacitorPlugin. Confirm against the installed @capacitor/android version.
- Permissions in AndroidManifest: CAMERA, the runtime motion permission. RECORD_AUDIO false. Add the ARCore meta-data and the Google Play Services for AR dependency. Handle the ARCore availability and install-request flow.
- Device matrix: ARCore Depth API supported devices (about 87 percent of active Android per Google Oct 2025), with raw depth on ToF devices (Pixel 4 and newer, Galaxy S20 Ultra and newer with ToF). Unsupported devices return supported false and stay Tier 1.

## 5. Web-side bridge contract (the TypeScript the web layer will call)

A platform-agnostic wrapper, to be implemented in the Phase 2 web work under src/lib/body-tracker (NOT the phantom src/modules/formavision path). Contract only; do not ship it as an empty wrapper before the native plugin exists.

```
// depth-bridge contract (Phase 2)
interface BodyScanDepthPlugin {
  isDepthSupported(): Promise<{ supported: boolean; sensor: 'lidar'|'arcore_depth'|'truedepth'|'none' }>;
  getCameraIntrinsics(): Promise<CameraIntrinsics>;
  startDepthSession(config: DepthSessionConfig): Promise<void>;
  captureDepthFrame(): Promise<DepthFrameRef>;
  captureDepthSequence(opts: { durationMs: number }): Promise<{ sessionRef: string }>;
  stopDepthSession(): Promise<{ frameCount: number; uploadedRef: string | null }>;
}
// registerPlugin('BodyScanDepth') from @capacitor/core; the web caller
// always checks isDepthSupported first and falls back to the Tier 1 flow.
```

The bridge is injected by Capacitor into the WebView even when the page is the remote hosted site, so the remote web at viaconnectapp.com can call it; confirm the plugin is registered in the native shell and that the remote origin is allow-listed in the Capacitor server config.

## 6. Test plan

- Unit and instrumented native tests where feasible, but the load-bearing validation is on-device.
- Device matrix pass: at least 2 iOS LiDAR devices and 2 ARCore Depth Android devices, plus 1 non-depth device per platform to confirm the clean Tier 1 fallback (isDepthSupported false, no crash, the existing four-pose flow runs).
- Capture integrity: a full continuous-rotation sequence produces a coherent depth set; pose-break handling reissues guidance.
- Bandwidth and memory: confirm Design 1 or Design 2 does not exhaust memory on baseline devices during a 12 to 15 second rotation.
- Permission flows: first-run camera and motion prompts, denial handling, and the ARCore install-request path on Android.
- Integration: the depth result reaches the intended consumer (Design 2 upload target) without blocking the UI; structured logging at the session boundaries.

## 7. Store submission steps

1. Implement the plugin in the native projects; run npx cap sync.
2. iOS: open in Xcode (npm run cap:open:ios), set the signing team, bump the build, archive, upload to TestFlight, internal test on the device matrix, then submit for App Store review. Bundle id com.farmceutica.viaconnect.
3. Android: open in Android Studio (npm run cap:open:android), build a signed bundle, promote to the Play internal track, test on the device matrix, then promote to production review.
4. Both stores review camera and AR usage; the body scanning usage strings and the General Wellness positioning from Prompt 169b cover the review questions. Allow 1 to 2 weeks of store buffer per Prompt 169a Section 7.
5. Gate C closes when both are live in production on the device matrix without critical bugs, and the isDepthSupported gating is confirmed in production so non-depth users are unaffected.

## 8. What stays out of scope for this gate

- The depth-consuming features (Tier 2 and Tier 3 capture flow, depth-fused extraction, segmental composition) are Stage 2 and Stage 3 of the Phase 2 plan and depend on Gate A and Gate B. Build the plugin to capture and hand off depth; do not block Gate C on the consumers existing.
- package.json: adding the ARCore or AR dependency, or any Capacitor plugin dependency, is surfaced for Gary approval per the standing package.json lock.
- No accuracy or Tier 2 marketing claim ships from Gate C alone; the depth-enhanced measurement claims are gated on Gate B validation per the Phase 2 claims-unlock map.

## 9. The decision and the handoff

Decision for Gary and the native lead: choose Design 1 or Design 2 from Section 1 before plugin implementation begins. That choice determines the method surface and the upload path.

Handoff: this runbook plus the chosen design is everything a native engineer needs to build, test, and submit the plugins. The web environment cannot compile, device-test, or submit native code, so the native build is owned by native engineering. When the plugins are live and isDepthSupported returns true in production on the device matrix, Gate C is closed and the depth path can be wired into the Phase 2 web work.
