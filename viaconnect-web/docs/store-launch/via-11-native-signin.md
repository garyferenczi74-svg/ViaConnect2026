# Native Google and Apple sign-in (VIA-11)

Date checked: 2026-10-03. Branch `cursor/via-11-native-oauth-2fef`. Draft only. Nothing was merged or deployed. Supabase data was not changed. No migration was applied. Supabase email templates were not edited. `vercel.json` was not edited.

This is the hosted Capacitor 8.5.2 shell. `server.url` is `https://viaconnectapp.com`. Bundle ID remains `com.farmceutica.viaconnect`, from `capacitor.config.ts` `appId`. That id is the custom URL scheme. `ios.scheme` in the same file is `ViaConnect`. That value is the local content scheme. It is not the OAuth callback.

FormaVision depth (ARKit / ARCore) stays on hold, as recorded in `docs/store-launch/native-projects-fixes.md` and `docs/store-launch/via-9-native-features.md`. This change does not register those plugins.

The store rules this work traces to:

- Apple [App Review Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services) (Login Services). Google sign-in sets up or authenticates the primary account, so an equivalent login must be offered beside it. The equivalent login limits collection to name and email, can hide the email, and does not collect app interactions for advertising without consent. Sign in with Apple is that option. The login screen already shows Apple next to Google. This change keeps that pair and runs both through the same path.
- Apple [5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) (Account Sign-In). Email and password stay available. Social sign-in is not the only way in. This change does not add a new store of social-network tokens.
- Apple [5.1.1(vii)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage). `SFSafariViewController` must be visible and must not be hidden. `@capacitor/browser` presents `SFSafariViewController` on iOS. The Sign in with Apple entitlement is not added. That entitlement is for the native AuthenticationServices API. This design uses the Supabase Apple provider in the browser (the web flow).
- Google [OAuth 2.0 policy, Use secure browsers](https://developers.google.com/identity/protocols/oauth2/policies#browser). A Google OAuth request must not be sent to an embedded user-agent the app controls. Embedded WebViews are blocked with `disallowed_useragent`. Google documents that block in [Upcoming security changes to Google's OAuth 2.0 authorization endpoint in embedded webviews](https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/). Chrome Custom Tabs are the remediation Google describes for Android. `@capacitor/browser` opens a Custom Tab on Android and `SFSafariViewController` on iOS.
- Audit blocker 14, section 3.2, checklist A5 and G18. `allowNavigation` still does not include Google or Apple hosts. Those hosts stay outside the WebView on purpose. Adding them would not satisfy the secure-browser rule.

## Flow

```
User taps Google or Apple on /login
        |
        v
Capacitor.isNativePlatform()?
        |
   no --+-- yes
   |         |
   |         v
   |    NEXT_PUBLIC_NATIVE_OAUTH_SYSTEM_BROWSER
   |    is 0, false, or off?
   |         |
   |    yes --+-- no (default on the shell)
   |    |          |
   v    v          v
In-page signInWithOAuth          signInWithOAuth with
redirectTo =                     skipBrowserRedirect
{origin}/api/auth/callback       redirectTo =
(same call the web app           com.farmceutica.viaconnect://auth/callback
uses today)                      PKCE verifier stays in this WebView
   |                                  |
   v                                  v
Browser follows the provider     @capacitor/browser Browser.open
inside the current page          (Custom Tab / SFSafariViewController)
                                      |
                                      v
                                 Google or Apple, then Supabase,
                                 then the custom scheme with ?code=
                                      |
                                      v
                                 @capacitor/app appUrlOpen
                                 (or getLaunchUrl on a cold open)
                                      |
                                      v
                                 Browser.close
                                 exchangeCodeForSession in the WebView
                                      |
                                      v
                                 Land in the app.
                                 A safe in-app next path is used when
                                 /login had one. Otherwise /login,
                                 and middleware sends the session to
                                 the role home from profiles.role.
```

The left branch is also what runs when the native flag is off. That path is the one Google blocks. It exists so the flag can be turned off. It is not the default on the shell.

Email and password on `/login` still call `signInWithPassword`. That function was not changed.

`/signup` is email and password only. It does not offer Google, so an Apple button was not added there. Google on `/login` can already create an account, and Apple is beside it on that screen. Adding Google to signup would change the web signup flow (consent, role, profile, and the email code). That was left for Gary. See Decisions.

Cancel and failure responses become one of these sentences. Provider error text is not shown.

- Sign-in was cancelled. You can try again.
- Google or Apple could not finish sign-in. Try again, or use email and password.
- Google or Apple could not start sign-in. Try again, or use email and password.
- The sign-in page could not open. Try again, or use email and password.
- Sign-in did not finish. Try again, or use email and password.

Closing the system browser without a redirect does not show an error. The login screen is still there.

## Flag

`native_oauth_system_browser` is in `src/lib/config/feature-flags.ts` with registry default `false`. `isFeatureEnabled` therefore stays off unless `NATIVE_OAUTH_SYSTEM_BROWSER` is `true` or `1`. The login screen does not use that helper.

The shell uses `nativeSystemBrowserOAuthEnabled` in `src/lib/auth/native-oauth.ts`:

| Where | `NEXT_PUBLIC_NATIVE_OAUTH_SYSTEM_BROWSER` | Result |
|---|---|---|
| Web | unset, `0`, or `1` | In-page redirect. The flag cannot move web sign-in into the system browser. |
| Native shell | unset, empty, `1`, or `true` | System browser. This is the default because the WebView path is blocked. |
| Native shell | `0`, `false`, or `off` | In-page redirect. That is the broken WebView path. |

The client reads `NEXT_PUBLIC_NATIVE_OAUTH_SYSTEM_BROWSER` because the login page is a client component. A server-only variable would not reach it.

## Package

Verified against the npm registry on 2026-10-03. Capacitor core in this repo is 8.5.2.

| Package | Requested | Peer | Why this one |
|---|---|---|---|
| `@capacitor/browser` | `^8.0.5` (latest 8.0.5 on the Capacitor 8 line) | `@capacitor/core` `>=8.0.0` | Official Capacitor browser plugin. It opens a Chrome Custom Tab on Android and `SFSafariViewController` on iOS. Gary authorised this package only. No other dependency was added. |

`@capacitor/app` was already installed. `appUrlOpen` and `getLaunchUrl` come from that plugin. `AppDelegate` and `SceneDelegate` already forward open-URL events to the Capacitor proxies. This change does not edit those files.

## Files changed

| File | Change |
|---|---|
| `package.json`, `package-lock.json` | `@capacitor/browser` only |
| `src/lib/auth/native-oauth.ts` | Redirect builder, callback parser, native-vs-web branch, PKCE return |
| `src/lib/auth/__tests__/native-oauth.test.ts` | Vitest for those three |
| `src/components/auth/SocialSignInButtons.tsx` | Google and Apple buttons. Same labels and layout as the old login buttons |
| `src/components/native/NativeOAuthReturn.tsx` | `appUrlOpen` / `getLaunchUrl`, close the browser, exchange the code |
| `src/lib/providers.tsx` | Mounts the return listener for the whole shell |
| `src/app/(auth)/login/page.tsx` | Social buttons call the shared starter. Email and password are unchanged |
| `src/lib/config/feature-flags.ts` | Flag entry. Registry default false |
| `capacitor.config.ts` | Comment only. `allowNavigation` is unchanged |
| `ios/App/App/Info.plist` | `CFBundleURLTypes` for `com.farmceutica.viaconnect` |
| `android/app/src/main/AndroidManifest.xml` | VIEW intent filter, host `auth`, path prefix `/callback` |
| `android/app/src/main/res/values/strings.xml` | Comment on `custom_url_scheme`. The value was already the app id |
| Native plugin lists from `npx cap sync` | `@capacitor/browser` registered. FormaVision depth is not registered |

`ios/App/App/App.entitlements` was not given `com.apple.developer.applesignin`.

The native return exchanges the code in the WebView with `exchangeCodeForSession`. It does not call `/api/auth/callback`. That route still serves the web redirect, including its `audit_logs` insert. A native sign-in does not run that insert. Password sign-in does not run it either. The session cookies are written by the browser Supabase client, which is the same client password sign-in uses. Middleware then reads `profiles.role`.

## Gary's setup checklist

Do these outside the repo. This change does not edit the Supabase project, Auth URL configuration, or email templates.

### Supabase Auth URL allow list

In the Supabase dashboard for project `nnhkcufyqjojdbvdrpky` (ViaConnect2026), Authentication, URL configuration, add this redirect URL exactly:

`com.farmceutica.viaconnect://auth/callback`

Keep the existing web callback, including `https://viaconnectapp.com/api/auth/callback` and the `www` host if that host is already allowed. The custom scheme is an additional entry. Without it, Supabase will not redirect back into the app.

### Apple provider (still Unknown in the 2026-10-01 audit)

Supabase Authentication, Providers, Apple. The web flow needs:

1. Services ID (this is the client id, not the bundle id).
2. Team ID.
3. Key ID.
4. Sign in with Apple private key (`.p8`).
5. The Services ID return URL registered at Apple is the Supabase callback, `https://nnhkcufyqjojdbvdrpky.supabase.co/auth/v1/callback`. It is not the custom scheme. The custom scheme is only the Supabase redirect allow-list entry above.

The app target does not need the Sign in with Apple capability for this design. Add `com.apple.developer.applesignin` only if a later change calls AuthenticationServices on the device.

Account deletion already has a server revoke path in `src/lib/account/apple-revoke.ts`. It runs when Apple identity and the Apple env vars are present. This ticket does not change that path. Apple's account-deletion note says a Sign in with Apple app should revoke the token. That revoke still depends on the env vars Gary sets.

### Google OAuth client

Keep the client Supabase uses as a **Web application** client.

- Authorized redirect URI: `https://nnhkcufyqjojdbvdrpky.supabase.co/auth/v1/callback`.
- Do not put `com.farmceutica.viaconnect://auth/callback` on the Google client. Google redirects to Supabase. Supabase redirects to the custom scheme.
- Do not create an Android or iOS Google client for this design. Those client types belong to a native Google Sign-In SDK. This design does not use that SDK.
- The system browser satisfies Google's secure-browser rule. The WebView does not, which is why `allowNavigation` was not expanded to `accounts.google.com`.

## App Review notes

Paste this with the notes already in `docs/store-launch/app-review-notes-draft.md` after Gary approves the wording.

On iPhone and iPad, Sign in with Apple is on the sign-in screen next to Google. Both open in the visible Safari view, then return to the app. Email and password are on the same screen. The app does not use the native Sign in with Apple entitlement. Account creation with email remains available. If Google or Apple sign-in is cancelled, the reviewer can use email and password.

## Decisions needed from Gary

1. Add `com.farmceutica.viaconnect://auth/callback` to the Supabase Auth redirect allow list. This branch cannot do that.
2. Confirm the Apple provider in Supabase (Services ID, Team ID, Key ID, `.p8`) and the Services ID return URL. The 2026-10-01 audit marked this Unknown.
3. Confirm the Google Cloud OAuth client stays a Web client whose redirect URI is the Supabase callback.
4. Say if `/signup` should also show Google and Apple. It does not show Google today. Email and password signup was left as it is. Login already shows both.
5. Say if native OAuth should also insert the `oauth_login` row that `/api/auth/callback` writes. This path exchanges the code in the WebView and does not call that route.
6. The shell defaults the system browser on. Set `NEXT_PUBLIC_NATIVE_OAUTH_SYSTEM_BROWSER=0` only if you need the old in-WebView attempt. That attempt is what Google blocks.

## Verified and unverified

| Check | Result |
|---|---|
| npm peer for `@capacitor/browser` | Verified on the registry: 8.0.5 peers `@capacitor/core` `>=8.0.0`. |
| Vitest `src/lib/auth/__tests__/native-oauth.test.ts` | Verified. 1 file, 17 tests passed. Covers the redirect builder, the callback parser, and native-vs-web branching. |
| `npx tsc --noEmit` | The project still reports pre-existing errors (374 lines, exit 2). None of those lines are in the files this change adds or edits. |
| `npx cap sync` | Verified, exit 0. Android lists 10 plugins, including `@capacitor/browser@8.0.5`. iOS lists 9 plugins, including that package, and does not list Health Connect. CocoaPods is not installed, so `pod install` was skipped. `xcodebuild` is not installed. |
| Google sign-in completing on a physical Android device | **UNVERIFIED.** |
| Google sign-in completing on a physical iPhone | **UNVERIFIED.** |
| Sign in with Apple completing on a physical iPhone | **UNVERIFIED.** |
| Apple provider configured in Supabase | **UNVERIFIED.** Audit section 3.2. |
| Supabase redirect allow list contains the custom scheme | **UNVERIFIED.** Not edited from this environment. |
| Google Cloud OAuth client type and redirect URI | **UNVERIFIED.** |
| Apple Services ID, key, Team ID, and return URL | **UNVERIFIED.** |
| `SFSafariViewController` and Chrome Custom Tabs hand the custom scheme back to the app on device | **UNVERIFIED.** The URL is registered in `Info.plist` and `AndroidManifest.xml`. No device was available. |
| PKCE verifier still present if the OS kills the WebView before the return | **UNVERIFIED.** |
| `pod install` and an Xcode archive | **UNVERIFIED.** CocoaPods and `xcodebuild` are not installed here. `cap sync` updated the Podfile and skipped `pod install`. |
| FormaVision depth | On hold. Not part of this check. |
