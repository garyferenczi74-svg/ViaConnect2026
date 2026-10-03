# Store privacy answers (draft)

Draft inputs for Apple App Privacy and Google Play Data Safety. Nothing in this file has been entered in App Store Connect or Play Console. It is not a legal determination. Items that the code or the 2026-10-01 audit do not settle are marked **UNCONFIRMED**.

Linear: VIA-13 (Viaconnect, label store-launch).

Sources used:

- Audit `app-store-play-audit-2026-10-01`, sections 2 item 12, 3.1, 5, and 10. That audit reviewed `main` at `860ad8e`.
- This tree is `main` at `d4e95580` (`feat(account): delete ViaConnect accounts in the app and on the web`, #255), which is after the audit commit.
- `viaconnect-web/package.json`, `viaconnect-web/package-lock.json`, `viaconnect-web/capacitor.config.ts`, `viaconnect-web/ios/App/Podfile`, and the app sources cited below.
- iOS plugin sources at the lockfile versions, unpacked only for this review and not added to the repo: `@capacitor/ios@6.2.1` (includes CapacitorCordova), `@capacitor/app@6.0.3`, `@capacitor/splash-screen@6.0.4`, `@capacitor/status-bar@6.0.3`, `@capacitor/camera@6.1.3`, `@capacitor-community/speech-recognition@6.0.1`, `@perfood/capacitor-healthkit@1.3.2`.

The Capacitor shell loads `https://viaconnectapp.com` (`capacitor.config.ts`). Collection described below is what that website's code stores or sends. The native projects are stale relative to `package.json` (audit blocker 5 / VIA-8). This change does not sync plugins, change signing, or edit `Info.plist`.

## Privacy manifest

File: `viaconnect-web/ios/App/App/PrivacyInfo.xcprivacy`, next to `Info.plist`.

It is in the Xcode **App** group and in the **Resources** build phase of `viaconnect-web/ios/App/App.xcodeproj/project.pbxproj` (file ref `B7C13A010203040506070802`, build file `B7C13A010203040506070801`). No other build setting was changed. Archive validation in Xcode was not run in this environment. **UNCONFIRMED** that a Mac archive accepts the manifest.

`NSPrivacyTracking` is `false`. `NSPrivacyTrackingDomains` is empty. No ad SDK is in `package.json`. `src/lib/analytics.ts` is a no-op. Middleware sets a first-party `vc_visitor_id` cookie for hero A/B assignment (`src/middleware.ts`). That cookie is not declared as tracking.

### Collected data types declared

Each row is linked to the user and is not used for tracking. Purpose strings are the Apple manifest values.

| Manifest type | Why it is declared | Purpose |
|---|---|---|
| Name | Profile `full_name` is read and saved (`src/app/(app)/(consumer)/account/profile/page.tsx`). | App Functionality |
| Email address | Supabase auth. Stripe Checkout is created with `customer_email: user.email` (`src/app/api/stripe/checkout/route.ts`). Shop checkout uses a Stripe Customer (`src/lib/shop/checkout-actions.ts`). | App Functionality |
| Phone number | Optional profile field. Empty input is stored as null (`src/app/(app)/(consumer)/account/profile/profile-save-payload.ts`). | App Functionality |
| Physical address | Account addresses (`src/app/(app)/(consumer)/account/addresses/page.tsx`). Shop checkout sets `shipping_address_collection` for US and CA (`src/lib/shop/checkout-actions.ts`). Order rows store `shipping_address_line1` (`src/lib/shop/checkout-helpers.ts`). | App Functionality |
| User ID | Supabase user id. Checkout metadata includes `user_id` (`src/app/api/stripe/checkout/route.ts`). Added beyond audit section 5 because the code stores it. | App Functionality |
| Health | Privacy policy section 4 lists health history, symptoms, labs, and body measurements. Advisor context sent to Anthropic includes symptoms, medications, supplements, allergies, and body metrics (`src/lib/jeffery/advisor-context-builder.ts`). | App Functionality, Product Personalization |
| Sensitive Info | Apple has no separate genetic type. This row is genetic information: privacy policy sections 4.1 and 5, and reads of `genetic_profiles` (`src/hooks/body-tracker/useUserCrossReferenceData.ts`). | App Functionality |
| Photos or Videos | Body photos in bucket `body-progress-photos` (`src/app/api/scan/prepare/route.ts`). Meal photos: NutriVision settings say the full image is sent for analysis and deleted after 24 hours unless the user opts in (`src/app/(app)/(consumer)/settings/nutrivision/page.tsx`). | App Functionality |
| Purchase History | Stripe Checkout sessions for shop orders and for membership `mode: subscription` (`src/app/api/stripe/checkout/route.ts`, `src/lib/shop/checkout-actions.ts`). | App Functionality |

Sensitive Info in this manifest means genetic information only. It is not a statement that race, religion, biometrics, or other sensitive subtypes are collected.

### Required-reason APIs

`NSPrivacyAccessedAPITypes` is empty. These symbols were searched and not found, so they are not declared:

- UserDefaults / NSUserDefaults
- File timestamp APIs (creation or modification date keys, `stat` / `getattrlist`)
- System boot time (`systemUptime`, `mach_absolute_time`, `boottime`, `sysctl`)
- Disk space (`volumeAvailableCapacity`, `NSFileSystemFreeSize`, `statfs`)

Where they were searched:

- App target Swift: `AppDelegate.swift` has no calls. `FormaVisionDepthPlugin.swift` is on disk and is not in the Sources build phase (only `AppDelegate.swift` is). A search of `viaconnect-web/ios` found none of the symbols.
- Pods the Xcode project actually links (`Podfile`): Capacitor and CapacitorCordova 6.2.1, App 6.0.3, Splash Screen 6.0.4, Status Bar 6.0.3. Capacitor 6.2.1 ships its own `PrivacyInfo.xcprivacy` with empty accessed-API and collected-data arrays. Its key-value store is files under Library (`KeyValueStore.swift`), not UserDefaults. `WebViewAssetHandler.swift` reads `fileSizeKey` for one local file. That is file size, not the disk-space API.
- Plugins in `package.json` that are **not** in the Podfile: Camera 6.1.3, speech recognition 6.0.1, `@perfood/capacitor-healthkit` 1.3.2. Their unpacked iOS sources also had none of the four API groups. Speech recognition uses `SFSpeechRecognizer`. HealthKit uses `HKHealthStore`. Camera writes to the photo library and copies image metadata, including an EXIF GPS dictionary when the asset has one (`CameraTypes.swift`). `capacitor-health-connect` 0.7.0 is an Android package and was not treated as an iOS required-reason source.

## (a) Apple App Privacy nutrition label

Enter these only after the confirmation list below is resolved. Tracking is off for every row. No row uses Third-Party Advertising, Developer Advertising, or Analytics. Analytics is omitted because `src/lib/analytics.ts` does not send events. Privacy policy section 6.1 still says analytics providers are used. That conflict is **UNCONFIRMED**.

| Data type | Collected | Linked to identity | Purposes | Evidence |
|---|---|---|---|---|
| Name | Yes | Yes | App Functionality | Profile save |
| Email address | Yes | Yes | App Functionality | Auth and Stripe |
| Phone number | Yes, when the user types one | Yes | App Functionality | Optional profile column |
| Physical address | Yes, when the user saves an address or completes shop shipping | Yes | App Functionality | Addresses page and shop checkout |
| User ID | Yes | Yes | App Functionality | Supabase user id and Stripe metadata |
| Health | Yes | Yes | App Functionality, Product Personalization | Policy section 4; advisor context |
| Fitness | **UNCONFIRMED** | **UNCONFIRMED** | **UNCONFIRMED** | See confirmation list. Not in the manifest. |
| Sensitive Info (genetic) | Yes | Yes | App Functionality | Policy sections 4.1 and 5; `genetic_profiles` |
| Photos or Videos | Yes | Yes | App Functionality | Body-progress and meal-photo paths |
| Audio Data | **UNCONFIRMED** | **UNCONFIRMED** | Meal editing if declared | See confirmation list. Not in the manifest. |
| Payment Info | Do not declare from this draft | — | — | Checkout uses Stripe. Policy section 4.1 says full card numbers are not stored on Farmceutica systems. |
| Purchase History | Yes | Yes | App Functionality | Stripe sessions and order rows |
| Precise Location | Do not declare from this draft | — | — | `NSLocationWhenInUseUsageDescription` says the app does not use location. Camera GPS is **UNCONFIRMED** and the camera plugin is not in the Podfile. |
| Coarse Location | **UNCONFIRMED** | **UNCONFIRMED** | **UNCONFIRMED** | Profile stores city, subdivision, and country. Not given its own manifest row. |
| Device ID | **UNCONFIRMED** | **UNCONFIRMED** | **UNCONFIRMED** | `vc_visitor_id` only. Not in the manifest. |
| Product Interaction | Do not declare | — | — | No analytics SDK call was found. |
| Crash Data, Performance Data, Other Diagnostic Data | **UNCONFIRMED** | **UNCONFIRMED** | **UNCONFIRMED** | Checkout writes `ip_address` onto `audit_logs`. No crash SDK was found in `package.json`. |
| Other Diagnostic / push token | **UNCONFIRMED** | **UNCONFIRMED** | Notifications if it ships | Not in the manifest. |

Contacts, browsing history, search history, emails or text messages, credit info, and advertising data were not found as collected categories. They are not in the manifest.

## (b) Google Play Data Safety

Ads declaration supported by this repo: no ad SDK in `package.json`. **UNCONFIRMED** if a tag is injected outside the repo.

Draft "shared" means the code sends the data to the named processor. Play's service-provider toggle still has to be chosen in Console. That control is **UNCONFIRMED**.

| Data | Collected | Shared with | Optional? | Purposes for the form | Ephemeral? |
|---|---|---|---|---|---|
| Name | Yes | Supabase. SendGrid only if a template includes the name (**UNCONFIRMED**). | **UNCONFIRMED** whether signup requires it | App functionality, Account management | No |
| Email address | Yes | Supabase. Stripe (`customer_email` or Customer). SendGrid when `SENDGRID_API_KEY` is set (`src/lib/api/email-service.ts`, `src/app/api/notifications/route.ts`, `src/lib/shop/launch-vote/email/send.ts`). | Required for an account | App functionality, Account management, Developer communications | No |
| Phone number | Yes if entered | Supabase | Optional. Empty becomes null | App functionality, Account management | No |
| Address | Yes if saved or shipped | Supabase. Stripe shop checkout collects shipping | Optional until a shipping checkout | App functionality | No |
| User IDs | Yes | Supabase. Stripe metadata `user_id` | Required for an account | App functionality, Account management | No |
| Health info | Yes | Supabase. Anthropic receives advisor context (symptoms, medications, supplements, allergies, body metrics) at `https://api.anthropic.com/v1/messages`, model `claude-sonnet-4-6` (`src/lib/jeffery/advisor-stream.ts`). | Required for those features | App functionality, Personalization | No |
| Fitness info | **UNCONFIRMED** | **UNCONFIRMED** | **UNCONFIRMED** | **UNCONFIRMED** | **UNCONFIRMED** |
| Genetic / sensitive info | Yes | Supabase. Privacy policy section 4.3 names laboratory partner Genemetric Inc for GENEX360 samples. | **UNCONFIRMED** whether every account has genetic data | App functionality | No |
| Photos | Yes | Supabase storage. Meal analysis uses Gemini (`src/lib/nutrition/gemini-client.ts`, `generativelanguage.googleapis.com`) and Claude vision (`src/lib/nutrition/vision/providers/claude-vision.ts`). | User chooses to photograph | App functionality | No. Meal-photo copy says server deletion after 24 hours unless the user keeps them |
| Voice or audio | Sent for transcription | Gemini model `gemini-2.0-flash` at `src/app/api/nutrition/voice/transcribe/route.ts` | User chooses voice edit | App functionality | Route sets `audio_retained: false` and says the buffer is not written to disk. Retention at Gemini is **UNCONFIRMED** |
| Purchase history | Yes | Stripe. Order rows in Supabase | Required to buy | App functionality | No |
| Payment card number | Not stored by this app, per policy section 4.1 | Stripe Checkout collects the card | — | — | **UNCONFIRMED** whether last4 or brand is stored after webhooks |
| Device or other IDs | **UNCONFIRMED** | **UNCONFIRMED** | — | — | `vc_visitor_id` is a random UUID cookie, max age 1 year, httpOnly, not written on `/api/*`. No code found here joins it to the user id |
| App interactions / analytics | Do not declare a third-party analytics SDK | — | — | — | `analytics.ts` is a no-op |
| Crash logs | Not found | — | — | — | No crash SDK in `package.json` |
| Files and docs (push token) | **UNCONFIRMED** | **UNCONFIRMED** | — | Notifications if enabled | See confirmation list |

Other processors evidenced in code, with limits:

- **Tavus** (`https://tavusapi.com/v2`, `src/lib/ai/hannah/avatar/tavus-client.ts`) can receive `conversational_context`. Flags `hannah_avatar_enabled` and `hannah_avatar_baa_confirmed` default to false (`src/lib/config/feature-flags.ts`). Production values are **UNCONFIRMED**.
- **Google Cloud Vision** `ImageAnnotatorClient` is used by Marshall counterfeit OCR (`src/lib/marshall/vision/ocr.ts`, called from `src/lib/marshall/vision/orchestrator.ts`). `runOcr` returns empty when credentials are absent. Whether production credentials are set is **UNCONFIRMED**. This path is product-image evaluation, not the meal-photo path above.
- **Vercel** hosts the site the shell loads (`capacitor.config.ts` `server.url`). Request logs were not inspected. What Vercel retains is **UNCONFIRMED**.
- Genetic data inside the Anthropic advisor prompt was not found in `advisor-context-builder.ts`. Whether any other AI call sends genotypes is **UNCONFIRMED**.

Security-related collection that is evidenced: `src/app/api/stripe/checkout/route.ts` inserts `audit_logs.ip_address` from `x-forwarded-for` with the user id. A Play purpose of fraud prevention, security, and compliance is a reasonable mapping for that field. The nutrition-label category for it is **UNCONFIRMED**.

Data deletion URL for the Data Safety form: `https://www.viaconnectapp.com/delete-account`.

## (c) Health apps declaration inputs

Play requires this declaration for every app. Draft from the features in this repo:

- The app has health features. Evidenced features: nutrition logging, body measurements, body-progress photos, labs and symptoms described in privacy policy section 4, genetic results, and advisor answers that use health context.
- Category that matches shipped web features: nutrition and weight management (meal logging, body measurements, progress photos).
- Activity and fitness, and sleep: see **HealthKit disclosure** below. The live HealthKit query reads step count only. The JS read list names more types, and the installed plugin does not map those strings. Sleep is parsed from an uploaded Apple Health export when wearable PHI consent is on. It is not a HealthKit API read. On-device HealthKit is **UNVERIFIED**.
- Health Connect: `isHealthConnectEnabled()` is true only when `NEXT_PUBLIC_HEALTH_CONNECT_ENABLED` is `1` (`src/lib/wearables/health-client.ts`). The audit (section 3.1 and G11) says Health Connect is not in the Android manifest. Draft answer for the current native project: Health Connect is not in the shipping manifest. The production env value is **UNCONFIRMED**.
- Medical device: in-app strings say the information is educational and not a substitute for professional medical advice (`src/lib/jeffery/advisor-stream.ts`). Whether the app is a medical device is **UNCONFIRMED** and is a legal answer.
- Medications are fields in advisor context and in the privacy policy's CAQ description. Whether that is Play's "medication and treatment management" category is **UNCONFIRMED**.
- Apple HealthKit entitlement stays on. Gary decided on 2026-10-02 that the first release depends on Apple Health data. `NSHealthShareUsageDescription` is a draft pending Lex/Gary approval. `NSHealthUpdateUsageDescription` is omitted. The HealthKit pod is in `ios/App/Podfile`. `pod install` was not run, so the Xcode link is **UNCONFIRMED**. On-device reads were not verified.

## HealthKit disclosure

DRAFT for the privacy forms. Gary decided on 2026-10-02 that the first release depends on Apple Health data, so `com.apple.developer.healthkit` stays true. On-device authorization and reads were not run. **UNVERIFIED.**

This section uses only what the code does. The type inventory and the proposed minimum (step count only, no write) are in `docs/store-launch/native-projects-fixes.md`. That minimum is a proposal. It is not what the JS read array contains today.

### Collected through the HealthKit API

`src/lib/wearables/health-client.ts` `syncHealthSamples` queries one sample name, `stepCount`, and posts the rows to `POST /api/integrations/health-sync`. That route stores them in `wearable_events` with the signed-in `user_id` when the batch is not empty. Empty batches do not mark the source connected.

The same file's `requestAuthorization` `read` array also names heart rate, resting heart rate, heart rate variability (SDNN), sleep analysis, respiratory rate, oxygen saturation, active energy, body mass, body fat percentage, and lean body mass, with `write: []`. `@perfood/capacitor-healthkit` 1.3.2 `getTypes` does not match those identifier strings, so that call does not add them to the native HealthKit set. They are not queried. Do not declare them as collected by the HealthKit API unless a device build shows otherwise. **UNCONFIRMED** on device.

No Apple Health sample is written. `IosHealthBridge.writeBodyComposition` throws. `NSHealthUpdateUsageDescription` is omitted. See the native-projects note for the unused write-authorization call.

`App.entitlements` `com.apple.developer.healthkit.access` is an empty array. Clinical health records are not declared.

### Collected from an uploaded Apple Health export

This is a file the user uploads. It is not an `HKHealthStore` read.

`src/lib/body-tracker/connected-sources/apple-health-xml.ts` always maps body mass, body fat percentage, lean body mass, and BMI. When wearable PHI consent is on, it also maps sleep analysis, step count, active energy, heart rate variability (SDNN), and resting heart rate. The zip branch of `src/app/api/body-tracker/connected-sources/apple-health/parse/route.ts` keeps only the four body types.

### Form answers this code supports

| Question | Answer from this code | Limit |
|---|---|---|
| Health and fitness data | Step count, if the HealthKit query returns samples and the user is signed in | Device read **UNVERIFIED**. The wider JS read list is not mapped by the plugin |
| Body measurements | Weight, body fat, lean mass, and BMI from an uploaded export | File import, not the HealthKit permission sheet |
| Sleep, HRV, resting heart rate, active energy from Apple Health | Only from that export file, and only with wearable PHI consent | Not queried through HealthKit |
| Purpose | Store the step batch on the account. The export path feeds body-composition ingest (`persistRecordsAndBosContributor`) | `health-client.ts` does not apply the step batch to the Bio Optimization Score. Whether processing later changes that score is **UNCONFIRMED** |
| Linked to the user | Yes for a non-empty health-sync batch (`user_id` on `wearable_events`) | — |
| Used for tracking | No tracking call was found on this path | — |
| Used for advertising | No ads call was found in the health client, the health-sync route, or the Apple Health XML parser | Ads outside this repo remain **UNCONFIRMED** (item 21) |
| Third parties | Stored through the app API in Supabase | Whether those rows are later sent to an AI vendor is **UNCONFIRMED** |
| Product personalization | Do not claim the live HealthKit read personalizes the Bio Optimization Score | The old purpose string said that. The code path above does not |

`NSHealthShareUsageDescription` in `Info.plist` is the draft sentence in `native-projects-fixes.md`. It is pending Lex/Gary approval.

## (d) Content rating (IARC) inputs

Draft answers for the questionnaire. Gary or legal enters the Console form.

| Topic | Draft | Basis |
|---|---|---|
| Violence | No | No violent content was found in this review |
| Sexual content or nudity | No | No sexual content was found. Body-progress photos are health images. Whether a rating body treats them as nudity is **UNCONFIRMED** |
| Language / profanity as a feature | No | No profanity feature was found. Users can type chat text. **UNCONFIRMED** if that changes the answer |
| Controlled substances, drugs, cannabis, tobacco | **UNCONFIRMED** | Audit section 3.6: peptide education content ships, including compound names. CannabisIQ is a gene panel in product docs, not a cannabis sale. Do not answer "No" until legal review |
| Gambling | No | No gambling feature was found. Helix tokens can reduce a shop checkout total (`src/lib/shop/checkout-actions.ts`). Whether tokens can be bought for money is **UNCONFIRMED** (audit section 3.3) |
| Users interact | Yes | Accounts, advisor chat, practitioner sharing described in privacy policy section 3 |
| Shares physical location with other users | No evidence found | **UNCONFIRMED** |
| Digital purchases | Yes for memberships | `src/app/api/stripe/checkout/route.ts` accepts `mode: subscription`. Physical supplement and kit checkout also exists |
| Unrestricted web | **UNCONFIRMED** | The shell loads `https://viaconnectapp.com` |
| Age | 18+ | See section (e) |

## (e) Target audience

18 and older.

Privacy policy section 13 states: "The Services are intended for adults aged 18 and over. We do not knowingly collect personal information from anyone under 18." Terms say the user must be at least 18 (`src/app/(legal)/terms/page.tsx`).

Use 18+ on the Apple age rating and on the Play target-audience form so both match section 13. The audit (A22) did not find an age gate at signup. Whether signup blocks users under 18 is **UNCONFIRMED**.

## (f) URLs

| Use | URL |
|---|---|
| Data deletion | `https://www.viaconnectapp.com/delete-account` |
| Support | `https://www.viaconnectapp.com/support` |
| Privacy policy (already public in the audit) | `https://www.viaconnectapp.com/privacy` |

Deletion page in this repo: `src/app/delete-account/page.tsx`. It links to `/dsar` for a web request. In-app deletion posts to `/api/account/delete` after the user types DELETE (`src/components/account/DeleteAccountDialog.tsx`). This change did not run a deletion. The dialog includes a `server_not_configured` failure. Whether production is configured is **UNCONFIRMED**.

Support URL: no `src/app/support` page and no `/support` redirect were found in app code or `vercel.json`. The audit (blocker 13) recorded `https://www.viaconnectapp.com/support` responding 307 to login. Live behavior was not rechecked. **UNCONFIRMED**.

## (g) Needs confirmation by Gary, legal, or engineering

1. **UNCONFIRMED** archive result for `PrivacyInfo.xcprivacy` on a Mac. The file is in the App Resources phase. Xcode was not run here.
2. **UNCONFIRMED** required-reason symbols inside Apple system frameworks (WebKit) after a real archive. App and plugin sources reviewed above do not call UserDefaults, file timestamp, system boot time, or disk space, so those APIs are not declared.
3. **UNCONFIRMED** iOS archive after `pod install`. Camera, speech recognition, and HealthKit are in `ios/App/Podfile` (Capacitor 8 upgrade, PR #259). `pod install` was not run on this branch. Re-grep the archived binary before declaring required-reason APIs. HealthKit collection is in the HealthKit disclosure section.
4. **UNCONFIRMED** Camera EXIF GPS. Camera 6.1.3 copies a GPS metadata dictionary when the asset has one. The plugin is not in the Podfile. Whether body or meal uploads keep GPS is not proven. Precise Location is not declared.
5. **UNCONFIRMED** whether profile city, subdivision, and country should be a separate Coarse Location answer in addition to Physical Address.
6. **UNCONFIRMED** whether name is required at signup. Phone is optional in the profile save payload.
7. **UNCONFIRMED** Fitness as its own data type on a device. The only HealthKit query is step count (`health-client.ts`). `native_health_bridge` still defaults to false and gates the write bridge, not that read. The pod is in the Podfile and was not installed here. Audit section 10 did not verify on-device HealthKit reads. See the HealthKit disclosure section.
8. **UNCONFIRMED** production value of `NEXT_PUBLIC_HEALTH_CONNECT_ENABLED`. Default path in code is off unless the env var is `1`.
9. **UNCONFIRMED** whether genetic data is sent to Anthropic, Tavus, Gemini, or Google Vision. It was not found in `advisor-context-builder.ts`. Audit section 5 marked AI vendors for genetic data as "to confirm".
10. **UNCONFIRMED** Tavus in production. Avatar flags default to false. The client can send `conversational_context` when a session is created.
11. **UNCONFIRMED** Google Cloud Vision credentials in production. Marshall OCR no-ops without them.
12. **UNCONFIRMED** which personal fields SendGrid templates include, and whether `SENDGRID_API_KEY` is set in production. Code calls `https://api.sendgrid.com/v3/mail/send` when the key is present.
13. **UNCONFIRMED** audio retention at Gemini. The transcribe route says `audio_retained: false` and does not write the file in that route. Audio Data is not in the manifest.
14. **UNCONFIRMED** which speech path production uses (Web Speech, Capacitor `SFSpeechRecognizer`, or Gemini audio). The Capacitor plugin is not in the Podfile.
15. **UNCONFIRMED** payment card metadata. Policy section 4.1 says full card numbers are not stored. Whether webhooks store last4 or brand was not proven. Payment Info is not in the manifest.
16. **UNCONFIRMED** whether Helix / ViaTokens can be purchased for money. Shop checkout can apply token value as a one-time Stripe coupon.
17. **UNCONFIRMED** Device ID. `vc_visitor_id` is a first-party A/B cookie. Link to the account was not found. Not declared.
18. **UNCONFIRMED** diagnostic category for checkout `audit_logs.ip_address`, and for Vercel or Supabase request logs. No crash SDK is in `package.json`.
19. **UNCONFIRMED** push tokens. `src/lib/notifications/adapters/apns.ts` returns `apns_not_configured` or `apns_activation_pending`. Columns `apns_device_tokens` and `fcm_device_tokens` exist on generated types. No writer in `src` was found. Not declared.
20. **UNCONFIRMED** analytics. Code is a no-op. Privacy policy section 6.1 says analytics providers are used. Do not select Analytics on the forms until that is reconciled. Policy text was not edited.
21. **UNCONFIRMED** ads or pixels outside this repo. In-repo declaration is no ads and no tracking domains.
22. **UNCONFIRMED** Supabase RLS. Audit section 10: the security advisor timed out. This change did not query Supabase.
23. **UNCONFIRMED** public `Body Tracker` bucket (audit: 7 objects). Contents were not opened. This change did not query storage.
24. **UNCONFIRMED** live support URL. Intended Console value is `https://www.viaconnectapp.com/support`. No support page is in the repo. Audit blocker 13 saw a redirect to login.
25. **UNCONFIRMED** production account deletion. The page and `/api/account/delete` exist on `d4e95580`. They were not executed here. The dialog can surface `server_not_configured`.
26. **UNCONFIRMED** age gate. Policy and terms say 18+. Audit A22 found no signup age gate.
27. **UNCONFIRMED** IARC controlled-substance answer, CannabisIQ listing copy, and whether body-progress photos affect the nudity question. Legal.
28. **UNCONFIRMED** public user-generated content. Audit A19: no public posting found; practitioner messages described as private.
29. **UNCONFIRMED** whether stored advisor transcripts (`ultrathink_advisor_conversations`) need a separate Other User Content row. This draft covers them as Health.
30. **UNCONFIRMED** Play service-provider checkboxes versus a general "shared" answer. Processors named above are the ones the code calls.
31. **UNCONFIRMED** retention periods other than the meal-photo 24-hour statement and the voice route's not-retained contract. Policy section 8 is the general statement.
32. **UNCONFIRMED** medical-device status and the final Health apps category checkboxes beyond nutrition and weight management.
33. **UNCONFIRMED** Product Personalization on the Apple form for Health. It is in the manifest because advisor context is built from health fields to tailor the reply. Legal may want App Functionality only.
34. **UNCONFIRMED** Apple OAuth provider configuration, export-compliance answer, and developer-account type. Audit section 10. Out of scope for this file. `Info.plist` was not edited.
