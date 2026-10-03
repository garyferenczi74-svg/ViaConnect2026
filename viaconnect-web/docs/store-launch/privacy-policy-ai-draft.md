# Privacy policy draft: third-party AI, health data, analytics

**DRAFT for Gary, legal, and Lex. Do not publish.**

This file proposes wording for the live privacy page at `src/app/(legal)/privacy/page.tsx`. That page was not edited. `tests/204/legal-copy.test.ts` expects the live page to still say `Last Updated: June 17, 2026`.

Nothing here is a legal determination. Do not describe this draft, or the product, as HIPAA, SOC 2, or otherwise "compliant." Do not say the product uses end-to-end encryption.

Store rules this draft is written to support, checked on 2026-10-03 against the pages named below:

- Apple App Review Guidelines, last updated June 8, 2026, section 5.1.1(i): the privacy policy identifies what data is collected, how it is collected, and all uses of that data, and third parties the data is shared with (including analytics, advertising, and SDKs) provide the same or equal protection. Retention and deletion, and how to revoke consent or request deletion, are also required. https://developer.apple.com/app-store/review/guidelines/
- Apple 5.1.2(i): "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so."
- Google Play User Data policy, prominent disclosure and the statement that the requirements apply to third-party AI integrations: https://support.google.com/googleplay/android-developer/answer/10144311

## What the code actually sends

Vendors below are named because a code path sends user content to them. Items marked unknown were not confirmed as a live user path.

| Vendor | What is sent | Where |
|---|---|---|
| Anthropic | Chat text plus health context the feature attaches (symptoms, medications, supplements, Bio Optimization score, and related profile fields in the advisor and ultrathink builders). Meal and supplement photos. Meal-edit transcripts. Body photos from the body-scan and body-photo edge functions. | `src/lib/jeffery/advisor-stream.ts`, `src/app/api/hannah/ask/route.ts`, `src/lib/nutrition/vision/providers/claude-vision.ts`, `supabase/functions/body-scan-analyze`, `supabase/functions/arnold-vision-analyze` |
| Google Gemini | Meal photos, meal descriptions, voice audio used to type a meal, and question text embedded for the knowledge log. | `src/lib/nutrition/gemini-client.ts`, `src/app/api/nutrition/voice/transcribe/route.ts`, `src/lib/kb/embeddings.ts` |
| Google Cloud Vision | Product-label images when that pipeline runs and Google Cloud credentials are set. If credentials are missing, the client does not send the photo. No Next.js route was found that calls this pipeline directly. | `src/lib/marshall/vision/ocr.ts` |
| LogMeal | Meal image bytes and an opaque request id. The client comment says it does not send a user id. | `src/lib/nutrition/vision/providers/logmeal.ts` |
| Tavus | Avatar session. The browser loads a conversation URL that is allowed to use camera and microphone. ViaConnect sends a short text summary that the session route redacts first. | `src/app/api/hannah/avatar/session/route.ts`, `src/components/hannah/avatar/HannahAvatar.tsx` |
| OpenAI | Text submitted on the multi-model route when the GPT option is selected. Some practitioner screens still use local sample replies and may never call this route. | `src/app/api/ai/[provider]/route.ts` |
| xAI | Text submitted on that same route when the Grok option is selected, and research queries from `src/lib/jeffery/capabilities/modules/grok.ts`. | `src/app/api/ai/[provider]/route.ts` |
| Consensus | Search text when a research pass runs. Paper search, not a chat reply. The traced caller is a cron route, not a consumer screen. | `src/lib/research/sources/consensus.ts` |

GeneX360 results were not found in the live Advisor or Hannah request builders that were traced (`buildUnifiedContext` sets genetic data to null). Do not tell users that genetic files are sent to these vendors unless a later trace finds a caller.

Browser speech (`src/app/(app)/(consumer)/nutrition/log-meal/page.tsx`, `src/components/caq/VoiceInput.tsx`) uses the Web Speech API. Whether that audio stays on the device or is sent to the browser vendor is unknown. Say that in the policy as unknown, not as "on device."

`src/lib/analytics.ts` only writes a development console line. It does not send events to a third-party analytics vendor.

## Proposed replacement for section 6.1

Current live text says the Services use automated systems, including AI reasoning agents, and does not name the companies or the data they receive.

Proposed:

> Some features send information to outside companies so they can generate a reply, read a photo, or run an avatar call. Before the first use of those features, ViaConnect asks you to agree or decline. The companies and the kinds of information are:
>
> Anthropic may receive chat messages, health details already in your account that a feature includes with the message, meal and supplement photos, meal-edit transcripts, and body photos.
>
> Google (Gemini) may receive meal photos, meal descriptions, voice recordings used to type a meal, and the text of questions stored in the knowledge log.
>
> Google Cloud Vision may receive a product-label photo when that check runs.
>
> LogMeal may receive a meal photo.
>
> Tavus may receive camera and microphone during an avatar call, plus a short text summary that ViaConnect redacts before sending.
>
> OpenAI and xAI may receive text you submit on the multi-model AI route when that option is selected.
>
> Consensus may receive research search text when a research pass runs.
>
> If you decline, ViaConnect does not call those features. The rest of the app still works. You can withdraw the choice in Account, under AI sharing. Withdrawing stops later AI calls. It does not erase a copy a provider already received.
>
> A browser speech control may use your browser's speech service. ViaConnect does not control whether that service keeps the audio on the device.
>
> These outputs are informational. They are not a medical diagnosis and they are not a substitute for a licensed clinician.

## Proposed replacement for the service-provider bullet in section 7

Current live text lists "analytics" among service providers. The app code does not send usage events to an analytics vendor (`src/lib/analytics.ts` is a no-op outside a development console line).

Proposed bullet:

> Service providers: we use providers for hosting, database, infrastructure, payment processing, and communications. They process information on our instructions. We do not currently send product-usage events to a third-party analytics company. If that changes, we will name the company here before it receives data.
>
> AI providers: when you agree in the app, we share the categories in section 6.1 with Anthropic, Google, LogMeal, Tavus, and, when you use those options, OpenAI, xAI, and Consensus. We do not send that information for advertising.

Keep the existing sentence that ViaConnect does not sell personal information and does not share it for cross-context behavioral advertising, unless counsel rewrites it.

## Proposed health-data paragraph

The screen that asks for health access is the Hume Band setup (`src/components/body-tracker/HumeSetupFlow.tsx`). The permission request is `requestHealthPermissions` in `src/lib/wearables/health-client.ts`.

Read types requested:

- heart rate
- resting heart rate
- heart rate variability (SDNN)
- sleep
- respiratory rate
- oxygen saturation
- steps
- active energy
- body mass
- body fat percentage
- lean body mass

The write list in that function is empty. On Android, the same function returns without requesting access unless `NEXT_PUBLIC_HEALTH_CONNECT_ENABLED` is `1`.

`src/lib/formavision/health/healthBridge.ts` contains a write request for weight and body fat. No screen imports that module. Do not tell users the app writes those types unless a screen starts calling it.

Proposed:

> If you use ViaConnect on iPhone and you allow Apple Health, the app requests read access for heart rate, resting heart rate, heart rate variability, sleep, respiratory rate, oxygen saturation, steps, active energy, body mass, body fat percentage, and lean body mass. The request does not ask Apple Health for write access. On Android, Health Connect access stays off unless a separate build switch is turned on. ViaConnect uses allowed readings in your wellness record. It does not use them for advertising. You can refuse the system permission. The rest of the app still works.

Apple 5.1.3 and 5.1.2(vi) restrict HealthKit, camera, and photo data from advertising and use-based data mining. The proposed sentence "does not use them for advertising" matches the in-app disclosure. Counsel should confirm it is accurate for every downstream use, including practitioner sharing the user already authorized.

## Revoke and deletion

In-app withdraw for AI sharing is Account, AI sharing (`/account/ai-sharing`), which records a revoke time on the user's consent row. Account deletion already exists in the product and is the path for a deletion request. The live section 10 already points people to account settings and `info@farmceuticawellness.com`. Proposed addition:

> You can withdraw AI sharing in the app under Account, AI sharing. You can ask us to delete your account from account settings or by emailing info@farmceuticawellness.com.

## What this draft deliberately does not say

- It does not repeat or add a HIPAA, SOC 2, or "compliant" claim. The live page, as of June 17, 2026, does not use those words in the sections reviewed (6.1, 7, 9). If an older draft elsewhere does, do not copy it back.
- It does not say end-to-end encryption. Live section 9 says encryption in transit, access controls, role-based permissions, and monitoring, and it says no method of transmission or storage is completely secure. Leave that paragraph for counsel. Do not strengthen it.
- It does not claim GeneX360 results are sent to the AI vendors above.

## Decisions needed before anyone edits the live page

1. Legal sign-off of the proposed 6.1, section 7, and health paragraphs.
2. Confirm the vendor table, especially OpenAI, xAI, Consensus, and Google Cloud Vision in production.
3. Confirm the browser speech sentence (destination unknown).
4. Confirm Health Connect stays off in the store build.
5. Apply migration `supabase/migrations/20261003120000_via_10_ai_data_sharing_consent.sql` before turning on `AI_THIRD_PARTY_CONSENT_GATE`. The migration was not applied by this change.
