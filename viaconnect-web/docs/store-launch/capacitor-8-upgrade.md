# Capacitor 8 upgrade (VIA-7)

Date checked: 2026-10-03. Branch is a draft. Nothing was merged or deployed.

Authorization recorded in the task: Gary Ferenczi, 2026-10-02, via Ellis. The change is limited to the Capacitor shell in `viaconnect-web`. `viaconnect-mobile` was not edited. Bundle ID remains `com.farmceutica.viaconnect`.

## What the guides actually require

The audit pointed at https://capacitorjs.com/docs/updating/8-0 and summarized target/compile SDK 36, Xcode 26, iOS 15, Node 22, and 16 KB pages. Those pages were re-read before editing.

The 8.0 page is titled **Updating from Capacitor 7 to Capacitor 8**. This repo was on Capacitor 6, so the 6-to-7 page (https://capacitorjs.com/docs/updating/7-0) was also read. Where the two pages set a number, the 8.0 value was used.

Confirmed on the 8.0 page, and unchanged in the Capacitor 8.5.2 Android template that ships with the CLI:

| Item | 8.0 guide | This upgrade |
|---|---|---|
| Node.js | 22 or greater | Used Node v22.14.0 |
| Xcode | 26.0 or greater | Not installed here |
| iOS deployment target | 15.0 | Set in the Podfile and in all four `IPHONEOS_DEPLOYMENT_TARGET` entries |
| `minSdkVersion` | 24 (the new minimum) | **26.** See the difference below |
| `compileSdkVersion` / `targetSdkVersion` | 36 / 36 | 36 / 36 |
| Android Gradle Plugin | 8.13.0 | 8.13.0 |
| Gradle wrapper | 8.14.3 | 8.14.3 |
| Google Services classpath | 4.4.4 | 4.4.4 |
| Android Studio | Otter \| 2025.2.1 or newer | Not installed. Command-line SDK platform 36 and build-tools 36.0.0 were used for the Gradle attempt |
| JDK | Not restated on the 8.0 page. The 7.0 page requires JDK 21. The 8.5.2 CLI refuses to treat a JDK below 21 as safe | OpenJDK 21.0.10 |

16 KB page size is **not** in the Capacitor 8.0 guide. It remains a Google Play requirement (audit G4, https://developer.android.com/guide/practices/page-sizes). Nothing in this upgrade checks or claims 16 KB alignment.

`npx cap migrate` from `@capacitor/cli` 8.5.2 was not used. That command stops when the installed core major is below 7, and when it does run it executes `npm update`, which would move unrelated dependencies. The native edits were applied by hand to match the 8.0 steps and the 8.5.2 templates, then `npx cap sync android` and `npx cap sync ios` were run.

Latest 8.x on npm on 2026-10-03 is **8.5.2**, not 8.0.0. The 8.0 page says to install `@capacitor/cli@latest`. The 8.5 page (https://capacitorjs.com/docs/updating/8-5) is an extra iOS change that the 8.0 page does not mention. It was applied because 8.5.2 is what `latest` installs. See UIScene below.

## Version table

Resolved versions are from `package-lock.json` before and after. Ranges are what `package.json` declares.

| Package | package.json before | Resolved before | package.json after | Resolved after |
|---|---|---|---|---|
| `@capacitor/core` | `^6.2.0` | 6.2.1 | `^8.5.2` | 8.5.2 |
| `@capacitor/cli` | `^6.2.0` | 6.2.1 | `^8.5.2` | 8.5.2 |
| `@capacitor/ios` | `^6.2.0` | 6.2.1 | `^8.5.2` | 8.5.2 |
| `@capacitor/android` | `^6.2.0` | 6.2.1 | `^8.5.2` | 8.5.2 |
| `@capacitor/app` | `^6.0.2` | 6.0.3 | `^8.1.2` | 8.1.2 |
| `@capacitor/camera` | `^6.1.2` | 6.1.3 | `^8.2.5` | 8.2.5 |
| `@capacitor/splash-screen` | `^6.0.3` | 6.0.4 | `^8.0.2` | 8.0.2 |
| `@capacitor/status-bar` | `^6.0.2` | 6.0.3 | `^8.0.4` | 8.0.4 |
| `@capacitor-community/speech-recognition` | `^6.0.0` | 6.0.1 | `^7.0.1` | 7.0.1 |
| `@perfood/capacitor-healthkit` | `^1.3.2` | 1.3.2 | unchanged | 1.3.2 |
| `capacitor-health-connect` | `^0.7.0` | 0.7.0 | unchanged | 0.7.0 |
| `@capacitor/assets` | `^3.0.5` | 3.0.5 | unchanged | 3.0.5 |

Speech recognition has no 8.x release. 6.0.1 peers `@capacitor/core` `^6.0.0`, which excludes Capacitor 8. 7.0.1 peers `>=7.0.0`, which includes 8. The methods this app calls (`available`, `checkPermissions`, `requestPermissions`, `addListener('partialResults')`, `start`, `stop`) have the same signatures in the 6.0.1 and 7.0.1 type definitions. No application source change was required for that bump.

`@perfood/capacitor-healthkit` 1.3.2 peers `@capacitor/core` `^4.0.0`. The only newer tags are `2.0.0-alpha.0` through `2.0.0-alpha.2`, and alpha.2 peers `^5.0.0`. There is no Capacitor 8 release. It was left at 1.3.2. `.npmrc` already sets `legacy-peer-deps=true`, so install did not fail on that peer.

`capacitor-health-connect` 0.7.0 is the newest release and peers `@capacitor/core` `^5.0.0`. It was left at 0.7.0. `cap sync` now compiles it into the Android project. That is what makes `assembleDebug` fail. See verification.

Lockfile changes outside those packages are transitive dependencies of the new Capacitor CLI (`glob`, `minimatch`, `signal-exit`, and related packages). No other direct dependency range was changed.

## Native project changes

Android, from the 8.5.2 template and the 8.0 page:

- `android/variables.gradle` set to the 8.5.2 values, except `minSdkVersion = 26`.
- `android/build.gradle`: Android Gradle Plugin 8.13.0, Google Services 4.4.4.
- `android/app/build.gradle`: `namespace`, `compileSdk`, and `ignoreAssetsPattern` use `=` assignment, as the 8.0 page requires. Application id is still `com.farmceutica.viaconnect`.
- `android/gradle/wrapper/gradle-wrapper.properties`, `gradle-wrapper.jar`, `gradlew`, and `gradlew.bat` updated by `./gradlew wrapper --distribution-type all --gradle-version 8.14.3`.
- `AndroidManifest.xml` activity `configChanges` is now `orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density`. The 7.0 page adds `navigation` (it calls that optional). The project was still on the Capacitor 6 string, which did not include `navigation`. The 8.0 page adds `density`. The combined string matches the 8.5.2 template.
- `npx cap sync android` rewrote `android/app/capacitor.build.gradle` and `android/capacitor.settings.gradle`. Java compatibility in the generated file is 21 (it was 17). Android plugins now listed: speech-recognition 7.0.1, app 8.1.2, camera 8.2.5, splash-screen 8.0.2, status-bar 8.0.4, capacitor-health-connect 0.7.0.

`minSdk` difference: the guide's minimum is 24. After sync, `:app:processDebugMainManifest` failed because `androidx.health.connect:connect-client:1.1.0-alpha02` (pulled in by the already-installed `capacitor-health-connect` 0.7.0) declares minSdk 26. 26 is above the Capacitor 8 floor. It was set so the manifest can merge. Dropping Health Connect out of the Android project would be required to stay on 24. That plugin is already in `package.json`, and sync is supposed to include it, so it was not removed.

Camera's Android module defaults `androidxExifInterfaceVersion` to 1.4.1 and `androidxMaterialVersion` to 1.13.0 when the app does not override them. Those match the 8.0 camera notes. They were not copied into `variables.gradle` because the 8.5.2 template does not define them and the migrator only rewrites them when they are already present.

The app module does not apply the Kotlin plugin and does not set `kotlin_version`. The 8.0 page says to set Kotlin to 2.2.20 **if the project is using Kotlin**. The camera plugin sets Kotlin 2.2.20 inside its own module. `FormaVisionDepthPlugin.kt` is still unwired. Adding a root Kotlin plugin and an ARCore dependency would be the VIA-8 depth-plugin fix, so it was not done.

iOS:

- `ios/App/Podfile` platform is `15.0`.
- `npx cap sync ios` rewrote the plugin list. CocoaPods is not installed on this machine, so pod install was skipped. `xcodebuild` is not installed, so the clean step was skipped. iOS plugins now listed: speech-recognition 7.0.1, app 8.1.2, camera 8.2.5, splash-screen 8.0.2, status-bar 8.0.4, `@perfood/capacitor-healthkit` 1.3.2.
- Deployment target 15.0 in the project and the App target (Debug and Release).
- UIScene, from the 8.5 guide only: `ios/App/App/SceneDelegate.swift` copied from the 8.5.2 CocoaPods template, `configurationForConnecting` added to `AppDelegate.swift` to match that template, `UIApplicationSceneManifest` added to `Info.plist` with the same keys as the template (`Default Configuration`, `$(PRODUCT_MODULE_NAME).SceneDelegate`, storyboard `Main`). `SceneDelegate.swift` is registered in the App target sources. The 8.5 page says the core library still runs on the AppDelegate path, and that the scene manifest is what Xcode 27 needs. Xcode 26 is the 8.0 requirement. This was still applied because the installed CLI is 8.5.2.

`capacitor.config.ts` did not need an edit. It does not set `bundledWebRuntime`, `adjustMarginsForEdgeToEdge`, or `appendUserAgent`. Those are the config breaks named on the 7.0 and 8.0 pages.

`PrivacyInfo.xcprivacy` from merged PR #257 was left in place. It was not added again and not removed.

The existing CocoaPods iOS app was kept. The 8.0 page says new `npx cap add ios` projects default to Swift Package Manager. That only matters if the `ios` folder is deleted and recreated.

## Verification

Ran on this machine:

| Check | Result |
|---|---|
| `node -v` | v22.14.0 |
| `java -version` | OpenJDK 21.0.10 |
| `npm run build` (`next build`) in `viaconnect-web` | Exit 0 |
| `npm run lint` (`eslint .`) | Exit 2 before linting files. ESLint 8.57.1 throws `TypeError: Converting circular structure to JSON` while loading `.eslintrc.json` (`next/core-web-vitals`, `next/typescript`). The lockfile diff contains no ESLint package changes. `eslint-plugin-react` is still 7.37.5. Treated as pre-existing |
| `npx vitest run` | 1239 files passed, 5 skipped, 15 failed. 15077 tests passed, 50 skipped, 17 failed. See below |
| CI shop subset (the `npx vitest run` shop globs in `.github/workflows/ci.yml`) | Exit 0. 37 files, 228 tests passed |
| `npx cap sync android` | Exit 0. Six Android plugins listed above |
| `npx cap sync ios` | Exit 0, with the CocoaPods and `xcodebuild` warnings above |
| `./gradlew wrapper --gradle-version 8.14.3 --distribution-type all` | Exit 0 |
| `./gradlew :app:assembleDebug` with SDK platform 36 and build-tools 36.0.0 | **Failed.** See UNVERIFIED |

`npx vitest run` failures that this upgrade caused were the frozen `package.json` SHA-256 pins in:

- `src/app/__tests__/brief-44-homepage-wearable-feed.test.ts`
- `src/app/__tests__/brief-45-homepage-one-job.test.ts`
- `src/components/body-tracker/connections/__tests__/brief-57-bos-plasma.test.ts`

Those pins were updated to `fb8bfd3ae8ddd59c3bcc38292866d4d10d2e3b8d37eb00d9c3d4291e399aea01`. After that, the brief-45 file passes. Brief 44 still fails on `src/lib/body-tracker/wearable-tiles.ts`. Brief 57 still fails on `src/lib/scoring/hannah-bos.ts`. This diff does not touch those files.

The other failing files also do not appear in this diff (`tests/consumer-mock-sweep.test.ts`, `tests/204/legal-routes.test.ts`, `src/app/__tests__/brief-36-helix-404.test.ts`, `src/lib/__tests__/location-legacy-grep.test.ts`, `tests/dashboard/bos-card/bos-card-marshall.test.ts`, `src/components/dashboard/__tests__/dashboardLogYourMeal219e.test.ts`, `src/lib/agents/__tests__/prompt214dGaps.test.ts`, `src/lib/dashboard/__tests__/brief-50-home-ia.test.ts`, `src/lib/genetics/__tests__/brief19Honesty.test.ts`, `src/lib/labs/__tests__/rythmHealthLabPath.test.ts`, `src/lib/peptides/__tests__/prompt226dWaveA.test.ts`, `src/lib/practitioner/__tests__/live-roster.test.ts`). They fail on the current `origin/main` sources (`d14286c2`). They were not "fixed" here.

Android `assembleDebug` details:

1. With no SDK, Gradle stopped at `SDK location not found`.
2. After installing command-line platform `android-36` and build-tools `36.0.0` (not committed; `local.properties` is gitignored), the manifest merger failed: app minSdk 24 is lower than `androidx.health.connect:connect-client:1.1.0-alpha02` minSdk 26.
3. With `minSdkVersion = 26`, the build failed at `:capacitor-health-connect:compileDebugKotlin`: `Unknown Kotlin JVM target: 21`. That plugin's own `build.gradle` pins Kotlin `1.8.20`. Capacitor 8 compiles the app module as Java 21. No APK was produced.
4. A diagnostic run, not part of this commit, temporarily removed only the Health Connect lines from the two generated Gradle files and then restored them. In that run, `:capacitor-android:compileDebugJavaWithJavac`, `:capacitor-app:compileDebugJavaWithJavac`, `:capacitor-camera:compileDebugKotlin`, speech-recognition, splash-screen, and status-bar compile tasks completed, and `:app:compileDebugJavaWithJavac` failed with one error: `MainActivity.java` cannot find `FormaVisionDepthPlugin`. That class is the unwired Kotlin file. It was not fixed.

## UNVERIFIED

These were not run. Gary or CI should run them on a Mac with Xcode 26 and on an Android SDK that can produce an APK.

```bash
cd viaconnect-web
node -v   # must be 22 or newer before any cap command

npx cap sync ios
cd ios/App
pod install
cd ../..

xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath /tmp/ViaConnect.xcarchive archive
```

Then install that archive on a physical iPhone and confirm launch, pause/resume, and a cold and warm custom-URL open. The 8.5 page lists those checks. This environment has no Xcode, no CocoaPods, and no device.

```bash
cd viaconnect-web/android
# ANDROID_HOME must point at an SDK with platforms;android-36
./gradlew :app:assembleDebug
```

That command fails today for the two reasons above (Health Connect Kotlin 1.8.20 versus JVM 21, then `FormaVisionDepthPlugin` if Health Connect is skipped). After those are fixed, check 16 KB alignment on the APK. The Capacitor 8.0 guide does not mention it. Google's page is https://developer.android.com/guide/practices/page-sizes. A starting command, once an APK exists:

```bash
"$ANDROID_HOME/build-tools/36.0.0/zipalign" -c -P 16 -v 4 \
  app/build/outputs/apk/debug/app-debug.apk
```

The installed npm packages for Capacitor, speech recognition, and Health Connect contain no `.so` files. `@capacitor/camera` 8.2.5 depends on the Maven artifact `io.ionic.libs:ioncamera-android:1.0.2`, which was not unpacked. ARCore is referenced by `FormaVisionDepthPlugin.kt` and is not a Gradle dependency, so it is not in this build. Neither the camera AAR nor ARCore was checked for 16 KB ELF alignment.

Also not verified: Android Studio Otter (or newer), a physical Android device, and an Xcode 26 or Xcode 27 archive.

## Follow-ups (not done)

VIA-8 items left as they were:

- `Info.plist` still has `UIRequiredDeviceCapabilities` `armv7`, the "does not use your location" string, and HealthKit strings that say "ViaCura".
- `NSPhotoLibraryUsageDescription` and `ITSAppUsesNonExemptEncryption` are still absent from the Capacitor `Info.plist`.
- `FormaVisionDepthPlugin.swift` is still not in the Xcode target. `FormaVisionDepthPlugin.kt` is still not compiled. `MainActivity.java` still calls `registerPlugin(FormaVisionDepthPlugin.class)`. There is still no Kotlin Gradle plugin and no `com.google.ar:core` dependency on the app module.
- `android:allowBackup="true"` was not changed.
- There is still no signing config or keystore in the repo.

Other notes:

- `docs/store-launch/privacy-answers.md` still says Camera, speech recognition, and HealthKit are missing from the Podfile. After this sync they are in the Podfile. That document was not edited.
- GitHub Actions `web-check` uses Node 20. Capacitor 8 CLI commands need Node 22. `npm run build` does not run the Capacitor CLI. The workflow file was not changed.
- Merged PR #257 already added `viaconnect-web/ios/App/App/PrivacyInfo.xcprivacy` and edited `project.pbxproj`. This branch starts from that merge. It edits `project.pbxproj` again (deployment target 15.0 and `SceneDelegate.swift`) and edits `Info.plist` (scene manifest only). A branch that also edits those files can conflict. `PrivacyInfo.xcprivacy` itself was not modified.

## Rollback

Revert this branch. That restores Capacitor 6.2.1, the previous plugin list in `capacitor.build.gradle`, `capacitor.settings.gradle`, and the Podfile, iOS deployment target 13.0, Android SDK 34, minSdk 22, Gradle 8.2.1, and AGP 8.2.1.

No migration, no `vercel.json` edit, no Supabase email template edit, and no data change is part of this branch. Rollback does not need a database step.

After revert, run `npm install` in `viaconnect-web` so `node_modules` matches the restored lockfile, then `npx cap sync` only if you are returning to the Capacitor 6 native projects on purpose.
