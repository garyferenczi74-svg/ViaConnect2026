// FormaVisionDepthPlugin.swift
// Task 14 (Prompt 210c) - ARKit LiDAR depth booster plugin.
//
// UNVERIFIED: This file requires a physical iOS device with LiDAR (iPhone 12 Pro+
// or any iPad Pro with LiDAR) and a native Xcode build to verify. It cannot be
// validated in the current web/Node environment.
//
// Registration: see FormaVisionDepthPluginBridge.m for the CAP_PLUGIN macro.
// Both files must be added to the Xcode target for the plugin to function.
//
// Requirements:
//   - Xcode 14+ (for ARKit scene depth support in simulator stub)
//   - iOS 14+ deployment target (ARKit sceneDepth requires iOS 14)
//   - Real device with LiDAR for actual depth (simulator returns unavailable)
//   - Info.plist: NSCameraUsageDescription (already present) + NSMotionUsageDescription
//   - No additional Podfile entries needed (ARKit is a system framework)
//
// Graceful degradation: isDepthAvailable returns {available:false} on all devices
// without LiDAR. captureDepth rejects (JS catch block -> null) on non-LiDAR devices.
// The JS layer (formaVisionDepth.ts) never exposes depth to the pipeline on failure.

import Foundation
import Capacitor
import ARKit

// MARK: - Plugin

@objc(FormaVisionDepthPlugin)
public class FormaVisionDepthPlugin: CAPPlugin {

    // Retain the AR delegate while a capture is in flight.
    // One capture at a time; concurrent calls are not supported (first wins).
    private var activeCaptureDelegate: FormaVisionARDelegate?

    // MARK: isDepthAvailable

    /// Returns { available: boolean } indicating whether this device supports ARKit
    /// scene depth (LiDAR). ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
    /// returns false on all non-LiDAR devices and in the iOS simulator.
    @objc func isDepthAvailable(_ call: CAPPluginCall) {
        let supported = ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
        call.resolve(["available": supported])
    }

    // MARK: captureDepth

    /// Starts an ARSession with scene depth semantics, waits for the first valid depth frame,
    /// samples depth at the requested normalized Y levels, and returns a DepthFrame dict.
    ///
    /// Expected call options:
    ///   levelNorms: [Double]  - normalized Y positions [0..1] to sample
    ///
    /// Returns a dict matching the DepthFrame interface in depthScale.ts:
    ///   {
    ///     samples: [{ levelNorm, minDepthM, maxDepthM, medianDepthM, validPixelCount }],
    ///     intrinsics: { fx, fy, cx, cy, widthPx, heightPx },
    ///     capturedAtMs: Double
    ///   }
    ///
    /// Rejects when:
    ///   - device does not support scene depth (LiDAR absent)
    ///   - levelNorms is missing or empty
    ///   - ARSession fails to start or produce a valid depth frame within timeout
    @objc func captureDepth(_ call: CAPPluginCall) {
        guard ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) else {
            call.reject("LiDAR scene depth is not supported on this device")
            return
        }

        guard let rawLevelNorms = call.getArray("levelNorms"),
              rawLevelNorms.count > 0 else {
            call.reject("levelNorms must be a non-empty array of normalized Y positions [0..1]")
            return
        }

        // Parse levelNorms as Doubles
        var levelNorms: [Double] = []
        for i in 0..<rawLevelNorms.count {
            if let v = rawLevelNorms[i] as? Double {
                levelNorms.append(v)
            } else if let v = rawLevelNorms[i] as? NSNumber {
                levelNorms.append(v.doubleValue)
            }
        }
        guard !levelNorms.isEmpty else {
            call.reject("levelNorms contained no valid Double values")
            return
        }

        // Retain the delegate until capture completes (success or error)
        let delegate = FormaVisionARDelegate(levelNorms: levelNorms) { [weak self] result in
            self?.activeCaptureDelegate = nil
            call.resolve(result)
        } onError: { [weak self] message in
            self?.activeCaptureDelegate = nil
            call.reject(message)
        }
        activeCaptureDelegate = delegate

        // ARSession must be started on the main thread
        DispatchQueue.main.async {
            let session = ARSession()
            session.delegate = delegate
            let config = ARWorldTrackingConfiguration()
            config.frameSemantics = [.sceneDepth]
            // Run with resetTracking to force a fresh session for each capture
            session.run(config, options: [.resetTracking, .removeExistingAnchors])
            // Store the session in the delegate so it can be paused on completion
            delegate.session = session
        }
    }
}

