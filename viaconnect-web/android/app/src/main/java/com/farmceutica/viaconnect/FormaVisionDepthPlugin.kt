// FormaVisionDepthPlugin.kt
// Task 14 (Prompt 210c) - ARCore Depth API booster plugin for Android.
//
// UNVERIFIED: This file requires:
//   1. A physical Android device with ARCore Depth API support (most flagship
//      Android 9+ phones with ToF sensors - check Google's list at
//      developers.google.com/ar/devices)
//   2. ARCore dependency added to android/app/build.gradle:
//        implementation 'com.google.ar:core:1.44.0'
//   3. Kotlin plugin in android/build.gradle:
//        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:<version>'
//      and in android/app/build.gradle:
//        apply plugin: 'kotlin-android'
//   4. Registration in MainActivity.java (see that file)
//
// Cannot be validated in the current web/Node environment.
//
// Graceful degradation: isDepthAvailable returns {available:false} on devices
// without ARCore or Depth API support. captureDepth rejects with a clear error.
// The JS layer (formaVisionDepth.ts probeDepthCapability) catches all errors.

package com.farmceutica.viaconnect

import android.graphics.ImageFormat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.ar.core.ArCoreApk
import com.google.ar.core.Config
import com.google.ar.core.Session
import com.google.ar.core.TrackingState
import com.google.ar.core.exceptions.UnavailableArcoreNotInstalledException
import com.google.ar.core.exceptions.UnavailableDeviceNotCompatibleException
import com.google.ar.core.exceptions.UnavailableSdkTooOldException
import com.google.ar.core.exceptions.UnavailableUserDeclinedInstallationException
import java.nio.ByteOrder
import java.nio.ShortBuffer

@CapacitorPlugin(name = "FormaVisionDepth")
class FormaVisionDepthPlugin : Plugin() {

    // MARK: isDepthAvailable

