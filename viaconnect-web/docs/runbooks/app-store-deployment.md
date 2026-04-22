# App Store Deployment Runbook

End-to-end path for shipping ViaConnect GeneX360 to Apple App Store + Google Play Store via Capacitor. Strategy: **hosted-web shell** — the native app loads https://viaconnectapp.com inside a WebView so auth, Hannah AI, and every SSR route work identically to the production web experience.

This runbook is additive to the web deploy path, not a replacement. Every push to `main` still deploys the web app via Vercel; the mobile shells package the web-view wrapper and route back to that same production URL.

## Prerequisites

### Developer accounts
- **Apple Developer Program** ($99/yr): https://developer.apple.com/programs/. Required for TestFlight + App Store submission.
- **Google Play Console** ($25 one-time): https://play.google.com/console/. Required for Play Store submission.

### Local toolchain
- **Xcode 15+** (macOS only — hard dependency). iOS builds require Apple's SDK which only ships with Xcode.
- **Android Studio** (cross-platform). Installs the Android SDK + emulators.
- **Node 20+** matching the web project.

### Credentials + signing
- Apple signing certificate + provisioning profile (managed in Xcode via the Developer account).
- Android upload keystore (generate once with `keytool`; store in 1Password).
- Neither credential goes in this repo.

## First-time setup (one-off, only run once)

After `npm install` pulls the Capacitor deps approved in this commit:

```bash
# 1. Create the native iOS project
npx cap add ios
# 2. Create the native Android project
npx cap add android
# 3. Sync the web config into both
npx cap sync
```

Both `add` commands scaffold `ios/` and `android/` directories at the repo root. These are **committed** to the repo — they contain the native project configuration (Xcode project file, Gradle config, Info.plist, AndroidManifest.xml). They are not build artifacts.

### Icon + splash-screen generation

Drop two source assets into the repo root and let `@capacitor/assets` generate every platform-specific size:

```bash
# Source files required:
#   assets/icon.png       1024 × 1024, full-bleed app icon (PNG with alpha)
#   assets/splash.png     2732 × 2732, centered brand mark on
#                         solid #0B1120 background
# Drop both, then:
npm run cap:assets
# Generates:
#   ios/App/App/Assets.xcassets/AppIcon.appiconset/*
#   ios/App/App/Assets.xcassets/Splash.imageset/*
#   android/app/src/main/res/mipmap-*/ic_launcher.png
#   android/app/src/main/res/drawable*/splash.png
```

### PWA manifest icons

`public/manifest.json` references `/icons/icon-192.png`, `/icons/icon-512.png`, and `/icons/icon-512-maskable.png`. These are separate from the Capacitor assets (which go to native). Add them once:

```
public/icons/icon-192.png              192 × 192
public/icons/icon-512.png              512 × 512
public/icons/icon-512-maskable.png     512 × 512, with safe-zone padding
                                       (content fits within center 80%)
```

A maskable icon needs a design that still reads correctly when Android crops it to a circle / squircle / rounded-square shape. Use https://maskable.app/editor to preview.

## Regular sync flow (after every web change that affects native config)

```bash
# Pull the latest web config into the native projects.
npm run cap:sync
```

Because the app is a hosted-web shell pointing at viaconnectapp.com, **most web changes do NOT need a native resync**. Only run `cap:sync` when:
- `capacitor.config.ts` changes
- Capacitor plugin versions change in `package.json`
- `public/manifest.json` changes
- You switch the `server.url` target

## Local dev: run the native shell against your laptop's dev server

```bash
# In terminal 1: Next.js dev server on laptop
npm run dev

# Find laptop's LAN IP (e.g., 192.168.1.42)
ipconfig              # Windows
ifconfig              # macOS / Linux

# In terminal 2: point Capacitor at the LAN dev server temporarily
# Edit capacitor.config.ts server.url to http://192.168.1.42:3000 then:
npm run cap:sync

# In terminal 3: open Xcode or Android Studio to run on a device
npm run cap:open:ios
npm run cap:open:android
```

**Remember to revert `server.url` back to `https://viaconnectapp.com` before committing** — dev-LAN URLs must never ship to TestFlight.

## iOS submission path (TestFlight → App Store)

1. `npm run cap:open:ios` — launches Xcode with the ViaConnect project.
2. In Xcode, select a real device or Any iOS Device (arm64) target.
3. Product → Archive. The archive uploads to App Store Connect.
4. On https://appstoreconnect.apple.com, assign the build to TestFlight, invite internal testers.
5. After internal QA, submit the same build for App Store review.
6. Review takes 24–48 hours for health apps. Be prepared for reviewer questions about HIPAA-adjacent data handling, genetic data retention policies, and the Bio Optimization score methodology. Have the `/docs/legal/` package ready.

