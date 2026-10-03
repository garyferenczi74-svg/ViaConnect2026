# Native features for store review (VIA-9)

Date checked: 2026-10-03. Branch `cursor/via-9-native-features-816c`. Draft only. Nothing was merged, deployed, or written to Supabase. No migration was applied. `vercel.json` and Supabase email templates were not edited.

This is the hosted Capacitor 8.5.2 shell. `server.url` is `https://viaconnectapp.com`. Bundle ID remains `com.farmceutica.viaconnect`.

Gary approved these v1 native features and authorised `package.json` and `package-lock.json` changes for the three plugins below, plus removal of `@perfood/capacitor-healthkit`. No other dependency was added. FormaVision depth (ARKit / ARCore) stays on hold, as recorded in `docs/store-launch/native-projects-fixes.md`.

The store rules this work traces to:

- Apple [App Review Guideline 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality) (Minimum Functionality): the binary has to do more than wrap a website.
- Apple 2.5.1 (software requirements, including HealthKit and Push Notifications capabilities).
- Apple 2.5.14 (camera use needs a clear indication).
- Apple 5.1.1(ii) (purpose strings must describe the use).
- Apple 5.1.1(iii) (request only data relevant to core functionality).
- Apple 5.1.3 and 5.1.3(i) (HealthKit: disclose the health data collected, and do not use it for advertising).
- Play [Spam and Minimum Functionality](https://support.google.com/googleplay/android-developer/answer/9899034) (a WebView of a site, with no native capability, is not enough).
- Play [User Data](https://support.google.com/googleplay/android-developer/answer/10144311) (explain why a permission is needed before the system prompt, and do not request it for an unused feature).
- Android 13 `POST_NOTIFICATIONS` (runtime permission for notifications).
- Play Health Connect is out of this release (audit G11). The Android client does not call it.

## Feature list

1. **App lock (Face ID or fingerprint).** Off until the signed-in user turns it on under Account, Notifications, On this device. On open and on resume, the native shell asks the biometric plugin. Failure or an unavailable sensor does not unlock the app with the device passcode. The user can sign out and use the existing password login at `/login`. Desktop shows the explanation and does not call the plugin. Preference key `viaconnect.biometric-lock.v1` is local only and is not health data.
2. **Device alerts.** Off until the user turns them on from the same screen, after the on-screen explanation. The OS prompt runs only after that tap. The token is stored on `notification_channel_credentials.apns_device_tokens` or `fcm_device_tokens`. This route does not send a notification. Turning alerts off clears the local opt-in. It does not delete the stored token. Desktop explains that registration happens in the app.
3. **Barcode entry.** Add Your Supplements and NutriVision accept a camera scan in the native shell and typed digits on desktop and mobile. Supplement resolve uses the existing `/api/caq/supplements/resolve` path. Meal lookup uses the existing `/api/nutrition/barcode/lookup` path. A scanned meal is saved through the existing text-entry draft path and marked scanned in the meal card.
4. **Offline screen.** `public/offline.html` is the Capacitor `server.errorPath`. When `https://viaconnectapp.com` cannot load, the shell shows that bundled page. Try again loads `https://viaconnectapp.com/` again. No new package.
5. **Apple Health step count, read only.** The in-repo Swift plugin `ViaConnectHealthKit` requests `HKQuantityTypeIdentifier.stepCount` and returns those samples. It does not save samples. The existing health client still posts samples to `/api/integrations/health-sync`. Android returns `health_connect_not_enabled` and does not import Health Connect from JavaScript.

## Packages

Verified against the npm registry and the lockfile on 2026-10-03. Capacitor core in this repo is 8.5.2.

| Package | Resolved | Why this one |
|---|---|---|
| `@capgo/capacitor-native-biometric` | 8.7.0 | Peer `@capacitor/core >=8.0.0`. Maintained (Cap-go, published 2026-09-28, MPL-2.0). Chosen over `@aparajita/capacitor-biometric-auth` 10.0.0, which also depends on Capacitor 8 but was last published 2026-02-09 and does not declare the same `>=8` peer. The Capgo web stub reports biometric success, so the app calls it only when `Capacitor.isNativePlatform()` is true, and it sets `useFallback: false` so a failed check does not accept the device passcode. |
| `@capacitor/push-notifications` | 8.1.3 | Official Capacitor plugin. Peer `@capacitor/core >=8.0.0`. MIT. |
| `@capacitor/barcode-scanner` | 3.1.2 | Official Capacitor plugin (`@capacitor/barcode-scanner` on the Capacitor 8 line). Peer `@capacitor/core >=8.0.0`. MIT. `@capacitor-community/barcode-scanner` 4.0.1 peers Capacitor 5 and was not used. |
| `@perfood/capacitor-healthkit` | removed | Unmaintained Capacitor 4 peer. It was not the step-count reader. Removal was authorised. |
| `capacitor-health-connect` | 0.7.0, unchanged | Still a dependency. `npx cap sync` still puts it on the Android classpath. JavaScript does not import it and does not request Health Connect permissions. Removing the package was not authorised. |

## Permissions, entitlements, and purpose strings

| Item | Value | Rule |
|---|---|---|
| `NSFaceIDUsageDescription` (added) | ViaConnect uses Face ID to unlock the app after you turn on the app lock. If Face ID does not succeed, you can sign in with your password. | Apple 5.1.1(ii). Required before Face ID. |
| `NSCameraUsageDescription` (barcode clause added; the VIA-8 sentence otherwise kept) | ViaConnect uses the camera to photograph meals, body-progress photos, body scans, and supplement labels, and to scan barcodes on supplements and packaged products. A photo is uploaded only after you choose to save it. | Apple 5.1.1(ii) and 2.5.14. Flagged because VIA-8 said the camera string must not claim barcode scanning. That claim is now true. |
| `NSHealthShareUsageDescription` (unchanged VIA-8 draft) | ViaConnect reads your step count from Apple Health when you choose to connect it, and stores that activity with your account. This data is not used for advertising. | Apple 5.1.1(ii) and 5.1.3(i). Still a draft pending Lex/Gary. |
| `NSHealthUpdateUsageDescription` | Still omitted. | This build does not save Health samples. Apple 5.1.1(iii) and 5.1.3(ii). |
| HealthKit entitlement | `com.apple.developer.healthkit` true. `com.apple.developer.healthkit.access` empty. | Apple 2.5.1 and 5.1.3. Kept from VIA-8. |
| `aps-environment` (added) | `development` | Apple Push Notifications capability, guideline 2.5.1. An App Store archive needs `production`. Entitlements cannot switch with a compile flag. See Gary. |
| `android.permission.POST_NOTIFICATIONS` (added) | Manifest permission. The OS prompt runs only after the in-app explanation. | Android 13. Play User Data. |
| `android.permission.USE_BIOMETRIC` (added) | Normal permission for BiometricPrompt. | Play User Data. App lock is opt-in. |
| Camera, internet, microphone | Unchanged. | Existing meal, label, and voice uses. |
| Health Connect permissions | Not added to the app manifest. | Play Health Connect / audit G11. Out of v1. |
| `server.errorPath` | `offline.html` | Apple 4.2 and Play Spam / Minimum Functionality. The binary includes its own offline screen. |

`google-services.json` is gitignored. `android/app/build.gradle` already applies `com.google.gms.google-services` only when that file has text. A debug or release compile without the file skips the plugin. Push registration then has nothing to deliver until Gary adds the file.

## App Review notes paragraph

Paste this into the VIA-12 reviewer notes after Gary approves the wording. It describes what the binary does beyond the hosted site.

ViaConnect is a Capacitor shell that loads https://viaconnectapp.com and also includes on-device features. After sign-in, Account then Notifications then On this device lets the reviewer turn on an optional app lock. The app then asks for Face ID or a fingerprint on each open and each return to the app. If that check does not succeed, the reviewer signs in again with the password. The same screen explains optional device alerts for order, shipping, and protocol notices, and only then shows the system notification prompt. Those alerts are not used for promotions. On iPhone, connecting Apple Health requests read access to step count only and does not write weight, body fat, or any other sample. Add Your Supplements and NutriVision can scan a supplement or packaged-product barcode with the camera, or the reviewer can type the digits. If the phone cannot reach https://viaconnectapp.com, the app shows its bundled offline screen with Try again. The camera is also used for meal photos, body-progress photos, body scans, and supplement labels. Depth capture is not in this build. Android does not read Health Connect in this version. A demo account is the one already described in `docs/store-launch/app-review-notes-draft.md`.

## Gary's setup steps

Do these outside the repo. Do not commit keys.

### Apple Push (APNs)

1. In the Apple Developer account for `com.farmceutica.viaconnect`, enable Push Notifications on the App ID.
2. Create an APNs authentication key (`.p8`). Record the Key ID and the Team ID. Store the `.p8` where the sender will live later. This change does not send notifications and does not add a sender.
3. Before an App Store archive, set `aps-environment` in `ios/App/App/App.entitlements` to `production`, or let Xcode's Push Notifications capability and the distribution profile set it. Leave `development` for local device builds. A distribution build signed with `development` will not receive production pushes.
4. On a Mac with Xcode 26, run `pod install` in `ios/App`, then archive. This environment did not have CocoaPods or `xcodebuild`.

### Firebase (Android FCM)

1. In the Firebase project for `com.farmceutica.viaconnect`, download `google-services.json`.
2. Place it at `viaconnect-web/android/app/google-services.json`. It is gitignored. Do not commit it.
3. The next Gradle build applies the Google Services plugin only because that file exists. Without it, the project still compiles and push delivery no-ops.
4. The Capacitor push plugin's default Firebase Messaging version is the plugin default (25.0.1 unless `android/variables.gradle` overrides it). This change does not override it.

### Play Console and App Store Connect

1. Play Data safety: declare the camera, notifications, and biometric use as implemented. Do not declare Health Connect data. Health Connect is not requested. Declare that notifications are optional and are not used for advertising.
2. App Store Connect privacy: step count is the only Apple Health type read, and it is not used for tracking or advertising. Face ID is used for app lock after opt-in. Camera use matches the purpose string, including barcodes.
3. App Review notes: use the paragraph above, plus the demo account already in `app-review-notes-draft.md`.
4. Do not claim HIPAA, SOC 2, or end-to-end encryption in listing text. This branch does not add those claims.
5. Export compliance `ITSAppUsesNonExemptEncryption` is still unset. That is the VIA-8 open item. This ticket does not set it.

### Meal barcode flag

`BARCODE_SCAN_ENABLED` stays default off (`readBarcodeFeatureFlags`). Meal barcode lookup returns unavailable until that environment variable is set. The NutriVision screen shows the server message. Supplement resolve is not behind that flag. Do not flip the default in code. Tests pin it to false.

## Decisions needed from Gary

1. Confirm `aps-environment` stays `development` in git until the archive, then becomes `production`.
2. Supply the APNs `.p8`, Key ID, and Team ID, and place `google-services.json` at the path above. Neither file is in this PR.
3. Health Connect: the npm package is still on the Android classpath. JavaScript does not call it. Removing `capacitor-health-connect` needs a further authorised `package.json` change if the APK must not contain the module.
4. Confirm the meal barcode kill switch stays off until the lookup provider is ready.
5. The camera purpose string now includes barcodes. Confirm that sentence. The Health share string is still the VIA-8 draft.
6. Turning device alerts off does not delete the stored token. Say if a delete path is required before submission.
7. Device tokens are stored on `notification_channel_credentials`, whose row key is the auth user id (`practitioner_id`). Consumers can have a row because the foreign key is `auth.users`. No new table was added. Confirm that store is acceptable for consumer devices.
8. Approve the App Review paragraph before it is pasted into App Store Connect.

## Verified and unverified

Commands were run on 2026-10-03 in this environment. No physical device and no Mac were available.

| Check | Result |
|---|---|
| npm peers for the three added plugins | Verified in the lockfile: each peers `@capacitor/core >=8.0.0`. Resolved versions are in the table above. `@perfood/capacitor-healthkit` is absent from `package.json`. |
| `npx vitest run` on `src/lib/native/__tests__/via9-native.test.ts`, `src/lib/formavision/health/__tests__/healthSync.test.ts`, and `src/lib/nutrition/barcode/__tests__/feature-flags.test.ts` | Verified. 3 files, 73 tests passed. |
| `npx tsc --noEmit` filtered to VIA-9 paths | No new errors in the native, health-client, device-token, or meal-draft files. Pre-existing `Cannot find namespace 'JSX'` remains in `SupplementCaptureBlock.tsx` (return types that already used `JSX.Element`; this diff does not touch those lines) and in NutriVision voice and camera files this change does not edit. |
| `npx cap sync` | Verified, exit 0. iOS lists 8 plugins, including barcode, push, and Capgo biometric, and does not list Perfood or Health Connect. Android lists 9 plugins, including those three and `capacitor-health-connect@0.7.0`. `errorPath` is `offline.html` in the generated native configs (those configs are gitignored and regenerated by sync). |
| `./gradlew :app:assembleDebug` | **UNVERIFIED.** `ANDROID_HOME` is unset, `android/local.properties` is absent, and no Android SDK (`android.jar` / `sdkmanager`) is on this machine. VIA-8 previously built with `ANDROID_HOME=/opt/android-sdk`. That SDK is not in this environment. |
| `pod install` | **UNVERIFIED.** CocoaPods is not installed. `cap sync` skipped it. |
| Xcode 26 archive / `xcodebuild` | **UNVERIFIED.** `xcodebuild` is not installed. Whether `ViaConnectBridgeViewController` (storyboard custom class, module `App`) loads is unconfirmed. |
| Face ID or fingerprint prompt, and fallback to `/login` | **UNVERIFIED.** Needs a physical device. |
| Push token delivery | **UNVERIFIED.** No APNs key and no `google-services.json`. `aps-environment` is `development`. |
| Barcode camera on a device | **UNVERIFIED.** The official plugin is wired. A physical camera scan was not run. |
| Meal lookup while the kill switch is off | The UI surfaces the server error. Not a device test. |
| 16 KB page alignment of the new barcode and biometric native libraries on a release AAB | **UNVERIFIED.** No release AAB was built. |
| Flash of the signed-in UI before the app-lock overlay | **UNVERIFIED.** The opt-in flag is read on the client after hydration. |
| iOS archive, App Store Connect upload, Play Console upload | **UNVERIFIED.** |

## What this change does not do

- It does not re-register FormaVision depth, ARCore, or the iOS depth plugin in the Xcode target.
- It does not send marketing or any other push from this route.
- It does not write Apple Health samples.
- It does not store protected health information in the biometric or push opt-in flags.
- It does not change Supabase schema. Token columns already exist on `notification_channel_credentials`.