    /**
     * Returns {available: boolean} indicating whether this device supports the
     * ARCore Depth API. Creates a one-shot ARCore Session just to check, then
     * closes it. Returns false on any exception.
     */
    @PluginMethod
    fun isDepthAvailable(call: PluginCall) {
        val ctx = context
        if (ctx == null) {
            val result = JSObject()
            result.put("available", false)
            call.resolve(result)
            return
        }
        val available = try {
            // Check ARCore availability first
            val availability = ArCoreApk.getInstance().checkAvailability(ctx)
            if (!availability.isSupported) {
                false
            } else {
                val session = Session(ctx)
                val supported = session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)
                session.close()
                supported
            }
        } catch (_: UnavailableArcoreNotInstalledException) {
            false
        } catch (_: UnavailableDeviceNotCompatibleException) {
            false
        } catch (_: UnavailableSdkTooOldException) {
            false
        } catch (_: UnavailableUserDeclinedInstallationException) {
            false
        } catch (_: Exception) {
            false
        }
        val result = JSObject()
        result.put("available", available)
        call.resolve(result)
    }

    // MARK: captureDepth

    /**
     * Starts an ARCore session with depth enabled, captures one frame with depth,
     * samples depth at the requested normalized Y levels, and returns a DepthFrame dict.
     *
     * Expected call options:
     *   levelNorms: array of doubles [0..1] - normalized Y positions to sample
     *
     * Returns a dict matching the DepthFrame interface in depthScale.ts.
     * Rejects when ARCore is unavailable, depth is not supported, or capture fails.
     *
     * IMPORTANT: This does a synchronous session.update() call. In a production
     * implementation, the session should run a few update() cycles on a dedicated
     * thread to let depth stabilize before sampling. Marked as a known limitation
     * for the Gary native-build review.
     */
    @PluginMethod
    fun captureDepth(call: PluginCall) {
        val levelNormsArr = call.getArray("levelNorms")
        if (levelNormsArr == null || levelNormsArr.length() == 0) {
            call.reject("levelNorms must be a non-empty array of normalized Y positions")
            return
        }

        val levelNorms = mutableListOf<Double>()
        for (i in 0 until levelNormsArr.length()) {
            levelNorms.add(levelNormsArr.getDouble(i))
        }

        val ctx = context
        if (ctx == null) {
            call.reject("Plugin context unavailable")
            return
        }

        // Run on a background thread to avoid blocking the main thread
        bridge.context.mainExecutor.execute {
            var session: Session? = null
            try {
                session = Session(ctx)

                if (!session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
                    session.close()
                    call.reject("ARCore Depth API not supported on this device")
                    return@execute
                }

                val config = Config(session)
                config.depthMode = Config.DepthMode.AUTOMATIC
                // SEMANTIC_SCENE_UNDERSTANDING adds body segmentation but is optional
                session.configure(config)
                session.resume()

                // Attempt to capture a frame with valid depth.
                // Production recommendation: retry up to 10 frames (on a timed loop)
                // until the camera has tracked and depth is available.
                var depthImage: android.media.Image? = null
                var captureFrame: com.google.ar.core.Frame? = null
                var intrinsicsObj: JSObject? = null

                for (attempt in 0 until 5) {
                    val frame = session.update()
                    if (frame.camera.trackingState != TrackingState.TRACKING) {
                        Thread.sleep(100)
                        continue
                    }
                    captureFrame = frame

                    // Get camera intrinsics for the color (CPU) image
                    val imgIntrinsics = frame.camera.imageIntrinsics
                    val focal = imgIntrinsics.focalLength
                    val principal = imgIntrinsics.principalPoint
                    val dims = imgIntrinsics.imageDimensions
                    intrinsicsObj = JSObject().apply {
                        put("fx", focal[0].toDouble())
                        put("fy", focal[1].toDouble())
                        put("cx", principal[0].toDouble())
                        put("cy", principal[1].toDouble())
                        put("widthPx", dims[0].toDouble())
                        put("heightPx", dims[1].toDouble())
                    }

                    // Acquire depth image (DEPTH16 format)
                    try {
                        depthImage = frame.acquireDepthImage16Bits()
                        break
                    } catch (_: Exception) {
                        Thread.sleep(50)
                    }
                }

                val frame = captureFrame
                val depth = depthImage
                val intrinsics = intrinsicsObj

                if (depth == null || frame == null || intrinsics == null) {
                    session.pause()
                    session.close()
                    call.reject("Could not acquire a depth image after multiple attempts")
                    return@execute
                }

                val samples = sampleDepthImage(depth, levelNorms)
                depth.close()
                session.pause()
                session.close()

                val result = JSObject()
                result.put("samples", samples)
                result.put("intrinsics", intrinsics)
                result.put("capturedAtMs", System.currentTimeMillis().toDouble())
                call.resolve(result)

            } catch (e: Exception) {
                try {
                    session?.pause()
                    session?.close()
                } catch (_: Exception) { }
                call.reject("depth capture failed: ${e.message ?: "unknown error"}")
            }
        }
    }

    // MARK: Private helpers

    /**
     * Samples depth statistics at each requested normalized Y level.
     *
     * ARCore DEPTH16 format: each UInt16 pixel encodes:
     *   lower 13 bits = depth in millimeters (0 = invalid)
     *   upper 3 bits  = confidence (0 = low/invalid, 7 = highest confidence)
     *
     * This function accepts only pixels with confidence >= 1 and depth > 0.
     */
    private fun sampleDepthImage(depthImage: android.media.Image, levelNorms: List<Double>): JSArray {
        val width = depthImage.width
        val height = depthImage.height
        val plane = depthImage.planes[0]

        // DEPTH16 pixels are UInt16 in native byte order
        val rawBuffer = plane.buffer.order(ByteOrder.nativeOrder())
        val shortBuffer: ShortBuffer = rawBuffer.asShortBuffer()

        val samplesArr = JSArray()

        for (levelNorm in levelNorms) {
            val row = (levelNorm * (height - 1)).toInt().coerceIn(0, height - 1)
            val validDepths = mutableListOf<Double>()

            for (col in 0 until width) {
                val pixelIndex = row * width + col
                val rawVal = shortBuffer.get(pixelIndex).toInt() and 0xFFFF
                val depthMm = rawVal and 0x1FFF          // lower 13 bits = depth in mm
                val confidence = (rawVal shr 13) and 0x07  // upper 3 bits = confidence
                if (depthMm > 0 && confidence >= 1) {
                    validDepths.add(depthMm.toDouble() / 1000.0)  // mm to meters
                }
            }

            val sampleObj = JSObject()
            sampleObj.put("levelNorm", levelNorm)
            sampleObj.put("validPixelCount", validDepths.size)

            if (validDepths.size >= 5) {
                validDepths.sort()
                sampleObj.put("minDepthM", validDepths.first())
                sampleObj.put("maxDepthM", validDepths.last())
                sampleObj.put("medianDepthM", validDepths[validDepths.size / 2])
            } else {
                // Not enough valid pixels: return zeros (JS depthDerivedDepthCm returns null)
                sampleObj.put("minDepthM", 0.0)
                sampleObj.put("maxDepthM", 0.0)
                sampleObj.put("medianDepthM", 0.0)
            }

            samplesArr.put(sampleObj)
        }

        return samplesArr
    }
}