### iOS review gotchas (ViaConnect-specific)
- **Genetic testing copy**: anything that claims to diagnose or prescribe will be rejected. Keep wording in the "wellness optimization" lane.
- **In-app purchases**: Stripe checkout runs inside the WebView. Apple's guideline 3.1.1 requires IAP for digital goods — but supplement + testing product sales are physical / services, exempt. Have the physical-goods argument documented.
- **Privacy disclosure**: App Store Connect → App Privacy must declare every data type the Supabase tables collect. The Supabase advisor output covers this; map it to the App Store privacy taxonomy before submission.

## Android submission path (Internal testing → Play Store)

1. `npm run cap:open:android` — launches Android Studio.
2. Build → Generate Signed Bundle / APK. Choose Android App Bundle (AAB, not APK).
3. Upload to https://play.google.com/console → Internal testing track first.
4. Pass through Closed → Open → Production tracks.
5. Google's review is typically faster (hours to a few days). Play Store has its own privacy & medical disclaimers flow — the Data Safety section parallels Apple's App Privacy.

### Android-specific
- Minimum SDK: Capacitor 6 targets API 23+ (Android 6.0). Play Console requires API 34+ for target.
- Deep links: add an `intent-filter` for `viaconnectapp.com` in `android/app/src/main/AndroidManifest.xml`. Then host the Digital Asset Links file at `https://viaconnectapp.com/.well-known/assetlinks.json`.

## Deep linking (both platforms)

Deep links let `viaconnectapp.com/protocols/abc123` open the app directly on devices where the app is installed. Two things must line up:

1. **iOS**: add Associated Domains entitlement `applinks:viaconnectapp.com` in Xcode. Host `https://viaconnectapp.com/.well-known/apple-app-site-association` (JSON, specific format).
2. **Android**: add the intent-filter noted above + host `https://viaconnectapp.com/.well-known/assetlinks.json`.

These `.well-known` files are tiny static JSON — add them to `public/.well-known/` in the Next.js repo. Vercel serves them as-is.

## Update cycle

- **Web change** (most changes) → Vercel deploy → users see it on next refresh. No app-store submission needed.
- **Capacitor config change / plugin version bump** → `cap:sync` + re-archive + re-submit to TestFlight + Play Internal. Then through review.
- **Native asset change** (new icon, splash) → `cap:assets` + `cap:sync` + re-archive.

Because 95 % of changes are web-only, the app-store release cadence is gated by the web release cadence, not the store review cycle.

## Answered decisions (Prompt #117, 2026-04-22)

The 5 questions that blocked `npx cap add ios` are closed. Each entry records the decision, the rationale, and where the value is wired in so a future change has one place to edit.

### 1. Bundle ID / Application ID

**Decision:** `com.farmceutica.viaconnect`

**Rationale:**
- Reverse-DNS convention; matches parent entity FarmCeutica Wellness LLC.
- Distinct namespace from any future CedarGrowth portal app.
- 25 characters, well inside iOS (155) and Android (255) limits.

**Wired at:**
- `capacitor.config.ts` → `appId`
- `ios/App/App.xcodeproj` (auto-generated from `appId` at `cap add ios` time)
- `android/app/build.gradle` → `applicationId`

**Irrevocable after first submission.** Changing the bundle ID post-submission means a new store listing from scratch (lost reviews, ratings, downloads). Confirmed before `cap add` runs.

### 2. Display name + short name

**Decision:** `ViaConnect` for both. 10 characters; well under the ~12-character truncation threshold both stores apply to home-screen labels.

**Wired at:**
- `capacitor.config.ts` → `appName`
- `ios/App/App/Info.plist` → `CFBundleDisplayName`
- `android/app/src/main/res/values/strings.xml` → `<string name="app_name">ViaConnect</string>`

Localization (Spanish, Mandarin for practitioner B2B) deferred to post-launch sprint; additive, no resubmission required.

### 3. Developer account identifiers

**Apple Developer Program:**
- Account type: **Business / Organization** (required for Medical category; see §5)
- Team ID: look up at https://developer.apple.com/account → Membership → Team ID. 10-character alphanumeric. Paste into this runbook once enrolled.
- Annual cost: $99 USD
- Enrollment check: verify status before first TestFlight upload. Medical-category first-submission verification can take 24-72 hours or longer.
- D-U-N-S number for FarmCeutica Wellness LLC required during enrollment.

**Google Play Console:**
- Developer identity: FarmCeutica Wellness LLC (organization account)
- Package name must match `com.farmceutica.viaconnect` exactly.
- One-time cost: $25 USD
- Identity verification (gov-issued ID + proof of address) must be complete before first upload.

### 4. Minimum OS versions + push notification strategy

**iOS minimum: 15.0**
- Covers 95%+ of active Apple devices as of 2026.
- Enables modern SwiftUI bridges, async/await native integration, and the WKWebView features Capacitor 7 assumes.
- Wired at: `ios/App/Podfile` (`platform :ios, '15.0'`) + Xcode target General tab.

