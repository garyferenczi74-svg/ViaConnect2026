# Native project fixes (VIA-8)

Date checked: 2026-10-03. Branch `cursor/via-8-native-projects`. Draft only. Nothing was merged or deployed. `viaconnect-mobile`, `vercel.json`, Supabase email templates, and migrations were not edited. `package.json` and `package-lock.json` were not edited.

Bundle ID remains `com.farmceutica.viaconnect`.

This follows the merged Capacitor 8.5.2 upgrade (`docs/store-launch/capacitor-8-upgrade.md`, PR #259) and the 2026-10-01 store audit, section 2 blocker 5, checklist A10, A12, A13, A15, A21, and G5.

Gary's standing lock for store work: until submission, build only what an Apple App Store or Google Play code or policy requirement calls for. No other feature work. Guideline text below was checked against Apple's App Review Guidelines page and Play Console Help on 2026-10-03.

## Store requirement for each change

| Change in this PR | Requirement | Removal |
|---|---|---|
| Health Connect Kotlin 1.8.20 aligned to 2.2.20, JVM target 17, module-scoped | Play target API level. As of August 31, 2026, new apps and updates must target Android 16 (API 36). This project already sets `targetSdkVersion` 36. The alignment exists so that build can compile while `capacitor-health-connect` 0.7.0 stays on the classpath. | Not flagged. Removing the alignment breaks the API 36 build while the plugin remains. The plugin manifest declares no Health permissions. Health Connect stays off unless `NEXT_PUBLIC_HEALTH_CONNECT_ENABLED` is `1`. |
| FormaVision depth held out: Android plugin unregistered, `com.google.ar:core` removed, app-module Kotlin removed, `com.google.ar.core` meta-data and `android.hardware.camera.ar` removed. iOS Swift file stays out of the Xcode target. Sources stay on disk. | Apple 2.1(a) (incomplete binaries are rejected). Apple 2.3.1(a) (no hidden or dormant features). Apple 4.2.1 (an ARKit experience has to be a real AR feature; this one is not in the iOS target). Apple 5.1.1(iii) (request only data relevant to core functionality). Apple 5.1.2(vi) (depth and facial-mapping data). Play 16 KB page size: apps targeting API 35 or higher must support 16 KB pages; the removed ARCore libraries were the ones the strip step could not process. | Not flagged. The hold is the submission state. Device-testing depth is deferred with the FormaVision rebuild, not an open item for this PR. |
| `UIRequiredDeviceCapabilities` `armv7` replaced with `arm64` | Apple 2.5.1 (the app must run on the currently shipping OS). The App Store requires 64-bit. The deployment target is iOS 15.0, which is arm64. | Not flagged. |
| Camera purpose string rewritten. Barcode scanning is not claimed. | Apple 5.1.1(ii) (the purpose string must clearly and completely describe the use). Apple 2.5.14 (camera use needs a clear indication). Apple 2.3 (metadata must match the app). No live camera barcode scanner was found. | Not flagged. |
| `NSPhotoLibraryUsageDescription` added | Apple 5.1.1(ii) and 5.1.1(iii). `@capacitor/camera` 8.2.5 calls `PHPhotoLibrary.requestAuthorization` for the photo-library source. | Not flagged. The Android manifest does not declare a photo permission, so this is not a Play photo-permission declaration. |
| `NSLocationWhenInUseUsageDescription` removed | Apple 5.1.5 (location only when it is relevant) and 5.1.1(iii). No location API is called. | Not flagged. |
| HealthKit entitlement left on | Apple 2.5.1 (HealthKit is for health and fitness and must integrate with the Health app). Apple 5.1.3. Gary decided on 2026-10-02 that the first release depends on Apple Health data. | Not flagged. On-device read is still unverified. That is a 2.1(a) test gap. |
| `NSHealthShareUsageDescription` replaced with the step-count draft | Apple 5.1.1(ii). Apple 5.1.3(i) (disclose the specific health data collected from the device, and do not use it for advertising). Apple's HealthKit configuration docs require this key before a read. The health-and-fitness page says to request only data that is core to the app. The only query in code is step count. | Not flagged. Wording is still pending Lex/Gary approval. |
| `NSHealthUpdateUsageDescription` removed | Apple's HealthKit configuration docs require the update string when the app writes. This build does not save a sample. Apple 5.1.1(iii). Apple 5.1.3(ii) (do not write false or inaccurate data into HealthKit). | Not flagged. The omission is the requirement. Put the key back only if a write request ships, with approved wording. |
| HealthKit type inventory, proposed minimum (step count, no write), and plugin options | Same 5.1.1(iii) and 5.1.3(i). Documentation only. No plugin was added and `package.json` was not edited. | Not flagged. Do not implement the Capacitor 8 package swap or the in-repo Swift plugin under this lock unless a submission build cannot read the HealthKit data the release depends on. |
| HealthKit disclosure in `privacy-answers.md` and the HealthKit section of `app-review-notes-draft.md` | Apple 2.1(a) (review notes, demo account, working backend). Apple 2.3 (privacy information must match the app). Apple 5.1.1(i) and 5.1.3(i). Play User Data policy and the Data safety form. Play's Health Connect publish notes: declare only the types the app uses. Health Connect is flag-off. | Not flagged. |
| `android:allowBackup="false"` plus `backup_rules.xml` and `data_extraction_rules.xml` | Play User Data policy: health data is personal and sensitive and must be handled securely. No Play sentence says `allowBackup` must be false. | **Flagged for removal review. Not removed.** Gary confirms it stays, or a later pass deletes the flag and the two XML files. This pass leaves them, because turning backup back on has no replacement control for WebView storage. Android 16 cross-platform transfer is still unconfigured. That block needs an Apple team id. It is not a new feature. |
| Release signing reads `VIA_UPLOAD_*` from the environment or Gradle properties. `*.jks` and `*.keystore` are gitignored. No keystore was created. | Play App Signing, required for new apps. The upload key stays outside the repo. | Not flagged. Creating the keystore is unfinished submission work. |
| `ITSAppUsesNonExemptEncryption` still absent | Apple export compliance (`ITSAppUsesNonExemptEncryption` and the App Store Connect export questionnaire). This is not an App Review guideline number. | Not surplus. **Unmet.** The boolean was not set because it was not established. Counsel still has to choose it. |
| `versionCode` 1 and `minifyEnabled` false left unchanged | No change in this PR. Play requires a higher `versionCode` on each upload after the first. | Nothing to remove. |
| `NSMotionUsageDescription` not edited | Apple 5.1.1(ii) if the motion prompt is shown. `ScanExperience.tsx` calls `DeviceOrientationEvent.requestPermission`. Whether the sentence matches that scan is still unverified. | Not a change in this PR. Not flagged for removal here. |

Nothing else in the diff is flagged. The in-repo HealthKit plugin and the FormaVision depth wiring are not in this branch and stay out under the lock.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Android FormaVision depth | **On hold.** Not registered, not compiled, ARCore not packaged. | Gary decided FormaVision will be rebuilt over the next few days. Depth capture returns with that rebuild. Plugin source stays on disk. |
| iOS FormaVision depth | **On hold.** Still out of the Xcode target. | Same decision. `FormaVisionDepthPlugin.swift` and `FormaVisionDepthPluginBridge.m` stay on disk and stay out of `project.pbxproj`. |
| `ITSAppUsesNonExemptEncryption` | **Omitted.** | The value must be boolean. This change does not guess it. The Expo app sets `false` in `viaconnect-mobile/app.config.ts`. That is a different codebase and is not counsel's answer for this shell. |
| HealthKit entitlement | **Kept. Decision, 2026-10-02.** | Gary decided the first release depends on Apple Health data. The entitlement stays on. On-device HealthKit behavior is still **UNVERIFIED**. |
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

The app module no longer applies `kotlin-android`. The root classpath no longer includes `kotlin-gradle-plugin`. Those existed only so `FormaVisionDepthPlugin.kt` could compile. Camera and Health Connect still apply Kotlin inside their own modules. The Health Connect alignment above is unchanged.

### FormaVision depth is on hold

Gary decided FormaVision will be rebuilt over the next few days. Depth capture (ARCore on Android, ARKit on iOS) is **on hold**. It returns with that rebuild. This branch does not wire it and does not ship it.

Android, after the hold:

- `MainActivity` does not call `registerPlugin(FormaVisionDepthPlugin.class)`.
- `com.google.ar:core` is not an app dependency.
- The app module does not apply `kotlin-android` and does not set `kotlinOptions`.
- `FormaVisionDepthPlugin.kt` is still on disk and was not edited.
- `AndroidManifest.xml` no longer has `com.google.ar.core` meta-data or `android.hardware.camera.ar`. Those two entries were the Prompt 210c depth booster. Camera permission and `android.hardware.camera` stay, because meal photos, body-progress photos, body scans, and supplement labels still use the camera.

`:app:assembleDebug` after this hold: **BUILD SUCCESSFUL** (exit 0), run from `viaconnect-web/android` with `ANDROID_HOME=/opt/android-sdk` as `./gradlew :app:assembleDebug --offline`. `:capacitor-health-connect:compileDebugKotlin` still ran. The debug APK has no `libarcore_*.so` and no `FormaVisionDepth` class. `aapt dump xmltree` of that APK shows no `com.google.ar.core` and no `android.hardware.camera.ar`.

`stripDebugDebugSymbols` still printed: "Unable to strip the following libraries, packaging them as they are: libimage_processing_util_jni.so, libsurface_util_jni.so." The NDK strip tool is not installed here. Those two are not ARCore.

On-device depth is **deferred** with the FormaVision rebuild. It is not an open check for this PR.

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

Result after the depth hold: **BUILD SUCCESSFUL** (exit 0), including a later `./gradlew :app:assembleDebug --offline` once ARCore and the app-module Kotlin plugin were removed. Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (about 26 MB). It is signed with the debug keystore, not a Play upload key. The APK does not contain ARCore native libraries.

`npx cap sync android` was run so the gitignored `android/capacitor-cordova-android-plugins` directory existed. It did not change tracked files. A clean checkout still needs `npx cap sync android` before Gradle, same as after the Capacitor 8 upgrade.

16 KB zip alignment on that debug APK:

```bash
"$ANDROID_HOME/build-tools/36.0.0/zipalign" -c -P 16 -v 4 \
  app/build/outputs/apk/debug/app-debug.apk
```

Exit 0, last line `Verification successful`, on the debug APK from before the depth hold and again on the APK built after ARCore was removed. This is the debug APK only. A release AAB was not built, and this was not a device check.

## iOS

### FormaVision

Depth on iOS is on hold with the Android plugin. `ios/App/App/FormaVisionDepthPlugin.swift` and `FormaVisionDepthPluginBridge.m` are still on disk. `project.pbxproj` does not list either file. This change does not add them. `AppDelegate.swift` does not reference them.

`src/lib/arnold/scanning/depth/formaVisionDepth.ts` still calls `registerPlugin('FormaVisionDepth')`. `probeDepthCapability` and `captureDepthFrame` catch a missing bridge and return false or null. Device behavior of that catch is **deferred** with the FormaVision rebuild.

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

- Before this HealthKit pass: both said "ViaConnect". The share string said the app reads heart rate, HRV, sleep, steps, and body composition to personalize the Bio Optimization Score, and that health data is never used for advertising. The update string said ViaConnect does not write health samples and that the key exists for plugin compatibility.
- After: the share string is the draft below. `NSHealthUpdateUsageDescription` is removed. Both edits are **DRAFT, pending Lex/Gary approval**.

The old share sentence is wider than the only HealthKit query in the app, and it names a Bio Optimization Score effect that `health-client.ts` does not implement. The old update sentence is the wrong place to disclose a write the app does not perform. See the inventory below.

`NSMotionUsageDescription` was not edited. It still says motion is used to stabilize the body-scan camera and is not transmitted. `ScanExperience.tsx` calls `DeviceOrientationEvent.requestPermission` on the body-scan start tap. The orientation-unavailable `LevelBubble` in that file is passed `beta={0}` and `gamma={0}`. A full trace of live tilt values was not done. **UNVERIFIED** whether the current sentence matches what the scan does with motion.

`ITSAppUsesNonExemptEncryption` is still absent. See Decisions.

### HealthKit entitlement (A10)

`ios/App/App/App.entitlements` is unchanged:

- `com.apple.developer.healthkit` = true
- `com.apple.developer.healthkit.access` = empty array

Gary decided on 2026-10-02 that the first release depends on Apple Health data, so this entitlement stays **on**. That is a product decision. It is not a device test. Authorization and sample reads were not run on an iPhone. **UNVERIFIED** on device.

The entitlement turns the HealthKit capability on. It does not list quantity or category types. The empty `healthkit.access` array does not declare clinical-record types. Individual sample types are requested at runtime, if the native plugin maps them.

## HealthKit data types

Checked 2026-10-03 against `viaconnect-web` TypeScript, `@perfood/capacitor-healthkit` 1.3.2 (the copy in `node_modules`), `ios/App/App/App.entitlements`, and `ios/App/App/Info.plist`. No Swift, Java, or Kotlin file under `ios/` or `android/` calls `HKHealthStore` or Health Connect. The only native HealthKit calls are inside the npm package.

### Read authorization requested in app code

`src/lib/wearables/health-client.ts` `requestHealthPermissions` calls `requestAuthorization` with `write: []` and `all: []`, and this `read` list (lines 45-57). `src/components/body-tracker/HumeSetupFlow.tsx` `grantPermissions` (line 33) is the caller. This path is not behind `native_health_bridge`.

| String passed | HealthKit type it names |
|---|---|
| `HKQuantityTypeIdentifierHeartRate` | heart rate |
| `HKQuantityTypeIdentifierRestingHeartRate` | resting heart rate |
| `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | heart rate variability (SDNN) |
| `HKCategoryTypeIdentifierSleepAnalysis` | sleep analysis |
| `HKQuantityTypeIdentifierRespiratoryRate` | respiratory rate |
| `HKQuantityTypeIdentifierOxygenSaturation` | oxygen saturation |
| `HKQuantityTypeIdentifierStepCount` | step count |
| `HKQuantityTypeIdentifierActiveEnergyBurned` | active energy |
| `HKQuantityTypeIdentifierBodyMass` | body mass |
| `HKQuantityTypeIdentifierBodyFatPercentage` | body fat percentage |
| `HKQuantityTypeIdentifierLeanBodyMass` | lean body mass |

The plugin does not map those strings. `CapacitorHealthkitPlugin.swift` `getTypes` (lines 84-129) accepts short names such as `heartRate`, `steps`, and `weight`. It has no case for an `HKQuantityTypeIdentifier…` or `HKCategoryTypeIdentifier…` string, and no case for heart-rate variability or lean body mass. `requestAuthorization` (lines 520-523) builds the HealthKit set from `getTypes`. For this read list the native read set is empty. That is what the plugin source does. It was not observed on a device. **UNVERIFIED.**

### Sample actually queried

`syncHealthSamples` in the same file (lines 100-104) calls `queryHKitSampleType` with `sampleName: "stepCount"`, a 7-day anchor when none is stored, and `limit: 100`. `getSampleType` maps `stepCount` to `HKQuantityTypeIdentifier.stepCount` (plugin Swift lines 39-40). No other sample name is queried. Returned rows are posted to `POST /api/integrations/health-sync` with `source: "health_kit"`. `HumeSetupFlow.tsx` `firstSync` (line 51) is the caller.

### Write

No HealthKit sample is saved.

`src/lib/formavision/health/healthBridge.ts` `IosHealthBridge.requestWritePermissions` (lines 177-180) calls `requestAuthorization` with `read: []` and `write: [SampleNames.WEIGHT, SampleNames.BODY_FAT]`. Those plugin names are `weight` and `bodyFat`, which `getTypes` maps to body mass and body fat percentage. The following comment mentions lean body mass and does not pass it. `writeBodyComposition` (lines 225-227) throws. The plugin Swift file has no `HKHealthStore.save`.

`syncHealthData` in `healthSync.ts` (line 249) returns before that bridge when `native_health_bridge` is off. The flag defaults to false (`src/lib/config/feature-flags.ts` lines 45-48). A search of `src/**/*.{ts,tsx}` found no screen that imports `syncHealthData`. The only calls are in `src/lib/formavision/health/__tests__/healthSync.test.ts`.

`checkGrants` (lines 202-206) calls `isEditionAuthorized` for `weight`, `bodyFat`, and the string `leanBodyMass`. The plugin rejects `leanBodyMass` (`getSampleType` default, lines 79-80). That call checks sharing authorization. It does not write a sample.

### Declared, not requested as a HealthKit type list

| Place | What it declares |
|---|---|
| `App.entitlements` | HealthKit capability on. `healthkit.access` is an empty array. No quantity types. No clinical records. |
| `Info.plist` `NSHealthShareUsageDescription` | Purpose string only. It is not the type list Apple shows from `requestAuthorization`. |
| `Info.plist` | `NSHealthUpdateUsageDescription` removed in this change. See the draft below. |
| `src/lib/integrations/appRegistry.ts` | Catalog copy lists Steps, Workouts, Sleep, HRV, and Heart Rate for `apple_health`. That array is not a HealthKit request. |
| `src/lib/body-tracker/connected-sources/apple-health-xml.ts` | Parses an export file the user uploads. It is not an `HKHealthStore` read. Body mass, body fat percentage, lean body mass, and BMI are always mapped (lines 7-11). Sleep, step count, active energy, HRV, and resting heart rate are mapped only when wearable PHI consent is on (lines 14-19). The zip branch of `src/app/api/body-tracker/connected-sources/apple-health/parse/route.ts` (lines 39-44 and 207) keeps only the four body types. |

### Proposed minimum for launch

**Proposal only. Not implemented. Lex/Gary have not approved it.**

Apple rejects a HealthKit request that asks for types the app does not use. The only HealthKit sample this app queries is step count. The proposed launch set is:

- Read: step count (`HKQuantityTypeIdentifierStepCount`) only.
- Write: none.

Do not request heart rate, resting heart rate, HRV, sleep, respiratory rate, oxygen saturation, active energy, body mass, body fat percentage, or lean body mass until a caller queries them. The uploaded Apple Health export stays a file import. It does not need those types on the HealthKit permission sheet.

The JS read list above is wider than this proposal. This change does not edit that list.

## Draft HealthKit purpose strings

**DRAFT for Lex/Gary. Not an approved App Store string.** The share string is in `Info.plist` so the binary is not left on the old Bio Optimization Score sentence. The comment in that file says approval is still pending.

`NSHealthShareUsageDescription` (in `Info.plist` now):

> ViaConnect reads your step count from Apple Health when you choose to connect it, and stores that activity with your account. This data is not used for advertising.

That sentence matches the only query. It does not mention the Bio Optimization Score. `health-client.ts` does not apply steps to that score. "Not used for advertising" matches this path: the health client, `POST /api/integrations/health-sync`, and the Apple Health XML parser do not call an ads SDK. Ads outside this repo are still **UNCONFIRMED** (`privacy-answers.md` item 21).

`NSHealthUpdateUsageDescription` should be **omitted**. This build does not write an Apple Health sample. The key was removed from `Info.plist` for that reason.

Before any build calls `IosHealthBridge.requestWritePermissions`, review that write list. It asks for body mass and body fat percentage, and `writeBodyComposition` still throws. If that request stays, put the update key back only with wording Lex/Gary approve. A draft for that case, not in the plist:

> ViaConnect asks to save your body weight and body-fat percentage in Apple Health after a body scan. This version does not save those samples.

## HealthKit plugin risk

`package.json` depends on `@perfood/capacitor-healthkit` `^1.3.2` and `capacitor-health-connect` `^0.7.0`. This change does not edit `package.json` or the lockfile, and it does not add a plugin.

npm registry, queried 2026-10-03:

| Package | Latest version on npm | Published | `peerDependencies` |
|---|---|---|---|
| `@perfood/capacitor-healthkit` | 1.3.2 (stable). Also 2.0.0-alpha.0, alpha.1, alpha.2 | 1.3.2 on 2025-02-13. alpha.2 on 2023-10-11. Package `modified` 2025-02-13 | 1.3.2: `@capacitor/core` `^4.0.0`. alpha.2: `^5.0.0` |
| `capacitor-health-connect` | 0.7.0 | 2024-08-29. Package `modified` 2024-08-29 | `@capacitor/core` `^5.0.0` |

There is no `@perfood/capacitor-healthkit` version whose peer is Capacitor 6, 7, or 8. npm does not mark a package maintained or abandoned. The version list is the record: the 2.0.0 alpha line stopped on 2023-10-11, and 1.3.2 on 2025-02-13 is the newest publish.

The published 1.3.2 tarball has `PerfoodCapacitorHealthkit.podspec` and `ios/Plugin/`. It has no `Package.swift`. `ios/App/Podfile` already has `pod 'PerfoodCapacitorHealthkit'`. `pod install` and `xcodebuild` were not run. This machine has no `pod` and no `xcodebuild`. Whether 1.3.2 compiles against Capacitor 8 on iOS is **UNVERIFIED**.

`capacitor-health-connect` 0.7.0 did compile: `:capacitor-health-connect:compileDebugKotlin` completed inside `:app:assembleDebug` after the Kotlin alignment in this branch. That is Android. It is not a HealthKit result. Health Connect stays off unless `NEXT_PUBLIC_HEALTH_CONNECT_ENABLED` is `1` and the server `HEALTH_CONNECT_ENABLED` is `1`.

Other npm packages, same query. Not installed. Peers are from `npm view`:

| Package | Version | Published | Peer `@capacitor/core` |
|---|---|---|---|
| `@capgo/capacitor-health` | 8.11.4 | 2026-09-22 | `>=8.0.0` |
| `capacitor-health` | 8.4.0 | 2026-09-23 | `>=8.0.0` |
| `@capacitor/health-fitness` | 1.0.1 | 2026-08-19 | `>=8.0.0` |
| `@flomentumsolutions/capacitor-health-extended` | 0.8.3 | 2026-02-05 | `>=8.0.0` |
| `@devmaxime/capacitor-healthkit` | 1.1.4 | 2025-10-30 | `^7.0.0` |
| `@johnjasonhudson/capacitor-healthkit` | 1.3.0 | 2025-03-07 | `^7.0.1` |
| `@followathletics/capacitor-healthkit` | 1.3.7 | 2024-11-27 | `^6.0.0` |
| `@hassankbrian/capacitor-healthkit` | 1.3.7 | 2025-12-09 | `^4.0.0` |

`@followathletics/capacitor-healthkit` and `@hassankbrian/capacitor-healthkit` list `github.com/perfood/capacitor-healthkit` as their repository URL on npm. Their peers are not Capacitor 8.

### Options

None of these are implemented.

1. **Keep 1.3.2 and Health Connect 0.7.0.** No package change. Android Health Connect already compiled on this branch. The iOS pod is declared and was not built. The app's read strings do not match `getTypes`, so the permission call does not ask for the 11 types the JS names. The plugin cannot request HRV or lean body mass at all. Effort to stay: none. Effort to make the current plugin request step count: a small JS change from the HK identifier to the plugin name `steps`, still on a Capacitor 4 peer, still unverified on device.
2. **Move to a Capacitor 8 package from the table above.** `@capgo/capacitor-health` 8.11.4, `capacitor-health` 8.4.0, and `@capacitor/health-fitness` 1.0.1 all peer `@capacitor/core` `>=8.0.0` and were published in 2026. This needs a `package.json` and lockfile change, a new Podfile entry, and a rewrite of `health-client.ts` to that plugin's API. Out of scope for this PR. Their read and write surfaces were not audited type by type.
3. **Small in-repo Swift plugin, read-only, step count only.** A Capacitor plugin in this repo that calls `HKHealthStore` for `HKQuantityTypeIdentifierStepCount` and does not request write. No new npm package. The permission sheet can match the proposed minimum. Android Health Connect stays on 0.7.0 and behind its flag. Effort is one Swift plugin, its registration, and a thin TypeScript wrapper, then a device test. The other 10 JS read types stay unused until someone adds them on purpose.

**Recommendation: option 3.** The first release depends on Apple Health, and the only sample the app queries is step count. Option 1 does not map the current read list and has no Capacitor 8 release. Option 2 is a new dependency this PR is not allowed to add, and it would be the wrong first step if launch only needs steps. If the launch set grows past step count, revisit option 2 and rewrite the purpose string before submitting. Do not ship the 11-type JS list as the permission request.

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
2. **HealthKit entitlement (A10).** Decided on 2026-10-02: keep it on. The first release depends on Apple Health data. On-device reads are still **UNVERIFIED**.
3. **Health purpose strings.** Approve or replace the draft `NSHealthShareUsageDescription` in `Info.plist`. `NSHealthUpdateUsageDescription` is omitted because no Apple Health sample is saved. Approve that omission, or restore the key with the draft in the HealthKit section if the write request in `healthBridge.ts` will ship. The proposed read set is step count only. That proposal is not implemented.
4. **Motion string.** Confirm or replace `NSMotionUsageDescription` before submission. It was not changed.
5. **Camera string and barcodes.** Confirm the new camera and photo-library sentences. They do not mention barcode scanning, because no live camera barcode path was found. If a scanner is turned back on, the camera string has to say so.
6. **Play upload key (G5).** Create the upload keystore as above, enroll in Play App Signing, and set the four `VIA_UPLOAD_*` values outside the repo. Then run `bundleRelease`. `versionCode` is still 1 and `minifyEnabled` is still false.
7. **Cross-platform Android backup.** Cloud backup and device transfer are excluded. Android 16 cross-platform transfer to iOS is not configured, because that block needs the Apple team id. Provide the team id if that mode should be turned off explicitly, or accept the gap.
8. **16 KB pages.** `zipalign -c -P 16` succeeded on the debug APK built after ARCore was removed. Re-check the signed release AAB. That debug APK does not package `libarcore_*.so`.

**Deferred with the FormaVision rebuild.** Android and iOS depth capture are on hold. Do not device-test ARCore or ARKit depth for this PR. `FormaVisionDepthPlugin.kt` stays on disk and is not in the debug APK. The Swift plugin stays out of the Xcode target. Wire both again only when the rebuild is ready.

## UNVERIFIED

- Xcode 26 archive and `pod install`
- Install and launch on an iPhone or an Android device
- HealthKit authorization and sample reads (entitlement stays on by the 2026-10-02 decision; not run on a device)
- Whether `@perfood/capacitor-healthkit` 1.3.2's pod compiles against Capacitor 8 (`pod install` and `xcodebuild` were not run)
- Whether the motion and HealthKit purpose sentences match what a reviewer sees in use
- FormaVision depth (ARCore and ARKit) is **deferred**, not an open device check for this PR
- Signed release AAB and Play App Signing enrollment
- `zipalign` on a release AAB (the debug APK check did pass)
- NDK symbol stripping (the strip tool was absent; libraries were packaged as-is)
- Android 16 cross-platform backup behavior when that XML section is absent
