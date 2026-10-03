# Native project fixes (VIA-8)

Date checked: 2026-10-03. Branch `cursor/via-8-native-projects`. Draft only. Nothing was merged or deployed. `viaconnect-mobile`, `vercel.json`, Supabase email templates, and migrations were not edited. `package.json` and `package-lock.json` were not edited.

Bundle ID remains `com.farmceutica.viaconnect`.

This follows the merged Capacitor 8.5.2 upgrade (`docs/store-launch/capacitor-8-upgrade.md`, PR #259) and the 2026-10-01 store audit, section 2 blocker 5, checklist A10, A12, A13, A15, A21, and G5.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Android FormaVision depth | **Wired.** `MainActivity` registers `FormaVisionDepthPlugin`. The app module applies `kotlin-android` and depends on `com.google.ar:core:1.44.0`. | `:app:compileDebugKotlin` and `:app:compileDebugJavaWithJavac` succeeded with that dependency. The version is the one named in `FormaVisionDepthPlugin.kt`. Maven also has later 1.x releases (up to 1.56.0 on 2026-10-03). Those were not tried. |
| iOS FormaVision depth | **Left out of the Xcode target.** `FormaVisionDepthPlugin.swift` and `FormaVisionDepthPluginBridge.m` are not in `project.pbxproj`. | The task said not to add the Swift file. Nothing else in the iOS target references it. |
| `ITSAppUsesNonExemptEncryption` | **Omitted.** | The value must be boolean. This change does not guess it. The Expo app sets `false` in `viaconnect-mobile/app.config.ts`. That is a different codebase and is not counsel's answer for this shell. |
| HealthKit entitlement | **Kept.** | Sync was not run on a device, so the entitlement was not removed. |
| `android:allowBackup` | **`false`**, with backup rules that exclude app storage from cloud backup and device-to-device transfer. | Health data can land in WebView storage. See the backup section. |
| Photo library purpose string | **Added.** | Native meal upload calls Capacitor Camera with the photo-library source, and that plugin requests photo-library authorization. |
| Location purpose string | **Removed.** | No location API is called. The old string said the app does not use location. |
| Barcode in the camera string | **Not claimed.** | No live camera barcode scanner was found. See the camera section. |
| `versionCode` and `minifyEnabled` | **Unchanged** (`1` and `false`). | Not required for `assembleDebug`. |
| Play upload key | **Not created.** Signing reads environment variables or Gradle properties only when all four are set. | No keystore and no passwords belong in the repo. |

## Android build

### Health Connect Kotlin 1.8.20

`capacitor-health-connect` 0.7.0 is unchanged. Its own `android/build.gradle` sets `ext.kotlin_version = "1.8.20"` and Java 17, and it does not set a Kotlin JVM target. Kotlin 1.8.20 cannot parse JVM target 21. The Capacitor 8 upgrade already recorded that `:capacitor-health-connect:compileDebugKotlin` failed with `Unknown Kotlin JVM target: 21`.

Gradle-only alignment, no npm change:

- `android/settings.gradle` `gradle.beforeProject`: if that module requests `org.jetbrains.kotlin:kotlin-gradle-plugin:1.8.20`, resolve **2.2.20** instead. 2.2.20 is the Kotlin Gradle plugin version `@capacitor/camera` 8.2.5 already uses (`ext.kotlin_version` fallback in that plugin's `android/build.gradle`).
- `android/build.gradle`: for `:capacitor-health-connect` only, Java source and target stay 17, and Kotlin compile tasks ending in `Kotlin` set `kotlinOptions.jvmTarget = '17'`.

The Gradle cache for this build contains `kotlin-gradle-plugin` **2.2.20** jars and no 1.8.20 plugin jar. `:capacitor-health-connect:compileDebugKotlin` completed inside `:app:assembleDebug`.

An earlier successful debug build, before the app module applied Kotlin, printed: "The Kotlin Gradle plugin was loaded multiple times in different subprojects" for `:capacitor-camera` and `:capacitor-health-connect`. The later `assembleDebug` log that also compiles the app plugin did not print that line. `--warning-mode all` was not run.

### FormaVision on Android

Before: `MainActivity.java` called `registerPlugin(FormaVisionDepthPlugin.class)`, the app module did not apply Kotlin, and `com.google.ar:core` was not a dependency. The Kotlin file was not compiled. The Capacitor 8 notes say a build with Health Connect removed then failed because `FormaVisionDepthPlugin` could not be found.

After: the app module applies `kotlin-android` (plugin 2.2.20 on the root classpath), sets `kotlinOptions.jvmTarget = '21'` to match the app's Java 21 compile options, and adds `implementation 'com.google.ar:core:1.44.0'`. `MainActivity` still registers the plugin.

`:app:compileDebugKotlin` and `:app:compileDebugJavaWithJavac` succeeded. `FormaVisionDepthPlugin.kt` was not edited. Its header still says **UNVERIFIED**. It still uses `context.mainExecutor` (API 28) while `minSdkVersion` is 26, and its own comment says `captureDepth` does a synchronous `session.update()`. Those are source limitations, not compile errors.

`assembleDebug` also printed: "Unable to strip the following libraries, packaging them as they are: libarcore_sdk_c.so, libarcore_sdk_jni.so, libimage_processing_util_jni.so, libsurface_util_jni.so." The NDK strip tool is not installed here. The libraries were packaged as shipped in the ARCore 1.44.0 AAR, including `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.

The manifest already had `com.google.ar.core` = `optional` and `android.hardware.camera.ar` required = `false`. Those were not changed.

On-device depth (ARCore installed, depth supported, a real frame) was **not** run. **UNVERIFIED.**

### Backup

Before: `android:allowBackup="true"`. No `fullBackupContent` or `dataExtractionRules`.

After:

- `android:allowBackup="false"`
- `android:fullBackupContent="@xml/backup_rules"` (`res/xml/backup_rules.xml`)
- `android:dataExtractionRules="@xml/data_extraction_rules"` (`res/xml/data_extraction_rules.xml`)

Both rule files exclude `root`, `file`, `database`, `sharedpref`, `external`, and the matching `device_*` domains, with `path="."`. Cloud backup and device-to-device transfer are both excluded. Android's backup documentation says that if a transfer section is missing, that mode stays enabled. `cross-platform-transfer` (Android 16 QPR2, to iOS) is missing on purpose: the documented block requires an Apple team id, bundle id, and content version. Those were not invented. See Gary.

`allowBackup="false"` is what Android documents for opting out, including older devices. On Android 12 and higher, some manufacturers still allow device-to-device transfer when only that flag is set, which is why the extraction rules exist.

### Signing (G5)

Before: no `signingConfigs`. `android/.gitignore` left `*.jks` and `*.keystore` commented out.

After: `*.jks` and `*.keystore` are ignored. `android/app/build.gradle` defines a release signing config only when all four values are non-empty. Each value is read from the environment first, then from a Gradle property (`-P`, `~/.gradle/gradle.properties`, or another Gradle property source). The committed `android/gradle.properties` was not given passwords.

| Name | Meaning |
|---|---|
| `VIA_UPLOAD_STORE_FILE` | Absolute path to the upload keystore |
| `VIA_UPLOAD_STORE_PASSWORD` | Keystore password |
| `VIA_UPLOAD_KEY_ALIAS` | Key alias |
| `VIA_UPLOAD_KEY_PASSWORD` | Key password |

Debug builds do not use this config. They use the Android debug keystore. `assembleDebug` in this change did not set the four values.

How to create the Play upload key, outside the repo:

```bash
keytool -genkeypair -v \
  -keystore "$HOME/viaconnect-upload.jks" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

`keytool` prompts for the passwords and the certificate name. Do not commit the `.jks`. In Play Console, enroll the app in Play App Signing so Google holds the app signing key and this file is only the upload key. Then put the four values in the environment or in the user-level `~/.gradle/gradle.properties`, and from `viaconnect-web/android` run:

```bash
./gradlew :app:bundleRelease
```

That release bundle task was **not** run here. No upload key exists in this environment.

`versionCode` is still `1`. `versionName` is still `"1.0"`. `minifyEnabled` is still `false`, so release builds are not shrunk or obfuscated. Play requires a higher `versionCode` for each upload after the first. Those were left for Gary.

### What `assembleDebug` did

Command, from `viaconnect-web/android`, with command-line SDK platform `android-36` and build-tools `36.0.0` (not committed; `local.properties` is gitignored):

```bash
export ANDROID_HOME=/opt/android-sdk
./gradlew :app:assembleDebug
```

Result: **BUILD SUCCESSFUL** (exit 0). Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (about 27 MB). It is signed with the debug keystore, not a Play upload key.

`npx cap sync android` was run so the gitignored `android/capacitor-cordova-android-plugins` directory existed. It did not change tracked files. A clean checkout still needs `npx cap sync android` before Gradle, same as after the Capacitor 8 upgrade.

16 KB zip alignment on that debug APK:

```bash
"$ANDROID_HOME/build-tools/36.0.0/zipalign" -c -P 16 -v 4 \
  app/build/outputs/apk/debug/app-debug.apk
```

Exit 0. The last line was `Verification successful`. This is the debug APK only. A release AAB was not built, and this was not a device check.

## iOS

### FormaVision

`ios/App/App/FormaVisionDepthPlugin.swift` and `FormaVisionDepthPluginBridge.m` are still on disk. `project.pbxproj` does not list either file. This change does not add them. `AppDelegate.swift` does not reference them. The Swift file's own header still says **UNVERIFIED**.

`src/lib/arnold/scanning/depth/formaVisionDepth.ts` still calls `registerPlugin('FormaVisionDepth')`. `probeDepthCapability` and `captureDepthFrame` catch bridge failures and return false or null. That path was not executed on an iPhone. **UNVERIFIED.**

### Info.plist

`UIRequiredDeviceCapabilities`

- Before: `armv7`
- After: `arm64`
- The Podfile and the Xcode project deployment target are iOS 15.0 (set in the Capacitor 8 upgrade). Devices that run iOS 15 are arm64. `armv7` was the 32-bit requirement.

`NSCameraUsageDescription`

- Before: "ViaConnect uses your camera to photograph meals and scan barcodes on packaged foods. Photos are sent to our analysis service only when you choose to log a meal."
- After: "ViaConnect uses the camera to photograph meals, body-progress photos, body scans, and supplement labels. A photo is uploaded only after you choose to save it."

Camera use found in the web app that this shell loads:

- Meal photos: `src/lib/capacitor/camera-capture.ts` (`CameraSource.Camera`) via NutriVision `onCapture('camera')`.
- Body-progress photos: `src/components/body-tracker/photos/PoseGuide.tsx` file input with `capture="user"`.
- Body scans: `src/hooks/scan/useCamera.ts` calls `acquireWebCameraStream` (getUserMedia) from `src/components/scan/ScanExperience.tsx`.
- Supplement labels: `src/components/caq/phase6/SupplementPhotoUpload.tsx` file input with `capture="environment"`.

Barcode: `src/components/shared/SupplementInput.tsx` says barcode entry and zxing-wasm were removed (Prompt 177). NutriVision's barcode overlay is commented as removed (Prompt 175m). No `html5-qrcode` or `zxing` import remains under `src/`. The new string does not say the app scans barcodes. The old string did.

`NSPhotoLibraryUsageDescription`

- Before: absent.
- After: "ViaConnect uses your photo library so you can choose an existing meal photo, body-progress photo, or supplement label. The photo is uploaded only after you choose to save it."

Photo library use:

- `camera-capture.ts` uses `CameraSource.Photos` when `source` is `gallery`. NutriVision calls `onCapture('gallery')`. On the Capacitor shell, `detectPlatform()` is iOS or Android, so that path calls `Camera.getPhoto`.
- `@capacitor/camera` 8.2.5 `CameraPlugin.swift` `getPhoto` with the photos source calls `showPhotos()`, which calls `PHPhotoLibrary.authorizationStatus()` and `PHPhotoLibrary.requestAuthorization`. That is photo-library access, so the purpose string is required.
- Gallery file inputs with no `capture` attribute also exist for body-progress photos (`PoseGuide.tsx`) and supplement labels (`SupplementPhotoUpload.tsx`).

`NSPhotoLibraryAddUsageDescription` was not added. No `Camera` save-to-library or `pickLimitedLibraryPhotos` call was found under `src/`.

`NSLocationWhenInUseUsageDescription`

- Before: "ViaConnect does not use your location. ARKit requires this key on iOS even when location is not accessed."
- After: key removed.
- Search of `*.{ts,tsx,swift,m,java,kt,plist}` found no `geolocation`, `CLLocation`, or `@capacitor/geolocation`. The only location purpose string was this key. The ARKit plugin is not in the Xcode target, so it is not a reason to keep the key.

`NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription`

- Before: both said "ViaCura".
- After: both say "ViaConnect". The rest of each sentence is unchanged.

The share string still says the app reads heart rate, HRV, sleep, steps, and body composition to personalize the Bio Optimization Score, and that health data is not used for advertising. `src/lib/wearables/health-client.ts` `requestAuthorization` also asks for resting heart rate, respiratory rate, oxygen saturation, active energy, body mass, body fat percentage, and lean body mass, with `write: []`. Whether every read changes the Bio Optimization Score was not re-proven here. The update string says ViaConnect does not write Apple Health samples and that the key exists for the health plugin. `src/lib/formavision/health/healthBridge.ts` describes `@perfood/capacitor-healthkit` 1.3.2 as read-only. Writes were not tried on a device. **UNVERIFIED.**

`NSMotionUsageDescription` was not edited. It still says motion is used to stabilize the body-scan camera and is not transmitted. `ScanExperience.tsx` calls `DeviceOrientationEvent.requestPermission` on the body-scan start tap. The orientation-unavailable `LevelBubble` in that file is passed `beta={0}` and `gamma={0}`. A full trace of live tilt values was not done. **UNVERIFIED** whether the current sentence matches what the scan does with motion.

`ITSAppUsesNonExemptEncryption` is still absent. See Decisions.

### HealthKit entitlement (A10)

`ios/App/App/App.entitlements` is unchanged:

- `com.apple.developer.healthkit` = true
- `com.apple.developer.healthkit.access` = empty array

HealthKit sync was not run on a device. The entitlement stays. **UNVERIFIED.** Gary decides whether to keep it after a device check or remove it.

### What was not built on iOS

This machine has no `xcodebuild` and no `pod`. These were not run:

```bash
cd viaconnect-web
npx cap sync ios
cd ios/App
pod install
cd ../..
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath /tmp/ViaConnect.xcarchive archive
```

An Xcode 26 archive, a physical iPhone, and a physical Android device were **not** used. **UNVERIFIED.**

## Decisions for Gary

1. **Export compliance (A21).** Choose the boolean for `ITSAppUsesNonExemptEncryption` with counsel, then add the key to `ios/App/App/Info.plist`. This branch does not set it. The Expo config's `false` is not that decision.
2. **HealthKit entitlement (A10).** Keep it only if a device shows HealthKit reads working. This branch could not do that, so the entitlement is unchanged and marked **UNVERIFIED**.
3. **Health purpose strings.** Confirm the Bio Optimization Score sentence, and whether the share string should list the extra types `health-client.ts` requests. Confirm the "does not write" sentence still matches the plugin you ship.
4. **Motion string.** Confirm or replace `NSMotionUsageDescription` before submission. It was not changed.
5. **Camera string and barcodes.** Confirm the new camera and photo-library sentences. They do not mention barcode scanning, because no live camera barcode path was found. If a scanner is turned back on, the camera string has to say so.
6. **Android depth.** The plugin compiles. It is **UNVERIFIED** on a device. ARCore 1.44.0 is the version named in the Kotlin file. Later ARCore versions were not tested. `captureDepth` still has the limitations written in that file, including `mainExecutor` on API 28 while minSdk is 26.
7. **iOS depth.** Still not in the Xcode target, still **UNVERIFIED**. Add it only after an Xcode 26 device build.
8. **Play upload key (G5).** Create the upload keystore as above, enroll in Play App Signing, and set the four `VIA_UPLOAD_*` values outside the repo. Then run `bundleRelease`. `versionCode` is still 1 and `minifyEnabled` is still false.
9. **Cross-platform Android backup.** Cloud backup and device transfer are excluded. Android 16 cross-platform transfer to iOS is not configured, because that block needs the Apple team id. Provide the team id if that mode should be turned off explicitly, or accept the gap.
10. **16 KB pages.** `zipalign -c -P 16` succeeded on this debug APK. Re-check the signed release AAB. The debug package still contains ARCore `armeabi-v7a` libraries because they are inside the 1.44.0 AAR.

## UNVERIFIED

- Xcode 26 archive and `pod install`
- Install and launch on an iPhone or an Android device
- HealthKit authorization and sample reads
- ARCore depth on a device that supports the Depth API
- iOS behavior with `FormaVisionDepth` absent from the target (the JS catch path was not run on a phone)
- Whether the motion and HealthKit purpose sentences match what a reviewer sees in use
- Signed release AAB and Play App Signing enrollment
- `zipalign` on a release AAB (the debug APK check did pass)
- NDK symbol stripping (the strip tool was absent; libraries were packaged as-is)
- Android 16 cross-platform backup behavior when that XML section is absent
