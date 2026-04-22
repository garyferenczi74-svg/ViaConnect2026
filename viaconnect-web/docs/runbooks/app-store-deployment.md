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

## Open questions to resolve before first submission

1. **Bundle ID**: `com.farmceutica.viaconnect` chosen in `capacitor.config.ts`. Confirm this matches the Apple Developer team identifier. If the FarmCeutica Apple account uses a different reverse-DNS, change it **before** `cap add ios` — changing later means re-creating the project.
2. **Display name**: `ViaConnect` on both stores, or `ViaConnect GeneX360`? The Capacitor `appName` is `ViaConnect`; App Store / Play Console names are set separately and should match the home-screen label users see.
3. **HIPAA posture**: is ViaConnect positioned as a HIPAA-covered entity or as a wellness tool? Affects the privacy disclosures on both stores and the legal copy in-app.
4. **Subscription model**: any recurring revenue on the app requires Apple's IAP (30 % fee) unless it's a "reader app" (not our category). Plan now.
5. **Brand assets**: who produces the 1024×1024 icon + splash?

## Support scripts (registered in package.json)

- `npm run cap:sync` — sync web config to native
- `npm run cap:open:ios` — open Xcode
- `npm run cap:open:android` — open Android Studio
- `npm run cap:assets` — regenerate icons + splash from `assets/icon.png` + `assets/splash.png`