**Android minimum: API 24 (Android 7.0 Nougat)**
- Covers 97%+ of active Android devices per Play Console distribution data.
- Enables Web App Manifest support, modern TLS, file-provider APIs.
- Wired at: `android/variables.gradle` → `minSdkVersion = 24`.

**Push notifications: deferred to Phase 2.**
- APNs requires a `.p8` key from Apple Developer (one-time download; cannot re-download if lost).
- FCM requires a Firebase project + `google-services.json` in `android/app/` + notification channel registration.
- Neither is blocking for first submission. Schedule: add before Month 2 of public launch.

### 5. Privacy, support, marketing URLs + store category + age rating

**Required URLs** (must resolve with real content before submission; both stores reject empty pages):

| Purpose | URL |
|---|---|
| Privacy Policy | https://via-connect2026.vercel.app/legal/privacy |
| Terms of Service | https://via-connect2026.vercel.app/legal/terms |
| Support | https://via-connect2026.vercel.app/support (or mailto:support@farmceutica.com) |
| Marketing | https://via-connect2026.vercel.app |

**Store category:**
- **iOS primary: Medical.** Secondary: Health & Fitness. Medical triggers expanded App Review (budget 2-5 extra business days for first-time health submissions) and requires the Business/Organization Apple Developer account from §3. More accurate than Health & Fitness given the clinical protocol tooling. Fallback: Health & Fitness primary with "clinical tools" positioning if Medical review creates schedule risk.
- **Android: Health & Fitness** top-level (Play has no standalone Medical category), sub-category **Medical Services & Information**.

**Age rating:**
- **iOS: 17+.** App Store Review Guideline 1.4.1 triggers this for treatment information, medication interaction guidance, and peptide protocols. CAQ output qualifies.
- **Google Play: Mature 17+.** Same reasoning plus Retatrutide injectable reference triggers drug/medication content flags.

**HIPAA posture:**
- Positioned as HIPAA-covered for PHI surfaces; supporting BAAs in place:
  - Supabase BAA (from Prompt #88 Hannah/Tavus integration)
  - Vercel HIPAA-ready deployment config
  - Anthropic Claude API BAA (verify coverage in App Store privacy disclosure)
- Both stores increasingly audit BAA coverage for health apps; be prepared to document.

### Adjacent decisions (recorded for completeness)

- **Version numbering:** semver `MAJOR.MINOR.PATCH`, starting at `1.0.0`. Android `versionCode` auto-increments per upload; iOS `CFBundleVersion` must increment monotonically.
- **Code signing (iOS):** Automatic for local dev; Manual with a downloaded distribution provisioning profile for App Store uploads.
- **Code signing (Android):** release keystore generated once, stored OUTSIDE the repo (1Password). `*.keystore` in `.gitignore`. Keystore loss means no future updates on Play Store; back up to a secure vault.
- **TestFlight / Internal Testing group:** Gary, Dr. Dagher (Medical Director), Thomas Rosengren (CTO) first. Expand to Domenic Romeo (CFO) and Steve Rica (Compliance) for external TestFlight round.
- **Deep link scheme:** `viaconnect://` for basic in-app URL handling. Universal Links + App Links deferred to Phase 2 (require hosting `apple-app-site-association` + `assetlinks.json` at `public/.well-known/`).
- **Hannah Avatar / Tavus CVI:** per Prompt #88, runs inside the PWA via Tavus. Native shell needs no special handling; Capacitor WebView passes the Tavus session through. BAA gating stays at the API layer.

### Webpack / Capacitor strategy note

`capacitor.config.ts` uses `webDir: 'public'` with `server.url: 'https://viaconnectapp.com'` — the hosted-web shell strategy (web changes ship via Vercel; most updates skip store review). Prompt #117 §5.3 shows a sample with `webDir: '.next'`; that would be correct for a static-export strategy. We stay with hosted-web as approved in the preceding commit batch (commit `be3a5ee`).

## Support scripts (registered in package.json)

- `npm run cap:sync` — sync web config to native
- `npm run cap:open:ios` — open Xcode
- `npm run cap:open:android` — open Android Studio
- `npm run cap:assets` — regenerate icons + splash from `assets/icon.png` + `assets/splash.png`

## Brand-asset generator scripts (added 2026-04-22)

- `node scripts/generate-app-store-assets.mjs` — produces `assets/icon.png` (1024x1024) and `assets/splash.png` (2732x2732) from ViaConnect design tokens. Deterministic, re-runnable.
- `node scripts/generate-pwa-icons.mjs` — fallback PWA icon generator if `@capacitor/assets` skips `public/icons/`. Derives all three (192, 512, 512-maskable) from `assets/icon.png`.

Both scripts require `sharp` as a devDependency. Prompt #117 §3.4 flags this as the one additive package.json edit needing explicit approval before `npm install --save-dev sharp` runs.
