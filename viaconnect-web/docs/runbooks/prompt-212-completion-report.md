# Prompt 212 Completion Report

**Date:** 2026-08-11  
**Branch intent:** direct to main (implement on working tree, push via normal flow)  
**Scope:** WHOOP Developer API v2 (OAuth + webhooks + backfill) + Hume via HealthKit / Health Connect path

---

## Delivered

### Migrations
- `supabase/migrations/20260812000000_prompt_212_wearable_connected_sources.sql`
  - `connected_sources`
  - `wearable_oauth_tokens` (service-role only, no client RLS read)
  - `wearable_events` (append-only raw)
  - `wearable_sleep_sessions`, `wearable_recovery`, `wearable_workouts`
  - `wearable_daily_vitals`, `wearable_body_composition`
  - `wearable_metric_precedence`
  - `wearable_oauth_states`, `wearable_audit_log`

### Routes
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/integrations/whoop/authorize` | Session |
| GET | `/api/integrations/whoop/callback` | OAuth state |
| POST | `/api/integrations/whoop/disconnect` | Session |
| POST | `/api/integrations/whoop/webhook` | Public + signature |
| POST | `/api/integrations/whoop/process` | `CRON_SECRET` |
| POST | `/api/integrations/health-sync` | Session |
| GET/PATCH | `/api/integrations/connected-sources` | Session |

### Libraries
- `src/lib/wearables/**` (crypto, types, precedence, processor, health normalize)
- `src/lib/wearables/whoop/**` (config, client, tokens single-flight, webhook signature, normalize, backfill)
- `src/lib/wearables/health-client.ts` (Capacitor HealthKit wrapper)

### UI
- Extended `/body-tracker/connections` with WHOOP, Hume Band, Phone Health Data
- Consent modal, Hume 3-step setup, disconnect + optional hard delete
- Per-metric precedence controls when both sources connected

### BOS integration
- `wearable-source.ts` reads `connected_sources` + normalized `wearable_recovery` / `wearable_sleep_sessions` (null stays null)

### Middleware
- Public: `/api/integrations/whoop/webhook`, `/api/integrations/whoop/process`

### Cron
- `vercel.json`: `/api/integrations/whoop/process` every 5 minutes

### Tests (vitest)
- `src/lib/wearables/__tests__/normalize.test.ts`
- `src/lib/wearables/__tests__/webhook-signature.test.ts`
- `src/lib/wearables/__tests__/gordon-isolation.test.ts`
- Result: **12/12 passed**

### Package added (pre-approved)
| Package | Version | Notes |
|---------|---------|--------|
| `@perfood/capacitor-healthkit` | **1.3.2** | Fits Capacitor 6. Cross-platform `@capgo/capacitor-health@8` requires Cap 7/8 and was not selected. |

---

## Env vars required (all Vercel environments)

```
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=
WHOOP_REDIRECT_URI=https://www.viaconnectapp.com/api/integrations/whoop/callback
WEARABLE_TOKEN_KEY=   # 32-byte key, hex (64 chars) or base64
CRON_SECRET=          # existing; also authorizes /api/integrations/whoop/process
HEALTH_CONNECT_ENABLED=   # omit or 0 until Android ready; set 1 to enable
NEXT_PUBLIC_HEALTH_CONNECT_ENABLED=  # mirror for client UI honesty
```

---

## Health Connect status (explicit)

| Platform | Status |
|----------|--------|
| **iOS HealthKit** | Implemented: plugin, permission request, incremental sync POST, UI guided flow |
| **Android Health Connect** | **Stubbed** behind `HEALTH_CONNECT_ENABLED=1`. API contract ready; plugin path returns capability-disabled until flag + native wiring complete |

---

## Manual steps for Gary (pending)

1. Create ViaConnect app in **WHOOP Developer Dashboard** (active WHOOP membership required).
2. Set redirect URI: `https://www.viaconnectapp.com/api/integrations/whoop/callback`
3. Set webhook URL: `https://www.viaconnectapp.com/api/integrations/whoop/webhook`
4. Select **v2** webhook payload version.
5. Copy Client ID + Secret into Vercel env (all environments).
6. Generate `WEARABLE_TOKEN_KEY` (32 random bytes, hex or base64) and set in Vercel.
7. Apply migration `20260812000000_prompt_212_wearable_connected_sources.sql` to Supabase project `nnhkcufyqjojdbvdrpky`.
8. iOS: enable HealthKit capability + add usage string (suggested):
   > "ViaCura reads heart rate, HRV, sleep, steps, and body composition from Apple Health to personalize your Bio Optimization Score. Health data is never used for advertising."
9. Physical test: WHOOP band OAuth + Hume Band with Apple Health sync on a real device.
10. Review `docs/runbooks/prompt-212-privacy-policy-diff.md` and consent copy before store submission.

---

## Legal / privacy follow-ups

- Proposed privacy additions: `docs/runbooks/prompt-212-privacy-policy-diff.md` (not applied to `/privacy` page).
- Consent modal ships in product UI (Kelsey structure, plain language, no medical claims).

---

## Not delivered / deferred (no silent scope reduction)

- WHOOP Developer Dashboard app registration (Gary manual).
- Live WHOOP signature header verification against production dashboard samples (algorithm supports common HMAC forms; confirm against WHOOP docs when app is created).
- Full Health Connect native Android plugin + OS permission UX.
- Deep HealthKit multi-type sample queries (steps path implemented; extend per sample type in `health-client.ts` as entitlements are approved).
- FormaVision merge/reconcile with body composition (explicitly out of scope; parallel signals only).

---

## Gordon isolation

- Zero writes to nutrition tables from wearable modules (asserted by unit test).
