# App Review notes (draft)

Status: DRAFT. Gary Ferenczi must approve this text before it is pasted into App Store Connect or Play Console. Credentials are not in this file. Gary supplies them and stores them outside the repo.

This draft covers Apple guideline 2.1(a) (demo account and a live backend) and the review-notes item in the 2026-10-01 launch audit (section 6 and section 7 item 6).

## Credentials

- Email: [REVIEWER_EMAIL]
- Password: [REVIEWER_PASSWORD]

These placeholders are filled by Gary at submission time. Do not commit the real values.

## How to sign in

1. Install the build, or open the hosted sign-in screen. The Capacitor shell in this repo loads `https://viaconnectapp.com` (`viaconnect-web/capacitor.config.ts`). The sign-in path is `/login`.
2. Use Email and Password. Choose Sign In. Do not choose Create account. Do not use the Google or Apple buttons.
3. Enter [REVIEWER_EMAIL] and [REVIEWER_PASSWORD].
4. No email code is required. The account is created already confirmed, so the signup one-time code is not sent.
5. The account is a consumer (Personal Wellness) account. After sign-in it opens the consumer home.

The password form calls `signInWithPassword`. New accounts created through the signup screen still confirm email with a code. That path is not for this review.

## What this account contains

The account name is "SAMPLE App Review Account". That label is sample data, not a customer.

The seed writes only:

- the confirmed auth user
- a `profiles` row (name, consumer role, onboarding flag)
- a `user_consents` row for the privacy policy and terms version already used at signup (`2026-06-17`)

It does not write labs, genetics, symptoms, scores, doses, protocols, orders, or product facts. Clinical screens can be empty. Empty means there is no sample health record, not that a result is zero or normal.

## HealthKit

The iOS purpose string in `ios/App/App/Info.plist` (`NSHealthShareUsageDescription`) says, exactly:

> ViaCura reads heart rate, HRV, sleep, steps, and body composition from Apple Health to personalize your Bio Optimization Score. Health data is never used for advertising.

The same file's `NSHealthUpdateUsageDescription` says the app does not write health samples to Apple Health.

The HealthKit client requests read access for heart rate, resting heart rate, heart rate variability, sleep, respiratory rate, oxygen saturation, step count, active energy, body mass, body fat percentage, and lean body mass. It requests no write types (`src/lib/wearables/health-client.ts`).

Android Health Connect stays off unless `NEXT_PUBLIC_HEALTH_CONNECT_ENABLED` is `1`. That flag defaults off.

UNCONFIRMED: whether HealthKit read works on a device in the submitted build. The 2026-10-01 audit reported the native project may not include the Health plugin in the Xcode target.

## Camera

The iOS camera purpose string says, exactly:

> ViaConnect uses your camera to photograph meals and scan barcodes on packaged foods. Photos are sent to our analysis service only when you choose to log a meal.

The app also has a body-scan camera flow (FormaVision) that asks for the camera when that screen is opened. The purpose string above does not mention body scans.

UNCONFIRMED: which camera uses are linked in the submitted native binary, and which photos leave the device.

## AI features

Hannah is the in-app assistant. The question-and-answer route answers from published knowledge and is limited to 15 requests per 60 seconds per signed-in user (`src/app/api/hannah/ask/route.ts`). That route calls Anthropic. A separate avatar session uses Tavus (`src/app/api/hannah/avatar/session/route.ts`).

Outputs from these features are informational. See the medical disclaimer below.

UNCONFIRMED: whether the submitted build shows an in-app consent screen before data is sent to a third-party AI vendor, and the full vendor list for every AI screen.

## Peptide education

The app includes peptide education screens. They are educational entries. This sample account has no peptide protocol, no doses, and no lab results. Do not treat those screens as a personal plan for the reviewer.

UNCONFIRMED: which education entries are visible in the build you submit. This note does not list compounds or claims.

## Medical disclaimer

Quoted exactly from Terms of Service section 3 ("What ViaConnect Is, and Important Medical Disclaimer"), `src/app/(legal)/terms/page.tsx`:

> The Services are for informational and wellness purposes only. They do not provide medical advice, diagnosis, or treatment. Supplement recommendations, genetic insights, scores, and other outputs are informational and do not replace the advice of a qualified healthcare provider. Always speak with a qualified healthcare provider before starting, stopping, or changing any supplement, medication, or health regimen, and before acting on any information from the Services. Never disregard professional medical advice or delay seeking it because of something you read or received through the Services. If you think you may have a medical emergency, call your local emergency number immediately.

## Purchases

Purchases for this reviewer account are blocked from real charging when the server flag is on. Checkout does not create a Stripe payment. The reviewer sees:

> Purchases are turned off for this App Review sample account, so no card is charged.

The block covers the Stripe checkout route, shop checkout, membership and kit checkout helpers, and white-label payment intents. It stays off until `REVIEWER_PAYMENT_BLOCK_ENABLED` is set to `true`. The seed marks `app_metadata.reviewer` as true, and `REVIEWER_USER_IDS` can list the same user id. Either match is blocked while the flag is on.

UNCONFIRMED until Gary sets that flag on the server the reviewer will use. The flag defaults off in code. This draft does not turn it on.

## Operator checklist (do not paste into App Store Connect)

1. Choose a mailbox that is not a real customer's login. Store [REVIEWER_EMAIL] and [REVIEWER_PASSWORD] in the team password manager.
2. From `viaconnect-web`, run the seed with `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`, `REVIEWER_EMAIL`, and `REVIEWER_PASSWORD`. The script prints `user_id`. It does not print the password.
3. On the server that serves the app, set `REVIEWER_PAYMENT_BLOCK_ENABLED` to `true` and `REVIEWER_USER_IDS` to that `user_id`.
4. Sign in on the live site with the email and password and confirm no email code is requested.
5. Open checkout and confirm the blocked message, with no Stripe payment page.
6. Replace the placeholders in the App Review notes and approve this draft.

UNCONFIRMED: which of the two mobile codebases is the store build. These notes describe the Capacitor shell that loads the Next.js app.