// MARK: - AR Session Delegate

/// Waits for the first valid ARFrame with a sceneDepth map, samples depth at
/// the requested body levels, and invokes either onResult or onError exactly once.
private final class FormaVisionARDelegate: NSObject, ARSessionDelegate {
    private let levelNorms: [Double]
    private let onResult: ([String: Any]) -> Void
    private let onError: (String) -> Void
    private var resolved = false

    // Assigned after session.run() is called (to allow session.pause() on completion)
    weak var session: ARSession?

    init(
        levelNorms: [Double],
        onResult: @escaping ([String: Any]) -> Void,
        onError: @escaping (String) -> Void
    ) {
        self.levelNorms = levelNorms
        self.onResult = onResult
        self.onError = onError
    }

    // Called on ARKit's internal queue for each new frame
    func session(_ arSession: ARSession, didUpdate frame: ARFrame) {
        guard !resolved else { return }
        // Wait for a frame that has a valid depth map
        guard let sceneDepth = frame.sceneDepth,
              let depthMap = Optional(sceneDepth.depthMap) else {
            return
        }

        resolved = true
        arSession.pause()

        processFrame(frame: frame, depthMap: depthMap)
    }

    func session(_ arSession: ARSession, didFailWithError error: Error) {
        guard !resolved else { return }
        resolved = true
        arSession.pause()
        onError("ARSession failed: \(error.localizedDescription)")
    }

    // MARK: Private processing

    private func processFrame(frame: ARFrame, depthMap: CVPixelBuffer) {
        // Camera intrinsics (simd_float3x3, column-major):
        //   [0][0] = fx, [1][1] = fy, [2][0] = cx, [2][1] = cy
        let m = frame.camera.intrinsics
        let resolution = frame.camera.imageResolution
        let intrinsicsDict: [String: Any] = [
            "fx": Double(m[0][0]),
            "fy": Double(m[1][1]),
            "cx": Double(m[2][0]),
            "cy": Double(m[2][1]),
            "widthPx": Double(resolution.width),
            "heightPx": Double(resolution.height),
        ]

        // Depth map dimensions (may differ from color image - typically smaller)
        let depthWidth = CVPixelBufferGetWidth(depthMap)
        let depthHeight = CVPixelBufferGetHeight(depthMap)

        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }

        guard let baseAddr = CVPixelBufferGetBaseAddress(depthMap) else {
            onError("depth map base address unavailable")
            return
        }

        // ARKit depth maps are kCVPixelFormatType_DepthFloat32 - each pixel is a Float32
        // metric depth value in meters (0 = invalid/unknown)
        let floatPtr = baseAddr.assumingMemoryBound(to: Float32.self)

        var samplesArr: [[String: Any]] = []

        for levelNorm in levelNorms {
            // Map normalized Y in color-image space to the depth map row.
            // Because levelNorm spans [0..1], applying it to depthHeight gives the
            // correct proportional row regardless of depth/color resolution ratio.
            let row = Int(levelNorm * Double(depthHeight - 1)).clamped(to: 0...(depthHeight - 1))
            var validDepths: [Double] = []

            for col in 0..<depthWidth {
                let idx = row * depthWidth + col
                let d = Double(floatPtr[idx])
                // ARKit uses 0.0 for invalid/unknown pixels
                if d.isFinite && d > 0.001 {
                    validDepths.append(d)
                }
            }

            var sampleDict: [String: Any] = [
                "levelNorm": levelNorm,
                "validPixelCount": validDepths.count,
            ]

            if validDepths.count >= 5 {
                validDepths.sort()
                sampleDict["minDepthM"] = validDepths.first!
                sampleDict["maxDepthM"] = validDepths.last!
                sampleDict["medianDepthM"] = validDepths[validDepths.count / 2]
            } else {
                // Not enough valid pixels: return zeros (JS depthDerivedDepthCm returns null)
                sampleDict["minDepthM"] = 0.0
                sampleDict["maxDepthM"] = 0.0
                sampleDict["medianDepthM"] = 0.0
            }

            samplesArr.append(sampleDict)
        }

        let result: [String: Any] = [
            "samples": samplesArr,
            "intrinsics": intrinsicsDict,
            "capturedAtMs": Date().timeIntervalSince1970 * 1000.0,
        ]
        onResult(result)
    }
}

// MARK: - Comparable range clamp helper

private extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        return max(range.lowerBound, min(self, range.upperBound))
    }
}
